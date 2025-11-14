@echo off
chcp 65001 >nul
echo ========================================
echo 📱 Expo 로그인 후 APK 빌드
echo ========================================
echo.

cd /d "%~dp0"

echo 🔐 Expo 계정으로 로그인합니다...
echo.
call eas login
echo.

if errorlevel 1 (
    echo ❌ 로그인 실패
    pause
    exit /b 1
)

echo ✅ 로그인 성공!
echo.
echo 🚀 APK 빌드를 시작합니다...
echo ⏳ 약 15-20분 소요됩니다.
echo.

call eas build --platform android --profile preview

echo.
echo ========================================
echo ✅ 완료!
echo ========================================
pause
