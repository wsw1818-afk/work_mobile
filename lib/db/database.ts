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
  type: 'income' | 'expense';
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
  accountId?: number;
  accountName?: string;
  description: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
  tags?: string; // JSON array
  isTransfer?: boolean;
  fromBankAccountId?: number;
  toBankAccountId?: number;
  createdAt: string;
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
  ocrText?: string;
  ocrAmount?: number;
  ocrDate?: string;
  ocrMerchant?: string;
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
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        categoryId INTEGER NOT NULL,
        accountId INTEGER,
        description TEXT,
        merchant TEXT,
        date TEXT NOT NULL,
        tags TEXT,
        isTransfer INTEGER DEFAULT 0,
        fromBankAccountId INTEGER,
        toBankAccountId INTEGER,
        createdAt TEXT NOT NULL,
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
        ocrText TEXT,
        ocrAmount REAL,
        ocrDate TEXT,
        ocrMerchant TEXT,
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

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryId);
      CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
      CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(isActive);
    `);

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
      ? 'SELECT * FROM categories WHERE type = ? ORDER BY name'
      : 'SELECT * FROM categories ORDER BY type, name';

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

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.init();
    const result = await db.runAsync(
      'INSERT INTO transactions (amount, type, categoryId, accountId, description, merchant, date, tags, isTransfer, fromBankAccountId, toBankAccountId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [
        transaction.amount,
        transaction.type,
        transaction.categoryId,
        transaction.accountId || null,
        transaction.description || '',
        transaction.merchant || null,
        transaction.date,
        transaction.tags || null,
        transaction.isTransfer ? 1 : 0,
        transaction.fromBankAccountId || null,
        transaction.toBankAccountId || null,
      ]
    );
    return result.lastInsertRowId;
  }

  async getTransactions(startDate?: string, endDate?: string): Promise<Transaction[]> {
    const db = await this.init();
    let query = `
      SELECT t.*, c.name as categoryName, c.color as categoryColor, a.name as accountName
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
      LEFT JOIN accounts a ON t.accountId = a.id
    `;

    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE t.date >= ? AND t.date <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' WHERE t.date >= ?';
      params.push(startDate);
    } else if (endDate) {
      query += ' WHERE t.date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY t.date DESC, t.createdAt DESC';

    return await db.getAllAsync<Transaction>(query, params);
  }

  async getTransactionById(id: number): Promise<Transaction | null> {
    const db = await this.init();
    const result = await db.getFirstAsync<Transaction>(
      `SELECT t.*, c.name as categoryName, c.color as categoryColor, a.name as accountName
       FROM transactions t
       LEFT JOIN categories c ON t.categoryId = c.id
       LEFT JOIN accounts a ON t.accountId = a.id
       WHERE t.id = ?`,
      [id]
    );
    return result || null;
  }

  async updateTransaction(id: number, transaction: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
    const db = await this.init();
    const fields: string[] = [];
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

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteTransaction(id: number): Promise<void> {
    const db = await this.init();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async searchTransactions(keyword: string): Promise<Transaction[]> {
    const db = await this.init();
    const searchPattern = `%${keyword}%`;
    return await db.getAllAsync<Transaction>(
      `SELECT t.*, c.name as categoryName, c.color as categoryColor, a.name as accountName
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

    const result = await db.getFirstAsync<{ income: number; expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions t
       LEFT JOIN categories c ON t.categoryId = c.id
       WHERE t.date >= ? AND t.date <= ?
       AND (c.excludeFromStats IS NULL OR c.excludeFromStats = 0)
       AND t.isTransfer = 0`,
      [startDate, endDate]
    );

    return result || { income: 0, expense: 0 };
  }

  async getCategoryStats(year: number, month: number) {
    const db = await this.init();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    return await db.getAllAsync(
      `SELECT
        c.name as categoryName,
        c.color as categoryColor,
        c.id as categoryId,
        SUM(t.amount) as total,
        COUNT(t.id) as count
       FROM transactions t
       JOIN categories c ON t.categoryId = c.id
       WHERE t.type = 'expense'
       AND t.date >= ? AND t.date <= ?
       AND (c.excludeFromStats IS NULL OR c.excludeFromStats = 0)
       AND t.isTransfer = 0
       GROUP BY c.id
       ORDER BY total DESC`,
      [startDate, endDate]
    );
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
}

export const database = new Database();
