# 가계부 Native 앱 테스트 가이드

## 현재 상황 요약

React Native 가계부 앱이 완전히 개발되었으며, 다음 기능이 모두 구현되어 있습니다:
- ✅ SQLite 로컬 데이터베이스
- ✅ 대시보드 (월별 수입/지출 요약, 카테고리 통계)
- ✅ 거래 추가 (수입/지출 선택, 카테고리, 금액, 메모)
- ✅ 거래 목록 (검색, 필터, 편집, 삭제)
- ✅ 카테고리 관리
- ✅ 로그인 없이 바로 사용 가능
- ✅ 개발 서버 실행 중 (포트 8084)

**프로젝트 위치**: `D:\claude_CLI\work\모바일2\gagyebu-native`

## ⚡ 방법 1: Expo Go 앱으로 즉시 테스트 (가장 빠름!)

### Android 에뮬레이터에서 테스트

1. **Expo 개발 서버가 실행 중인지 확인** (이미 실행 중: 포트 8084)
   ```bash
   cd "D:\claude_CLI\work\모바일2\gagyebu-native"
   npm start
   ```

2. **Android 에뮬레이터에서 Play Store 열기**

3. **"Expo Go" 검색 및 설치**

4. **Expo Go 앱 실행**

5. **"Enter URL manually" 선택**

6. **다음 URL 입력**:
   ```
   exp://10.0.2.2:8084
   ```
   (8084 포트는 현재 실행 중인 Expo 서버 포트)

7. **앱이 자동으로 로드되고 실행됩니다!**

### 실제 Android 기기에서 테스트

1. **실제 기기와 개발 PC가 같은 Wi-Fi 네트워크에 연결**되어 있어야 합니다

2. **PC의 IP 주소 확인**:
   ```bash
   ipconfig
   ```
   (IPv4 주소 확인, 예: 192.168.0.100)

3. **Expo Go 앱에서 URL 입력**:
   ```
   exp://[PC의 IP]:8084
   ```
   예: `exp://192.168.0.100:8084`

---

## 📦 방법 2: APK 빌드 및 설치 (독립 실행형)

### 옵션 2-1: EAS Build (Expo 클라우드 빌드) - 추천!

가장 쉽고 확실한 방법이지만 20-30분 소요:

```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"

# EAS 로그인 (이메일/비밀번호)
eas login

# APK 빌드 시작
eas build -p android --profile preview
```

빌드가 완료되면:
1. 다운로드 링크가 제공됩니다
2. APK 파일을 다운로드
3. Android 에뮬레이터로 드래그 & 드롭하여 설치

### 옵션 2-2: 로컬 빌드 (Android Studio 필요)

**사전 요구사항 확인**:
```powershell
# ANDROID_HOME 확인
$env:ANDROID_HOME
# 예상 출력: C:\Users\사용자명\AppData\Local\Android\Sdk

# JAVA_HOME 확인
$env:JAVA_HOME
# JDK 17 이상이어야 함
```

**환경 변수 설정 (필요한 경우)**:
- 시스템 속성 > 환경 변수
- 새로 만들기:
  - `ANDROID_HOME`: `C:\Users\사용자명\AppData\Local\Android\Sdk`
  - `JAVA_HOME`: `C:\Program Files\Java\jdk-17` (실제 JDK 경로)

**Android 네이티브 프로젝트 생성**:
```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"

# 방법 1: @expo/cli 사용 (추천)
npx @expo/cli prebuild --platform android --clean

# 방법 2: 전역 expo-cli 사용
npm install -g expo-cli
expo prebuild --platform android --clean
```

**APK 빌드**:
```bash
cd android
.\gradlew assembleRelease
```

빌드가 완료되면 APK 위치:
```
android\app\build\outputs\apk\release\app-release.apk
```

**APK 설치**:
```bash
# ADB를 사용하여 에뮬레이터에 설치
adb install android\app\build\outputs\apk\release\app-release.apk

# 또는 에뮬레이터 창으로 APK 파일을 드래그 & 드롭
```

---

## 🔧 문제 해결

### npx 명령어 Segmentation Fault

Windows에서 npx가 Segmentation Fault를 일으키는 경우:

```bash
# 전역으로 expo-cli 설치
npm install -g expo-cli

# npx 대신 expo 명령 직접 사용
expo prebuild --platform android --clean
```

또는 Node.js 재설치를 고려하세요.

### Android SDK 찾을 수 없음

1. Android Studio 설정 > SDK Manager에서 SDK 설치 확인
2. 환경 변수 `ANDROID_HOME` 설정 확인
3. Windows 재시작

### Gradle 빌드 실패

```bash
cd android
.\gradlew clean
.\gradlew assembleRelease
```

### Port 충돌

Expo 서버가 이미 실행 중이라면 다른 포트 사용:
```bash
npx expo start --port 8085
```

---

## 📱 현재 실행 중인 서비스

- **Expo 개발 서버**: http://localhost:8084 (포트 8084)
- **개발 서버 상태**: 실행 중

---

## 🎯 추천 테스트 순서

1. **가장 빠른 방법**: Expo Go 앱 (방법 1)
   - 개발 서버가 이미 실행 중
   - 에뮬레이터에서 Expo Go 설치 후 `exp://10.0.2.2:8084` 입력

2. **독립 실행형 필요 시**: EAS Build (방법 2-1)
   - 가장 안정적
   - `eas login` 후 `eas build -p android --profile preview`

3. **고급 사용자**: 로컬 Gradle 빌드 (방법 2-2)
   - Android Studio 설정 필요
   - npx 문제가 있을 경우 전역 expo-cli 사용

---

## 📋 테스트 체크리스트

앱을 설치한 후 다음 기능을 테스트하세요:

- [ ] 앱 실행 시 자동으로 대시보드 표시 (로그인 화면 없음)
- [ ] 대시보드에서 월별 수입/지출 요약 확인
- [ ] "거래 추가" 탭에서 새 거래 추가
- [ ] "거래 내역" 탭에서 거래 목록 확인
- [ ] 거래 검색 기능 테스트
- [ ] 거래 편집 및 삭제
- [ ] "카테고리" 탭에서 카테고리 목록 확인
- [ ] 앱 재시작 후 데이터 유지 확인 (SQLite)

---

## 💡 추가 정보

### 프로젝트 구조
```
gagyebu-native/
├── App.tsx              # 메인 앱 + 네비게이션
├── app.json             # Expo 설정
├── eas.json             # EAS Build 설정
├── lib/
│   └── db/
│       └── database.ts  # SQLite 데이터베이스
├── screens/
│   ├── DashboardScreen.tsx      # 대시보드
│   ├── AddTransactionScreen.tsx # 거래 추가
│   ├── TransactionsScreen.tsx   # 거래 목록
│   └── CategoriesScreen.tsx     # 카테고리
└── package.json
```

### 사용된 기술 스택
- React Native with Expo
- TypeScript
- SQLite (expo-sqlite)
- React Navigation (Bottom Tabs)
- React Native Paper (Material Design UI)
- date-fns (date formatting)

### 기본 카테고리
앱 최초 실행 시 자동으로 생성되는 기본 카테고리:
- 수입: 급여, 보너스
- 지출: 식비, 교통, 쇼핑, 의료
