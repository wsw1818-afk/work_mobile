import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput, ProgressBar, FAB, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { database, Budget, Category } from '../lib/db/database';
import { Picker } from '@react-native-picker/picker';

interface BudgetWithSpent extends Budget {
  spent: number;
  percentage: number;
}

export default function BudgetsScreen() {
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

          const transactions = await database.getTransactions(startDate, endDate);
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

  return (
    <View style={styles.container}>
      {/* 월 선택 */}
      <View style={styles.monthSelector}>
        <Button mode="text" onPress={() => changeMonth('prev')}>
          이전
        </Button>
        <Text variant="titleLarge">{currentMonth}</Text>
        <Button mode="text" onPress={() => changeMonth('next')}>
          다음
        </Button>
      </View>

      {/* 전체 예산 요약 */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>전체 예산 현황</Text>
          <View style={styles.summaryRow}>
            <Text>예산: {totalBudget.toLocaleString()}원</Text>
            <Text>사용: {totalSpent.toLocaleString()}원</Text>
          </View>
          <ProgressBar
            progress={Math.min(totalPercentage / 100, 1)}
            color={getProgressColor(totalPercentage)}
            style={styles.progressBar}
          />
          <Text style={styles.percentageText}>
            {totalPercentage.toFixed(1)}% 사용
          </Text>
        </Card.Content>
      </Card>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {budgets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>이번 달 예산이 설정되지 않았습니다.</Text>
              <Text style={styles.emptySubtext}>아래 + 버튼을 눌러 예산을 추가하세요.</Text>
            </Card.Content>
          </Card>
        ) : (
          budgets.map((budget) => (
            <Card key={budget.id} style={styles.budgetCard}>
              <Card.Content>
                <View style={styles.budgetHeader}>
                  <Text variant="titleMedium">{budget.categoryName}</Text>
                  <Chip
                    mode="flat"
                    style={{
                      backgroundColor: budget.percentage >= 100 ? '#fee2e2' : budget.percentage >= 80 ? '#fef3c7' : '#d1fae5',
                    }}
                  >
                    {budget.percentage.toFixed(0)}%
                  </Chip>
                </View>

                <View style={styles.amountRow}>
                  <Text>예산: {budget.limitAmount.toLocaleString()}원</Text>
                  <Text style={{ color: budget.percentage >= 100 ? '#ef4444' : '#000' }}>
                    사용: {budget.spent.toLocaleString()}원
                  </Text>
                </View>

                <ProgressBar
                  progress={Math.min(budget.percentage / 100, 1)}
                  color={getProgressColor(budget.percentage)}
                  style={styles.progressBar}
                />

                {budget.percentage >= 100 && (
                  <Text style={styles.warningText}>
                    ⚠️ 예산을 {((budget.spent - budget.limitAmount)).toLocaleString()}원 초과했습니다!
                  </Text>
                )}
                {budget.percentage >= 80 && budget.percentage < 100 && (
                  <Text style={styles.cautionText}>
                    주의: 남은 예산 {(budget.limitAmount - budget.spent).toLocaleString()}원
                  </Text>
                )}
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleDeleteBudget(budget)}>삭제</Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      {/* 예산 추가 FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          if (availableCategories.length === 0) {
            Alert.alert('알림', '모든 카테고리에 예산이 설정되었습니다.');
            return;
          }
          setAddDialogVisible(true);
        }}
      />

      {/* 예산 추가 다이얼로그 */}
      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>예산 추가</Dialog.Title>
          <Dialog.Content>
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
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>취소</Button>
            <Button onPress={handleAddBudget}>추가</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
  },
  summaryTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  percentageText: {
    textAlign: 'right',
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    margin: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
  },
  budgetCard: {
    margin: 16,
    marginTop: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  warningText: {
    color: '#ef4444',
    marginTop: 8,
    fontWeight: 'bold',
  },
  cautionText: {
    color: '#f59e0b',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  label: {
    marginBottom: 8,
    color: '#666',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
});
