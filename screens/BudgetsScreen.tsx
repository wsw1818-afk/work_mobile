import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, ProgressBar, FAB, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { database, Budget, Category } from '../lib/db/database';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../lib/theme';

interface BudgetWithSpent extends Budget {
  spent: number;
  percentage: number;
}

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  // 예산 추가 다이얼로그
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [limitAmount, setLimitAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 지출 카테고리만 가져오기
      const expenseCategories = await database.getCategories('expense');
      setCategories(expenseCategories.filter(c => !c.excludeFromStats));

      // 현재 월 예산 가져오기
      const budgetList = await database.getBudgets(currentMonth);

      // 각 예산별 사용 금액 계산
      const [year, month] = currentMonth.split('-').map(Number);
      const budgetsWithSpent = await Promise.all(
        budgetList.map(async (budget) => {
          const startDate = `${currentMonth}-01`;
          const endDate = `${currentMonth}-31`;

          // 제외 패턴이 적용된 거래만 가져오기 (includeExcluded = false)
          const transactions = await database.getTransactions(startDate, endDate, false);
          const spent = transactions
            .filter(t => t.categoryId === budget.categoryId && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

          const percentage = budget.limitAmount > 0 ? (spent / budget.limitAmount) * 100 : 0;

          return {
            ...budget,
            spent,
            percentage,
          };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error('Failed to load budgets:', error);
      Alert.alert('오류', '예산 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAddBudget = async () => {
    if (!selectedCategoryId || !limitAmount || parseFloat(limitAmount) <= 0) {
      Alert.alert('입력 오류', '카테고리와 예산 금액을 올바르게 입력해주세요.');
      return;
    }

    try {
      await database.addBudget({
        month: currentMonth,
        categoryId: selectedCategoryId,
        limitAmount: parseFloat(limitAmount),
      });

      setAddDialogVisible(false);
      setSelectedCategoryId(null);
      setLimitAmount('');
      loadData();
      Alert.alert('성공', '예산이 추가되었습니다.');
    } catch (error: any) {
      console.error('Failed to add budget:', error);
      if (error.message?.includes('UNIQUE')) {
        Alert.alert('오류', '해당 카테고리의 예산이 이미 존재합니다.');
      } else {
        Alert.alert('오류', '예산 추가에 실패했습니다.');
      }
    }
  };

  const handleDeleteBudget = (budget: BudgetWithSpent) => {
    Alert.alert(
      '예산 삭제',
      `${budget.categoryName} 예산을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteBudget(budget.id);
              loadData();
              Alert.alert('성공', '예산이 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete budget:', error);
              Alert.alert('오류', '예산 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#ef4444';
    if (percentage >= 80) return '#f59e0b';
    return '#10b981';
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // 아직 예산이 설정되지 않은 카테고리 필터링
  const availableCategories = categories.filter(
    c => !budgets.some(b => b.categoryId === c.id)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 월 선택 */}
      <View style={styles.monthSelectorContainer}>
        <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth('prev')}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.monthDisplay}>
          <Ionicons name="calendar" size={18} color={theme.colors.primary} />
          <Text style={styles.monthText}>{currentMonth}</Text>
        </View>
        <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth('next')}>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* 전체 예산 요약 */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="wallet" size={20} color={theme.colors.primary} />
          <Text style={styles.summaryTitle}>전체 예산 현황</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>예산</Text>
            <Text style={styles.summaryValue}>{Math.round(totalBudget).toLocaleString()}원</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>사용</Text>
            <Text style={[styles.summaryValue, { color: getProgressColor(totalPercentage) }]}>
              {Math.round(totalSpent).toLocaleString()}원
            </Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={Math.min(totalPercentage / 100, 1)}
            color={getProgressColor(totalPercentage)}
            style={styles.progressBar}
          />
          <Text style={styles.percentageText}>
            {totalPercentage.toFixed(1)}% 사용
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {budgets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calculator-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>이번 달 예산이 설정되지 않았습니다</Text>
            <Text style={styles.emptySubtext}>+ 버튼을 눌러 예산을 추가하세요</Text>
          </View>
        ) : (
          budgets.map((budget) => (
            <View key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetTitleRow}>
                  <View style={[styles.categoryDot, { backgroundColor: budget.percentage >= 100 ? theme.colors.expense : theme.colors.primary }]} />
                  <Text style={styles.budgetCategoryName}>{budget.categoryName}</Text>
                </View>
                <View style={[
                  styles.percentageBadge,
                  { backgroundColor: budget.percentage >= 100 ? 'rgba(239, 68, 68, 0.1)' : budget.percentage >= 80 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)' }
                ]}>
                  <Text style={[
                    styles.percentageBadgeText,
                    { color: getProgressColor(budget.percentage) }
                  ]}>
                    {budget.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>예산</Text>
                  <Text style={styles.amountValue}>{Math.round(budget.limitAmount).toLocaleString()}원</Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>사용</Text>
                  <Text style={[styles.amountValue, { color: getProgressColor(budget.percentage) }]}>
                    {Math.round(budget.spent).toLocaleString()}원
                  </Text>
                </View>
              </View>

              <ProgressBar
                progress={Math.min(budget.percentage / 100, 1)}
                color={getProgressColor(budget.percentage)}
                style={styles.budgetProgressBar}
              />

              {budget.percentage >= 100 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color={theme.colors.expense} />
                  <Text style={styles.warningText}>
                    예산을 {Math.round((budget.spent - budget.limitAmount)).toLocaleString()}원 초과했습니다
                  </Text>
                </View>
              )}
              {budget.percentage >= 80 && budget.percentage < 100 && (
                <View style={styles.cautionBox}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
                  <Text style={styles.cautionText}>
                    남은 예산: {Math.round((budget.limitAmount - budget.spent)).toLocaleString()}원
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteBudget(budget)}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 예산 추가 FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        color="#fff"
        onPress={() => {
          if (availableCategories.length === 0) {
            Alert.alert('알림', '모든 카테고리에 예산이 설정되었습니다.');
            return;
          }
          setAddDialogVisible(true);
        }}
      />

      {/* 예산 추가 모달 */}
      <Modal visible={addDialogVisible} onRequestClose={() => setAddDialogVisible(false)} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>예산 추가</Text>
                  <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>카테고리</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedCategoryId}
                        onValueChange={(value) => setSelectedCategoryId(value)}
                      >
                        <Picker.Item label="카테고리 선택" value={null} />
                        {availableCategories.map((cat) => (
                          <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                        ))}
                      </Picker>
                    </View>

                    <TextInput
                      label="예산 금액"
                      value={limitAmount}
                      onChangeText={setLimitAmount}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.input}
                      right={<TextInput.Affix text="원" />}
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />
                  </ScrollView>
                  <View style={styles.modalActions}>
                    <Button mode="outlined" onPress={() => setAddDialogVisible(false)} style={styles.modalButton}>취소</Button>
                    <Button mode="contained" onPress={handleAddBudget} style={styles.modalButton}>추가</Button>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  monthButton: {
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
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
  },
  monthText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  progressContainer: {
    marginTop: theme.spacing.md,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceVariant,
  },
  percentageText: {
    textAlign: 'right',
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 100,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  budgetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  budgetCategoryName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  percentageBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  percentageBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  budgetProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceVariant,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: theme.borderRadius.sm,
  },
  warningText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.expense,
    fontWeight: theme.fontWeight.medium,
  },
  cautionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: theme.borderRadius.sm,
  },
  cautionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
    fontWeight: theme.fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  deleteButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.expense,
    fontWeight: theme.fontWeight.medium,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.lg,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.lg,
  },
  label: {
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  modalButton: {
    minWidth: 80,
  },
});
