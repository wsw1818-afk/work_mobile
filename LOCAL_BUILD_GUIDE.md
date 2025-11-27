# 가계부 앱 로컬 Android 빌드 가이드

이 문서는 Windows PC에서 Expo Dev Client APK를 로컬로 빌드하는 방법을 설명합니다.

## 왜 로컬 빌드가 필요한가?

- EAS Build `--local` 옵션은 **macOS/Linux에서만** 지원됩니다
- Windows에서는 `expo prebuild` + Gradle을 사용해야 합니다
- 네이티브 모듈(expo-camera 등)을 포함한 Dev Client가 필요할 때 로컬 빌드가 필요합니다

## 사전 요구 사항

### 1. Node.js
- Node.js 18.x 이상 권장
- 설치: https://nodejs.org/

### 2. JDK (Java Development Kit)
- JDK 17 권장 (Android Gradle Plugin 8.x 호환)
- 설치: https://adoptium.net/ 또는 Android Studio에 포함된 JDK 사용

### 3. Android Studio & SDK
- Android Studio 설치: https://developer.android.com/studio
- SDK Manager에서 다음 설치:
  - Android SDK Platform (API 34 권장)
  - Android SDK Build-Tools
  - Android SDK Command-line Tools
  - NDK (Side by side) - 자동 설치됨

### 4. 환경 변수 설정 (선택사항)
```
ANDROID_HOME = C:\Users\[사용자명]\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

> **참고**: `local.properties` 파일을 사용하면 환경 변수 없이도 빌드 가능합니다.

## 빌드 단계

### 1단계: 의존성 설치
```bash
cd [프로젝트 경로]
npm install --legacy-peer-deps
```

### 2단계: 네이티브 프로젝트 생성 (expo prebuild)
```bash
npx expo prebuild --platform android --clean
```

이 명령은:
- `android/` 폴더를 생성합니다
- React Native와 Expo 모듈의 네이티브 코드를 설정합니다
- `--clean` 옵션은 기존 android 폴더를 삭제하고 새로 생성합니다

### 3단계: local.properties 설정
`android/local.properties` 파일이 없으면 생성:

```properties
sdk.dir=C:\\Users\\[사용자명]\\AppData\\Local\\Android\\Sdk
```

> **중요**: 경로의 백슬래시를 두 번(`\\`) 사용하세요.

### 4단계: Gradle 빌드
```bash
cd android
./gradlew assembleDebug
```

또는 Windows 명령 프롬프트에서:
```cmd
cd android
gradlew.bat assembleDebug
```

### 5단계: APK 확인
빌드 완료 후 APK 위치:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 문제 해결

### SDK location not found
**오류:**
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file
```

**해결:**
`android/local.properties` 파일 생성 후 SDK 경로 지정

### NDK 버전 문제
NDK는 빌드 중 자동으로 설치됩니다 (26.1.10909125 버전).
수동 설치가 필요하면 Android Studio SDK Manager에서 설치하세요.

### 메모리 부족 (Out of Memory)
`android/gradle.properties`에 추가:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### 빌드 시간이 너무 오래 걸림
- 첫 빌드는 30분 이상 걸릴 수 있습니다
- NDK/CMake 컴파일(C++ 네이티브 코드)이 시간을 많이 소모합니다
- 두 번째 빌드부터는 캐시로 인해 훨씬 빠릅니다

**하드웨어 권장 사양:**
- CPU: 4코어 이상 (8코어 권장)
- RAM: 16GB 이상
- 저장장치: NVMe SSD

### 캐시 정리 (빌드 문제 시)
```bash
cd android
./gradlew clean
```

또는 전체 캐시 정리:
```bash
# 프로젝트 루트에서
rm -rf android/
rm -rf node_modules/
npm install --legacy-peer-deps
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug
```

## 빌드 후 APK 설치

### ADB로 설치
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 파일 전송
APK 파일을 Android 기기로 전송 후 설치합니다.
설정 > 보안 > 알 수 없는 소스 허용 필요.

## 개발 서버 실행

APK 설치 후 개발 서버 시작:
```bash
npx expo start --dev-client
```

기기에서 Dev Client 앱을 실행하고 QR 코드를 스캔하거나 URL을 입력합니다.

## 요약 명령어

```bash
# 전체 빌드 과정
npm install --legacy-peer-deps
npx expo prebuild --platform android --clean
# android/local.properties 확인
cd android
./gradlew assembleDebug

# APK 경로
# android/app/build/outputs/apk/debug/app-debug.apk
```

## Claude에게 빌드 요청 시 참고

이 프로젝트를 다른 PC에서 빌드할 때 Claude에게 다음과 같이 요청하세요:

> "이 Expo 프로젝트를 Windows에서 로컬 Android 빌드 해줘. LOCAL_BUILD_GUIDE.md 파일을 참고해."

Claude는 다음을 수행해야 합니다:
1. `npm install --legacy-peer-deps`
2. `npx expo prebuild --platform android --clean`
3. `android/local.properties` 파일 생성/확인
4. `cd android && ./gradlew assembleDebug`
5. APK 생성 확인: `android/app/build/outputs/apk/debug/app-debug.apk`
