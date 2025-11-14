# APK 빌드 최종 가이드 - 핸드폰 테스트용

## 현재 상황

React Native 가계부 앱이 완성되었고, Expo 개발 서버에서 정상 작동합니다. 이제 핸드폰에 설치할 수 있는 APK 파일을 만들어야 합니다.

**프로젝트 위치**: `D:\claude_CLI\work\모바일2\gagyebu-native`

## ⚠️ 중요: 로컬 빌드 문제

`expo prebuild` 명령어가 계속 "Dependency map is invalid" 오류로 실패하고 있습니다. 이는 legacy expo-cli가 Node.js 17+ 버전과 호환성 문제가 있기 때문입니다.

## ✅ 권장 방법: EAS Build (클라우드 빌드)

EAS Build는 Expo의 공식 클라우드 빌드 서비스입니다. 가장 안정적이고 확실한 방법입니다.

### 단계 1: Expo 계정 준비

1. https://expo.dev/signup 에서 무료 계정 생성 (이미 있다면 스킵)
2. 이메일과 비밀번호를 기억해두세요

### 단계 2: EAS CLI 로그인

터미널에서:
```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"

# EAS에 로그인
eas login
```

이메일과 비밀번호를 입력하세요.

### 단계 3: APK 빌드 시작

```bash
# APK 빌드 (preview 프로필 사용)
eas build -p android --profile preview
```

이 명령어는:
- 클라우드 서버에서 빌드를 시작합니다
- 약 20-30분 소요됩니다
- 진행 상황을 터미널과 https://expo.dev 에서 확인할 수 있습니다

### 단계 4: 빌드 대기

빌드가 진행되는 동안:
- 터미널에 진행 상황이 표시됩니다
- 또는 https://expo.dev 에 로그인해서 "Builds" 탭에서 확인
- 빌드가 큐에 대기 중일 수 있습니다 (무료 플랜)

### 단계 5: APK 다운로드

빌드가 완료되면:
```
✔ Build finished
https://expo.dev/artifacts/eas/xxxxx.apk
```

이런 형태의 다운로드 링크가 제공됩니다.

1. 링크를 복사해서 브라우저에 붙여넣기
2. APK 파일 다운로드 (약 50-100MB)
3. 파일 이름: `build-xxxxx.apk`

### 단계 6: 핸드폰에 설치

**방법 1: USB 연결**
1. 핸드폰을 USB로 PC에 연결
2. 다운로드한 APK 파일을 핸드폰으로 복사
3. 핸드폰에서 파일 관리자 앱 열기
4. APK 파일 실행
5. "알 수 없는 출처" 설치 허용
6. 설치 완료!

**방법 2: 클라우드/이메일**
1. APK 파일을 Google Drive, Dropbox 등에 업로드
2. 핸드폰에서 다운로드 링크 열기
3. 다운로드 후 설치

**방법 3: 다이렉트 다운로드**
1. 핸드폰 브라우저에서 Expo 빌드 링크 직접 열기
2. APK 다운로드
3. 다운로드 폴더에서 APK 파일 실행

---

## 🔧 대안: 로컬 빌드 재시도 (고급)

expo-cli 문제를 우회하려면:

### 옵션 A: Node.js 다운그레이드

1. Node.js 16.x LTS 설치: https://nodejs.org/download/release/v16.20.2/
2. 기존 expo-cli 제거 및 재설치:
```bash
npm uninstall -g expo-cli
npm install -g expo-cli
```
3. 다시 prebuild 시도:
```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"
expo prebuild --platform android --clean
```

### 옵션 B: React Native CLI로 전환

완전히 Expo를 벗어나 순수 React Native로 전환 (복잡함, 비추천)

---

## 🚀 빠른 테스트: Expo Go 앱

APK 빌드를 기다리는 동안 Expo Go 앱으로 즉시 테스트할 수 있습니다:

### 1. Expo Go 설치

- Android: Play Store에서 "Expo Go" 검색 및 설치
- iOS: App Store에서 "Expo Go" 검색 및 설치

### 2. 같은 Wi-Fi 연결

- 핸드폰과 개발 PC가 같은 Wi-Fi 네트워크에 연결되어 있어야 합니다

### 3. PC IP 주소 확인

```bash
ipconfig
```

IPv4 주소를 확인 (예: 192.168.0.100)

### 4. Expo Go에서 URL 입력

1. Expo Go 앱 실행
2. "Enter URL manually" 선택
3. URL 입력: `exp://[PC의 IP]:8084`
   - 예: `exp://192.168.0.100:8084`
4. 앱이 자동으로 로드됩니다!

---

## 📱 앱 테스트 체크리스트

APK 설치 후 다음 기능을 테스트하세요:

- [ ] 앱 실행 시 자동으로 대시보드 표시 (로그인 없음)
- [ ] 대시보드에서 월별 수입/지출 요약 확인
- [ ] 카테고리별 통계 확인
- [ ] "거래 추가" 탭에서 새 거래 추가 (수입/지출)
- [ ] "거래 내역" 탭에서 거래 목록 확인
- [ ] 거래 검색 기능 테스트
- [ ] 거래 편집 및 삭제
- [ ] "카테고리" 탭에서 카테고리 목록 확인
- [ ] 앱 종료 후 재시작해서 데이터 유지 확인 (SQLite)

---

## ❓ 문제 해결

### EAS Build 실패

1. `eas build --clear-cache`로 캐시 제거 후 재시도
2. app.json의 설정 확인
3. package.json의 의존성 버전 확인

### "알 수 없는 출처" 설치 차단

핸드폰 설정:
1. 설정 > 보안 > 알 수 없는 앱 설치
2. 파일 관리자 또는 브라우저에 대해 허용

### Wi-Fi 연결 안됨 (Expo Go)

- 방화벽이 8084 포트를 차단하지 않는지 확인
- 공용 Wi-Fi가 아닌 집 Wi-Fi 사용
- PC와 핸드폰이 정말 같은 네트워크인지 확인

---

## 💡 추천

**가장 쉽고 확실한 방법: EAS Build**

1. `eas login` (무료 계정)
2. `eas build -p android --profile preview`
3. 20-30분 대기
4. APK 다운로드 및 핸드폰 설치

이 방법이 로컬 빌드보다 훨씬 안정적이고 간단합니다!
