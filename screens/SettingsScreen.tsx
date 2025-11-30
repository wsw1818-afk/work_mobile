import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Divider,
  TextInput,
  Dialog,
  Portal,
  RadioButton,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../lib/db/database';
import { backupManager } from '../lib/backup';
import { googleDriveManager, GoogleDriveFile } from '../lib/googleDrive';
import { useGoogleAuth } from '../lib/hooks/useGoogleAuth';
import GoogleOAuthWebView from '../components/GoogleOAuthWebView';

export default function SettingsScreen({ navigation }: any) {
  // Google OAuth 훅 사용 (WebView 기반)
  const {
    isLoggedIn: isGoogleLoggedIn,
    isLoading: googleAuthLoading,
    accessToken,
    showWebView,
    openLoginWebView,
    closeLoginWebView,
    handleTokenReceived,
    logout: googleLogout,
  } = useGoogleAuth();

  // AI 설정 상태
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini'>('gemini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [showApiDialog, setShowApiDialog] = useState(false);

  // 백업/복원 상태
  const [backupLoading, setBackupLoading] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupMethod, setBackupMethod] = useState<'local' | 'share' | 'drive'>('local');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [driveBackups, setDriveBackups] = useState<GoogleDriveFile[]>([]);
  const [showDriveListDialog, setShowDriveListDialog] = useState(false);

  // accessToken이 변경되면 googleDriveManager에 설정
  useEffect(() => {
    if (accessToken) {
      googleDriveManager.setAccessToken(accessToken);
    }
  }, [accessToken]);

  // 초기 로드
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const provider = await AsyncStorage.getItem('aiProvider');
      const openaiKey = await AsyncStorage.getItem('openaiApiKey');
      const geminiKey = await AsyncStorage.getItem('geminiApiKey');
      const model = await AsyncStorage.getItem('aiModel');

      if (provider) setAiProvider(provider as 'openai' | 'gemini');
      if (openaiKey) setOpenaiApiKey(openaiKey);
      if (geminiKey) setGeminiApiKey(geminiKey);
      if (model) setAiModel(model);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('aiProvider', aiProvider);
      if (openaiApiKey) await AsyncStorage.setItem('openaiApiKey', openaiApiKey);
      if (geminiApiKey) await AsyncStorage.setItem('geminiApiKey', geminiApiKey);
      if (aiModel) await AsyncStorage.setItem('aiModel', aiModel);

      Alert.alert('성공', 'AI 설정이 저장되었습니다.');
      setShowApiDialog(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 데이터가 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await database.init();
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
              Alert.alert('성공', '데이터가 초기화되었습니다.');
            } catch (error) {
              console.error('Failed to reset data:', error);
              Alert.alert('오류', '데이터 초기화에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 백업 실행
  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      let result;

      switch (backupMethod) {
        case 'local':
          result = await backupManager.saveBackupToDownloads();
          break;
        case 'share':
          result = await backupManager.shareBackup();
          break;
        case 'drive':
          if (!isGoogleLoggedIn) {
            Alert.alert('알림', 'Google 로그인이 필요합니다.\n설정에서 Google Drive를 연결해주세요.');
            setBackupLoading(false);
            setShowBackupDialog(false);
            return;
          }
          result = await googleDriveManager.uploadBackup();
          break;
        default:
          result = { success: false, error: '알 수 없는 백업 방법' };
      }

      if (result.success) {
        const message = backupMethod === 'local'
          ? `백업이 완료되었습니다.\n\n파일: ${result.fileName}\n\n앱 내부 저장소에 저장되었습니다.`
          : `백업이 완료되었습니다.\n${result.fileName || ''}`;
        Alert.alert('성공', message);
      } else {
        Alert.alert('오류', result.error || '백업에 실패했습니다.');
      }
    } catch (error) {
      console.error('백업 실패:', error);
      Alert.alert('오류', '백업 중 오류가 발생했습니다.');
    } finally {
      setBackupLoading(false);
      setShowBackupDialog(false);
    }
  };

  // Google Drive 백업 목록 조회
  const handleShowDriveBackups = async () => {
    if (!isGoogleLoggedIn) {
      Alert.alert('알림', 'Google 로그인이 필요합니다.');
      return;
    }

    setBackupLoading(true);
    try {
      const backups = await googleDriveManager.listBackups();
      setDriveBackups(backups);
      setShowDriveListDialog(true);
    } catch (error) {
      Alert.alert('오류', '백업 목록을 가져오는데 실패했습니다.');
    } finally {
      setBackupLoading(false);
    }
  };

  // Google Drive에서 복원
  const handleRestoreFromDrive = async (fileId: string, fileName: string) => {
    Alert.alert(
      '복원 확인',
      `"${fileName}"에서 복원하시겠습니까?\n\n현재 데이터가 모두 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복원',
          style: 'destructive',
          onPress: async () => {
            setShowDriveListDialog(false);
            setBackupLoading(true);

            try {
              const result = await googleDriveManager.downloadAndRestore(fileId);

              if (result.success && result.stats) {
                const statsText = `
카테고리: ${result.stats.categories}개
거래: ${result.stats.transactions}개
지출그룹: ${result.stats.expenseGroups}개`;

                Alert.alert('복원 완료', `데이터가 복원되었습니다.\n${statsText}`);
              } else {
                Alert.alert('오류', result.error || '복원에 실패했습니다.');
              }
            } catch (error) {
              Alert.alert('오류', '복원 중 오류가 발생했습니다.');
            } finally {
              setBackupLoading(false);
            }
          },
        },
      ]
    );
  };

  // Google 로그인/로그아웃 처리
  const handleGoogleAuth = async () => {
    if (isGoogleLoggedIn) {
      // 로그아웃
      Alert.alert(
        'Google Drive 연결 해제',
        '연결을 해제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '해제',
            onPress: async () => {
              await googleLogout();
              await googleDriveManager.logout();
              Alert.alert('알림', 'Google Drive 연결이 해제되었습니다.');
            },
          },
        ]
      );
    } else {
      // Google OAuth 로그인 - WebView 열기
      openLoginWebView();
    }
  };

  // WebView에서 토큰 받기 성공
  const handleOAuthSuccess = async (token: string, expiresIn?: number) => {
    await handleTokenReceived(token, expiresIn);
    Alert.alert('성공', 'Google Drive에 연결되었습니다.');
  };

  // WebView에서 에러 발생
  const handleOAuthError = (error: string) => {
    Alert.alert('오류', `Google 로그인 실패: ${error}`);
  };

  // 복원 실행 (로컬 파일)
  const handleRestoreLocal = async () => {
    setBackupLoading(true);
    setShowRestoreDialog(false);

    try {
      const result = await backupManager.restoreFromFile();

      if (result.success && result.stats) {
        const statsText = `
카테고리: ${result.stats.categories}개
계좌: ${result.stats.accounts}개
통장: ${result.stats.bankAccounts}개
거래: ${result.stats.transactions}개
예산: ${result.stats.budgets}개
반복거래: ${result.stats.recurringTransactions}개
지출그룹: ${result.stats.expenseGroups}개`;

        Alert.alert('복원 완료', `데이터가 복원되었습니다.\n${statsText}`);
      } else {
        Alert.alert('오류', result.error || '복원에 실패했습니다.');
      }
    } catch (error) {
      console.error('복원 실패:', error);
      Alert.alert('오류', '복원 중 오류가 발생했습니다.');
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>설정</Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              AI 설정 (OCR)
            </Text>
            <List.Item
              title="AI API 키 설정"
              description={`현재 설정: ${aiProvider === 'openai' ? 'OpenAI' : 'Google Gemini'}`}
              left={(props) => <List.Icon {...props} icon="robot" />}
              onPress={() => setShowApiDialog(true)}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              데이터 관리
            </Text>
            <List.Item
              title="백업"
              description="데이터를 백업합니다"
              left={(props) => <List.Icon {...props} icon="backup-restore" />}
              onPress={() => setShowBackupDialog(true)}
              disabled={backupLoading}
            />
            <Divider />
            <List.Item
              title="복원"
              description="백업된 데이터를 복원합니다"
              left={(props) => <List.Icon {...props} icon="restore" />}
              onPress={() => setShowRestoreDialog(true)}
              disabled={backupLoading}
            />
            <Divider />
            <List.Item
              title="Google Drive 연결"
              description={isGoogleLoggedIn ? '연결됨 (탭하여 해제)' : '탭하여 연결'}
              left={(props) => <List.Icon {...props} icon="google-drive" />}
              onPress={handleGoogleAuth}
            />
            <Divider />
            <List.Item
              title="데이터 초기화"
              description="모든 데이터를 삭제합니다"
              left={(props) => <List.Icon {...props} icon="delete-forever" />}
              onPress={handleResetData}
            />
          </Card.Content>
        </Card>

        {backupLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>처리 중...</Text>
          </View>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              앱 정보
            </Text>
            <List.Item
              title="버전"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <Divider />
            <List.Item
              title="개발자"
              description="가계부 모바일 앱"
              left={(props) => <List.Icon {...props} icon="account" />}
            />
          </Card.Content>
        </Card>

        <Text style={styles.footerText}>
          © 2025 가계부 모바일 앱
        </Text>
      </ScrollView>

      {/* AI API 키 설정 다이얼로그 */}
      <Portal>
        <Dialog visible={showApiDialog} onDismiss={() => setShowApiDialog(false)}>
          <Dialog.Title>AI API 키 설정</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <View style={styles.dialogContent}>
                <Text variant="bodyMedium" style={styles.dialogSubtitle}>
                  영수증 OCR에 사용할 AI 제공자를 선택하고 API 키를 입력하세요.
                </Text>

                <Text variant="labelLarge" style={styles.label}>
                  AI 제공자
                </Text>
                <View style={styles.providerButtons}>
                  <Button mode={aiProvider === 'openai' ? 'contained' : 'outlined'} onPress={() => setAiProvider('openai')} style={styles.providerButton}>OpenAI</Button>
                  <Button mode={aiProvider === 'gemini' ? 'contained' : 'outlined'} onPress={() => setAiProvider('gemini')} style={styles.providerButton}>Google Gemini</Button>
                </View>

                {aiProvider === 'openai' ? (
                  <>
                    <TextInput
                      mode="outlined"
                      label="OpenAI API 키"
                      value={openaiApiKey}
                      onChangeText={setOpenaiApiKey}
                      placeholder="sk-..."
                      secureTextEntry
                      style={styles.input}
                      keyboardType="default"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />
                    <TextInput
                      mode="outlined"
                      label="모델 (선택)"
                      value={aiModel}
                      onChangeText={setAiModel}
                      placeholder="gpt-4o-mini"
                      style={styles.input}
                      keyboardType="default"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />
                    <Text variant="bodySmall" style={styles.hint}>
                      기본값: gpt-4o-mini
                    </Text>
                  </>
                ) : (
                  <>
                    <TextInput
                      mode="outlined"
                      label="Gemini API 키"
                      value={geminiApiKey}
                      onChangeText={setGeminiApiKey}
                      placeholder="AI..."
                      secureTextEntry
                      style={styles.input}
                      keyboardType="default"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />
                    <TextInput
                      mode="outlined"
                      label="모델 (선택)"
                      value={aiModel}
                      onChangeText={setAiModel}
                      placeholder="gemini-2.0-flash-exp"
                      style={styles.input}
                      keyboardType="default"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />
                    <Text variant="bodySmall" style={styles.hint}>
                      기본값: gemini-2.0-flash-exp
                    </Text>
                  </>
                )}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowApiDialog(false)}>취소</Button>
            <Button onPress={saveSettings}>저장</Button>
          </Dialog.Actions>
        </Dialog>

        {/* 백업 방법 선택 다이얼로그 */}
        <Dialog visible={showBackupDialog} onDismiss={() => setShowBackupDialog(false)}>
          <Dialog.Title>백업 방법 선택</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={(value) => setBackupMethod(value as 'local' | 'share' | 'drive')} value={backupMethod}>
              <RadioButton.Item label="앱 폴더에 저장" value="local" />
              <RadioButton.Item label="공유하기 (카카오톡, 이메일 등)" value="share" />
              <RadioButton.Item
                label={`Google Drive ${isGoogleLoggedIn ? '' : '(로그인 필요)'}`}
                value="drive"
              />
            </RadioButton.Group>
            <Text variant="bodySmall" style={styles.backupHint}>
              * 앱 폴더에 저장된 백업은 앱 삭제 시 함께 삭제됩니다.{'\n'}
              * 카카오톡/이메일로 공유하면 다른 기기에서도 복원 가능합니다.{'\n'}
              * Google Drive는 클라우드에 안전하게 백업됩니다.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBackupDialog(false)}>취소</Button>
            <Button onPress={handleBackup} disabled={backupLoading}>
              {backupLoading ? '백업 중...' : '백업'}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* 복원 방법 선택 다이얼로그 */}
        <Dialog visible={showRestoreDialog} onDismiss={() => setShowRestoreDialog(false)}>
          <Dialog.Title>복원 방법 선택</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogSubtitle}>
              복원 시 현재 데이터가 모두 삭제됩니다.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.restoreActions}>
            <Button onPress={() => setShowRestoreDialog(false)}>취소</Button>
            <Button onPress={handleRestoreLocal}>파일에서 복원</Button>
            <Button onPress={() => { setShowRestoreDialog(false); handleShowDriveBackups(); }} disabled={!isGoogleLoggedIn}>
              Drive에서 복원
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Google Drive 백업 목록 다이얼로그 */}
        <Dialog visible={showDriveListDialog} onDismiss={() => setShowDriveListDialog(false)}>
          <Dialog.Title>Google Drive 백업 목록</Dialog.Title>
          <Dialog.ScrollArea style={styles.driveListScrollArea}>
            <ScrollView>
              {driveBackups.length === 0 ? (
                <Text style={styles.emptyText}>백업 파일이 없습니다.</Text>
              ) : (
                driveBackups.map((backup) => (
                  <List.Item
                    key={backup.id}
                    title={backup.name}
                    description={new Date(backup.createdTime).toLocaleString('ko-KR')}
                    onPress={() => handleRestoreFromDrive(backup.id, backup.name)}
                    left={(props) => <List.Icon {...props} icon="file-document" />}
                  />
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowDriveListDialog(false)}>닫기</Button>
          </Dialog.Actions>
        </Dialog>

      </Portal>

      {/* Google OAuth WebView */}
      <GoogleOAuthWebView
        visible={showWebView}
        onClose={closeLoginWebView}
        onSuccess={handleOAuthSuccess}
        onError={handleOAuthError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  cardTitle: {
    marginBottom: 12,
  },
  footerText: {
    textAlign: 'center',
    padding: 32,
    color: '#666',
  },
  dialogContent: {
    padding: 16,
  },
  dialogSubtitle: {
    color: '#666',
    marginBottom: 16,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
  },
  providerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  providerButton: {
    flex: 1,
  },
  input: {
    marginBottom: 12,
  },
  hint: {
    color: '#666',
    marginTop: -8,
    marginBottom: 12,
  },
  backupHint: {
    color: '#666',
    marginTop: 12,
    lineHeight: 18,
  },
  restoreActions: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  driveListScrollArea: {
    maxHeight: 300,
  },
  emptyText: {
    textAlign: 'center',
    padding: 24,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    color: '#6366f1',
    fontSize: 16,
  },
});
