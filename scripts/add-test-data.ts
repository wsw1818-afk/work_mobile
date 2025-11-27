import { database } from '../lib/db/database';

async function addTestData() {
  try {
    console.log('🚀 테스트 데이터 추가 시작...');

    // 1. 계좌 확인 및 추가
    let accounts = await database.getAccounts();
    if (accounts.length === 0) {
      console.log('💳 기본 계좌 추가...');
      await database.addAccount({
        name: '테스트 계좌',
        type: 'checking',
        balance: 1000000,
        color: '#3b82f6',
      });
      accounts = await database.getAccounts();
    }
    const account = accounts[0];
    console.log('✅ 계좌:', account.name);

    // 2. 카테고리 확인 및 추가
    let expenseCategories = await database.getCategories('expense');
    if (expenseCategories.length === 0) {
      console.log('📂 기본 카테고리 추가...');

      // 고정지출 카테고리
      await database.addCategory({
        name: '통신비',
        type: 'expense',
        color: '#ef4444',
        isFixedExpense: true,
        excludeFromStats: false,
      });

      await database.addCategory({
        name: '보험료',
        type: 'expense',
        color: '#f59e0b',
        isFixedExpense: true,
        excludeFromStats: false,
      });

      // 변동지출 카테고리
      await database.addCategory({
        name: '식비',
        type: 'expense',
        color: '#10b981',
        isFixedExpense: false,
        excludeFromStats: false,
      });

      await database.addCategory({
        name: '교통비',
        type: 'expense',
        color: '#3b82f6',
        isFixedExpense: false,
        excludeFromStats: false,
      });

      await database.addCategory({
        name: '쇼핑',
        type: 'expense',
        color: '#8b5cf6',
        isFixedExpense: false,
        excludeFromStats: false,
      });

      expenseCategories = await database.getCategories('expense');
    }
    console.log('✅ 카테고리:', expenseCategories.length, '개');

    // 3. 이번 달 거래 추가
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    console.log('💰 테스트 거래 추가...');

    // 고정지출
    const 통신비 = expenseCategories.find(c => c.name === '통신비');
    if (통신비) {
      await database.addTransaction({
        amount: 55000,
        type: 'expense',
        categoryId: 통신비.id,
        accountId: account.id,
        description: 'SKT 요금',
        merchant: 'SKT',
        memo: '월 통신비',
        date: `${year}-${month.toString().padStart(2, '0')}-05`,
        tags: '',
        isTransfer: false,
        status: 'confirmed',
        cardName: '신용카드',
        cardNumber: '',
      });
    }

    const 보험료 = expenseCategories.find(c => c.name === '보험료');
    if (보험료) {
      await database.addTransaction({
        amount: 120000,
        type: 'expense',
        categoryId: 보험료.id,
        accountId: account.id,
        description: '삼성화재 자동차보험',
        merchant: '삼성화재',
        memo: '월 보험료',
        date: `${year}-${month.toString().padStart(2, '0')}-10`,
        tags: '',
        isTransfer: false,
        status: 'confirmed',
        cardName: '',
        cardNumber: '',
      });
    }

    // 변동지출
    const 식비 = expenseCategories.find(c => c.name === '식비');
    if (식비) {
      await database.addTransaction({
        amount: 15000,
        type: 'expense',
        categoryId: 식비.id,
        accountId: account.id,
        description: '점심',
        merchant: '맥도날드',
        memo: '',
        date: `${year}-${month.toString().padStart(2, '0')}-12`,
        tags: '',
        isTransfer: false,
        status: 'confirmed',
        cardName: '체크카드',
        cardNumber: '',
      });

      await database.addTransaction({
        amount: 32000,
        type: 'expense',
        categoryId: 식비.id,
        accountId: account.id,
        description: '저녁',
        merchant: '스타벅스',
        memo: '',
        date: `${year}-${month.toString().padStart(2, '0')}-13`,
        tags: '',
        isTransfer: false,
        status: 'confirmed',
        cardName: '신용카드',
        cardNumber: '',
      });
    }

    const 교통비 = expenseCategories.find(c => c.name === '교통비');
    if (교통비) {
      await database.addTransaction({
        amount: 1250,
        type: 'expense',
        categoryId: 교통비.id,
        accountId: account.id,
        description: '지하철',
        merchant: '서울교통공사',
        memo: '',
        date: `${year}-${month.toString().padStart(2, '0')}-14`,
        tags: '',
        isTransfer: false,
        status: 'confirmed',
        cardName: '교통카드',
        cardNumber: '',
      });
    }

    const 쇼핑 = expenseCategories.find(c => c.name === '쇼핑');
    if (쇼핑) {
      await database.addTransaction({
        amount: 89000,
        type: 'expense',
        categoryId: 쇼핑.id,
        accountId: account.id,
        description: '옷 구매',
        merchant: 'ZARA',
        memo: '',
        date: `${year}-${month.toString().padStart(2, '0')}-15`,
        tags: '',
        isTransfer: false,
        status: 'confirmed',
        cardName: '신용카드',
        cardNumber: '',
      });
    }

    // 4. 테스트 영수증 데이터 추가
    console.log('📸 테스트 영수증 추가...');

    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

    await database.addReceipt({
      url: 'file://test-receipt-1.jpg',
      mime: 'image/jpeg',
      size: 102400,
      ocrText: '맥도날드 빅맥세트 1개 7,500원',
      ocrAmount: 7500,
      ocrDate: format(new Date(), 'yyyy-MM-dd'),
      ocrMerchant: '맥도날드',
      ocrConfidence: 0.92,
      uploadedAt: now,
    });

    await database.addReceipt({
      url: 'file://test-receipt-2.jpg',
      mime: 'image/jpeg',
      size: 98304,
      ocrText: '스타벅스 아메리카노 4,500원 카페라떼 5,500원',
      ocrAmount: 10000,
      ocrDate: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'),
      ocrMerchant: '스타벅스',
      ocrConfidence: 0.88,
      uploadedAt: yesterday,
    });

    await database.addReceipt({
      url: 'file://test-receipt-3.jpg',
      mime: 'image/jpeg',
      size: 115200,
      ocrText: 'GS25 생수 1,200원 삼각김밥 1,500원',
      ocrAmount: 2700,
      ocrDate: format(new Date(Date.now() - 172800000), 'yyyy-MM-dd'),
      ocrMerchant: 'GS25',
      ocrConfidence: 0.75,
      uploadedAt: twoDaysAgo,
    });

    console.log('✅ 테스트 데이터 추가 완료!');
    console.log('📱 앱을 새로고침하면 데이터를 볼 수 있습니다.');
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

// 직접 실행 시
if (require.main === module) {
  addTestData();
}

export default addTestData;
