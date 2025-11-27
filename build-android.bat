@echo off
echo ================================================
echo EAS Build - Android Production
echo ================================================
echo.
echo This script will:
echo 1. Generate Android Keystore (first time only)
echo 2. Build APK file
echo 3. Upload to Expo servers
echo.
echo ================================================
echo.

cd /d "%~dp0"

echo y | npx eas-cli build --platform android --profile production

echo.
echo ================================================
echo Build process completed!
echo Check the build URL above for download link.
echo ================================================
pause
