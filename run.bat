@echo off
echo Running build script...
"C:\Program Files\nodejs\node.exe" build.js

if %errorlevel% neq 0 (
    echo Build failed with error code %errorlevel%
    pause
    exit /b %errorlevel%
)

echo Build successful! Opening in Brave browser...
start "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" .\dist\index.html

echo Done!
pause