# 가계부 앱 코딩 가이드라인

## 🚨 필수 규칙 (CRITICAL)

### 1. React Native Paper 컴포넌트 텍스트 렌더링

**문제**: Button, Chip 등의 컴포넌트에서 줄바꿈이 있으면 "Text strings must be rendered within a <Text> component" 에러 발생

**해결책**: 항상 한 줄로 작성

```tsx
// ❌ 잘못된 예시 - 에러 발생!
<Button onPress={handleClick}>
  클릭
</Button>

// ✅ 올바른 예시
<Button onPress={handleClick}>클릭</Button>

// ✅ 긴 경우에도 한 줄로
<Button
  mode="contained"
  onPress={handleSubmit}
  style={styles.button}
>확인</Button>
```

**적용 대상 컴포넌트**:
- `<Button>children</Button>`
- `<Chip>children</Chip>`
- `<FAB>children</FAB>`
- 기타 react-native-paper 컴포넌트

### 2. LogBox 설정

**현재 설정**: `LogBox.ignoreAllLogs(true)` - 전체 비활성화

**이유**: LogBox 자체가 텍스트 렌더링 에러를 발생시킬 수 있음

**프로덕션 빌드 시**: 자동으로 비활성화되므로 문제 없음

### 3. Console 오버라이드 비활성화

**위치**: `lib/error-tracker.ts`

**현재 상태**: console.error/warn 오버라이드 주석 처리됨

**이유**: console 오버라이드가 LogBox와 충돌하여 렌더링 에러 발생 가능

---

## 📋 코딩 스타일 가이드

### TypeScript

```tsx
// ✅ 명시적 타입 지정
const handleSubmit = async (data: FormData): Promise<void> => {
  // ...
}

// ✅ 인터페이스 정의
interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense';
}
```

### React Hooks

```tsx
// ✅ useCallback으로 함수 메모이제이션
const loadData = useCallback(async () => {
  // ...
}, [dependency]);

// ✅ useFocusEffect로 화면 포커스 시 데이터 로드
useFocusEffect(
  useCallback(() => {
    loadData();
  }, [loadData])
);
```

### 에러 처리

```tsx
// ✅ try-catch로 에러 처리
try {
  await database.addTransaction(data);
  Alert.alert('성공', '거래가 추가되었습니다.');
} catch (error) {
  console.error('Failed to add transaction:', error);
  Alert.alert('오류', '거래 추가에 실패했습니다.');
}
```

---

## 🎨 UI/UX 가이드

### 1. 일관된 컴포넌트 사용

```tsx
// ✅ react-native-paper 컴포넌트 사용
import { Button, Card, Text, Chip } from 'react-native-paper';

// ✅ SafeAreaView는 react-native-safe-area-context에서
import { SafeAreaView } from 'react-native-safe-area-context';
```

### 2. 스타일 가이드

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // 일관된 간격 사용: 4, 8, 12, 16, 24
  padding: {
    padding: 16,
  },
  margin: {
    margin: 8,
  },
});
```

### 3. 색상 가이드

```tsx
// 주요 색상
const colors = {
  primary: '#6366f1',      // 메인 색상
  income: '#10b981',       // 수입 (녹색)
  expense: '#ef4444',      // 지출 (빨간색)
  background: '#f5f5f5',   // 배경
  card: '#ffffff',         // 카드 배경
  text: '#000000',         // 기본 텍스트
  textSecondary: '#666',   // 보조 텍스트
};
```

---

## 🔍 디버깅 가이드

### 1. 에러 로그 확인

개발 모드에서 `🐛 에러 로그` 메뉴로 이동하여 에러 확인 가능

### 2. 일반적인 에러와 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| Text strings must be rendered within a <Text> component | Button/Chip에 줄바꿈 | 한 줄로 작성 |
| Cannot read property 'x' of undefined | null/undefined 접근 | Optional chaining 사용 (`?.`) |
| Database is locked | SQLite 동시 접근 | transaction 사용 |

---

## 🧪 테스트 가이드

### 1. 수동 테스트 체크리스트

새 기능 추가 시 반드시 확인:

- [ ] 대시보드에서 정상 표시
- [ ] 거래 추가/수정/삭제 정상 동작
- [ ] 카테고리 변경 시 정상 반영
- [ ] 월 변경 시 데이터 정상 로드
- [ ] 새로고침 정상 동작

### 2. 빌드 전 체크리스트

- [ ] LogBox 에러 없음
- [ ] Console 경고 최소화
- [ ] 모든 화면 정상 렌더링
- [ ] 데이터베이스 마이그레이션 정상

---

## 📦 의존성 관리

### 주요 패키지

```json
{
  "react-native-paper": "UI 컴포넌트",
  "expo-sqlite": "데이터베이스",
  "@react-navigation/native": "네비게이션",
  "date-fns": "날짜 처리"
}
```

### 업데이트 시 주의사항

1. `expo upgrade` 실행 전 백업
2. 주요 의존성 변경 시 테스트 필수
3. react-native-paper 업데이트 시 Button/Chip 렌더링 확인

---

## 🚀 배포 가이드

### EAS Build

```bash
# Android 프로덕션 빌드
eas build --platform android --profile production

# 빌드 상태 확인
eas build:list
```

### 주의사항

1. **LogBox 비활성화 유지**: 프로덕션에서는 자동으로 비활성화되지만, 개발 모드에서도 비활성화 상태 유지
2. **console.log 제거**: 프로덕션 빌드 전에 불필요한 console.log 제거
3. **에러 트래킹**: 프로덕션에서는 별도 에러 트래킹 서비스 고려 (Sentry 등)

---

## 📝 커밋 메시지 가이드

```
🐛 버그 수정: [간단한 설명]
✨ 새 기능: [기능 설명]
♻️ 리팩터링: [변경 내용]
🎨 스타일: [UI/UX 개선]
📝 문서: [문서 업데이트]
🔧 설정: [설정 파일 수정]
```

---

## ⚠️ 알려진 이슈

### 1. Text 렌더링 에러

**증상**: "Text strings must be rendered within a <Text> component"

**원인**: React Native Paper의 Button/Chip 컴포넌트에서 줄바꿈 사용

**해결**: 모든 Button/Chip children을 한 줄로 작성

**재발 방지**:
- ESLint 설정으로 경고
- 코드 리뷰 시 확인
- 이 가이드라인 준수

### 2. LogBox 충돌

**증상**: LogBox가 에러를 표시하려다 자체적으로 에러 발생

**해결**: `LogBox.ignoreAllLogs(true)` 설정

**재발 방지**: App.tsx에서 LogBox 비활성화 유지

---

## 🔗 참고 자료

- [React Native Paper 문서](https://callstack.github.io/react-native-paper/)
- [Expo 문서](https://docs.expo.dev/)
- [React Navigation 문서](https://reactnavigation.org/)
- [SQLite 문서](https://www.sqlite.org/docs.html)

---

마지막 업데이트: 2025-11-20
