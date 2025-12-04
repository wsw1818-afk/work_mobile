# gagyebu-native 트러블슈팅 가이드

> 이 프로젝트를 개발하면서 겪었던 문제들과 해결 방법을 정리한 문서입니다.

---

## 1. Google OAuth 인증 문제

### 1.1 expo-auth-session 400 에러 (redirect_uri_mismatch)

**증상:**
```
Error 400: redirect_uri_mismatch
The redirect URI in the request does not match the ones authorized
```

**원인:**
- expo-auth-session의 `useProxy` 옵션이 deprecated됨
- Google Cloud Console에 등록된 redirect URI와 실제 요청 URI 불일치

**시도했지만 실패한 방법들:**
1. `useProxy: true` → deprecated 경고
2. `expo-auth-session/providers/google` 사용 → 여전히 400 에러
3. `makeRedirectUri()` 다양한 옵션 시도 → 동일 에러

**최종 해결책: WebView 직접 로그인**

```typescript
// components/GoogleOAuthWebView.tsx
const GOOGLE_CLIENT_ID = 'YOUR_WEB_CLIENT_ID';
const REDIRECT_URI = 'http://localhost';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',  // Implicit Grant
    scope: SCOPES,
    include_granted_scopes: 'true',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
```

**Google Cloud Console 설정:**
1. OAuth 2.0 클라이언트 ID → 웹 애플리케이션 타입 선택
2. 승인된 리디렉션 URI에 `http://localhost` 추가

**WebView에서 토큰 추출:**
```typescript
const handleNavigationStateChange = (navState: WebViewNavigation) => {
  const { url } = navState;

  if (url.startsWith('http://localhost')) {
    // URL fragment에서 access_token 추출
    // 예: http://localhost#access_token=xxx&token_type=Bearer&expires_in=3600
    const hashParams = url.split('#')[1];
    if (hashParams) {
      const params = new URLSearchParams(hashParams);
      const accessToken = params.get('access_token');
      if (accessToken) {
        onSuccess(accessToken);
      }
    }
  }
};
```

### 1.2 WebView 로딩 오버레이가 입력 차단

**증상:**
- Google 로그인 화면에서 이메일/비밀번호 입력 불가
- 화면은 보이지만 터치가 안됨

**원인:**
- 로딩 상태를 표시하는 오버레이가 WebView 위에 덮여있음

**해결책:**
- 로딩 오버레이 제거 또는 `pointerEvents="none"` 적용
- 또는 로딩 상태 관리 로직 단순화

---

## 2. React Native 빌드 문제

### 2.1 Release APK에 최신 JS 코드가 반영 안됨

**증상:**
- 코드 수정 후 Release 빌드했는데 이전 버전이 실행됨
- Debug 빌드는 정상 작동

**원인:**
- Expo/Metro 번들러 캐시, Gradle 캐시가 오래된 JS 번들 사용

**해결책 - 4가지 캐시 모두 삭제:**
```powershell
# 1. Expo 캐시 삭제 (가장 중요!)
Remove-Item -Recurse -Force '.expo' -ErrorAction SilentlyContinue

# 2. Metro 번들러 캐시 삭제
Remove-Item -Recurse -Force 'node_modules\.cache' -ErrorAction SilentlyContinue

# 3. Android 빌드 폴더 삭제
Remove-Item -Recurse -Force 'android\app\build' -ErrorAction SilentlyContinue

# 4. Gradle 캐시 삭제 (JS 번들 캐시도 여기에 포함)
Remove-Item -Recurse -Force 'android\.gradle' -ErrorAction SilentlyContinue

# 5. Clean Release 빌드
cd android && .\gradlew.bat clean assembleRelease
```

**JS 번들 검증 방법:**
```bash
# APK에서 직접 검색
unzip -p "app-release.apk" assets/index.android.bundle | grep -c "검색할키워드"
# 결과: 1 이상이면 최신 코드 포함
```

### 2.2 NODE_ENV 경고

**증상:**
```
The NODE_ENV environment variable is required but was not specified
```

**원인:**
- Expo 빌드 시 NODE_ENV가 설정되지 않음

**해결책:**
- 무시해도 됨 (빌드는 정상 진행)
- 또는 환경변수 설정: `$env:NODE_ENV="production"`

---

## 3. 데이터베이스 최적화

### 3.1 대시보드 로딩 느림

**원인:**
- 여러 개의 개별 쿼리 실행 (월간 요약, 그룹 통계 등)
- 서브쿼리로 인한 성능 저하

