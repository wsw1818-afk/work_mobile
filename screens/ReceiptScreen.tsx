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
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  TextInput,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import { theme } from '../lib/theme';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeReceiptWithOpenAI, analyzeReceiptWithGemini, OCRResult } from '../lib/ai-ocr';
import { database, Receipt } from '../lib/db/database';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ReceiptScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        >
          {receipts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={theme.colors.textTertiary} />
              <RNText style={styles.emptyText}>업로드된 영수증이 없습니다</RNText>
              <RNText style={styles.emptySubtext}>아래 버튼을 눌러 영수증을 스캔하세요</RNText>
            </View>
          ) : (
            receipts.map((receipt) => (
              <Pressable key={receipt.id} onPress={() => handleReceiptClick(receipt)}>
                <View style={styles.card}>
                  <View style={styles.receiptHeader}>
                    <View style={styles.receiptInfo}>
                      <RNText style={styles.receiptMerchant}>
                        {receipt.ocrMerchant || '가맹점 정보 없음'}
                      </RNText>
                      <RNText style={styles.receiptDate}>
                        {receipt.ocrDate
                          ? format(new Date(receipt.ocrDate), 'yyyy년 M월 d일', { locale: ko })
                          : format(new Date(receipt.uploadedAt), 'yyyy년 M월 d일', { locale: ko })}
                      </RNText>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e?.stopPropagation();
                        handleDeleteReceipt(receipt.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.expense} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.receiptRow}>
                    {receipt.url && (
                      <Image source={{ uri: receipt.url }} style={styles.thumbnail} />
                    )}
                    <View style={styles.receiptDetails}>
                      {receipt.ocrAmount && (
                        <View style={styles.detailRow}>
                          <RNText style={styles.detailLabel}>금액</RNText>
                          <RNText style={styles.detailValue}>
                            {Math.round(receipt.ocrAmount).toLocaleString()}원
                          </RNText>
                        </View>
                      )}
                      {receipt.ocrConfidence && (
                        <View style={styles.detailRow}>
                          <RNText style={styles.detailLabel}>정확도</RNText>
                          <View style={[
                            styles.confidenceBadge,
                            receipt.ocrConfidence >= 0.8 ? styles.highConfidence :
                            receipt.ocrConfidence >= 0.6 ? styles.mediumConfidence : styles.lowConfidence
                          ]}>
                            <RNText style={[
                              styles.confidenceText,
                              receipt.ocrConfidence >= 0.8 ? styles.highConfidenceText :
                              receipt.ocrConfidence >= 0.6 ? styles.mediumConfidenceText : styles.lowConfidenceText
                            ]}>
                              {(receipt.ocrConfidence * 100).toFixed(0)}%
                            </RNText>
                          </View>
                        </View>
                      )}
                      {receipt.linkedTxId && (
                        <View style={styles.linkedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
                          <RNText style={styles.linkedText}>거래 연결됨</RNText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        {/* FAB 버튼 */}
        <TouchableOpacity style={styles.fab} onPress={openUploadModal} activeOpacity={0.8}>
          <LinearGradient
            colors={theme.gradients.header as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="scan" size={24} color="#fff" />
            <RNText style={styles.fabText}>영수증 스캔</RNText>
          </LinearGradient>
        </TouchableOpacity>

      {/* 업로드 모달 */}
      <Portal>
        <Modal
          visible={uploadModalVisible}
          onDismiss={closeUploadModal}
          contentContainerStyle={styles.modal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <RNText style={styles.modalTitle}>영수증 스캔</RNText>
              <TouchableOpacity onPress={closeUploadModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <RNText style={styles.subtitle}>
              영수증 사진을 촬영하거나 선택하면 AI가 자동으로 금액, 가맹점, 날짜를 추출합니다.
            </RNText>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={takePhoto}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <RNText style={styles.primaryButtonText}>카메라</RNText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton, loading && styles.buttonDisabled]}
                onPress={pickImage}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="image" size={20} color={theme.colors.primary} />
                <RNText style={styles.secondaryButtonText}>갤러리</RNText>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <RNText style={styles.loadingText}>AI가 영수증을 분석 중입니다...</RNText>
              </View>
            )}

            {imageUri && (
              <>
                <View style={styles.divider} />
                <RNText style={styles.sectionTitle}>영수증 이미지</RNText>
                <Image source={{ uri: imageUri }} style={styles.image} />
              </>
            )}

            {ocrResult && (
              <>
                <View style={styles.divider} />
                <RNText style={styles.sectionTitle}>추출된 정보</RNText>
                <RNText style={styles.confidence}>
                  정확도: {(ocrResult.confidence * 100).toFixed(0)}% | 제공자: {ocrResult.provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
                </RNText>

                <TextInput
                  mode="outlined"
                  label="금액"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  right={<TextInput.Affix text="원" />}
                  style={styles.input}
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
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
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
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
                  outlineColor={theme.colors.border}
                  activeOutlineColor={theme.colors.primary}
                  keyboardType="default"
                  autoCorrect={false}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  textContentType="none"
                />

                {ocrResult.items && ocrResult.items.length > 0 && (
                  <>
                    <RNText style={styles.label}>메뉴 항목</RNText>
                    <View style={styles.menuItemsContainer}>
                      <RNText style={styles.menuItems}>{ocrResult.items.join(', ')}</RNText>
                    </View>
                  </>
                )}

                {ocrResult.text && (
                  <>
                    <RNText style={styles.label}>전체 텍스트</RNText>
                    <View style={styles.fullTextContainer}>
                      <RNText style={styles.fullText}>{ocrResult.text}</RNText>
                    </View>
                  </>
                )}

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.createButton}
                  onPress={createTransaction}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <RNText style={styles.createButtonText}>거래 생성</RNText>
                </TouchableOpacity>
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <RNText style={styles.modalTitle}>영수증 상세 정보</RNText>
              <TouchableOpacity onPress={closeDetailModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedReceipt && (
              <>
                {/* 영수증 이미지 */}
                {selectedReceipt.url && (
                  <>
                    <RNText style={styles.sectionTitle}>영수증 이미지</RNText>
                    <Image source={{ uri: selectedReceipt.url }} style={styles.image} />
                    <View style={styles.divider} />
                  </>
                )}

                {/* OCR 추출 정보 */}
                <RNText style={styles.sectionTitle}>추출된 정보</RNText>

                {selectedReceipt.ocrConfidence && (
                  <View style={styles.detailInfoRow}>
                    <RNText style={styles.detailInfoLabel}>정확도</RNText>
                    <View style={[
                      styles.confidenceBadge,
                      selectedReceipt.ocrConfidence >= 0.8 ? styles.highConfidence :
                      selectedReceipt.ocrConfidence >= 0.6 ? styles.mediumConfidence : styles.lowConfidence
                    ]}>
                      <RNText style={[
                        styles.confidenceText,
                        selectedReceipt.ocrConfidence >= 0.8 ? styles.highConfidenceText :
                        selectedReceipt.ocrConfidence >= 0.6 ? styles.mediumConfidenceText : styles.lowConfidenceText
                      ]}>
                        {(selectedReceipt.ocrConfidence * 100).toFixed(0)}%
                      </RNText>
                    </View>
                  </View>
                )}

                <View style={styles.detailInfoRow}>
                  <RNText style={styles.detailInfoLabel}>가맹점</RNText>
                  <RNText style={styles.detailInfoValue}>
                    {selectedReceipt.ocrMerchant || '-'}
                  </RNText>
                </View>

                <View style={styles.detailInfoRow}>
                  <RNText style={styles.detailInfoLabel}>금액</RNText>
                  <RNText style={styles.detailInfoValue}>
                    {selectedReceipt.ocrAmount ? `${Math.round(selectedReceipt.ocrAmount).toLocaleString()}원` : '-'}
                  </RNText>
                </View>

                <View style={styles.detailInfoRow}>
                  <RNText style={styles.detailInfoLabel}>날짜</RNText>
                  <RNText style={styles.detailInfoValue}>
                    {selectedReceipt.ocrDate
                      ? format(new Date(selectedReceipt.ocrDate), 'yyyy년 M월 d일', { locale: ko })
                      : '-'}
                  </RNText>
                </View>

                <View style={styles.detailInfoRow}>
                  <RNText style={styles.detailInfoLabel}>업로드일</RNText>
                  <RNText style={styles.detailInfoValue}>
                    {format(new Date(selectedReceipt.uploadedAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                  </RNText>
                </View>

                {selectedReceipt.linkedTxId && (
                  <View style={styles.linkedBadgeLarge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                    <RNText style={styles.linkedTextLarge}>거래 연결됨 (ID: {selectedReceipt.linkedTxId})</RNText>
                  </View>
                )}

                {/* 전체 OCR 텍스트 */}
                {selectedReceipt.ocrText && (
                  <>
                    <View style={styles.divider} />
                    <RNText style={styles.sectionTitle}>전체 OCR 텍스트</RNText>
                    <View style={styles.ocrTextContainer}>
                      <RNText style={styles.fullText}>{selectedReceipt.ocrText}</RNText>
                    </View>
                  </>
                )}

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={closeDetailModal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
                  <RNText style={styles.closeModalButtonText}>닫기</RNText>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold as any,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: 100,
  },
  card: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptMerchant: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  receiptDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  receiptDetails: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    minWidth: 50,
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  confidenceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  confidenceText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium as any,
  },
  highConfidence: {
    backgroundColor: '#dcfce7',
  },
  highConfidenceText: {
    color: '#166534',
  },
  mediumConfidence: {
    backgroundColor: '#fef3c7',
  },
  mediumConfidenceText: {
    color: '#92400e',
  },
  lowConfidence: {
    backgroundColor: '#fee2e2',
  },
  lowConfidenceText: {
    color: '#991b1b',
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  linkedText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium as any,
  },
  linkedBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  linkedTextLarge: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium as any,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  fabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  modal: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
  },
  confidence: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  menuItemsContainer: {
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  menuItems: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  fullTextContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fullText: {
    fontSize: theme.fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.income,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  createButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  closeModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeModalButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  detailInfoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    minWidth: 70,
    fontWeight: theme.fontWeight.medium as any,
  },
  detailInfoValue: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  ocrTextContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
