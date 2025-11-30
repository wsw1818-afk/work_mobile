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
  const [groupStats, setGroupStats] = useState<Array<{
    groupId: number;
    groupName: string;
    groupColor: string;
    groupIcon: string | null;
    total: number;
    categories: Array<{
      categoryId: number;
      categoryName: string;
      categoryColor: string;
      total: number;
      percentage: number;
    }>;
  }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // 카테고리 상세 모달
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    color: string;
    total: number;
    transactions: Transaction[];
    showCategoryGroups?: boolean;
    categoryStats?: Array<{
      categoryId: number;
      categoryName: string;
      categoryColor: string;
      total: number;
      percentage: number;
    }>;
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
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');

      // 최적화: 통합 함수로 한 번에 로드 + 최근 거래는 병렬
      const [dashboardData, transactions] = await Promise.all([
        database.getDashboardData(year, month),
        database.getTransactions(startDate, endDate, false),
      ]);

      setMonthSummary(dashboardData.summary);
      setGroupStats(dashboardData.groupStats);

      // 최근 10개만
      setRecentTransactions(transactions.slice(0, 10));
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

      // 지출인 경우 그룹별로 정보 전달
      if (type === 'expense') {
        // 그룹 통계에서 카테고리 통계 추출
        const categoryStats = groupStats.flatMap(g => g.categories);
        setSelectedCategory({
          name: title,
          color: '#ef4444',
          total: total,
          transactions: filteredTransactions,
          showCategoryGroups: true,
          categoryStats: categoryStats,
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

  // 그룹 클릭 핸들러 (카테고리 목록과 거래 내역 함께 표시)
  const handleGroupClick = async (groupId: number, groupName: string, groupColor: string, groupIcon?: string | null) => {
    try {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const allTransactions = await database.getTransactions(startDate, endDate, false);

      // 해당 그룹의 카테고리 정보
      const group = groupStats.find(g => g.groupId === groupId);
      if (!group) return;

      const categoryNames = group.categories.map(c => c.categoryName);
      const filteredTransactions = allTransactions.filter(
        tx => tx.type === 'expense' && categoryNames.includes(tx.categoryName || '')
      );
      const total = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      setSelectedCategory({
        name: `${groupIcon || ''} ${groupName}`.trim(),
        color: groupColor,
        total: total,
        transactions: filteredTransactions,
        showCategoryGroups: true,
        categoryStats: group.categories,
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to load group transactions:', error);
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

          <View style={styles.expenseDetailContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupChipsScroll}>
              {groupStats.map((group) => (
                <Pressable
                  key={group.groupId}
                  style={({ pressed }) => [
                    styles.groupChip,
                    { borderColor: group.groupColor },
                    pressed && styles.groupChipPressed
                  ]}
                  onPress={() => handleGroupClick(group.groupId, group.groupName, group.groupColor, group.groupIcon)}
                >
                  <Text style={[styles.groupChipIcon]}>{group.groupIcon}</Text>
                  <View style={styles.groupChipText}>
                    <Text variant="bodySmall" style={styles.groupChipLabel}>{group.groupName}</Text>
                    <Text variant="bodyMedium" style={[styles.groupChipAmount, { color: group.groupColor }]}>
                      {Math.round(group.total).toLocaleString()}원
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
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

      {recentTransactions.length === 0 && groupStats.length === 0 && (
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
                              style={styles.modalTransactionLeft}
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
                        style={styles.modalTransactionLeft}
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
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingsIcon: {
    margin: 0,
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
  expenseDetailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  expenseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  expenseSettingsIcon: {
    margin: 0,
    marginLeft: 4,
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
    paddingBottom: 32,
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
  modalTransactionLeft: {
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
  settingsDescription: {
    color: '#6b7280',
    marginTop: 8,
  },
  sectionLabel: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
  },
  categorySettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  categorySettingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsDivider: {
    marginVertical: 16,
  },
  emptySettingsText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  sectionHint: {
    color: '#9ca3af',
    marginBottom: 12,
    fontSize: 12,
  },
  categorySettingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingActionButton: {
    margin: 0,
    marginRight: 4,
  },
  excludeChip: {
    height: 22,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  excludeChipText: {
    fontSize: 10,
    color: '#6b7280',
    marginVertical: 0,
  },
  fixedChip: {
    height: 22,
    backgroundColor: '#fef3c7',
    marginLeft: 8,
  },
  fixedChipText: {
    fontSize: 10,
    color: '#d97706',
    marginVertical: 0,
  },
  settingsLegend: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  legendText: {
    color: '#6b7280',
    marginBottom: 4,
  },
  // 그룹 칩 스타일
  groupChipsScroll: {
    flex: 1,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: '#f9fafb',
  },
  groupChipPressed: {
    backgroundColor: '#e5e7eb',
  },
  groupChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  groupChipText: {
    alignItems: 'flex-start',
  },
  groupChipLabel: {
    color: '#6b7280',
    fontSize: 11,
  },
  groupChipAmount: {
    fontWeight: '600',
    fontSize: 13,
  },
  // 카드 타이틀 그룹 스타일
  cardTitlePressable: {
    flex: 1,
  },
  groupTotalText: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  // 그룹 관리 모달 스타일
  addGroupButton: {
    marginBottom: 16,
  },
  groupSection: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  groupTitle: {
    fontWeight: 'bold',
  },
  groupActionButton: {
    margin: 0,
  },
  // 그룹 추가/수정 모달 스타일
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  nativeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    color: '#1f2937',
  },
  colorLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  groupModalContent: {
    padding: 20,
  },
  groupModalButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 16,
    marginBottom: 24,
  },
  modalButton: {
    flex: 1,
  },
});
