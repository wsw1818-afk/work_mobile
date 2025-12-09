const XLSX = require('xlsx');
const fs = require('fs');

// Excel 파일 읽기
const buffer = fs.readFileSync('D:/OneDrive/코드작업/카카오톡 받은 파일/신한은행_거래내역조회_20250924132835.xls');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const allRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: false });

console.log('=== 헤더 검색 ===');

// 헤더 찾기 (범용 키워드 기반)
const dateKeywords = ['일자', '일시', '날짜', '이용일', '거래일'];
const amountKeywords = ['금액', '출금', '입금', '이용금액', '지출', '수입'];

let headerRowIndex = -1;

for (let i = 0; i < Math.min(allRows.length, 50); i++) {
  const row = allRows[i];
  if (!row) continue;

  const cleanedCells = row.map(cell => String(cell || '').replace(/[\n\r]/g, '').trim().toLowerCase());

  const hasDate = dateKeywords.some(keyword =>
    cleanedCells.some(cell => cell.includes(keyword.toLowerCase()))
  );

  const hasAmount = amountKeywords.some(keyword =>
    cleanedCells.some(cell => cell.includes(keyword.toLowerCase()))
  );

  if (hasDate && hasAmount) {
    console.log(`헤더 발견 (행 ${i + 1}):`, row.filter(c => c).join(' | '));
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) {
  console.log('❌ 헤더를 찾을 수 없습니다.');
  process.exit(1);
}

// 헤더 파싱
const headers = allRows[headerRowIndex].map(h => String(h || '').replace(/[\n\r]/g, '').trim());
console.log('\n=== 파싱된 헤더 ===');
headers.forEach((h, i) => h && console.log(i + ':', h));

// 컬럼 매핑 (신한은행 전용)
const mapping = [];
console.log('\n=== 컬럼 매핑 ===');
for (const header of headers) {
  if (header === '출금(원)' || header === '출금') {
    mapping.push({ source: header, target: 'withdrawal' });
    console.log('✅', header, '-> withdrawal');
  } else if (header === '입금(원)' || header === '입금') {
    mapping.push({ source: header, target: 'deposit' });
    console.log('✅', header, '-> deposit');
  } else if (header === '거래일자') {
    mapping.push({ source: header, target: 'date' });
  } else if (header === '내용') {
    mapping.push({ source: header, target: 'merchant' });
  }
}

// 데이터 행 파싱
const dataRows = allRows.slice(headerRowIndex + 1);
console.log('\n=== 거래 파싱 (처음 10개) ===');

let incomeCount = 0;
let expenseCount = 0;

for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
  const row = dataRows[i];
  if (!row) continue;

  const obj = {};
  headers.forEach((header, idx) => {
    if (header) obj[header] = row[idx] || null;
  });

  let 출금금액 = 0;
  let 입금금액 = 0;
  let typeHint = '';

  // 출금(원) 처리
  if (obj['출금(원)']) {
    const val = String(obj['출금(원)']).replace(/,/g, '').trim();
    if (val && val !== '') {
      출금금액 = parseFloat(val);
      typeHint = '출금';
    }
  }

  // 입금(원) 처리
  if (obj['입금(원)']) {
    const val = String(obj['입금(원)']).replace(/,/g, '').trim();
    if (val && val !== '') {
      입금금액 = parseFloat(val);
      typeHint = '입금';
    }
  }

  const amount = 출금금액 !== 0 ? 출금금액 : 입금금액;
  const type = typeHint === '입금' ? 'income' : 'expense';

  if (amount !== 0) {
    console.log((i+1) + '.', obj['거래일자'], '|', type, '|', amount + '원', '|', obj['내용']);
    if (type === 'income') incomeCount++;
    else expenseCount++;
  }
}

// 전체 통계
let totalIncome = 0;
let totalExpense = 0;

for (const row of dataRows) {
  if (!row) continue;

  const obj = {};
  headers.forEach((header, idx) => {
    if (header) obj[header] = row[idx] || null;
  });

  let 출금금액 = 0;
  let 입금금액 = 0;

  if (obj['출금(원)']) {
    const val = String(obj['출금(원)']).replace(/,/g, '').trim();
    if (val && val !== '') 출금금액 = parseFloat(val);
  }

  if (obj['입금(원)']) {
    const val = String(obj['입금(원)']).replace(/,/g, '').trim();
    if (val && val !== '') 입금금액 = parseFloat(val);
  }

  const amount = 출금금액 !== 0 ? 출금금액 : 입금금액;
  const type = (입금금액 !== 0) ? 'income' : 'expense';

  if (amount !== 0) {
    if (type === 'income') totalIncome++;
    else totalExpense++;
  }
}

console.log('\n=== 최종 통계 ===');
console.log('총 거래 수:', totalIncome + totalExpense);
console.log('수입(income):', totalIncome);
console.log('지출(expense):', totalExpense);
