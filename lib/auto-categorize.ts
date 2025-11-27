// lib/auto-categorize.ts
// 자동 분류 로직 - SQLite 직접 사용 (모바일 네이티브)
import { database } from './db/database';
import type { Category, Rule } from './db/database';

interface TransactionForCategorization {
  merchant?: string | null;
  memo?: string | null;
  cardName?: string | null;
}

/**
 * 카드/은행명 기반 기본 분류 규칙
 * 특정 카드사의 가맹점명 패턴으로 카테고리 추론
 */
async function applyCardSpecificRules(
  transaction: TransactionForCategorization,
  categories: Category[]
): Promise<number | null> {
  let merchant = (transaction.merchant || '').toLowerCase();
  const cardName = (transaction.cardName || '').toLowerCase();

  // 카테고리 이름으로 빠른 검색 (ID 반환)
  const findCategory = (name: string): number | null => {
    const category = categories.find(c => c.name === name);
    return category ? category.id : null;
  };

  // 하나카드: 가맹점명 앞 숫자 코드 제거 (예: "009844_SK텔레콤" → "sk텔레콤")
  if (cardName.includes('하나') && merchant.match(/^\d+_/)) {
    merchant = merchant.replace(/^\d+_/, '');
  }

  // 공통 규칙 (모든 카드)
  // Seed 카테고리: 식비, 카페/간식, 교통, 주거/관리, 통신, 쇼핑, 여가/문화, 의료, 교육, 수입, 기타
  if (merchant.includes('롯데쇼핑') || merchant.includes('롯데슈퍼') || merchant.includes('홈플러스') || merchant.includes('이마트')) {
    return findCategory('식비');
  }
  if (merchant.includes('sk텔레콤') || merchant.includes('통신요금') || merchant.includes('kt') || merchant.includes('lg유플러스')) {
    return findCategory('통신');
  }
  if (merchant.includes('스타벅스') || merchant.includes('이디야') || merchant.includes('투썸') || merchant.includes('메가커피') || merchant.includes('커피')) {
    return findCategory('카페/간식') || findCategory('문화');
  }
  if (merchant.includes('gs25') || merchant.includes('cu') || merchant.includes('세븐일레븐') || merchant.includes('편의점')) {
    return findCategory('식비');
  }
  if (merchant.includes('도미노피자') || merchant.includes('피자') || merchant.includes('치킨') || merchant.includes('맥도날드') || merchant.includes('버거킹')) {
    return findCategory('식비');
  }
  if (merchant.includes('coupang') || merchant.includes('쿠팡') || merchant.includes('11번가') || merchant.includes('네이버쇼핑')) {
    return findCategory('쇼핑');
  }
  if (merchant.includes('넷플릭스') || merchant.includes('멜론') || merchant.includes('지니') || merchant.includes('구독') || merchant.includes('피치그로브')) {
    return findCategory('문화');
  }
  if (merchant.includes('병원') || merchant.includes('약국') || merchant.includes('클리닉')) {
    return findCategory('의료');
  }
  if (merchant.includes('주유소') || merchant.includes('gs칼텍스') || merchant.includes('sk에너지') || merchant.includes('현대오일뱅크')) {
    return findCategory('교통');
  }
  if (merchant.includes('지하철') || merchant.includes('버스') || merchant.includes('티머니') || merchant.includes('카카오t') || merchant.includes('택시')) {
    return findCategory('교통');
  }

  return null;
}

/**
 * 자동 분류 규칙을 적용하여 카테고리 ID 반환
 * @param transaction 거래 정보 (merchant, memo)
 * @returns 매칭된 카테고리 ID 또는 null
 */
export async function applyCategoryRules(
  transaction: TransactionForCategorization
): Promise<number | null> {
  // 활성화된 규칙을 우선순위 순으로 가져오기
  const rules = await database.getRules(true); // activeOnly = true

  // 1순위: Rule 기반 매칭 (정확한 매칭 우선)
  // 첫 번째 패스: 정확히 일치하는 규칙 찾기
  for (const rule of rules) {
    const fieldValue = rule.checkMerchant ? transaction.merchant : transaction.memo;
    if (!fieldValue) continue;

    const patterns = rule.pattern.split(',').map(p => p.trim()).filter(p => p);

    for (const pattern of patterns) {
      // 정확한 매칭 (대소문자, 띄어쓰기 무시)
      const fieldValueNormalized = fieldValue.toLowerCase().replace(/\s/g, '');
      const patternNormalized = pattern.toLowerCase().replace(/\s/g, '');
      if (fieldValueNormalized === patternNormalized) {
        return rule.assignCategoryId;
      }
    }
  }

  // 두 번째 패스: 부분 매칭 규칙 찾기
  for (const rule of rules) {
    const fieldValue = rule.checkMerchant ? transaction.merchant : transaction.memo;
    if (!fieldValue) continue;

    const patterns = rule.pattern.split(',').map(p => p.trim()).filter(p => p);

    for (const pattern of patterns) {
      // 패턴 매칭 (정규식 또는 단순 문자열 포함)
      let isMatch = false;
      try {
        // 정규식 시도
        const regex = new RegExp(pattern, 'i'); // 대소문자 무시
        isMatch = regex.test(fieldValue);
      } catch {
        // 정규식이 아니면 단순 문자열 포함 검사 (띄어쓰기 무시)
        const fieldValueNormalized = fieldValue.toLowerCase().replace(/\s/g, '');
        const patternNormalized = pattern.toLowerCase().replace(/\s/g, '');
        isMatch = fieldValueNormalized.includes(patternNormalized);
      }

      if (isMatch) {
        return rule.assignCategoryId;
      }
    }
  }

  // 2순위: 카테고리명 3글자 이상 일치 (현금영수증/집계제외 제외)
  const categories = await database.getCategories();
  const filteredCategories = categories.filter(
    c => !c.excludeFromStats
  );

  const merchantLower = (transaction.merchant || '').toLowerCase().replace(/\s/g, '');
  const memoLower = (transaction.memo || '').toLowerCase().replace(/\s/g, '');

  for (const category of filteredCategories) {
    // 슬래시로 구분된 복합 카테고리는 각 부분으로 분리 (예: "카페/간식" → ["카페", "간식"])
    const categoryParts = category.name.split('/').map(part => part.trim().toLowerCase().replace(/\s/g, ''));

    for (const part of categoryParts) {
      // 카테고리명이 3글자 이상이고, 가맹점명이나 메모에 포함된 경우
      if (part.length >= 3) {
        if (merchantLower.includes(part) || memoLower.includes(part)) {
          return category.id;
        }
      }
      // 2글자 카테고리도 허용 (단, 한글만 포함된 경우)
      else if (part.length === 2 && /^[ㄱ-ㅎ가-힣]+$/.test(part)) {
        if (merchantLower.includes(part) || memoLower.includes(part)) {
          return category.id;
        }
      }
    }
  }

  return null;
}

