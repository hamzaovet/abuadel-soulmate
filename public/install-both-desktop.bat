@echo off
chcp 65001 >nul
echo ========================================================
echo   تثبيت أيقونات حلواني أبو عادل & سول ميت كافيه VIP
echo ========================================================

set "URL_ABUADEL=https://abuadel-soulmate.vercel.app/pos"
set "URL_SOULMATE=https://abuadel-soulmate.vercel.app/pos"

set "DIR_ABU=%LOCALAPPDATA%\AbuAdelPatisserie"
set "DIR_SOUL=%LOCALAPPDATA%\SoulmateCafe"
mkdir "%DIR_ABU%" 2>nul
mkdir "%DIR_SOUL%" 2>nul

curl -s -L -o "%DIR_ABU%\abuadel.ico" "https://abuadel-soulmate.vercel.app/abuadel.ico"
curl -s -L -o "%DIR_SOUL%\soulmate.ico" "https://abuadel-soulmate.vercel.app/soulmate.ico"

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$d = [Environment]::GetFolderPath('Desktop'); " ^
  "$p = [Environment]::GetFolderPath('Programs'); " ^
  "$s1 = $ws.CreateShortcut((Join-Path $d 'temp1.lnk')); $s1.TargetPath = '%BROWSER%'; $s1.Arguments = '--app=%URL_ABUADEL% --window-size=1366,768'; $s1.IconLocation = '%DIR_ABU%\abuadel.ico,0'; $s1.Description = 'حلواني أبو عادل'; $s1.Save(); Rename-Item (Join-Path $d 'temp1.lnk') 'حلواني أبو عادل.lnk' -Force; " ^
  "$s2 = $ws.CreateShortcut((Join-Path $d 'temp2.lnk')); $s2.TargetPath = '%BROWSER%'; $s2.Arguments = '--app=%URL_SOULMATE% --window-size=1366,768'; $s2.IconLocation = '%DIR_SOUL%\soulmate.ico,0'; $s2.Description = 'سول ميت كافيه VIP'; $s2.Save(); Rename-Item (Join-Path $d 'temp2.lnk') 'سول ميت كافيه VIP.lnk' -Force; " ^
  "$sp1 = $ws.CreateShortcut((Join-Path $p 'temp1.lnk')); $sp1.TargetPath = '%BROWSER%'; $sp1.Arguments = '--app=%URL_ABUADEL% --window-size=1366,768'; $sp1.IconLocation = '%DIR_ABU%\abuadel.ico,0'; $sp1.Description = 'حلواني أبو عادل'; $sp1.Save(); Rename-Item (Join-Path $p 'temp1.lnk') 'حلواني أبو عادل.lnk' -Force; " ^
  "$sp2 = $ws.CreateShortcut((Join-Path $p 'temp2.lnk')); $sp2.TargetPath = '%BROWSER%'; $sp2.Arguments = '--app=%URL_SOULMATE% --window-size=1366,768'; $sp2.IconLocation = '%DIR_SOUL%\soulmate.ico,0'; $sp2.Description = 'سول ميت كافيه VIP'; $sp2.Save(); Rename-Item (Join-Path $p 'temp2.lnk') 'سول ميت كافيه VIP.lnk' -Force;"

echo تم إنشاء الأيقونات بنجاح على سطح المكتب وقائمة Start!
pause
exit /b 0
