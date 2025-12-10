'use server';

import { GoogleGenAI } from "@google/genai";
import { ReportGenerationParams, TaskStatus } from "./types";
import { TONES, VERB_SETS } from "./constants";

// 获取 AI 客户端（服务器端执行）
const getAIClient = () => {
  // 优先读取 API_KEY (服务端变量)，其次读取 NEXT_PUBLIC_API_KEY (兼容旧配置)
  const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey) {
    throw new Error("API Key 未配置。请在 Vercel 的 Environment Variables 中添加 API_KEY。");
  }
  return new GoogleGenAI({ apiKey });
};

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// 统一调用 Gemini 接口
const callGemini = async (prompt: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "生成内容为空，请重试。";
  } catch (error: any) {
    console.error("AI Generation Error (Server Side):", error);
    let errorMsg = error.message || "未知错误";
    
    // 优化错误提示
    if (errorMsg.includes("API Key")) errorMsg = "API Key 无效或未配置";
    if (errorMsg.includes("fetch failed")) errorMsg = "Vercel 服务器连接 Google 失败，请稍后重试";

    throw new Error(`生成失败: ${errorMsg}`);
  }
};

// 1. 生成日报逻辑
const generateDailyReport = async (data: ReportGenerationParams, selectedTone: string, selectedVerbs: string[]): Promise<string> => {
  let projectContent = "";
  let hasContent = false;

  if (data.projectSelections) {
    Object.entries(data.projectSelections).forEach(([client, groups]) => {
      let clientTasks: string[] = [];
      Object.entries(groups).forEach(([groupName, tasks]) => {
        Object.entries(tasks).forEach(([taskName, status]) => {
          if (status !== TaskStatus.PENDING) {
            const statusStr = status === TaskStatus.DOING ? "进行中" : "已完成";
            clientTasks.push(`- [${groupName}] ${taskName} (${statusStr})`);
            hasContent = true;
          }
        });
      });

      if (clientTasks.length > 0) {
        projectContent += `\n### 客户项目: ${client}\n${clientTasks.join('\n')}`;
      }
    });
  }

  let internalContent = "";
  if (data.internalSelections) {
    Object.entries(data.internalSelections).forEach(([taskName, status]) => {
      if (status !== TaskStatus.PENDING) {
        const statusStr = status === TaskStatus.DOING ? "进行中" : "已完成";
        internalContent += `\n- ${taskName} (${statusStr})`;
        hasContent = true;
      }
    });
  }

  let manualContent = "";
  if (data.dailyManualInput && data.dailyManualInput.trim()) {
    manualContent = `\n### 临时/补充事项 (高优先级 - 请重点润色并融入日报):\n${data.dailyManualInput.trim()}`;
    hasContent = true;
  }

  if (!hasContent) {
    throw new Error("请至少选择一项任务或输入补充事项以生成汇报。");
  }

  const dateContext = data.date ? ` (${data.date})` : "";

  const prompt = `
你是一位专业的K12教育研学项目经理助理。请根据以下工作数据生成一份高质量的【日报】${dateContext}。

**核心要求：**
1. **风格语气**：${selectedTone}。
2. **动词词库**：优先使用 "${selectedVerbs.join('/')}" 等词汇增强专业感。
3. **格式规则**：
   - 标题格式示例：工作日报 ${dateContext}
   - 绝对禁止使用 "我"、"我们" 等第一人称主语。使用主语省略句式（如 "完成方案制作..."）。
   - 必须将 "进行中" 的任务话术转化为："按计划有序推进中" 或 "持续跟进相关流程"。
   - 必须将 "已完成" 的 "结项/回款/财务" 类任务话术转化为："完成资金回笼" 或 "确保颗粒归仓"。
   - 输出结构清晰，分为 "重点工作推进" (按项目归类) 和 "内部事务与协同" 两部分。
   - **特别注意**：对于 "临时/补充事项" 中的内容，这是用户手动输入的当日特有工作，请进行专业润色，使其与其他标准化选项风格一致，并根据内容性质归类到合适的板块中。
   - 不要产生流水账，适当合并同类项，体现工作价值。

**输入数据：**
${projectContent}

### 内部事务:
${internalContent}

${manualContent}
`;

  return callGemini(prompt);
};

