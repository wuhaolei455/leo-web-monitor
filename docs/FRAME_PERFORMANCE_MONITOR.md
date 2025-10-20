# Frame性能监控功能文档

## 概述

Frame性能监控是leo-web-monitor SDK的核心功能之一，用于实时监控网页的帧率(FPS)、检测长帧和卡顿，并对页面流畅度进行量化评分。该功能特别适用于监控首页滑动、复杂动画、大量DOM操作等场景的性能表现。

## 核心指标

### 1. FPS (Frames Per Second - 每秒帧数)

- **当前FPS**: 实时帧率，理想值为60fps
- **平均FPS**: 监控期间的平均帧率
- **最小FPS**: 监控期间的最低帧率
- **最大FPS**: 监控期间的最高帧率

### 2. 长帧检测

- **长帧 (Long Frame)**: 渲染时间超过50ms的帧（默认阈值）
- **严重卡顿帧 (Severe Frame)**: 渲染时间超过100ms的帧（默认阈值）

### 3. 流畅度评分

综合评分系统（0-100分），考虑以下因素：
- 平均FPS（占比50%）
- 长帧占比（扣分30%）
- 严重卡顿占比（扣分50%）

**评分标准：**
- 90-100分: 优秀，非常流畅
- 80-89分: 良好，基本流畅
- 60-79分: 一般，有轻微卡顿
- 0-59分: 较差，卡顿明显

### 4. 滚动性能监控

专门针对滚动场景的性能监控：
- 滚动开始/结束时间
- 滚动距离
- 滚动期间的平均FPS和最小FPS
- 滚动期间的长帧数量
- 滚动流畅度评分

## 快速开始

### 基础配置

```javascript
import { LeoWebMonitor } from 'leo-web-monitor';

const monitor = new LeoWebMonitor({
  apiKey: 'your-api-key',
  endpoint: 'https://your-api.com/report',
  frameMonitor: {
    enabled: true,                    // 启用Frame监控
    updateInterval: 1000,             // 更新间隔1秒
    longFrameThreshold: 50,           // 长帧阈值50ms
    severeFrameThreshold: 100,        // 严重卡顿阈值100ms
    monitorScroll: true,              // 监控滚动性能
    autoReport: true,                 // 自动上报性能数据
    reportInterval: 10000,            // 上报间隔10秒
    onPerformanceData: (data) => {
      console.log('性能数据:', data);
    }
  }
});

// 启动监控
monitor.start();
```

### 获取性能数据

```javascript
// 获取实时性能数据
const perfData = monitor.getFramePerformanceData();
console.log('当前FPS:', perfData.fps);
console.log('平均FPS:', perfData.avgFps);
console.log('流畅度评分:', perfData.smoothScore);

// 获取最近的帧历史（默认100帧）
const frameHistory = monitor.getFrameHistory(100);
frameHistory.forEach(frame => {
  console.log(`帧${frame.frameId}: ${frame.duration.toFixed(2)}ms`, 
              frame.isLongFrame ? '[长帧]' : '');
});

// 获取监控状态
const status = monitor.getFrameMonitorStatus();
console.log('监控是否启用:', status.enabled);
console.log('是否正在监控:', status.isMonitoring);
```

## 配置选项详解

### FrameMonitorConfig

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | true | 是否启用帧率监控 |
| `updateInterval` | number | 1000 | FPS更新频率（毫秒） |
| `longFrameThreshold` | number | 50 | 长帧阈值（毫秒） |
| `severeFrameThreshold` | number | 100 | 严重卡顿阈值（毫秒） |
| `monitorScroll` | boolean | true | 是否监控滚动事件 |
| `autoReport` | boolean | false | 是否自动上报性能数据 |
| `reportInterval` | number | 10000 | 性能数据上报间隔（毫秒） |
| `onPerformanceData` | function | - | 性能数据更新回调函数 |

## 数据结构

### FramePerformanceData

```typescript
interface FramePerformanceData {
  fps: number;                    // 当前FPS
  avgFps: number;                 // 平均FPS
  minFps: number;                 // 最小FPS
  maxFps: number;                 // 最大FPS
  longFrameCount: number;         // 长帧数量
  severeFrameCount: number;       // 严重卡顿帧数量
  totalFrames: number;            // 总帧数
  smoothScore: number;            // 流畅度评分 (0-100)
  duration: number;               // 监控时长(ms)
  timestamp: number;              // 时间戳
  url: string;                    // 页面URL
  extra?: Record<string, unknown>; // 额外信息
}
```

### FrameInfo

```typescript
interface FrameInfo {
  frameId: number;        // 帧序号
  duration: number;       // 帧耗时(ms)
  timestamp: number;      // 时间戳
  isLongFrame: boolean;   // 是否为长帧
  isSevereFrame: boolean; // 是否为严重卡顿帧
}
```

### ScrollPerformanceData

