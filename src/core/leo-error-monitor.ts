import { LeoErrorMonitorConfig, ErrorInfo, LogLevel, SDKError, ReportResponse } from '../types';
import { Logger } from '../utils/logger';
import { ErrorHandler } from './error-handler';
import { Reporter } from './reporter';
import { deepMerge, isBrowser } from '../utils/helpers';

/**
 * Leo错误监控SDK主类
 */
export class LeoErrorMonitor {
  private config: LeoErrorMonitorConfig & Required<Pick<LeoErrorMonitorConfig, 'timeout' | 'retryTimes' | 'debug' | 'autoCapture' | 'maxErrorQueueSize' | 'reportInterval'>>;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private reporter?: Reporter;
  private isInitialized = false;
  private originalErrorHandler?: OnErrorEventHandler;
  private originalUnhandledRejectionHandler?: ((event: PromiseRejectionEvent) => void) | null;

  /**
   * 默认配置
   */
  private static readonly DEFAULT_CONFIG: Required<LeoErrorMonitorConfig> = {
    apiKey: '',
    endpoint: '',
    timeout: 5000,
    retryTimes: 3,
    debug: false,
    autoCapture: true,
    maxErrorQueueSize: 100,
    reportInterval: 2000,
    errorFilter: () => true,
    onError: () => {}
  };

  constructor(config: LeoErrorMonitorConfig | string) {
    // 支持直接传入apiKey字符串
    const configObj = typeof config === 'string' ? { apiKey: config } : config;
    this.config = deepMerge({}, LeoErrorMonitor.DEFAULT_CONFIG, configObj) as typeof this.config;

    // 初始化日志器
    this.logger = new Logger(this.config.debug ? LogLevel.DEBUG : LogLevel.WARN);

    // 初始化错误处理器
    this.errorHandler = new ErrorHandler(
      this.logger,
      this.config.maxErrorQueueSize,
      this.config.errorFilter,
      this.config.onError
    );

    // 初始化上报器（如果配置了endpoint）
    if (this.config.endpoint && this.config.apiKey) {
      this.reporter = new Reporter(
        this.logger,
        this.config.endpoint,
        this.config.apiKey,
        this.config.timeout,
        this.config.retryTimes,
        this.config.reportInterval
      );
    }

    this.logger.info('LeoErrorMonitor initialized', { config: this.config });
  }

  /**
   * 启动错误监控
   */
  start(): void {
    if (this.isInitialized) {
      this.logger.warn('LeoErrorMonitor is already started');
      return;
    }

    if (!isBrowser()) {
      this.logger.warn('LeoErrorMonitor only works in browser environment');
      return;
    }

    if (this.config.autoCapture) {
      this.setupGlobalErrorHandlers();
    }

    this.isInitialized = true;
    this.logger.info('LeoErrorMonitor started');
  }

  /**
   * 停止错误监控
   */
  stop(): void {
    if (!this.isInitialized) {
      return;
    }

    this.removeGlobalErrorHandlers();
    this.isInitialized = false;
    this.logger.info('LeoErrorMonitor stopped');
  }

  /**
   * 手动报告错误
   */
  captureError(error: Error | string, extra?: Record<string, any>): void {
    this.errorHandler.handleCustomError(error, extra);
    this.triggerReport();
  }

  /**
   * 手动报告消息
   */
  captureMessage(message: string, extra?: Record<string, any>): void {
    this.captureError(message, extra);
  }

  /**
   * 立即上报错误
   */
  async reportError(error: ErrorInfo): Promise<ReportResponse> {
    if (!this.reporter) {
      throw new SDKError('Reporter not configured', 'NO_REPORTER');
    }
    return this.reporter.reportError(error);
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats(): {
    totalErrors: number;
    pendingReports: number;
    queueSize: number;
  } {
    return {
      totalErrors: this.errorHandler.getErrorCount(),
      pendingReports: this.reporter?.getPendingCount() || 0,
      queueSize: this.errorHandler.getErrorQueue().length
    };
  }

  /**
   * 获取所有收集的错误
   */
  getErrors(): ErrorInfo[] {
    return this.errorHandler.getErrorQueue();
  }

  /**
   * 清空错误队列
   */
  clearErrors(): void {
    this.errorHandler.clearErrorQueue();
    this.reporter?.clearReportQueue();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LeoErrorMonitorConfig>): void {
    this.config = deepMerge(this.config, newConfig) as typeof this.config;
    this.logger.setLevel(this.config.debug ? LogLevel.DEBUG : LogLevel.WARN);
    this.logger.info('Configuration updated', newConfig);
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript错误处理
    this.originalErrorHandler = window.onerror;
    window.onerror = (message, filename, lineno, colno, error) => {
      this.errorHandler.handleJavaScriptError(
        String(message),
        filename,
        lineno,
        colno,
        error
      );
      this.triggerReport();
      
      // 调用原始错误处理器
      if (this.originalErrorHandler) {
        return this.originalErrorHandler(message, filename, lineno, colno, error);
      }
      return false;
    };

    // Promise错误处理
    this.originalUnhandledRejectionHandler = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      this.errorHandler.handlePromiseError(event);
      this.triggerReport();
      
      // 调用原始错误处理器
      if (this.originalUnhandledRejectionHandler) {
        this.originalUnhandledRejectionHandler(event);
      }
    };

    // 资源加载错误处理
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.errorHandler.handleResourceError(event);
        this.triggerReport();
      }
    }, true);

    this.logger.debug('Global error handlers set up');
  }

  /**
   * 移除全局错误处理器
   */
  private removeGlobalErrorHandlers(): void {
    window.onerror = this.originalErrorHandler || null;
    window.onunhandledrejection = this.originalUnhandledRejectionHandler || null;
    this.logger.debug('Global error handlers removed');
  }

  /**
   * 触发错误上报
   */
  private triggerReport(): void {
    if (this.reporter && this.errorHandler.getErrorCount() > 0) {
      const errors = this.errorHandler.getErrorQueue();
      this.reporter.addToReportQueue(errors);
      this.errorHandler.clearErrorQueue();
    }
  }

  /**
   * 获取SDK版本
   */
  static getVersion(): string {
    return '1.0.0';
  }
}
