import { FrameMonitorConfig, FramePerformanceData, FrameInfo, ScrollPerformanceData } from '../types';
import { Logger } from './logger';

/**
 * Frame性能监控器
 * 监控页面帧率、长帧、卡顿等性能指标
 */
export class FrameMonitor {
  private config: Required<FrameMonitorConfig>;
  private logger: Logger;
  private isMonitoring = false;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private totalFrameTime = 0;
  private fpsHistory: number[] = [];
  private frameHistory: FrameInfo[] = [];
  private longFrameCount = 0;
  private severeFrameCount = 0;
  private droppedFrameCount = 0;
  private startTime = 0;
  private updateIntervalId: number | null = null;
  private lastUpdateTime = 0;
  private lastUpdateFrameCount = 0;
  
  // 滚动监控相关
  private isScrolling = false;
  private scrollStartTime = 0;
  private scrollStartY = 0;
  private scrollFrameData: FrameInfo[] = [];
  private scrollTimeoutId: number | null = null;

  private static readonly DEFAULT_CONFIG: Required<FrameMonitorConfig> = {
    enabled: true,
    updateInterval: 1000, // 每秒更新一次
    longFrameThreshold: 50, // 超过50ms认为是长帧
    severeFrameThreshold: 100, // 超过100ms认为是严重卡顿
    monitorScroll: true,
    autoReport: true,
    reportInterval: 10000, // 每10秒上报一次
    onPerformanceData: () => {
      // Default empty callback
    }
  };

