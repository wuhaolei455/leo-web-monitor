/**
 * 白屏检测配置选项
 */
export interface BlankScreenConfig {
  /** 是否启用白屏检测 */
  enabled?: boolean;
  /** 白屏检测延迟时间(ms) */
  delay?: number;
  /** 白屏检测的采样点数量 */
  sampleCount?: number;
  /** 白屏检测的阈值(0-1) */
  threshold?: number;
}

/**
 * Frame性能监控配置选项
 */
export interface FrameMonitorConfig {
  /** 是否启用帧率监控 */
  enabled?: boolean;
  /** FPS监控更新频率(ms) */
  updateInterval?: number;
  /** 长帧阈值(ms) - 超过此时间的帧被认为是卡顿 */
  longFrameThreshold?: number;
  /** 严重卡顿阈值(ms) */
  severeFrameThreshold?: number;
  /** 是否监控滚动事件 */
  monitorScroll?: boolean;
  /** 是否自动上报性能数据 */
  autoReport?: boolean;
  /** 性能数据上报间隔(ms) */
  reportInterval?: number;
  /** 性能数据回调 */
  onPerformanceData?: (data: FramePerformanceData) => void;
  /** 滚动性能数据回调 */
  onScrollPerformanceData?: (data: ScrollPerformanceData) => void;
}

/**
 * SDK配置选项
 */
export interface LeoWebMonitorConfig {
  /** API密钥 */
  apiKey?: string;
  /** 服务端点URL */
  endpoint?: string;
  /** 请求超时时间(ms) */
  timeout?: number;
  /** 重试次数 */
  retryTimes?: number;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 是否自动收集错误 */
  autoCapture?: boolean;
  /** 最大错误队列长度 */
  maxErrorQueueSize?: number;
  /** 错误上报间隔(ms) */
  reportInterval?: number;
  /** 自定义错误过滤器 */
  errorFilter?: (error: ErrorInfo) => boolean;
  /** 自定义错误处理回调 */
  onError?: (error: ErrorInfo) => void;
  /** 白屏检测配置 */
  blankScreen?: BlankScreenConfig;
  /** Frame性能监控配置 */
  frameMonitor?: FrameMonitorConfig;
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 错误代码 */
  code?: string;
  /** 错误类型 */
  type: ErrorType;
  /** 发生时间 */
  timestamp: number;
  /** 页面URL */
  url: string;
  /** 用户代理 */
  userAgent: string;
  /** 错误源文件 */
  filename?: string;
  /** 错误行号 */
  lineno?: number;
  /** 错误列号 */
  colno?: number;
  /** 额外信息 */
  extra?: Record<string, unknown>;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** JavaScript运行时错误 */
  JAVASCRIPT_ERROR = 'javascript_error',
  /** Promise未捕获错误 */
  PROMISE_ERROR = 'promise_error',
  /** 资源加载错误 */
  RESOURCE_ERROR = 'resource_error',
  /** 网络请求错误 */
  NETWORK_ERROR = 'network_error',
  /** 白屏错误 */
  BLANK_SCREEN_ERROR = 'blank_screen_error',
  /** 自定义错误 */
  CUSTOM_ERROR = 'custom_error'
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * SDK错误类
 */
export class SDKError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 错误上报响应接口
 */
export interface ReportResponse {
  success: boolean;
  message?: string;
  errorId?: string;
}

/**
 * Frame性能数据接口
 */
export interface FramePerformanceData {
  // FPS
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;

  // 帧数
  totalFrames: number;
  longFrameCount: number;
  severeFrameCount: number;
  droppedFrameCount: number;

  // 评分
  droppedFrameRate: number;
  smoothScore: number;

  // 元数据
  duration: number;
  timestamp: number;
  url: string;
  extra?: Record<string, unknown>;
}

/**
 * 单帧信息接口
 */
export interface FrameInfo {
  /** 帧序号 */
  frameId: number;
  /** 帧耗时(ms) */
  duration: number;
  /** 时间戳 */
  timestamp: number;
  /** 是否为长帧 */
  isLongFrame: boolean;
  /** 是否为严重卡顿帧 */
  isSevereFrame: boolean;
}

/**
 * 滚动性能数据接口
 */
export interface ScrollPerformanceData {
  // 元数据
  duration: number;
  scrollDistance: number;
  url: string;

  // 帧
  totalFrames: number;
  longFrameCount: number;
  droppedFrameCount: number;

  // FPS
  avgFps: number;
  minFps: number;

  // 评分
  droppedFrameRate: number;
  smoothScore: number;
}
