@echo off
chcp 65001 >nul
set "APP_URL=https://abuadel-soulmate.vercel.app/pos"
set "APP_NAME=سول ميت كافيه VIP"
set "ICO_DIR=%LOCALAPPDATA%\SoulmateCafe"
set "ICO_FILE=%ICO_DIR%\soulmate.ico"

mkdir "%ICO_DIR%" 2>nul
curl -s -L -o "%ICO_FILE%" "https://abuadel-soulmate.vercel.app/soulmate.ico"

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $temp = Join-Path $d 'temp_soulmate.lnk'; $s = $ws.CreateShortcut($temp); $s.TargetPath = '%BROWSER%'; $s.Arguments = '--app=%APP_URL% --window-size=1366,768'; $s.IconLocation = '%ICO_FILE%,0'; $s.Description = 'سول ميت كافيه VIP - نقطة البيع والترابيزات'; $s.Save(); Rename-Item -Path $temp -NewName 'سول ميت كافيه VIP.lnk' -Force; $p = [Environment]::GetFolderPath('Programs'); $tempP = Join-Path $p 'temp_soulmate.lnk'; $sp = $ws.CreateShortcut($tempP); $sp.TargetPath = '%BROWSER%'; $sp.Arguments = '--app=%APP_URL% --window-size=1366,768'; $sp.IconLocation = '%ICO_FILE%,0'; $sp.Save(); Rename-Item -Path $tempP -NewName 'سول ميت كافيه VIP.lnk' -Force"

start "" "%BROWSER%" --app="%APP_URL%"
exit /b 0
