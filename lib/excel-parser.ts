// lib/excel-parser.ts
// Excel 파싱 로직 - 모바일 네이티브 간소화 버전
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ColumnMapping {
  source: string; // 원본 컬럼명
  target:
    | 'date'
    | 'amount'
    | 'merchant'
    | 'memo'
    | 'account'
    | 'type'
    | 'ignore'; // 매핑 대상
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  rowCount: number;
}

/**
 * 파일명에서 카드사/은행 이름 추출
 * 예: "신한카드_거래내역.xlsx" -> "신한카드"
 */
export function extractCardNameFromFilename(filename: string): string | null {
  const nameWithoutExt = filename.replace(/\.(xlsx?|csv)$/i, '');

  // 언더스코어 또는 하이픈으로 구분된 첫 번째 부분 추출
  const parts = nameWithoutExt.split(/[_\-]/);
  if (parts.length > 0) {
    const firstPart = parts[0].trim();

    // 카드사/은행 이름 패턴 매칭
    if (firstPart.includes('현대카드') || firstPart.match(/현대.*카드/i)) return '현대카드';
    if (firstPart.includes('신한카드') || firstPart.match(/신한.*카드/i)) return '신한카드';
    if (firstPart.includes('삼성카드') || firstPart.match(/삼성.*카드/i)) return '삼성카드';
    if (firstPart.includes('KB국민카드') || firstPart.includes('국민카드') || firstPart.match(/KB.*카드/i)) return 'KB국민카드';
    if (firstPart.includes('롯데카드') || firstPart.match(/롯데.*카드/i)) return '롯데카드';
    if (firstPart.includes('하나카드') || firstPart.match(/하나.*카드/i)) return '하나카드';
    if (firstPart.includes('우리카드') || firstPart.match(/우리.*카드/i)) return '우리카드';
    if (firstPart.includes('NH농협카드') || firstPart.includes('농협카드') || firstPart.match(/NH.*카드/i)) return 'NH농협카드';
    if (firstPart.includes('신한은행') || firstPart.match(/신한.*은행/i)) return '신한은행';
    if (firstPart.match(/(KB국민은행|국민은행|우리은행|하나은행|농협은행|NH농협은행)/i)) {
      return firstPart.match(/(KB국민은행|국민은행|우리은행|하나은행|농협은행|NH농협은행)/i)?.[0] || null;
    }
  }

  return null;
}

/**
 * Excel 파일 구조 분석으로 카드사 추론
 * 가맹점명 패턴, 컬럼 구조 등으로 카드사를 식별
 */
function inferCardIssuerFromStructure(buffer: ArrayBuffer): string | null {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const allRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: null,
      raw: false,
    });

    // 가맹점명 컬럼에서 숫자 prefix 패턴 분석 (하나카드 특징)
    // 예: "009844_SK텔레콤", "173903_SK텔레콤", "123456_롯데쇼핑"
    let hanaPatternCount = 0;

    for (let i = 0; i < Math.min(allRows.length, 50); i++) {
      const row = allRows[i];
      if (!row) continue;

      for (const cell of row) {
        const cellStr = String(cell || '').trim();

        // 하나카드 패턴: 5-6자리 숫자_한글/영문 가맹점명
        if (/^\d{5,6}_[가-힣a-zA-Z]/.test(cellStr)) {
          hanaPatternCount++;
        }
      }
    }

    // 하나카드 패턴이 2개 이상이면 하나카드로 판정
    if (hanaPatternCount >= 2) {
      console.log(`[구조 분석] 하나카드 패턴 감지: ${hanaPatternCount}개 발견`);
      return '하나카드';
    }

    // 추가 카드사 패턴을 여기에 추가 가능

  } catch (error) {
    console.error('[구조 분석] 오류:', error);
  }

  return null;
}

/**
 * 엑셀 파일에서 카드 이름 추출
 */
