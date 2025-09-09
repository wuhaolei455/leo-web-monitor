# 白屏检测功能文档

## 概述

白屏检测是 Leo Web Monitor SDK 的重要功能之一，用于自动检测页面是否出现白屏现象，帮助开发者及时发现页面渲染异常。

## 功能特性

### 🎯 核心特性
- **自动检测**: 页面加载完成后自动启动白屏检测
- **智能采样**: 通过随机采样点检测页面内容
- **可配置阈值**: 支持自定义白屏判定阈值
- **延迟检测**: 可配置检测延迟时间，避免误报
- **手动触发**: 支持手动触发白屏检测

### 🔧 检测原理
1. **采样检测**: 在视口范围内随机选择多个采样点
2. **元素分析**: 检查每个采样点的DOM元素和样式
3. **空白判定**: 根据元素类型、样式、可见性等判断是否为空白点
4. **阈值比较**: 当空白点比例超过设定阈值时，判定为白屏

## 配置选项

```typescript
interface BlankScreenConfig {
  /** 是否启用白屏检测 */
  enableBlankScreen?: boolean;
  /** 白屏检测延迟时间(ms) */
  blankScreenDelay?: number;
  /** 白屏检测的采样点数量 */
  blankScreenSampleCount?: number;
  /** 白屏检测的阈值(0-1) */
  blankScreenThreshold?: number;
}
```

### 默认配置
- `enableBlankScreen`: `true` - 启用白屏检测
- `blankScreenDelay`: `1000` - 延迟1秒后开始检测
- `blankScreenSampleCount`: `10` - 采样10个随机点
- `blankScreenThreshold`: `0.8` - 80%以上空白点判定为白屏

## 使用方法

### 基础使用

```javascript
// 初始化时配置白屏检测
const monitor = new LeoWebMonitor({
  enableBlankScreen: true,
  blankScreenDelay: 1000,
  blankScreenSampleCount: 10,
  blankScreenThreshold: 0.8,
  onError: (errorInfo) => {
    if (errorInfo.type === 'blank_screen_error') {
      console.log('检测到白屏:', errorInfo);
    }
  }
});

monitor.start();
```

### 高级配置

```javascript
const monitor = new LeoWebMonitor({
  // 基础配置
  debug: true,
  autoCapture: true,
  
  // 白屏检测配置
  enableBlankScreen: true,
  blankScreenDelay: 2000,        // 延迟2秒检测
  blankScreenSampleCount: 15,    // 增加采样点数量
  blankScreenThreshold: 0.9,     // 提高判定阈值
  
  onError: (errorInfo) => {
    console.log('错误信息:', errorInfo);
  }
});
```

### 手动触发检测

```javascript
// 手动触发白屏检测
monitor.checkBlankScreen().then(isBlank => {
  console.log('白屏检测结果:', isBlank);
});

// 获取检测器状态
const status = monitor.getBlankScreenDetectorStatus();
console.log('检测器状态:', status);
```

### 动态更新配置

```javascript
// 运行时更新配置
monitor.updateConfig({
  enableBlankScreen: true,
  blankScreenDelay: 1500,
  blankScreenThreshold: 0.7
});
```

## 错误信息格式

当检测到白屏时，会生成以下格式的错误信息：

```javascript
{
  message: 'Blank screen detected',
  type: 'blank_screen_error',
  timestamp: 1640995200000,
  url: 'https://example.com',
  userAgent: 'Mozilla/5.0...',
  extra: {
    sampleCount: 10,           // 采样点数量
    threshold: 0.8,            // 判定阈值
    delay: 1000,               // 检测延迟
    viewportWidth: 1920,       // 视口宽度
    viewportHeight: 1080,      // 视口高度
    documentReadyState: 'complete' // 文档状态
  }
}
```

## 检测逻辑详解

### 空白点判定条件
一个采样点被判定为空白点需要满足以下条件之一：

1. **无元素**: `document.elementFromPoint()` 返回 `null`
2. **根元素**: 采样点为 `body` 或 `html` 元素，且：
   - 背景色为透明、白色或默认色
   - 无背景图片
3. **无尺寸**: 元素的 `width` 或 `height` 为 0
4. **不可见**: 元素样式为：
   - `display: none`
   - `visibility: hidden`
   - `opacity: 0`

### 检测时机
- **自动检测**: 页面 `DOMContentLoaded` 事件触发后，延迟指定时间开始检测
- **手动检测**: 调用 `checkBlankScreen()` 方法立即检测

## 最佳实践

### 1. 合理设置延迟时间
```javascript
{
  // SPA应用建议延迟时间长一些
  blankScreenDelay: 2000,
  
  // 静态页面可以短一些
  blankScreenDelay: 500
}
```

### 2. 调整采样点数量
```javascript
{
  // 复杂页面增加采样点
  blankScreenSampleCount: 20,
  
  // 简单页面减少采样点
  blankScreenSampleCount: 5
}
```

### 3. 设置合适的阈值
```javascript
{
  // 严格检测
  blankScreenThreshold: 0.9,
  
  // 宽松检测
  blankScreenThreshold: 0.6
}
```

### 4. 错误处理
```javascript
const monitor = new LeoWebMonitor({
  onError: (errorInfo) => {
    if (errorInfo.type === 'blank_screen_error') {
      // 白屏错误特殊处理
      console.error('页面白屏:', errorInfo);
      
      // 可以进行页面刷新或其他恢复操作
      if (confirm('页面出现异常，是否刷新？')) {
        location.reload();
      }
    }
  }
});
```

## 注意事项

### 1. 浏览器兼容性
- 需要支持 `document.elementFromPoint()` API
- 需要支持 `window.getComputedStyle()` API
- IE9+ 及现代浏览器

### 2. 性能影响
- 检测过程会调用DOM API，有轻微性能开销
- 建议合理设置采样点数量，避免过多采样
- 检测是一次性的，不会持续消耗性能

### 3. 误报情况
- 页面正在加载时可能误报
- 页面有动画效果时可能误报
- 建议设置合适的延迟时间和阈值

### 4. 特殊场景
- **懒加载**: 对于懒加载内容，可能需要调整检测时机
- **SPA路由**: 路由切换后可能需要手动触发检测
- **iframe**: 目前只检测主页面，不检测iframe内容

## API 参考

### 方法

#### `checkBlankScreen(): Promise<boolean>`
手动触发白屏检测

**返回值**: Promise，resolve为布尔值，表示是否检测到白屏

#### `getBlankScreenDetectorStatus(): object | null`
获取白屏检测器状态

**返回值**: 
```javascript
{
  enabled: boolean,    // 是否启用
  isChecking: boolean  // 是否正在检查
}
```

### 事件

#### `onError` 回调
当检测到白屏时，会触发 `onError` 回调，错误类型为 `blank_screen_error`

## 示例代码

完整的使用示例可以参考 `examples/basic-usage.html` 文件，其中包含了：
- 基础配置示例
- 手动检测功能
- 状态查询功能
- 白屏模拟功能

运行示例：
```bash
# 构建项目
npm run build

# 在浏览器中打开 examples/basic-usage.html
```
