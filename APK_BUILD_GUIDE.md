# 가계부 Native APK 빌드 가이드

## 현재 상황
React Native 가계부 앱이 완전히 개발되었으며, 다음 기능이 모두 구현되어 있습니다:
- ✅ SQLite 로컬 데이터베이스
- ✅ 대시보드 (월별 수입/지출 요약, 카테고리 통계)
- ✅ 거래 추가 (수입/지출 선택, 카테고리, 금액, 메모)
- ✅ 거래 목록 (검색, 필터, 편집, 삭제)
- ✅ 카테고리 관리
- ✅ 로그인 없이 바로 사용 가능

## 방법 1: Expo Go 앱으로 즉시 테스트 (가장 빠름!) ⚡

### Android 에뮬레이터에서 테스트

1. Expo 개발 서버가 실행 중인지 확인:
```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"
npm start
```

2. Android 에뮬레이터에서 Play Store 열기

3. "Expo Go" 검색 및 설치

4. Expo Go 앱 실행

5. "Enter URL manually" 선택

6. 다음 URL 입력:
```
exp://10.0.2.2:8083
```
(8083 포트는 현재 실행 중인 Expo 서버 포트)

7. 앱이 자동으로 로드되고 실행됩니다!

### 실제 Android 기기에서 테스트

1. 실제 기기와 개발 PC가 **같은 Wi-Fi 네트워크**에 연결되어 있어야 합니다

2. PC의 IP 주소 확인:
```bash
ipconfig
```
(IPv4 주소 확인, 예: 192.168.0.100)

3. Expo Go 앱에서 URL 입력:
```
exp://[PC의 IP]:8083
```
예: `exp://192.168.0.100:8083`

## 방법 2: 독립 실행형 APK 빌드 (오프라인 사용 가능)

### 필요한 도구
- Node.js
- Android Studio (Android SDK 포함)
- JDK 17+

### 단계별 가이드

#### 1. Android Studio 설치 확인

Android Studio가 설치되어 있고, 환경 변수가 설정되어 있는지 확인:

**Windows PowerShell에서:**
```powershell
# ANDROID_HOME 확인
$env:ANDROID_HOME
# 예상 출력: C:\Users\사용자명\AppData\Local\Android\Sdk

# JAVA_HOME 확인
$env:JAVA_HOME
# JDK 17 이상이어야 함
```

**환경 변수 설정 (필요한 경우):**
- 시스템 속성 > 환경 변수
- 새로 만들기:
  - `ANDROID_HOME`: `C:\Users\사용자명\AppData\Local\Android\Sdk`
  - `JAVA_HOME`: `C:\Program Files\Java\jdk-17` (실제 JDK 경로)

#### 2. Android 네이티브 프로젝트 생성

```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"

# Expo CLI를 통해 Android 프로젝트 생성
npx expo prebuild --platform android
```

**만약 npx가 segmentation fault를 일으킨다면:**
```bash
npm install -g expo-cli
expo prebuild --platform android
```

#### 3. APK 빌드

Android 프로젝트가 생성되면 (`android/` 폴더 확인):

```bash
cd android
.\gradlew assembleRelease
```

빌드가 완료되면 APK 위치:
```
android\app\build\outputs\apk\release\app-release.apk
```

#### 4. APK 서명 (선택사항)

Release APK를 설치하려면 서명이 필요합니다.

**키 스토어 생성:**
```bash
keytool -genkey -v -keystore gagyebu-release-key.keystore -alias gagyebu-key -keyalg RSA -keysize 2048 -validity 10000
```

**android/app/build.gradle에 서명 설정 추가:**
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../gagyebu-release-key.keystore')
            storePassword '비밀번호'
            keyAlias 'gagyebu-key'
            keyPassword '비밀번호'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

다시 빌드:
```bash
.\gradlew assembleRelease
```

## 방법 3: EAS Build (Expo 클라우드 빌드)

가장 쉬운 방법이지만 20-30분 소요:

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# 빌드 설정
eas build:configure

# APK 빌드 시작
eas build -p android --profile preview
```

빌드가 완료되면 다운로드 링크가 제공됩니다.

## 문제 해결

### npx segmentation fault
- `npm install -g expo-cli`로 전역 설치 후 `expo` 명령 직접 사용
- 또는 Node.js 재설치

### Android SDK 찾을 수 없음
- Android Studio 설정 > SDK Manager에서 SDK 설치 확인
- 환경 변수 `ANDROID_HOME` 설정 확인

### Gradle 빌드 실패
```bash
cd android
.\gradlew clean
.\gradlew assembleRelease
```

## 현재 프로젝트 상태

프로젝트 위치: `D:\claude_CLI\work\모바일2\gagyebu-native`

파일 구조:
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

## 추천 테스트 방법

1. **빠른 테스트**: Expo Go 앱 (방법 1)
2. **배포용**: EAS Build (방법 3)
3. **고급 사용자**: 로컬 Gradle 빌드 (방법 2)
