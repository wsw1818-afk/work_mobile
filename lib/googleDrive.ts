// Google Drive 백업/복원 기능
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backupManager, BackupData, BackupResult, RestoreResult } from './backup';

// Google Drive API 설정
const GOOGLE_DRIVE_API_KEY = 'AIzaSyBcsEnQadB53AM8JSMfj2PLs6s9xyUMDr4';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const BACKUP_FOLDER_NAME = 'GagyebuBackups';

// Google Drive 결과 타입
export interface GoogleDriveResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  error?: string;
}

// Google Drive 파일 정보
export interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: string;
}

class GoogleDriveManager {
  private accessToken: string | null = null;

  // 액세스 토큰 설정
  setAccessToken(token: string) {
    this.accessToken = token;
    AsyncStorage.setItem('googleDriveAccessToken', token);
  }

  // 저장된 액세스 토큰 로드
  async loadAccessToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;

    const token = await AsyncStorage.getItem('googleDriveAccessToken');
    if (token) {
      this.accessToken = token;
    }
    return this.accessToken;
  }

  // 로그인 상태 확인
  async isLoggedIn(): Promise<boolean> {
    const token = await this.loadAccessToken();
    return !!token;
  }

  // 로그아웃
  async logout() {
    this.accessToken = null;
    await AsyncStorage.removeItem('googleDriveAccessToken');
  }

  // 백업 폴더 찾기 또는 생성
  private async getOrCreateBackupFolder(): Promise<string | null> {
    if (!this.accessToken) return null;

    try {
      // 폴더 검색
      const searchResponse = await fetch(
        `${GOOGLE_DRIVE_API_URL}?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&key=${GOOGLE_DRIVE_API_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      const searchResult = await searchResponse.json();

      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0].id;
      }

      // 폴더 생성
      const createResponse = await fetch(
        `${GOOGLE_DRIVE_API_URL}?key=${GOOGLE_DRIVE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: BACKUP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          }),
        }
      );

      const createResult = await createResponse.json();
      return createResult.id;
    } catch (error) {
      console.error('폴더 생성 실패:', error);
      return null;
    }
  }

  // Google Drive에 백업 업로드
  async uploadBackup(): Promise<GoogleDriveResult> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'Google 로그인이 필요합니다.',
      };
    }

    try {
      // 백업 데이터 생성
      const backupData = await backupManager.exportToJson();
      const jsonString = JSON.stringify(backupData, null, 2);

      // 백업 폴더 가져오기
      const folderId = await this.getOrCreateBackupFolder();
      if (!folderId) {
        return {
          success: false,
          error: '백업 폴더를 생성할 수 없습니다.',
        };
      }

      // 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `gagyebu_backup_${timestamp}.json`;

      // 멀티파트 업로드
      const boundary = '-------314159265358979323846';
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
      };

      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${jsonString}\r\n` +
        `--${boundary}--`;

      const response = await fetch(
        `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&key=${GOOGLE_DRIVE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '업로드 실패');
      }

      const result = await response.json();

      return {
        success: true,
        fileId: result.id,
        fileName,
      };
    } catch (error) {
      console.error('Google Drive 업로드 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // Google Drive 백업 파일 목록 조회
  async listBackups(): Promise<GoogleDriveFile[]> {
    if (!this.accessToken) return [];

    try {
      const folderId = await this.getOrCreateBackupFolder();
      if (!folderId) return [];

      const response = await fetch(
        `${GOOGLE_DRIVE_API_URL}?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,modifiedTime,size)&key=${GOOGLE_DRIVE_API_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('백업 목록 조회 실패:', error);
      return [];
    }
  }

  // Google Drive에서 백업 다운로드 및 복원
  async downloadAndRestore(fileId: string): Promise<RestoreResult> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'Google 로그인이 필요합니다.',
      };
    }

    try {
      // 파일 다운로드
      const response = await fetch(
        `${GOOGLE_DRIVE_API_URL}/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('파일 다운로드 실패');
      }

      const jsonString = await response.text();
      const backupData: BackupData = JSON.parse(jsonString);

      // 버전 확인
      if (!backupData.version || !backupData.data) {
        return {
          success: false,
          error: '올바르지 않은 백업 파일입니다.',
        };
      }

      // 복원 실행 (backupManager의 private 메서드를 사용할 수 없으므로 직접 구현)
      return await this.restoreData(backupData);
    } catch (error) {
      console.error('Google Drive 복원 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // 백업 데이터를 DB에 복원 (backupManager와 동일한 로직)
  private async restoreData(backupData: BackupData): Promise<RestoreResult> {
    // backupManager의 restoreFromFile을 활용하기 위해
    // 임시 파일로 저장 후 복원
    try {
      const tempPath = `${FileSystem.cacheDirectory}temp_restore.json`;
      await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(backupData), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // backupManager를 사용하여 복원
      // 직접 DB 복원 로직 실행
      const { database } = require('./db/database');
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

      await db.execAsync('BEGIN TRANSACTION');

      // 기존 데이터 삭제
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

      // 임시 파일 삭제
      await FileSystem.deleteAsync(tempPath, { idempotent: true });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('데이터 복원 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // Google Drive 백업 파일 삭제
  async deleteBackup(fileId: string): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        `${GOOGLE_DRIVE_API_URL}/${fileId}?key=${GOOGLE_DRIVE_API_KEY}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('백업 삭제 실패:', error);
      return false;
    }
  }
}

export const googleDriveManager = new GoogleDriveManager();
