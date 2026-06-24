@echo off
REM Double-click this file to push the latest changes to GitHub,
REM which triggers the automatic over-the-air update to your phone.
cd /d "%~dp0"
echo Pushing latest changes to GitHub...
echo.
git add .
git commit -m "Update %date% %time%"
git push
echo.
echo Done. Watch the Actions tab on GitHub (about 2-3 min), then open/close/reopen the app on your phone.
echo You can close this window.
pause
