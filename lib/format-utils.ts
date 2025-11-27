// lib/format-utils.ts
// 포맷팅 유틸리티 - 모바일 네이티브 버전

/**
 * 숫자를 한국 원화 형식으로 포맷팅
 * @param amount 금액
 * @returns 포맷팅된 문자열 (예: "1,234,567원")
 */
export function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

/**
 * 숫자를 천 단위 콤마로 포맷팅
 * @param num 숫자
 * @returns 포맷팅된 문자열 (예: "1,234,567")
 */
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('ko-KR');
}

/**
 * 날짜를 한국 형식으로 포맷팅
 * @param date Date 객체 또는 문자열
 * @returns 포맷팅된 문자열 (예: "2024.01.15")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * 날짜를 짧은 형식으로 포맷팅
 * @param date Date 객체 또는 문자열
 * @returns 포맷팅된 문자열 (예: "01/15")
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

/**
 * 퍼센트 포맷팅
 * @param value 값 (0-1 또는 0-100)
 * @param isDecimal 소수 형식 여부 (true: 0.15 → 15%)
 * @returns 포맷팅된 문자열 (예: "15%")
 */
export function formatPercent(value: number, isDecimal: boolean = false): string {
  const percent = isDecimal ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

/**
 * 금액 차이를 부호와 함께 포맷팅
 * @param amount 금액
 * @returns 포맷팅된 문자열 (예: "+1,234원" 또는 "-1,234원")
 */
export function formatAmountWithSign(amount: number): string {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatKRW(amount)}`;
}

/**
 * 큰 숫자를 간략하게 표시 (만원, 억원 단위)
 * @param amount 금액
 * @returns 포맷팅된 문자열 (예: "1.2억원", "3,500만원")
 */
export function formatCompactKRW(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 100000000) {
    // 억원 단위
    const value = absAmount / 100000000;
    return `${sign}${value.toFixed(1)}억원`;
  } else if (absAmount >= 10000) {
    // 만원 단위
    const value = absAmount / 10000;
    return `${sign}${formatNumber(Math.round(value))}만원`;
  } else {
    return formatKRW(amount);
  }
}

/**
 * 거래 유형에 따른 색상 반환
 * @param type 거래 유형 ('income' | 'expense')
 * @returns 색상 코드
 */
export function getTransactionColor(type: 'income' | 'expense'): string {
  return type === 'income' ? '#10b981' : '#ef4444';
}

/**
 * 거래 유형에 따른 배경색 반환
 * @param type 거래 유형 ('income' | 'expense')
 * @returns 배경색 코드
 */
export function getTransactionBgColor(type: 'income' | 'expense'): string {
  return type === 'income' ? '#d1fae5' : '#fee2e2';
}

/**
 * 카테고리 색상이 유효한지 확인
 * @param color 색상 코드
 * @returns 유효 여부
 */
export function isValidColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * 문자열을 최대 길이로 자르고 말줄임표 추가
 * @param str 문자열
 * @param maxLength 최대 길이
 * @returns 잘린 문자열
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
