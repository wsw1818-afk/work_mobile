import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Clipboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, ActivityIndicator, IconButton, Button, Portal, Modal, Divider } from 'react-native-paper';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { database, Transaction } from '../lib/db/database';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthSummary, setMonthSummary] = useState({ income: 0, expense: 0 });
  const [fixedExpense, setFixedExpense] = useState(0);
  const [variableExpense, setVariableExpense] = useState(0);
  const [categoryStats, setCategoryStats] = useState<Array<{
    categoryName: string;
    categoryColor: string;
    total: number;
    percentage: number;
    isFixedExpense: boolean;
  }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // 카테고리 상세 모달
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    color: string;
    total: number;
    transactions: Transaction[];
  } | null>(null);

  // 월별 선택 기능
  const [selectedDate, setSelectedDate] = useState(new Date());
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const goToPreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  const loadData = useCallback(async () => {
    try {
      // 이번 달 요약
      const summary = await database.getMonthSummary(year, month);
      setMonthSummary(summary);

      // 카테고리별 통계
      const stats = await database.getCategoryStats(year, month);
      setCategoryStats(stats);

      // 고정지출과 변동지출 계산
      const fixed = stats
        .filter(s => s.isFixedExpense)
        .reduce((sum, s) => sum + s.total, 0);
      const variable = stats
        .filter(s => !s.isFixedExpense)
        .reduce((sum, s) => sum + s.total, 0);

      setFixedExpense(fixed);
      setVariableExpense(variable);

      // 최근 거래 내역 (제외 패턴 적용)
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const transactions = await database.getTransactions(startDate, endDate, false);
      setRecentTransactions(transactions.slice(0, 10)); // 최근 10개만
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // 수입/지출 요약 클릭 핸들러
  const handleSummaryClick = async (type: 'income' | 'expense', title: string) => {
    try {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const allTransactions = await database.getTransactions(startDate, endDate, false);

      // 타입별 필터링
      const filteredTransactions = allTransactions.filter(tx => tx.type === type);
      const total = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      // 지출인 경우 카테고리별로 그룹화된 정보 전달
      if (type === 'expense') {
        setSelectedCategory({
          name: title,
          color: '#ef4444',
          total: total,
          transactions: filteredTransactions,
          showCategoryGroups: true, // 카테고리별 그룹 표시 플래그
          categoryStats: categoryStats, // 카테고리 통계 전달
        });
      } else {
        setSelectedCategory({
          name: title,
          color: '#10b981',
          total: total,
          transactions: filteredTransactions,
        });
      }
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  // 고정지출/변동지출 클릭 핸들러
  const handleExpenseTypeClick = async (isFixed: boolean, title: string) => {
    try {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const allTransactions = await database.getTransactions(startDate, endDate, false);

      // 고정/변동 지출 필터링
      const expenseStats = categoryStats.filter(s => s.isFixedExpense === isFixed);
      const categoryNames = expenseStats.map(s => s.categoryName);
      const filteredTransactions = allTransactions.filter(
        tx => tx.type === 'expense' && categoryNames.includes(tx.categoryName)
      );
      const total = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      setSelectedCategory({
        name: title,
        color: isFixed ? '#f59e0b' : '#8b5cf6',
        total: total,
        transactions: filteredTransactions,
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to load expense transactions:', error);
    }
  };

  const handleCategoryClick = async (categoryName: string, categoryColor: string, total: number) => {
    try {
      // 해당 카테고리의 거래 내역 가져오기
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const allTransactions = await database.getTransactions(startDate, endDate, false);

      // 카테고리별 필터링
      const categoryTransactions = allTransactions.filter(
        tx => tx.categoryName === categoryName
      );

      setSelectedCategory({
        name: categoryName,
        color: categoryColor,
        total: total,
        transactions: categoryTransactions,
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to load category transactions:', error);
    }
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

  const balance = monthSummary.income - monthSummary.expense;

  const isCurrentMonth =
    year === new Date().getFullYear() &&
    month === new Date().getMonth() + 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

      {/* 이번 달 요약 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <Pressable
              style={({ pressed }) => [
                styles.summaryItem,
                pressed && styles.summaryItemPressed
              ]}
              onPress={() => handleSummaryClick('income', '수입')}
            >
              <Text variant="bodyMedium" style={styles.label}>수입</Text>
              <Text variant="titleMedium" style={styles.incomeText}>
                +{Math.round(monthSummary.income).toLocaleString()}원
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.summaryItem,
                pressed && styles.summaryItemPressed
              ]}
              onPress={() => handleSummaryClick('expense', '총 지출')}
            >
              <Text variant="bodyMedium" style={styles.label}>총 지출</Text>
              <Text variant="titleMedium" style={styles.expenseText}>
                -{Math.round(monthSummary.expense).toLocaleString()}원
              </Text>
            </Pressable>
          </View>

          <View style={styles.expenseDetailRow}>
            <Pressable
              style={({ pressed }) => [
                styles.expenseDetailItem,
                pressed && styles.expenseDetailItemPressed
              ]}
              onPress={() => handleExpenseTypeClick(true, '고정지출')}
            >
              <Text variant="bodySmall" style={styles.expenseDetailLabel}>고정지출</Text>
              <Text variant="bodyMedium" style={styles.fixedExpenseText}>
                {Math.round(fixedExpense).toLocaleString()}원
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.expenseDetailItem,
                pressed && styles.expenseDetailItemPressed
              ]}
              onPress={() => handleExpenseTypeClick(false, '변동지출')}
            >
              <Text variant="bodySmall" style={styles.expenseDetailLabel}>변동지출</Text>
              <Text variant="bodyMedium" style={styles.variableExpenseText}>
                {Math.round(variableExpense).toLocaleString()}원
              </Text>
            </Pressable>
          </View>

          <View style={styles.balanceContainer}>
            <Text variant="bodyMedium" style={styles.label}>잔액</Text>
            <Text
              variant="headlineSmall"
              style={[
                styles.balanceText,
                { color: balance >= 0 ? '#10b981' : '#ef4444' }
              ]}
            >
              {balance >= 0 ? '+' : ''}{Math.round(balance).toLocaleString()}원
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* 고정지출 */}
      {categoryStats.filter(s => s.isFixedExpense).length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              💰 고정지출
            </Text>
            {categoryStats.filter(s => s.isFixedExpense).map((stat, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.categoryItem,
                  pressed && styles.categoryItemPressed
                ]}
                onPress={() => handleCategoryClick(stat.categoryName, stat.categoryColor, stat.total)}
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: stat.categoryColor }
                    ]}
                  />
                  <Text variant="bodyMedium">{stat.categoryName}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text variant="bodyMedium" style={styles.categoryAmount}>
                    {Math.round(stat.total).toLocaleString()}원
                  </Text>
                  <Text variant="bodySmall" style={styles.categoryPercentage}>
                    ({stat.percentage.toFixed(1)}%)
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* 변동지출 */}
      {categoryStats.filter(s => !s.isFixedExpense).length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              📊 변동지출
            </Text>
            {categoryStats.filter(s => !s.isFixedExpense).slice(0, 10).map((stat, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.categoryItem,
                  pressed && styles.categoryItemPressed
                ]}
                onPress={() => handleCategoryClick(stat.categoryName, stat.categoryColor, stat.total)}
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: stat.categoryColor }
                    ]}
                  />
                  <Text variant="bodyMedium">{stat.categoryName}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text variant="bodyMedium" style={styles.categoryAmount}>
                    {Math.round(stat.total).toLocaleString()}원
                  </Text>
                  <Text variant="bodySmall" style={styles.categoryPercentage}>
                    ({stat.percentage.toFixed(1)}%)
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* 최근 거래 내역 */}
      {recentTransactions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              최근 거래 내역
            </Text>
            {recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: transaction.categoryColor || '#6b7280' }
                    ]}
                  />
                  <View style={styles.transactionInfo}>
                    <Text variant="bodyMedium" numberOfLines={1} ellipsizeMode="tail">
                      {transaction.categoryName}
                    </Text>
                    {transaction.description && (
                      <Text variant="bodySmall" style={styles.description} numberOfLines={1} ellipsizeMode="tail">
                        {transaction.description}
                      </Text>
                    )}
                    <Text variant="bodySmall" style={styles.date}>
                      {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                    </Text>
                  </View>
                </View>
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? '#10b981' : '#ef4444' }
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {Math.round(transaction.amount).toLocaleString()}원
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {recentTransactions.length === 0 && categoryStats.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            거래 내역이 없습니다.
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            하단의 + 버튼을 눌러 거래를 추가해보세요!
          </Text>
        </View>
      )}

      {/* 카테고리 상세 모달 */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedCategory && (
            <ScrollView style={styles.modalContent}>
              {/* 모달 헤더 */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View
                    style={[
                      styles.modalCategoryDot,
                      { backgroundColor: selectedCategory.color }
                    ]}
                  />
                  <Text variant="titleLarge" style={styles.modalTitle}>
                    {selectedCategory.name}
                  </Text>
                </View>
                <Text variant="headlineSmall" style={styles.modalTotal}>
                  {Math.round(selectedCategory.total).toLocaleString()}원
                </Text>
                <Text variant="bodyMedium" style={styles.modalCount}>
                  총 {selectedCategory.transactions.length}건
                </Text>
              </View>

              <Divider style={styles.modalDivider} />

              {/* 거래 내역 목록 */}
              {selectedCategory.transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    거래 내역이 없습니다.
                  </Text>
                </View>
              ) : selectedCategory.showCategoryGroups && selectedCategory.categoryStats ? (
                // 카테고리별 그룹화 뷰 (지출 클릭 시)
                selectedCategory.categoryStats.map((stat: any, statIndex: number) => {
                  const categoryTransactions = selectedCategory.transactions.filter(
                    (tx: Transaction) => tx.categoryName === stat.categoryName
                  );

                  if (categoryTransactions.length === 0) return null;

                  return (
                    <View key={statIndex} style={styles.categoryGroupContainer}>
                      {/* 카테고리 헤더 */}
                      <View style={styles.categoryGroupHeader}>
                        <View style={styles.categoryGroupTitleRow}>
                          <View
                            style={[
                              styles.categoryDot,
                              { backgroundColor: stat.categoryColor }
                            ]}
                          />
                          <Text variant="titleMedium" style={styles.categoryGroupTitle}>
                            {stat.categoryName}
                          </Text>
                        </View>
                        <Text variant="titleSmall" style={styles.categoryGroupTotal}>
                          {Math.round(stat.total).toLocaleString()}원
                        </Text>
                      </View>

                      {/* 카테고리 내 거래 목록 */}
                      {categoryTransactions.map((transaction, txIndex) => (
                        <View key={transaction.id}>
                          <View style={styles.transactionRow}>
                            <Pressable
                              style={styles.transactionLeft}
                              onLongPress={() => {
                                const text = `${transaction.description || transaction.merchant || '거래'}`;
                                copyToClipboard(text, '거래 내용');
                              }}
                              delayLongPress={1000}
                            >
                              <Text variant="bodyMedium" style={styles.transactionDescription} numberOfLines={1} ellipsizeMode="tail">
                                {transaction.description || transaction.merchant || '거래'}
                              </Text>
                              <Text variant="bodySmall" style={styles.transactionDate}>
                                {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                              </Text>
                              {transaction.merchant && transaction.description !== transaction.merchant && (
                                <Text variant="bodySmall" style={styles.transactionMerchant} numberOfLines={1} ellipsizeMode="tail">
                                  {transaction.merchant}
                                </Text>
                              )}
                            </Pressable>
                            <Pressable
                              onLongPress={() => {
                                const amountText = `-${Math.round(transaction.amount).toLocaleString()}원`;
                                copyToClipboard(amountText, '금액');
                              }}
                              delayLongPress={1000}
                            >
                              <Text
                                variant="bodyLarge"
                                style={[
                                  styles.transactionAmount,
                                  { color: '#ef4444' }
                                ]}
                              >
                                -{Math.round(transaction.amount).toLocaleString()}원
                              </Text>
                            </Pressable>
                          </View>
                          {txIndex < categoryTransactions.length - 1 && (
                            <Divider style={styles.transactionDivider} />
                          )}
                        </View>
                      ))}

                      {statIndex < selectedCategory.categoryStats.length - 1 && (
                        <Divider style={styles.categoryGroupDivider} />
                      )}
                    </View>
                  );
                })
              ) : (
                // 일반 거래 목록 뷰
                selectedCategory.transactions.map((transaction, index) => (
                  <View key={transaction.id}>
                    <View style={styles.transactionRow}>
                      <Pressable
                        style={styles.transactionLeft}
                        onLongPress={() => {
                          const text = `${transaction.description || transaction.merchant || '거래'}`;
                          copyToClipboard(text, '거래 내용');
                        }}
                        delayLongPress={1000}
                      >
                        <Text variant="bodyLarge" style={styles.transactionDescription} numberOfLines={1} ellipsizeMode="tail">
                          {transaction.description || transaction.merchant || '거래'}
                        </Text>
                        <Text variant="bodySmall" style={styles.transactionDate}>
                          {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                        </Text>
                        {transaction.merchant && transaction.description !== transaction.merchant && (
                          <Text variant="bodySmall" style={styles.transactionMerchant} numberOfLines={1} ellipsizeMode="tail">
                            {transaction.merchant}
                          </Text>
                        )}
                      </Pressable>
                      <Pressable
                        onLongPress={() => {
                          const amountText = `${transaction.type === 'income' ? '+' : '-'}${Math.round(transaction.amount).toLocaleString()}원`;
                          copyToClipboard(amountText, '금액');
                        }}
                        delayLongPress={1000}
                      >
                        <Text
                          variant="titleMedium"
                          style={[
                            styles.transactionAmount,
                            { color: transaction.type === 'income' ? '#10b981' : '#ef4444' }
                          ]}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {Math.round(transaction.amount).toLocaleString()}원
                        </Text>
                      </Pressable>
                    </View>
                    {index < selectedCategory.transactions.length - 1 && (
                      <Divider style={styles.transactionDivider} />
                    )}
                  </View>
                ))
              )}

              <Button
                mode="contained"
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
                buttonColor="#6366f1"
                contentStyle={{ paddingVertical: 8 }}
              >
                닫기
              </Button>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </ScrollView>
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
  card: {
    margin: 16,
    marginBottom: 0,
  },
  cardTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
  },
  summaryItemPressed: {
    backgroundColor: '#f3f4f6',
  },
  label: {
    color: '#6b7280',
    marginBottom: 4,
  },
  incomeText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  expenseText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  expenseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  expenseDetailItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  expenseDetailItemPressed: {
    backgroundColor: '#e5e7eb',
  },
  expenseDetailLabel: {
    color: '#9ca3af',
    marginBottom: 4,
  },
  fixedExpenseText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  variableExpenseText: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  balanceContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  balanceText: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  categoryItemPressed: {
    backgroundColor: '#f3f4f6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  categoryAmount: {
    fontWeight: '600',
    marginRight: 4,
  },
  categoryPercentage: {
    color: '#6b7280',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  description: {
    color: '#6b7280',
    marginTop: 2,
  },
  date: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCategoryDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  modalTotal: {
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  modalCount: {
    color: '#6b7280',
  },
  modalDivider: {
    marginVertical: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 16,
  },
  transactionDescription: {
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  transactionMerchant: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  transactionDivider: {
    marginVertical: 4,
  },
  categoryGroupContainer: {
    marginBottom: 8,
  },
  categoryGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryGroupTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  categoryGroupTotal: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  categoryGroupDivider: {
    marginVertical: 16,
    backgroundColor: '#e5e7eb',
    height: 2,
  },
  modalCloseButton: {
    marginTop: 20,
    marginBottom: 32,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 8,
  },
});