```typescript
interface ScrollPerformanceData {
  startTime: number;      // 滚动开始时间
  endTime: number;        // 滚动结束时间
  scrollDistance: number; // 滚动距离
  avgFps: number;         // 滚动期间的平均FPS
  minFps: number;         // 滚动期间的最小FPS
  longFrameCount: number; // 滚动期间的长帧数
  smoothScore: number;    // 滚动流畅度评分 (0-100)
  url: string;           // 页面URL
}
```

## 使用场景

### 场景1: 监控首页滑动性能

```javascript
const monitor = new LeoWebMonitor({
  apiKey: 'your-api-key',
  frameMonitor: {
    enabled: true,
    monitorScroll: true,
    onPerformanceData: (data) => {
      // 当流畅度评分过低时告警
      if (data.smoothScore < 60) {
        console.warn('页面滑动卡顿严重！', {
          score: data.smoothScore,
          avgFps: data.avgFps,
          longFrames: data.longFrameCount
        });
        
        // 上报到监控平台
        reportToMonitoring({
          type: 'performance_issue',
          severity: 'high',
          data: data
        });
      }
    }
  }
});

monitor.start();
```

### 场景2: 实时性能面板

```javascript
// 创建实时FPS显示面板
function createFPSPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    z-index: 9999;
  `;
  document.body.appendChild(panel);
  
  // 每500ms更新一次
  setInterval(() => {
    const perfData = monitor.getFramePerformanceData();
    if (perfData) {
      panel.innerHTML = `
        FPS: ${perfData.fps.toFixed(1)}<br>
        Avg: ${perfData.avgFps.toFixed(1)}<br>
        Score: ${perfData.smoothScore}<br>
        Long Frames: ${perfData.longFrameCount}
      `;
      
      // 根据FPS改变颜色
      if (perfData.fps < 30) {
        panel.style.background = 'rgba(255,0,0,0.8)';
      } else if (perfData.fps < 50) {
        panel.style.background = 'rgba(255,165,0,0.8)';
      } else {
        panel.style.background = 'rgba(0,128,0,0.8)';
      }
    }
  }, 500);
}

createFPSPanel();
```

### 场景3: 性能基准测试

```javascript
async function performanceTest() {
  const monitor = new LeoWebMonitor({
    frameMonitor: {
      enabled: true,
      monitorScroll: false
    }
  });
  
  monitor.start();
  
  // 等待5秒收集基准数据
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 执行测试操作
  console.log('开始测试...');
  await performHeavyOperation();
  
  // 获取测试结果
  const perfData = monitor.getFramePerformanceData();
  
  console.log('测试结果:');
  console.log(`- 平均FPS: ${perfData.avgFps.toFixed(2)}`);
  console.log(`- 最小FPS: ${perfData.minFps.toFixed(2)}`);
  console.log(`- 长帧数: ${perfData.longFrameCount}`);
  console.log(`- 严重卡顿: ${perfData.severeFrameCount}`);
  console.log(`- 流畅度评分: ${perfData.smoothScore}/100`);
  
  // 判断是否通过测试
  const passed = perfData.avgFps >= 50 && perfData.smoothScore >= 70;
  console.log(passed ? '✅ 测试通过' : '❌ 测试失败');
  
  monitor.stop();
}
```

### 场景4: 动态调整配置

```javascript
const monitor = new LeoWebMonitor({
  frameMonitor: { enabled: true }
});

monitor.start();

// 在复杂交互场景下降低阈值
function enterComplexMode() {
  monitor.updateConfig({
    frameMonitor: {
      longFrameThreshold: 33,      // 更严格的长帧定义（30fps）
      severeFrameThreshold: 66     // 更严格的卡顿定义（15fps）
    }
  });
}

// 恢复正常阈值
function exitComplexMode() {
  monitor.updateConfig({
    frameMonitor: {
      longFrameThreshold: 50,
      severeFrameThreshold: 100
    }
  });
}
```

## 性能影响

Frame性能监控本身的开销极小：
- 使用`requestAnimationFrame`进行帧率监控，与浏览器渲染周期同步
- 仅在需要时计算统计数据
- 历史记录有长度限制（默认1000帧），避免内存泄漏
- 可通过配置调整更新频率来平衡精度和性能

**建议：**
- 生产环境建议将`updateInterval`设置为1000ms或更高
- 如不需要滚动监控，可关闭`monitorScroll`以减少事件监听
- 定期获取性能数据而非实时获取

## 注意事项

1. **浏览器兼容性**
   - 需要浏览器支持`requestAnimationFrame`和`performance.now()`
   - 现代浏览器均支持，IE10+兼容

2. **隐藏标签页**
   - 当页面标签页不可见时，浏览器会降低`requestAnimationFrame`的频率
   - 这是浏览器的优化行为，属于正常现象

3. **FPS波动**
   - 页面初次加载时FPS可能不稳定，建议等待1-2秒后再采集数据
   - 浏览器DevTools打开时会影响性能

4. **滚动监控**
   - 滚动结束的判定：滚动停止后150ms无新滚动事件
   - 触摸滚动和鼠标滚动都会被监控

## 最佳实践

### 1. 设置合理的阈值

```javascript
// 根据业务场景设置不同的阈值
const config = {
  frameMonitor: {
    // 常规内容页面
    longFrameThreshold: 50,
    severeFrameThreshold: 100,
    
    // 如果是游戏或动画密集型应用，可以更严格
    // longFrameThreshold: 33,  // 30fps
    // severeFrameThreshold: 50, // 20fps
  }
};
```

### 2. 按需启用监控

```javascript
// 只在关键页面启用
if (isKeyPage()) {
  monitor.updateConfig({
    frameMonitor: { enabled: true }
  });
}

