import type { AgentRunStage, AgentRunStatus, ApplicationStatus, JobPostingStatus, RemoteType } from '@joboard/db';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: '待投递',
  applied: '已投递',
  in_progress: '跟进中',
  offer: 'Offer',
  rejected: '已拒绝',
  ghosted: '无回音',
};

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'in_progress',
  'offer',
  'rejected',
  'ghosted',
];

export const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, string> = {
  wishlist: 'bg-muted text-muted-foreground border-transparent',
  applied: 'bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300',
  offer: 'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300',
  ghosted: 'bg-slate-100 text-slate-500 border-transparent dark:bg-slate-900 dark:text-slate-400',
};

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  onsite: '现场',
  hybrid: '混合',
  remote: '远程',
};

export const JOB_POSTING_STATUS_LABELS: Record<JobPostingStatus, string> = {
  new: '新发现',
  reviewed: '已查看',
  matched: '已匹配',
  applied: '已投递',
  skipped: '已跳过',
};

export const AGENT_RUN_STAGE_LABELS: Record<AgentRunStage, string> = {
  think: '思考',
  search: '搜索',
  match: '匹配',
  apply: '投递',
  update_status: '更新状态',
  sync: '同步',
};

export const AGENT_RUN_STATUS_LABELS: Record<AgentRunStatus, string> = {
  running: '进行中',
  success: '成功',
  error: '出错',
};
