import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 지원 언어 타입
export type Language = 'ko' | 'en' | 'ja' | 'zh';

// 언어 정보
export const LANGUAGES: Record<Language, { name: string; nativeName: string; flag: string }> = {
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
};

// 번역 키 타입
export interface Translations {
  // 공통
  common: {
    confirm: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    back: string;
    next: string;
    done: string;
    reset: string;
    select: string;
    all: string;
    none: string;
    yes: string;
    no: string;
  };
  // 네비게이션/탭
  nav: {
    dashboard: string;
    transactions: string;
    add: string;
    categories: string;
    budgets: string;
    bankAccounts: string;
    rules: string;
    receipt: string;
    import: string;
    settings: string;
    home: string;
  };
  // 대시보드
  dashboard: {
    title: string;
    monthlyIncome: string;
    monthlyExpense: string;
    balance: string;
    recentTransactions: string;
    noTransactions: string;
    viewAll: string;
    groupExpenses: string;
    income: string;
    expense: string;
  };
  // 거래
  transaction: {
    title: string;
    addTitle: string;
    editTitle: string;
    amount: string;
    type: string;
    category: string;
    account: string;
    description: string;
    merchant: string;
    date: string;
    memo: string;
    income: string;
    expense: string;
    addSuccess: string;
    deleteSuccess: string;
    deleteConfirm: string;
    noTransactions: string;
    selectCategory: string;
    selectAccount: string;
  };
  // 카테고리
  category: {
    title: string;
    addTitle: string;
    editTitle: string;
    name: string;
    icon: string;
    color: string;
    group: string;
    incomeCategories: string;
    expenseCategories: string;
  };
  // 예산
  budget: {
    title: string;
    addTitle: string;
    monthly: string;
    spent: string;
    remaining: string;
    exceeded: string;
    onTrack: string;
  };
  // 통장/계좌
  account: {
    title: string;
    addTitle: string;
    name: string;
    balance: string;
    type: string;
    bankName: string;
    accountNumber: string;
    cardLastDigits: string;
  };
  // 가져오기
  import: {
    title: string;
    selectFile: string;
    preview: string;
    importing: string;
    importSuccess: string;
    duplicateRemoved: string;
    incomeExcluded: string;
    patternExcluded: string;
    totalTransactions: string;
  };
  // 설정
  settings: {
    title: string;
    display: string;
    darkMode: string;
    language: string;
    selectLanguage: string;
    ai: string;
    aiApiKey: string;
    data: string;
    backup: string;
    restore: string;
    resetData: string;
    resetConfirm: string;
    googleDrive: string;
    connected: string;
    notConnected: string;
    appInfo: string;
    version: string;
    developer: string;
  };
  // 영수증
  receipt: {
    title: string;
    scan: string;
    takePhoto: string;
    selectFromGallery: string;
    analyzing: string;
    noReceipt: string;
  };
  // 규칙
  rules: {
    title: string;
    addRule: string;
    autoCategory: string;
    exclusionPattern: string;
    keyword: string;
    targetCategory: string;
  };
  // 시간
  time: {
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    lastMonth: string;
  };
  // 앱
  app: {
    name: string;
    subtitle: string;
    copyright: string;
  };
  // 도움말
  help: {
    title: string;
    subtitle: string;
    // 기본 사용법
    basics: {
      title: string;
      addTransaction: string;
      addTransactionDesc: string;
      viewTransactions: string;
      viewTransactionsDesc: string;
      categories: string;
      categoriesDesc: string;
    };
    // 데이터 관리
    dataManagement: {
      title: string;
      import: string;
      importDesc: string;
      backup: string;
      backupDesc: string;
      restore: string;
      restoreDesc: string;
    };
    // 고급 기능
    advanced: {
      title: string;
      autoRules: string;
      autoRulesDesc: string;
      receipt: string;
      receiptDesc: string;
      darkMode: string;
      darkModeDesc: string;
    };
    // 팁
    tips: {
      title: string;
      tip1: string;
      tip2: string;
      tip3: string;
      tip4: string;
    };
    // FAQ
    faq: {
      title: string;
      q1: string;
      a1: string;
      q2: string;
      a2: string;
      q3: string;
      a3: string;
    };
  };
}

