// lib/duplicate-detector.ts
// 중복 거래 감지 로직 - 모바일 네이티브 버전
import { NormalizedTransaction } from './excel-parser';
import { Transaction } from './db/database';
import { differenceInDays, differenceInMinutes, parse } from 'date-fns';

export interface DuplicateCandidate {
  importTx: NormalizedTransaction;
  existingTx: Transaction;
  score: number; // 0~1, 높을수록 중복 가능성 높음
}

/**
 * 중복 거래 감지
 * 우선순위:
 * 1. 날짜 + 시간 + 금액 + 상호명 (가장 정확)
 * 2. 날짜 + 금액 + 상호명 (시간 정보 없을 때)
 * 3. 날짜 + 금액 + 메모 (상호명 없을 때)
 */
export function detectDuplicates(
  importTransactions: NormalizedTransaction[],
  existingTransactions: Transaction[]
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (const importTx of importTransactions) {
    for (const existingTx of existingTransactions) {
      const score = calculateSimilarityScore(importTx, existingTx);
      if (score >= 0.95) {
        // 95% 이상 유사하면 중복 후보
        candidates.push({ importTx, existingTx, score });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * 단순 중복 체크 (빠른 버전) - 날짜 + 가맹점 + 금액 기준
 */
export function isLikelyDuplicate(
  importTx: NormalizedTransaction,
  existingTx: Transaction
): boolean {
  // 금액이 다르면 다른 거래
  if (importTx.amount !== existingTx.amount) {
    return false;
  }

  // 날짜가 다르면 다른 거래
  if (importTx.date !== existingTx.date) {
    return false;
  }

  // 가맹점명 비교 (소문자, 공백 제거)
  const importMerchant = (importTx.merchant || importTx.memo || '').toLowerCase().replace(/\s+/g, '');
  const existingMerchant = (existingTx.merchant || existingTx.description || '').toLowerCase().replace(/\s+/g, '');

  if (importMerchant && existingMerchant) {
    // 80% 이상 유사하면 중복으로 판단
    return stringSimilarity(importMerchant, existingMerchant) >= 0.8;
  }

  // 가맹점명이 없으면 날짜+금액만으로 판단
  return true;
}

function calculateSimilarityScore(
  importTx: NormalizedTransaction,
  existingTx: Transaction
): number {
  // 0. 금액이 다르면 바로 탈락 (성능 최적화)
  if (importTx.amount !== existingTx.amount) {
    return 0;
  }

  let score = 0;

  // 1. 날짜 + 시간 정확도
  try {
    const importDate = parse(importTx.date, 'yyyy-MM-dd', new Date());
    const existingDate = parse(existingTx.date, 'yyyy-MM-dd', new Date());

    // 시간 정보가 있는 경우 (datetime 형식 체크)
    const hasTimeInfo = importTx.date.includes(' ') || importTx.date.includes('T');
    const existingHasTime = existingTx.date.includes(' ') || existingTx.date.includes('T');

    if (hasTimeInfo && existingHasTime) {
      // 시간까지 비교 (±5분 허용)
      const timeDiff = Math.abs(differenceInMinutes(importDate, existingDate));
      if (timeDiff <= 5) {
        score += 0.5; // 시간이 거의 일치하면 높은 점수
      } else if (timeDiff <= 60) {
        score += 0.3; // 1시간 이내면 중간 점수
      } else {
        return 0; // 시간 차이가 크면 다른 거래
      }
    } else {
      // 시간 정보 없을 때는 날짜만 비교 (±1일 허용)
      const dateDiff = Math.abs(differenceInDays(importDate, existingDate));
      if (dateDiff === 0) {
        score += 0.4; // 같은 날이면 점수
      } else if (dateDiff === 1) {
        score += 0.2; // 하루 차이면 낮은 점수
      } else {
        return 0; // 날짜 차이가 크면 다른 거래
      }
    }
  } catch {
    // 날짜 파싱 실패 시 문자열 비교
    if (importTx.date === existingTx.date) {
      score += 0.4;
    } else {
      return 0;
    }
  }

  // 2. 금액 일치 (이미 확인했으므로 점수 추가)
  score += 0.3;

  // 3. 상호명 비교 (우선)
  if (importTx.merchant && existingTx.merchant) {
    const merchantSimilarity = stringSimilarity(
      importTx.merchant,
      existingTx.merchant
    );
    score += merchantSimilarity * 0.2;

    // 상호명이 거의 일치하면 중복 확정
    if (merchantSimilarity >= 0.9) {
      return 1.0;
    }
  }
  // 4. 상호명이 없으면 메모로 비교
  else if (importTx.memo && existingTx.memo) {
    const memoSimilarity = stringSimilarity(
      importTx.memo,
      existingTx.memo
    );
    score += memoSimilarity * 0.2;

    // 메모가 거의 일치하면 중복 확정
    if (memoSimilarity >= 0.9) {
      return 1.0;
    }
  }

  return score;
}

function stringSimilarity(a: string, b: string): number {
  const lowerA = a.toLowerCase().trim();
  const lowerB = b.toLowerCase().trim();

  if (lowerA === lowerB) return 1;
  if (lowerA.includes(lowerB) || lowerB.includes(lowerA)) return 0.8;

  // 간단한 Levenshtein 거리 기반 유사도
  const maxLen = Math.max(lowerA.length, lowerB.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(lowerA, lowerB);
  return 1 - distance / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
