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
    | 'time'
    | 'amount'
    | 'withdrawal' // 출금 컬럼 (은행 통장)
    | 'deposit'    // 입금 컬럼 (은행 통장)
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
  const fullText = nameWithoutExt.toLowerCase();

  // 카드사 패턴 (우선순위 순)
  const cardPatterns: [RegExp, string][] = [
    [/현대.*카드|hyundai/i, '현대카드'],
    [/신한.*카드|shinhan.*card/i, '신한카드'],
    [/삼성.*카드|samsung.*card/i, '삼성카드'],
    [/kb.*카드|국민.*카드|kookmin/i, 'KB국민카드'],
    [/롯데.*카드|lotte/i, '롯데카드'],
    [/하나.*카드|hana.*card/i, '하나카드'],
    [/우리.*카드|woori.*card/i, '우리카드'],
    [/nh.*카드|농협.*카드|nonghyup/i, 'NH농협카드'],
    [/bc.*카드|비씨/i, 'BC카드'],
    [/씨티.*카드|citi/i, '씨티카드'],
    [/카카오.*카드|kakao/i, '카카오카드'],
    [/토스.*카드|toss/i, '토스카드'],
  ];

  // 은행 패턴
  const bankPatterns: [RegExp, string][] = [
    [/신한.*은행|shinhan.*bank/i, '신한은행'],
    [/kb.*은행|국민.*은행|kookmin.*bank/i, 'KB국민은행'],
    [/우리.*은행|woori.*bank/i, '우리은행'],
    [/하나.*은행|hana.*bank/i, '하나은행'],
    [/nh.*은행|농협.*은행|nonghyup.*bank/i, 'NH농협은행'],
    [/기업.*은행|ibk/i, 'IBK기업은행'],
    [/sc.*은행|제일.*은행/i, 'SC제일은행'],
    [/케이.*뱅크|k.*bank/i, '케이뱅크'],
    [/카카오.*뱅크|kakao.*bank/i, '카카오뱅크'],
    [/토스.*뱅크|toss.*bank/i, '토스뱅크'],
    [/새마을/i, '새마을금고'],
    [/신협/i, '신협'],
    [/우체국/i, '우체국'],
    [/수협/i, '수협'],
    [/대구.*은행/i, '대구은행'],
    [/부산.*은행/i, '부산은행'],
    [/경남.*은행/i, '경남은행'],
    [/광주.*은행/i, '광주은행'],
    [/전북.*은행/i, '전북은행'],
    [/제주.*은행/i, '제주은행'],
  ];

  // 카드사 우선 매칭
  for (const [pattern, name] of cardPatterns) {
    if (pattern.test(fullText)) return name;
  }

  // 은행 매칭
  for (const [pattern, name] of bankPatterns) {
    if (pattern.test(fullText)) return name;
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
  const cardPriority = [
    '하나카드', '신한카드', '현대카드', '삼성카드', 'KB국민카드', '롯데카드', '우리카드', 'NH농협카드',
    'BC카드', '씨티카드', '카카오카드', '토스카드'
  ];
  const bankPriority = [
    '신한은행', '하나은행', 'KB국민은행', '국민은행', '우리은행', '농협은행', 'NH농협은행',
    'IBK기업은행', 'SC제일은행', '케이뱅크', '카카오뱅크', '토스뱅크',
    '새마을금고', '신협', '우체국', '수협'
  ];

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
  // 디버깅: 파일 시작 바이트 확인 (파일 형식 감지)
  const bytes = new Uint8Array(buffer.slice(0, 16));
  const hexHeader = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log(`[엑셀 파서] 파일 헤더 (hex): ${hexHeader}`);

  // 파일 형식 감지
  // XLS (BIFF8): D0 CF 11 E0 A1 B1 1A E1 (OLE2 Compound Document)
  // XLSX: 50 4B 03 04 (PK.. ZIP 형식)
  // HTML: 3C 68 74 6D 6C (<html) 또는 3C 21 44 4F (<!DO)
  const isOLE2 = bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
  const isZIP = bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
  const isHTML = (bytes[0] === 0x3C && bytes[1] === 0x68) || (bytes[0] === 0x3C && bytes[1] === 0x21);
  const isUTF8BOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;

  console.log(`[엑셀 파서] 파일 형식: OLE2(xls)=${isOLE2}, ZIP(xlsx)=${isZIP}, HTML=${isHTML}, UTF8BOM=${isUTF8BOM}`);

  // HTML 형식인 경우 경고 (일부 은행에서 .xls로 저장하지만 실제로는 HTML)
  if (isHTML) {
    console.warn('[엑셀 파서] ⚠️ HTML 형식 감지! 이 파일은 .xls 확장자이지만 실제로는 HTML입니다.');
    // HTML 형식은 xlsx 라이브러리가 파싱할 수 있음
  }

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
  // 더 다양한 은행/카드사 헤더 키워드 지원
  const headerKeywords = [
    // 날짜 관련
    '거래일자', '거래일', '사용일자', '이용일', '이용일자', '승인일자', '승인일', '결제일', '매출일', '일자', '날짜', 'Date',
    // 시간 관련
    '거래시간', '이용시간', '승인시간', '시간',
    // 금액 관련
    '출금', '입금', '이용금액', '거래금액', '승인금액', '결제금액', '청구금액', '금액', '원금', 'Amount',
    // 내역 관련
    '적요', '가맹점명', '가맹점', '상호', '이용가맹점', '사용처', '거래처', '내역', '상세내역', '비고', 'Description', 'Merchant',
    // 기타
    '카드번호', '계좌번호', '잔액', '메모', '취소', '구분'
  ];

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
      } else if (String(markerText || '').includes('거래내역')) {
        // 신한은행: 마커 이후 행에서 계좌번호가 있는지 확인 (최대 10행 검색)
        // 신한은행 형식: 마커 → 빈행 → 계좌번호 → 조회기간 → 총건수 → 빈행 → 헤더
        let foundShinhanBank = false;
        let shinhanHeaderRow = -1;

        // 마커 이후 10행 내에서 '계좌번호'와 '거래일자' 헤더 찾기
        for (let j = i + 1; j < Math.min(i + 15, allRows.length); j++) {
          const checkRow = allRows[j];
          if (!checkRow) continue;

          // 계좌번호 행 확인
          const hasAccountNumber = checkRow.some((cell: any) => {
            const str = String(cell || '');
            return str === '계좌번호';
          });

          // 헤더 행 확인 (거래일자 + 출금/입금)
          const hasDateHeader = checkRow.some((cell: any) => String(cell || '') === '거래일자');
          const hasWithdrawal = checkRow.some((cell: any) => String(cell || '').includes('출금'));
          const hasDeposit = checkRow.some((cell: any) => String(cell || '').includes('입금'));

          if (hasAccountNumber) {
            console.log(`[엑셀 파서] 신한은행 계좌번호 발견 (행 ${j + 1})`);
            foundShinhanBank = true;
          }

          if (hasDateHeader && hasWithdrawal && hasDeposit) {
            shinhanHeaderRow = j;
            console.log(`[엑셀 파서] 신한은행 헤더 발견 (행 ${j + 1}): 거래일자, 출금, 입금`);
            break;
          }
        }

        if (foundShinhanBank && shinhanHeaderRow >= 0) {
          headerRowIndex = shinhanHeaderRow;
          console.log(`[엑셀 파서] 신한은행 형식 감지, 헤더 행 설정 (행 ${headerRowIndex + 1})`);
        } else {
          headerRowIndex = i + 1; // 신한카드: 마커 + 1행
          console.log(`[엑셀 파서] 신한카드 형식 감지, 헤더 행 설정 (행 ${headerRowIndex + 1})`);
        }
      } else {
        headerRowIndex = i + 1; // 기타: 마커 + 1행
        console.log(`[엑셀 파서] 헤더 행 설정 (행 ${headerRowIndex + 1})`);
      }
      break;
    }
  }

  // 섹션 마커가 없으면 키워드 기반으로 헤더 찾기
  if (sectionStartIndex < 0) {
    console.log(`[엑셀 파서] 섹션 마커 없음, 범용 헤더 검색 (한국/일본/미국/중국/유럽)`);

    // 날짜 관련 키워드 (필수) - 한국어, 일본어, 영어, 중국어, 유럽어
    const dateKeywords = [
      // 한국어
      '일자', '일시', '날짜', '이용일', '거래일', '사용일', '승인일', '결제일', '매출일',
      // 일본어
      '日付', '利用日', '取引日', '年月日', '決済日', '使用日', '承認日',
      // 영어
      'date', 'transaction date', 'posting date', 'trans date', 'txn date', 'value date',
      'payment date', 'purchase date', 'settlement date',
      // 중국어 간체
      '日期', '交易日期', '消费日期', '结算日期', '支付日期',
      // 중국어 번체
      '日期', '交易日期', '消費日期', '結算日期', '支付日期',
      // 독일어/프랑스어/스페인어
      'datum', 'fecha', 'data', 'дата'
    ];

    // 금액 관련 키워드 (필수 또는 선택) - 한국어, 일본어, 영어, 중국어, 유럽어
    const amountKeywords = [
      // 한국어
      '금액', '출금', '입금', '이용금액', '지출', '수입', '결제금액', '청구금액', '거래금액',
      '출금액', '입금액', '지출금액', '수입금액',
      // 일본어
      '金額', '利用金額', '出金', '入金', '支出', '収入', '決済金額', '請求金額', '取引金額',
      // 영어
      'amount', 'debit', 'credit', 'withdrawal', 'deposit', 'payment', 'charge',
      'money out', 'money in', 'spent', 'received', 'balance change',
      // 중국어 간체
      '金额', '支出', '收入', '消费金额', '取款', '存款', '交易金额', '付款金额',
      // 중국어 번체
      '金額', '支出', '收入', '消費金額', '取款', '存款', '交易金額', '付款金額',
      // 독일어/프랑스어/스페인어
      'betrag', 'montant', 'importe', 'сумма'
    ];

    // 가맹점/내역 관련 키워드 (선택) - 한국어, 일본어, 영어, 중국어, 유럽어
    const merchantKeywords = [
      // 한국어
      '가맹점', '상호', '적요', '내역', '사용처', '거래처', '결제처', '상호명', '거래내역',
      // 일본어
      '加盟店', '店舗', '摘要', '利用先', '取引先', '商号', '店名', '取引内容',
      // 영어
      'merchant', 'description', 'vendor', 'payee', 'store', 'details', 'narrative',
      'transaction description', 'particulars', 'reference', 'memo',
      // 중국어 간체
      '商户', '商家', '描述', '交易详情', '商店', '备注', '交易说明',
      // 중국어 번체
      '商戶', '商家', '描述', '交易詳情', '商店', '備註', '交易說明',
      // 독일어/프랑스어/스페인어
      'beschreibung', 'libellé', 'descripción', 'описание'
    ];

    for (let i = 0; i < Math.min(allRows.length, 50); i++) {
      const row = allRows[i];
      if (!row) continue;

      // 줄바꿈 제거한 셀 값들
      const cleanedCells = row.map((cell: any) => String(cell || '').replace(/[\n\r]/g, '').trim().toLowerCase());

      // 날짜 키워드 체크
      const hasDate = dateKeywords.some(keyword =>
        cleanedCells.some(cell => cell.includes(keyword.toLowerCase()))
      );

      // 금액 키워드 체크
      const hasAmount = amountKeywords.some(keyword =>
        cleanedCells.some(cell => cell.includes(keyword.toLowerCase()))
      );

      // 가맹점/내역 키워드 체크
      const hasMerchant = merchantKeywords.some(keyword =>
        cleanedCells.some(cell => cell.includes(keyword.toLowerCase()))
      );

      // 날짜 + 금액이 있으면 헤더로 인식
      if (hasDate && hasAmount) {
        console.log(`[엑셀 파서] 범용 헤더 발견 (행 ${i + 1}): 날짜=${hasDate}, 금액=${hasAmount}, 가맹점=${hasMerchant}`);
        headerRowIndex = i;
        break;
      }

      // 날짜 + 가맹점이 있어도 헤더로 인식 (금액은 나중에 나올 수 있음)
      if (hasDate && hasMerchant) {
        console.log(`[엑셀 파서] 범용 헤더 발견 (행 ${i + 1}): 날짜=${hasDate}, 가맹점=${hasMerchant}`);
        headerRowIndex = i;
        break;
      }
    }

    // 헤더를 찾지 못한 경우
    if (headerRowIndex === -1) {
      console.log('[엑셀 파서] 헤더를 찾지 못함, 첫 번째 행 분석');

      // 첫 번째 행이 데이터인지 확인 (날짜 또는 금액 패턴이 있는지)
      const firstRow = allRows[0];
      let hasDataPattern = false;

      if (firstRow) {
        for (const cell of firstRow) {
          const str = String(cell || '').trim();
          // 날짜 패턴 체크
          if (/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(str) ||
              /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str) ||
              /^\d{8}$/.test(str)) {
            hasDataPattern = true;
            break;
          }
          // 금액 패턴 체크 (콤마 포함 숫자)
          const cleaned = str.replace(/[,원\s₩$]/g, '');
          if (/^\d{3,}$/.test(cleaned)) {
            hasDataPattern = true;
            break;
          }
        }
      }

      if (hasDataPattern) {
        // 첫 번째 행이 데이터면 가상 헤더 생성
        console.log('[엑셀 파서] 첫 번째 행이 데이터로 감지됨, 가상 헤더 생성');
        headerRowIndex = -1; // 특수 플래그: 가상 헤더 사용
      } else {
        headerRowIndex = 0;
      }
    }
  }

  // 헤더 처리
  let headers: string[];
  let dataStartIndex: number;

  if (headerRowIndex === -1) {
    // 가상 헤더 생성 (Column1, Column2, ...)
    const firstRow = allRows[0];
    headers = firstRow.map((_: any, idx: number) => `Column${idx + 1}`);
    dataStartIndex = 0;
    console.log(`[엑셀 파서] 가상 헤더 생성: ${headers.length}개 컬럼`);
  } else {
    // 헤더 병합 (개행 문자 제거)
    headers = allRows[headerRowIndex].map((h: any) => String(h || '').replace(/[\n\r]/g, '').trim());
    dataStartIndex = headerRowIndex + 1;

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
        dataStartIndex++;
      } else {
        break;
      }
    }
  }

  const dataRows = allRows.slice(dataStartIndex);

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
          // 헤더 줄바꿈 제거 (예: '이용\n일자' -> '이용일자')
          const cleanedHeader = header.replace(/[\n\r]/g, '');
          obj[cleanedHeader] = row[idx] || null;
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
 * 데이터 내용 기반으로 컬럼 타입 감지 (강화된 버전)
 * 헤더 이름이 깨지거나 알 수 없는 형식이어도 데이터 패턴만으로 컬럼을 찾음
 */