// 한국어 번역
const ko: Translations = {
  common: {
    confirm: '확인',
    cancel: '취소',
    save: '저장',
    delete: '삭제',
    edit: '수정',
    add: '추가',
    close: '닫기',
    search: '검색',
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    warning: '경고',
    back: '뒤로',
    next: '다음',
    done: '완료',
    reset: '초기화',
    select: '선택',
    all: '전체',
    none: '없음',
    yes: '예',
    no: '아니오',
  },
  nav: {
    dashboard: '대시보드',
    transactions: '거래내역',
    add: '추가',
    categories: '카테고리',
    budgets: '예산 관리',
    bankAccounts: '통장/결제수단',
    rules: '자동 분류 규칙',
    receipt: '영수증 스캔',
    import: '거래 가져오기',
    settings: '설정',
    home: '홈',
  },
  dashboard: {
    title: '대시보드',
    monthlyIncome: '이번 달 수입',
    monthlyExpense: '이번 달 지출',
    balance: '잔액',
    recentTransactions: '최근 거래',
    noTransactions: '거래 내역이 없습니다',
    viewAll: '전체 보기',
    groupExpenses: '그룹별 지출',
    income: '수입',
    expense: '지출',
  },
  transaction: {
    title: '거래내역',
    addTitle: '거래 추가',
    editTitle: '거래 수정',
    amount: '금액',
    type: '유형',
    category: '카테고리',
    account: '계좌',
    description: '설명',
    merchant: '가맹점',
    date: '날짜',
    memo: '메모',
    income: '수입',
    expense: '지출',
    addSuccess: '거래가 추가되었습니다.',
    deleteSuccess: '거래가 삭제되었습니다.',
    deleteConfirm: '이 거래를 삭제하시겠습니까?',
    noTransactions: '거래 내역이 없습니다',
    selectCategory: '카테고리 선택',
    selectAccount: '계좌 선택',
  },
  category: {
    title: '카테고리',
    addTitle: '카테고리 추가',
    editTitle: '카테고리 수정',
    name: '이름',
    icon: '아이콘',
    color: '색상',
    group: '그룹',
    incomeCategories: '수입 카테고리',
    expenseCategories: '지출 카테고리',
  },
  budget: {
    title: '예산 관리',
    addTitle: '예산 추가',
    monthly: '월 예산',
    spent: '사용액',
    remaining: '남은 금액',
    exceeded: '초과',
    onTrack: '정상',
  },
  account: {
    title: '통장/결제수단',
    addTitle: '계좌 추가',
    name: '이름',
    balance: '잔액',
    type: '유형',
    bankName: '은행명',
    accountNumber: '계좌번호',
    cardLastDigits: '카드 뒷자리',
  },
  import: {
    title: '거래 가져오기',
    selectFile: 'Excel 파일 선택',
    preview: '미리보기',
    importing: '가져오는 중...',
    importSuccess: '가져오기 완료',
    duplicateRemoved: '중복 제거',
    incomeExcluded: '입금 내역 제외',
    patternExcluded: '패턴 매칭 제외',
    totalTransactions: '총 거래',
  },
  settings: {
    title: '설정',
    display: '화면 설정',
    darkMode: '다크 모드',
    language: '언어',
    selectLanguage: '언어 선택',
    ai: 'AI 설정 (OCR)',
    aiApiKey: 'AI API 키 설정',
    data: '데이터 관리',
    backup: '백업',
    restore: '복원',
    resetData: '데이터 초기화',
    resetConfirm: '모든 데이터가 삭제됩니다. 계속하시겠습니까?',
    googleDrive: 'Google Drive 연결',
    connected: '연결됨',
    notConnected: '연결되지 않음',
    appInfo: '앱 정보',
    version: '버전',
    developer: '개발자',
  },
  receipt: {
    title: '영수증 스캔',
    scan: '스캔',
    takePhoto: '사진 촬영',
    selectFromGallery: '갤러리에서 선택',
    analyzing: '분석 중...',
    noReceipt: '스캔된 영수증이 없습니다',
  },
  rules: {
    title: '자동 분류 규칙',
    addRule: '규칙 추가',
    autoCategory: '자동 카테고리',
    exclusionPattern: '제외 패턴',
    keyword: '키워드',
    targetCategory: '적용 카테고리',
  },
  time: {
    today: '오늘',
    yesterday: '어제',
    thisWeek: '이번 주',
    thisMonth: '이번 달',
    lastMonth: '지난 달',
  },
  app: {
    name: '가계부',
    subtitle: '개인 재정 관리',
    copyright: '© 2025 가계부 모바일 앱',
  },
  help: {
    title: '사용 설명서',
    subtitle: '앱 사용 방법을 안내합니다',
    basics: {
      title: '기본 사용법',
      addTransaction: '거래 추가하기',
      addTransactionDesc: '하단의 "+" 버튼을 누르거나 거래 추가 메뉴에서 수입/지출을 기록할 수 있습니다. 금액, 카테고리, 결제수단, 날짜를 입력하세요.',
      viewTransactions: '거래 내역 보기',
      viewTransactionsDesc: '거래내역 탭에서 모든 거래를 확인할 수 있습니다. 상단의 월 선택으로 특정 월의 거래만 필터링할 수 있습니다.',
      categories: '카테고리 관리',
      categoriesDesc: '설정 > 카테고리에서 수입/지출 카테고리를 추가, 수정, 삭제할 수 있습니다. 각 카테고리에 아이콘과 색상을 지정하세요.',
    },
    dataManagement: {
      title: '데이터 관리',
      import: 'Excel 파일 가져오기',
      importDesc: '은행/카드사에서 다운로드한 Excel 파일을 가져올 수 있습니다. 다양한 형식의 파일을 자동으로 인식합니다.',
      backup: '데이터 백업',
      backupDesc: 'Google Drive에 연결하여 데이터를 클라우드에 백업할 수 있습니다. 정기적인 백업을 권장합니다.',
      restore: '데이터 복원',
      restoreDesc: 'Google Drive에서 이전에 백업한 데이터를 복원할 수 있습니다. 복원 시 현재 데이터가 대체됩니다.',
    },
    advanced: {
      title: '고급 기능',
      autoRules: '자동 분류 규칙',
      autoRulesDesc: '특정 키워드가 포함된 거래를 자동으로 카테고리에 분류하거나 제외할 수 있습니다. 반복되는 거래를 효율적으로 관리하세요.',
      receipt: '영수증 스캔 (OCR)',
      receiptDesc: 'AI API 키를 설정하면 영수증 사진에서 자동으로 거래 정보를 추출할 수 있습니다.',
      darkMode: '다크 모드',
      darkModeDesc: '설정에서 다크 모드를 활성화하여 어두운 환경에서 눈의 피로를 줄일 수 있습니다.',
    },
    tips: {
      title: '유용한 팁',
      tip1: '대시보드에서 월별 수입/지출 현황과 그룹별 지출을 한눈에 확인하세요.',
      tip2: '거래 추가 시 메모를 활용하면 나중에 거래를 쉽게 찾을 수 있습니다.',
      tip3: '자동 분류 규칙을 설정하면 Excel 가져오기 시 자동으로 카테고리가 지정됩니다.',
      tip4: '정기적으로 Google Drive에 백업하여 데이터 손실을 방지하세요.',
    },
    faq: {
      title: '자주 묻는 질문',
      q1: '데이터가 저장되는 위치는 어디인가요?',
      a1: '모든 데이터는 기기 내부에 안전하게 저장됩니다. Google Drive 백업을 통해 클라우드에도 저장할 수 있습니다.',
      q2: '앱을 삭제하면 데이터도 삭제되나요?',
      a2: '네, 앱 삭제 시 모든 데이터가 삭제됩니다. 중요한 데이터는 반드시 백업해 주세요.',
      q3: '여러 기기에서 동기화할 수 있나요?',
      a3: 'Google Drive 백업/복원 기능을 사용하여 다른 기기로 데이터를 이동할 수 있습니다.',
    },
  },
};