**해결책 - 통합 함수 사용:**
```typescript
// database.ts
async getDashboardData(year: number, month: number) {
  // 1. 그룹 목록과 제외 패턴을 병렬로 로드
  const [groups, patterns] = await Promise.all([
    db.getAllAsync('SELECT * FROM expense_groups ORDER BY sortOrder'),
    this.getExclusionPatterns(true),
  ]);

  // 2. 모든 거래를 한 번에 로드
  const transactions = await db.getAllAsync(`
    SELECT t.*, c.name as categoryName, c.groupId, ...
    FROM transactions t
    LEFT JOIN categories c ON t.categoryId = c.id
    WHERE t.date >= ? AND t.date <= ?
  `, [startDate, endDate]);

  // 3. 메모리에서 집계 처리
  // (서브쿼리 대신 JavaScript에서 처리)
}
```

### 3.2 검색 시 타이핑마다 재조회

**해결책 - Debounce 적용:**
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// 사용
const debouncedSearchQuery = useDebounce(searchQuery, 300);

// 필터링은 useMemo로 최적화
const filteredData = useMemo(() => {
  return data.filter(item =>
    item.name.includes(debouncedSearchQuery)
  );
}, [data, debouncedSearchQuery]);
```

---

## 4. 파일 시스템 문제

### 4.1 OneDrive 파일 읽기 실패

**증상:**
```
FileSystem.readAsStringAsync 실패
content:// URI를 읽을 수 없음
```

**원인:**
- OneDrive, Google Drive 등 클라우드 파일은 content:// URI 사용
- expo-file-system이 직접 읽기 불가

**해결책 - fetch 대체 방법:**
```typescript
try {
  // 1차 시도: FileSystem 사용
  base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
} catch (readError) {
  // 2차 시도: fetch + FileReader
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const reader = new FileReader();
  base64 = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

---

## 5. 한글 입력 문제

### 5.1 TextInput에서 한글 자동완성 간섭

**증상:**
- 한글 입력 시 자동 완성/교정이 방해
- 입력한 글자가 변경되거나 중복됨

**해결책 - 자동완성 비활성화:**
```typescript
<TextInput
  keyboardType="default"
  autoCorrect={false}
  autoComplete="off"
  autoCapitalize="none"
  spellCheck={false}
  textContentType="none"
/>
```

---

## 6. 빌드 및 배포 체크리스트

### Release APK 빌드 전 확인사항

```markdown
- [ ] .expo 폴더 삭제
- [ ] node_modules/.cache 삭제
- [ ] android/app/build 삭제
- [ ] android/.gradle 삭제
- [ ] gradlew clean assembleRelease 실행
- [ ] APK에서 JS 번들 검증 (선택)
- [ ] 배포 폴더에 복사
```

### 빌드 명령어

```powershell
# 캐시 정리
powershell -Command "Remove-Item -Recurse -Force '.expo','node_modules\.cache','android\app\build','android\.gradle' -ErrorAction SilentlyContinue"

# Release 빌드
cd android && .\gradlew.bat clean assembleRelease && cd ..

# 배포 폴더로 복사
Copy-Item 'android\app\build\outputs\apk\release\app-release.apk' 'D:\OneDrive\코드작업\결과물\gagyebu-native-release.apk' -Force
```

---

## 7. 프로젝트 구조

```
gagyebu-native/
├── App.tsx                    # 앱 진입점
├── screens/
│   ├── DashboardScreen.tsx    # 대시보드 (월별 요약)
│   ├── TransactionsScreen.tsx # 거래 목록
│   ├── AddTransactionScreen.tsx
│   ├── ImportScreen.tsx       # Excel 가져오기
│   ├── SettingsScreen.tsx     # 설정
│   ├── CategoriesScreen.tsx
│   └── BankAccountsScreen.tsx
├── components/
│   ├── GoogleOAuthWebView.tsx # Google OAuth WebView
│   └── KoreanTextInput.tsx
├── lib/
│   ├── db/
│   │   └── database.ts        # SQLite 데이터베이스
│   ├── hooks/
│   │   └── useGoogleAuth.ts   # Google 인증 훅
│   ├── googleDrive.ts         # Google Drive API
│   ├── backup.ts              # 백업/복원
│   ├── excel-parser.ts        # Excel 파싱
│   └── auto-categorize.ts     # 자동 분류
└── android/                   # Android 네이티브
```

---

## 8. 유용한 디버깅 명령어

```powershell
# ADB 로그 확인 (React Native)
adb logcat ReactNative:V ReactNativeJS:V *:S

# 연결된 디바이스 확인
adb devices

# APK 설치
adb install -r app-release.apk

# 앱 강제 종료 및 재시작
adb shell am force-stop com.anonymous.gagyebunative
adb shell am start -n com.anonymous.gagyebunative/.MainActivity
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-11-30 | Google OAuth WebView 방식으로 전환 |
| 2025-11-30 | 서버 연결 기능 제거 |
| 2025-11-30 | Release APK 빌드 (v1.0.0) |