// 2. 生成周报逻辑
const generateWeeklyReport = async (inputText: string, selectedTone: string, selectedVerbs: string[], date?: string): Promise<string> => {
  if (!inputText.trim()) {
    throw new Error("请输入过去几天的日报内容或工作记录。");
  }
  const dateContext = date ? ` (截至 ${date})` : "";
  const prompt = `
你是一位专业的K12教育研学项目经理助理。请根据用户提供的【历史日报内容/碎片化记录】，汇总整理成一份结构严谨的【周总结与下周计划】${dateContext}。

**核心要求：**
1. **风格语气**：${selectedTone}。
2. **动词词库**：优先使用 "${selectedVerbs.join('/')}" 等词汇增强专业感。
3. **数据处理**：
   - 用户提供的内容可能包含重复的日报记录，请自动**去重**并**合并同类项**。
   - 例如：如果三天都提到 "跟进合同"，周报里只需要写一条 "持续跟进并落实合同签订"。
4. **格式规则 (必须严格遵守以下结构)**：
   - **标题**：周总结及下周计划 ${dateContext}
   - **一、已完成的工作**：列出所有 Status=Done 的事项。对于财务/结项类，强调 "资金闭环"、"台账清晰"。
   - **二、进行中工作**：列出所有 Status=Doing 的事项。强调 "有序推进"、"持续协调"。
   - **三、下周计划**：根据本周 "进行中" 的工作逻辑推导下周动作，或提取文本中明确提到的计划。
5. **绝对禁止**：使用第一人称 "我"。

**用户输入的原始记录：**
${inputText}
`;
  return callGemini(prompt);
};

// 3. 生成会议纪要逻辑
const generateMeetingMinutes = async (audioBase64: string, context: string, date?: string): Promise<string> => {
  if (!audioBase64) {
    throw new Error("未检测到录音数据。");
  }
  const dateStr = date || new Date().toISOString().split('T')[0];
  const contextStr = context ? `会议背景/部门信息：${context}` : "";
  const prompt = `
你是一位资深的高级行政秘书。请根据提供的会议录音音频，生成一份专业、详实且结构化的【会议纪要】。

**基本信息：**
- 日期：${dateStr}
- ${contextStr}

**输出格式要求（请严格模仿以下专业公文格式）：**

# [会议主题/部门] 会议纪要

**一、会议基本信息**
- **时间**：${dateStr}（如音频中提到具体时间段请补充，如 14:00-15:30）
- **地点**：（根据音频推断，如未提及可留空或写"线上/会议室"）
- **参会人员**：（根据声音或音频内容识别出的人名，如：胡总、夏经理等）
- **主持人**：（如有）

---

**二、会议内容详录**
（请根据发言人或议题进行分类整理，不要用流水账。示例结构如下：）

**1. [发言人姓名/部门] 工作汇报/发言**
   - **核心观点**：[概括发言核心]
   - **详细内容**：
     - [条目1]
     - [条目2]
     - [条目3]

**2. [另一发言人/部门] ...**
   - ...

---

**三、决议与重点工作安排 (Action Items)**
| 序号 | 待办事项/决议内容 | 责任人 | 截止时间/备注 |
| :--- | :--- | :--- | :--- |
| 1 | [具体事项] | [姓名] | [时间] |
| 2 | ... | ... | ... |

---

**四、会议总结**
[用一段话概括会议达成的共识或主要精神]

**注意事项：**
1. **信息提取**：请仔细聆听音频，准确提取人名、数据、项目名称（如"遂中"、"涪江中学"等）和关键决策。
2. **语言风格**：正式、客观、简练。去除口语化词汇（如"那个"、"然后"），转化为书面用语。
3. **结构化**：如果音频中是多人讨论，请归纳整理为"议题式"或"发言人式"结构，确保逻辑清晰。
`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm; codecs=opus", 
              data: audioBase64
            }
          },
          { text: prompt }
        ]
      }
    });
    return response.text || "生成会议纪要失败，请重试。";
  } catch (error: any) {
    console.error("Meeting Generation Error:", error);
    throw new Error(`会议纪要生成失败: ${error.message || "文件过大或网络超时"}`);
  }
};

// 4. 图片识别逻辑
export const extractTextFromImageAction = async (base64Data: string, mimeType: string): Promise<string> => {
  const prompt = "请准确识别并提取这张图片中的所有文字内容。过滤掉手机状态栏（时间、电量、信号）、导航栏、输入框提示等无关UI元素，只提取核心的日报/周报文本内容。保持原有的换行和逻辑结构。";
  
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });
    return response.text || "未能从图片中识别出文字。";
  } catch (error: any) {
    console.error("OCR Error:", error);
    throw new Error("图片识别失败: " + error.message);
  }
};

// 导出统一入口
export const generateReportAction = async (data: ReportGenerationParams): Promise<string> => {
  const selectedTone = getRandomElement(TONES);
  const selectedVerbs = getRandomElement(VERB_SETS);

  if (data.mode === 'WEEKLY') {
    return generateWeeklyReport(data.weeklyInputText || "", selectedTone, selectedVerbs, data.date);
  }

  if (data.mode === 'MEETING') {
    return generateMeetingMinutes(data.meetingAudioBase64 || "", data.meetingContext || "", data.date);
  }

  return generateDailyReport(data, selectedTone, selectedVerbs);
};