/**
 * 여러 거래에 대해 일괄 자동 분류
 * @param transactions 거래 목록
 * @returns 각 거래에 대한 카테고리 ID 배열 (순서 유지)
 */
export async function applyCategoryRulesBulk(
  transactions: TransactionForCategorization[]
): Promise<(number | null)[]> {
  // 활성화된 규칙을 우선순위 순으로 가져오기
  const rules = await database.getRules(true); // activeOnly = true

  // 모든 카테고리 조회 (3글자 매칭용, 현금영수증/집계제외 제외)
  const categories = await database.getCategories();
  const filteredCategories = categories.filter(
    c => !c.excludeFromStats
  );

  // 각 거래에 대해 규칙 적용
  return Promise.all(transactions.map(async (transaction) => {
    // 0순위: 카드/은행별 기본 규칙 (가장 높은 우선순위)
    const cardBasedCategory = await applyCardSpecificRules(transaction, filteredCategories);
    if (cardBasedCategory) {
      return cardBasedCategory;
    }

    // 1순위: Rule 기반 매칭 (정확한 매칭 우선)
    // 첫 번째 패스: 정확히 일치하는 규칙 찾기
    for (const rule of rules) {
      const fieldValue = rule.checkMerchant ? transaction.merchant : transaction.memo;
      if (!fieldValue) continue;

      const patterns = rule.pattern.split(',').map(p => p.trim()).filter(p => p);

      for (const pattern of patterns) {
        // 정확한 매칭 (대소문자, 띄어쓰기 무시)
        const fieldValueNormalized = fieldValue.toLowerCase().replace(/\s/g, '');
        const patternNormalized = pattern.toLowerCase().replace(/\s/g, '');
        if (fieldValueNormalized === patternNormalized) {
          return rule.assignCategoryId;
        }
      }
    }

    // 두 번째 패스: 부분 매칭 규칙 찾기
    for (const rule of rules) {
      const fieldValue = rule.checkMerchant ? transaction.merchant : transaction.memo;
      if (!fieldValue) continue;

      const patterns = rule.pattern.split(',').map(p => p.trim()).filter(p => p);

      for (const pattern of patterns) {
        let isMatch = false;
        try {
          const regex = new RegExp(pattern, 'i');
          isMatch = regex.test(fieldValue);
        } catch {
          // 정규식이 아니면 단순 문자열 포함 검사 (띄어쓰기 무시)
          const fieldValueNormalized = fieldValue.toLowerCase().replace(/\s/g, '');
          const patternNormalized = pattern.toLowerCase().replace(/\s/g, '');
          isMatch = fieldValueNormalized.includes(patternNormalized);
        }

        if (isMatch) {
          return rule.assignCategoryId;
        }
      }
    }

    // 2순위: 카테고리명 3글자 이상 일치 (현금영수증/집계제외 제외)
    const merchantLower = (transaction.merchant || '').toLowerCase().replace(/\s/g, '');
    const memoLower = (transaction.memo || '').toLowerCase().replace(/\s/g, '');

    for (const category of filteredCategories) {
      // 슬래시로 구분된 복합 카테고리는 각 부분으로 분리 (예: "카페/간식" → ["카페", "간식"])
      const categoryParts = category.name.split('/').map(part => part.trim().toLowerCase().replace(/\s/g, ''));

      for (const part of categoryParts) {
        // 카테고리명이 3글자 이상이고, 가맹점명이나 메모에 포함된 경우
        if (part.length >= 3) {
          if (merchantLower.includes(part) || memoLower.includes(part)) {
            return category.id;
          }
        }
        // 2글자 카테고리도 허용 (단, 한글만 포함된 경우)
        else if (part.length === 2 && /^[ㄱ-ㅎ가-힣]+$/.test(part)) {
          if (merchantLower.includes(part) || memoLower.includes(part)) {
            return category.id;
          }
        }
      }
    }

    return null;
  }));
}