// 非关键页面可以关闭
if (isStaticPage()) {
  monitor.updateConfig({
    frameMonitor: { enabled: false }
  });
}
```

### 3. 结合错误监控

```javascript
const monitor = new LeoWebMonitor({
  frameMonitor: {
    enabled: true,
    onPerformanceData: (data) => {
      // 当性能严重下降时，作为错误上报
      if (data.smoothScore < 50) {
        monitor.captureError('Performance Issue', {
          type: 'poor_performance',
          fps: data.avgFps,
          score: data.smoothScore,
          longFrames: data.longFrameCount
        });
      }
    }
  }
});
```

### 4. 采样上报

```javascript
// 避免频繁上报，使用采样策略
let reportCounter = 0;
const REPORT_INTERVAL = 10; // 每10次采样上报一次

const monitor = new LeoWebMonitor({
  frameMonitor: {
    onPerformanceData: (data) => {
      reportCounter++;
      if (reportCounter >= REPORT_INTERVAL) {
        // 上报到服务器
        sendToServer(data);
        reportCounter = 0;
      }
    }
  }
});
```

## API参考

### LeoWebMonitor实例方法

#### getFramePerformanceData()

获取当前的性能数据。

**返回值：** `FramePerformanceData | null`

```javascript
const perfData = monitor.getFramePerformanceData();
```

#### getFrameHistory(count?: number)

获取最近的帧历史记录。

**参数：**
- `count` (可选): 获取的帧数量，默认100

**返回值：** `FrameInfo[]`

```javascript
const history = monitor.getFrameHistory(50);
```

#### getFrameMonitorStatus()

获取Frame监控的状态。

**返回值：** `{ enabled: boolean, isMonitoring: boolean } | null`

```javascript
const status = monitor.getFrameMonitorStatus();
```

## 演示示例

完整的演示页面位于 `examples/frame-monitor-demo.html`，展示了：
- 实时FPS监控面板
- FPS历史曲线图
- 流畅度评分可视化
- 长帧和卡顿统计
- 滚动性能测试
- 重量级元素测试
- 手动制造卡顿测试

运行演示：
```bash
# 构建SDK
npm run build

# 在浏览器中打开
open examples/frame-monitor-demo.html
```

## 常见问题

### Q1: 为什么FPS显示为0或NaN？

**A:** 可能原因：
1. 监控刚启动，还没有收集到足够的数据
2. 页面标签页不可见
3. 浏览器不支持相关API

**解决方案：** 等待1-2秒后再获取数据，或检查浏览器兼容性。

### Q2: 为什么监控会影响页面性能？

**A:** 如果发现监控本身影响性能，可以：
1. 增大`updateInterval`，减少更新频率
2. 关闭不需要的功能如`monitorScroll`
3. 减少`onPerformanceData`回调中的计算量

### Q3: 如何监控特定操作的性能？

**A:** 可以在操作前后获取性能数据对比：

```javascript
// 操作前
const beforeData = monitor.getFramePerformanceData();
const beforeFrames = beforeData.totalFrames;

// 执行操作
await performOperation();

// 操作后等待一下
await new Promise(resolve => setTimeout(resolve, 100));
const afterData = monitor.getFramePerformanceData();

// 计算这段时间内的统计
const framesInOperation = afterData.totalFrames - beforeFrames;
const longFramesInOperation = afterData.longFrameCount - beforeData.longFrameCount;

console.log(`操作期间渲染了${framesInOperation}帧，其中${longFramesInOperation}个长帧`);
```

### Q4: 流畅度评分的计算规则是什么？

**A:** 评分综合考虑三个因素：
1. **FPS得分**：avgFps / 60 * 50（最高50分）
2. **长帧惩罚**：长帧占比 * 30（最多扣30分）
3. **严重卡顿惩罚**：严重帧占比 * 50（最多扣50分）

最终得分 = 100 - 长帧惩罚 - 严重卡顿惩罚 + (FPS得分 - 50)

这个算法确保了流畅体验的多维度考量。

## 相关资源

- [Chrome Performance API文档](https://developer.chrome.com/docs/devtools/evaluate-performance/)
- [requestAnimationFrame详解](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [Web性能优化最佳实践](https://web.dev/performance/)
- [前端性能监控实践](https://web.dev/vitals/)

## 更新日志

### v1.1.0 (2024-10)
- ✨ 新增Frame性能监控功能
- ✨ 支持FPS实时监控
- ✨ 支持长帧和卡顿检测
- ✨ 支持滚动性能监控
- ✨ 支持流畅度评分
- 📝 添加完整的API文档和示例

