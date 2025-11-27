import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  RefreshControl,
  Pressable,
  SafeAreaView,
} from 'react-native';
import {
  Button,
  Card,
  Text,
  ActivityIndicator,
  TextInput,
  Divider,
  IconButton,
  Chip,
  Portal,
  Modal,
  FAB,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeReceiptWithOpenAI, analyzeReceiptWithGemini, OCRResult } from '../lib/ai-ocr';
import { database, Receipt } from '../lib/db/database';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ReceiptScreen({ navigation }: any) {
  // 리스트 관련 상태
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  // 업로드 모달 상태
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  // 상세보기 모달 상태
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // 편집 가능한 필드
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');

  // 카메라 권한 요청
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
        return false;
      }
    }
    return true;
  };

  // 카메라로 영수증 촬영
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        await analyzeReceipt(result.assets[0].base64);
      }
    }
  };

  // 갤러리에서 영수증 선택
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        await analyzeReceipt(result.assets[0].base64);
      }
    }
  };

  // OCR 분석
  const analyzeReceipt = async (base64Image: string) => {
    setLoading(true);
    try {
      // AsyncStorage에서 설정 가져오기
      const aiProvider = await AsyncStorage.getItem('aiProvider') || 'gemini';
      const apiKey = aiProvider === 'openai'
        ? await AsyncStorage.getItem('openaiApiKey')
        : await AsyncStorage.getItem('geminiApiKey');
      const model = await AsyncStorage.getItem('aiModel') ||
        (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp');

      if (!apiKey) {
        Alert.alert(
          'API 키 없음',
          'AI API 키를 설정해주세요. 설정 메뉴에서 등록할 수 있습니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로', onPress: () => navigation.navigate('Settings') },
          ]
        );
        return;
      }

      // OCR 실행
      let result: OCRResult;
      if (aiProvider === 'openai') {
        result = await analyzeReceiptWithOpenAI(base64Image, apiKey, model);
      } else {
        result = await analyzeReceiptWithGemini(base64Image, apiKey, model);
      }

      if (result.success) {
        setOcrResult(result);
        setAmount(result.amount?.toString() || '');
        setMerchant(result.merchant || '');
        setDate(result.date || format(new Date(), 'yyyy-MM-dd'));
        Alert.alert('분석 완료', 'OCR 분석이 완료되었습니다. 내용을 확인하고 거래를 생성하세요.');
      } else {
        Alert.alert('분석 실패', result.error || '영수증 분석에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('OCR 오류:', error);
      Alert.alert('오류', error.message || 'OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 영수증 목록 로드
  const loadReceipts = useCallback(async () => {
    try {
      const allReceipts = await database.getReceipts();
      setReceipts(allReceipts);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReceipts();
  }, [loadReceipts]);

  // 영수증 삭제
  const handleDeleteReceipt = (receiptId: number) => {
    Alert.alert(
      '삭제 확인',
      '이 영수증을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteReceipt(receiptId);
              loadReceipts();
            } catch (error) {
              console.error('Failed to delete receipt:', error);
              Alert.alert('오류', '영수증 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 업로드 모달 열기
  const openUploadModal = () => {
    setUploadModalVisible(true);
  };

  // 업로드 모달 닫기 및 초기화
  const closeUploadModal = () => {
    setUploadModalVisible(false);
    setImageUri(null);
    setOcrResult(null);
    setAmount('');
    setMerchant('');
    setDate('');
  };

  // 영수증 상세보기
  const handleReceiptClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setDetailModalVisible(true);
  };

  // 상세보기 모달 닫기
  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedReceipt(null);
  };

  // 거래 생성
  const createTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('오류', '금액을 확인해주세요.');
      return;
    }

    try {
      // 기본 카테고리 (식비) 가져오기
      const categories = await database.getCategories('expense');
      const defaultCategory = categories.find(c => c.name === '식비') || categories[0];

      // 기본 계좌 (신용카드) 가져오기
      const accounts = await database.getAccounts();
      const defaultAccount = accounts.find(a => a.name === '신용카드') || accounts[0];

      if (!defaultCategory || !defaultAccount) {
        Alert.alert('오류', '기본 카테고리 또는 계좌를 찾을 수 없습니다.');
        return;
      }

      // 메뉴 항목을 description에 포함
      const menuItemsText = ocrResult?.items && ocrResult.items.length > 0
        ? `\n메뉴: ${ocrResult.items.join(', ')}`
        : '';
      const description = `${merchant || '영수증'}${menuItemsText}`;

      const txResult = await database.addTransaction({
        amount: parseFloat(amount),
        type: 'expense',
        categoryId: defaultCategory.id,
        accountId: defaultAccount.id,
        description: description,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        merchant: merchant || undefined,
      });

      // 영수증 저장 (이미지가 있으면)
      if (imageUri && ocrResult) {
        await database.addReceipt({
          url: imageUri,
          mime: 'image/jpeg',
          size: 0,
          ocrText: ocrResult.text,
          ocrAmount: ocrResult.amount,
          ocrDate: ocrResult.date,
          ocrMerchant: ocrResult.merchant,
          ocrCardNumber: ocrResult.cardNumber,
          ocrConfidence: ocrResult.confidence,
          linkedTxId: txResult,
          uploadedAt: new Date().toISOString(),
        });
      }

      Alert.alert('성공', '거래가 추가되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            closeUploadModal();
            loadReceipts();
          },
        },
      ]);
    } catch (error) {
      console.error('거래 생성 오류:', error);
      Alert.alert('오류', '거래 추가에 실패했습니다.');
    }
  };

  if (listLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {receipts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              업로드된 영수증이 없습니다.
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              아래 + 버튼을 눌러 영수증을 스캔하세요.
            </Text>
          </View>
        ) : (
          receipts.map((receipt) => (
            <Pressable key={receipt.id} onPress={() => handleReceiptClick(receipt)}>
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.receiptHeader}>
                    <View style={styles.receiptInfo}>
                      <Text variant="titleMedium" style={styles.receiptMerchant}>
                        {receipt.ocrMerchant || '가맹점 정보 없음'}
                      </Text>
                      <Text variant="bodySmall" style={styles.receiptDate}>
                        {receipt.ocrDate
                          ? format(new Date(receipt.ocrDate), 'yyyy년 M월 d일', { locale: ko })
                          : format(new Date(receipt.uploadedAt), 'yyyy년 M월 d일', { locale: ko })}
                      </Text>
                    </View>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={(e) => {
                        e?.stopPropagation();
                        handleDeleteReceipt(receipt.id);
                      }}
                    />
                  </View>

                  <View style={styles.receiptRow}>
                    {receipt.url && (
                      <Image source={{ uri: receipt.url }} style={styles.thumbnail} />
                    )}
                    <View style={styles.receiptDetails}>
                      {receipt.ocrAmount && (
                        <View style={styles.detailRow}>
                          <Text variant="bodySmall" style={styles.detailLabel}>금액:</Text>
                          <Text variant="bodyMedium" style={styles.detailValue}>
                            {Math.round(receipt.ocrAmount).toLocaleString()}원
                          </Text>
                        </View>
                      )}
                      {receipt.ocrConfidence && (
                        <View style={styles.detailRow}>
                          <Text variant="bodySmall" style={styles.detailLabel}>정확도:</Text>
                          <Chip compact style={[styles.confidenceChip, receipt.ocrConfidence >= 0.8 ? styles.highConfidence : receipt.ocrConfidence >= 0.6 ? styles.mediumConfidence : styles.lowConfidence]}>{(receipt.ocrConfidence * 100).toFixed(0)}%</Chip>
                        </View>
                      )}
                      {receipt.linkedTxId && (
                        <View style={styles.detailRow}>
                          <Chip compact icon="check-circle" style={styles.linkedChip}>거래 연결됨</Chip>
                        </View>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* FAB 버튼 */}
      <FAB icon="plus" style={styles.fab} onPress={openUploadModal} label="영수증 스캔" />

      {/* 업로드 모달 */}
      <Portal>
        <Modal
          visible={uploadModalVisible}
          onDismiss={closeUploadModal}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                영수증 스캔
              </Text>
              <IconButton icon="close" size={24} onPress={closeUploadModal} />
            </View>
            <Text variant="bodyMedium" style={styles.subtitle}>
              영수증 사진을 촬영하거나 선택하면 AI가 자동으로 금액, 가맹점, 날짜를 추출합니다.
            </Text>

            <View style={styles.buttonRow}>
              <Button mode="contained" icon="camera" onPress={takePhoto} style={styles.button} disabled={loading}>카메라</Button>
              <Button mode="outlined" icon="image" onPress={pickImage} style={styles.button} disabled={loading}>갤러리</Button>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>AI가 영수증을 분석 중입니다...</Text>
              </View>
            )}

            {imageUri && (
              <>
                <Divider style={styles.divider} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  영수증 이미지
                </Text>
                <Image source={{ uri: imageUri }} style={styles.image} />
              </>
            )}

            {ocrResult && (
              <>
                <Divider style={styles.divider} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  추출된 정보
                </Text>
                <Text variant="bodySmall" style={styles.confidence}>
                  정확도: {(ocrResult.confidence * 100).toFixed(0)}% |
                  제공자: {ocrResult.provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
                </Text>

                <TextInput
                  mode="outlined"
                  label="금액"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  right={<TextInput.Affix text="원" />}
                  style={styles.input}
                  autoCorrect={false}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  textContentType="none"
                />

                <TextInput
                  mode="outlined"
                  label="가맹점"
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="가맹점명"
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
                  label="날짜"
                  value={date}
                  onChangeText={setDate}
                  placeholder="yyyy-MM-dd"
                  style={styles.input}
                  keyboardType="default"
                  autoCorrect={false}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  textContentType="none"
                />

                {ocrResult.items && ocrResult.items.length > 0 && (
                  <>
                    <Text variant="titleSmall" style={styles.label}>
                      메뉴 항목
                    </Text>
                    <Text variant="bodySmall" style={styles.menuItems}>
                      {ocrResult.items.join(', ')}
                    </Text>
                  </>
                )}

                {ocrResult.text && (
                  <>
                    <Text variant="titleSmall" style={styles.label}>
                      전체 텍스트
                    </Text>
                    <Text variant="bodySmall" style={styles.fullText}>
                      {ocrResult.text}
                    </Text>
                  </>
                )}

                <Divider style={styles.divider} />

                <Button mode="contained" icon="check" onPress={createTransaction} style={styles.createButton} buttonColor="#10b981">거래 생성</Button>
              </>
            )}
          </ScrollView>
        </Modal>

        {/* 상세보기 모달 */}
        <Modal
          visible={detailModalVisible}
          onDismiss={closeDetailModal}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                영수증 상세 정보
              </Text>
              <IconButton icon="close" size={24} onPress={closeDetailModal} />
            </View>

            {selectedReceipt && (
              <>
                {/* 영수증 이미지 */}
                {selectedReceipt.url && (
                  <>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      영수증 이미지
                    </Text>
                    <Image source={{ uri: selectedReceipt.url }} style={styles.image} />
                    <Divider style={styles.divider} />
                  </>
                )}

                {/* OCR 추출 정보 */}
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  추출된 정보
                </Text>

                {selectedReceipt.ocrConfidence && (
                  <View style={styles.detailInfoRow}>
                    <Text variant="bodySmall" style={styles.detailInfoLabel}>정확도:</Text>
                    <Chip compact style={[styles.confidenceChip, selectedReceipt.ocrConfidence >= 0.8 ? styles.highConfidence : selectedReceipt.ocrConfidence >= 0.6 ? styles.mediumConfidence : styles.lowConfidence]}>{(selectedReceipt.ocrConfidence * 100).toFixed(0)}%</Chip>
                  </View>
                )}

                <View style={styles.detailInfoRow}>
                  <Text variant="bodySmall" style={styles.detailInfoLabel}>가맹점:</Text>
                  <Text variant="bodyMedium" style={styles.detailInfoValue}>
                    {selectedReceipt.ocrMerchant || '-'}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text variant="bodySmall" style={styles.detailInfoLabel}>금액:</Text>
                  <Text variant="bodyMedium" style={styles.detailInfoValue}>
                    {selectedReceipt.ocrAmount ? `${Math.round(selectedReceipt.ocrAmount).toLocaleString()}원` : '-'}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text variant="bodySmall" style={styles.detailInfoLabel}>날짜:</Text>
                  <Text variant="bodyMedium" style={styles.detailInfoValue}>
                    {selectedReceipt.ocrDate
                      ? format(new Date(selectedReceipt.ocrDate), 'yyyy년 M월 d일', { locale: ko })
                      : '-'}
                  </Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text variant="bodySmall" style={styles.detailInfoLabel}>업로드일:</Text>
                  <Text variant="bodyMedium" style={styles.detailInfoValue}>
                    {format(new Date(selectedReceipt.uploadedAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                  </Text>
                </View>

                {selectedReceipt.linkedTxId && (
                  <View style={styles.detailInfoRow}>
                    <Chip compact icon="check-circle" style={styles.linkedChip}>거래 연결됨 (ID: {selectedReceipt.linkedTxId})</Chip>
                  </View>
                )}

                {/* 전체 OCR 텍스트 */}
                {selectedReceipt.ocrText && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      전체 OCR 텍스트
                    </Text>
                    <View style={styles.ocrTextContainer}>
                      <Text variant="bodySmall" style={styles.fullText}>
                        {selectedReceipt.ocrText}
                      </Text>
                    </View>
                  </>
                )}

                <Divider style={styles.divider} />

                <Button mode="outlined" icon="close" onPress={closeDetailModal} style={styles.createButton}>닫기</Button>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
    textAlign: 'center',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptMerchant: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  receiptDate: {
    color: '#6b7280',
  },
  receiptRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  receiptDetails: {
    flex: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    color: '#6b7280',
    minWidth: 60,
  },
  detailValue: {
    fontWeight: '600',
  },
  confidenceChip: {
    alignSelf: 'flex-start',
  },
  highConfidence: {
    backgroundColor: '#dcfce7',
  },
  mediumConfidence: {
    backgroundColor: '#fef3c7',
  },
  lowConfidence: {
    backgroundColor: '#fee2e2',
  },
  linkedChip: {
    backgroundColor: '#dbeafe',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  confidence: {
    color: '#666',
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  menuItems: {
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    color: '#0c4a6e',
  },
  fullText: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
  createButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailInfoLabel: {
    color: '#6b7280',
    minWidth: 80,
    fontWeight: '600',
  },
  detailInfoValue: {
    flex: 1,
    color: '#1f2937',
  },
  ocrTextContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});
