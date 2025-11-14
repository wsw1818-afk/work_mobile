# APK 빌드 방법 - 핸드폰에서 실행하기

## 🚀 빠른 방법: EAS Build (추천!)

EAS Build를 사용하면 가장 쉽고 확실하게 APK를 만들 수 있습니다.

### 1단계: 터미널 열기

현재 프로젝트 폴더에서 새 터미널을 엽니다:
```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"
```

### 2단계: EAS 로그인

```bash
eas login
```

이메일과 비밀번호를 입력합니다.
- Expo 계정이 없다면: https://expo.dev/signup 에서 무료로 가입

### 3단계: APK 빌드

```bash
eas build -p android --profile preview
```

### 4단계: 빌드 대기 (20-30분)

터미널에서 빌드 진행 상황을 확인할 수 있습니다.
또는 https://expo.dev 에서 빌드 상태를 확인할 수 있습니다.

### 5단계: APK 다운로드

빌드가 완료되면 다운로드 링크가 제공됩니다:
```
✔ Build finished
https://expo.dev/artifacts/eas/[다운로드링크]
```

이 링크를 복사해서 브라우저에 붙여넣으면 APK 파일을 다운로드할 수 있습니다.

### 6단계: 핸드폰에 설치

1. 다운로드한 APK 파일을 핸드폰으로 전송 (USB, 이메일, 클라우드 등)
2. 핸드폰에서 APK 파일 실행
3. "알 수 없는 출처" 설치 허용
4. 설치 완료!

---

## 💻 대체 방법: Expo Go 앱으로 즉시 테스트

APK 빌드를 기다리기 싫다면, Expo Go 앱으로 즉시 테스트할 수 있습니다:

### 1단계: 개발 서버 실행 (이미 실행 중)

현재 포트 8084에서 실행 중입니다.

### 2단계: 핸드폰과 PC를 같은 Wi-Fi에 연결

### 3단계: PC의 IP 주소 확인

```bash
ipconfig
```

IPv4 주소를 확인합니다 (예: 192.168.0.100)

### 4단계: Expo Go 설치

- Android: Play Store에서 "Expo Go" 검색 및 설치
- iOS: App Store에서 "Expo Go" 검색 및 설치

### 5단계: 앱 실행

1. Expo Go 앱 실행
2. "Enter URL manually" 선택
3. 다음 URL 입력:
   ```
   exp://[PC의 IP 주소]:8084
   ```
   예: `exp://192.168.0.100:8084`

4. 앱이 자동으로 로드됩니다!

---

## 🔧 로컬 빌드 (고급 사용자용)

로컬에서 직접 APK를 빌드하려면:

### 필요한 환경 변수 설정

Windows 검색 > "환경 변수" > 시스템 환경 변수 편집

새로 만들기:
- 변수 이름: `ANDROID_HOME`
- 변수 값: `C:\Users\wsw18\AppData\Local\Android\Sdk`

### Android 프로젝트 생성

```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"

# Expo CLI 전역 설치
npm install -g expo-cli

# Android 네이티브 프로젝트 생성
expo prebuild --platform android --clean
```

### APK 빌드

```bash
cd android
.\gradlew assembleRelease
```

APK 위치:
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## ❓ 문제 해결

### npx Segmentation Fault

Windows에서 npx가 실패하면:
```bash
npm install -g expo-cli
expo prebuild --platform android --clean
```

### "알 수 없는 출처" 설치 차단

핸드폰 설정에서:
1. 보안 > 알 수 없는 앱 설치
2. 파일 관리자 또는 브라우저 허용

### Wi-Fi 연결 문제

- 방화벽이 8084 포트를 차단하지 않는지 확인
- 공용 Wi-Fi가 아닌 집 Wi-Fi 사용

---

## 📱 앱 테스트 체크리스트

APK 설치 후 다음 기능을 테스트하세요:

- [ ] 앱 실행 시 자동으로 대시보드 표시
- [ ] 월별 수입/지출 요약 확인
- [ ] 거래 추가 (수입/지출)
- [ ] 거래 목록 보기 및 검색
- [ ] 거래 편집 및 삭제
- [ ] 카테고리 목록 확인
- [ ] 앱 재시작 후 데이터 유지 확인

---

## 💡 도움이 필요하신가요?

- Expo 문서: https://docs.expo.dev
- EAS Build 가이드: https://docs.expo.dev/build/introduction

**추천**: EAS Build 방법이 가장 쉽고 확실합니다!