  constructor(config: Partial<FrameMonitorConfig> = {}, logger: Logger) {
    this.config = { ...FrameMonitor.DEFAULT_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * 启动性能监控
   */
  start(): void {
    if (this.isMonitoring) {
      this.logger.warn('FrameMonitor is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('FrameMonitor is disabled');
      return;
    }

    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      this.logger.warn('FrameMonitor requires browser environment with requestAnimationFrame');
      return;
    }

    this.isMonitoring = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.lastUpdateTime = this.startTime;
    this.lastUpdateFrameCount = 0;
    this.resetMetrics();

    // 开始监控帧率
    this.rafId = requestAnimationFrame(this.monitorFrame);

    // 设置定期更新
    this.updateIntervalId = window.setInterval(() => {
      this.updateFPS();
    }, this.config.updateInterval);

    // 如果启用滚动监控
    if (this.config.monitorScroll) {
      this.setupScrollMonitor();
    }

    // 如果启用自动上报
    if (this.config.autoReport) {
      this.setupAutoReport();
    }

    this.logger.info('FrameMonitor started');
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // 取消动画帧
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // 清除更新定时器
    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }

    // 清除滚动监控
    if (this.config.monitorScroll) {
      this.removeScrollMonitor();
    }

    this.logger.info('FrameMonitor stopped');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<FrameMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.debug('FrameMonitor config updated', newConfig);
  }

  /**
   * 获取当前性能数据
   */
  getPerformanceData(): FramePerformanceData {
    const now = performance.now();
    
    // Calculate a fresh "current FPS" for on-demand calls, without mutating the state used by the update interval.
    const elapsedSinceUpdate = now - this.lastUpdateTime;
    const framesSinceUpdate = this.frameCount - this.lastUpdateFrameCount;
    // If no time has passed, use the last known FPS to avoid division by zero and return a stable value.
    const currentFps = elapsedSinceUpdate > 0 
      ? (framesSinceUpdate / elapsedSinceUpdate) * 1000 
      : (this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0);

    const duration = now - this.startTime;
    const avgFps = this.calculateAvgFPS();
    const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
    const maxFps = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;
    const smoothScore = this.calculateSmoothScore();
    const droppedFrameRate = this.frameCount > 0 ? this.droppedFrameCount / this.frameCount : 0;

    return {
      fps: currentFps,
      avgFps,
      minFps,
      maxFps,
      longFrameCount: this.longFrameCount,
      severeFrameCount: this.severeFrameCount,
      totalFrames: this.frameCount,
      smoothScore,
      droppedFrameRate,
      duration,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
  }

  /**
   * 获取最近的帧历史
   */
  getFrameHistory(count: number = 100): FrameInfo[] {
    return this.frameHistory.slice(-count);
  }

  /**
   * 重置监控指标
   */
  private resetMetrics(): void {
    this.frameCount = 0;
    this.totalFrameTime = 0;
    this.fpsHistory = [];
    this.frameHistory = [];
    this.longFrameCount = 0;
    this.severeFrameCount = 0;
    this.droppedFrameCount = 0;
  }

  /**
   * 监控帧率
   */
  private monitorFrame = (): void => {
    if (!this.isMonitoring) {
      return;
    }

    const now = performance.now();
    const frameDuration = now - this.lastFrameTime;
    const DROPPED_FRAME_THRESHOLD = 1000 / 60; // 60fps, ~16.7ms
    
    // 记录帧信息
    const isLongFrame = frameDuration > this.config.longFrameThreshold;
    const isSevereFrame = frameDuration > this.config.severeFrameThreshold;
    const isDroppedFrame = frameDuration > DROPPED_FRAME_THRESHOLD;
    
    const frameInfo: FrameInfo = {
      frameId: this.frameCount,
      duration: frameDuration,
      timestamp: now,
      isLongFrame,
      isSevereFrame
    };

    this.frameHistory.push(frameInfo);
    
    // 限制历史记录长度
    if (this.frameHistory.length > 1000) {
      this.frameHistory.shift();
    }

    // 统计长帧和严重卡顿帧
    if (isLongFrame) {
      this.longFrameCount++;
    }
    if (isSevereFrame) {
      this.severeFrameCount++;
    }
    if (isDroppedFrame) {
      this.droppedFrameCount++;
    }

    // 如果正在滚动，记录滚动期间的帧信息
    if (this.isScrolling) {
      this.scrollFrameData.push(frameInfo);
    }

    this.frameCount++;
    this.totalFrameTime += frameDuration;
    this.lastFrameTime = now;

    // 继续监控下一帧
    this.rafId = requestAnimationFrame(this.monitorFrame);
  };

  /**
   * 更新FPS统计
   */
  private updateFPS(): void {
    if (!this.isMonitoring) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.lastUpdateTime;
    
    // 计算当前FPS（基于自上次更新以来的帧数）
    const frameSinceLastUpdate = this.frameCount - this.lastUpdateFrameCount;
    const currentFps = elapsed > 0 ? (frameSinceLastUpdate / elapsed) * 1000 : 0;
    
    // 记录当前状态供下次计算使用
    this.lastUpdateTime = now;
    this.lastUpdateFrameCount = this.frameCount;
    
    this.fpsHistory.push(currentFps);

    // 限制FPS历史长度
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    this.logger.debug(`Current FPS: ${currentFps.toFixed(2)}`);
    
    // 触发性能数据回调
    if (this.config.onPerformanceData) {
      const perfData = this.getPerformanceData();
      this.config.onPerformanceData(perfData);
    }
  }

  /**
   * 计算平均FPS
   */
  private calculateAvgFPS(): number {
    if (this.fpsHistory.length === 0) {
      return 0;
    }
    const sum = this.fpsHistory.reduce((acc, fps) => acc + fps, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * 计算流畅度评分 (0-100)
   * 考虑因素：平均FPS、长帧占比、严重卡顿占比
   */
  private calculateSmoothScore(): number {
    if (this.frameCount === 0) {
      return 100;
    }

    const avgFps = this.calculateAvgFPS();
    const longFrameRatio = this.longFrameCount / this.frameCount;
    const severeFrameRatio = this.severeFrameCount / this.frameCount;

    // FPS得分 (60fps为满分)
    const fpsScore = Math.min(avgFps / 60, 1) * 50;

    // 长帧扣分（长帧占比越高扣分越多）
    const longFramePenalty = longFrameRatio * 30;

    // 严重卡顿扣分（严重卡顿影响更大）
    const severeFramePenalty = severeFrameRatio * 50;

    // 最终得分
    const score = Math.max(0, 100 - longFramePenalty - severeFramePenalty + (fpsScore - 50));

    return Math.round(score);
  }

  /**
   * 设置滚动监控
   */
  private setupScrollMonitor(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 监听滚动开始
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
  }

  /**
   * 移除滚动监控
   */
  private removeScrollMonitor(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('touchstart', this.handleTouchStart);
  }

  /**
   * 处理滚动事件
   */
  private handleScroll = (): void => {
    if (!this.isScrolling) {
      // 滚动开始
      this.isScrolling = true;
      this.scrollStartTime = performance.now();
      this.scrollStartY = window.scrollY || window.pageYOffset;
      this.scrollFrameData = [];
      this.logger.debug('Scroll started');
    }

    // 清除之前的定时器
    if (this.scrollTimeoutId !== null) {
      clearTimeout(this.scrollTimeoutId);
    }

    // 设置新的定时器，滚动停止150ms后认为滚动结束
    this.scrollTimeoutId = window.setTimeout(() => {
      this.handleScrollEnd();
    }, 150);
  };

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart = (): void => {
    // 为触摸滚动做准备
    this.scrollStartY = window.scrollY || window.pageYOffset;
  };

  /**
   * 处理滚动结束
   */
  private handleScrollEnd(): void {
    if (!this.isScrolling) {
      return;
    }

    this.isScrolling = false;
    const scrollEndTime = performance.now();
    const scrollEndY = window.scrollY || window.pageYOffset;

    // 计算滚动性能数据
    const scrollData = this.calculateScrollPerformance(
      this.scrollStartTime,
      scrollEndTime,
      this.scrollStartY,
      scrollEndY,
      this.scrollFrameData
    );

    this.logger.info(`Scroll performance, Dropped frame rate: ${(scrollData.droppedFrameRate * 100).toFixed(2)}%`, scrollData);
  }

  /**
   * 计算滚动性能
   */
  private calculateScrollPerformance(
    startTime: number,
    endTime: number,
    startY: number,
    endY: number,
    frames: FrameInfo[]
  ): ScrollPerformanceData {
    const scrollDistance = Math.abs(endY - startY);
    const DROPPED_FRAME_THRESHOLD = 1000 / 60; // 60fps, ~16.7ms

    if (frames.length === 0) {
      return {
        startTime,
        endTime,
        scrollDistance,
        avgFps: 0,
        minFps: 0,
        longFrameCount: 0,
        droppedFrameCount: 0,
        droppedFrameRate: 0,
        smoothScore: 100,
        url: typeof window !== 'undefined' ? window.location.href : ''
      };
    }

    // 计算滚动期间的FPS
    const avgFrameDuration = frames.reduce((sum, f) => sum + f.duration, 0) / frames.length;
    const avgFps = 1000 / avgFrameDuration;
    const minFps = 1000 / Math.max(...frames.map(f => f.duration));
    const longFrameCount = frames.filter(f => f.isLongFrame).length;
    
    // 计算掉帧
    const droppedFrameCount = frames.filter(f => f.duration > DROPPED_FRAME_THRESHOLD).length;
    const droppedFrameRate = droppedFrameCount / frames.length;

    // 滚动流畅度评分, 基于掉帧率
    const smoothScore = Math.max(0, Math.round(100 * (1 - droppedFrameRate)));

    return {
      startTime,
      endTime,
      scrollDistance,
      avgFps,
      minFps,
      longFrameCount,
      droppedFrameCount,
      droppedFrameRate,
      smoothScore,
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
  }

  /**
   * 设置自动上报
   */
  private setupAutoReport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    setInterval(() => {
      if (this.isMonitoring && this.config.onPerformanceData) {
        const perfData = this.getPerformanceData();
        this.config.onPerformanceData(perfData);
      }
    }, this.config.reportInterval);
  }
}

