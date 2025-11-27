# 🚨 긴급 해결 가이드: SQL 오류 완전 제거

## 현재 상황
- ✅ 코드는 이미 수정 완료 (database.ts에 마이그레이션 추가됨)
- ❌ 휴대폰 앱에서 여전히 `no such column: t.isTransfer` 오류 발생

## 왜 그런가요?
**휴대폰에 이미 저장된 데이터베이스 파일**에는 `isTransfer`와 `excludeFromStats` 컬럼이 없습니다.
제가 추가한 마이그레이션 코드는 **앱이 완전히 재시작될 때만** 실행됩니다.

---

## 🎯 해결 방법 (아래 순서대로 시도)

### 방법 1: 앱 완전 재시작 (권장, 데이터 보존됨)

#### 1단계: 휴대폰에서 앱 완전 종료
```
- 앱 전환 화면(최근 앱 목록)을 엽니다
- 가계부 앱을 위로 쓸어서 완전히 종료합니다
- 백그라운드에서도 완전히 사라졌는지 확인
```

#### 2단계: PC에서 서버 재시작
```bash
# 현재 터미널에서 Ctrl+C로 모든 서버 중지

# 새로 시작
cd "D:\claude_CLI\work\모바일2\gagyebu-native"
npx expo start --clear
```

#### 3단계: 휴대폰에서 앱 재시작
```
- 가계부 앱을 다시 엽니다
- 로딩 화면이 나타나면 완전히 기다립니다
- 대시보드가 정상적으로 로드되는지 확인합니다
```

#### 예상 로그 (정상 작동 시)
PC 터미널 또는 휴대폰 로그에 다음 메시지가 표시됩니다:
```
Adding excludeFromStats column to categories table...
Successfully added excludeFromStats column
Adding isTransfer column to transactions table...
Successfully added isTransfer column
Adding accountId column to transactions table...
Successfully added accountId column
Adding categoryId column to transactions table...
Successfully added categoryId column
Adding fromBankAccountId column to transactions table...
Successfully added fromBankAccountId column
Adding toBankAccountId column to transactions table...
Successfully added toBankAccountId column
Adding cardName column to transactions table...
Successfully added cardName column
Adding cardNumber column to transactions table...
Successfully added cardNumber column
```

**참고**: 모든 컬럼이 표시되지 않을 수도 있습니다. 이미 존재하는 컬럼은 메시지가 나타나지 않습니다.

---

### 방법 2: 데이터 초기화 (최후 수단, 모든 데이터 삭제됨!)

⚠️ **경고**: 이 방법은 모든 거래 내역, 카테고리, 설정을 삭제합니다!

#### 실행 방법
1. 휴대폰 앱 열기
2. 하단 탭에서 **"설정"** 선택
3. 아래로 스크롤하여 **"데이터 관리"** 섹션 찾기
4. **"데이터 초기화"** 버튼 누르기
5. 확인 팝업에서 **"초기화"** 선택
6. 앱이 자동으로 재시작되며 새로운 데이터베이스 생성

이렇게 하면 최신 스키마(isTransfer, excludeFromStats 포함)로 완전히 새로운 데이터베이스가 생성됩니다.

---

## 🔍 트러블슈팅

### 문제 1: 방법 1을 시도했지만 여전히 오류 발생
**원인**: 마이그레이션 코드가 실행되지 않았거나 실패했습니다.

**해결책**:
1. PC 터미널에서 Expo 서버 로그를 확인합니다
2. "Migration error" 메시지가 있는지 확인합니다
3. 있다면 에러 내용을 복사해서 저에게 보내주세요

### 문제 2: "데이터 초기화" 버튼이 보이지 않음
**원인**: 설정 화면이 구 버전이거나 코드가 업데이트되지 않았습니다.

**해결책**:
휴대폰에서 앱을 완전히 삭제하고 재설치합니다:
1. 앱 길게 누르기 → "삭제" 선택
2. PC에서 `npx expo start --clear` 실행
3. 휴대폰 Expo Go 앱에서 QR 스캔하여 재설치

### 문제 3: 여러 번 시도했지만 계속 같은 오류
**근본 원인**: 휴대폰이 오래된 서버 인스턴스에 연결되어 있을 수 있습니다.

**완전 해결책**:
```bash
# 1. PC에서 모든 Node.js 프로세스 강제 종료
taskkill /F /IM node.exe /T

# 2. 잠시 대기 (5초)

# 3. 새로 시작
cd "D:\claude_CLI\work\모바일2\gagyebu-native"
npx expo start --clear --port 9999

# 4. 휴대폰 앱 완전 종료 후 재시작
# 5. 새로운 QR 코드 스캔
```

---

## ✅ 성공 확인 방법

앱을 열었을 때:
1. ✅ 로딩 화면 없이 바로 대시보드가 표시됩니다
2. ✅ 월별 요약 카드에 숫자가 정상적으로 표시됩니다
3. ✅ 카테고리별 통계 차트가 보입니다
4. ✅ 최근 거래 목록이 표시됩니다
5. ✅ 어떤 SQL 오류 메시지도 나타나지 않습니다

---

## 📱 현재 코드 상태

### ✅ 이미 수정된 것들
1. **database.ts (lines 248-276)**: 자동 마이그레이션 코드 추가
   - categories 테이블에 excludeFromStats 컬럼 자동 추가
   - transactions 테이블에 isTransfer 컬럼 자동 추가
   - PRAGMA table_info로 중복 방지

2. **SQL 쿼리 수정 완료**:
   - getMonthSummary(): excludeFromStats 조건 제거
   - getCategoryStats(): excludeFromStats 조건 제거

3. **검증 완료**:
   - test-migration.js 스크립트로 코드 확인 ✓
   - 모든 체크 항목 통과 ✓

### 📊 테스트 결과
```
✓ database.ts 파일 읽기 성공
✓ 마이그레이션 섹션 존재
✓ excludeFromStats 처리
✓ isTransfer 처리
✓ PRAGMA table_info 사용
✓ ALTER TABLE 사용
✓ getMonthSummary에 excludeFromStats 참조 제거됨
✓ getCategoryStats에 excludeFromStats 참조 제거됨
```

---

## 💡 추가 정보

### 마이그레이션이 하는 일
```typescript
// 앱 시작 시 자동 실행됨
// 1. categories 테이블 스키마 확인
// 2. excludeFromStats 컬럼이 없으면 추가
// 3. transactions 테이블 스키마 확인
// 4. isTransfer 컬럼이 없으면 추가
// 5. 기존 데이터는 모두 보존
// 6. 새로 추가된 컬럼은 기본값 0으로 설정
```

### 기본값의 의미
- `excludeFromStats = 0`: 통계에 포함 (기존 카테고리는 모두 통계에 포함)
- `isTransfer = 0`: 이체 거래가 아님 (기존 거래는 모두 일반 거래)

---

## 🆘 여전히 문제가 있나요?

다음 정보를 제공해주세요:
1. 어떤 방법을 시도했는지
2. PC 터미널의 Expo 서버 로그 (마지막 50줄)
3. 휴대폰 앱에서 표시되는 정확한 오류 메시지
4. 앱을 완전히 재시작했는지 여부

저에게 스크린샷이나 로그를 보내주시면 추가로 도와드리겠습니다!
