const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Excel 파일 읽기
console.log('=== Excel 파일 파싱 시작 ===\n');
const buffer = fs.readFileSync('D:/OneDrive/코드작업/카카오톡 받은 파일/신한은행_거래내역조회_20250924132835.xls');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const allRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: false });

// 헤더 찾기
let headerRowIndex = -1;
const dateKeywords = ['일자', '거래일'];
const amountKeywords = ['금액', '출금', '입금'];

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
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) {
  console.error('❌ 헤더를 찾을 수 없습니다.');
  process.exit(1);
}

// 헤더 파싱
const headers = allRows[headerRowIndex].map(h => String(h || '').replace(/[\n\r]/g, '').trim());
console.log('헤더:', headers.filter(h => h).join(' | '));

// 컬럼 인덱스 찾기
const dateIdx = headers.findIndex(h => h === '거래일자');
const withdrawalIdx = headers.findIndex(h => h === '출금(원)');
const depositIdx = headers.findIndex(h => h === '입금(원)');
const memoIdx = headers.findIndex(h => h === '내용');

console.log('\n=== 컬럼 매핑 ===');
console.log('거래일자:', dateIdx);
console.log('출금(원):', withdrawalIdx, '-> withdrawal');
console.log('입금(원):', depositIdx, '-> deposit');
console.log('내용:', memoIdx);

// 데이터 파싱
const dataRows = allRows.slice(headerRowIndex + 1);
const transactions = [];

for (const row of dataRows) {
  if (!row || row.length < 5) continue;

  const date = row[dateIdx];
  const withdrawal = row[withdrawalIdx];
  const deposit = row[depositIdx];
  const memo = row[memoIdx];

  let amount = 0;
  let type = 'expense';

  // 출금 처리
  if (withdrawal && String(withdrawal).trim() !== '') {
    amount = parseFloat(String(withdrawal).replace(/,/g, ''));
    type = 'expense';
  }

  // 입금 처리
  if (deposit && String(deposit).trim() !== '') {
    amount = parseFloat(String(deposit).replace(/,/g, ''));
    type = 'income';
  }

  if (date && amount > 0) {
    transactions.push({ date, amount, type, memo: memo || '' });
  }
}

// 통계
const incomeTransactions = transactions.filter(t => t.type === 'income');
const expenseTransactions = transactions.filter(t => t.type === 'expense');

console.log('\n=== 파싱 완료 ===');
console.log('총 거래 수:', transactions.length);
console.log('수입(income):', incomeTransactions.length);
console.log('지출(expense):', expenseTransactions.length);

// 입금 거래 샘플
console.log('\n=== 입금 거래 (처음 10개) ===');
incomeTransactions.slice(0, 10).forEach((tx, i) => {
  console.log(`${i+1}. ${tx.date} | ${tx.amount.toLocaleString()}원 | ${tx.memo}`);
});

// JSON으로 저장 (수동 확인용)
const result = {
  total: transactions.length,
  income: incomeTransactions.length,
  expense: expenseTransactions.length,
  incomeSamples: incomeTransactions.slice(0, 10)
};

fs.writeFileSync(
  path.join(__dirname, 'test-result.json'),
  JSON.stringify(result, null, 2),
  'utf8'
);

console.log('\n✅ 결과가 test-result.json에 저장되었습니다.');
