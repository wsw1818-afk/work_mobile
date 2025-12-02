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
import {
  TextInput,
  Menu,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { database, Category, Account } from '../lib/db/database';
import { theme } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export default function AddTransactionScreen({ navigation }: any) {
  const { theme: currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
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
      if (cats.length > 0) {
        setSelectedCategory(cats[0]);
      } else {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const accs = await database.getAccounts();
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccount(accs[0]);
      } else {
        setSelectedAccount(null);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
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

      // 성공 알림
      Alert.alert('성공', '거래가 추가되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            // 폼 초기화
            setAmount('');
            setDescription('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Dokterian 스타일 헤더 */}
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
        </View>

        {/* 수입/지출 토글 */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="trending-up"
              size={20}
              color={type === 'income' ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <RNText style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
              수입
            </RNText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="trending-down"
              size={20}
              color={type === 'expense' ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
            <RNText style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
              지출
            </RNText>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 금액 입력 카드 */}
        <View style={styles.card}>
          <View style={styles.amountContainer}>
            <RNText style={styles.amountLabel}>금액</RNText>
            <View style={styles.amountInputContainer}>
              <RNTextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={currentTheme.colors.textMuted}
              />
              <RNText style={styles.amountUnit}>원</RNText>
            </View>
          </View>
        </View>

        {/* 카테고리 선택 */}
        <View style={styles.card}>
          <RNText style={styles.label}>카테고리</RNText>
          <Menu
            visible={categoryMenuVisible}
            onDismiss={() => setCategoryMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setCategoryMenuVisible(true)}
              >
                {selectedCategory ? (
                  <View style={styles.selectContent}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]}
                    />
                    <RNText style={styles.selectText}>{selectedCategory.name}</RNText>
                  </View>
                ) : (
                  <RNText style={styles.selectPlaceholder}>카테고리 선택</RNText>
                )}
                <Ionicons name="chevron-down" size={20} color={currentTheme.colors.textSecondary} />
              </TouchableOpacity>
            }
          >
            {categories.map((category) => (
              <Menu.Item
                key={category.id}
                onPress={() => {
                  setSelectedCategory(category);
                  setCategoryMenuVisible(false);
                }}
                title={
                  <View style={styles.menuItemContent}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <RNText style={styles.menuItemText}>{category.name}</RNText>
                  </View>
                }
              />
            ))}
          </Menu>
        </View>

        {/* 결제수단 선택 */}
        <View style={styles.card}>
          <RNText style={styles.label}>결제수단</RNText>
          <Menu
            visible={accountMenuVisible}
            onDismiss={() => setAccountMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setAccountMenuVisible(true)}
              >
                <View style={styles.selectContent}>
                  <Ionicons name="wallet-outline" size={20} color={currentTheme.colors.primary} />
                  <RNText style={styles.selectText}>
                    {selectedAccount
                      ? `${selectedAccount.name}${selectedAccount.last4 ? ` (*${selectedAccount.last4})` : ''}${selectedAccount.bankAccountName ? ` - ${selectedAccount.bankAccountName}` : ''}`
                      : '결제수단 선택'}
                  </RNText>
                </View>
                <Ionicons name="chevron-down" size={20} color={currentTheme.colors.textSecondary} />
              </TouchableOpacity>
            }
          >
            {accounts.map((account) => (
              <Menu.Item
                key={account.id}
                onPress={() => {
                  setSelectedAccount(account);
                  setAccountMenuVisible(false);
                }}
                title={`${account.name}${account.last4 ? ` (*${account.last4})` : ''}${account.bankAccountName ? ` - ${account.bankAccountName}` : ''}`}
              />
            ))}
          </Menu>
        </View>

        {/* 날짜 입력 */}
        <View style={styles.card}>
          <RNText style={styles.label}>날짜</RNText>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={20} color={currentTheme.colors.primary} />
            <TextInput
              mode="flat"
              value={date}
              onChangeText={setDate}
              placeholder="yyyy-MM-dd"
              style={styles.flatInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              textContentType="none"
            />
          </View>
        </View>

        {/* 메모 입력 */}
        <View style={styles.card}>
          <RNText style={styles.label}>메모 (선택)</RNText>
          <View style={styles.memoContainer}>
            <Ionicons name="document-text-outline" size={20} color={currentTheme.colors.primary} style={{ marginTop: 4 }} />
            <TextInput
              mode="flat"
              value={description}
              onChangeText={setDescription}
              placeholder="메모를 입력하세요"
              multiline
              numberOfLines={3}
              style={styles.memoInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              textContentType="none"
            />
          </View>
        </View>

        {/* 추가 버튼 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: type === 'income' ? currentTheme.colors.income : currentTheme.colors.expense },
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons
            name={type === 'income' ? 'add-circle' : 'remove-circle'}
            size={24}
            color="#fff"
          />
          <RNText style={styles.submitButtonText}>
            {loading ? '처리 중...' : `${type === 'income' ? '수입' : '지출'} 추가`}
          </RNText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  menuButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },

  // 유형 토글
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.lg,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  typeBtnActiveIncome: {
    backgroundColor: theme.colors.income,
  },
  typeBtnActiveExpense: {
    backgroundColor: theme.colors.expense,
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  typeBtnTextActive: {
    color: '#fff',
  },

  // 스크롤뷰
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // 카드
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },

  // 금액 입력
  amountContainer: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    minWidth: 120,
  },
  amountUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },

  // 선택 버튼
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 12,
  },
  selectPlaceholder: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 12,
  },

  // 입력 행
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingLeft: 16,
  },
  flatInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
  },

  // 메모
  memoContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingLeft: 16,
    paddingTop: 12,
  },
  memoInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 15,
    minHeight: 80,
  },

  // 제출 버튼
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    marginTop: 8,
    gap: 8,
    ...theme.shadows.md,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
