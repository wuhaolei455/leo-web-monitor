/**
 * Leo Error Monitor SDK
 * 
 * 一个轻量级的JavaScript运行时错误监控SDK
 */

// 导出主要类
export { LeoErrorMonitor } from './core/leo-error-monitor';

// 导出类型定义
export type {
  LeoErrorMonitorConfig,
  ErrorInfo,
  ReportResponse
} from './types';

export {
  ErrorType,
  LogLevel,
  SDKError
} from './types';

// 导出工具函数
export {
  debounce,
  throttle,
  generateId,
  safeStringify
} from './utils/helpers';

// 默认导出
export { LeoErrorMonitor as default } from './core/leo-error-monitor';
