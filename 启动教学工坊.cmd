@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0main"
if errorlevel 1 goto failed
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 x64，再双击本文件。
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 (
  echo 需要 Node.js 24 x64，请更新 Node.js 后重新启动。
  pause
  exit /b 1
)
if not exist "node_modules\tsx\package.json" (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run pc:setup
if errorlevel 1 goto failed
call npm run pc:start
if errorlevel 1 goto failed
exit /b 0
:failed
echo 启动未完成，请查看上方提示。已有资料保留。
pause
exit /b 1