export function detectColumnTypeFromData(
  headers: string[],
  rows: ParsedRow[]
): ColumnMapping[] {
  const mapping: ColumnMapping[] = [];
  const sampleSize = Math.min(rows.length, 30); // 처음 30행 샘플링

  console.log(`[데이터 감지] 시작: ${headers.length}개 컬럼, ${rows.length}개 행`);

  // 각 컬럼별 상세 분석 정보
  interface ColumnStats {
    dates: number;        // 날짜로 인식된 횟수
    amounts: number;      // 금액으로 인식된 횟수
    texts: number;        // 텍스트로 인식된 횟수
    empty: number;        // 빈 값 횟수
    avgTextLen: number;   // 평균 텍스트 길이
    hasKorean: boolean;   // 한글 포함 여부
    sampleValues: string[]; // 샘플 값들 (디버깅용)
  }

  const columnStats: Record<string, ColumnStats> = {};

  for (const header of headers) {
    if (!header) continue;
    columnStats[header] = {
      dates: 0, amounts: 0, texts: 0, empty: 0,
      avgTextLen: 0, hasKorean: false, sampleValues: []
    };
  }

  // 확장된 날짜 패턴
  const datePatterns = [
    /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/,           // YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
    /^\d{4}[-./]\d{1,2}[-./]\d{1,2}\s+\d{1,2}:\d{2}/, // YYYY-MM-DD HH:mm
    /^\d{2}[-./]\d{1,2}[-./]\d{1,2}$/,           // YY-MM-DD, YY.MM.DD
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,               // M/D/YY, MM/DD/YYYY
    /^\d{1,2}[-./]\d{1,2}[-./]\d{2}$/,           // M-D-YY, M.D.YY
    /^\d{8}$/,                                    // YYYYMMDD
    /^\d{6}$/,                                    // YYMMDD
    /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일/,          // YYYY년 MM월 DD일
    /^\d{1,2}월\s*\d{1,2}일/,                    // MM월 DD일
    /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/,             // DD-Mon-YY, DD-Mon-YYYY
    /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/,         // Mon DD, YYYY
  ];

  // 샘플 데이터 분석
  for (let i = 0; i < sampleSize && i < rows.length; i++) {
    const row = rows[i];
    for (const header of headers) {
      if (!header) continue;
      const value = row[header];
      const stats = columnStats[header];

      if (value === null || value === undefined || String(value).trim() === '') {
        stats.empty++;
        continue;
      }

      const str = String(value).trim();
      stats.sampleValues.push(str.slice(0, 30)); // 디버깅용 샘플 저장

      // 1. 날짜 패턴 감지 (확장)
      let isDate = false;
      for (const pattern of datePatterns) {
        if (pattern.test(str)) {
          isDate = true;
          break;
        }
      }
      // Excel 시리얼 날짜 (30000-70000 범위의 숫자)
      const numVal = parseFloat(str);
      if (!isDate && !isNaN(numVal) && numVal >= 30000 && numVal <= 70000 && /^\d+$/.test(str)) {
        isDate = true;
      }

      // 2. 금액 패턴 감지 (강화)
      // 통화 기호, 콤마, 괄호 음수 등 제거 후 숫자인지 확인
      const cleanedForAmount = str
        .replace(/[,\s]/g, '')
        .replace(/^[₩$€¥£]/, '')
        .replace(/원$/, '')
        .replace(/^\((.+)\)$/, '-$1')  // 괄호 음수 처리
        .replace(/^"/, '').replace(/"$/, ''); // 따옴표 제거

      const isAmount = !isDate &&
        /^-?\d+(\.\d+)?$/.test(cleanedForAmount) &&
        cleanedForAmount.length >= 2 &&  // 최소 2자리 (더 관대하게)
        parseFloat(cleanedForAmount) !== 0;

      // 3. 텍스트 패턴 (한글 또는 영문 + 일정 길이)
      const hasKorean = /[가-힣]/.test(str);
      const hasEnglish = /[a-zA-Z]/.test(str);
      const isText = !isDate && !isAmount && (hasKorean || hasEnglish) && str.length >= 2;

      if (isDate) {
        stats.dates++;
      } else if (isAmount) {
        stats.amounts++;
      } else if (isText) {
        stats.texts++;
        stats.avgTextLen += str.length;
        if (hasKorean) stats.hasKorean = true;
      }
    }
  }

  // 분석 결과 로그
  console.log('[데이터 감지] 컬럼별 분석 결과:');
  for (const header of headers) {
    if (!header) continue;
    const stats = columnStats[header];
    const total = stats.dates + stats.amounts + stats.texts;
    if (total === 0) {
      console.log(`  - "${header}": 인식된 패턴 없음 (샘플: ${stats.sampleValues.slice(0, 3).join(', ')})`);
      continue;
    }
    console.log(`  - "${header}": 날짜=${stats.dates}, 금액=${stats.amounts}, 텍스트=${stats.texts} (샘플: ${stats.sampleValues.slice(0, 2).join(', ')})`);
  }

  // 컬럼 선정 (더 관대한 기준)
  const validRows = sampleSize;
  const minRatio = 0.3; // 30% 이상이면 해당 타입으로 간주

  // 날짜 컬럼 찾기 (가장 높은 날짜 비율)
  let bestDateCol: string | null = null;
  let bestDateRatio = 0;

  for (const header of headers) {
    if (!header) continue;
    const stats = columnStats[header];
    const dateRatio = stats.dates / validRows;
    if (dateRatio > bestDateRatio && dateRatio >= minRatio) {
      bestDateRatio = dateRatio;
      bestDateCol = header;
    }
  }

  if (bestDateCol) {
    mapping.push({ source: bestDateCol, target: 'date' });
    console.log(`[데이터 감지] ✓ 날짜 컬럼: "${bestDateCol}" (${Math.round(bestDateRatio * 100)}%)`);
  }

  // 금액 컬럼 찾기 (모든 금액 컬럼 수집)
  const amountColumns: Array<{ col: string; ratio: number; avg: number }> = [];

  for (const header of headers) {
    if (!header || header === bestDateCol) continue;
    const stats = columnStats[header];
    const amountRatio = stats.amounts / validRows;

    if (amountRatio >= minRatio) {
      // 금액 평균 계산 (대략적)
      let avgAmount = 0;
      let count = 0;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const val = rows[i][header];
        if (val) {
          const num = normalizeAmount(val);
          if (num !== 0) {
            avgAmount += Math.abs(num);
            count++;
          }
        }
      }
      avgAmount = count > 0 ? avgAmount / count : 0;

      amountColumns.push({ col: header, ratio: amountRatio, avg: avgAmount });
    }
  }

  // 금액 컬럼 정렬 (비율 높은 순)
  amountColumns.sort((a, b) => b.ratio - a.ratio);

  // 금액 컬럼 매핑
  if (amountColumns.length >= 2) {
    // 여러 금액 컬럼이 있으면 출금/입금 분리 시도
    let foundWithdrawal = false;
    let foundDeposit = false;

    for (const { col, ratio } of amountColumns) {
      const lowerCol = col.toLowerCase();

      if (!foundWithdrawal && (lowerCol.includes('출금') || lowerCol.includes('지출') || lowerCol.includes('debit') || lowerCol.includes('withdraw'))) {
        mapping.push({ source: col, target: 'withdrawal' });
        console.log(`[데이터 감지] ✓ 출금 컬럼: "${col}" (${Math.round(ratio * 100)}%)`);
        foundWithdrawal = true;
      } else if (!foundDeposit && (lowerCol.includes('입금') || lowerCol.includes('수입') || lowerCol.includes('credit') || lowerCol.includes('deposit'))) {
        mapping.push({ source: col, target: 'deposit' });
        console.log(`[데이터 감지] ✓ 입금 컬럼: "${col}" (${Math.round(ratio * 100)}%)`);
        foundDeposit = true;
      }
    }

    // 출금/입금 키워드가 없으면 데이터 패턴으로 분석
    if (!foundWithdrawal && !foundDeposit && amountColumns.length >= 2) {
      // 두 금액 컬럼의 데이터 패턴 분석: 한 행에 하나만 값이 있는지 확인
      let exclusivePattern = 0; // 두 컬럼이 상호 배타적인 패턴 횟수
      let bothHaveValue = 0;    // 두 컬럼 모두 값이 있는 패턴 횟수

      for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const val1 = normalizeAmount(rows[i][amountColumns[0].col]);
        const val2 = normalizeAmount(rows[i][amountColumns[1].col]);

        if ((val1 !== 0 && val2 === 0) || (val1 === 0 && val2 !== 0)) {
          exclusivePattern++;
        } else if (val1 !== 0 && val2 !== 0) {
          bothHaveValue++;
        }
      }

      console.log(`[데이터 감지] 금액 컬럼 패턴: 상호배타=${exclusivePattern}, 동시값=${bothHaveValue}`);

      // 상호 배타적 패턴이 많으면 출금/입금 분리로 판단
      if (exclusivePattern > bothHaveValue * 2 && exclusivePattern >= 5) {
        mapping.push({ source: amountColumns[0].col, target: 'withdrawal' });
        mapping.push({ source: amountColumns[1].col, target: 'deposit' });
        console.log(`[데이터 감지] ✓ 금액 컬럼 (상호배타 패턴 → 출금/입금): "${amountColumns[0].col}", "${amountColumns[1].col}"`);
      } else {
        // 첫 번째 컬럼만 사용
        mapping.push({ source: amountColumns[0].col, target: 'amount' });
        console.log(`[데이터 감지] ✓ 금액 컬럼: "${amountColumns[0].col}" (${Math.round(amountColumns[0].ratio * 100)}%)`);
      }
    } else if (!foundWithdrawal && !foundDeposit) {
      // 단일 금액 컬럼
      mapping.push({ source: amountColumns[0].col, target: 'amount' });
      console.log(`[데이터 감지] ✓ 금액 컬럼: "${amountColumns[0].col}" (${Math.round(amountColumns[0].ratio * 100)}%)`);
    }
  } else if (amountColumns.length === 1) {
    mapping.push({ source: amountColumns[0].col, target: 'amount' });
    console.log(`[데이터 감지] ✓ 금액 컬럼: "${amountColumns[0].col}" (${Math.round(amountColumns[0].ratio * 100)}%)`);
  }

  // 텍스트 컬럼 찾기 (가맹점/메모)
  const textColumns: Array<{ col: string; ratio: number; avgLen: number; hasKorean: boolean }> = [];

  for (const header of headers) {
    if (!header || header === bestDateCol) continue;
    // 이미 금액으로 매핑된 컬럼 제외
    if (amountColumns.some(a => a.col === header)) continue;

    const stats = columnStats[header];
    const textRatio = stats.texts / validRows;

    if (textRatio >= minRatio) {
      const avgLen = stats.texts > 0 ? stats.avgTextLen / stats.texts : 0;
      textColumns.push({ col: header, ratio: textRatio, avgLen, hasKorean: stats.hasKorean });
    }
  }

  // 텍스트 컬럼 정렬: 한글 포함 > 평균 길이 > 비율
  textColumns.sort((a, b) => {
    if (a.hasKorean !== b.hasKorean) return b.hasKorean ? 1 : -1;
    if (Math.abs(a.avgLen - b.avgLen) > 5) return b.avgLen - a.avgLen;
    return b.ratio - a.ratio;
  });

  // 가맹점 컬럼 (첫 번째 텍스트)
  if (textColumns.length >= 1) {
    mapping.push({ source: textColumns[0].col, target: 'merchant' });
    console.log(`[데이터 감지] ✓ 가맹점 컬럼: "${textColumns[0].col}" (${Math.round(textColumns[0].ratio * 100)}%, 평균길이=${Math.round(textColumns[0].avgLen)})`);
  }

  // 메모 컬럼 (두 번째 텍스트)
  if (textColumns.length >= 2) {
    mapping.push({ source: textColumns[1].col, target: 'memo' });
    console.log(`[데이터 감지] ✓ 메모 컬럼: "${textColumns[1].col}" (${Math.round(textColumns[1].ratio * 100)}%)`);
  }

  console.log(`[데이터 감지] 완료: ${mapping.length}개 매핑 생성`);
  return mapping;
}

