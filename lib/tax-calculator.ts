// lib/tax-calculator.ts
// 세금 계산 로직 - 모바일 네이티브 버전 (2024년 기준)

// 카드 공제율 상수
export const CARD_RATES = {
  credit: 0.15, // 신용카드 15%
  debit: 0.30,  // 체크카드 30%
  cash: 0.30,   // 현금영수증 30%
} as const;

// 카드 공제 한도
export const CARD_DEDUCTION_LIMIT = 3000000;

export type CardType = 'credit' | 'debit' | 'cash';

export interface CardDeductionResult {
  deduction: number;      // 공제액
  usage: number;          // 사용액
  remaining: number;      // 잔여 기준액
  progressValue: number;  // 프로그레스 바 값 (0-100)
}

export interface CardDeductionDetails {
  credit: CardDeductionResult;
  debit: CardDeductionResult;
  cash: CardDeductionResult;
  totalDeduction: number;
  baseAmount: number;
  totalSpending: number;
  excessAmount: number;
}

export interface TaxCalculationResult {
  taxableIncome: number;   // 과세표준
  calculatedTax: number;   // 산출세액
  finalTax: number;        // 결정세액
}

/**
 * 근로소득공제 계산
 * @param salary 총 급여액
 * @returns 근로소득공제액
 */
export function calculateEarnedIncomeDeduction(salary: number): number {
  if (salary <= 5000000) {
    return salary * 0.7;
  } else if (salary <= 15000000) {
    return 3500000 + (salary - 5000000) * 0.4;
  } else if (salary <= 45000000) {
    return 7500000 + (salary - 15000000) * 0.15;
  } else if (salary <= 100000000) {
    return 12000000 + (salary - 45000000) * 0.05;
  } else {
    return 14750000 + (salary - 100000000) * 0.02;
  }
}

/**
 * 과세표준 기준 산출세액 계산 (2024년 기준)
 * @param taxableIncome 과세표준
 * @returns 산출세액
 */
export function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 14000000) {
    return taxableIncome * 0.06;
  } else if (taxableIncome <= 50000000) {
    return 840000 + (taxableIncome - 14000000) * 0.15;
  } else if (taxableIncome <= 88000000) {
    return 6240000 + (taxableIncome - 50000000) * 0.24;
  } else if (taxableIncome <= 150000000) {
    return 15360000 + (taxableIncome - 88000000) * 0.35;
  } else if (taxableIncome <= 300000000) {
    return 37060000 + (taxableIncome - 150000000) * 0.38;
  } else if (taxableIncome <= 500000000) {
    return 94060000 + (taxableIncome - 300000000) * 0.40;
  } else if (taxableIncome <= 1000000000) {
    return 174060000 + (taxableIncome - 500000000) * 0.42;
  } else {
    return 384060000 + (taxableIncome - 1000000000) * 0.45;
  }
}

/**
 * 종합 세금 계산
 * @param salary 총 급여액
 * @param totalIncomeDeduction 총 소득공제액
 * @param totalTaxCredit 총 세액공제액
 * @returns 세금 계산 결과
 */
export function calculateTax(
  salary: number,
  totalIncomeDeduction: number,
  totalTaxCredit: number
): TaxCalculationResult {
  // 1. 근로소득공제
  const earnedIncomeDeduction = calculateEarnedIncomeDeduction(salary);

  // 2. 근로소득금액 = 총급여 - 근로소득공제
  const earnedIncome = salary - earnedIncomeDeduction;

  // 3. 과세표준 = 근로소득금액 - 소득공제
  const taxableIncome = Math.max(0, earnedIncome - totalIncomeDeduction);

  // 4. 산출세액
  const calculatedTax = calculateIncomeTax(taxableIncome);

  // 5. 결정세액 = 산출세액 - 세액공제
  const finalTax = Math.max(0, calculatedTax - totalTaxCredit);

  return {
    taxableIncome,
    calculatedTax,
    finalTax,
  };
}

/**
 * 환급액 계산
 * @param paidTax 기납부세액
 * @param finalTax 결정세액
 * @returns 환급액 (양수: 환급, 음수: 추가 납부)
 */
export function calculateRefund(paidTax: number, finalTax: number): number {
  return paidTax - finalTax;
}

/**
 * 단일 카드 타입의 공제액 계산
 * @param usage 사용액
 * @param baseAmount 기준액
 * @param previousUsage 이전 카드들의 사용액 합계
 * @param rate 공제율
 * @returns 카드 공제 계산 결과
 */
