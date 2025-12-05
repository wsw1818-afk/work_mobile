// 백업 및 복원 유틸리티
import * as FileSystemModule from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { database } from './db/database';

// expo-file-system 타입 정의 불일치 우회 (런타임 정상 작동)
const FileSystem = FileSystemModule as any;

// 백업 파일 버전 (향후 마이그레이션용)
const BACKUP_VERSION = '1.0';

// 백업 데이터 타입
export interface BackupData {
  version: string;
  createdAt: string;
  appVersion: string;
  data: {
    categories: any[];
    accounts: any[];
    bankAccounts: any[];
    transactions: any[];
    budgets: any[];
    recurringTransactions: any[];
    receipts: any[];
    rules: any[];
    exclusionPatterns: any[];
    expenseGroups: any[];
  };
}

// 백업 결과 타입
export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

// 복원 결과 타입
export interface RestoreResult {
  success: boolean;
  stats?: {
    categories: number;
    accounts: number;
    bankAccounts: number;
    transactions: number;
    budgets: number;
    recurringTransactions: number;
    receipts: number;
    rules: number;
    exclusionPatterns: number;
    expenseGroups: number;
  };
  error?: string;
}

class BackupManager {
  // 모든 데이터를 JSON으로 내보내기
  async exportToJson(): Promise<BackupData> {
    const db = await database.init();

    // 모든 테이블에서 데이터 가져오기
    const [
      categories,
      accounts,
      bankAccounts,
      transactions,
      budgets,
      recurringTransactions,
      receipts,
      rules,
      exclusionPatterns,
      expenseGroups,
    ] = await Promise.all([
      db.getAllAsync('SELECT * FROM categories'),
      db.getAllAsync('SELECT * FROM accounts'),
      db.getAllAsync('SELECT * FROM bank_accounts'),
      db.getAllAsync('SELECT * FROM transactions'),
      db.getAllAsync('SELECT * FROM budgets'),
      db.getAllAsync('SELECT * FROM recurring_transactions'),
      db.getAllAsync('SELECT * FROM receipts'),
      db.getAllAsync('SELECT * FROM rules'),
      db.getAllAsync('SELECT * FROM exclusion_patterns'),
      db.getAllAsync('SELECT * FROM expense_groups'),
    ]);

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {
        categories: categories as any[],
        accounts: accounts as any[],
        bankAccounts: bankAccounts as any[],
        transactions: transactions as any[],
        budgets: budgets as any[],
        recurringTransactions: recurringTransactions as any[],
        receipts: receipts as any[],
        rules: rules as any[],
        exclusionPatterns: exclusionPatterns as any[],
        expenseGroups: expenseGroups as any[],
      },
    };
  }

  // 로컬 파일로 백업 저장
  async saveBackupToFile(): Promise<BackupResult> {
    try {
      const backupData = await this.exportToJson();
      const jsonString = JSON.stringify(backupData, null, 2);

      // 파일명 생성 (타임스탬프 포함)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `gagyebu_backup_${timestamp}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      // 파일 저장
      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error) {
      console.error('백업 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 앱 전용 백업 폴더에 자동 저장
  async saveBackupToDownloads(): Promise<BackupResult> {
    try {
      const backupData = await this.exportToJson();
      const jsonString = JSON.stringify(backupData, null, 2);

      // 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `gagyebu_backup_${timestamp}.json`;

      // 앱 전용 백업 폴더 경로 (앱 내부 저장소)
      const backupFolderPath = `${FileSystem.documentDirectory}backups/`;

      // 폴더 존재 여부 확인 및 생성
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupFolderPath, { intermediates: true });
      }

      // 파일 저장
      const filePath = `${backupFolderPath}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return {
        success: true,
        filePath,
        fileName,
      };
    } catch (error) {
      console.error('백업 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 외부 다운로드 폴더에 백업 저장 (SAF 사용 - 사용자가 폴더 선택)
  async saveBackupToExternalDownloads(): Promise<BackupResult> {
    try {
      const backupData = await this.exportToJson();
      const jsonString = JSON.stringify(backupData, null, 2);

      // 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `gagyebu_backup_${timestamp}.json`;

      // SAF를 통해 저장 위치 선택
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        return {
          success: false,
          error: '저장 위치 접근 권한이 거부되었습니다.',
        };
      }

      // 파일 생성 및 저장
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/json'
      );

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return {
        success: true,
        filePath: fileUri,
        fileName,
      };
    } catch (error) {
      console.error('백업 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 파일에서 백업 복원
  async restoreFromFile(): Promise<RestoreResult> {
    try {
      // 파일 선택
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: '파일 선택이 취소되었습니다.',
        };
      }

      const fileUri = result.assets[0].uri;

      // 파일 읽기
      const jsonString = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // JSON 파싱
      const backupData: BackupData = JSON.parse(jsonString);

      // 버전 확인
      if (!backupData.version || !backupData.data) {
        return {
          success: false,
          error: '올바르지 않은 백업 파일입니다.',
        };
      }

      // 데이터 복원
      return await this.restoreData(backupData);
    } catch (error) {
      console.error('복원 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 백업 데이터를 DB에 복원
  private async restoreData(backupData: BackupData): Promise<RestoreResult> {
    const db = await database.init();
    const stats = {
      categories: 0,
      accounts: 0,
      bankAccounts: 0,
      transactions: 0,
      budgets: 0,
      recurringTransactions: 0,
      receipts: 0,
      rules: 0,
      exclusionPatterns: 0,
      expenseGroups: 0,
    };

    try {
      // 트랜잭션으로 복원 (롤백 가능)
      await db.execAsync('BEGIN TRANSACTION');

      // 기존 데이터 삭제 (순서 중요 - FK 제약)
      await db.execAsync('DELETE FROM transactions');
      await db.execAsync('DELETE FROM budgets');
      await db.execAsync('DELETE FROM recurring_transactions');
      await db.execAsync('DELETE FROM receipts');
      await db.execAsync('DELETE FROM rules');
      await db.execAsync('DELETE FROM exclusion_patterns');
      await db.execAsync('DELETE FROM accounts');
      await db.execAsync('DELETE FROM bank_accounts');
      await db.execAsync('DELETE FROM categories');
      await db.execAsync('DELETE FROM expense_groups');

      // expense_groups 복원
      for (const group of backupData.data.expenseGroups || []) {
        await db.runAsync(
          `INSERT INTO expense_groups (id, name, color, icon, sortOrder, isDefault, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [group.id, group.name, group.color, group.icon, group.sortOrder, group.isDefault, group.createdAt]
        );
        stats.expenseGroups++;
      }

      // categories 복원
      for (const cat of backupData.data.categories || []) {
        await db.runAsync(
          `INSERT INTO categories (id, name, type, color, icon, excludeFromStats, isFixedExpense, groupId, showOnDashboard)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cat.id, cat.name, cat.type, cat.color, cat.icon, cat.excludeFromStats || 0, cat.isFixedExpense || 0, cat.groupId, cat.showOnDashboard ?? 1]
        );
        stats.categories++;
      }

      // bank_accounts 복원
      for (const ba of backupData.data.bankAccounts || []) {
        await db.runAsync(
          `INSERT INTO bank_accounts (id, name, accountType, bankName, accountNumber, balance, color, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ba.id, ba.name, ba.accountType, ba.bankName, ba.accountNumber, ba.balance, ba.color, ba.isActive, ba.createdAt]
        );
        stats.bankAccounts++;
      }

      // accounts 복원
      for (const acc of backupData.data.accounts || []) {
        await db.runAsync(
          `INSERT INTO accounts (id, name, type, cardType, last4, color, bankAccountId, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [acc.id, acc.name, acc.type, acc.cardType, acc.last4, acc.color, acc.bankAccountId, acc.createdAt]
        );
        stats.accounts++;
      }

      // transactions 복원
      for (const tx of backupData.data.transactions || []) {
        await db.runAsync(
          `INSERT INTO transactions (id, amount, type, categoryId, accountId, description, merchant, memo, date, tags, isTransfer, fromBankAccountId, toBankAccountId, status, cardName, cardNumber, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tx.id, tx.amount, tx.type, tx.categoryId, tx.accountId, tx.description, tx.merchant, tx.memo, tx.date, tx.tags, tx.isTransfer || 0, tx.fromBankAccountId, tx.toBankAccountId, tx.status || 'confirmed', tx.cardName, tx.cardNumber, tx.createdAt, tx.updatedAt]
        );
        stats.transactions++;
      }

      // budgets 복원
      for (const budget of backupData.data.budgets || []) {
        await db.runAsync(
          `INSERT INTO budgets (id, month, categoryId, limitAmount, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [budget.id, budget.month, budget.categoryId, budget.limitAmount, budget.createdAt]
        );
        stats.budgets++;
      }

      // recurring_transactions 복원
      for (const rt of backupData.data.recurringTransactions || []) {
        await db.runAsync(
          `INSERT INTO recurring_transactions (id, name, amount, type, categoryId, accountId, frequency, dayOfMonth, dayOfWeek, startDate, endDate, lastRun, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [rt.id, rt.name, rt.amount, rt.type, rt.categoryId, rt.accountId, rt.frequency, rt.dayOfMonth, rt.dayOfWeek, rt.startDate, rt.endDate, rt.lastRun, rt.isActive, rt.createdAt]
        );
        stats.recurringTransactions++;
      }

      // receipts 복원
      for (const receipt of backupData.data.receipts || []) {
        await db.runAsync(
          `INSERT INTO receipts (id, url, mime, size, ocrText, ocrAmount, ocrDate, ocrMerchant, ocrCardNumber, ocrConfidence, linkedTxId, uploadedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [receipt.id, receipt.url, receipt.mime, receipt.size, receipt.ocrText, receipt.ocrAmount, receipt.ocrDate, receipt.ocrMerchant, receipt.ocrCardNumber, receipt.ocrConfidence, receipt.linkedTxId, receipt.uploadedAt]
        );
        stats.receipts++;
      }

      // rules 복원
      for (const rule of backupData.data.rules || []) {
        await db.runAsync(
          `INSERT INTO rules (id, pattern, checkMerchant, checkMemo, assignCategoryId, priority, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [rule.id, rule.pattern, rule.checkMerchant, rule.checkMemo, rule.assignCategoryId, rule.priority, rule.isActive, rule.createdAt]
        );
        stats.rules++;
      }

      // exclusion_patterns 복원
      for (const ep of backupData.data.exclusionPatterns || []) {
        await db.runAsync(
          `INSERT INTO exclusion_patterns (id, pattern, type, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [ep.id, ep.pattern, ep.type, ep.isActive, ep.createdAt]
        );
        stats.exclusionPatterns++;
      }

      await db.execAsync('COMMIT');

      return {
        success: true,
        stats,
      };
    } catch (error) {
      // 롤백
      await db.execAsync('ROLLBACK');
      console.error('데이터 복원 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 백업 파일 목록 조회 (앱 내부 저장소의 backups 폴더)
  async getBackupFiles(): Promise<string[]> {
    try {
      const backupFolderPath = `${FileSystem.documentDirectory}backups/`;

      // 폴더 존재 여부 확인
      const folderInfo = await FileSystem.getInfoAsync(backupFolderPath);
      if (!folderInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(backupFolderPath);
      return files.filter((f: string) => f.startsWith('gagyebu_backup_') && f.endsWith('.json'));
    } catch {
      return [];
    }
  }

  // 백업 파일 삭제
  async deleteBackupFile(fileName: string): Promise<boolean> {
    try {
      const filePath = `${FileSystem.documentDirectory}backups/${fileName}`;
      await FileSystem.deleteAsync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 백업 파일을 다른 앱으로 공유 (카카오톡, 이메일 등)
  async shareBackup(): Promise<BackupResult> {
    try {
      // 공유 가능 여부 확인
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return {
          success: false,
          error: '이 기기에서는 공유 기능을 사용할 수 없습니다.',
        };
      }

      // 먼저 백업 파일 생성
      const saveResult = await this.saveBackupToFile();
      if (!saveResult.success || !saveResult.filePath) {
        return saveResult;
      }

      // 공유 다이얼로그 열기
      await Sharing.shareAsync(saveResult.filePath, {
        mimeType: 'application/json',
        dialogTitle: '가계부 백업 파일 공유',
        UTI: 'public.json',
      });

      return {
        success: true,
        filePath: saveResult.filePath,
        fileName: saveResult.fileName,
      };
    } catch (error) {
      console.error('백업 공유 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }
}

export const backupManager = new BackupManager();
