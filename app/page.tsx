'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Copy, RefreshCw, AlertCircle, Check, CalendarDays, 
  ClipboardList, ImagePlus, Loader2, PenLine, Mic, FileAudio, 
  QrCode, X, Smartphone, Briefcase, CheckCircle2, Circle, Clock,
  Building2, Square, Volume2, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert
} from 'lucide-react';

// 引入本地的类型和常量 (指向 app/types.ts 和 app/constants.ts)
import { 
  TaskStatus, ReportMode, ProjectSelectionMap, InternalSelectionMap
} from './types';
import { CLIENT_NAMES, TASK_GROUPS_TEMPLATE, INTERNAL_TASKS } from './constants';

// 引入 Server Actions (关键！必须从 app/actions.ts 引入)
import { generateReportAction, extractTextFromImageAction } from './actions';

// ------------------------------------------------------------------
// COMPONENTS (内嵌组件，避免多文件管理)
// ------------------------------------------------------------------

// --- StatusToggle Component ---
interface StatusToggleProps {
  status: TaskStatus;
  onChange: (newStatus: TaskStatus) => void;
}

const StatusToggle: React.FC<StatusToggleProps> = ({ status, onChange }) => {
  const handleClick = () => {
    if (status === TaskStatus.PENDING) onChange(TaskStatus.DOING);
    else if (status === TaskStatus.DOING) onChange(TaskStatus.DONE);
    else onChange(TaskStatus.PENDING);
  };

  const getIcon = () => {
    switch (status) {
      case TaskStatus.DONE:
        return <CheckCircle2 className="w-5 h-5 text-green-600 fill-green-100" />;
      case TaskStatus.DOING:
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />;
    }
  };

  const getLabel = () => {
    switch (status) {
      case TaskStatus.DONE: return '已完成';
      case TaskStatus.DOING: return '进行中';
      default: return '未选择';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200
        ${status === TaskStatus.PENDING ? 'bg-transparent text-slate-400 hover:bg-slate-100' : ''}
        ${status === TaskStatus.DOING ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : ''}
        ${status === TaskStatus.DONE ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : ''}
      `}
    >
      {getIcon()}
      <span className={status === TaskStatus.PENDING ? 'sr-only md:not-sr-only md:opacity-0 md:group-hover:opacity-100' : ''}>
        {getLabel()}
      </span>
    </button>
  );
};

// --- InternalSection Component ---
interface InternalSectionProps {
  selections: InternalSelectionMap;
  onUpdate: (task: string, status: TaskStatus) => void;
}

const InternalSection: React.FC<InternalSectionProps> = ({ selections, onUpdate }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-slate-600" />
        <h2 className="font-semibold text-slate-800">内部事务 & 行政</h2>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {INTERNAL_TASKS.map((task) => (
          <div 
            key={task} 
            className={`
              flex items-center justify-between p-3 rounded-lg border transition-all duration-200
              ${selections[task] && selections[task] !== TaskStatus.PENDING 
                ? 'bg-slate-50 border-blue-200 shadow-sm' 
                : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }
            `}
          >
            <span className={`text-sm ${selections[task] && selections[task] !== TaskStatus.PENDING ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
              {task}
            </span>
            <StatusToggle 
              status={selections[task] || TaskStatus.PENDING} 
              onChange={(s) => onUpdate(task, s)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// --- ProjectCard Component ---
interface ProjectCardProps {
  clientName: string;
  selections: ProjectSelectionMap;
  onUpdate: (client: string, group: string, task: string, status: TaskStatus) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ clientName, selections, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate active tasks count
  const activeCount = Object.values(selections[clientName] || {}).reduce((acc: number, group: any) => {
    const tasks = group as Record<string, TaskStatus>;
    return acc + Object.values(tasks).filter(s => s !== TaskStatus.PENDING).length;
  }, 0);

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 mb-4 ${activeCount > 0 ? 'border-blue-200 shadow-sm' : 'border-slate-200 shadow-sm'}`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-t-xl focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${activeCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800 text-lg">{clientName}</h3>
            {activeCount > 0 && (
              <p className="text-xs text-blue-600 font-medium mt-0.5">
                已选 {activeCount} 项任务
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
            {!isExpanded && activeCount === 0 && <span className="text-xs text-slate-400">点击展开</span>}
            {isExpanded ? <ChevronUp className="text-slate-400 w-5 h-5" /> : <ChevronDown className="text-slate-400 w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-6">
            {TASK_GROUPS_TEMPLATE.map((group) => (
              <div key={group.name} className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">{group.name}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {group.tasks.map((task) => {
                    const currentStatus = selections[clientName]?.[group.name]?.[task] || TaskStatus.PENDING;
                    return (
                      <div 
                        key={task} 
                        className={`
                          flex items-center justify-between p-3 rounded-lg border transition-all duration-200
                          ${currentStatus !== TaskStatus.PENDING 
                            ? 'bg-blue-50/30 border-blue-200' 
                            : 'bg-white border-slate-100 hover:border-slate-300'
                          }
                        `}
                      >
                        <span className={`text-sm flex-1 mr-4 ${currentStatus !== TaskStatus.PENDING ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                          {task}
                        </span>
                        <StatusToggle 
                          status={currentStatus} 
                          onChange={(newStatus) => onUpdate(clientName, group.name, task, newStatus)} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MeetingRecorder Component ---
interface MeetingRecorderProps {
  onRecordingComplete: (base64: string) => void;
  isProcessing: boolean;
}

const MeetingRecorder: React.FC<MeetingRecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1];
          onRecordingComplete(base64Content);
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setAudioBlob(null);

      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access error:", err);
      alert("无法访问麦克风，请检查权限设置。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current !== null) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative mb-6">
        {isRecording && (
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
        )}
        <div className={`
          relative z-10 w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300
          ${isRecording ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'}
        `}>
           {isRecording ? (
             <Volume2 className="w-10 h-10 text-red-500 animate-pulse" />
           ) : audioBlob ? (
             <div className="text-blue-600 font-semibold text-lg">Ready</div>
           ) : (
             <Mic className="w-10 h-10 text-slate-400" />
           )}
        </div>
      </div>

      <div className="text-3xl font-mono font-bold text-slate-700 mb-8 tracking-wider">
        {formatTime(duration)}
      </div>

      <div className="flex gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white shadow-lg transition-all transform hover:scale-105 active:scale-95
              ${audioBlob ? 'bg-slate-500 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'}
            `}
          >
             <Mic className="w-5 h-5" />
             {audioBlob ? '重新录制' : '开始录音'}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-8 py-3 rounded-full font-medium text-white bg-slate-800 hover:bg-slate-900 shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <Square className="w-5 h-5 fill-current" />
            结束录音
          </button>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500 h-5">
        {isRecording ? '正在录音... 请清晰发言' : audioBlob ? '录音完成，点击下方按钮生成纪要' : '点击开始录音，Browser 可能会请求麦克风权限'}
      </p>
    </div>
  );
};

// ------------------------------------------------------------------
// 5. MAIN PAGE COMPONENT (主页面)
// ------------------------------------------------------------------

export default function Page() {
  const backgroundImageUrl = "https://i.postimg.cc/nr7Lmp7N/bg.png";
  
  // State
  const [mode, setMode] = useState<ReportMode>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showQR, setShowQR] = useState(false);
  
  // Config Status Check (Client side check for display only)
  // In server action mode, the real check happens on server
  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    // Just a visual hint, real validation is on server action
    setHasApiKey(true); 
  }, []);

  // Daily State
  const [internalSelections, setInternalSelections] = useState<InternalSelectionMap>({});
  const [projectSelections, setProjectSelections] = useState<ProjectSelectionMap>({});
  const [dailyManualInput, setDailyManualInput] = useState<string>('');
  
  // Weekly State
  const [weeklyInput, setWeeklyInput] = useState<string>('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionProgress, setRecognitionProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Meeting State
  const [meetingAudioBase64, setMeetingAudioBase64] = useState<string | null>(null);
  const [meetingContext, setMeetingContext] = useState<string>('');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Handlers
  const handleInternalUpdate = (task: string, status: TaskStatus) => {
    setInternalSelections(prev => ({ ...prev, [task]: status }));
  };

  const handleProjectUpdate = (client: string, group: string, task: string, status: TaskStatus) => {
    setProjectSelections(prev => ({
      ...prev,
      [client]: {
        ...(prev[client] || {}),
        [group]: {
          ...(prev[client]?.[group] || {}),
          [task]: status
        }
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsRecognizing(true);
    setError(null);
    setRecognitionProgress(`准备处理 ${files.length} 张图片...`);

    const readFile = (file: File): Promise<{ base64: string; mimeType: string }> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const [header, base64Data] = result.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          resolve({ base64: base64Data, mimeType });
        };
        reader.onerror = () => reject(new Error(`无法读取文件 ${file.name}`));
        reader.readAsDataURL(file);
      });
    };

    try {
      let extractedResults = "";
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setRecognitionProgress(`正在识别第 ${i + 1}/${files.length} 张图片...`);
        
        try {
          const { base64, mimeType } = await readFile(file);
          // 调用 Server Action
          const text = await extractTextFromImageAction(base64, mimeType);
          extractedResults += `\n\n--- 图片 ${i + 1} 识别内容 ---\n${text}`;
        } catch (err: any) {
          console.error(`Error processing file ${i + 1}:`, err);
          extractedResults += `\n\n--- 图片 ${i + 1} 识别失败 ---\n(错误: ${err.message})`;
        }
      }

      setWeeklyInput(prev => prev + extractedResults);
      setRecognitionProgress("所有图片处理完成！");
      setTimeout(() => setRecognitionProgress(''), 2000);

    } catch (err: any) {
      setError("批量处理图片时发生错误：" + err.message);
    } finally {
      setIsRecognizing(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    setError(null);
    setIsCopied(false);

    try {
      // 调用 Server Action
      const report = await generateReportAction({
        mode,
        date: selectedDate,
        projectSelections: mode === 'DAILY' ? projectSelections : undefined,
        internalSelections: mode === 'DAILY' ? internalSelections : undefined,
        dailyManualInput: mode === 'DAILY' ? dailyManualInput : undefined,
        weeklyInputText: mode === 'WEEKLY' ? weeklyInput : undefined,
        meetingAudioBase64: mode === 'MEETING' ? (meetingAudioBase64 || undefined) : undefined,
        meetingContext: mode === 'MEETING' ? meetingContext : undefined
      });
      setResult(report);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (e: any) {
      setError(e.message || "未知错误");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getGenerateButtonText = () => {
    if (isGenerating) {
      return `正在生成${mode === 'DAILY' ? '日报' : mode === 'WEEKLY' ? '周报' : '纪要'}...`;
    }
    switch (mode) {
      case 'DAILY': return '生成日报';
      case 'WEEKLY': return '生成周报';
      case 'MEETING': return '生成会议纪要';
    }
  };

  // Safe window location for QR
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans">
      {/* Inject Tailwind CSS CDN manually because Next.js ignores index.html */}
      <script src="https://cdn.tailwindcss.com"></script>
      
      {/* Global Styles / Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />

      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0">
        <img 
          src={backgroundImageUrl} 
          alt="Background" 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto pb-24 px-4 sm:px-6 pt-6">
        
        {/* Header */}
        <header className="py-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm mb-8 border border-white/50 relative">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4 px-2">
              漆明欣工作专用，你们没有，哈哈！
            </h1>
            <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
               <label htmlFor="date-picker" className="text-sm font-medium text-slate-500 flex items-center gap-2">
                 <CalendarDays className="w-4 h-4 text-blue-500" />
                 日期：
               </label>
               <input
                 id="date-picker"
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="text-slate-800 outline-none text-sm font-medium bg-transparent cursor-pointer"
               />
            </div>
          </div>
          <button 
            onClick={() => setShowQR(true)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="手机端使用"
          >
            <QrCode className="w-6 h-6" />
          </button>
        </header>

        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">手机扫码使用</h3>
                <p className="text-sm text-slate-500 mb-6">
                  推荐使用系统相机或微信扫码<br/>体验最佳的移动端适配效果
                </p>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-inner inline-block mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`}
                    alt="QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-left">
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    <span className="font-bold">⚠️ 注意：</span> 如果扫码后无法打开：
                    1. 确保手机和电脑连接同一 Wi-Fi。
                    2. 请不要用 localhost，需将电脑浏览器地址改成局域网 IP (如 192.168.x.x) 后再点开此二维码。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="flex justify-center mb-8 overflow-x-auto pb-2">
          <div className="bg-white/80 backdrop-blur-md p-1 rounded-xl flex items-center shadow-sm border border-white/50 min-w-max">
            <button
              onClick={() => setMode('DAILY')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'DAILY' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              生成日报
            </button>
            <button
              onClick={() => setMode('WEEKLY')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'WEEKLY' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              生成周报
            </button>
            <button
              onClick={() => setMode('MEETING')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'MEETING' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Mic className="w-4 h-4" />
              会议纪要
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* DAILY MODE */}
          {mode === 'DAILY' && (
            <>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 mb-6">
                  <InternalSection selections={internalSelections} onUpdate={handleInternalUpdate} />
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between mb-4 bg-white/60 p-2 rounded-lg backdrop-blur-sm">
                  <h2 className="text-lg font-semibold text-slate-800 ml-2">项目矩阵</h2>
                  <span className="text-xs text-slate-500 bg-white/50 px-2 py-1 rounded-md border border-slate-200/50">
                    点击卡片展开任务
                  </span>
                </div>
                {CLIENT_NAMES.map(client => (
                  <div key={client} className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60">
                      <ProjectCard
                        clientName={client}
                        selections={projectSelections}
                        onUpdate={handleProjectUpdate}
                      />
                  </div>
                ))}
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-slate-800">临时/补充事项</h2>
                </div>
                <div className="p-4">
                   <textarea
                    value={dailyManualInput}
                    onChange={(e) => setDailyManualInput(e.target.value)}
                    placeholder="在此输入今天发生的、未包含在上述选项中的工作内容..."
                    className="w-full h-32 p-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none text-slate-700 placeholder:text-slate-400 text-sm leading-relaxed outline-none transition-all bg-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* WEEKLY MODE */}
          {mode === 'WEEKLY' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6 relative">
              <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    周报素材输入
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    请粘贴日报记录、笔记。AI 将自动去重汇总。
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRecognizing}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isRecognizing 
                        ? 'bg-slate-100 text-slate-400 cursor-wait' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                      }
                    `}
                  >
                    {isRecognizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        识别中...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4" />
                        上传图片 (支持多图)
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={weeklyInput}
                  onChange={(e) => setWeeklyInput(e.target.value)}
                  placeholder={`粘贴示例：\n12月1日：跟进遂中研学合同，已盖章...\n`}
                  className="w-full h-64 p-4 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none text-slate-700 placeholder:text-slate-400 text-sm leading-relaxed outline-none transition-all bg-white"
                />
                {isRecognizing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center rounded-lg z-10">
                    <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-slate-100 flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-800">正在提取文字</p>
                        <p className="text-xs text-slate-500 mt-1">{recognitionProgress}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEETING MODE */}
          {mode === 'MEETING' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileAudio className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-slate-800">会议听录与纪要生成</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  点击下方按钮开始录音。会议结束后，AI 将自动识别语音并生成标准格式的会议纪要。
                </p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    会议补充信息（可选）：
                  </label>
                  <input 
                    type="text"
                    value={meetingContext}
                    onChange={(e) => setMeetingContext(e.target.value)}
                    placeholder="例如：营销中心周例会，参会人：胡总、夏经理..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    * 提前输入部门或参会人姓名，有助于 AI 更准确地识别和分配发言内容。
                  </p>
                </div>
              </div>
              <MeetingRecorder 
                onRecordingComplete={(base64) => setMeetingAudioBase64(base64)} 
                isProcessing={isGenerating}
              />
            </div>
          )}
        </main>

        {/* Result & Actions */}
        {error && (
          <div className="mt-8 p-4 bg-red-50/90 backdrop-blur-sm text-red-700 rounded-lg border border-red-200 flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                {mode === 'DAILY' ? '日报' : mode === 'WEEKLY' ? '周报' : '会议纪要'} 生成结果
              </h3>
              <button 
                onClick={handleCopy}
                className="text-sm flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopied ? '已复制' : '复制内容'}
              </button>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-sm">
                {result}
              </pre>
            </div>
          </div>
        )}

        {/* Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/60 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block flex-1">
               <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                 {hasApiKey ? (
                   <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                     <ShieldCheck className="w-3 h-3" /> API Key 已就绪
                   </span>
                 ) : (
                   <span className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                     <ShieldAlert className="w-3 h-3" /> 检查中...
                   </span>
                 )}
                 <span className="hidden md:inline">
                   {mode === 'DAILY' 
                     ? '· 勾选任务后可补充输入，AI 将融合生成'
                     : mode === 'WEEKLY'
                     ? '· 支持多图上传，AI 自动提取文字'
                     : '· 录音越清晰，会议纪要越准确'
                   }
                 </span>
               </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (mode === 'MEETING' && !meetingAudioBase64)}
              className={`
                w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 
                bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl shadow-lg shadow-blue-600/20
                transform transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
              `}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  正在处理...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-blue-200" />
                  {getGenerateButtonText()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
