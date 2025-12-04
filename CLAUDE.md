# gagyebu-native 프로젝트 지침

## Git 저장소
- **GitHub URL**: https://github.com/wsw1818-afk/work_mobile
- **브랜치**: master

## 프로젝트 정보
- **이름**: gagyebu-native (가계부 앱)
- **플랫폼**: React Native / Expo
- **데이터베이스**: SQLite (expo-sqlite)
- **패키지명**: com.anonymous.gagyebunative

## 배포 경로
- **배포 폴더**: `D:\OneDrive\코드작업\결과물\gagyebu\`
- **Debug APK**: `gagyebu-native-debug.apk`
- **Release APK**: `gagyebu-native-release.apk`
- **Release AAB**: `gagyebu-native-release-v{버전}.aab`
- **키스토어 백업**: `D:\OneDrive\코드작업\결과물\키스토어\gagyebu-native\`

---

## 🎯 광고 ID 관리 (중요!)

### 광고 설정 파일
- **위치**: `lib/adConfig.ts`
- **플래그**: `IS_PRODUCTION` 변수로 테스트/프로덕션 전환

### AdMob ID 목록
| 구분 | ID |
|------|-----|
| **App ID** | `ca-app-pub-8246259258904809~1663711660` |
| **전면 광고 1** | `ca-app-pub-8246259258904809/4884771370` |
| **전면 광고 2** | `ca-app-pub-8246259258904809/2885529399` |

### 빌드 타입별 광고 설정

#### 1️⃣ 개발자 테스트용 (광고 완전 비활성화)
```typescript
// lib/AdContext.tsx - 광고 표시 여부
showAds: false  // 광고 완전 비활성화

// lib/adConfig.ts - 광고 ID (showAds: true일 때만 적용)
const IS_PRODUCTION = false;  // 테스트 ID 사용
```
```bash
# Debug APK 빌드
powershell -Command "cd 'H:\Claude_work\gagyebu-native\android'; .\gradlew.bat assembleDebug"
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "D:\OneDrive\코드작업\결과물\gagyebu\gagyebu-native-debug.apk"
```

#### 2️⃣ 플레이스토어 업로드용 (정식 광고)
```typescript
// lib/AdContext.tsx - 광고 표시 여부
showAds: true  // 광고 활성화

// lib/adConfig.ts - 광고 ID
const IS_PRODUCTION = true;  // 정식 AdMob ID 사용
```
```bash
# Release AAB 빌드 (서명됨)
powershell -Command "cd 'H:\Claude_work\gagyebu-native\android'; .\gradlew.bat bundleRelease"
copy /Y "android\app\build\outputs\bundle\release\app-release.aab" "D:\OneDrive\코드작업\결과물\gagyebu\gagyebu-native-release-v1.1.0.aab"
```

### 빌드 전 체크리스트
- [ ] `lib/adConfig.ts`의 `IS_PRODUCTION` 값 확인
- [ ] `app.json`의 `version` 확인/업데이트
- [ ] 플레이스토어용: AAB 빌드 (`bundleRelease`)
- [ ] 테스트용: APK 빌드 (`assembleDebug`)

---

## 🔑 키스토어 정보

### 릴리즈 키스토어
- **파일**: `android/app/keystore/gagyebu-release.keystore`
- **Store Password**: `gagyebu2024release`
- **Key Alias**: `gagyebu-key`
- **Key Password**: `gagyebu2024release`
- **유효기간**: 10,000일 (약 27년)

### 백업 위치
1. 프로젝트: `android/app/keystore/`
2. OneDrive: `D:\OneDrive\코드작업\결과물\키스토어\gagyebu-native\`

⚠️ **경고**: 키스토어 분실 시 앱 업데이트 불가!

---

## 빌드 명령어 요약

### Debug APK (테스트용)
```bash
# 1. 광고 테스트 모드로 변경 (IS_PRODUCTION = false)
# 2. 빌드
powershell -Command "cd 'H:\Claude_work\gagyebu-native\android'; .\gradlew.bat assembleDebug"
# 3. 복사
powershell -Command "Copy-Item 'H:\Claude_work\gagyebu-native\android\app\build\outputs\apk\debug\app-debug.apk' 'D:\OneDrive\코드작업\결과물\gagyebu\gagyebu-native-debug.apk' -Force"
```

### Release AAB (플레이스토어용)
```bash
# 1. 광고 프로덕션 모드로 변경 (IS_PRODUCTION = true)
# 2. 빌드
powershell -Command "cd 'H:\Claude_work\gagyebu-native\android'; .\gradlew.bat bundleRelease"
# 3. 복사
powershell -Command "Copy-Item 'H:\Claude_work\gagyebu-native\android\app\build\outputs\bundle\release\app-release.aab' 'D:\OneDrive\코드작업\결과물\gagyebu\gagyebu-native-release-v{버전}.aab' -Force"
```

### Prebuild (네이티브 설정 변경 시)
```bash
npx expo prebuild --clean
```

---

## 주요 화면
- DashboardScreen: 대시보드 (월별 요약, 그룹별 지출)
- TransactionsScreen: 거래 내역
- AddTransactionScreen: 거래 추가
- CategoriesScreen: 카테고리 관리
- BankAccountsScreen: 통장/계좌 관리
- ImportScreen: 엑셀 데이터 가져오기
- SettingsScreen: 설정
- HelpScreen: 사용 설명서 (4개 언어 지원)

## 다국어 지원
- 한국어 (ko) - 기본
- 영어 (en)
- 일본어 (ja)
- 중국어 (zh)
