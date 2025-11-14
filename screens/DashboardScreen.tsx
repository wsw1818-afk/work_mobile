import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { database, Transaction } from '../lib/db/database';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthSummary, setMonthSummary] = useState({ income: 0, expense: 0 });
  const [categoryStats, setCategoryStats] = useState<Array<{
    categoryName: string;
    categoryColor: string;
    total: number;
    percentage: number;
  }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const loadData = useCallback(async () => {
    try {
      // 이번 달 요약
      const summary = await database.getMonthSummary(year, month);
      setMonthSummary(summary);

      // 카테고리별 통계
      const stats = await database.getCategoryStats(year, month);
      setCategoryStats(stats.slice(0, 5)); // 상위 5개만

      // 최근 거래 내역
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const transactions = await database.getTransactions(startDate, endDate);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const balance = monthSummary.income - monthSummary.expense;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 이번 달 요약 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            {format(now, 'yyyy년 M월', { locale: ko })}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="bodyMedium" style={styles.label}>수입</Text>
              <Text variant="titleMedium" style={styles.incomeText}>
                +{monthSummary.income.toLocaleString()}원
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text variant="bodyMedium" style={styles.label}>지출</Text>
              <Text variant="titleMedium" style={styles.expenseText}>
                -{monthSummary.expense.toLocaleString()}원
              </Text>
            </View>
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
              {balance >= 0 ? '+' : ''}{balance.toLocaleString()}원
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* 카테고리별 지출 */}
      {categoryStats.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              카테고리별 지출 (상위 5개)
            </Text>
            {categoryStats.map((stat, index) => (
              <View key={index} style={styles.categoryItem}>
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
                    {stat.total.toLocaleString()}원
                  </Text>
                  <Text variant="bodySmall" style={styles.categoryPercentage}>
                    ({stat.percentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>
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
                  <View>
                    <Text variant="bodyMedium">{transaction.categoryName}</Text>
                    {transaction.description && (
                      <Text variant="bodySmall" style={styles.description}>
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
                  {transaction.amount.toLocaleString()}원
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
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
});
