@echo off
chcp 65001 >nul
echo ========================================
echo 📱 가계부 네이티브 APK 빌드 스크립트
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] EAS CLI 설치 확인 중...
call eas --version >nul 2>&1
if errorlevel 1 (
    echo ❌ EAS CLI가 설치되어 있지 않습니다.
    echo 설치 중... (30초 소요)
    call npm install -g eas-cli
    if errorlevel 1 (
        echo ❌ EAS CLI 설치 실패
        pause
        exit /b 1
    )
    echo ✅ EAS CLI 설치 완료
) else (
    echo ✅ EAS CLI 설치됨
)
echo.

echo [2/5] 로그인 상태 확인 중...
call eas whoami >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Expo 계정 로그인이 필요합니다.
    echo.
    echo 📝 아래 링크에서 계정을 생성하세요 (2분 소요):
    echo https://expo.dev/signup
    echo.
    echo 계정 생성 후 아래 정보를 입력하세요:
    echo.
    call eas login
    if errorlevel 1 (
        echo ❌ 로그인 실패
        pause
        exit /b 1
    )
    echo ✅ 로그인 성공
) else (
    echo ✅ 이미 로그인됨
)
echo.

echo [3/5] 프로젝트 설정 중...
if not exist "app.json" (
    echo ❌ app.json 파일이 없습니다.
    pause
    exit /b 1
)

echo ✅ 프로젝트 설정 확인 완료
echo.

echo [4/5] APK 빌드 시작...
echo ⏳ 클라우드에서 빌드 중입니다 (15-20분 소요)
echo 💡 빌드 진행 상황 URL이 표시됩니다.
echo.
call eas build --platform android --profile preview
if errorlevel 1 (
    echo ❌ 빌드 실패
    echo.
    echo 문제 해결:
    echo 1. 네트워크 연결 확인
    echo 2. Expo 계정 상태 확인: https://expo.dev
    echo 3. 로그 확인 후 재시도
    pause
    exit /b 1
)
echo.

echo [5/5] 빌드 완료!
echo.
echo ========================================
echo ✅ APK 빌드가 완료되었습니다!
echo ========================================
echo.
echo 📥 다음 단계:
echo 1. 위에 표시된 다운로드 링크 클릭
echo 2. 또는 https://expo.dev → Projects → gagyebu-native → Builds
echo 3. APK 다운로드 후 휴대폰으로 전송
echo 4. "알 수 없는 출처" 허용 후 설치
echo.
echo 자세한 가이드: BUILD_GUIDE.md 참고
echo ========================================
pause