export function extractCardName(buffer: ArrayBuffer): string | null {
  // 우선순위 0: 구조 기반 추론 (이미지로 된 카드 로고 대응)
  const inferredCard = inferCardIssuerFromStructure(buffer);
  if (inferredCard) {
    return inferredCard;
  }

  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  // 모든 행을 배열로 변환 (헤더 없이)
  const allRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  // 파일 초반 20행 내에서 카드 이름 찾기
  const foundCards = new Set<string>();

  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const row = allRows[i];
    if (!row) continue;

    for (const cell of row) {
      const cellStr = String(cell || '').trim();

      // 우선순위 1: 정확한 "카드" 키워드 포함
      if (cellStr.includes('하나카드') || cellStr.match(/하나.*카드/i)) {
        foundCards.add('하나카드');
      } else if (cellStr.includes('신한카드') || cellStr.match(/신한.*카드/i)) {
        foundCards.add('신한카드');
      } else if (cellStr.includes('현대카드') || cellStr.match(/현대.*카드/i)) {
        foundCards.add('현대카드');
      } else if (cellStr.includes('삼성카드') || cellStr.match(/삼성.*카드/i)) {
        foundCards.add('삼성카드');
      } else if (cellStr.includes('KB국민카드') || cellStr.includes('국민카드') || cellStr.match(/KB.*카드/i)) {
        foundCards.add('KB국민카드');
      } else if (cellStr.includes('롯데카드') || cellStr.match(/롯데.*카드/i)) {
        foundCards.add('롯데카드');
      } else if (cellStr.includes('우리카드') || cellStr.match(/우리.*카드/i)) {
        foundCards.add('우리카드');
      } else if (cellStr.includes('NH농협카드') || cellStr.includes('농협카드') || cellStr.match(/NH.*카드/i)) {
        foundCards.add('NH농협카드');
      }
      // 우선순위 2: 은행 패턴
      else if (cellStr.includes('신한은행') || cellStr.match(/신한.*은행/i)) {
        foundCards.add('신한은행');
      } else if (cellStr.match(/(KB|국민|우리|하나|농협|NH).*은행/i)) {
        const bankMatch = cellStr.match(/(KB국민은행|국민은행|우리은행|하나은행|농협은행|NH농협은행)/i)?.[0];
        if (bankMatch) foundCards.add(bankMatch);
      }
    }
  }

  // 가장 먼저 발견된 카드/은행 반환 (카드 우선)
  const cardPriority = ['하나카드', '신한카드', '현대카드', '삼성카드', 'KB국민카드', '롯데카드', '우리카드', 'NH농협카드'];
  const bankPriority = ['신한은행', '하나은행', 'KB국민은행', '국민은행', '우리은행', '농협은행', 'NH농협은행'];

  for (const card of cardPriority) {
    if (foundCards.has(card)) return card;
  }

  for (const bank of bankPriority) {
    if (foundCards.has(bank)) return bank;
  }

  return null;
}

/**
 * 엑셀/CSV 파일을 파싱하여 JSON 배열로 반환
 */
