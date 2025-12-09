// 하나카드 파일 파서 테스트
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 파일 목록 가져오기
const folder = 'D:/OneDrive/코드작업/카카오톡 받은 파일';
const files = fs.readdirSync(folder).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

console.log('=== 사용 가능한 Excel 파일 ===');
files.forEach((f, i) => console.log(i + 1 + '.', f));

// 신용카드 파일 찾기 (25년 월별)
const hanaFile = files.find(f => f.includes('25년9월') && f.includes('신용카드') && !f.includes('(1)'));

if (!hanaFile) {
  console.log('\n❌ 하나카드 파일을 찾을 수 없습니다.');
  process.exit(1);
}

console.log('\n=== 하나카드 파일 파싱 테스트 ===');
console.log('파일:', hanaFile);

const buffer = fs.readFileSync(path.join(folder, hanaFile));
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('\n시트 목록:', workbook.SheetNames);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const allRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: false });

console.log('총 행 수:', allRows.length);

// 처음 20행 출력 (헤더 찾기)
console.log('\n=== 처음 20행 (헤더 탐색) ===');
for (let i = 0; i < Math.min(20, allRows.length); i++) {
  const row = allRows[i];
  if (!row) continue;
  const nonEmpty = row.filter(c => c !== null && c !== '');
  if (nonEmpty.length > 0) {
    console.log('행', (i + 1) + ':', nonEmpty.slice(0, 8).join(' | '));
  }
}

// 섹션 마커 찾기
console.log('\n=== 섹션 마커 검색 ===');
const sectionMarkers = ['이용일자별', '거래내역', '카드사용내역', '이용상세내역'];

for (let i = 0; i < Math.min(50, allRows.length); i++) {
  const row = allRows[i];
  if (!row) continue;

  const rowText = row.map(c => String(c || '')).join(' ');
  for (const marker of sectionMarkers) {
    if (rowText.includes(marker)) {
      console.log('행', (i + 1) + ': [' + marker + '] 발견 -', row.filter(c => c).slice(0, 5).join(' | '));
    }
  }
}

// 헤더 키워드로 찾기
console.log('\n=== 헤더 키워드 검색 ===');
const dateKeywords = ['일자', '일시', '날짜', '이용일', '거래일'];
const amountKeywords = ['금액', '출금', '입금', '이용금액', '지출', '수입'];

let headerRowIndex = -1;

for (let i = 0; i < Math.min(50, allRows.length); i++) {
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
    console.log('헤더 발견 (행 ' + (i + 1) + '):', row.filter(function(c) { return c; }).join(' | '));
    headerRowIndex = i;
    break;
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
headers.forEach(function(h, i) {
  if (h) console.log(i + ':', h);
});

// 데이터 행 파싱
const dataRows = allRows.slice(headerRowIndex + 1);
console.log('\n=== 데이터 행 샘플 (처음 5개) ===');

for (let i = 0; i < Math.min(5, dataRows.length); i++) {
  const row = dataRows[i];
  if (!row) continue;

  const nonEmpty = row.filter(function(c) { return c !== null && c !== ''; });
  if (nonEmpty.length > 0) {
    console.log('행 ' + (i + 1) + ':', nonEmpty.slice(0, 6).join(' | '));
  }
}

console.log('\n✅ 테스트 완료');
