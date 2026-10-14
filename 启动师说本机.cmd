@echo off
cd /d "%~dp0main"
call npm.cmd run start:workbench
pause
