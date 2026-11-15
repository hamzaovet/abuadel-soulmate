@echo off
chcp 65001 >nul
set "APP_URL=https://abuadel-soulmate.vercel.app/pos"
set "APP_NAME=حلواني أبو عادل"
set "ICO_DIR=%LOCALAPPDATA%\AbuAdelPatisserie"
set "ICO_FILE=%ICO_DIR%\abuadel.ico"

mkdir "%ICO_DIR%" 2>nul
curl -s -L -o "%ICO_FILE%" "https://abuadel-soulmate.vercel.app/abuadel.ico"

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $temp = Join-Path $d 'temp_abuadel.lnk'; $s = $ws.CreateShortcut($temp); $s.TargetPath = '%BROWSER%'; $s.Arguments = '--app=%APP_URL% --window-size=1366,768'; $s.IconLocation = '%ICO_FILE%,0'; $s.Description = 'حلواني أبو عادل - نقطة البيع والكاشير'; $s.Save(); Rename-Item -Path $temp -NewName 'حلواني أبو عادل.lnk' -Force; $p = [Environment]::GetFolderPath('Programs'); $tempP = Join-Path $p 'temp_abuadel.lnk'; $sp = $ws.CreateShortcut($tempP); $sp.TargetPath = '%BROWSER%'; $sp.Arguments = '--app=%APP_URL% --window-size=1366,768'; $sp.IconLocation = '%ICO_FILE%,0'; $sp.Save(); Rename-Item -Path $tempP -NewName 'حلواني أبو عادل.lnk' -Force"

start "" "%BROWSER%" --app="%APP_URL%"
exit /b 0