// 영어 번역
const en: Translations = {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    reset: 'Reset',
    select: 'Select',
    all: 'All',
    none: 'None',
    yes: 'Yes',
    no: 'No',
  },
  nav: {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    add: 'Add',
    categories: 'Categories',
    budgets: 'Budgets',
    bankAccounts: 'Accounts',
    rules: 'Auto Rules',
    receipt: 'Receipt Scan',
    import: 'Import',
    settings: 'Settings',
    home: 'Home',
  },
  dashboard: {
    title: 'Dashboard',
    monthlyIncome: 'Monthly Income',
    monthlyExpense: 'Monthly Expense',
    balance: 'Balance',
    recentTransactions: 'Recent Transactions',
    noTransactions: 'No transactions',
    viewAll: 'View All',
    groupExpenses: 'Expenses by Group',
    income: 'Income',
    expense: 'Expense',
  },
  transaction: {
    title: 'Transactions',
    addTitle: 'Add Transaction',
    editTitle: 'Edit Transaction',
    amount: 'Amount',
    type: 'Type',
    category: 'Category',
    account: 'Account',
    description: 'Description',
    merchant: 'Merchant',
    date: 'Date',
    memo: 'Memo',
    income: 'Income',
    expense: 'Expense',
    addSuccess: 'Transaction added successfully.',
    deleteSuccess: 'Transaction deleted successfully.',
    deleteConfirm: 'Are you sure you want to delete this transaction?',
    noTransactions: 'No transactions',
    selectCategory: 'Select Category',
    selectAccount: 'Select Account',
  },
  category: {
    title: 'Categories',
    addTitle: 'Add Category',
    editTitle: 'Edit Category',
    name: 'Name',
    icon: 'Icon',
    color: 'Color',
    group: 'Group',
    incomeCategories: 'Income Categories',
    expenseCategories: 'Expense Categories',
  },
  budget: {
    title: 'Budgets',
    addTitle: 'Add Budget',
    monthly: 'Monthly Budget',
    spent: 'Spent',
    remaining: 'Remaining',
    exceeded: 'Exceeded',
    onTrack: 'On Track',
  },
  account: {
    title: 'Accounts',
    addTitle: 'Add Account',
    name: 'Name',
    balance: 'Balance',
    type: 'Type',
    bankName: 'Bank Name',
    accountNumber: 'Account Number',
    cardLastDigits: 'Card Last Digits',
  },
  import: {
    title: 'Import Transactions',
    selectFile: 'Select Excel File',
    preview: 'Preview',
    importing: 'Importing...',
    importSuccess: 'Import Complete',
    duplicateRemoved: 'Duplicates Removed',
    incomeExcluded: 'Income Excluded',
    patternExcluded: 'Pattern Excluded',
    totalTransactions: 'Total Transactions',
  },
  settings: {
    title: 'Settings',
    display: 'Display',
    darkMode: 'Dark Mode',
    language: 'Language',
    selectLanguage: 'Select Language',
    ai: 'AI Settings (OCR)',
    aiApiKey: 'AI API Key Settings',
    data: 'Data Management',
    backup: 'Backup',
    restore: 'Restore',
    resetData: 'Reset Data',
    resetConfirm: 'All data will be deleted. Continue?',
    googleDrive: 'Google Drive',
    connected: 'Connected',
    notConnected: 'Not Connected',
    appInfo: 'App Info',
    version: 'Version',
    developer: 'Developer',
  },
  receipt: {
    title: 'Receipt Scan',
    scan: 'Scan',
    takePhoto: 'Take Photo',
    selectFromGallery: 'Select from Gallery',
    analyzing: 'Analyzing...',
    noReceipt: 'No scanned receipts',
  },
  rules: {
    title: 'Auto Rules',
    addRule: 'Add Rule',
    autoCategory: 'Auto Category',
    exclusionPattern: 'Exclusion Pattern',
    keyword: 'Keyword',
    targetCategory: 'Target Category',
  },
  time: {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
  },
  app: {
    name: 'Budget Book',
    subtitle: 'Personal Finance Manager',
    copyright: '© 2025 Budget Book Mobile App',
  },
  help: {
    title: 'User Guide',
    subtitle: 'Learn how to use the app',
    basics: {
      title: 'Basic Usage',
      addTransaction: 'Adding Transactions',
      addTransactionDesc: 'Tap the "+" button at the bottom or use the Add Transaction menu to record income/expenses. Enter the amount, category, payment method, and date.',
      viewTransactions: 'Viewing Transactions',
      viewTransactionsDesc: 'View all transactions in the Transactions tab. Use the month selector at the top to filter transactions by month.',
      categories: 'Managing Categories',
      categoriesDesc: 'Add, edit, or delete income/expense categories in Settings > Categories. Assign icons and colors to each category.',
    },
    dataManagement: {
      title: 'Data Management',
      import: 'Importing Excel Files',
      importDesc: 'Import Excel files downloaded from your bank or credit card company. Various file formats are automatically recognized.',
      backup: 'Data Backup',
      backupDesc: 'Connect to Google Drive to backup your data to the cloud. Regular backups are recommended.',
      restore: 'Data Restore',
      restoreDesc: 'Restore previously backed up data from Google Drive. Current data will be replaced when restoring.',
    },
    advanced: {
      title: 'Advanced Features',
      autoRules: 'Auto Classification Rules',
      autoRulesDesc: 'Automatically categorize or exclude transactions containing specific keywords. Efficiently manage recurring transactions.',
      receipt: 'Receipt Scan (OCR)',
      receiptDesc: 'Set up an AI API key to automatically extract transaction information from receipt photos.',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Enable dark mode in settings to reduce eye strain in low-light environments.',
    },
    tips: {
      title: 'Useful Tips',
      tip1: 'Check monthly income/expense status and group expenses at a glance on the dashboard.',
      tip2: 'Use memos when adding transactions to easily find them later.',
      tip3: 'Set up auto classification rules to automatically assign categories when importing Excel files.',
      tip4: 'Regularly backup to Google Drive to prevent data loss.',
    },
    faq: {
      title: 'FAQ',
      q1: 'Where is my data stored?',
      a1: 'All data is securely stored on your device. You can also store it in the cloud via Google Drive backup.',
      q2: 'Will my data be deleted if I uninstall the app?',
      a2: 'Yes, all data will be deleted when you uninstall the app. Please backup important data.',
      q3: 'Can I sync across multiple devices?',
      a3: 'You can transfer data to another device using the Google Drive backup/restore feature.',
    },
  },
};

