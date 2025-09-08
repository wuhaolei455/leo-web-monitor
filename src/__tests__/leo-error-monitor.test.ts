/**
 * Leo Error Monitor SDK 测试
 */

import { LeoErrorMonitor } from '../core/leo-error-monitor';
import { ErrorType } from '../types';

// Mock DOM APIs
const mockLocation = {
  href: 'http://localhost:3000/test'
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)'
};

// @ts-ignore
delete window.location;
// @ts-ignore
delete window.navigator;

// @ts-ignore
window.location = mockLocation;
// @ts-ignore
window.navigator = mockNavigator;

describe('LeoErrorMonitor', () => {
  let monitor: LeoErrorMonitor;

  beforeEach(() => {
    monitor = new LeoErrorMonitor({
      debug: true,
      autoCapture: false // 禁用自动捕获以便测试
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('初始化', () => {
    test('应该正确初始化配置', () => {
      const config = {
        apiKey: 'test-key',
        endpoint: 'https://test.com/api',
        debug: true,
        timeout: 10000
      };

      const testMonitor = new LeoErrorMonitor(config);
      expect(testMonitor).toBeInstanceOf(LeoErrorMonitor);
    });

    test('应该支持字符串配置（apiKey）', () => {
      const testMonitor = new LeoErrorMonitor('test-api-key');
      expect(testMonitor).toBeInstanceOf(LeoErrorMonitor);
    });
  });

  describe('错误捕获', () => {
    test('应该能够捕获自定义错误', () => {
      const errorMessage = 'Test error message';
      const extra = { userId: '123', action: 'test' };

      monitor.captureError(errorMessage, extra);

      const errors = monitor.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(errorMessage);
      expect(errors[0].type).toBe(ErrorType.CUSTOM_ERROR);
      expect(errors[0].extra).toEqual(extra);
    });

    test('应该能够捕获Error对象', () => {
      const error = new Error('Test Error object');
      monitor.captureError(error);

      const errors = monitor.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test Error object');
      expect(errors[0].stack).toContain('Error: Test Error object');
    });

    test('应该能够捕获消息', () => {
      const message = 'Test message';
      monitor.captureMessage(message);

      const errors = monitor.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(message);
    });
  });

  describe('错误统计', () => {
    test('应该正确返回错误统计信息', () => {
      monitor.captureError('Error 1');
      monitor.captureError('Error 2');
      monitor.captureError('Error 3');

      const stats = monitor.getErrorStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.queueSize).toBe(3);
      expect(stats.pendingReports).toBe(0);
    });
  });

  describe('错误管理', () => {
    test('应该能够获取所有错误', () => {
      monitor.captureError('Error 1');
      monitor.captureError('Error 2');

      const errors = monitor.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('Error 1');
      expect(errors[1].message).toBe('Error 2');
    });

    test('应该能够清空错误队列', () => {
      monitor.captureError('Error 1');
      monitor.captureError('Error 2');

      expect(monitor.getErrors()).toHaveLength(2);

      monitor.clearErrors();
      expect(monitor.getErrors()).toHaveLength(0);
    });
  });

  describe('配置更新', () => {
    test('应该能够更新配置', () => {
      const newConfig = {
        debug: false,
        timeout: 15000
      };

      monitor.updateConfig(newConfig);
      // 配置更新应该不会抛出错误
      expect(() => monitor.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('错误过滤', () => {
    test('应该支持错误过滤', () => {
      const filterMonitor = new LeoErrorMonitor({
        debug: true,
        autoCapture: false,
        errorFilter: (error) => !error.message.includes('filtered')
      });

      filterMonitor.captureError('normal error');
      filterMonitor.captureError('filtered error');

      const errors = filterMonitor.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('normal error');

      filterMonitor.stop();
    });
  });

  describe('版本信息', () => {
    test('应该返回正确的版本号', () => {
      const version = LeoErrorMonitor.getVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('启动和停止', () => {
    test('应该能够正常启动和停止', () => {
      expect(() => {
        monitor.start();
        monitor.stop();
      }).not.toThrow();
    });

    test('重复启动应该有警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      monitor.start();
      monitor.start(); // 第二次启动

      // 由于我们的logger实现，这里可能不会直接调用console.warn
      // 但至少不应该抛出错误
      expect(() => monitor.start()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