export function parseExcelFile(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sectionMarkers = ['이용일자별', '거래내역', '카드사용내역', '이용상세내역'];
  let targetSheet: any = null;
  let targetSheetName: string = workbook.SheetNames[0];

  // 모든 시트를 확인하여 섹션 마커가 있는 시트 찾기
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false,
    });

    // 섹션 마커 확인
    const hasMarker = rows.some(row =>
      row && row.some(cell => {
        const str = String(cell || '');
        return sectionMarkers.some(marker => str.includes(marker));
      })
    );

    if (hasMarker) {
      console.log(`[엑셀 파서] 섹션 마커 발견! 시트: ${sheetName} (${rows.length}행)`);
      targetSheet = sheet;
      targetSheetName = sheetName;
      break;
    }
  }

  // 섹션 마커가 없으면 첫 번째 시트 사용
  if (!targetSheet) {
    targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  }

  // 모든 행을 배열로 변환 (헤더 없이)
  const allRows: any[][] = XLSX.utils.sheet_to_json(targetSheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  if (allRows.length === 0) {
    throw new Error('파일에 데이터가 없습니다.');
  }

  console.log(`[엑셀 파서] 사용 시트: ${targetSheetName}, 총 ${allRows.length}행`);

  // 헤더 행 찾기
  let headerRowIndex = -1;
  const headerKeywords = ['거래일자', '거래시간', '적요', '출금', '입금', '사용일자', '이용일', '가맹점명', '이용금액'];

  // 섹션 마커 찾기
  let sectionStartIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 50); i++) {
    const row = allRows[i];
    if (!row) continue;

    const hasMarker = row.some((cell: any) => {
      const str = String(cell || '');
      return sectionMarkers.some(marker => str.includes(marker));
    });

    if (hasMarker) {
      console.log(`[엑셀 파서] 섹션 마커 발견 (행 ${i + 1})`);
      sectionStartIndex = i;

      const markerText = row.find((cell: any) => {
        const str = String(cell || '');
        return sectionMarkers.some(marker => str.includes(marker));
      });

      if (String(markerText || '').includes('이용상세내역')) {
        headerRowIndex = i + 3; // 하나카드: 마커 + 3행
        console.log(`[엑셀 파서] 하나카드 형식 감지, 헤더 행 설정 (행 ${headerRowIndex + 1})`);
      } else {
        headerRowIndex = i + 1; // 신한카드: 마커 + 1행
        console.log(`[엑셀 파서] 헤더 행 설정 (행 ${headerRowIndex + 1})`);
      }
      break;
    }
  }

  // 섹션 마커가 없으면 키워드 기반으로 헤더 찾기
  if (sectionStartIndex < 0) {
    console.log(`[엑셀 파서] 섹션 마커 없음, 키워드 기반 헤더 검색`);

    for (let i = 0; i < Math.min(allRows.length, 50); i++) {
      const row = allRows[i];
      if (!row) continue;

      // 헤더 키워드가 2개 이상 있는 행을 찾기
      const keywordCount = headerKeywords.filter(keyword =>
        row.some((cell: any) => String(cell || '').includes(keyword))
      ).length;

      if (keywordCount >= 2) {
        console.log(`[엑셀 파서] 헤더 발견 (행 ${i + 1}, 키워드 ${keywordCount}개)`);
        headerRowIndex = i;
        break;
      }
    }

    // 헤더를 찾지 못한 경우 첫 번째 행을 헤더로 사용
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }
  }

  // 헤더 병합 (개행 문자 제거)
  let headers = allRows[headerRowIndex].map((h: any) => String(h || '').replace(/[\n\r]/g, '').trim());

  // 다음 행들도 헤더의 일부인지 확인하여 병합
  const maxHeaderRows = 5;
  for (let j = 1; j <= maxHeaderRows && headerRowIndex + j < allRows.length; j++) {
    const nextRow = allRows[headerRowIndex + j];
    if (!nextRow) break;

    // 날짜 패턴 감지 (데이터 행 발견 시 중단)
    const hasShortDate = nextRow.some((cell: any) => {
      const str = String(cell || '').trim();
      return /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str);
    });

    const hasStandardDate = nextRow.some((cell: any) => {
      const str = String(cell || '').trim();
      return /^\d{4}[./-]\d{2}[./-]\d{2}$/.test(str) || /^\d{2}[./-]\d{2}[./-]\d{2}$/.test(str);
    });

    if (hasShortDate || hasStandardDate) {
      console.log(`[엑셀 파서] 데이터 행 감지, 헤더 병합 중단 (행 ${headerRowIndex + j + 1})`);
      break;
    }

    // 숫자 셀 많은 행은 데이터로 간주
    const cellValues = nextRow.map((cell: any) => String(cell || '').trim()).filter((v: string) => v.length > 0);
    const numericCells = cellValues.filter((str: string) => /^\d{5,}$/.test(str));

    if (cellValues.length >= 3 && numericCells.length / cellValues.length >= 0.3) {
      console.log(`[엑셀 파서] 데이터 행 감지 (숫자 셀 ${numericCells.length}/${cellValues.length}), 헤더 병합 중단`);
      break;
    }

    // 헤더 행이면 병합
    const isHeaderRow = nextRow.some((cell: any) => {
      const str = String(cell || '').trim();
      return str.length > 0 && str.length <= 20;
    });

    if (isHeaderRow) {
      headers = headers.map((h: string, idx: number) => {
        const nextCell = String(nextRow[idx] || '').replace(/[\n\r]/g, '').trim();
        if (nextCell && nextCell !== h && !h.includes(nextCell)) {
          return h ? `${h}${nextCell}` : nextCell;
        }
        return h;
      });
      headerRowIndex++;
    } else {
      break;
    }
  }

  const dataRows = allRows.slice(headerRowIndex + 1);

  // 합계/소계 행 처리
  let grandTotalIndex = -1;
  const grandTotalKeywords = ['총합계', '총계', 'grand total'];
  const subtotalKeywords = ['할부 합계', '일시불 합계', '해외이용 합계', '카드소계', '소계', 'subtotal'];

  // 총합계 행 찾기
  for (let i = 0; i < dataRows.length; i++) {
    const firstCell = String(dataRows[i][0] || '').trim();
    if (grandTotalKeywords.some(keyword => firstCell.includes(keyword))) {
      grandTotalIndex = i;
      console.log(`[엑셀 파서] 총합계 행 발견 (데이터행 ${i + 1}): "${firstCell}"`);
      break;
    }
  }

  // 총합계 이전까지만 사용
  const dataBeforeGrandTotal = grandTotalIndex >= 0 ? dataRows.slice(0, grandTotalIndex) : dataRows;

  // 중간 소계 행 필터링
  const validDataRows = dataBeforeGrandTotal.filter((row, i) => {
    const firstCell = String(row[0] || '').trim();

    // 소계 행 제외
    const isSubtotal = subtotalKeywords.some(keyword => firstCell.includes(keyword));
    if (isSubtotal) {
      console.log(`[엑셀 파서] 소계 행 스킵 (데이터행 ${i + 1}): "${firstCell}"`);
      return false;
    }

    return true;
  });

  console.log(`[엑셀 파서] 유효 데이터 행: ${validDataRows.length}개 (전체 ${dataRows.length}개 중)`);

  // 데이터 행을 객체로 변환
  const jsonData: ParsedRow[] = validDataRows
    .filter((row) => {
      // 빈 행 필터링
      const nonEmptyCells = row.filter((cell: any) => {
        const str = String(cell || '').trim();
        return str.length > 0;
      });

      return nonEmptyCells.length > 0;
    })
    .map((row) => {
      const obj: ParsedRow = {};
      headers.forEach((header: string, idx: number) => {
        if (header) {
          obj[header] = row[idx] || null;
        }
      });
      return obj;
    })
    .filter((obj) => {
      const values = Object.values(obj).filter(v => v !== null && v !== '');

      if (values.length === 0) {
        return false;
      }

      // 카드 설명 행 제거
      if (values.length === 1) {
        const firstValue = String(values[0] || '');
        if (firstValue.includes('카드') && (firstValue.includes('본인') || firstValue.includes('가족'))) {
          console.log(`[엑셀 파서] 카드 설명 행 제외: "${firstValue}"`);
          return false;
        }
      }

      // 날짜가 없는 설명 행 제외
      const dateValue = obj['거래일자'] || obj['사용일자'] || obj['이용일'] || obj['승인일자'];
      if (!dateValue) {
        const allText = values.join(' ');
        const cardDescPatterns = [
          /카드\s*(본인|가족|직원)/,
          /생활밀착형/,
          /\d{4}$/, // 카드 번호 끝자리
        ];

        if (cardDescPatterns.some(pattern => pattern.test(allText))) {
          console.log(`[엑셀 파서] 카드 설명 행 제외: "${allText.slice(0, 50)}"`);
          return false;
        }
      }

      return true;
    });

  console.log(`[엑셀 파서] 최종 파싱된 행: ${jsonData.length}개`);

  if (jsonData.length === 0) {
    throw new Error(`유효한 거래 데이터가 없습니다. (헤더 ${headers.length}개 감지, 데이터 ${dataRows.length}행 처리 후 0건 추출)`);
  }

  return {
    headers: headers.filter((h: string) => h),
    rows: jsonData,
    rowCount: jsonData.length,
  };
}