// 일본어 번역
const ja: Translations = {
  common: {
    confirm: '確認',
    cancel: 'キャンセル',
    save: '保存',
    delete: '削除',
    edit: '編集',
    add: '追加',
    close: '閉じる',
    search: '検索',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    warning: '警告',
    back: '戻る',
    next: '次へ',
    done: '完了',
    reset: 'リセット',
    select: '選択',
    all: 'すべて',
    none: 'なし',
    yes: 'はい',
    no: 'いいえ',
  },
  nav: {
    dashboard: 'ダッシュボード',
    transactions: '取引履歴',
    add: '追加',
    categories: 'カテゴリ',
    budgets: '予算管理',
    bankAccounts: '口座/決済',
    rules: '自動分類ルール',
    receipt: 'レシートスキャン',
    import: '取引インポート',
    settings: '設定',
    home: 'ホーム',
  },
  dashboard: {
    title: 'ダッシュボード',
    monthlyIncome: '今月の収入',
    monthlyExpense: '今月の支出',
    balance: '残高',
    recentTransactions: '最近の取引',
    noTransactions: '取引履歴がありません',
    viewAll: 'すべて表示',
    groupExpenses: 'グループ別支出',
    income: '収入',
    expense: '支出',
  },
  transaction: {
    title: '取引履歴',
    addTitle: '取引追加',
    editTitle: '取引編集',
    amount: '金額',
    type: '種類',
    category: 'カテゴリ',
    account: '口座',
    description: '説明',
    merchant: '店舗',
    date: '日付',
    memo: 'メモ',
    income: '収入',
    expense: '支出',
    addSuccess: '取引が追加されました。',
    deleteSuccess: '取引が削除されました。',
    deleteConfirm: 'この取引を削除しますか？',
    noTransactions: '取引履歴がありません',
    selectCategory: 'カテゴリを選択',
    selectAccount: '口座を選択',
  },
  category: {
    title: 'カテゴリ',
    addTitle: 'カテゴリ追加',
    editTitle: 'カテゴリ編集',
    name: '名前',
    icon: 'アイコン',
    color: '色',
    group: 'グループ',
    incomeCategories: '収入カテゴリ',
    expenseCategories: '支出カテゴリ',
  },
  budget: {
    title: '予算管理',
    addTitle: '予算追加',
    monthly: '月間予算',
    spent: '使用額',
    remaining: '残額',
    exceeded: '超過',
    onTrack: '正常',
  },
  account: {
    title: '口座/決済',
    addTitle: '口座追加',
    name: '名前',
    balance: '残高',
    type: '種類',
    bankName: '銀行名',
    accountNumber: '口座番号',
    cardLastDigits: 'カード下4桁',
  },
  import: {
    title: '取引インポート',
    selectFile: 'Excelファイル選択',
    preview: 'プレビュー',
    importing: 'インポート中...',
    importSuccess: 'インポート完了',
    duplicateRemoved: '重複削除',
    incomeExcluded: '入金除外',
    patternExcluded: 'パターン除外',
    totalTransactions: '総取引数',
  },
  settings: {
    title: '設定',
    display: '画面設定',
    darkMode: 'ダークモード',
    language: '言語',
    selectLanguage: '言語選択',
    ai: 'AI設定 (OCR)',
    aiApiKey: 'AI APIキー設定',
    data: 'データ管理',
    backup: 'バックアップ',
    restore: '復元',
    resetData: 'データリセット',
    resetConfirm: 'すべてのデータが削除されます。続行しますか？',
    googleDrive: 'Google Drive連携',
    connected: '接続済み',
    notConnected: '未接続',
    appInfo: 'アプリ情報',
    version: 'バージョン',
    developer: '開発者',
  },
  receipt: {
    title: 'レシートスキャン',
    scan: 'スキャン',
    takePhoto: '写真を撮る',
    selectFromGallery: 'ギャラリーから選択',
    analyzing: '分析中...',
    noReceipt: 'スキャンされたレシートがありません',
  },
  rules: {
    title: '自動分類ルール',
    addRule: 'ルール追加',
    autoCategory: '自動カテゴリ',
    exclusionPattern: '除外パターン',
    keyword: 'キーワード',
    targetCategory: '適用カテゴリ',
  },
  time: {
    today: '今日',
    yesterday: '昨日',
    thisWeek: '今週',
    thisMonth: '今月',
    lastMonth: '先月',
  },
  app: {
    name: '家計簿',
    subtitle: '個人財務管理',
    copyright: '© 2025 家計簿モバイルアプリ',
  },
  help: {
    title: '使用ガイド',
    subtitle: 'アプリの使い方をご案内します',
    basics: {
      title: '基本的な使い方',
      addTransaction: '取引の追加',
      addTransactionDesc: '下部の「+」ボタンをタップするか、取引追加メニューから収入/支出を記録できます。金額、カテゴリ、決済方法、日付を入力してください。',
      viewTransactions: '取引履歴の確認',
      viewTransactionsDesc: '取引履歴タブですべての取引を確認できます。上部の月選択で特定の月の取引をフィルタリングできます。',
      categories: 'カテゴリ管理',
      categoriesDesc: '設定 > カテゴリで収入/支出カテゴリを追加、編集、削除できます。各カテゴリにアイコンと色を設定してください。',
    },
    dataManagement: {
      title: 'データ管理',
      import: 'Excelファイルのインポート',
      importDesc: '銀行やクレジットカード会社からダウンロードしたExcelファイルをインポートできます。様々な形式のファイルを自動認識します。',
      backup: 'データバックアップ',
      backupDesc: 'Google Driveに接続してデータをクラウドにバックアップできます。定期的なバックアップをお勧めします。',
      restore: 'データ復元',
      restoreDesc: 'Google Driveから以前にバックアップしたデータを復元できます。復元すると現在のデータが置き換えられます。',
    },
    advanced: {
      title: '高度な機能',
      autoRules: '自動分類ルール',
      autoRulesDesc: '特定のキーワードを含む取引を自動的にカテゴリに分類したり除外したりできます。繰り返しの取引を効率的に管理できます。',
      receipt: 'レシートスキャン (OCR)',
      receiptDesc: 'AI APIキーを設定すると、レシート写真から自動的に取引情報を抽出できます。',
      darkMode: 'ダークモード',
      darkModeDesc: '設定でダークモードを有効にすると、暗い環境での目の疲れを軽減できます。',
    },
    tips: {
      title: '便利なヒント',
      tip1: 'ダッシュボードで月別の収入/支出状況とグループ別支出を一目で確認できます。',
      tip2: '取引追加時にメモを活用すると、後で取引を簡単に見つけられます。',
      tip3: '自動分類ルールを設定すると、Excelインポート時に自動的にカテゴリが設定されます。',
      tip4: '定期的にGoogle Driveにバックアップしてデータ損失を防ぎましょう。',
    },
    faq: {
      title: 'よくある質問',
      q1: 'データはどこに保存されますか？',
      a1: 'すべてのデータは端末内に安全に保存されます。Google Driveバックアップでクラウドにも保存できます。',
      q2: 'アプリを削除するとデータも削除されますか？',
      a2: 'はい、アプリを削除するとすべてのデータが削除されます。重要なデータは必ずバックアップしてください。',
      q3: '複数の端末で同期できますか？',
      a3: 'Google Driveのバックアップ/復元機能を使用して、他の端末にデータを移動できます。',
    },
  },
};

