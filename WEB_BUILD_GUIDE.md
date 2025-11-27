# 🚀 Expo 웹 대시보드에서 빌드하는 방법

## 📋 단계별 가이드

### 1단계: Expo 로그인
1. 브라우저에서 접속: **https://expo.dev/login**
2. 로그인 정보 입력:
   - Email: `wsw1818@gmail.com`
   - Password: (본인 비밀번호)
3. **"Log In"** 버튼 클릭

---

### 2단계: 프로젝트 페이지로 이동
로그인 후 자동으로 대시보드로 이동됩니다.

**또는 직접 URL 접속:**
- 프로젝트 페이지: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native

---

### 3단계: Builds 탭으로 이동
1. 프로젝트 페이지 상단 메뉴에서 **"Builds"** 탭 클릭
2. 또는 직접 접속: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native/builds

---

### 4단계: 새 빌드 시작
빌드 페이지에서 다음 중 하나를 찾아 클릭:
- **"New Build"** 버튼 (우측 상단)
- **"Create a build"** 버튼
- **"Start a new build"** 링크
- **"+"** 아이콘 또는 빌드 추가 버튼

> 💡 **처음 빌드하는 경우:** 빈 페이지에 "아직 빌드가 없습니다" 메시지와 함께 빌드 시작 버튼이 표시됩니다.

---

### 5단계: 빌드 설정
빌드 생성 화면에서:

1. **Platform 선택**:
   - ✅ **Android** 선택 (iOS 체크 해제)

2. **Profile 선택**:
   - ✅ **production** 선택

3. **Build type** (자동 설정됨):
   - APK (이미 eas.json에 설정됨)

4. **"Build"** 또는 **"Create Build"** 버튼 클릭

---

### 6단계: Keystore 생성 (첫 빌드만)
빌드 시작 시 다음 프롬프트가 표시됩니다:

```
Generate a new Android Keystore?
```

- ✅ **"Yes"** 또는 **"Generate"** 선택
- Keystore가 Expo 서버에 안전하게 저장됩니다
- 이후 빌드부터는 자동으로 사용됩니다

---

### 7단계: 빌드 진행 확인
빌드가 시작되면:

1. **빌드 상태 페이지**로 자동 이동
   - URL 형식: `https://expo.dev/accounts/wisangwon1/projects/gagyebu-native/builds/[BUILD_ID]`

2. **실시간 로그** 확인 가능
   - Build logs 섹션에서 진행 상황 확인

3. **예상 소요 시간**: 10~20분

---

### 8단계: APK 다운로드
빌드 완료 후:

1. 빌드 상태가 **"Finished"** 또는 **"Success"**로 변경됨
2. **"Download"** 버튼 클릭
3. `gagyebu-native.apk` 파일 다운로드
4. Android 기기로 전송하여 설치

---

## 🔍 문제 해결

### "Create a build" 버튼이 안 보이는 경우

#### 확인 사항:
1. **로그인 확인**: 우측 상단에 계정 이름(wisangwon1)이 표시되는지 확인
2. **프로젝트 권한**: 해당 프로젝트에 접근 권한이 있는지 확인
3. **탭 확인**: "Builds" 탭에 있는지 확인 (Overview, Updates, Builds 등)

#### 대안:
프로젝트 Overview 페이지에서도 빌드 시작 가능:
1. 프로젝트 홈 페이지로 이동
2. "Quick actions" 또는 "Get started" 섹션 찾기
3. "Build your app" 또는 유사한 옵션 클릭

---

## 📱 빌드 후 설치 방법

### Android 기기에 설치:
1. APK 파일을 기기로 전송 (이메일, USB, 클라우드 등)
2. 파일 관리자에서 APK 파일 탭
3. "알 수 없는 출처" 설치 허용
4. 설치 진행

---

## 💡 참고 정보

### 프로젝트 정보
- **프로젝트 ID**: `1a5328d6-0ebc-413d-a35c-6e1cc28e0261`
- **계정**: `wisangwon1`
- **앱 이름**: `gagyebu-native`
- **패키지**: `com.anonymous.gagyebunative`

### 빌드 설정 (자동 적용)
- **빌드 타입**: APK
- **버전 관리**: Remote (자동 증가)
- **Credentials**: Remote (Expo 서버)

---

## 🔗 유용한 링크

- **로그인**: https://expo.dev/login
- **프로젝트 홈**: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native
- **빌드 목록**: https://expo.dev/accounts/wisangwon1/projects/gagyebu-native/builds
- **Expo 문서**: https://docs.expo.dev/build/setup/

---

## ✅ 성공 확인

빌드가 성공하면:
- 이메일로 알림 수신
- 빌드 페이지에서 다운로드 가능
- 향후 빌드는 동일한 방법으로 반복 가능

---

**문제가 계속되면 스크린샷을 공유해주세요!**
