// 모든 시트 내용 확인 테스트
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const folder = 'D:/OneDrive/코드작업/카카오톡 받은 파일';
const files = fs.readdirSync(folder).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

// 신용카드 파일
const targetFile = files.find(f => f.includes('25년9월') && f.includes('신용카드') && !f.includes('(1)'));

console.log('=== 파일:', targetFile, '===\n');

const buffer = fs.readFileSync(path.join(folder, targetFile));
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('시트 목록:', workbook.SheetNames.length + '개');

// 각 시트 내용 확인
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

  console.log('\n=== ' + sheetName + ' (행: ' + rows.length + ') ===');

  // 처음 10행만 출력
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const nonEmpty = row.filter(function(c) { return c !== null && c !== ''; });
    if (nonEmpty.length > 0) {
      console.log('행 ' + (i + 1) + ':', nonEmpty.slice(0, 6).join(' | '));
    }
  }

  // 거래 데이터가 있는지 확인 (헤더 키워드)
  const dateKeywords = ['일자', '일시', '날짜', '이용일', '거래일'];
  const amountKeywords = ['금액', '출금', '입금', '이용금액', '지출', '수입'];

  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const row = rows[i];
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

    if (hasDate || hasAmount) {
      console.log('→ 헤더 후보 발견 (행 ' + (i + 1) + '):', row.filter(function(c) { return c; }).slice(0, 8).join(' | '));
    }
  }
}

console.log('\n✅ 테스트 완료');
