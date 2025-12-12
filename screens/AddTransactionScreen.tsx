import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { database, Category, Account } from '../lib/db/database';
import { theme } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { useInterstitialAd } from '../components/InterstitialAd';
import { useTransactionContext } from '../lib/TransactionContext';

// 카테고리 아이콘 매핑
const getCategoryEmoji = (name: string): string => {
  const emojiMap: { [key: string]: string } = {
    '식비': '🍽️',
    '교통': '🚗',
    '쇼핑': '🛍️',
    '여가': '🎮',
    '의료': '🏥',
    '주거': '🏠',
    '통신': '📱',
    '교육': '📚',
    '급여': '💼',
    '부수입': '💰',
    '용돈': '🎁',
    '기타': '📦',
    '생활': '🏡',
    '문화': '🎭',
    '카페': '☕',
    '술/유흥': '🍺',
    '미용': '💇',
    '운동': '🏃',
    '여행': '✈️',
    '보험': '🛡️',
    '저축': '🏦',
    '투자': '📈',
    '이체': '💸',
  };
  return emojiMap[name] || '📁';
};

export default function AddTransactionScreen({ navigation }: any) {
  const { theme: currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showInterstitial, InterstitialAdComponent } = useInterstitialAd();
  const { notifyTransactionAdded } = useTransactionContext();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories(type);
    loadAccounts();
  }, [type]);

  const loadCategories = async (transactionType: 'income' | 'expense') => {
    try {
      const cats = await database.getCategories(transactionType);
      setCategories(cats);
      // 타입 변경 시 선택 초기화
      setSelectedCategory(null);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const accs = await database.getAccounts();
      setAccounts(accs);
      if (accs.length > 0 && !selectedAccount) {
        setSelectedAccount(accs[0]);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleAmountChange = (text: string) => {
    // 숫자만 허용
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const formatAmount = (value: string): string => {
    if (!value) return '';
    return parseInt(value).toLocaleString('ko-KR');
  };

  const handleSubmit = async () => {
    // 입력 검증
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('오류', '금액을 입력해주세요.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('오류', '카테고리를 선택해주세요.');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('오류', '결제수단을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await database.addTransaction({
        amount: parseFloat(amount),
        type,
        categoryId: selectedCategory.id,
        accountId: selectedAccount.id,
        description,
        date,
      });

      // 다른 화면에 거래 추가됨 알림 (실시간 반영)
      notifyTransactionAdded();

      // 전면 광고 표시 (5번마다 1번)
      showInterstitial();

      // 성공 알림
      Alert.alert('성공', '거래가 추가되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            // 폼 초기화
            setAmount('');
            setDescription('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setSelectedCategory(null);
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      Alert.alert('오류', '거래 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = amount && selectedCategory && selectedAccount;

  return (
    <>
    {/* 전면 광고 컴포넌트 */}
    {InterstitialAdComponent}
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 */}
      <LinearGradient
        colors={currentTheme.gradients.header as [string, string]}
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.getParent()?.openDrawer()}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <RNText style={styles.headerTitle}>거래 추가</RNText>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 수입/지출 토글 */}
        <View style={styles.typeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { backgroundColor: currentTheme.colors.surfaceVariant },
              type === 'expense' && { backgroundColor: theme.colors.expense },
            ]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="remove"
              size={18}
              color={type === 'expense' ? '#fff' : currentTheme.colors.textSecondary}
            />
            <RNText style={[
              styles.typeBtnText,
              { color: currentTheme.colors.textSecondary },
              type === 'expense' && styles.typeBtnTextActive,
            ]}>
              지출
            </RNText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { backgroundColor: currentTheme.colors.surfaceVariant },
              type === 'income' && { backgroundColor: theme.colors.income },
            ]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="add"
              size={18}
              color={type === 'income' ? '#fff' : currentTheme.colors.textSecondary}
            />
            <RNText style={[
              styles.typeBtnText,
              { color: currentTheme.colors.textSecondary },
              type === 'income' && styles.typeBtnTextActive,
            ]}>
              수입
            </RNText>
          </TouchableOpacity>
        </View>

        {/* 금액 입력 */}
        <View style={styles.section}>
          <RNText style={[styles.sectionLabel, { color: currentTheme.colors.textSecondary }]}>금액</RNText>
          <View style={[styles.amountInputContainer, { borderColor: currentTheme.colors.border }]}>
            <RNTextInput
              style={[styles.amountInput, { color: currentTheme.colors.text }]}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={currentTheme.colors.textMuted}
            />
            <RNText style={[styles.amountUnit, { color: currentTheme.colors.textMuted }]}>원</RNText>
          </View>
          {amount && (
            <RNText style={[styles.amountFormatted, { color: currentTheme.colors.textSecondary }]}>
              {formatAmount(amount)}원
            </RNText>
          )}
        </View>

        {/* 카테고리 선택 */}
        <View style={styles.section}>
          <RNText style={[styles.sectionLabel, { color: currentTheme.colors.textSecondary }]}>카테고리</RNText>
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    { borderColor: currentTheme.colors.border },
                    isSelected && { borderColor: currentTheme.colors.primary, backgroundColor: currentTheme.colors.primary + '10' },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={[styles.categoryIconCircle, { backgroundColor: category.color }]}>
                    <RNText style={styles.categoryEmoji}>{getCategoryEmoji(category.name)}</RNText>
                  </View>
                  <RNText style={[styles.categoryName, { color: currentTheme.colors.textSecondary }]} numberOfLines={1}>
                    {category.name}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 결제수단 선택 */}
        <View style={styles.section}>
          <RNText style={[styles.sectionLabel, { color: currentTheme.colors.textSecondary }]}>결제수단</RNText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
            {accounts.map((account) => {
              const isSelected = selectedAccount?.id === account.id;
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountChip,
                    { backgroundColor: currentTheme.colors.surfaceVariant },
                    isSelected && { backgroundColor: currentTheme.colors.primary },
                  ]}
                  onPress={() => setSelectedAccount(account)}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={16}
                    color={isSelected ? '#fff' : currentTheme.colors.textSecondary}
                  />
                  <RNText
                    style={[
                      styles.accountChipText,
                      { color: currentTheme.colors.textSecondary },
                      isSelected && { color: '#fff' },
                    ]}
                    numberOfLines={1}
                  >
                    {account.name}{account.last4 ? ` *${account.last4}` : ''}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 날짜 */}
        <View style={styles.section}>
          <RNText style={[styles.sectionLabel, { color: currentTheme.colors.textSecondary }]}>날짜</RNText>
          <View style={[styles.inputContainer, { borderColor: currentTheme.colors.border }]}>
            <Ionicons name="calendar-outline" size={20} color={currentTheme.colors.textSecondary} />
            <RNTextInput
              style={[styles.textInput, { color: currentTheme.colors.text }]}
              value={date}
              onChangeText={setDate}
              placeholder="yyyy-MM-dd"
              placeholderTextColor={currentTheme.colors.textMuted}
            />
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.section}>
          <RNText style={[styles.sectionLabel, { color: currentTheme.colors.textSecondary }]}>메모 (선택)</RNText>
          <View style={[styles.inputContainer, { borderColor: currentTheme.colors.border }]}>
            <RNTextInput
              style={[styles.textInput, { color: currentTheme.colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="메모를 입력하세요 (선택)"
              placeholderTextColor={currentTheme.colors.textMuted}
            />
          </View>
        </View>

        {/* 추가 버튼 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isFormValid
              ? { backgroundColor: currentTheme.colors.primary }
              : { backgroundColor: currentTheme.colors.textMuted },
          ]}
          onPress={handleSubmit}
          disabled={loading || !isFormValid}
        >
          <RNText style={styles.submitButtonText}>
            {loading ? '처리 중...' : '추가하기'}
          </RNText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: theme.borderRadius.xxl,
    borderBottomRightRadius: theme.borderRadius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: theme.spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 40,
  },

  // 스크롤뷰
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // 수입/지출 토글
  typeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 6,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#fff',
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },

  // 금액 입력
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    paddingRight: 8,
  },
  amountUnit: {
    fontSize: 16,
  },
  amountFormatted: {
    fontSize: 14,
    marginTop: 8,
  },

  // 카테고리 그리드
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderRadius: theme.borderRadius.lg,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  // 결제수단
  accountsScroll: {
    flexDirection: 'row',
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    marginRight: 8,
    gap: 6,
  },
  accountChipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 입력 필드
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },

  // 제출 버튼
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
