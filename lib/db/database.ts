// SQLite 데이터베이스 설정 및 초기화
import * as SQLite from 'expo-sqlite';

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  excludeFromStats?: boolean; // 통계 제외 여부
  isFixedExpense?: boolean; // 고정 지출 여부
}

export interface Account {
  id: number;
  name: string;
  type: 'card' | 'cash' | 'bank';
  cardType?: 'credit' | 'debit';
  last4?: string;
  color?: string;
  createdAt: string;
}

export interface BankAccount {
  id: number;
  name: string;
  accountType: string;
  bankName?: string;
  accountNumber?: string;
  balance: number;
  color?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'refund';
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  accountId?: number;
  accountName?: string;
  description: string;
  merchant?: string;
  memo?: string;
  date: string; // YYYY-MM-DD
  tags?: string; // JSON array
  isTransfer?: boolean;
  fromBankAccountId?: number;
  toBankAccountId?: number;
  status?: 'confirmed' | 'pending' | 'excluded';
  cardName?: string;
  cardNumber?: string;
  createdAt: string;
  updatedAt?: string;
  isExcluded?: number; // 제외 패턴에 의해 제외되는지 여부 (0 또는 1)
}

export interface Budget {
  id: number;
  month: string; // YYYY-MM
  categoryId: number;
  categoryName?: string;
  limitAmount: number;
  spent?: number;
  createdAt: string;
}

export interface RecurringTransaction {
  id: number;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  categoryName?: string;
  accountId: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  lastRun?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Receipt {
  id: number;
  url: string; // 로컬 파일 경로
  mime: string;
  size: number;
  ocrText?: string;
  ocrAmount?: number;
  ocrDate?: string;
  ocrMerchant?: string;
  ocrCardNumber?: string;
  ocrConfidence?: number;
  linkedTxId?: number;
  uploadedAt: string;
}

export interface Rule {
  id: number;
  pattern: string;
  checkMerchant: boolean;
  checkMemo: boolean;
  assignCategoryId: number;
  assignCategoryName?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface ExclusionPattern {
  id: number;
  pattern: string;
  type: 'merchant' | 'memo' | 'both' | 'account';
  isActive: boolean;
  createdAt: string;
}

class Database {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await SQLite.openDatabaseAsync('gagyebu.db');

