import { ErrorInfo, ErrorType } from '../types';
import { Logger } from '../utils/logger';
import { getErrorBasicInfo, getStackTrace } from '../utils/helpers';

/**
 * 错误处理器
 */
export class ErrorHandler {
  private logger: Logger;
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize: number;
  private errorFilter?: (error: ErrorInfo) => boolean;
  private onError?: (error: ErrorInfo) => void;

  constructor(
    logger: Logger,
    maxQueueSize = 100,
    errorFilter?: (error: ErrorInfo) => boolean,
    onError?: (error: ErrorInfo) => void
  ) {
    this.logger = logger;
    this.maxQueueSize = maxQueueSize;
    this.errorFilter = errorFilter;
    this.onError = onError;
  }

  /**
   * 处理JavaScript错误
   */
  handleJavaScriptError(
    message: string,
    filename?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): void {
    const errorInfo: ErrorInfo = {
      message,
      stack: error ? getStackTrace(error) : undefined,
      type: ErrorType.JAVASCRIPT_ERROR,
      filename,
      lineno,
      colno,
      ...getErrorBasicInfo()
    };

    this.processError(errorInfo);
  }

  /**
   * 处理Promise错误
   */
  handlePromiseError(event: PromiseRejectionEvent): void {
    const error = event.reason;
    const errorInfo: ErrorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? getStackTrace(error) : undefined,
      type: ErrorType.PROMISE_ERROR,
      ...getErrorBasicInfo()
    };

    this.processError(errorInfo);
  }

  /**
   * 处理资源加载错误
   */
  handleResourceError(event: Event): void {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const src = (target as HTMLElement & { src?: string; href?: string }).src || 
                (target as HTMLElement & { src?: string; href?: string }).href;

    const errorInfo: ErrorInfo = {
      message: `Resource loading failed: ${tagName}`,
      type: ErrorType.RESOURCE_ERROR,
      filename: src,
      extra: {
        tagName,
        src
      },
      ...getErrorBasicInfo()
    };

    this.processError(errorInfo);
  }

  /**
   * 处理自定义错误
   */
  handleCustomError(error: Error | string, extra?: Record<string, unknown>): void {
    const errorInfo: ErrorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? getStackTrace(error) : undefined,
      type: ErrorType.CUSTOM_ERROR,
      extra,
      ...getErrorBasicInfo()
    };

    this.processError(errorInfo);
  }

  /**
   * 处理错误信息（公共方法）
   */
  handleErrorInfo(errorInfo: ErrorInfo): void {
    this.processError(errorInfo);
  }

  handleBlankScreenError(): void {
    const errorInfo: ErrorInfo = {
      message: 'Blank screen error',
      type: ErrorType.BLANK_SCREEN_ERROR,
      ...getErrorBasicInfo()
    };

    this.processError(errorInfo);
  }


  /**
   * 处理错误
   */
  private processError(errorInfo: ErrorInfo): void {
    try {
      // 应用错误过滤器
      if (this.errorFilter && !this.errorFilter(errorInfo)) {
        this.logger.debug('Error filtered out', errorInfo);
        return;
      }

      // 添加到错误队列
      this.addToQueue(errorInfo);

      // 调用错误回调
      if (this.onError) {
        this.onError(errorInfo);
      }

      this.logger.debug('Error processed', errorInfo);
    } catch (error) {
      this.logger.error('Error processing failed', error);
    }
  }

  /**
   * 添加错误到队列
   */
  private addToQueue(errorInfo: ErrorInfo): void {
    if (this.errorQueue.length >= this.maxQueueSize) {
      this.errorQueue.shift(); // 移除最旧的错误
    }
    this.errorQueue.push(errorInfo);
  }

  /**
   * 获取错误队列
   */
  getErrorQueue(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  /**
   * 清空错误队列
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * 获取队列中的错误数量
   */
  getErrorCount(): number {
    return this.errorQueue.length;
  }
}