/**
 * 컬럼명 기반 자동 매핑 추천
 * 다양한 은행/카드사 형식 지원
 */
export function suggestColumnMapping(headers: string[], rows?: ParsedRow[]): ColumnMapping[] {
  const mapping: ColumnMapping[] = [];

  // 날짜 관련 패턴 (다양한 은행/카드사 지원)
  const datePatterns = [
    '날짜', '거래일자', '사용일자', '승인일시', '일자', '거래일', '이용일', '이용일자',
    '승인일자', '승인일', '거래월일', '결제일', '결제일자', '매출일', '매출일자',
    '처리일', '처리일자', '발생일', '발생일자', '이용년월일',
    'date', 'transaction date', 'trans date', 'posting date'
  ];

  // 시간 관련 패턴 (별도 컬럼인 경우)
  const timePatterns = [
    '거래시간', '이용시간', '승인시간', '시간', '처리시간', '발생시간',
    'time', 'transaction time', 'trans time'
  ];

  // 금액 관련 패턴
  const amountPatterns = [
    '이용금액', '승인금액', '청구금액', '공급가액', '매출금액', '출금', '입금', '금액',
    '거래금액', '결제금액', '지출금액', '수입금액', '원금', '이용액', '출금액', '입금액',
    '내실금액', '청구예정금액', '결제예정금액', '실결제금액', '국내이용금액', '해외이용금액',
    'amount', 'price', 'debit', 'credit', 'withdrawal', 'deposit'
  ];

  // 금액에서 제외할 패턴
  const excludeAmountPatterns = [
    '혜택금액', '수수료', '포인트', '마일리지', '할인', '적립', '캐시백',
    '잔액', '누적', '총액', '합계', '수수료금액'
  ];

  // 가맹점/내역 관련 패턴
  const merchantPatterns = [
    '가맹점명', '사용처', '상호', '가맹점', '내용', '이용가맹점', '가맹점(상호)',
    '거래처', '거래처명', '결제처', '매출처', '업소명', '판매처', '승인가맹점',
    '이용처', '상호명', '상점명', '점포명', '매장명',
    'merchant', 'store', 'vendor', 'payee', 'description'
  ];

  // 메모/적요 관련 패턴
  const memoPatterns = [
    '메모', '비고', '상세', '적요', '내역', '상세내역', '거래내역', '이용내역',
    '적요내용', '비고란', '참고', '추가정보', '거래적요',
    'note', 'memo', 'remark', 'comment'
  ];

  // 계좌/카드 관련 패턴
  const accountPatterns = [
    '카드명', '카드구분', '계좌', '계좌번호', '카드번호', '카드종류', '결제카드',
    '출금계좌', '입금계좌', '거래계좌', '은행명', '금융기관',
    'account', 'card', 'card number', 'account number'
  ];

  // 거래유형 관련 패턴
  const typePatterns = [
    '취소여부', '승인구분', '거래구분', '입출금구분', '거래유형', '거래종류',
    '입출구분', '차대구분', '승인취소', '취소', '구분',
    'type', 'transaction type', 'trans type'
  ];

  for (const header of headers) {
    // 줄바꿈 제거 (예: '이용\n일자' -> '이용일자')
    const cleanedHeader = header.replace(/[\n\r]/g, '');
    const lowerHeader = cleanedHeader.toLowerCase();

    // 범용 출금/입금 컬럼 감지 (모든 은행/카드사 지원)
    // 출금 키워드: 출금, 지출, 인출, 차변, debit, withdrawal, 支出, 出金
    // 입금 키워드: 입금, 수입, 예금, 대변, credit, deposit, 收入, 入金
    const withdrawalKeywords = [
      '출금', '지출', '인출', '차변', '출금액', '지출액', '출금(원)', '지출금액',
      'debit', 'withdrawal', 'withdraw', 'payment', 'expense',
      '支出', '出金', '取款', '支払', '引出'
    ];
    const depositKeywords = [
      '입금', '수입', '예금', '대변', '입금액', '수입액', '입금(원)', '수입금액',
      'credit', 'deposit', 'income', 'receipt',
      '收入', '入金', '存款', '入金', '預入'
    ];

    // 출금 컬럼 체크
    const isWithdrawal = withdrawalKeywords.some(kw =>
      lowerHeader.includes(kw.toLowerCase()) || cleanedHeader.includes(kw)
    );
    // 입금 컬럼 체크
    const isDeposit = depositKeywords.some(kw =>
      lowerHeader.includes(kw.toLowerCase()) || cleanedHeader.includes(kw)
    );

    if (isWithdrawal && !isDeposit) {
      console.log(`[컬럼 매핑] ✅ 출금 컬럼 매핑: "${cleanedHeader}" → withdrawal`);
      mapping.push({ source: cleanedHeader, target: 'withdrawal' });
      continue;
    }
    if (isDeposit && !isWithdrawal) {
      console.log(`[컬럼 매핑] ✅ 입금 컬럼 매핑: "${cleanedHeader}" → deposit`);
      mapping.push({ source: cleanedHeader, target: 'deposit' });
      continue;
    }

    // 제외할 금액 패턴 체크
    const isExcludedAmount = excludeAmountPatterns.some((p) =>
      lowerHeader.includes(p.toLowerCase())
    );

    if (datePatterns.some((p) => lowerHeader.includes(p.toLowerCase()))) {
      mapping.push({ source: cleanedHeader, target: 'date' });
    } else if (
      timePatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: cleanedHeader, target: 'time' });
    } else if (
      !isExcludedAmount &&
      amountPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: cleanedHeader, target: 'amount' });
    } else if (
      merchantPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: cleanedHeader, target: 'merchant' });
    } else if (
      memoPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: cleanedHeader, target: 'memo' });
    } else if (
      accountPatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: cleanedHeader, target: 'account' });
    } else if (
      typePatterns.some((p) => lowerHeader.includes(p.toLowerCase()))
    ) {
      mapping.push({ source: cleanedHeader, target: 'type' });
    }
  }

  // 가상 헤더인지 확인 (Column1, Column2, ... 형태)
  const isVirtualHeaders = headers.every(h => /^Column\d+$/.test(h));

  // 가상 헤더이거나 헤더 기반 매핑이 부족하면 데이터 기반 자동 감지 시도
  const hasDate = mapping.some(m => m.target === 'date');
  const hasAmount = mapping.some(m => m.target === 'amount' || m.target === 'withdrawal' || m.target === 'deposit');

  if ((isVirtualHeaders || !hasDate || !hasAmount) && rows && rows.length > 0) {
    console.log(`[suggestColumnMapping] 데이터 기반 자동 감지 시도 (가상헤더=${isVirtualHeaders}, 날짜=${hasDate}, 금액=${hasAmount})`);
    const dataBasedMapping = detectColumnTypeFromData(headers, rows);

    if (isVirtualHeaders) {
      // 가상 헤더면 데이터 기반 매핑으로 완전 대체
      console.log('[suggestColumnMapping] 가상 헤더 - 데이터 기반 매핑으로 대체');
      return dataBasedMapping;
    }

    // 부족한 매핑만 추가
    for (const dm of dataBasedMapping) {
      const alreadyMapped = mapping.some(m => m.source === dm.source || m.target === dm.target);
      if (!alreadyMapped) {
        mapping.push(dm);
        console.log(`[suggestColumnMapping] 데이터 기반 매핑 추가: ${dm.source} -> ${dm.target}`);
      }
    }
  }

  console.log(`[suggestColumnMapping] 최종 매핑: ${mapping.length}개`);
  return mapping;
}