    // 테이블 생성
    await this.db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        color TEXT NOT NULL,
        icon TEXT,
        excludeFromStats INTEGER DEFAULT 0,
        isFixedExpense INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('card', 'cash', 'bank')),
        cardType TEXT CHECK(cardType IN ('credit', 'debit') OR cardType IS NULL),
        last4 TEXT,
        color TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        accountType TEXT NOT NULL,
        bankName TEXT,
        accountNumber TEXT,
        balance INTEGER DEFAULT 0,
        color TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'refund')),
        categoryId INTEGER NOT NULL,
        accountId INTEGER,
        description TEXT,
        merchant TEXT,
        memo TEXT,
        date TEXT NOT NULL,
        tags TEXT,
        isTransfer INTEGER DEFAULT 0,
        fromBankAccountId INTEGER,
        toBankAccountId INTEGER,
        status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'pending', 'excluded')),
        cardName TEXT,
        cardNumber TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        FOREIGN KEY (accountId) REFERENCES accounts(id),
        FOREIGN KEY (fromBankAccountId) REFERENCES bank_accounts(id),
        FOREIGN KEY (toBankAccountId) REFERENCES bank_accounts(id)
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        categoryId INTEGER NOT NULL,
        limitAmount REAL NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        UNIQUE(month, categoryId)
      );

      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        categoryId INTEGER NOT NULL,
        accountId INTEGER NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'yearly')),
        dayOfMonth INTEGER,
        dayOfWeek INTEGER,
        startDate TEXT NOT NULL,
        endDate TEXT,
        lastRun TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        FOREIGN KEY (accountId) REFERENCES accounts(id)
      );

      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        ocrText TEXT,
        ocrAmount REAL,
        ocrDate TEXT,
        ocrMerchant TEXT,
        ocrCardNumber TEXT,
        ocrConfidence REAL,
        linkedTxId INTEGER,
        uploadedAt TEXT NOT NULL,
        FOREIGN KEY (linkedTxId) REFERENCES transactions(id)
      );

      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        checkMerchant INTEGER DEFAULT 1,
        checkMemo INTEGER DEFAULT 0,
        assignCategoryId INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (assignCategoryId) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS exclusion_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('merchant', 'memo', 'both', 'account')),
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryId);
      CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
      CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(isActive);
      CREATE INDEX IF NOT EXISTS idx_exclusion_patterns_active ON exclusion_patterns(isActive);
    `);

    // 데이터베이스 마이그레이션: 누락된 컬럼 추가
    try {
      // categories 테이블: excludeFromStats 컬럼 추가
      const categoriesInfo = await this.db.getAllAsync('PRAGMA table_info(categories)') as Array<{name: string}>;
      const hasExcludeFromStats = categoriesInfo.some(col => col.name === 'excludeFromStats');

      if (!hasExcludeFromStats) {
        console.log('Adding excludeFromStats column to categories table...');
        await this.db.execAsync(`
          ALTER TABLE categories ADD COLUMN excludeFromStats INTEGER DEFAULT 0;
        `);
        console.log('Successfully added excludeFromStats column');
      }

      // categories 테이블: isFixedExpense 컬럼 추가
      const hasIsFixedExpense = categoriesInfo.some(col => col.name === 'isFixedExpense');
      if (!hasIsFixedExpense) {
        console.log('Adding isFixedExpense column to categories table...');
        await this.db.execAsync(`
          ALTER TABLE categories ADD COLUMN isFixedExpense INTEGER DEFAULT 0;
        `);
        console.log('Successfully added isFixedExpense column');
      }

      // transactions 테이블: 누락된 컬럼들 확인 및 추가
      const transactionsInfo = await this.db.getAllAsync('PRAGMA table_info(transactions)') as Array<{name: string}>;

      // isTransfer 컬럼 추가
      const hasIsTransfer = transactionsInfo.some(col => col.name === 'isTransfer');
      if (!hasIsTransfer) {
        console.log('Adding isTransfer column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN isTransfer INTEGER DEFAULT 0;
        `);
        console.log('Successfully added isTransfer column');
      }

      // accountId 컬럼 추가
      const hasAccountId = transactionsInfo.some(col => col.name === 'accountId');
      if (!hasAccountId) {
        console.log('Adding accountId column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN accountId INTEGER;
        `);
        console.log('Successfully added accountId column');
      }

      // categoryId 컬럼 추가 (필수 컬럼이므로 기본값 필요)
      const hasCategoryId = transactionsInfo.some(col => col.name === 'categoryId');
      if (!hasCategoryId) {
        console.log('Adding categoryId column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN categoryId INTEGER NOT NULL DEFAULT 1;
        `);
        console.log('Successfully added categoryId column');
      }

      // fromBankAccountId 컬럼 추가
      const hasFromBankAccountId = transactionsInfo.some(col => col.name === 'fromBankAccountId');
      if (!hasFromBankAccountId) {
        console.log('Adding fromBankAccountId column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN fromBankAccountId INTEGER;
        `);
        console.log('Successfully added fromBankAccountId column');
      }

      // toBankAccountId 컬럼 추가
      const hasToBankAccountId = transactionsInfo.some(col => col.name === 'toBankAccountId');
      if (!hasToBankAccountId) {
        console.log('Adding toBankAccountId column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN toBankAccountId INTEGER;
        `);
        console.log('Successfully added toBankAccountId column');
      }

      // cardName 컬럼 추가
      const hasCardName = transactionsInfo.some(col => col.name === 'cardName');
      if (!hasCardName) {
        console.log('Adding cardName column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN cardName TEXT;
        `);
        console.log('Successfully added cardName column');
      }

      // cardNumber 컬럼 추가
      const hasCardNumber = transactionsInfo.some(col => col.name === 'cardNumber');
      if (!hasCardNumber) {
        console.log('Adding cardNumber column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN cardNumber TEXT;
        `);
        console.log('Successfully added cardNumber column');
      }

      // description 컬럼 추가
      const hasDescription = transactionsInfo.some(col => col.name === 'description');
      if (!hasDescription) {
        console.log('Adding description column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN description TEXT;
        `);
        console.log('Successfully added description column');
      }

      // merchant 컬럼 추가
      const hasMerchant = transactionsInfo.some(col => col.name === 'merchant');
      if (!hasMerchant) {
        console.log('Adding merchant column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN merchant TEXT;
        `);
        console.log('Successfully added merchant column');
      }

      // memo 컬럼 추가
      const hasMemo = transactionsInfo.some(col => col.name === 'memo');
      if (!hasMemo) {
        console.log('Adding memo column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN memo TEXT;
        `);
        console.log('Successfully added memo column');
      }

      // tags 컬럼 추가
      const hasTags = transactionsInfo.some(col => col.name === 'tags');
      if (!hasTags) {
        console.log('Adding tags column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN tags TEXT;
        `);
        console.log('Successfully added tags column');
      }

      // status 컬럼 추가
      const hasStatus = transactionsInfo.some(col => col.name === 'status');
      if (!hasStatus) {
        console.log('Adding status column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'confirmed';
        `);
        console.log('Successfully added status column');
      }

      // createdAt 컬럼 추가 (필수 컬럼)
      const hasCreatedAt = transactionsInfo.some(col => col.name === 'createdAt');
      if (!hasCreatedAt) {
        console.log('Adding createdAt column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN createdAt TEXT NOT NULL DEFAULT (datetime('now'));
        `);
        console.log('Successfully added createdAt column');
      }

      // updatedAt 컬럼 추가
      const hasUpdatedAt = transactionsInfo.some(col => col.name === 'updatedAt');
      if (!hasUpdatedAt) {
        console.log('Adding updatedAt column to transactions table...');
        await this.db.execAsync(`
          ALTER TABLE transactions ADD COLUMN updatedAt TEXT;
        `);
        console.log('Successfully added updatedAt column');
      }
    } catch (migrationError) {
      console.error('Migration error (non-fatal):', migrationError);
      // 마이그레이션 실패는 치명적이지 않음 (이미 컬럼이 있거나 새 DB인 경우)
    }

    // 기본 데이터 초기화
    await this.seedDefaultData();

    return this.db;
  }

  private async seedDefaultData() {
    const db = await this.init();

    // 카테고리 초기화
    const categories = await db.getAllAsync<Category>('SELECT * FROM categories LIMIT 1');
    if (categories.length === 0) {
      await db.execAsync(`
        INSERT INTO categories (name, type, color, excludeFromStats, isFixedExpense) VALUES
        ('급여', 'income', '#10b981', 0, 0),
        ('부수입', 'income', '#3b82f6', 0, 0),
        ('용돈', 'income', '#8b5cf6', 0, 0),
        ('식비', 'expense', '#ef4444', 0, 0),
        ('교통', 'expense', '#f59e0b', 0, 0),
        ('쇼핑', 'expense', '#ec4899', 0, 0),
        ('의료', 'expense', '#14b8a6', 0, 0),
        ('문화', 'expense', '#6366f1', 0, 0),
        ('교육', 'expense', '#8b5cf6', 0, 0),
        ('통신', 'expense', '#06b6d4', 0, 1),
        ('주거', 'expense', '#f97316', 0, 1),
        ('보험', 'expense', '#84cc16', 0, 1),
        ('계좌이체', 'expense', '#6b7280', 1, 0),
        ('기타', 'expense', '#6b7280', 0, 0);
      `);
    }

    // 계좌 초기화
    const accounts = await db.getAllAsync<Account>('SELECT * FROM accounts LIMIT 1');
    if (accounts.length === 0) {
      await db.execAsync(`
        INSERT INTO accounts (name, type, color, createdAt) VALUES
        ('현금', 'cash', '#10b981', datetime('now')),
        ('신용카드', 'card', '#3b82f6', datetime('now'));
      `);
    }
  }

  // ===== 카테고리 관리 =====

  async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    const db = await this.init();
    const query = type
      ? 'SELECT * FROM categories WHERE categories.type = ? ORDER BY name'
      : 'SELECT * FROM categories ORDER BY categories.type, name';

    return type
      ? await db.getAllAsync<Category>(query, [type])
      : await db.getAllAsync<Category>(query);
  }

  async getCategoryById(id: number): Promise<Category | null> {
    const db = await this.init();
    const result = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
    return result || null;
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO categories (name, type, color, icon, excludeFromStats, isFixedExpense) VALUES (?, ?, ?, ?, ?, ?)',
      [category.name, category.type, category.color, category.icon || null, category.excludeFromStats ? 1 : 0, category.isFixedExpense ? 1 : 0]
    );
    return result.lastInsertRowId;
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.excludeFromStats !== undefined) {
      fields.push('excludeFromStats = ?');
      values.push(updates.excludeFromStats ? 1 : 0);
    }
    if (updates.isFixedExpense !== undefined) {
      fields.push('isFixedExpense = ?');
      values.push(updates.isFixedExpense ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteCategory(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }

  // ===== 계좌 관리 =====

  async getAccounts(): Promise<Account[]> {
    const db = await this.init();
    return await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY name');
  }

  async getAccountById(id: number): Promise<Account | null> {
    const db = await this.init();
    const result = await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
    return result || null;
  }

  async addAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO accounts (name, type, cardType, last4, color, createdAt) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
      [account.name, account.type, account.cardType || null, account.last4 || null, account.color || null]
    );
    return result.lastInsertRowId;
  }

  async updateAccount(id: number, updates: Partial<Account>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.cardType !== undefined) {
      fields.push('cardType = ?');
      values.push(updates.cardType);
    }
    if (updates.last4 !== undefined) {
      fields.push('last4 = ?');
      values.push(updates.last4);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteAccount(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  }

  // ===== 통장 관리 =====

  async getBankAccounts(activeOnly = false): Promise<BankAccount[]> {
    const db = await this.init();
    const query = activeOnly
      ? 'SELECT * FROM bank_accounts WHERE isActive = 1 ORDER BY name'
      : 'SELECT * FROM bank_accounts ORDER BY isActive DESC, name';
    return await db.getAllAsync<BankAccount>(query);
  }

  async getBankAccountById(id: number): Promise<BankAccount | null> {
    const db = await this.init();
    const result = await db.getFirstAsync<BankAccount>('SELECT * FROM bank_accounts WHERE id = ?', [id]);
    return result || null;
  }

  async addBankAccount(account: Omit<BankAccount, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO bank_accounts (name, accountType, bankName, accountNumber, balance, color, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [account.name, account.accountType, account.bankName || null, account.accountNumber || null, account.balance, account.color || null, account.isActive ? 1 : 0]
    );
    return result.lastInsertRowId;
  }

  async updateBankAccount(id: number, updates: Partial<BankAccount>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.accountType !== undefined) {
      fields.push('accountType = ?');
      values.push(updates.accountType);
    }
    if (updates.bankName !== undefined) {
      fields.push('bankName = ?');
      values.push(updates.bankName);
    }
    if (updates.accountNumber !== undefined) {
      fields.push('accountNumber = ?');
      values.push(updates.accountNumber);
    }
    if (updates.balance !== undefined) {
      fields.push('balance = ?');
      values.push(updates.balance);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteBankAccount(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM bank_accounts WHERE id = ?', [id]);
  }

  // ===== 거래 관리 =====

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO transactions (amount, type, categoryId, accountId, description, merchant, memo, date, tags, isTransfer, fromBankAccountId, toBankAccountId, status, cardName, cardNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
      [
        transaction.amount,
        transaction.type,
        transaction.categoryId,
        transaction.accountId || null,
        transaction.description || '',
        transaction.merchant || null,
        transaction.memo || null,
        transaction.date,
        transaction.tags || null,
        transaction.isTransfer ? 1 : 0,
        transaction.fromBankAccountId || null,
        transaction.toBankAccountId || null,
        transaction.status || 'confirmed',
        transaction.cardName || null,
        transaction.cardNumber || null,
      ]
    );
    return result.lastInsertRowId;
  }

  async getTransactions(startDate?: string, endDate?: string, includeExcluded = true): Promise<Transaction[]> {
    const db = await this.init();

    // 기본 쿼리 - 서브쿼리 제거로 성능 최적화
    let query = `
      SELECT
        t.id, t.amount, t.type as type, t.categoryId, t.accountId, t.description,
        t.merchant, t.memo, t.date, t.tags, t.isTransfer, t.fromBankAccountId,
        t.toBankAccountId, t.status, t.cardName, t.cardNumber, t.createdAt, t.updatedAt,
        c.name as categoryName, c.color as categoryColor, a.name as accountName,
        CASE WHEN t.status = 'excluded' THEN 1 ELSE 0 END as isExcluded
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
      LEFT JOIN accounts a ON t.accountId = a.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (startDate && endDate) {
      conditions.push('t.date >= ? AND t.date <= ?');
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push('t.date >= ?');
      params.push(startDate);
    } else if (endDate) {
      conditions.push('t.date <= ?');
      params.push(endDate);
    }

    if (!includeExcluded) {
      conditions.push("t.status != 'excluded'");
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.date DESC, t.createdAt DESC';

    const transactions = await db.getAllAsync<Transaction>(query, params);

    // 제외 패턴은 메모리에서 처리 (DB 쿼리 1회로 최적화)
    if (!includeExcluded) {
      const patterns = await this.getExclusionPatterns(true);
      if (patterns.length > 0) {
        return transactions.filter(tx => !this.matchesExclusionPattern(tx, patterns));
      }
    }

    return transactions;
  }

  // 제외 패턴 매칭 헬퍼 함수 (메모리에서 처리)
  private matchesExclusionPattern(tx: Transaction, patterns: ExclusionPattern[]): boolean {
    const merchantLower = (tx.merchant || '').toLowerCase();
    const memoLower = (tx.memo || '').toLowerCase();
    const accountLower = (tx.accountName || '').toLowerCase();

    for (const pattern of patterns) {
      const patternLower = pattern.pattern.toLowerCase();

      switch (pattern.type) {
        case 'merchant':
          if (merchantLower.includes(patternLower)) return true;
          break;
        case 'memo':
          if (memoLower.includes(patternLower)) return true;
          break;
        case 'account':
          if (accountLower.includes(patternLower)) return true;
          break;
        case 'both':
          if (merchantLower.includes(patternLower) || memoLower.includes(patternLower)) return true;
          break;
      }
    }
    return false;
  }

  async getTransactionById(id: number): Promise<Transaction | null> {
    const db = await this.init();
    const result = await db.getFirstAsync<Transaction>(
      `SELECT
        t.id, t.amount, t.type, t.categoryId, t.accountId, t.description,
        t.merchant, t.memo, t.date, t.tags, t.isTransfer, t.fromBankAccountId,
        t.toBankAccountId, t.status, t.cardName, t.cardNumber, t.createdAt, t.updatedAt,
        c.name as categoryName, c.color as categoryColor, a.name as accountName
       FROM transactions t
       LEFT JOIN categories c ON t.categoryId = c.id
       LEFT JOIN accounts a ON t.accountId = a.id
       WHERE t.id = ?`,
      [id]
    );
    return result || null;
  }

  async updateTransaction(id: number, transaction: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const db = await this.init();
    const fields: string[] = ['updatedAt = datetime(\'now\')'];
    const values: any[] = [];

    if (transaction.amount !== undefined) {
      fields.push('amount = ?');
      values.push(transaction.amount);
    }
    if (transaction.type !== undefined) {
      fields.push('type = ?');
      values.push(transaction.type);
    }
    if (transaction.categoryId !== undefined) {
      fields.push('categoryId = ?');
      values.push(transaction.categoryId);
    }
    if (transaction.accountId !== undefined) {
      fields.push('accountId = ?');
      values.push(transaction.accountId);
    }
    if (transaction.description !== undefined) {
      fields.push('description = ?');
      values.push(transaction.description);
    }
    if (transaction.merchant !== undefined) {
      fields.push('merchant = ?');
      values.push(transaction.merchant);
    }
    if (transaction.memo !== undefined) {
      fields.push('memo = ?');
      values.push(transaction.memo);
    }
    if (transaction.date !== undefined) {
      fields.push('date = ?');
      values.push(transaction.date);
    }
    if (transaction.tags !== undefined) {
      fields.push('tags = ?');
      values.push(transaction.tags);
    }
    if (transaction.isTransfer !== undefined) {
      fields.push('isTransfer = ?');
      values.push(transaction.isTransfer ? 1 : 0);
    }
    if (transaction.status !== undefined) {
      fields.push('status = ?');
      values.push(transaction.status);
    }
    if (transaction.cardName !== undefined) {
      fields.push('cardName = ?');
      values.push(transaction.cardName);
    }
    if (transaction.cardNumber !== undefined) {
      fields.push('cardNumber = ?');
      values.push(transaction.cardNumber);
    }

    values.push(id);
    await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async deleteTransaction(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async searchTransactions(keyword: string): Promise<Transaction[]> {
    const db = await this.init();
    const searchPattern = `%${keyword}%`;
    return await db.getAllAsync<Transaction>(
      `SELECT
        t.id, t.amount, t.type, t.categoryId, t.accountId, t.description,
        t.merchant, t.memo, t.date, t.tags, t.isTransfer, t.fromBankAccountId,
        t.toBankAccountId, t.status, t.cardName, t.cardNumber, t.createdAt, t.updatedAt,
        c.name as categoryName, c.color as categoryColor, a.name as accountName
       FROM transactions t
       LEFT JOIN categories c ON t.categoryId = c.id
       LEFT JOIN accounts a ON t.accountId = a.id
       WHERE t.description LIKE ? OR t.merchant LIKE ? OR c.name LIKE ?
       ORDER BY t.date DESC, t.createdAt DESC`,
      [searchPattern, searchPattern, searchPattern]
    );
  }

  // ===== 통계 =====

  async getMonthSummary(year: number, month: number): Promise<{ income: number; expense: number }> {
    const db = await this.init();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    // 최적화: 서브쿼리 제거, 메모리에서 제외 패턴 처리
    const transactions = await db.getAllAsync<{
      type: string;
      amount: number;
      merchant: string | null;
      memo: string | null;
      accountName: string | null;
      isTransfer: number;
      status: string | null;
    }>(
      `SELECT t.type, t.amount, t.merchant, t.memo, a.name as accountName, t.isTransfer, t.status
       FROM transactions t
       LEFT JOIN accounts a ON t.accountId = a.id
       WHERE t.date >= ? AND t.date <= ?
       AND t.isTransfer = 0
       AND (t.status IS NULL OR t.status != 'excluded')`,
      [startDate, endDate]
    );

    // 제외 패턴 로드 (1회만)
    const patterns = await this.getExclusionPatterns(true);

    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      // 제외 패턴 체크
      if (patterns.length > 0 && this.matchesExclusionPatternSimple(tx, patterns)) {
        continue;
      }

      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    }

    return { income, expense };
  }

  // 간단한 제외 패턴 매칭 (부분 데이터용)
  private matchesExclusionPatternSimple(
    tx: { merchant: string | null; memo: string | null; accountName: string | null },
    patterns: ExclusionPattern[]
  ): boolean {
    const merchantLower = (tx.merchant || '').toLowerCase();
    const memoLower = (tx.memo || '').toLowerCase();
    const accountLower = (tx.accountName || '').toLowerCase();

    for (const pattern of patterns) {
      const patternLower = pattern.pattern.toLowerCase();

      switch (pattern.type) {
        case 'merchant':
          if (merchantLower.includes(patternLower)) return true;
          break;
        case 'memo':
          if (memoLower.includes(patternLower)) return true;
          break;
        case 'account':
          if (accountLower.includes(patternLower)) return true;
          break;
        case 'both':
          if (merchantLower.includes(patternLower) || memoLower.includes(patternLower)) return true;
          break;
      }
    }
    return false;
  }

  async getCategoryStats(year: number, month: number) {
    const db = await this.init();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    // 최적화: 서브쿼리 제거, 개별 거래 로드 후 메모리에서 처리
    const transactions = await db.getAllAsync<{
      categoryId: number;
      categoryName: string;
      categoryColor: string;
      isFixedExpense: number;
      amount: number;
      merchant: string | null;
      memo: string | null;
      accountName: string | null;
    }>(
      `SELECT
        c.id as categoryId,
        c.name as categoryName,
        c.color as categoryColor,
        c.isFixedExpense as isFixedExpense,
        t.amount,
        t.merchant,
        t.memo,
        a.name as accountName
       FROM transactions t
       JOIN categories c ON t.categoryId = c.id
       LEFT JOIN accounts a ON t.accountId = a.id
       WHERE t.date >= ? AND t.date <= ?
       AND t.type = 'expense'
       AND t.isTransfer = 0
       AND (t.status IS NULL OR t.status != 'excluded')`,
      [startDate, endDate]
    );

    // 제외 패턴 로드 (1회만)
    const patterns = await this.getExclusionPatterns(true);

    // 카테고리별 집계 (메모리에서 처리)
    const categoryMap = new Map<number, {
      categoryName: string;
      categoryColor: string;
      categoryId: number;
      total: number;
      count: number;
      isFixedExpense: number;
    }>();

    for (const tx of transactions) {
      // 제외 패턴 체크
      if (patterns.length > 0 && this.matchesExclusionPatternSimple(tx, patterns)) {
        continue;
      }

      const existing = categoryMap.get(tx.categoryId);
      if (existing) {
        existing.total += tx.amount;
        existing.count += 1;
      } else {
        categoryMap.set(tx.categoryId, {
          categoryId: tx.categoryId,
          categoryName: tx.categoryName,
          categoryColor: tx.categoryColor,
          isFixedExpense: tx.isFixedExpense,
          total: tx.amount,
          count: 1,
        });
      }
    }

    // 배열로 변환 후 정렬
    const stats = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

    // 총 지출 계산 및 퍼센티지 추가
    const totalExpense = stats.reduce((sum, stat) => sum + stat.total, 0);
    return stats.map(stat => ({
      ...stat,
      isFixedExpense: stat.isFixedExpense === 1,
      percentage: totalExpense > 0 ? (stat.total / totalExpense) * 100 : 0
    }));
  }

  // ===== 예산 관리 =====

  async getBudgets(month: string): Promise<Budget[]> {
    const db = await this.init();
    return await db.getAllAsync<Budget>(
      `SELECT b.*, c.name as categoryName
       FROM budgets b
       LEFT JOIN categories c ON b.categoryId = c.id
       WHERE b.month = ?
       ORDER BY c.name`,
      [month]
    );
  }

  async addBudget(budget: Omit<Budget, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO budgets (month, categoryId, limitAmount, createdAt) VALUES (?, ?, ?, datetime(\'now\'))',
      [budget.month, budget.categoryId, budget.limitAmount]
    );
    return result.lastInsertRowId;
  }

  async updateBudget(id: number, limitAmount: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('UPDATE budgets SET limitAmount = ? WHERE id = ?', [limitAmount, id]);
  }

  async deleteBudget(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
  }

  // ===== 반복 거래 =====

  async getRecurringTransactions(activeOnly = false): Promise<RecurringTransaction[]> {
    const db = await this.init();
    const query = activeOnly
      ? `SELECT r.*, c.name as categoryName
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.categoryId = c.id
         WHERE r.isActive = 1
         ORDER BY r.name`
      : `SELECT r.*, c.name as categoryName
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.categoryId = c.id
         ORDER BY r.isActive DESC, r.name`;
    return await db.getAllAsync<RecurringTransaction>(query);
  }

  async addRecurringTransaction(recurring: Omit<RecurringTransaction, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO recurring_transactions (name, amount, type, categoryId, accountId, frequency, dayOfMonth, dayOfWeek, startDate, endDate, lastRun, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [
        recurring.name,
        recurring.amount,
        recurring.type,
        recurring.categoryId,
        recurring.accountId,
        recurring.frequency,
        recurring.dayOfMonth || null,
        recurring.dayOfWeek || null,
        recurring.startDate,
        recurring.endDate || null,
        recurring.lastRun || null,
        recurring.isActive ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  }

  async updateRecurringTransaction(id: number, updates: Partial<RecurringTransaction>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.lastRun !== undefined) {
      fields.push('lastRun = ?');
      values.push(updates.lastRun);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteRecurringTransaction(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
  }

  // ===== 규칙 =====

  async getRules(activeOnly = false): Promise<Rule[]> {
    const db = await this.init();
    const query = activeOnly
      ? `SELECT r.*, c.name as assignCategoryName
         FROM rules r
         LEFT JOIN categories c ON r.assignCategoryId = c.id
         WHERE r.isActive = 1
         ORDER BY r.priority DESC, r.id`
      : `SELECT r.*, c.name as assignCategoryName
         FROM rules r
         LEFT JOIN categories c ON r.assignCategoryId = c.id
         ORDER BY r.isActive DESC, r.priority DESC, r.id`;
    return await db.getAllAsync<Rule>(query);
  }

  async addRule(rule: Omit<Rule, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO rules (pattern, checkMerchant, checkMemo, assignCategoryId, priority, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [rule.pattern, rule.checkMerchant ? 1 : 0, rule.checkMemo ? 1 : 0, rule.assignCategoryId, rule.priority, rule.isActive ? 1 : 0]
    );
    return result.lastInsertRowId;
  }

  async updateRule(id: number, updates: Partial<Rule>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.pattern !== undefined) {
      fields.push('pattern = ?');
      values.push(updates.pattern);
    }
    if (updates.assignCategoryId !== undefined) {
      fields.push('assignCategoryId = ?');
      values.push(updates.assignCategoryId);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteRule(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM rules WHERE id = ?', [id]);
  }

  // 기존 거래에 카테고리 규칙 적용
  async applyCategoryRulesToExistingTransactions(): Promise<{ updated: number; details: Array<{ rulePattern: string; count: number }> }> {
    const db = await this.init();
    const rules = await this.getRules(true); // 활성화된 규칙만

    let totalUpdated = 0;
    const details: Array<{ rulePattern: string; count: number }> = [];

    for (const rule of rules) {
      let query = 'UPDATE transactions SET categoryId = ?, updatedAt = datetime(\'now\') WHERE ';
      const conditions: string[] = [];

      if (rule.checkMerchant) {
        conditions.push('merchant LIKE ?');
      }
      if (rule.checkMemo) {
        conditions.push('memo LIKE ?');
      }

      if (conditions.length === 0) continue;

      query += `(${conditions.join(' OR ')})`;

      const params: any[] = [rule.assignCategoryId];
      if (rule.checkMerchant) {
        params.push(`%${rule.pattern}%`);
      }
      if (rule.checkMemo) {
        params.push(`%${rule.pattern}%`);
      }

      const result = await db.runAsync(query, params);
      const count = result.changes;
      totalUpdated += count;

      if (count > 0) {
        details.push({
          rulePattern: rule.pattern,
          count: count,
        });
      }
    }

    return { updated: totalUpdated, details };
  }

  // 기존 거래에 제외 규칙 적용
  async applyExclusionPatternsToExistingTransactions(): Promise<{ updated: number; details: Array<{ pattern: string; count: number }> }> {
    const db = await this.init();
    const patterns = await this.getExclusionPatterns(true); // 활성화된 패턴만

    let totalUpdated = 0;
    const details: Array<{ pattern: string; count: number }> = [];

    for (const exclusion of patterns) {
      let query = '';
      const params: any[] = [];

      if (exclusion.type === 'merchant') {
        query = 'UPDATE transactions SET status = \'excluded\', updatedAt = datetime(\'now\') WHERE (status IS NULL OR status != \'excluded\') AND merchant LIKE ?';
        params.push(`%${exclusion.pattern}%`);
      } else if (exclusion.type === 'memo') {
        query = 'UPDATE transactions SET status = \'excluded\', updatedAt = datetime(\'now\') WHERE (status IS NULL OR status != \'excluded\') AND memo LIKE ?';
        params.push(`%${exclusion.pattern}%`);
      } else if (exclusion.type === 'both') {
        query = 'UPDATE transactions SET status = \'excluded\', updatedAt = datetime(\'now\') WHERE (status IS NULL OR status != \'excluded\') AND (merchant LIKE ? OR memo LIKE ?)';
        params.push(`%${exclusion.pattern}%`, `%${exclusion.pattern}%`);
      } else if (exclusion.type === 'account') {
        query = 'UPDATE transactions SET status = \'excluded\', updatedAt = datetime(\'now\') WHERE id IN (SELECT t.id FROM transactions t LEFT JOIN accounts a ON t.accountId = a.id WHERE (t.status IS NULL OR t.status != \'excluded\') AND a.name LIKE ?)';
        params.push(`%${exclusion.pattern}%`);
      }

      if (!query) continue;

      const result = await db.runAsync(query, params);
      const count = result.changes;
      totalUpdated += count;

      if (count > 0) {
        details.push({
          pattern: exclusion.pattern,
          count: count,
        });
      }
    }

    return { updated: totalUpdated, details };
  }

  // ===== 영수증 관리 =====

  async getReceipts(): Promise<Receipt[]> {
    const db = await this.init();
    return await db.getAllAsync<Receipt>(
      'SELECT * FROM receipts ORDER BY uploadedAt DESC'
    );
  }

  async getReceipt(id: number): Promise<Receipt | null> {
    const db = await this.init();
    return await db.getFirstAsync<Receipt>(
      'SELECT * FROM receipts WHERE id = ?',
      [id]
    );
  }

  async addReceipt(receipt: Omit<Receipt, 'id'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      `INSERT INTO receipts (url, mime, size, ocrText, ocrAmount, ocrDate, ocrMerchant,
        ocrCardNumber, ocrConfidence, linkedTxId, uploadedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receipt.url,
        receipt.mime,
        receipt.size,
        receipt.ocrText || null,
        receipt.ocrAmount || null,
        receipt.ocrDate || null,
        receipt.ocrMerchant || null,
        receipt.ocrCardNumber || null,
        receipt.ocrConfidence || null,
        receipt.linkedTxId || null,
        receipt.uploadedAt,
      ]
    );
    return result.lastInsertRowId;
  }

  async updateReceipt(id: number, updates: Partial<Omit<Receipt, 'id'>>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.linkedTxId !== undefined) {
      fields.push('linkedTxId = ?');
      values.push(updates.linkedTxId);
    }
    if (updates.ocrText !== undefined) {
      fields.push('ocrText = ?');
      values.push(updates.ocrText);
    }
    if (updates.ocrAmount !== undefined) {
      fields.push('ocrAmount = ?');
      values.push(updates.ocrAmount);
    }
    if (updates.ocrDate !== undefined) {
      fields.push('ocrDate = ?');
      values.push(updates.ocrDate);
    }
    if (updates.ocrMerchant !== undefined) {
      fields.push('ocrMerchant = ?');
      values.push(updates.ocrMerchant);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE receipts SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteReceipt(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
  }

  // ===== 제외 패턴 관리 =====

  async getExclusionPatterns(activeOnly = false): Promise<ExclusionPattern[]> {
    const db = await this.init();
    const query = activeOnly
      ? 'SELECT * FROM exclusion_patterns WHERE isActive = 1 ORDER BY id DESC'
      : 'SELECT * FROM exclusion_patterns ORDER BY isActive DESC, id DESC';
    return await db.getAllAsync<ExclusionPattern>(query);
  }

  async addExclusionPattern(pattern: Omit<ExclusionPattern, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO exclusion_patterns (pattern, type, isActive, createdAt) VALUES (?, ?, ?, datetime(\'now\'))',
      [pattern.pattern, pattern.type, pattern.isActive ? 1 : 0]
    );
    return result.lastInsertRowId;
  }

  async updateExclusionPattern(id: number, updates: Partial<ExclusionPattern>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.pattern !== undefined) {
      fields.push('pattern = ?');
      values.push(updates.pattern);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE exclusion_patterns SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteExclusionPattern(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM exclusion_patterns WHERE id = ?', [id]);
  }
}

export const database = new Database();