// 중국어 번역
const zh: Translations = {
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    close: '关闭',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    warning: '警告',
    back: '返回',
    next: '下一步',
    done: '完成',
    reset: '重置',
    select: '选择',
    all: '全部',
    none: '无',
    yes: '是',
    no: '否',
  },
  nav: {
    dashboard: '仪表板',
    transactions: '交易记录',
    add: '添加',
    categories: '分类',
    budgets: '预算管理',
    bankAccounts: '账户/支付',
    rules: '自动分类规则',
    receipt: '收据扫描',
    import: '导入交易',
    settings: '设置',
    home: '首页',
  },
  dashboard: {
    title: '仪表板',
    monthlyIncome: '本月收入',
    monthlyExpense: '本月支出',
    balance: '余额',
    recentTransactions: '最近交易',
    noTransactions: '没有交易记录',
    viewAll: '查看全部',
    groupExpenses: '分组支出',
    income: '收入',
    expense: '支出',
  },
  transaction: {
    title: '交易记录',
    addTitle: '添加交易',
    editTitle: '编辑交易',
    amount: '金额',
    type: '类型',
    category: '分类',
    account: '账户',
    description: '描述',
    merchant: '商户',
    date: '日期',
    memo: '备注',
    income: '收入',
    expense: '支出',
    addSuccess: '交易添加成功。',
    deleteSuccess: '交易删除成功。',
    deleteConfirm: '确定要删除这笔交易吗？',
    noTransactions: '没有交易记录',
    selectCategory: '选择分类',
    selectAccount: '选择账户',
  },
  category: {
    title: '分类',
    addTitle: '添加分类',
    editTitle: '编辑分类',
    name: '名称',
    icon: '图标',
    color: '颜色',
    group: '分组',
    incomeCategories: '收入分类',
    expenseCategories: '支出分类',
  },
  budget: {
    title: '预算管理',
    addTitle: '添加预算',
    monthly: '月度预算',
    spent: '已使用',
    remaining: '剩余',
    exceeded: '超支',
    onTrack: '正常',
  },
  account: {
    title: '账户/支付',
    addTitle: '添加账户',
    name: '名称',
    balance: '余额',
    type: '类型',
    bankName: '银行名称',
    accountNumber: '账号',
    cardLastDigits: '卡号后四位',
  },
  import: {
    title: '导入交易',
    selectFile: '选择Excel文件',
    preview: '预览',
    importing: '导入中...',
    importSuccess: '导入完成',
    duplicateRemoved: '重复删除',
    incomeExcluded: '收入排除',
    patternExcluded: '模式排除',
    totalTransactions: '总交易数',
  },
  settings: {
    title: '设置',
    display: '显示设置',
    darkMode: '深色模式',
    language: '语言',
    selectLanguage: '选择语言',
    ai: 'AI设置 (OCR)',
    aiApiKey: 'AI API密钥设置',
    data: '数据管理',
    backup: '备份',
    restore: '恢复',
    resetData: '重置数据',
    resetConfirm: '所有数据将被删除。是否继续？',
    googleDrive: 'Google Drive连接',
    connected: '已连接',
    notConnected: '未连接',
    appInfo: '应用信息',
    version: '版本',
    developer: '开发者',
  },
  receipt: {
    title: '收据扫描',
    scan: '扫描',
    takePhoto: '拍照',
    selectFromGallery: '从相册选择',
    analyzing: '分析中...',
    noReceipt: '没有扫描的收据',
  },
  rules: {
    title: '自动分类规则',
    addRule: '添加规则',
    autoCategory: '自动分类',
    exclusionPattern: '排除模式',
    keyword: '关键词',
    targetCategory: '目标分类',
  },
  time: {
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    thisMonth: '本月',
    lastMonth: '上月',
  },
  app: {
    name: '记账本',
    subtitle: '个人财务管理',
    copyright: '© 2025 记账本移动应用',
  },
  help: {
    title: '使用指南',
    subtitle: '了解如何使用应用',
    basics: {
      title: '基本使用',
      addTransaction: '添加交易',
      addTransactionDesc: '点击底部的"+"按钮或使用添加交易菜单来记录收入/支出。输入金额、分类、支付方式和日期。',
      viewTransactions: '查看交易记录',
      viewTransactionsDesc: '在交易记录选项卡中查看所有交易。使用顶部的月份选择器按月筛选交易。',
      categories: '分类管理',
      categoriesDesc: '在设置 > 分类中添加、编辑或删除收入/支出分类。为每个分类设置图标和颜色。',
    },
    dataManagement: {
      title: '数据管理',
      import: '导入Excel文件',
      importDesc: '导入从银行或信用卡公司下载的Excel文件。自动识别各种文件格式。',
      backup: '数据备份',
      backupDesc: '连接Google Drive将数据备份到云端。建议定期备份。',
      restore: '数据恢复',
      restoreDesc: '从Google Drive恢复之前备份的数据。恢复时当前数据将被替换。',
    },
    advanced: {
      title: '高级功能',
      autoRules: '自动分类规则',
      autoRulesDesc: '自动将包含特定关键词的交易分类或排除。高效管理重复交易。',
      receipt: '收据扫描 (OCR)',
      receiptDesc: '设置AI API密钥后，可以从收据照片中自动提取交易信息。',
      darkMode: '深色模式',
      darkModeDesc: '在设置中启用深色模式，减少弱光环境下的眼睛疲劳。',
    },
    tips: {
      title: '实用技巧',
      tip1: '在仪表板上一目了然地查看月度收支情况和分组支出。',
      tip2: '添加交易时使用备注，以便以后轻松查找。',
      tip3: '设置自动分类规则，导入Excel文件时会自动分配分类。',
      tip4: '定期备份到Google Drive，防止数据丢失。',
    },
    faq: {
      title: '常见问题',
      q1: '数据存储在哪里？',
      a1: '所有数据安全地存储在您的设备上。您也可以通过Google Drive备份存储到云端。',
      q2: '卸载应用会删除数据吗？',
      a2: '是的，卸载应用时所有数据都会被删除。请务必备份重要数据。',
      q3: '可以在多个设备间同步吗？',
      a3: '您可以使用Google Drive备份/恢复功能将数据转移到其他设备。',
    },
  },
};

// 모든 번역
const translations: Record<Language, Translations> = { ko, en, ja, zh };

// Context 타입
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('ko');
  const [isLoaded, setIsLoaded] = useState(false);

  // 저장된 언어 설정 불러오기
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLanguage && savedLanguage in translations) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Failed to load language setting:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  // 언어 변경 및 저장
  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
  }, []);

  // 현재 언어의 번역
  const t = translations[language];

  if (!isLoaded) {
    return null; // 또는 로딩 스피너
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
