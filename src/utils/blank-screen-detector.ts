/**
 * 白屏检测工具类
 */

import { Logger } from './logger';
import { ErrorType, ErrorInfo, BlankScreenConfig } from '../types';
import { getErrorBasicInfo } from './helpers';

/**
 * 白屏检测器
 */
export class BlankScreenDetector {
  private config: Required<BlankScreenConfig>;
  private logger: Logger;
  private checkTimer?: NodeJS.Timeout;
  private isChecking = false;
  private onBlankScreenDetected?: (errorInfo: ErrorInfo) => void;

  private static readonly DEFAULT_CONFIG: Required<BlankScreenConfig> = {
    enabled: true,
    delay: 1000,
    sampleCount: 10,
    threshold: 0.8
  };

  constructor(config: BlankScreenConfig, logger: Logger) {
    this.config = { ...BlankScreenDetector.DEFAULT_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * 设置白屏检测回调
   */
  setOnBlankScreenDetected(callback: (errorInfo: ErrorInfo) => void): void {
    this.onBlankScreenDetected = callback;
  }

  /**
   * 开始白屏检测
   */
  start(): void {
    if (!this.config.enabled || this.isChecking) {
      return;
    }

    this.isChecking = true;
    this.logger.debug('Starting blank screen detection');

    // 等待页面加载完成后再检测
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.scheduleCheck();
      });
    } else {
      this.scheduleCheck();
    }
  }

  /**
   * 停止白屏检测
   */
  stop(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = undefined;
    }
    this.isChecking = false;
    this.logger.debug('Blank screen detection stopped');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BlankScreenConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug('Blank screen detector config updated', config);
  }

  /**
   * 安排检测任务
   */
  private scheduleCheck(): void {
    this.checkTimer = setTimeout(() => {
      this.performCheck();
    }, this.config.delay);
  }

  /**
   * 执行白屏检测
   */
  private performCheck(): void {
    try {
      const isBlankScreen = this.detectBlankScreen();
      
      if (isBlankScreen) {
        this.logger.warn('Blank screen detected');
        this.reportBlankScreen();
      } else {
        this.logger.debug('No blank screen detected');
      }
    } catch (error) {
      this.logger.error('Error during blank screen detection', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 检测是否为白屏
   */
  private detectBlankScreen(): boolean {
    const { sampleCount, threshold } = this.config;
    
    // 获取视口尺寸
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    
    if (viewportWidth === 0 || viewportHeight === 0) {
      return true;
    }

    let blankPoints = 0;
    const totalPoints = sampleCount;

    // 在视口中随机采样
    for (let i = 0; i < totalPoints; i++) {
      const x = Math.random() * viewportWidth;
      const y = Math.random() * viewportHeight;
      
      if (this.isPointBlank(x, y)) {
        blankPoints++;
      }
    }

    const blankRatio = blankPoints / totalPoints;
    this.logger.debug(`Blank screen check: ${blankPoints}/${totalPoints} blank points (${(blankRatio * 100).toFixed(2)}%)`);
    
    return blankRatio >= threshold;
  }

  /**
   * 检测指定坐标点是否为空白
   */
  private isPointBlank(x: number, y: number): boolean {
    try {
      const element = document.elementFromPoint(x, y);
      
      if (!element) {
        return true;
      }

      // 检查元素是否为body或html，且没有背景色/图片
      if (element === document.body || element === document.documentElement) {
        const computedStyle = window.getComputedStyle(element);
        const backgroundColor = computedStyle.backgroundColor;
        const backgroundImage = computedStyle.backgroundImage;
        
        // 如果背景是透明或白色，且没有背景图片，认为是空白点
        if (
          (backgroundColor === 'rgba(0, 0, 0, 0)' || 
           backgroundColor === 'transparent' || 
           backgroundColor === 'rgb(255, 255, 255)' ||
           backgroundColor === '#ffffff' ||
           backgroundColor === 'white') &&
          (backgroundImage === 'none' || !backgroundImage)
        ) {
          return true;
        }
      }

      // 检查元素是否有实际内容
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return true;
      }

      // 检查元素是否可见
      const computedStyle = window.getComputedStyle(element);
      if (
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        computedStyle.opacity === '0'
      ) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.debug('Error checking point blank status', error);
      return false;
    }
  }

  /**
   * 报告白屏错误
   */
  private reportBlankScreen(): void {
    const errorInfo: ErrorInfo = {
      message: 'Blank screen detected',
      type: ErrorType.BLANK_SCREEN_ERROR,
      extra: {
        sampleCount: this.config.sampleCount,
        threshold: this.config.threshold,
        delay: this.config.delay,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentReadyState: document.readyState
      },
      ...getErrorBasicInfo()
    };

    if (this.onBlankScreenDetected) {
      this.onBlankScreenDetected(errorInfo);
    }
  }

  /**
   * 手动触发白屏检测
   */
  public manualCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const isBlankScreen = this.detectBlankScreen();
        if (isBlankScreen) {
          this.reportBlankScreen();
        }
        resolve(isBlankScreen);
      } catch (error) {
        this.logger.error('Manual blank screen check failed', error);
        resolve(false);
      }
    });
  }
}
