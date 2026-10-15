@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo 请打开 http://127.0.0.1:3007/ ，并保持此窗口开启。
"%~dp0..\th10_web\tools\node.exe" "%~dp0artifacts\sdl3\scripts\serve.mjs" --port 3007
echo 服务已停止；如有错误请保留上方信息。
pause
