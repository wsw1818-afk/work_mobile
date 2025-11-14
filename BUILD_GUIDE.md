# 📱 가계부 모바일 앱 - 빌드 가이드

## 🚀 EAS Build로 APK 생성하기

### 사전 준비
- ✅ Node.js 설치됨
- ✅ EAS CLI 설치됨 (`npm install -g eas-cli`)
- ✅ eas.json 설정 파일 생성됨
- ⏳ Expo 계정 필요 (https://expo.dev/signup)

---

## 📋 빌드 단계별 가이드

### 1단계: Expo 계정 생성 (최초 1회)
1. 브라우저에서 https://expo.dev/signup 접속
2. 이메일 또는 GitHub 계정으로 무료 가입
3. 이메일 인증 완료

### 2단계: EAS CLI 로그인
터미널에서 실행:
```bash
cd "D:\claude_CLI\work\모바일2\gagyebu-native"
eas login
```
- 생성한 이메일/사용자명 입력
- 비밀번호 입력
- 로그인 성공 확인

### 3단계: 프로젝트 초기화 (최초 1회)
```bash
# 프로젝트 ID 생성
eas build:configure
```
- Enter를 눌러 기본값 사용
- app.json에 프로젝트 정보 추가됨

### 4단계: Preview APK 빌드 시작
```bash
# Android APK 빌드
eas build --platform android --profile preview
```

빌드 진행 과정:
1. 코드가 Expo 서버로 업로드됨
2. 클라우드에서 빌드 시작
3. 진행 상황 URL 표시됨 (클릭 가능)
4. 약 15-20분 소요

### 5단계: 빌드 완료 대기
빌드 진행 상황 확인:
- 터미널에 표시되는 링크 클릭
- 또는 https://expo.dev → Projects → gagyebu-native → Builds
- 빌드 상태: Queued → In Progress → Finished

### 6단계: APK 다운로드
빌드 완료 후:

**방법 A: 터미널에서 다운로드 링크 복사**
```
✅ Build finished
📦 https://expo.dev/artifacts/eas/[빌드ID].apk
```

**방법 B: 웹 브라우저에서**
1. https://expo.dev 로그인
2. Projects → gagyebu-native
3. Builds 탭
4. 최신 빌드 클릭
5. "Download" 버튼 클릭

---

## 📲 휴대폰에 설치하기

### 방법 1: 직접 다운로드 (권장) ⭐
1. **휴대폰 브라우저**에서 다운로드 링크 열기
2. APK 자동 다운로드
3. 다운로드 완료 후 파일 탭
4. "설치" 탭

### 방법 2: USB 케이블 전송
1. PC에서 APK 다운로드
2. 휴대폰을 USB로 PC 연결
3. 파일 전송 모드(MTP) 선택
4. APK를 휴대폰의 Download 폴더로 복사
5. 휴대폰에서 파일 관리자 → Download → APK 탭
6. "설치" 탭

### 방법 3: 클라우드 스토리지
1. PC에서 APK를 Google Drive/OneDrive 업로드
2. 휴대폰에서 해당 앱으로 다운로드
3. "설치" 탭

---

## ⚠️ 설치 시 주의사항

### "알 수 없는 출처" 허용
Android 설정:
```
설정 → 보안 → 알 수 없는 출처 허용
또는
설정 → 앱 → 특수 앱 액세스 → 알 수 없는 앱 설치 → [브라우저/파일관리자] 허용
```

### Google Play Protect 경고
- 개발 APK이므로 경고가 나올 수 있음
- "무시하고 설치" 선택
- 정상적인 자체 개발 앱이므로 안전함

---

## 🔄 앱 업데이트 빌드

코드 수정 후 새 버전 빌드:

### 1. app.json 버전 업데이트
```json
{
  "expo": {
    "version": "1.0.1"  // 버전 증가
  }
}
```

### 2. 새 빌드 시작
```bash
eas build --platform android --profile preview
```

### 3. 새 APK 다운로드 및 재설치
- 이전 버전 삭제 후 새 버전 설치
- 또는 덮어쓰기 설치 (데이터 유지)

---

## 🐛 문제 해결

### "로그인 실패"
```bash
# 로그아웃 후 재로그인
eas logout
eas login
```

### "빌드 실패"
1. 빌드 로그 확인: expo.dev → Builds → 실패한 빌드 → Logs
2. 일반적인 원인:
   - package.json 의존성 오류
   - app.json 설정 오류
   - 네트워크 연결 문제

### "설치 실패"
- 이전 버전 완전히 삭제 후 재시도
- 저장 공간 확인 (최소 100MB 필요)
- "알 수 없는 출처" 설정 재확인

---

## 📊 빌드 프로필 설명

### Preview (개발/테스트용) - 현재 사용 중
- APK 형식 (직접 설치 가능)
- 빠른 빌드
- 개발 중 테스트에 적합

### Production (배포용)
```bash
eas build --platform android --profile production
```
- AAB 형식 (Google Play Store 제출용)
- 최적화된 크기
- Play Store 배포 시 사용

---

## 💡 유용한 명령어

```bash
# 빌드 상태 확인
eas build:list

# 특정 빌드 상세 정보
eas build:view [빌드ID]

# 로컬에서 빌드 (Android SDK 필요)
eas build --platform android --local

# 빌드 취소
eas build:cancel
```

---

## 🎯 다음 단계

APK 설치 후:
1. ✅ 앱 실행 테스트
2. ✅ 주요 기능 동작 확인
3. ✅ 데이터 입력/조회 테스트
4. ✅ 버그 발견 시 수정 → 재빌드

---

## 📞 참고 링크

- Expo 문서: https://docs.expo.dev/
- EAS Build 가이드: https://docs.expo.dev/build/introduction/
- 내 프로젝트: https://expo.dev/accounts/[계정명]/projects/gagyebu-native

