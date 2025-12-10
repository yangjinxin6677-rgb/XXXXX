export enum TaskStatus {
  PENDING = 'PENDING', // 未选择
  DOING = 'DOING',     // 进行中
  DONE = 'DONE'        // 已完成
}

export type ReportMode = 'DAILY' | 'WEEKLY' | 'MEETING';

export interface TaskGroup {
  name: string;
  tasks: string[];
}

// Map: ClientName -> GroupName -> TaskText -> Status
export type ProjectSelectionMap = Record<string, Record<string, Record<string, TaskStatus>>>;

// Map: InternalTaskText -> Status
export type InternalSelectionMap = Record<string, TaskStatus>;

export interface ReportGenerationParams {
  mode: ReportMode;
  date?: string; 
  // For Daily
  projectSelections?: ProjectSelectionMap;
  internalSelections?: InternalSelectionMap;
  dailyManualInput?: string; 
  // For Weekly
  weeklyInputText?: string;
  // For Meeting
  meetingAudioBase64?: string;
  meetingContext?: string;
}
