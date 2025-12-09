// 신한카드 파일 전체 파서 테스트 (다중 시트)
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const folder = 'D:/OneDrive/코드작업/카카오톡 받은 파일';
const files = fs.readdirSync(folder).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

// 신용카드 파일
const targetFile = files.find(f => f.includes('25년9월') && f.includes('신용카드') && !f.includes('(1)'));

console.log('=== 신한카드 파일 파싱 테스트 ===');
console.log('파일:', targetFile);

const buffer = fs.readFileSync(path.join(folder, targetFile));
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('시트 수:', workbook.SheetNames.length);

// excel-parser.ts의 로직 시뮬레이션
const sectionMarkers = ['이용일자별', '거래내역', '카드사용내역', '이용상세내역'];
let targetSheet = null;
let targetSheetName = workbook.SheetNames[0];

// 모든 시트를 확인하여 섹션 마커가 있는 시트 찾기
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  // 섹션 마커 확인
  let hasMarker = false;
  for (const row of rows) {
    if (!row) continue;
    for (const cell of row) {
      const str = String(cell || '');
      for (const marker of sectionMarkers) {
        if (str.includes(marker)) {
          console.log('[섹션 마커 발견] 시트:', sheetName, '마커:', marker, '셀:', str.slice(0, 50));
          hasMarker = true;
          break;
        }
      }
      if (hasMarker) break;
    }
    if (hasMarker) break;
  }

  if (hasMarker) {
    console.log('→ 타겟 시트:', sheetName);
    targetSheet = sheet;
    targetSheetName = sheetName;
    break;
  }
}

if (!targetSheet) {
  console.log('❌ 섹션 마커 없음, 첫 번째 시트 사용');
  targetSheet = workbook.Sheets[workbook.SheetNames[0]];
}

// 타겟 시트에서 데이터 파싱
console.log('\n=== 타겟 시트:', targetSheetName, '===');

const allRows = XLSX.utils.sheet_to_json(targetSheet, {
  header: 1,
  defval: null,
  raw: false,
});

console.log('총 행 수:', allRows.length);

// 헤더 찾기
const dateKeywords = ['일자', '일시', '날짜', '이용일', '거래일'];
const amountKeywords = ['금액', '출금', '입금', '이용금액', '지출', '수입'];

let headerRowIndex = -1;
let sectionStartIndex = -1;

// 섹션 마커 찾기
for (let i = 0; i < Math.min(allRows.length, 50); i++) {
  const row = allRows[i];
  if (!row) continue;

  const hasMarker = row.some(function(cell) {
    const str = String(cell || '');
    return sectionMarkers.some(function(marker) {
      return str.includes(marker);
    });
  });

  if (hasMarker) {
    console.log('섹션 마커 발견 (행 ' + (i + 1) + ')');
    sectionStartIndex = i;

    const markerText = row.find(function(cell) {
      const str = String(cell || '');
      return sectionMarkers.some(function(marker) {
        return str.includes(marker);
      });
    });

    if (String(markerText || '').includes('이용상세내역')) {
      headerRowIndex = i + 3; // 하나카드: 마커 + 3행
      console.log('하나카드 형식 감지, 헤더 행:', headerRowIndex + 1);
    } else {
      headerRowIndex = i + 1; // 신한카드: 마커 + 1행
      console.log('신한카드 형식 감지, 헤더 행:', headerRowIndex + 1);
    }
    break;
  }
}

// 섹션 마커가 없으면 키워드 기반 검색
if (sectionStartIndex < 0) {
  console.log('섹션 마커 없음, 키워드 기반 검색');

  for (let i = 0; i < Math.min(allRows.length, 50); i++) {
    const row = allRows[i];
    if (!row) continue;

    const cleanedCells = row.map(function(cell) {
      return String(cell || '').replace(/[\n\r]/g, '').trim().toLowerCase();
    });

    const hasDate = dateKeywords.some(function(keyword) {
      return cleanedCells.some(function(cell) {
        return cell.includes(keyword.toLowerCase());
      });
    });

    const hasAmount = amountKeywords.some(function(keyword) {
      return cleanedCells.some(function(cell) {
        return cell.includes(keyword.toLowerCase());
      });
    });

    if (hasDate && hasAmount) {
      console.log('헤더 발견 (행 ' + (i + 1) + ')');
      headerRowIndex = i;
      break;
    }
  }
}

if (headerRowIndex === -1) {
  console.log('❌ 헤더를 찾을 수 없습니다.');
  process.exit(1);
}

// 헤더 파싱
const headers = allRows[headerRowIndex].map(function(h) {
  return String(h || '').replace(/[\n\r]/g, '').trim();
});
console.log('\n=== 파싱된 헤더 ===');
headers.filter(function(h) { return h; }).forEach(function(h, i) {
  console.log(i + ':', h);
});

// 데이터 행 파싱
const dataRows = allRows.slice(headerRowIndex + 1);
console.log('\n데이터 행 수:', dataRows.length);

// 날짜 정규화
function normalizeDate(value) {
  if (!value) return null;
  let str = String(value).trim();

  // M/D/YY 형식
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const parts = str.split('/');
    const year = parseInt(parts[2]) >= 70 ? '19' + parts[2] : '20' + parts[2];
    return year + '-' + parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0');
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  return null;
}

// 금액 정규화
function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  let str = String(value).trim().replace(/,/g, '').replace(/원$/, '').trim();
  if (str === '' || str === '-') return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// 거래 추출
const transactions = [];

for (const row of dataRows) {
  if (!row) continue;

  const obj = {};
  headers.forEach(function(header, idx) {
    if (header) obj[header] = row[idx] || null;
  });

  // 날짜 컬럼 찾기
  let date = null;
  for (const key of Object.keys(obj)) {
    if (key.includes('일자') || key.includes('날짜')) {
      date = normalizeDate(obj[key]);
      if (date) break;
    }
  }

  if (!date) continue;

  // 금액 컬럼 찾기
  let amount = 0;
  for (const key of Object.keys(obj)) {
    if (key.includes('금액') || key.includes('원금')) {
      const val = normalizeAmount(obj[key]);
      if (val > 0) {
        amount = val;
        break;
      }
    }
  }

  if (amount === 0) continue;

  // 가맹점 찾기
  let merchant = '';
  for (const key of Object.keys(obj)) {
    if (key.includes('가맹점') || key.includes('상호') || key.includes('내용')) {
      merchant = String(obj[key] || '').trim();
      if (merchant) break;
    }
  }

  transactions.push({
    date: date,
    amount: amount,
    type: 'expense',
    merchant: merchant
  });
}

console.log('\n=== 파싱 결과 ===');
console.log('총 거래 수:', transactions.length);

// 샘플 출력
console.log('\n=== 거래 샘플 (처음 10개) ===');
transactions.slice(0, 10).forEach(function(tx, i) {
  console.log((i + 1) + '.', tx.date, '|', tx.amount.toLocaleString() + '원', '|', tx.merchant);
});

console.log('\n✅ 테스트 완료');
