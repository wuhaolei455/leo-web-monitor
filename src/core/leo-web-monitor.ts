import { LeoWebMonitorConfig, ErrorInfo, LogLevel, SDKError, ReportResponse, FramePerformanceData } from '../types';
import { Logger } from '../utils/logger';
import { ErrorHandler } from './error-handler';
import { Reporter } from './reporter';
import { BlankScreenDetector } from '../utils/blank-screen-detector';
import { FrameMonitor } from '../utils/frame-monitor';
import { deepMerge, isBrowser } from '../utils/helpers';

/**
 * Leo错误监控SDK主类
 */
export class LeoWebMonitor {
  private config: Required<LeoWebMonitorConfig>;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private reporter?: Reporter;
  private blankScreenDetector?: BlankScreenDetector;
  private frameMonitor?: FrameMonitor;
  private isInitialized = false;
  private originalErrorHandler?: OnErrorEventHandler;
  private originalUnhandledRejectionHandler?: ((event: PromiseRejectionEvent) => void) | null;

  /**
   * 默认配置
   */
  private static readonly DEFAULT_CONFIG: Required<LeoWebMonitorConfig> = {
    apiKey: '',
    endpoint: '',
    timeout: 5000,
    retryTimes: 3,
    debug: false,
    autoCapture: true,
    maxErrorQueueSize: 100,
    reportInterval: 2000,
    errorFilter: () => true,
    onError: () => {
      // Default empty error handler - can be overridden by user config
    },
    blankScreen: {
      enabled: true,
      delay: 1000,
      sampleCount: 10,
      threshold: 0.8
    },
    frameMonitor: {
      enabled: true,
      updateInterval: 1000,
      longFrameThreshold: 50,
      severeFrameThreshold: 100,
      monitorScroll: true,
      autoReport: false,
      reportInterval: 10000,
      onPerformanceData: () => {
        // Default empty callback
      }
    }
  };

  constructor(config: LeoWebMonitorConfig | string) {
    // 支持直接传入apiKey字符串
    const configObj = typeof config === 'string' ? { apiKey: config } : config;
    this.config = deepMerge({}, LeoWebMonitor.DEFAULT_CONFIG, configObj) as Required<LeoWebMonitorConfig>;

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

    // 初始化白屏检测器
    if (isBrowser()) {
      this.blankScreenDetector = new BlankScreenDetector(this.config.blankScreen, this.logger);
      this.blankScreenDetector.setOnBlankScreenDetected((errorInfo) => {
        this.errorHandler.handleErrorInfo(errorInfo);
        this.triggerReport();
      });

      // 初始化Frame性能监控器
      this.frameMonitor = new FrameMonitor(this.config.frameMonitor, this.logger);
    }

    this.logger.info('LeoWebMonitor initialized', { config: this.config });
  }

  /**
   * 启动错误监控
   */
  start(): void {
    if (this.isInitialized) {
      this.logger.warn('LeoWebMonitor is already started');
      return;
    }

    if (!isBrowser()) {
      this.logger.warn('LeoWebMonitor only works in browser environment');
      return;
    }

    if (this.config.autoCapture) {
      this.setupGlobalErrorHandlers();
    }

    // 启动白屏检测
    if (this.blankScreenDetector && this.config.blankScreen.enabled) {
      this.blankScreenDetector.start();
    }

    // 启动Frame性能监控
    if (this.frameMonitor && this.config.frameMonitor?.enabled) {
      this.frameMonitor.start();
    }

    this.isInitialized = true;
    this.logger.info('LeoWebMonitor started');
  }

  /**
   * 停止错误监控
   */
  stop(): void {
    if (!this.isInitialized) {
      return;
    }

    this.removeGlobalErrorHandlers();
    
    // 停止白屏检测
    if (this.blankScreenDetector) {
      this.blankScreenDetector.stop();
    }

    // 停止Frame性能监控
    if (this.frameMonitor) {
      this.frameMonitor.stop();
    }
    
    this.isInitialized = false;
    this.logger.info('LeoWebMonitor stopped');
  }

  /**
   * 手动报告错误
   */
  captureError(error: Error | string, extra?: Record<string, unknown>): void {
    this.errorHandler.handleCustomError(error, extra);
    this.triggerReport();
  }

  /**
   * 手动报告消息
   */
  captureMessage(message: string, extra?: Record<string, unknown>): void {
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
  updateConfig(newConfig: Partial<LeoWebMonitorConfig>): void {
    this.config = deepMerge(this.config, newConfig) as Required<LeoWebMonitorConfig>;
    this.logger.setLevel(this.config.debug ? LogLevel.DEBUG : LogLevel.WARN);
    
    // 更新白屏检测器配置
    if (this.blankScreenDetector && newConfig.blankScreen) {
      this.blankScreenDetector.updateConfig(newConfig.blankScreen);
      
      // 如果启用状态发生变化，重新启动或停止检测
      if (this.isInitialized && newConfig.blankScreen.enabled !== undefined) {
        if (newConfig.blankScreen.enabled) {
          this.blankScreenDetector.start();
        } else {
          this.blankScreenDetector.stop();
        }
      }
    }

    // 更新Frame性能监控器配置
    if (this.frameMonitor && newConfig.frameMonitor) {
      this.frameMonitor.updateConfig(newConfig.frameMonitor);
      
      // 如果启用状态发生变化，重新启动或停止监控
      if (this.isInitialized && newConfig.frameMonitor.enabled !== undefined) {
        if (newConfig.frameMonitor.enabled) {
          this.frameMonitor.start();
        } else {
          this.frameMonitor.stop();
        }
      }
    }
    
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
   * 手动触发白屏检测
   */
  async checkBlankScreen(): Promise<boolean> {
    if (!this.blankScreenDetector) {
      this.logger.warn('Blank screen detector not initialized');
      return false;
    }
    
    return this.blankScreenDetector.manualCheck();
  }

  /**
   * 获取白屏检测状态
   */
  getBlankScreenDetectorStatus(): { enabled: boolean; isChecking: boolean } | null {
    if (!this.blankScreenDetector) {
      return null;
    }
    
    return {
      enabled: this.config.blankScreen.enabled || false,
      isChecking: false // 这里可以根据需要扩展检测器状态
    };
  }

  /**
   * 获取Frame性能数据
   */
  getFramePerformanceData(): FramePerformanceData | null {
    if (!this.frameMonitor) {
      this.logger.warn('Frame monitor not initialized');
      return null;
    }
    
    return this.frameMonitor.getPerformanceData();
  }

  /**
   * 获取Frame监控状态
   */
  getFrameMonitorStatus(): { enabled: boolean; isMonitoring: boolean } | null {
    if (!this.frameMonitor) {
      return null;
    }
    
    return {
      enabled: this.config.frameMonitor?.enabled || false,
      isMonitoring: this.isInitialized && (this.config.frameMonitor?.enabled || false)
    };
  }

  /**
   * 获取最近的帧历史
   */
  getFrameHistory(count: number = 100) {
    if (!this.frameMonitor) {
      this.logger.warn('Frame monitor not initialized');
      return [];
    }
    
    return this.frameMonitor.getFrameHistory(count);
  }

  /**
   * 获取SDK版本
   */
  static getVersion(): string {
    // 在构建时通过rollup插件注入版本号，或者从package.json读取
    return process.env.SDK_VERSION || '1.0.4';
  }
}
