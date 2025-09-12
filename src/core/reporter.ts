import { ErrorInfo, ReportResponse, SDKError } from '../types';
import { Logger } from '../utils/logger';
import { safeStringify, debounce } from '../utils/helpers';

/**
 * 错误上报器
 */
export class Reporter {
  private logger: Logger;
  private endpoint: string;
  private apiKey: string;
  private timeout: number;
  private retryTimes: number;
  private reportQueue: ErrorInfo[] = [];
  private isReporting = false;

  // 防抖的批量上报函数
  private debouncedBatchReport: () => void;

  constructor(
    logger: Logger,
    endpoint: string,
    apiKey: string,
    timeout = 5000,
    retryTimes = 3,
    reportInterval = 1000
  ) {
    this.logger = logger;
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.timeout = timeout;
    this.retryTimes = retryTimes;
    
    // 创建防抖的批量上报函数
    this.debouncedBatchReport = debounce(() => {
      this.batchReport();
    }, reportInterval);
  }

  /**
   * 添加错误到上报队列
   */
  addToReportQueue(errors: ErrorInfo[]): void {
    this.reportQueue.push(...errors);
    this.debouncedBatchReport();
  }

  /**
   * 立即上报单个错误
   */
  async reportError(error: ErrorInfo): Promise<ReportResponse> {
    return this.sendRequest([error]);
  }

  /**
   * 批量上报错误
   */
  private async batchReport(): Promise<void> {
    if (this.isReporting || this.reportQueue.length === 0) {
      return;
    }

    this.isReporting = true;
    const errors = [...this.reportQueue];
    this.reportQueue = [];

    try {
      await this.sendRequest(errors);
      this.logger.info(`Successfully reported ${errors.length} errors`);
    } catch (error) {
      this.logger.error('Batch report failed', error);
      // 重新加入队列
      this.reportQueue.unshift(...errors);
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * 发送请求
   */
  private async sendRequest(errors: ErrorInfo[]): Promise<ReportResponse> {
    const payload = {
      errors,
      timestamp: Date.now(),
      sdk: {
        name: 'leo-error-monitor',
        version: '1.0.0'
      }
    };

    for (let attempt = 1; attempt <= this.retryTimes; attempt++) {
      try {
        const response = await this.makeRequest(payload);
        return response;
      } catch (error) {
        this.logger.warn(`Report attempt ${attempt} failed`, error);
        
        if (attempt === this.retryTimes) {
          throw new SDKError(
            'Failed to report errors after all retries',
            'REPORT_FAILED',
            { attempts: attempt, originalError: error }
          );
        }
        
        // 指数退避
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    throw new SDKError('Unexpected error in sendRequest', 'UNEXPECTED_ERROR');
  }

  /**
   * 发起HTTP请求
   */
  private async makeRequest(payload: { 
    errors: ErrorInfo[]; 
    timestamp: number; 
    sdk: { name: string; version: string }; 
  }): Promise<ReportResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-SDK-Version': '1.0.0'
        },
        body: safeStringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new SDKError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, statusText: response.statusText }
        );
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message,
        errorId: result.errorId
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof SDKError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SDKError('Request timeout', 'TIMEOUT_ERROR');
      }
      
      throw new SDKError(
        'Network request failed',
        'NETWORK_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取待上报的错误数量
   */
  getPendingCount(): number {
    return this.reportQueue.length;
  }

  /**
   * 清空上报队列
   */
  clearReportQueue(): void {
    this.reportQueue = [];
  }
}
