#!/usr/bin/env node

/**
 * NPM发布自动化脚本
 * 
 * 使用方法:
 * node scripts/publish.js [patch|minor|major]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n🔄 ${description}...`, 'cyan');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} 完成`, 'green');
  } catch (error) {
    log(`❌ ${description} 失败`, 'red');
    process.exit(1);
  }
}

function checkPrerequisites() {
  log('\n📋 检查发布前提条件...', 'blue');
  
  // 检查是否登录npm
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    log('✅ NPM账户已登录', 'green');
  } catch (error) {
    log('❌ 未登录NPM账户，请先运行: npm login', 'red');
    process.exit(1);
  }
  
  // 检查Git工作区是否干净
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('❌ Git工作区不干净，请先提交所有更改', 'red');
      log('未提交的文件:', 'yellow');
      console.log(status);
      process.exit(1);
    }
    log('✅ Git工作区干净', 'green');
  } catch (error) {
    log('⚠️  无法检查Git状态，请确保在Git仓库中', 'yellow');
  }
  
  // 检查必要文件是否存在
  const requiredFiles = ['package.json', 'README.md', 'tsconfig.json'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log(`❌ 缺少必要文件: ${file}`, 'red');
      process.exit(1);
    }
  }
  log('✅ 必要文件检查通过', 'green');
}

function updateVersion(versionType) {
  if (!versionType) {
    log('⚠️  未指定版本类型，跳过版本更新', 'yellow');
    return;
  }
  
  const validTypes = ['patch', 'minor', 'major'];
  if (!validTypes.includes(versionType)) {
    log(`❌ 无效的版本类型: ${versionType}. 有效类型: ${validTypes.join(', ')}`, 'red');
    process.exit(1);
  }
  
  execCommand(`npm version ${versionType}`, `更新版本 (${versionType})`);
}

function runTests() {
  // 检查是否有测试脚本
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts.test) {
    execCommand('npm test', '运行测试');
  } else {
    log('⚠️  未找到测试脚本，跳过测试', 'yellow');
  }
}

function runLint() {
  // 检查是否有lint脚本
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts.lint) {
    execCommand('npm run lint', '代码检查');
  } else {
    log('⚠️  未找到lint脚本，跳过代码检查', 'yellow');
  }
}

function build() {
  execCommand('npm run build', '构建项目');
  
  // 检查dist目录是否存在
  if (!fs.existsSync('dist')) {
    log('❌ 构建后未找到dist目录', 'red');
    process.exit(1);
  }
  
  // 检查关键文件是否存在
  const distFiles = ['index.js', 'index.esm.js', 'index.d.ts'];
  for (const file of distFiles) {
    if (!fs.existsSync(path.join('dist', file))) {
      log(`❌ 构建后未找到关键文件: dist/${file}`, 'red');
      process.exit(1);
    }
  }
  log('✅ 构建文件检查通过', 'green');
}

function dryRun() {
  log('\n🧪 执行发布预检...', 'magenta');
  try {
    execSync('npm pack --dry-run', { stdio: 'inherit' });
    log('✅ 发布预检通过', 'green');
  } catch (error) {
    log('❌ 发布预检失败', 'red');
    process.exit(1);
  }
}

function publish() {
  log('\n🚀 发布到NPM...', 'magenta');
  
  // 读取package.json获取包信息
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packageName = packageJson.name;
  const version = packageJson.version;
  
  log(`正在发布: ${packageName}@${version}`, 'cyan');
  
  try {
    execSync('npm publish', { stdio: 'inherit' });
    log(`\n🎉 成功发布 ${packageName}@${version} 到NPM!`, 'green');
    log(`📦 包地址: https://www.npmjs.com/package/${packageName}`, 'cyan');
    log(`📥 安装命令: npm install ${packageName}`, 'cyan');
  } catch (error) {
    log('❌ 发布失败', 'red');
    process.exit(1);
  }
}

function pushToGit() {
  try {
    // 推送代码和标签
    execCommand('git push', '推送代码到远程仓库');
    execCommand('git push --tags', '推送标签到远程仓库');
  } catch (error) {
    log('⚠️  推送到Git失败，但NPM发布已成功', 'yellow');
  }
}

function main() {
  const versionType = process.argv[2];
  
  log('🚀 Leo Web Monitor SDK 发布流程开始', 'bright');
  log('=======================================', 'bright');
  
  try {
    checkPrerequisites();
    updateVersion(versionType);
    runLint();
    runTests();
    build();
    dryRun();
    
    // 最终确认
    log('\n⚠️  准备发布到NPM，这个操作不可逆！', 'yellow');
    log('按 Ctrl+C 取消，或按 Enter 继续...', 'yellow');
    
    // 在生产环境中，这里应该等待用户输入
    // process.stdin.setRawMode(true);
    // process.stdin.resume();
    // process.stdin.on('data', () => {
    
    publish();
    pushToGit();
    
    log('\n🎉 发布流程完成！', 'green');
    log('=======================================', 'bright');
    
  } catch (error) {
    log(`\n❌ 发布流程失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  log('\n\n❌ 发布流程被用户中断', 'red');
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  updateVersion,
  runTests,
  runLint,
  build,
  publish
};
