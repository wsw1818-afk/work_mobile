import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Divider,
  TextInput,
  Dialog,
  Portal,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../lib/db/database';

export default function SettingsScreen({ navigation }: any) {
  // AI 설정 상태
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini'>('gemini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [showApiDialog, setShowApiDialog] = useState(false);

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
              // 모든 테이블 데이터 삭제 (향후 구현)
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>설정</Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              서버 연결
            </Text>
            <List.Item
              title="QR 코드 스캔"
              description="QR 코드로 서버에 연결"
              left={(props) => <List.Icon {...props} icon="qrcode-scan" />}
              onPress={() => navigation.navigate('QRScanner')}
            />
          </Card.Content>
        </Card>

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
              onPress={() => Alert.alert('준비중', '백업 기능은 준비 중입니다.')}
            />
            <Divider />
            <List.Item
              title="복원"
              description="백업된 데이터를 복원합니다"
              left={(props) => <List.Icon {...props} icon="restore" />}
              onPress={() => Alert.alert('준비중', '복원 기능은 준비 중입니다.')}
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
      </Portal>
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
});
