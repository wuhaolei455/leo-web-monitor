# Leo Web Monitor

一个轻量级的JavaScript运行时错误监控SDK，支持自动捕获和上报各种类型的前端错误。

## 特性

- 🚀 **轻量级**: 压缩后仅几KB，对页面性能影响极小
- 🔍 **全面监控**: 支持JavaScript错误、Promise错误、资源加载错误等
- 🛠 **TypeScript支持**: 完整的类型定义，开发体验更佳
- 📦 **多种格式**: 支持ES Module、CommonJS、UMD等多种模块格式
- ⚙️ **灵活配置**: 丰富的配置选项，满足不同场景需求
- 🎯 **智能过滤**: 支持自定义错误过滤规则
- 📊 **批量上报**: 支持错误队列和批量上报，减少网络请求

## 快速开始

### 安装

```bash
npm install leo-web-monitor
```

### 基础使用

```javascript
import { LeoWebMonitor } from 'leo-web-monitor';

// 简单初始化
const monitor = new LeoWebMonitor({
  apiKey: 'your-api-key',
  endpoint: 'https://your-api-endpoint.com/errors',
  debug: true
});

// 启动监控
monitor.start();

// 手动捕获错误
monitor.captureError('Something went wrong', {
  userId: '12345',
  page: 'home'
});
```

### HTML直接引入

```html
<script src="./dist/index.umd.js"></script>
<script>
  const monitor = new LeoWebMonitor.default({
    debug: true,
    autoCapture: true
  });
  monitor.start();
</script>
```

## 配置选项

```javascript
const monitor = new LeoWebMonitor({
  // 必选配置
  apiKey: 'your-api-key',              // API密钥
  endpoint: 'https://api.example.com', // 上报端点
  
  // 可选配置
  timeout: 5000,                       // 请求超时时间(ms)
  retryTimes: 3,                       // 重试次数
  debug: false,                        // 调试模式
  autoCapture: true,                   // 自动捕获错误
  maxErrorQueueSize: 100,              // 错误队列最大长度
  reportInterval: 2000,                // 上报间隔(ms)
  
  // 自定义过滤器
  errorFilter: (error) => {
    // 返回true表示需要上报，false表示忽略
    return !error.message.includes('Script error');
  },
  
  // 错误回调
  onError: (error) => {
    console.log('捕获到错误:', error);
  }
});
```

## API文档

### 主要方法

#### `start()`
启动错误监控

```javascript
monitor.start();
```

#### `stop()`
停止错误监控

```javascript
monitor.stop();
```

#### `captureError(error, extra?)`
手动捕获错误

```javascript
monitor.captureError('Error message', {
  userId: '123',
  action: 'click_button'
});

monitor.captureError(new Error('Something wrong'), {
  component: 'UserProfile'
});
```

#### `captureMessage(message, extra?)`
捕获消息（等同于captureError）

```javascript
monitor.captureMessage('User action completed', {
  action: 'form_submit',
  formId: 'contact-form'
});
```

#### `getErrorStats()`
获取错误统计信息

```javascript
const stats = monitor.getErrorStats();
console.log(stats);
// {
//   totalErrors: 10,
//   pendingReports: 3,
//   queueSize: 7
// }
```

#### `getErrors()`
获取所有收集的错误

```javascript
const errors = monitor.getErrors();
console.log(errors);
```

#### `clearErrors()`
清空错误队列

```javascript
monitor.clearErrors();
```

#### `updateConfig(newConfig)`
更新配置

```javascript
monitor.updateConfig({
  debug: true,
  timeout: 10000
});
```

### 错误类型

SDK支持以下错误类型：

- `JAVASCRIPT_ERROR`: JavaScript运行时错误
- `PROMISE_ERROR`: 未处理的Promise拒绝
- `RESOURCE_ERROR`: 资源加载错误
- `NETWORK_ERROR`: 网络请求错误
- `CUSTOM_ERROR`: 手动捕获的自定义错误

### 错误信息结构

```typescript
interface ErrorInfo {
  message: string;      // 错误消息
  stack?: string;       // 错误堆栈
  type: ErrorType;      // 错误类型
  timestamp: number;    // 发生时间
  url: string;          // 页面URL
  userAgent: string;    // 用户代理
  filename?: string;    // 错误源文件
  lineno?: number;      // 错误行号
  colno?: number;       // 错误列号
  extra?: Record<string, any>; // 额外信息
}
```

## 高级用法

### 与React集成

```javascript
import { LeoWebMonitor } from 'leo-web-monitor';

const monitor = new LeoWebMonitor({
  apiKey: 'your-api-key',
  endpoint: 'https://api.example.com/errors'
});

// 错误边界
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    monitor.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

### 与Vue集成

```javascript
import { LeoWebMonitor } from 'leo-web-monitor';

const monitor = new LeoWebMonitor({
  apiKey: 'your-api-key',
  endpoint: 'https://api.example.com/errors'
});

const app = createApp({});
app.config.errorHandler = (err, vm, info) => {
  monitor.captureError(err, {
    vueErrorInfo: info,
    componentName: vm?.$options.name || 'Unknown'
  });
};
```

### 网络请求监控

```javascript
async function monitoredFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      monitor.captureError(`HTTP ${response.status}: ${response.statusText}`, {
        type: 'network_error',
        url,
        status: response.status
      });
    }
    return response;
  } catch (error) {
    monitor.captureError(error, {
      type: 'network_error',
      url
    });
    throw error;
  }
}
```

## 构建和开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 代码检查
npm run lint
```

## 浏览器支持

- Chrome >= 60
- Firefox >= 55
- Safari >= 12
- Edge >= 79

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持JavaScript错误、Promise错误、资源错误监控
- 支持自定义错误过滤和处理
- 支持批量上报和重试机制
- 完整的TypeScript类型定义
# leo-web-monitor