/**
 * 시간 문자열 추출 (HH:mm:ss 또는 HH:mm 형식)
 */
export function extractTime(value: any): string | null {
  if (!value) return null;

  const str = String(value).trim();

  // 날짜+시간 형식에서 시간 추출 (예: "2024-01-15 14:30:00" -> "14:30:00")
  if (str.includes(' ')) {
    const timePart = str.split(' ')[1];
    if (timePart) {
      // HH:mm:ss 또는 HH:mm 형식 확인
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timePart)) {
        // HH:mm 형식이면 :00 추가
        if (/^\d{1,2}:\d{2}$/.test(timePart)) {
          return timePart.padStart(5, '0') + ':00';
        }
        return timePart;
      }
    }
  }

  // 시간만 있는 경우 (예: "14:30:00")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    if (/^\d{1,2}:\d{2}$/.test(str)) {
      return str.padStart(5, '0') + ':00';
    }
    return str;
  }

  return null;
}

/**
 * 날짜 문자열을 정규화 (YYYY-MM-DD 형식으로 변환)
 * 다양한 은행/카드사 형식 지원
 */
export function normalizeDate(value: any): string | null {
  if (!value) return null;

  let str = String(value).trim();

  // 날짜+시간 형식에서 날짜만 추출 (예: "2024-01-15 14:30:00" -> "2024-01-15")
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }

  // 1. YYYY-MM-DD 형식 (표준)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. YYYYMMDD 형식
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }

  // 3. YYYY.MM.DD 또는 YYYY/MM/DD 형식
  if (/^\d{4}[./]\d{1,2}[./]\d{1,2}$/.test(str)) {
    const parts = str.split(/[./]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // 4. YY.MM.DD 또는 YY/MM/DD 또는 YY-MM-DD 형식
  if (/^\d{2}[./-]\d{1,2}[./-]\d{1,2}$/.test(str)) {
    const parts = str.split(/[./-]/);
    const yy = parts[0];
    const year = parseInt(yy) >= 70 ? `19${yy}` : `20${yy}`;
    return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // 5. M/D/YY 또는 MM/DD/YY 형식 (미국식)
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const [mm, dd, yy] = str.split('/');
    const year = parseInt(yy) >= 70 ? `19${yy}` : `20${yy}`;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // 6. MM/DD/YYYY 또는 M/D/YYYY 형식
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [mm, dd, yyyy] = str.split('/');
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // 7. DD/MM/YYYY 형식 (유럽식) - 일이 12보다 크면 유럽식으로 간주
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    if (parseInt(parts[0]) > 12) {
      // DD/MM/YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // MM/DD/YYYY
    return `${parts[2]}-${parts[0]}-${parts[1]}`;
  }

  // 8. YYYY년 MM월 DD일 형식 (한국어)
  const koreanMatch = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    return `${koreanMatch[1]}-${koreanMatch[2].padStart(2, '0')}-${koreanMatch[3].padStart(2, '0')}`;
  }

  // 9. M/D/YY 또는 MM/DD/YY 형식 (2자리 연도)
  // 예: 4/23/23 -> 2023-04-23, 12/8/24 -> 2024-12-08
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const [mm, dd, yy] = str.split('/');
    // 2자리 연도를 4자리로 변환 (00~49 = 2000~2049, 50~99 = 1950~1999)
    const yearNum = parseInt(yy);
    const fullYear = yearNum >= 50 ? 1900 + yearNum : 2000 + yearNum;
    return `${fullYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // 10. M/D 또는 MM/DD 형식 (연도 없음 - 현재 연도 사용)
  if (/^\d{1,2}\/\d{1,2}$/.test(str)) {
    const [mm, dd] = str.split('/');
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // 10. MM월 DD일 형식 (연도 없음 - 현재 연도 사용)
  const koreanNoYearMatch = str.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanNoYearMatch) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${koreanNoYearMatch[1].padStart(2, '0')}-${koreanNoYearMatch[2].padStart(2, '0')}`;
  }

  // 10. DD-MMM-YYYY 또는 DD-MMM-YY 형식 (예: 15-Jan-2024, 15-Jan-24)
  const monthNames: { [key: string]: string } = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    // 일본어 월 (1月, 2月, ...)은 별도 처리
  };
  const engMatch = str.match(/(\d{1,2})-([a-zA-Z]{3})-(\d{2,4})/i);
  if (engMatch) {
    const month = monthNames[engMatch[2].toLowerCase()];
    if (month) {
      let year = engMatch[3];
      if (year.length === 2) {
        year = parseInt(year) >= 50 ? `19${year}` : `20${year}`;
      }
      return `${year}-${month}-${engMatch[1].padStart(2, '0')}`;
    }
  }

  // 10-1. MMM DD, YYYY 형식 (예: Jan 15, 2024)
  const engMatch2 = str.match(/([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (engMatch2) {
    const month = monthNames[engMatch2[1].toLowerCase()];
    if (month) {
      return `${engMatch2[3]}-${month}-${engMatch2[2].padStart(2, '0')}`;
    }
  }

  // 10-2. 일본어 날짜 형식 (令和5年12月15日, 2024年12月15日)
  const jpMatch = str.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (jpMatch) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`;
  }

  // 10-3. 중국어 날짜 형식 (2024年12月15日)
  const cnMatch = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cnMatch) {
    return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
  }

  // 10-4. YYYY/M/D 또는 YYYY-M-D 형식 (패딩 없는 날짜)
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(str)) {
    const parts = str.split(/[./-]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // 10-5. D/M/YYYY 또는 D-M-YYYY 형식 (유럽식, 일이 12 초과시)
  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(str)) {
    const parts = str.split(/[./-]/);
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    // 첫 번째 숫자가 12 초과면 일로 간주 (유럽식)
    if (first > 12) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // 두 번째 숫자가 12 초과면 일로 간주 (미국식)
    if (second > 12) {
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    // 모호한 경우 미국식(MM/DD/YYYY)으로 간주
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }

  // 11. Excel 시리얼 날짜 (숫자만 있고 30000-70000 범위)
  // 30000 ≈ 1982년, 70000 ≈ 2091년
  const numValue = parseFloat(str);
  if (!isNaN(numValue) && numValue >= 30000 && numValue <= 70000) {
    // Excel 시리얼 날짜를 JavaScript 날짜로 변환
    const excelEpoch = new Date(1899, 11, 30); // Excel 기준일
    const jsDate = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
    return format(jsDate, 'yyyy-MM-dd');
  }

  // 12. date-fns로 파싱 시도
  const formats = [
    'yyyy-MM-dd',
    'yyyy.MM.dd',
    'yyyy/MM/dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yy.MM.dd',
    'dd-MM-yyyy',
    'yyyy-M-d',
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
 * 다양한 통화/숫자 형식 지원
 */
export function normalizeAmount(value: any): number {
  if (value === null || value === undefined || value === '') return 0;

  let str = String(value).trim();

  // 괄호로 감싸진 음수 처리 (예: (1,000) -> -1000)
  const isNegativeParens = /^\([\d,.\s]+\)$/.test(str);
  if (isNegativeParens) {
    str = '-' + str.replace(/[()]/g, '');
  }

  // 통화 기호 및 단위 제거
  str = str
    .replace(/[,\s]/g, '') // 쉼표와 공백 제거
    .replace(/^\+/, '') // + 기호 제거 (예: +1000 -> 1000)
    .replace(/원$/, '') // "원" 제거
    .replace(/^₩/, '') // 원화 기호 제거
    .replace(/^\$/, '') // 달러 기호 제거
    .replace(/^€/, '') // 유로 기호 제거
    .replace(/^¥/, '') // 엔화 기호 제거
    .replace(/^£/, '') // 파운드 기호 제거
    .replace(/^KRW\s*/i, '') // KRW 제거
    .replace(/^USD\s*/i, '') // USD 제거
    .replace(/^"/, '')  // 현대카드 형식: 앞의 따옴표 제거
    .replace(/"$/, '')  // 현대카드 형식: 뒤의 따옴표 제거
    .replace(/CR$|DR$/i, '') // 대변/차변 표시 제거
    .trim();

  // 빈 문자열이면 0 반환
  if (str === '' || str === '-') return 0;

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
  // 1. typeHint가 있으면 우선 사용 (가장 높은 우선순위)
  if (typeHint) {
    const lower = typeHint.toLowerCase();
    // 입금/수입 패턴 먼저 체크 (은행 통장내역의 "입금" 컬럼)
    if (lower.includes('입금') || lower.includes('수입') || lower.includes('income')) {
      console.log(`[inferTransactionType] typeHint=${typeHint} -> income`);
      return 'income';
    }
    if (lower.includes('출금') || lower.includes('지출') || lower.includes('expense')) {
      console.log(`[inferTransactionType] typeHint=${typeHint} -> expense`);
      return 'expense';
    }
  }

  // 2. columnName 힌트 (컬럼명으로 판단)
  if (columnName) {
    const lower = columnName.toLowerCase();
    // 입금 컬럼이면 수입
    if (lower.includes('입금') || lower.includes('수입')) {
      console.log(`[inferTransactionType] columnName=${columnName} -> income`);
      return 'income';
    }
    // 출금 컬럼이면 지출
    if (lower.includes('출금') || lower.includes('지출')) {
      console.log(`[inferTransactionType] columnName=${columnName} -> expense`);
      return 'expense';
    }

    // 신용카드 컬럼: 양수=지출, 음수=수입(환불)
    if (lower.includes('이용금액') || lower.includes('내실금액') || lower.includes('청구금액')) {
      return amount >= 0 ? 'expense' : 'income';
    }
  }

  // 3. 금액 부호로 판단 (은행 통장: 양수=입금/수입, 음수=출금/지출)
  // 주의: 카드 명세서는 보통 양수가 지출이므로 columnName이 없으면 기본=지출
  if (amount < 0) return 'expense';

  // 4. 기본값 = 지출 (카드 명세서 기준)
  return 'expense';
}

/**
 * 매핑을 적용하여 거래를 정규화
 */
export interface NormalizedTransaction {
  date: string;
  time?: string; // HH:mm:ss 형식
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

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
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
          // 날짜 컬럼에서 시간도 함께 추출 (예: "2024-01-15 14:30:00")
          const timeFromDate = extractTime(value);
          if (timeFromDate && !normalized.time) {
            normalized.time = timeFromDate;
          }
          break;
        case 'time':
          // 별도 시간 컬럼 처리
          const timeValue = extractTime(value);
          if (timeValue) {
            normalized.time = timeValue;
          }
          break;
        case 'withdrawal':
          // 신한은행 "출금(원)" 전용 처리
          console.log(`[applyMapping] withdrawal 처리: value="${value}"`);
          const withdrawalAmount = normalizeAmount(value);
          console.log(`[applyMapping] → 정규화된 출금금액: ${withdrawalAmount}`);
          if (withdrawalAmount !== 0) {
            출금금액 = withdrawalAmount;
            typeHint = '출금';
            amountColumnName = map.source;
            console.log(`[applyMapping] ✅ 출금 설정: ${출금금액}원`);
          }
          break;
        case 'deposit':
          // 신한은행 "입금(원)" 전용 처리
          console.log(`[applyMapping] deposit 처리: value="${value}"`);
          const depositAmount = normalizeAmount(value);
          console.log(`[applyMapping] → 정규화된 입금금액: ${depositAmount}`);
          if (depositAmount !== 0) {
            입금금액 = depositAmount;
            typeHint = '입금';
            amountColumnName = map.source;
            console.log(`[applyMapping] ✅ 입금 설정: ${입금금액}원`);
          }
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
    console.log(`[applyMapping] 행 ${rowIndex} - 출금: ${출금금액}, 입금: ${입금금액}`);
    if (출금금액 !== 0 || 입금금액 !== 0) {
      normalized.amount = 출금금액 !== 0 ? 출금금액 : 입금금액;
      if (!typeHint) {
        typeHint = 출금금액 !== 0 ? '출금' : '입금';
      }
      console.log(`[applyMapping] → 최종 금액: ${normalized.amount}, typeHint: ${typeHint}`);
    }

    // 필수 필드 검증
    if (!normalized.date || normalized.amount === undefined || normalized.amount === 0) {
      console.log(`[applyMapping] 스킵 (필수필드 누락):`, { date: normalized.date, amount: normalized.amount, 출금금액, 입금금액 });
      continue;
    }

    normalized.type = inferTransactionType(normalized.amount, typeHint, amountColumnName);
    console.log(`[applyMapping] 행 ${rowIndex} - 타입 결정: ${normalized.type} (typeHint: ${typeHint})`);

    // 타입 결정 후 금액을 절대값으로 변환
    normalized.amount = Math.abs(normalized.amount);

    // 디버깅 로그 (입금 거래)
    if (normalized.type === 'income') {
      console.log(`[applyMapping] ✅ 입금 거래 생성: ${normalized.date} / ${normalized.merchant || normalized.memo} / ${normalized.amount}원`);
    } else {
      console.log(`[applyMapping] 💰 출금 거래 생성: ${normalized.date} / ${normalized.merchant || normalized.memo} / ${normalized.amount}원`);
    }

    result.push(normalized as NormalizedTransaction);
  }

  console.log(`[applyMapping] 완료: ${result.length}개 거래 생성`);
  return result;
}

/**
 * 중복 거래 제거
 * @param transactions 정규화된 거래 목록
 * @param strictMode 엄격 모드 (true: 날짜+시간+금액만, false: 날짜+시간+가맹점+금액)
 * @returns 중복 제거된 거래 목록
 *
 * 🔧 v1.2 개선: 시간(time)을 중복 체크 키에 포함
 * - 같은 날, 같은 가맹점, 같은 금액이어도 시간이 다르면 별개 거래로 처리
 * - 예: 스타벅스 아침 5,500원 + 스타벅스 저녁 5,500원 = 2건 (중복 아님)
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

    // 시간 정보 (없으면 빈 문자열 - 시간 없는 거래끼리는 기존 로직대로 비교)
    const timeKey = tx.time || '';

    if (strictMode) {
      // 엄격 모드: 날짜 + 시간 + 금액만으로 중복 체크
      key = `${tx.date}|${timeKey}|${tx.amount}`;
    } else {
      // 기본 모드: 날짜 + 시간 + 가맹점명(소문자, 공백제거) + 금액
      const merchantKey = (tx.merchant || tx.memo || '').toLowerCase().replace(/\s+/g, '');
      key = `${tx.date}|${timeKey}|${merchantKey}|${tx.amount}`;
    }

    if (seen.has(key)) {
      duplicateCount++;
      console.log(`[중복 제거] 스킵: ${tx.date} ${tx.time || ''} / ${tx.merchant || tx.memo} / ${tx.amount}`);
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
