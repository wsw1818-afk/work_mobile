import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Clipboard, Alert, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Portal, Modal, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { database, Transaction } from '../lib/db/database';
import { theme } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { useTransactionContext } from '../lib/TransactionContext';

// 년도/월 선택 모달 컴포넌트
const YearMonthPicker = memo(({
  visible,
  onDismiss,
  selectedDate,
  onSelect,
  currentTheme,
}: {
  visible: boolean;
  onDismiss: () => void;
  selectedDate: Date;
  onSelect: (year: number, month: number) => void;
  currentTheme: any;
}) => {
  const [pickerYear, setPickerYear] = useState(selectedDate.getFullYear());
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);

  // 모달이 열릴 때마다 선택된 년도로 초기화
  useEffect(() => {
    if (visible) {
      setPickerYear(selectedDate.getFullYear());
    }
  }, [visible, selectedDate]);

  const isDisabled = (year: number, month: number) => {
    return year > currentYear || (year === currentYear && month > currentMonth);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.yearMonthModal, { backgroundColor: currentTheme.colors.surface }]}
      >
        <Text style={[styles.yearMonthTitle, { color: currentTheme.colors.text }]}>년도/월 선택</Text>

        {/* 년도 선택 */}
        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={[styles.yearArrowBtn, { backgroundColor: currentTheme.colors.surfaceVariant }]}
            onPress={() => setPickerYear(prev => Math.max(prev - 1, currentYear - 9))}
            disabled={pickerYear <= currentYear - 9}
          >
            <Ionicons name="chevron-back" size={20} color={pickerYear <= currentYear - 9 ? currentTheme.colors.textMuted : currentTheme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: currentTheme.colors.text }]}>{pickerYear}년</Text>
          <TouchableOpacity
            style={[styles.yearArrowBtn, { backgroundColor: currentTheme.colors.surfaceVariant }]}
            onPress={() => setPickerYear(prev => Math.min(prev + 1, currentYear))}
            disabled={pickerYear >= currentYear}
          >
            <Ionicons name="chevron-forward" size={20} color={pickerYear >= currentYear ? currentTheme.colors.textMuted : currentTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* 월 선택 그리드 */}
        <View style={styles.monthGrid}>
          {months.map((month) => {
            const disabled = isDisabled(pickerYear, month);
            const isSelected = pickerYear === selectedDate.getFullYear() && month === selectedDate.getMonth() + 1;
            return (
              <TouchableOpacity
                key={month}
                style={[
                  styles.monthItem,
                  { backgroundColor: currentTheme.colors.surfaceVariant },
                  isSelected && { backgroundColor: currentTheme.colors.primary },
                  disabled && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (!disabled) {
                    onSelect(pickerYear, month);
                    onDismiss();
                  }
                }}
                disabled={disabled}
              >
                <Text style={[
                  styles.monthItemText,
                  { color: currentTheme.colors.text },
                  isSelected && { color: '#fff' },
                ]}>
                  {month}월
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.yearMonthCloseBtn, { backgroundColor: currentTheme.colors.surfaceVariant }]}
          onPress={onDismiss}
        >
          <Text style={[styles.yearMonthCloseBtnText, { color: currentTheme.colors.textSecondary }]}>닫기</Text>
        </TouchableOpacity>
      </Modal>
    </Portal>
  );
});

// 거래 항목 메모이제이션 컴포넌트
const TransactionItem = memo(({ transaction }: { transaction: Transaction }) => (
  <View style={styles.transactionItem}>
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
      numberOfLines={1}
    >
      {transaction.type === 'income' ? '+' : '-'}
      {Math.round(transaction.amount).toLocaleString()}원
    </Text>
  </View>
));

// 그룹 카드 메모이제이션 컴포넌트
const GroupCard = memo(({ group, onPress }: {
  group: { groupId: number; groupName: string; groupColor: string; groupIcon: string | null; total: number };
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.groupCard,
      pressed && styles.groupCardPressed
    ]}
    onPress={onPress}
  >
    <View style={[styles.groupIconCircle, { backgroundColor: group.groupColor + '20' }]}>
      <Text style={styles.groupIcon}>{group.groupIcon || '📁'}</Text>
    </View>
    <Text style={styles.groupName} numberOfLines={1}>{group.groupName}</Text>
    <Text style={[styles.groupAmount, { color: group.groupColor }]} numberOfLines={1}>
      {Math.round(group.total).toLocaleString()}원
    </Text>
  </Pressable>
));

