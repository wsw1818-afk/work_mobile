# gagyebu-native 프로젝트 지침

## Git 저장소
- **GitHub URL**: https://github.com/wsw1818-afk/work_mobile
- **브랜치**: master

## 프로젝트 정보
- **이름**: gagyebu-native (가계부 앱)
- **플랫폼**: React Native / Expo
- **데이터베이스**: SQLite (expo-sqlite)

## 배포 경로
- **Debug APK**: `D:\OneDrive\코드작업\결과물\gagyebu-native-debug.apk`
- **Release APK**: `D:\OneDrive\코드작업\결과물\gagyebu-native-release.apk`

## 빌드 명령어
```bash
# Debug 빌드
cd android && .\gradlew.bat assembleDebug && cd ..
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "D:\OneDrive\코드작업\결과물\gagyebu-native-debug.apk"

# Release 빌드
cd android && .\gradlew.bat clean assembleRelease && cd ..
copy /Y "android\app\build\outputs\apk\release\app-release.apk" "D:\OneDrive\코드작업\결과물\gagyebu-native-release.apk"
```

## 주요 화면
- DashboardScreen: 대시보드 (월별 요약, 그룹별 지출)
- TransactionsScreen: 거래 내역
- AddTransactionScreen: 거래 추가
- CategoriesScreen: 카테고리 관리
- BankAccountsScreen: 통장/계좌 관리
- ImportScreen: 엑셀 데이터 가져오기
- SettingsScreen: 설정