/**
 * 컬럼명 기반 자동 매핑 추천
 */
export function suggestColumnMapping(headers: string[]): ColumnMapping[] {
  const mapping: ColumnMapping[] = [];

  const datePatterns = ['날짜', '거래일자', '사용일자', '승인일시', '일자', 'date', '거래일', '이용일', '승인일자', '거래월일'];
  const amountPatterns = ['이용금액', '승인금액', '청구금액', '공급가액', '매출금액', '출금', '입금', '금액', 'amount', 'price'];
  const excludeAmountPatterns = ['혜택금액', '수수료', '포인트', '마일리지'];
  const merchantPatterns = ['가맹점명', '사용처', '상호', 'merchant', 'store', '가맹점', '내용', '이용가맹점', '가맹점(상호)'];
  const memoPatterns = ['메모', '비고', '상세', 'note', 'memo', 'description', '적요'];
  const accountPatterns = ['카드명', '카드구분', 'account', 'card', '계좌'];
  const typePatterns = ['취소여부', '승인구분', 'type', '거래구분'];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();

    const isExcludedAmount = excludeAmountPatterns.some((p) =>
      lowerHeader.includes(p.toLowerCase())
    );

    if (datePatterns.some((p) => lowerHeader.includes(p.toLowerCase()))) {
      mapping.push({ source: header, target: 'date' });
    } else if (
      !isExcludedAmount &&
      amountPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: header, target: 'amount' });
    } else if (
      merchantPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: header, target: 'merchant' });
    } else if (
      memoPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: header, target: 'memo' });
    } else if (
      accountPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: header, target: 'account' });
    } else if (
      typePatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: header, target: 'type' });
    }
  }

  return mapping;
}

