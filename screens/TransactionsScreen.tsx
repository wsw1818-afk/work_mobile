import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Clipboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  ActivityIndicator,
  IconButton,
  Searchbar,
  Chip,
  Menu,
  Button,
  Portal,
  Modal,
  TextInput as PaperInput,
  SegmentedButtons,
} from 'react-native-paper';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { database, Transaction, Category } from '../lib/db/database';

export default function TransactionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      applyFilters(allTransactions, searchQuery, filterType);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterType, selectedDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const applyFilters = (
    allTransactions: Transaction[],
    search: string,
    type: 'all' | 'income' | 'expense'
  ) => {
    let filtered = allTransactions;

    // 유형 필터
    if (type !== 'all') {
      filtered = filtered.filter((t) => t.type === type);
    }

    // 검색 필터
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.categoryName?.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    applyFilters(transactions, searchQuery, filterType);
  }, [searchQuery, filterType, transactions]);

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const isCurrentMonth =
    year === new Date().getFullYear() &&
    month === new Date().getMonth() + 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      {/* 월별 선택 헤더 */}
      <View style={styles.monthSelector}>
        <IconButton
          icon="chevron-left"
          size={24}
          onPress={goToPreviousMonth}
        />
        <View style={styles.monthInfo}>
          <Text variant="titleLarge" style={styles.monthText}>
            {format(selectedDate, 'yyyy년 M월', { locale: ko })}
          </Text>
          {!isCurrentMonth && (
            <Button mode="text" compact onPress={goToCurrentMonth} style={styles.currentMonthButton}>이번 달로</Button>
          )}
        </View>
        <IconButton
          icon="chevron-right"
          size={24}
          onPress={goToNextMonth}
          disabled={isCurrentMonth}
        />
      </View>

      {/* 검색 및 필터 */}
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="검색..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <View style={styles.chipContainer}>
          <Chip selected={filterType === 'all'} onPress={() => setFilterType('all')} style={styles.chip}>전체</Chip>
          <Chip selected={filterType === 'income'} onPress={() => setFilterType('income')} style={styles.chip}>수입</Chip>
          <Chip selected={filterType === 'expense'} onPress={() => setFilterType('expense')} style={styles.chip}>지출</Chip>
        </View>
      </View>

      {/* 거래 목록 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {searchQuery || filterType !== 'all'
                ? '검색 결과가 없습니다.'
                : '거래 내역이 없습니다.'}
            </Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <Pressable
              key={transaction.id}
              onLongPress={() => handleLongPress(transaction)}
              delayLongPress={1000}
            >
              <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.transactionRow}>
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
                          styles.categoryDot,
                          { backgroundColor: transaction.categoryColor || '#6b7280' },
                        ]}
                      />
                      <View style={styles.transactionInfo}>
                        <Text variant="bodyLarge" style={styles.categoryName}>
                          {transaction.categoryName}
                        </Text>
                        {transaction.description && (
                          <Text variant="bodySmall" style={styles.description}>
                            {transaction.description}
                          </Text>
                        )}
                        <Text variant="bodySmall" style={styles.date}>
                          {format(new Date(transaction.date), 'yyyy년 M월 d일 (E)', {
                            locale: ko,
                          })}
                        </Text>
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
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.amount,
                            {
                              color:
                                transaction.type === 'income' ? '#10b981' : '#ef4444',
                            },
                          ]}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {Math.round(transaction.amount).toLocaleString()}원
                        </Text>
                      </Pressable>
                      <View style={styles.actionButtons}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => handleEdit(transaction)}
                        />
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => handleDelete(transaction)}
                        />
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* 편집 모달 */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            거래 수정
          </Text>

          <SegmentedButtons
            value={editType}
            onValueChange={(value) => handleTypeChangeInEdit(value as 'income' | 'expense')}
            buttons={[
              { value: 'income', label: '수입' },
              { value: 'expense', label: '지출' },
            ]}
            style={styles.segmentedButtons}
          />

          <PaperInput
            mode="outlined"
            label="금액"
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="numeric"
            right={<PaperInput.Affix text="원" />}
            style={styles.input}
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
              <Button mode="outlined" onPress={() => setCategoryMenuVisible(true)} style={styles.categoryButton}>{editCategory ? editCategory.name : '카테고리 선택'}</Button>
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
            keyboardType="default"
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            textContentType="none"
          />

          <View style={styles.modalButtons}>
            <Button onPress={() => setEditModalVisible(false)} style={styles.modalButton}>취소</Button>
            <Button mode="contained" onPress={handleSaveEdit} style={styles.modalButton}>저장</Button>
          </View>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  monthInfo: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontWeight: 'bold',
  },
  currentMonthButton: {
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchbar: {
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  cardContent: {
    paddingVertical: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '600',
  },
  description: {
    color: '#6b7280',
    marginTop: 2,
  },
  date: {
    color: '#9ca3af',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: -8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6b7280',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  categoryButton: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    marginLeft: 8,
  },
});