export default function DashboardScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { theme: currentTheme } = useTheme();
  const { lastUpdate } = useTransactionContext();
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


  // 월별 선택 기능 (네비게이션 파라미터로 특정 월 지정 가능)
  const initialDate = useMemo(() => {
    if (route?.params?.targetYear && route?.params?.targetMonth) {
      return new Date(route.params.targetYear, route.params.targetMonth - 1, 1);
    }
    return new Date();
  }, [route?.params?.targetYear, route?.params?.targetMonth]);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // 네비게이션 파라미터 변경 시 날짜 업데이트
  useEffect(() => {
    if (route?.params?.targetYear && route?.params?.targetMonth) {
      setSelectedDate(new Date(route.params.targetYear, route.params.targetMonth - 1, 1));
    }
  }, [route?.params?.targetYear, route?.params?.targetMonth]);

  // useMemo로 year, month 계산 최적화
  const { year, month } = useMemo(() => ({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
  }), [selectedDate]);

  // useCallback으로 월 변경 함수 최적화
  const goToPreviousMonth = useCallback(() => {
    setSelectedDate(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate(prev => addMonths(prev, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // 년도/월 선택 모달 상태
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);

  const handleYearMonthSelect = useCallback((year: number, month: number) => {
    setSelectedDate(new Date(year, month - 1, 1));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');

      // 최적화: 통합 함수로 한 번에 로드 + 최근 거래는 병렬
      const [dashboardData, transactions] = await Promise.all([
        database.getDashboardData(year, month),
        database.getTransactions(startDate, endDate, false),
      ]);

      console.log('=== Dashboard Data ===');
      console.log('Summary:', dashboardData.summary);
      console.log('Transactions count:', transactions.length);
      console.log('First 3 transactions:', transactions.slice(0, 3).map(t => ({
        type: t.type,
        amount: t.amount,
        categoryName: t.categoryName,
        date: t.date
      })));

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

  // lastUpdate가 변경되면 데이터 새로고침 (거래 추가/삭제 시 실시간 반영)
  useEffect(() => {
    loadData();
  }, [loadData, lastUpdate]);

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
      // 대시보드와 동일하게 계산 (excludeFromStats인 카테고리 제외)
      const total = type === 'income' ? monthSummary.income : monthSummary.expense;

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

  // useMemo로 계산값 최적화 (훅은 조건문 전에 호출해야 함)
  const balance = useMemo(() => monthSummary.income - monthSummary.expense, [monthSummary]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  }, [year, month]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* 헤더 */}
      <LinearGradient
        colors={currentTheme.gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + currentTheme.spacing.md }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.getParent()?.openDrawer()}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>대시보드</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </LinearGradient>

      {/* 월 선택 */}
      <View style={[styles.monthSelectorContainer, { backgroundColor: currentTheme.colors.surface }]}>
          <TouchableOpacity onPress={goToPreviousMonth} style={[styles.monthArrowNew, { backgroundColor: currentTheme.colors.background }]}>
            <Ionicons name="chevron-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setYearMonthPickerVisible(true)} style={styles.monthDisplay}>
            <Text style={[styles.monthText, { color: currentTheme.colors.text }]}>
              {format(selectedDate, 'yyyy년 M월', { locale: ko })}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={currentTheme.colors.primary} style={{ marginLeft: 6 }} />
            {!isCurrentMonth && (
              <TouchableOpacity onPress={goToCurrentMonth} style={[styles.todayBadge, { backgroundColor: currentTheme.colors.primary + '20', marginLeft: 8 }]}>
                <Text style={[styles.todayBadgeText, { color: currentTheme.colors.primary }]}>이번 달</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.monthArrowNew, { backgroundColor: currentTheme.colors.background }]}
            disabled={isCurrentMonth}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isCurrentMonth ? currentTheme.colors.textMuted : currentTheme.colors.text}
            />
          </TouchableOpacity>
      </View>

      {/* 년도/월 선택 모달 */}
      <YearMonthPicker
        visible={yearMonthPickerVisible}
        onDismiss={() => setYearMonthPickerVisible(false)}
        selectedDate={selectedDate}
        onSelect={handleYearMonthSelect}
        currentTheme={currentTheme}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[currentTheme.colors.primary]}
            tintColor={currentTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 요약 카드 - Dokterian 스타일 */}
        <View style={[styles.summaryCard, { backgroundColor: currentTheme.colors.surface }]}>
          <View style={[styles.balanceSection, { borderBottomColor: currentTheme.colors.divider }]}>
            <Text style={[styles.balanceLabel, { color: currentTheme.colors.textSecondary }]}>이번 달 잔액</Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: balance >= 0 ? currentTheme.colors.income : currentTheme.colors.expense }
              ]}
              numberOfLines={1}
            >
              {balance >= 0 ? '+' : ''}{Math.round(balance).toLocaleString()}원
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Pressable
              style={({ pressed }) => [
                styles.summaryItem,
                { backgroundColor: currentTheme.colors.income + '10' },
                pressed && styles.summaryItemPressed
              ]}
              onPress={() => handleSummaryClick('income', '수입')}
            >
              <View style={[styles.summaryIcon, { backgroundColor: currentTheme.colors.income + '20' }]}>
                <Ionicons name="arrow-down" size={18} color={currentTheme.colors.income} />
              </View>
              <Text style={[styles.summaryLabel, { color: currentTheme.colors.textSecondary }]}>수입</Text>
              <Text
                style={[styles.summaryAmount, { color: currentTheme.colors.income }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                +{Math.round(monthSummary.income).toLocaleString()}원
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.summaryItem,
                { backgroundColor: currentTheme.colors.expense + '10' },
                pressed && styles.summaryItemPressed
              ]}
              onPress={() => handleSummaryClick('expense', '지출')}
            >
              <View style={[styles.summaryIcon, { backgroundColor: currentTheme.colors.expense + '20' }]}>
                <Ionicons name="arrow-up" size={18} color={currentTheme.colors.expense} />
              </View>
              <Text style={[styles.summaryLabel, { color: currentTheme.colors.textSecondary }]}>지출</Text>
              <Text
                style={[styles.summaryAmount, { color: currentTheme.colors.expense }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                -{Math.round(monthSummary.expense).toLocaleString()}원
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 지출 그룹 - Dokterian 카드 스타일 (메모이제이션 적용) */}
        {groupStats.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>지출 카테고리</Text>
            <View style={styles.groupGrid}>
              {groupStats.map((group) => (
                <GroupCard
                  key={group.groupId}
                  group={group}
                  onPress={() => handleGroupClick(group.groupId, group.groupName, group.groupColor, group.groupIcon)}
                />
              ))}
            </View>
          </View>
        )}

        {/* 최근 거래 내역 - Dokterian 리스트 스타일 (메모이제이션 적용) */}
        {recentTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>최근 거래</Text>
            <View style={[styles.transactionList, { backgroundColor: currentTheme.colors.surface }]}>
              {recentTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </View>
          </View>
        )}

        {recentTransactions.length === 0 && groupStats.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="wallet-outline" size={64} color={currentTheme.colors.textMuted} />
            </View>
            <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>거래 내역이 없습니다</Text>
            <Text style={[styles.emptySubtext, { color: currentTheme.colors.textMuted }]}>하단의 + 버튼을 눌러 거래를 추가해보세요!</Text>
          </View>
        )}

        {/* 카테고리 상세 모달 */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: currentTheme.colors.surface }]}
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
                    <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>
                      {selectedCategory.name}
                    </Text>
                  </View>
                  <Text style={[styles.modalTotal, { color: selectedCategory.color }]} numberOfLines={1}>
                    {Math.round(selectedCategory.total).toLocaleString()}원
                  </Text>
                  <Text style={[styles.modalCount, { color: currentTheme.colors.textSecondary }]}>
                    총 {selectedCategory.transactions.length}건
                  </Text>
                </View>

                <Divider style={[styles.modalDivider, { backgroundColor: currentTheme.colors.divider }]} />

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
                        <View style={[styles.categoryGroupHeader, { backgroundColor: currentTheme.colors.surfaceVariant }]}>
                          <View style={styles.categoryGroupTitleRow}>
                            <View
                              style={[
                                styles.categoryDot,
                                { backgroundColor: stat.categoryColor }
                              ]}
                            />
                            <Text style={[styles.categoryGroupTitle, { color: currentTheme.colors.text }]}>
                              {stat.categoryName}
                            </Text>
                          </View>
                          <Text style={[styles.categoryGroupTotal, { color: stat.categoryColor }]} numberOfLines={1}>
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
                                <Text style={[styles.modalTransactionDesc, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                  {transaction.description || transaction.merchant || '거래'}
                                </Text>
                                <Text style={[styles.modalTransactionDate, { color: currentTheme.colors.textMuted }]}>
                                  {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                                </Text>
                              </Pressable>
                              <Text style={[styles.modalTransactionAmount, { color: currentTheme.colors.expense }]} numberOfLines={1}>
                                -{Math.round(transaction.amount).toLocaleString()}원
                              </Text>
                            </View>
                            {txIndex < categoryTransactions.length - 1 && (
                              <Divider style={[styles.transactionDivider, { backgroundColor: currentTheme.colors.divider }]} />
                            )}
                          </View>
                        ))}

                        {statIndex < selectedCategory.categoryStats!.length - 1 && (
                          <Divider style={[styles.categoryGroupDivider, { backgroundColor: currentTheme.colors.border }]} />
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
                          <Text style={[styles.modalTransactionDesc, { color: currentTheme.colors.text }]} numberOfLines={1}>
                            {transaction.description || transaction.merchant || '거래'}
                          </Text>
                          <Text style={[styles.modalTransactionDate, { color: currentTheme.colors.textMuted }]}>
                            {format(new Date(transaction.date), 'M월 d일 (E)', { locale: ko })}
                          </Text>
                        </Pressable>
                        <Text
                          style={[
                            styles.modalTransactionAmount,
                            { color: transaction.type === 'income' ? currentTheme.colors.income : currentTheme.colors.expense }
                          ]}
                          numberOfLines={1}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {Math.round(transaction.amount).toLocaleString()}원
                        </Text>
                      </View>
                      {index < selectedCategory.transactions.length - 1 && (
                        <Divider style={[styles.transactionDivider, { backgroundColor: currentTheme.colors.divider }]} />
                      )}
                    </View>
                  ))
                )}

                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: currentTheme.colors.primary }]}
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
  headerContent: {
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrow: {
    padding: 8,
  },
  monthArrowNew: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  todayBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  todayBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
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
    marginTop: 32,
    marginBottom: 16,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // 년도/월 선택 모달
  yearMonthModal: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
  },
  yearMonthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  yearArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  monthItem: {
    width: '22%',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  monthItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  yearMonthCloseBtn: {
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  yearMonthCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
