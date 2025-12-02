import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Clipboard,
  Pressable,
  Text as RNText,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  IconButton,
  Menu,
  Button,
  Portal,
  Modal,
  TextInput as PaperInput,
  SegmentedButtons,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { database, Transaction, Category } from '../lib/db/database';
import { theme } from '../lib/theme';

// 검색 debounce 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function TransactionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // 월별 필터
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const goToPreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  // 편집 모달
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      // 선택된 월의 시작일과 종료일
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');

      const allTransactions = await database.getTransactions(startDate, endDate);
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]); // searchQuery, filterType 제거 - 필터링은 useMemo에서 처리

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // useMemo로 필터링 최적화 (debounced 검색어 사용)
  const filteredTransactionsMemo = useMemo(() => {
    let filtered = transactions;

    // 유형 필터
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // 검색 필터 (debounced)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.categoryName?.toLowerCase().includes(query) ||
          t.merchant?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, debouncedSearchQuery, filterType]);

  // filteredTransactions 상태 업데이트
  useEffect(() => {
    setFilteredTransactions(filteredTransactionsMemo);
  }, [filteredTransactionsMemo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = (transaction: Transaction) => {
    Alert.alert(
      '삭제 확인',
      '이 거래를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteTransaction(transaction.id);
              loadTransactions();
            } catch (error) {
              console.error('Failed to delete transaction:', error);
              Alert.alert('오류', '거래 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = async (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditDescription(transaction.description || '');
    setEditDate(transaction.date);
    setEditType(transaction.type);

    // 카테고리 목록 로드
    const cats = await database.getCategories(transaction.type);
    setCategories(cats);
    const selectedCat = cats.find((c) => c.id === transaction.categoryId);
    setEditCategory(selectedCat || null);

    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction || !editCategory) return;

    try {
      await database.updateTransaction(editingTransaction.id, {
        amount: parseFloat(editAmount),
        type: editType,
        categoryId: editCategory.id,
        description: editDescription,
        date: editDate,
      });

      setEditModalVisible(false);
      loadTransactions();
      Alert.alert('성공', '거래가 수정되었습니다.');
    } catch (error) {
      console.error('Failed to update transaction:', error);
      Alert.alert('오류', '거래 수정에 실패했습니다.');
    }
  };

  const handleTypeChangeInEdit = async (newType: 'income' | 'expense') => {
    setEditType(newType);
    // 유형이 바뀌면 카테고리 다시 로드
    const cats = await database.getCategories(newType);
    setCategories(cats);
    if (cats.length > 0) {
      setEditCategory(cats[0]);
    }
  };

  const handleLongPress = (transaction: Transaction) => {
    const typeText = transaction.type === 'income' ? '수입' : '지출';
    const dateText = format(new Date(transaction.date), 'yyyy년 M월 d일 (E)', { locale: ko });
    const amountText = `${transaction.type === 'income' ? '+' : '-'}${Math.round(transaction.amount).toLocaleString()}원`;

    const copyText = `${dateText}\n${transaction.categoryName}\n${transaction.description || ''}\n${amountText}`.trim();

    Alert.alert(
      '거래 내역',
      copyText,
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '복사',
          onPress: () => {
            Clipboard.setString(copyText);
            Alert.alert('복사 완료', '거래 내역이 클립보드에 복사되었습니다.');
          },
        },
      ]
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('복사 완료', `${label}이(가) 복사되었습니다.`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const isCurrentMonth =
    year === new Date().getFullYear() &&
    month === new Date().getMonth() + 1;

  return (
    <View style={styles.container}>
      {/* Dokterian 스타일 헤더 */}
      <LinearGradient
        colors={theme.gradients.header as [string, string]}
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
          <RNText style={styles.headerTitle}>거래내역</RNText>
        </View>

        {/* 월 선택기 */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.monthInfo}>
            <RNText style={styles.monthText}>
              {format(selectedDate, 'yyyy년 M월', { locale: ko })}
            </RNText>
            {!isCurrentMonth && (
              <TouchableOpacity onPress={goToCurrentMonth}>
                <RNText style={styles.currentMonthBtn}>이번 달로</RNText>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.monthArrow, isCurrentMonth && styles.disabledArrow]}
            disabled={isCurrentMonth}
          >
            <Ionicons name="chevron-forward" size={24} color={isCurrentMonth ? 'rgba(255,255,255,0.4)' : '#fff'} />
          </TouchableOpacity>
        </View>

        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="검색..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* 필터 칩 */}
      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              filterType === type && styles.filterChipActive,
            ]}
            onPress={() => setFilterType(type)}
          >
            <RNText style={[
              styles.filterChipText,
              filterType === type && styles.filterChipTextActive,
            ]}>
              {type === 'all' ? '전체' : type === 'income' ? '수입' : '지출'}
            </RNText>
          </TouchableOpacity>
        ))}
      </View>

      {/* 거래 목록 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
            </View>
            <RNText style={styles.emptyText}>
              {searchQuery || filterType !== 'all'
                ? '검색 결과가 없습니다.'
                : '거래 내역이 없습니다.'}
            </RNText>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <Pressable
              key={transaction.id}
              onLongPress={() => handleLongPress(transaction)}
              delayLongPress={1000}
            >
              <View style={styles.transactionCard}>
                <Pressable
                  style={styles.transactionLeft}
                  onLongPress={() => {
                    const text = `${transaction.categoryName}${transaction.description ? '\n' + transaction.description : ''}`;
                    copyToClipboard(text, '거래 내용');
                  }}
                  delayLongPress={1000}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${transaction.categoryColor || theme.colors.primary}20` },
                    ]}
                  >
                    <Ionicons
                      name={transaction.type === 'income' ? 'trending-up' : 'cart'}
                      size={20}
                      color={transaction.categoryColor || theme.colors.primary}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <RNText style={styles.categoryName}>
                      {transaction.categoryName}
                    </RNText>
                    {transaction.description && (
                      <RNText style={styles.description} numberOfLines={1}>
                        {transaction.description}
                      </RNText>
                    )}
                    <RNText style={styles.date}>
                      {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                    </RNText>
                  </View>
                </Pressable>

                <View style={styles.transactionRight}>
                  <Pressable
                    onLongPress={() => {
                      const amountText = `${transaction.type === 'income' ? '+' : '-'}${Math.round(transaction.amount).toLocaleString()}원`;
                      copyToClipboard(amountText, '금액');
                    }}
                    delayLongPress={1000}
                  >
                    <RNText
                      style={[
                        styles.amount,
                        { color: transaction.type === 'income' ? theme.colors.income : theme.colors.expense },
                      ]}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {Math.round(transaction.amount).toLocaleString()}원
                    </RNText>
                  </Pressable>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleEdit(transaction)}
                    >
                      <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDelete(transaction)}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 편집 모달 */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <RNText style={styles.modalTitle}>거래 수정</RNText>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, editType === 'income' && styles.typeBtnActiveIncome]}
              onPress={() => handleTypeChangeInEdit('income')}
            >
              <RNText style={[styles.typeBtnText, editType === 'income' && styles.typeBtnTextActive]}>수입</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, editType === 'expense' && styles.typeBtnActiveExpense]}
              onPress={() => handleTypeChangeInEdit('expense')}
            >
              <RNText style={[styles.typeBtnText, editType === 'expense' && styles.typeBtnTextActive]}>지출</RNText>
            </TouchableOpacity>
          </View>

          <PaperInput
            mode="outlined"
            label="금액"
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="numeric"
            right={<PaperInput.Affix text="원" />}
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            textContentType="none"
          />

          <Menu
            visible={categoryMenuVisible}
            onDismiss={() => setCategoryMenuVisible(false)}
            anchor={
              <TouchableOpacity style={styles.categoryButton} onPress={() => setCategoryMenuVisible(true)}>
                <RNText style={styles.categoryButtonText}>{editCategory ? editCategory.name : '카테고리 선택'}</RNText>
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            }
          >
            {categories.map((category) => (
              <Menu.Item
                key={category.id}
                onPress={() => {
                  setEditCategory(category);
                  setCategoryMenuVisible(false);
                }}
                title={category.name}
              />
            ))}
          </Menu>

          <PaperInput
            mode="outlined"
            label="날짜"
            value={editDate}
            onChangeText={setEditDate}
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

          <PaperInput
            mode="outlined"
            label="메모"
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
            numberOfLines={2}
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

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
              <RNText style={styles.cancelBtnText}>취소</RNText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
              <RNText style={styles.saveBtnText}>저장</RNText>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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

  // 월 선택기
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledArrow: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  currentMonthBtn: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // 검색창
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: theme.colors.text,
  },

  // 필터
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // 스크롤 뷰
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // 거래 카드
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  actionBtn: {
    padding: 4,
  },

  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },

  // 모달
  modal: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    margin: 20,
    borderRadius: theme.borderRadius.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
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
    color: theme.colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  input: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 12,
  },
  categoryButtonText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceVariant,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
