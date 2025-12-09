// 전체 엑셀 파서 흐름 테스트
const XLSX = require('xlsx');
const fs = require('fs');

// excel-parser.ts의 함수들을 직접 구현하여 테스트

// 날짜 정규화
function normalizeDate(value) {
  if (!value) return null;

  let str = String(value).trim();

  // 날짜+시간 형식에서 날짜만 추출
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }

  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // YYYY.MM.DD 형식
  if (/^\d{4}[./]\d{1,2}[./]\d{1,2}$/.test(str)) {
    const parts = str.split(/[./]/);
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  return null;
}

// 금액 정규화
function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return 0;

  let str = String(value).trim()
    .replace(/,/g, '')
    .replace(/원$/, '')
    .replace(/^₩/, '')
    .trim();

  if (str === '' || str === '-') return 0;

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// 테스트 파일 경로
const testFile = 'D:/OneDrive/코드작업/카카오톡 받은 파일/신한은행_거래내역조회_20250924132835.xls';

console.log('=== 전체 엑셀 파서 흐름 테스트 ===\n');

try {
  const buffer = fs.readFileSync(testFile);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: false });

  console.log('파일 로드 성공: ' + allRows.length + '개 행');

  // 헤더 찾기
  const dateKeywords = ['일자', '일시', '날짜', '이용일', '거래일'];
  const amountKeywords = ['금액', '출금', '입금', '이용금액', '지출', '수입'];

  let headerRowIndex = -1;

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
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.log('❌ 헤더를 찾을 수 없습니다.');
    process.exit(1);
  }

  const headers = allRows[headerRowIndex].map(function(h) {
    return String(h || '').replace(/[\n\r]/g, '').trim();
  });
  console.log('헤더 발견 (행 ' + (headerRowIndex + 1) + '): ' + headers.filter(function(h) { return h; }).join(', '));

  // 데이터 행 파싱
  const dataRows = allRows.slice(headerRowIndex + 1);
  const transactions = [];

  for (const row of dataRows) {
    if (!row) continue;

    const obj = {};
    headers.forEach(function(header, idx) {
      if (header) obj[header] = row[idx] || null;
    });

    // 날짜 확인
    const date = normalizeDate(obj['거래일자']);
    if (!date) continue;

    // 출금/입금 금액 처리
    const 출금금액 = normalizeAmount(obj['출금(원)']);
    const 입금금액 = normalizeAmount(obj['입금(원)']);

    if (출금금액 === 0 && 입금금액 === 0) continue;

    let amount, type;
    if (입금금액 !== 0) {
      amount = 입금금액;
      type = 'income';
    } else {
      amount = 출금금액;
      type = 'expense';
    }

    transactions.push({
      date: date,
      amount: amount,
      type: type,
      merchant: obj['내용'] || '',
      time: obj['거래시간'] || null,
    });
  }

  console.log('\n=== 파싱 결과 ===');
  console.log('총 거래 수: ' + transactions.length);

  const incomes = transactions.filter(function(t) { return t.type === 'income'; });
  const expenses = transactions.filter(function(t) { return t.type === 'expense'; });

  console.log('수입(income): ' + incomes.length + '개');
  console.log('지출(expense): ' + expenses.length + '개');

  // 처음 5개 수입 거래 표시
  console.log('\n=== 수입 거래 샘플 (처음 5개) ===');
  incomes.slice(0, 5).forEach(function(t, i) {
    console.log((i+1) + '. ' + t.date + ' | ' + t.amount.toLocaleString() + '원 | ' + t.merchant);
  });

  // 처음 5개 지출 거래 표시
  console.log('\n=== 지출 거래 샘플 (처음 5개) ===');
  expenses.slice(0, 5).forEach(function(t, i) {
    console.log((i+1) + '. ' + t.date + ' | ' + t.amount.toLocaleString() + '원 | ' + t.merchant);
  });

  console.log('\n✅ 테스트 완료');

} catch (error) {
  console.error('❌ 오류:', error.message);
}
