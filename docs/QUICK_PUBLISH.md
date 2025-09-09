# 🚀 快速发布指南

## 一键发布命令

```bash
# 修订版本发布 (1.0.0 -> 1.0.1)
npm run publish:patch

# 次版本发布 (1.0.0 -> 1.1.0)  
npm run publish:minor

# 主版本发布 (1.0.0 -> 2.0.0)
npm run publish:major
```

## 手动发布步骤

### 1. 登录NPM (首次)
```bash
npm login
```

### 2. 检查包名可用性
```bash
npm view leo-error-monitor
# 如果返回404，说明包名可用
```

### 3. 预发布检查
```bash
# 运行测试
npm test

# 代码检查
npm run lint

# 构建项目
npm run build

# 预发布检查
npm run publish:dry
```

### 4. 更新版本并发布
```bash
# 更新版本号
npm version patch  # 或 minor/major

# 发布到NPM
npm publish
```

## 发布前检查清单

- [ ] 代码已提交到Git
- [ ] 所有测试通过
- [ ] 代码检查通过  
- [ ] README.md已更新
- [ ] CHANGELOG.md已更新
- [ ] 版本号已正确更新
- [ ] 已登录NPM账户

## 发布后验证

```bash
# 检查发布状态
npm view leo-web-monitor

# 测试安装
mkdir test-install && cd test-install
npm init -y
npm install leo-web-monitor
```

## 常见问题

### 包名已存在
修改package.json中的name字段：
```json
{
  "name": "@your-username/leo-web-monitor"
}
```

### 权限被拒绝
```bash
npm logout
npm login
```

### 构建失败
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```
