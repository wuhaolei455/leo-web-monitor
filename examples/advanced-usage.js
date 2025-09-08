/**
 * Leo Error Monitor - 高级使用示例
 * 
 * 这个示例展示了如何在实际项目中使用错误监控SDK
 */

import { LeoErrorMonitor, ErrorType } from '../dist/index.esm.js';

// 1. 高级配置初始化
const monitor = new LeoErrorMonitor({
    apiKey: 'your-api-key-here',
    endpoint: 'https://your-api-endpoint.com/errors',
    timeout: 10000,
    retryTimes: 3,
    debug: false,
    autoCapture: true,
    maxErrorQueueSize: 100,
    reportInterval: 5000,
    
    // 自定义错误过滤器
    errorFilter: (error) => {
        // 过滤掉开发环境的某些错误
        if (process.env.NODE_ENV === 'development') {
            // 忽略第三方脚本错误
            if (error.filename && error.filename.includes('third-party')) {
                return false;
            }
        }
        
        // 忽略网络错误（可能是用户网络问题）
        if (error.message && error.message.includes('Network Error')) {
            return false;
        }
        
        return true;
    },
    
    // 自定义错误处理
    onError: (error) => {
        console.log('捕获到错误:', error);
        
        // 可以在这里添加额外的处理逻辑
        // 比如发送到其他监控系统
        if (error.type === ErrorType.JAVASCRIPT_ERROR) {
            // 处理JavaScript错误
            sendToAnalytics('js_error', {
                message: error.message,
                url: error.url
            });
        }
    }
});

// 2. 启动监控
monitor.start();

// 3. 与前端框架集成示例

// React错误边界集成
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

// Vue错误处理集成
const app = createApp({});
app.config.errorHandler = (err, vm, info) => {
    monitor.captureError(err, {
        vueErrorInfo: info,
        componentName: vm?.$options.name || 'Unknown'
    });
};

// 4. 网络请求错误监控
async function monitoredFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            monitor.captureError(`HTTP ${response.status}: ${response.statusText}`, {
                type: 'network_error',
                url,
                status: response.status,
                statusText: response.statusText
            });
        }
        
        return response;
    } catch (error) {
        monitor.captureError(error, {
            type: 'network_error',
            url,
            requestOptions: options
        });
        throw error;
    }
}

// 5. 用户行为追踪
function trackUserAction(action, data = {}) {
    try {
        // 执行用户操作
        performAction(action, data);
    } catch (error) {
        monitor.captureError(error, {
            userAction: action,
            actionData: data,
            userId: getCurrentUserId(),
            timestamp: Date.now()
        });
        throw error;
    }
}

// 6. 性能监控集成
function monitorPerformance() {
    // 监控长任务
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 50) { // 超过50ms的任务
                    monitor.captureError('Long Task Detected', {
                        type: 'performance',
                        duration: entry.duration,
                        startTime: entry.startTime,
                        name: entry.name
                    });
                }
            }
        });
        observer.observe({ entryTypes: ['longtask'] });
    }
    
    // 监控内存使用
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
                monitor.captureError('High Memory Usage', {
                    type: 'performance',
                    memoryUsage: {
                        used: memory.usedJSHeapSize,
                        total: memory.totalJSHeapSize,
                        limit: memory.jsHeapSizeLimit
                    }
                });
            }
        }, 30000); // 每30秒检查一次
    }
}

// 7. 自定义上报策略
class CustomReporter {
    constructor(monitor) {
        this.monitor = monitor;
        this.setupCustomReporting();
    }
    
    setupCustomReporting() {
        // 定期批量上报
        setInterval(() => {
            const errors = this.monitor.getErrors();
            if (errors.length > 0) {
                this.batchReport(errors);
                this.monitor.clearErrors();
            }
        }, 10000); // 每10秒上报一次
    }
    
    async batchReport(errors) {
        try {
            await fetch('/api/errors/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    errors,
                    sessionId: getSessionId(),
                    userId: getCurrentUserId(),
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.error('Failed to report errors:', error);
        }
    }
}

// 8. 环境配置
function initializeMonitorForEnvironment() {
    const config = {
        development: {
            debug: true,
            endpoint: 'http://localhost:3000/api/errors'
        },
        staging: {
            debug: true,
            endpoint: 'https://staging-api.example.com/errors'
        },
        production: {
            debug: false,
            endpoint: 'https://api.example.com/errors'
        }
    };
    
    const env = process.env.NODE_ENV || 'development';
    monitor.updateConfig(config[env]);
}

// 9. 工具函数
function getCurrentUserId() {
    // 获取当前用户ID的逻辑
    return localStorage.getItem('userId') || 'anonymous';
}

function getSessionId() {
    // 获取会话ID的逻辑
    return sessionStorage.getItem('sessionId') || generateSessionId();
}

function getAuthToken() {
    // 获取认证令牌的逻辑
    return localStorage.getItem('authToken');
}

function generateSessionId() {
    const sessionId = Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('sessionId', sessionId);
    return sessionId;
}

function sendToAnalytics(event, data) {
    // 发送到分析系统的逻辑
    if (window.gtag) {
        window.gtag('event', event, data);
    }
}

function performAction(action, data) {
    // 执行具体操作的逻辑
    console.log('Performing action:', action, data);
}

// 10. 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeMonitorForEnvironment();
    monitorPerformance();
    new CustomReporter(monitor);
    
    console.log('Leo Error Monitor initialized successfully');
});

// 导出监控实例供其他模块使用
export default monitor;