export function calculateSingleCardDeduction(
  usage: number,
  baseAmount: number,
  previousUsage: number,
  rate: number
): CardDeductionResult {
  // 이전 카드들로 채운 기준액
  const filledBase = Math.min(previousUsage, baseAmount);

  // 현재 카드로 채울 수 있는 잔여 기준액
  const remainingBase = Math.max(0, baseAmount - filledBase);

  // 현재 카드로 기준액을 채우는 금액
  const usedForBase = Math.min(usage, remainingBase);

  // 기준액 초과분 (공제 대상)
  const excess = Math.max(0, usage - usedForBase);

  // 공제액 = 초과분 × 공제율
  const deduction = Math.floor(excess * rate);

  // 프로그레스 바 값 (사용액 대비 비율: 사용액 / (사용액 + 잔여액))
  const totalRange = usage + Math.max(0, remainingBase - usedForBase);
  const progressValue = totalRange > 0
    ? Math.min(100, (usage / totalRange) * 100)
    : 0;

  // 잔여 기준액 (현재 카드 이후)
  const remaining = Math.max(0, remainingBase - usedForBase);

  return {
    deduction,
    usage,
    remaining,
    progressValue,
  };
}

/**
 * 전체 카드 공제액 상세 계산
 * @param creditCardTotal 신용카드 사용액
 * @param debitCardTotal 체크카드 사용액
 * @param cashTotal 현금영수증 사용액
 * @param baseAmount 기준액 (연봉 × 25%)
 * @returns 카드 공제 상세 정보
 */
export function calculateCardDeductionDetails(
  creditCardTotal: number,
  debitCardTotal: number,
  cashTotal: number,
  baseAmount: number
): CardDeductionDetails {
  // 1. 신용카드 (첫 번째 순서)
  const credit = calculateSingleCardDeduction(
    creditCardTotal,
    baseAmount,
    0, // 이전 사용액 없음
    CARD_RATES.credit
  );

  // 2. 체크카드 (두 번째 순서)
  const debit = calculateSingleCardDeduction(
    debitCardTotal,
    baseAmount,
    creditCardTotal, // 신용카드 사용액이 이전 사용액
    CARD_RATES.debit
  );

  // 3. 현금영수증 (세 번째 순서)
  const cash = calculateSingleCardDeduction(
    cashTotal,
    baseAmount,
    creditCardTotal + debitCardTotal, // 신용+체크 사용액이 이전 사용액
    CARD_RATES.cash
  );

  // 총 공제액
  const totalDeduction = credit.deduction + debit.deduction + cash.deduction;

  // 총 사용액
  const totalSpending = creditCardTotal + debitCardTotal + cashTotal;

  // 기준액 초과분
  const excessAmount = Math.max(0, totalSpending - baseAmount);

  return {
    credit,
    debit,
    cash,
    totalDeduction,
    baseAmount,
    totalSpending,
    excessAmount,
  };
}

/**
 * 카드 공제 잔여 한도 계산
 * @param totalDeduction 총 카드 공제액
 * @returns 잔여 한도
 */
export function calculateCardDeductionRemaining(totalDeduction: number): number {
  return Math.max(0, CARD_DEDUCTION_LIMIT - totalDeduction);
}

/**
 * 카드 타입별 이름 반환
 * @param type 카드 타입
 * @returns 카드 타입 이름
 */
export function getCardTypeName(type: CardType): string {
  const names = {
    credit: '신용카드',
    debit: '체크카드',
    cash: '현금영수증',
  };
  return names[type];
}

/**
 * 카드 타입별 공제율 문자열 반환
 * @param type 카드 타입
 * @returns 공제율 문자열
 */
export function getCardRateLabel(type: CardType): string {
  const rate = CARD_RATES[type];
  return `(${(rate * 100).toFixed(0)}%)`;
}

/**
 * 연봉 기준 카드 공제 기준액 계산
 * @param annualSalary 연봉
 * @returns 기준액 (연봉 × 25%)
 */
export function calculateCardDeductionBaseAmount(annualSalary: number): number {
  return Math.floor(annualSalary * 0.25);
}

/**
 * 연말정산 예상 환급액 간편 계산
 * @param annualSalary 연봉
 * @param creditCardTotal 신용카드 사용액
 * @param debitCardTotal 체크카드 사용액
 * @param cashTotal 현금영수증 사용액
 * @param paidTax 기납부세액
 * @returns 예상 환급액
 */
export function calculateSimpleRefund(
  annualSalary: number,
  creditCardTotal: number,
  debitCardTotal: number,
  cashTotal: number,
  paidTax: number
): number {
  // 카드 공제 기준액
  const baseAmount = calculateCardDeductionBaseAmount(annualSalary);

  // 카드 공제 상세 계산
  const cardDetails = calculateCardDeductionDetails(
    creditCardTotal,
    debitCardTotal,
    cashTotal,
    baseAmount
  );

  // 총 소득공제 (카드 공제만)
  const totalIncomeDeduction = Math.min(cardDetails.totalDeduction, CARD_DEDUCTION_LIMIT);

  // 세금 계산 (세액공제 없이)
  const taxResult = calculateTax(annualSalary, totalIncomeDeduction, 0);

  // 환급액
  return calculateRefund(paidTax, taxResult.finalTax);
}