/**
 * 날짜 문자열을 정규화 (YYYY-MM-DD 형식으로 변환)
 */
export function normalizeDate(value: any): string | null {
  if (!value) return null;

  const str = String(value).trim();

  // 1. YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. YYYYMMDD 형식
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }

  // 3. YYYY.MM.DD 또는 YYYY/MM/DD 형식
  if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(str)) {
    return str.replace(/[./]/g, '-');
  }

  // 4. YY.MM.DD 형식
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(str)) {
    const [yy, mm, dd] = str.split('.');
    const year = parseInt(yy) >= 70 ? `19${yy}` : `20${yy}`;
    return `${year}-${mm}-${dd}`;
  }

  // 5. M/D/YY 또는 MM/DD/YY 형식
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const [mm, dd, yy] = str.split('/');
    const year = parseInt(yy) >= 70 ? `19${yy}` : `20${yy}`;
    const month = mm.padStart(2, '0');
    const day = dd.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 6. MM/DD/YYYY 형식
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [mm, dd, yyyy] = str.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 7. date-fns로 파싱 시도
  const formats = [
    'yyyy-MM-dd',
    'yyyy.MM.dd',
    'yyyy/MM/dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yy.MM.dd',
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      // 다음 포맷 시도
    }
  }

  return null;
}

/**
 * 금액 문자열을 숫자로 정규화
 */
