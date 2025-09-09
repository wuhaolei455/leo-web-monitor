# Leo Web Monitor SDK - NPM发布指南

## 📦 发布前准备

### 1. 环境检查

确保你的开发环境已经准备就绪：

```bash
# 检查Node.js版本（建议14+）
node --version

# 检查npm版本
npm --version

# 检查是否已登录npm
npm whoami
```

### 2. 项目结构检查

确保项目结构完整：

```
leo-web-monitor/
├── src/                    # 源代码
├── dist/                   # 构建输出（发布时包含）
├── examples/               # 示例代码
├── package.json           # 包配置
├── README.md              # 项目文档
├── tsconfig.json          # TypeScript配置
├── rollup.config.js       # 构建配置
└── jest.config.js         # 测试配置
```

## 🔧 package.json 配置检查

确保 `package.json` 包含以下关键字段：

```json
{
  "name": "leo-web-monitor",
  "version": "1.0.0",
  "description": "A lightweight JavaScript runtime error monitoring SDK",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "rollup -c",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run build && npm run test"
  },
  "keywords": [
    "error-monitoring",
    "javascript",
    "typescript",
    "sdk",
    "error-tracking",
    "frontend",
    "browser"
  ],
  "author": "Leo <your-email@example.com>",
  "license": "MIT",
  "homepage": "https://github.com/your-username/leo-web-monitor",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/leo-web-monitor.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/leo-web-monitor/issues"
  }
}
```

## 🚀 发布步骤

### 步骤1: 登录NPM账户

如果还没有npm账户，先注册：
```bash
# 注册新账户
npm adduser

# 或者登录现有账户
npm login
```

输入你的用户名、密码和邮箱。

### 步骤2: 检查包名可用性

```bash
# 检查包名是否已被占用
npm view leo-web-monitor

# 如果返回404，说明包名可用
# 如果返回包信息，需要更改包名
```

### 步骤3: 运行测试

```bash
# 运行所有测试
npm test

# 运行代码检查
npm run lint

# 确保所有测试通过
```

### 步骤4: 构建生产版本

```bash
# 构建项目
npm run build

# 检查dist目录是否生成正确的文件
ls dist/
```

应该看到以下文件：
- `index.js` (CommonJS版本)
- `index.esm.js` (ES Module版本)
- `index.umd.js` (UMD版本)
- `index.d.ts` (TypeScript类型定义)
- 对应的source map文件

### 步骤5: 预发布检查

```bash
# 模拟发布过程，检查将要发布的文件
npm pack

# 这会生成一个.tgz文件，可以检查其内容
tar -tzf leo-web-monitor-1.0.0.tgz

# 清理临时文件
rm leo-web-monitor-1.0.0.tgz
```

### 步骤6: 发布到NPM

```bash
# 发布到npm
npm publish

# 如果是第一次发布公共包，可能需要添加--access public
npm publish --access public
```

### 步骤7: 验证发布

```bash
# 检查发布是否成功
npm view leo-web-monitor

# 在另一个目录测试安装
mkdir test-install && cd test-install
npm init -y
npm install leo-web-monitor
```

## 📋 发布检查清单

在发布前，请确认以下事项：

- [ ] ✅ 代码已提交到Git仓库
- [ ] ✅ 版本号已更新（遵循语义化版本）
- [ ] ✅ README.md文档完整且最新
- [ ] ✅ 所有测试通过
- [ ] ✅ 代码检查通过
- [ ] ✅ 构建成功，dist目录包含所有必要文件
- [ ] ✅ package.json配置正确
- [ ] ✅ 已登录npm账户
- [ ] ✅ 包名可用或已拥有

## 🔄 版本管理

### 语义化版本控制

遵循 [Semantic Versioning](https://semver.org/) 规范：

- **主版本号 (Major)**：不兼容的API修改
- **次版本号 (Minor)**：向下兼容的功能性新增
- **修订号 (Patch)**：向下兼容的问题修正

### 版本更新命令

```bash
# 修订版本 (1.0.0 -> 1.0.1)
npm version patch

# 次版本 (1.0.1 -> 1.1.0)
npm version minor

# 主版本 (1.1.0 -> 2.0.0)
npm version major
```

这些命令会自动更新package.json中的版本号并创建git标签。

## 🏷️ 标签发布

对于特殊版本，可以使用标签：

```bash
# 发布beta版本
npm publish --tag beta

# 发布alpha版本
npm publish --tag alpha

# 用户可以这样安装
npm install leo-error-monitor@beta
```

## 📊 发布后管理

### 查看包统计

```bash
# 查看包信息
npm view leo-error-monitor

# 查看下载统计
npm view leo-error-monitor --json | jq .downloads
```

### 更新包信息

```bash
# 更新包描述
npm view leo-error-monitor description "新的描述"

# 添加协作者
npm owner add <username> leo-web-monitor
```

## 🚨 常见问题

### 1. 包名已存在

```bash
# 错误信息
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/leo-web-monitor

# 解决方案：更改包名
# 在package.json中修改name字段
{
  "name": "@your-username/leo-web-monitor"
}
```

### 2. 权限问题

```bash
# 确保已登录
npm whoami

# 重新登录
npm logout
npm login
```

### 3. 构建失败

```bash
# 清理node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 4. 发布被拒绝

```bash
# 检查是否有prepublishOnly钩子失败
npm run prepublishOnly

# 检查.npmignore或package.json的files字段
```

## 📝 发布后的TODO

1. **创建GitHub Release**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **更新文档**
   - 更新README.md中的安装说明
   - 添加更新日志(CHANGELOG.md)

3. **宣传推广**
   - 在社交媒体分享
   - 写技术博客介绍SDK
   - 在相关社区分享

4. **监控反馈**
   - 关注GitHub Issues
   - 监控npm下载量
   - 收集用户反馈

## 🔗 相关链接

- [NPM官方文档](https://docs.npmjs.com/)
- [语义化版本规范](https://semver.org/)
- [NPM包发布最佳实践](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [TypeScript声明文件](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

## 🎉 快速发布命令

如果所有准备工作已完成，可以使用以下命令快速发布：

```bash
# 一键发布脚本
npm run test && npm run build && npm publish
```

记住：**第一次发布前务必仔细检查所有配置！**
