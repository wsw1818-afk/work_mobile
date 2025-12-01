import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Clipboard, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Portal, Modal, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { database, Transaction } from '../lib/db/database';
import { theme } from '../lib/theme';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
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
          color: theme.colors.expense,
          total: total,
          transactions: filteredTransactions,
          showCategoryGroups: true,
          categoryStats: categoryStats,
        });
      } else {
        setSelectedCategory({
          name: title,
          color: theme.colors.income,
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const balance = monthSummary.income - monthSummary.expense;

  const isCurrentMonth =
    year === new Date().getFullYear() &&
    month === new Date().getMonth() + 1;

  return (
    <View style={styles.container}>
      {/* 헤더 - Dokterian 스타일 그라데이션 */}
      <LinearGradient
        colors={theme.gradients.header as [string, string]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>안녕하세요!</Text>
          <Text style={styles.headerTitle}>가계부</Text>
        </View>

        {/* 월 선택 */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToCurrentMonth} style={styles.monthDisplay}>
            <Text style={styles.monthText}>
              {format(selectedDate, 'yyyy년 M월', { locale: ko })}
            </Text>
            {!isCurrentMonth && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>이번 달</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.monthArrow}
            disabled={isCurrentMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isCurrentMonth ? 'rgba(255,255,255,0.3)' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 요약 카드 - Dokterian 스타일 */}
        <View style={styles.summaryCard}>
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>이번 달 잔액</Text>
            <Text style={[
              styles.balanceAmount,
              { color: balance >= 0 ? theme.colors.income : theme.colors.expense }
            ]}>
              {balance >= 0 ? '+' : ''}{Math.round(balance).toLocaleString()}원
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Pressable
              style={({ pressed }) => [
                styles.summaryItem,
                styles.incomeItem,
                pressed && styles.summaryItemPressed
              ]}
              onPress={() => handleSummaryClick('income', '수입')}
            >
              <View style={[styles.summaryIcon, { backgroundColor: theme.colors.income + '20' }]}>
                <Ionicons name="arrow-down" size={20} color={theme.colors.income} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>수입</Text>
                <Text style={[styles.summaryAmount, { color: theme.colors.income }]}>
                  +{Math.round(monthSummary.income).toLocaleString()}원
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.summaryItem,
                styles.expenseItem,
                pressed && styles.summaryItemPressed
              ]}
              onPress={() => handleSummaryClick('expense', '지출')}
            >
              <View style={[styles.summaryIcon, { backgroundColor: theme.colors.expense + '20' }]}>
                <Ionicons name="arrow-up" size={20} color={theme.colors.expense} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>지출</Text>
                <Text style={[styles.summaryAmount, { color: theme.colors.expense }]}>
                  -{Math.round(monthSummary.expense).toLocaleString()}원
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* 지출 그룹 - Dokterian 카드 스타일 */}
        {groupStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>지출 카테고리</Text>
            <View style={styles.groupGrid}>
              {groupStats.map((group) => (
                <Pressable
                  key={group.groupId}
                  style={({ pressed }) => [
                    styles.groupCard,
                    pressed && styles.groupCardPressed
                  ]}
                  onPress={() => handleGroupClick(group.groupId, group.groupName, group.groupColor, group.groupIcon)}
                >
                  <View style={[styles.groupIconCircle, { backgroundColor: group.groupColor + '20' }]}>
                    <Text style={styles.groupIcon}>{group.groupIcon || '📁'}</Text>
                  </View>
                  <Text style={styles.groupName} numberOfLines={1}>{group.groupName}</Text>
                  <Text style={[styles.groupAmount, { color: group.groupColor }]}>
                    {Math.round(group.total).toLocaleString()}원
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 최근 거래 내역 - Dokterian 리스트 스타일 */}
        {recentTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>최근 거래</Text>
            <View style={styles.transactionList}>
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: (transaction.categoryColor || theme.colors.textMuted) + '20' }
                  ]}>
                    <View style={[
                      styles.transactionDot,
                      { backgroundColor: transaction.categoryColor || theme.colors.textMuted }
                    ]} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionCategory} numberOfLines={1}>
                      {transaction.categoryName}
                    </Text>
                    {transaction.description && (
                      <Text style={styles.transactionDesc} numberOfLines={1}>
                        {transaction.description}
                      </Text>
                    )}
                    <Text style={styles.transactionDate}>
                      {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? theme.colors.income : theme.colors.expense }
                    ]}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {Math.round(transaction.amount).toLocaleString()}원
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recentTransactions.length === 0 && groupStats.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="wallet-outline" size={64} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
            <Text style={styles.emptySubtext}>하단의 + 버튼을 눌러 거래를 추가해보세요!</Text>
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
                    <Text style={styles.modalTitle}>
                      {selectedCategory.name}
                    </Text>
                  </View>
                  <Text style={[styles.modalTotal, { color: selectedCategory.color }]}>
                    {Math.round(selectedCategory.total).toLocaleString()}원
                  </Text>
                  <Text style={styles.modalCount}>
                    총 {selectedCategory.transactions.length}건
                  </Text>
                </View>

                <Divider style={styles.modalDivider} />

                {/* 거래 내역 목록 */}
                {selectedCategory.transactions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
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
                            <Text style={styles.categoryGroupTitle}>
                              {stat.categoryName}
                            </Text>
                          </View>
                          <Text style={[styles.categoryGroupTotal, { color: stat.categoryColor }]}>
                            {Math.round(stat.total).toLocaleString()}원
                          </Text>
                        </View>

                        {/* 카테고리 내 거래 목록 */}
                        {categoryTransactions.map((transaction, txIndex) => (
                          <View key={transaction.id}>
                            <View style={styles.modalTransactionRow}>
                              <Pressable
                                style={styles.modalTransactionLeft}
                                onLongPress={() => {
                                  const text = `${transaction.description || transaction.merchant || '거래'}`;
                                  copyToClipboard(text, '거래 내용');
                                }}
                                delayLongPress={1000}
                              >
                                <Text style={styles.modalTransactionDesc} numberOfLines={1}>
                                  {transaction.description || transaction.merchant || '거래'}
                                </Text>
                                <Text style={styles.modalTransactionDate}>
                                  {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                                </Text>
                              </Pressable>
                              <Text style={[styles.modalTransactionAmount, { color: theme.colors.expense }]}>
                                -{Math.round(transaction.amount).toLocaleString()}원
                              </Text>
                            </View>
                            {txIndex < categoryTransactions.length - 1 && (
                              <Divider style={styles.transactionDivider} />
                            )}
                          </View>
                        ))}

                        {statIndex < selectedCategory.categoryStats!.length - 1 && (
                          <Divider style={styles.categoryGroupDivider} />
                        )}
                      </View>
                    );
                  })
                ) : (
                  // 일반 거래 목록 뷰
                  selectedCategory.transactions.map((transaction, index) => (
                    <View key={transaction.id}>
                      <View style={styles.modalTransactionRow}>
                        <Pressable
                          style={styles.modalTransactionLeft}
                          onLongPress={() => {
                            const text = `${transaction.description || transaction.merchant || '거래'}`;
                            copyToClipboard(text, '거래 내용');
                          }}
                          delayLongPress={1000}
                        >
                          <Text style={styles.modalTransactionDesc} numberOfLines={1}>
                            {transaction.description || transaction.merchant || '거래'}
                          </Text>
                          <Text style={styles.modalTransactionDate}>
                            {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                          </Text>
                        </Pressable>
                        <Text
                          style={[
                            styles.modalTransactionAmount,
                            { color: transaction.type === 'income' ? theme.colors.income : theme.colors.expense }
                          ]}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {Math.round(transaction.amount).toLocaleString()}원
                        </Text>
                      </View>
                      {index < selectedCategory.transactions.length - 1 && (
                        <Divider style={styles.transactionDivider} />
                      )}
                    </View>
                  ))
                )}

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>닫기</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Modal>
        </Portal>
      </ScrollView>
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
  // 헤더 - Dokterian 스타일
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrow: {
    padding: 8,
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  todayBadgeText: {
    fontSize: 10,
    color: '#fff',
  },
  // 스크롤 영역
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  // 요약 카드
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    ...theme.shadows.md,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.borderRadius.lg,
  },
  incomeItem: {
    backgroundColor: theme.colors.income + '10',
  },
  expenseItem: {
    backgroundColor: theme.colors.expense + '10',
  },
  summaryItemPressed: {
    opacity: 0.7,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  // 섹션
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  // 그룹 그리드
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  groupCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  groupCardPressed: {
    opacity: 0.7,
  },
  groupIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupIcon: {
    fontSize: 24,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  groupAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // 거래 목록
  transactionList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  transactionDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  // 모달
  modalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: theme.borderRadius.xl,
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
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalTotal: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modalDivider: {
    marginVertical: 16,
    backgroundColor: theme.colors.divider,
  },
  modalTransactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  modalTransactionLeft: {
    flex: 1,
    marginRight: 16,
  },
  modalTransactionDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalTransactionDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalTransactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  transactionDivider: {
    marginVertical: 4,
    backgroundColor: theme.colors.divider,
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
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  categoryGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryGroupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  categoryGroupTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryGroupDivider: {
    marginVertical: 16,
    backgroundColor: theme.colors.border,
    height: 2,
  },
  modalCloseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
