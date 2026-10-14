@echo off
cd /d "%~dp0"
".local-deploy\cloudflared.exe" tunnel --url http://127.0.0.1:5173 --no-autoupdate --protocol http2
pause
