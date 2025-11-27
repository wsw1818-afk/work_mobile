// 데이터베이스 마이그레이션 테스트 스크립트
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 데이터베이스 마이그레이션 테스트 ===\n');

// database.ts 파일 읽기
const dbPath = path.join(__dirname, 'lib', 'db', 'database.ts');
const dbContent = fs.readFileSync(dbPath, 'utf-8');

console.log('✓ database.ts 파일 읽기 성공\n');

// 마이그레이션 코드 확인
const hasMigration = dbContent.includes('데이터베이스 마이그레이션');
const hasExcludeFromStats = dbContent.includes('excludeFromStats');
const hasIsTransfer = dbContent.includes('isTransfer');

console.log('마이그레이션 코드 체크:');
console.log(`  - 마이그레이션 섹션 존재: ${hasMigration ? '✓' : '✗'}`);
console.log(`  - excludeFromStats 처리: ${hasExcludeFromStats ? '✓' : '✗'}`);
console.log(`  - isTransfer 처리: ${hasIsTransfer ? '✓' : '✗'}`);

// 마이그레이션 로직 상세 확인
const migrationMatch = dbContent.match(/\/\/ 데이터베이스 마이그레이션[\s\S]*?\/\/ 기본 데이터 초기화/);
if (migrationMatch) {
  console.log('\n마이그레이션 코드 발견:');
  console.log('---');
  console.log(migrationMatch[0].substring(0, 500) + '...');
  console.log('---\n');

  // PRAGMA table_info 체크가 있는지 확인
  const hasPragmaCheck = migrationMatch[0].includes('PRAGMA table_info');
  const hasAlterTable = migrationMatch[0].includes('ALTER TABLE');

  console.log('마이그레이션 로직 체크:');
  console.log(`  - PRAGMA table_info 사용: ${hasPragmaCheck ? '✓' : '✗'}`);
  console.log(`  - ALTER TABLE 사용: ${hasAlterTable ? '✓' : '✗'}`);
}

// SQL 쿼리에서 제거된 컬럼 참조 확인
console.log('\nSQL 쿼리 체크:');

// getMonthSummary 함수 확인
const monthSummaryMatch = dbContent.match(/async getMonthSummary[\s\S]*?WHERE[\s\S]*?;/);
if (monthSummaryMatch) {
  const hasExcludeInQuery = monthSummaryMatch[0].includes('excludeFromStats');
  console.log(`  - getMonthSummary에 excludeFromStats 참조: ${hasExcludeInQuery ? '✗ (문제)' : '✓'}`);
}

// getCategoryStats 함수 확인
const categoryStatsMatch = dbContent.match(/async getCategoryStats[\s\S]*?WHERE[\s\S]*?;/);
if (categoryStatsMatch) {
  const hasExcludeInQuery = categoryStatsMatch[0].includes('excludeFromStats');
  console.log(`  - getCategoryStats에 excludeFromStats 참조: ${hasExcludeInQuery ? '✗ (문제)' : '✓'}`);
}

console.log('\n=== 테스트 완료 ===');
console.log('\n예상 결과:');
console.log('  1. 앱 시작 시 PRAGMA table_info로 컬럼 존재 확인');
console.log('  2. excludeFromStats 컬럼이 없으면 자동 추가');
console.log('  3. isTransfer 컬럼이 없으면 자동 추가');
console.log('  4. SQL 쿼리에서 더 이상 해당 컬럼을 WHERE 조건에 사용하지 않음');