export function normalizeAmount(value: any): number {
  if (value === null || value === undefined || value === '') return 0;

  const str = String(value)
    .replace(/[,\s]/g, '') // 쉼표와 공백 제거
    .replace(/원$/, '') // "원" 제거
    .replace(/^"/, '')  // 현대카드 형식: 앞의 따옴표 제거
    .replace(/"$/, '')  // 현대카드 형식: 뒤의 따옴표 제거
    .trim();

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * 거래 유형 추론 (expense/income)
 */
export function inferTransactionType(
  amount: number,
  typeHint?: string,
  columnName?: string
): 'expense' | 'income' {
  // 1. typeHint가 있으면 우선 사용
  if (typeHint) {
    const lower = typeHint.toLowerCase();
    if (lower.includes('출금') || lower.includes('지출')) return 'expense';
    if (lower.includes('입금') || lower.includes('수입')) return 'income';
  }

  // 2. columnName 힌트
  if (columnName) {
    const lower = columnName.toLowerCase();
    if (lower.includes('출금')) return 'expense';
    if (lower.includes('입금')) return 'income';

    // 신용카드 컬럼: 양수=지출, 음수=수입(환불)
    if (lower.includes('이용금액') || lower.includes('내실금액') || lower.includes('청구금액')) {
      return amount >= 0 ? 'expense' : 'income';
    }
  }

  // 3. 금액 부호
  if (amount < 0) return 'expense';
  if (amount > 0) return 'income';

  // 4. 기본값 = 지출
  return 'expense';
}

/**
 * 매핑을 적용하여 거래를 정규화
 */
export interface NormalizedTransaction {
  date: string;
  amount: number;
  type: 'expense' | 'income';
  merchant?: string;
  memo?: string;
  account?: string;
  original: ParsedRow;
}

export function applyMapping(
  rows: ParsedRow[],
  mapping: ColumnMapping[]
): NormalizedTransaction[] {
  const result: NormalizedTransaction[] = [];

  console.log(`[applyMapping] 시작: ${rows.length}개 행, ${mapping.length}개 매핑`);

  for (const row of rows) {
    const normalized: Partial<NormalizedTransaction> = {
      original: row,
    };

    let typeHint: string | undefined;
    let amountColumnName: string | undefined;
    let 출금금액 = 0;
    let 입금금액 = 0;

    for (const map of mapping) {
      const value = row[map.source];
      if (value === null || value === undefined) continue;

      switch (map.target) {
        case 'date':
          normalized.date = normalizeDate(value) || undefined;
          break;
        case 'amount':
          const columnLower = map.source.toLowerCase();
          const amount = normalizeAmount(value);

          // 출금/입금 컬럼 분리 처리
          if (columnLower.includes('출금')) {
            if (amount !== 0) {
              출금금액 = amount;
              typeHint = '출금';
              amountColumnName = map.source;
            }
          } else if (columnLower.includes('입금')) {
            if (amount !== 0) {
              입금금액 = amount;
              typeHint = '입금';
              amountColumnName = map.source;
            }
          } else {
            // 단일 금액 컬럼인 경우
            if (amount !== 0 && !normalized.amount) {
              normalized.amount = amount;
              amountColumnName = map.source;
            }
          }
          break;
        case 'merchant':
          normalized.merchant = String(value).trim();
          break;
        case 'memo':
          normalized.memo = String(value).trim();
          break;
        case 'account':
          normalized.account = String(value).trim();
          break;
        case 'type':
          typeHint = String(value).trim();
          break;
      }
    }

    // 출금/입금 중 하나만 값이 있는 경우 처리
    if (출금금액 !== 0 || 입금금액 !== 0) {
      normalized.amount = 출금금액 !== 0 ? 출금금액 : 입금금액;
      if (!typeHint) {
        typeHint = 출금금액 !== 0 ? '출금' : '입금';
      }
    }

    // 필수 필드 검증
    if (!normalized.date || normalized.amount === undefined || normalized.amount === 0) {
      console.log(`[applyMapping] 스킵:`, { date: normalized.date, amount: normalized.amount });
      continue;
    }

    normalized.type = inferTransactionType(normalized.amount, typeHint, amountColumnName);

    // 타입 결정 후 금액을 절대값으로 변환
    normalized.amount = Math.abs(normalized.amount);

    result.push(normalized as NormalizedTransaction);
  }

  console.log(`[applyMapping] 완료: ${result.length}개 거래 생성`);
  return result;
}

/**
 * 중복 거래 제거
 * @param transactions 정규화된 거래 목록
 * @param strictMode 엄격 모드 (true: 날짜+금액만, false: 날짜+가맹점+금액)
 * @returns 중복 제거된 거래 목록
 */
export function removeDuplicateTransactions(
  transactions: NormalizedTransaction[],
  strictMode: boolean = false
): { unique: NormalizedTransaction[]; duplicateCount: number } {
  const seen = new Set<string>();
  const unique: NormalizedTransaction[] = [];
  let duplicateCount = 0;

  for (const tx of transactions) {
    let key: string;

    if (strictMode) {
      // 엄격 모드: 날짜 + 금액만으로 중복 체크 (같은 날 같은 금액이면 중복)
      key = `${tx.date}|${tx.amount}`;
    } else {
      // 기본 모드: 날짜 + 가맹점명(소문자, 공백제거) + 금액
      const merchantKey = (tx.merchant || tx.memo || '').toLowerCase().replace(/\s+/g, '');
      key = `${tx.date}|${merchantKey}|${tx.amount}`;
    }

    if (seen.has(key)) {
      duplicateCount++;
      console.log(`[중복 제거] 스킵: ${tx.date} / ${tx.merchant || tx.memo} / ${tx.amount}`);
    } else {
      seen.add(key);
      unique.push(tx);
    }
  }

  if (duplicateCount > 0) {
    console.log(`[중복 제거] ${strictMode ? '(엄격모드)' : ''} ${duplicateCount}개 중복 거래 제거됨 (${transactions.length} → ${unique.length})`);
  }

  return { unique, duplicateCount };
}
