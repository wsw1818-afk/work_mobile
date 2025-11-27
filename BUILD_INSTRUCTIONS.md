# EAS Build 빌드 방법

## 문제 상황
CLI에서 Keystore 생성 시 stdin 입력 문제로 자동화 불가

## ✅ 해결 방법: 웹 대시보드 사용

### 1단계: 웹사이트 접속
**빌드 페이지**: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native/builds

### 2단계: 새 빌드 생성
1. **"Create a build"** 버튼 클릭
2. 다음 옵션 선택:
   - **Platform**: `Android`
   - **Profile**: `production`
3. **"Build"** 버튼 클릭

### 3단계: Keystore 생성 (첫 빌드만)
- "Generate a new Android Keystore?" → **Yes** 선택
- Keystore는 Expo 서버에 안전하게 저장됨
- 이후 빌드부터는 자동으로 사용

### 4단계: 빌드 진행 확인
- 빌드 시간: 약 10~20분 소요
- 실시간 로그 확인 가능
- 빌드 ID 형식: `https://expo.dev/accounts/wisangwon1/projects/gagyebu-native/builds/[BUILD_ID]`

### 5단계: APK 다운로드
빌드 완료 후:
1. 빌드 페이지에서 **"Download"** 버튼 클릭
2. `gagyebu-native-[version].apk` 다운로드
3. Android 기기에 설치

---

## 🔧 설정 완료 내역

### app.json
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "1a5328d6-0ebc-413d-a35c-6e1cc28e0261"
      }
    },
    "plugins": [
      "expo-sqlite",
      "expo-build-properties"
    ]
  }
}
```

### eas.json
```json
{
  "cli": {
    "version": ">= 13.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "apk",
        "credentialsSource": "remote"
      }
    }
  }
}
```

---

## 📱 빌드 프로필

### Production (배포용)
- APK 파일 생성
- 버전 자동 증가 (remote)
- Keystore: Expo 서버 관리

### Preview (테스트용)
```bash
npx eas-cli build --platform android --profile preview
```

---

## 🔗 유용한 링크

- **프로젝트 대시보드**: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native
- **빌드 목록**: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native/builds
- **EAS Build 문서**: https://docs.expo.dev/build/setup/

---

## 💡 향후 빌드 (Keystore 생성 후)

Keystore가 한 번 생성되면, 이후부터는 CLI로도 자동 빌드 가능:

```bash
npx eas-cli build --platform android --profile production --no-wait
```

또는 웹사이트에서 클릭 한 번으로 빌드 시작
