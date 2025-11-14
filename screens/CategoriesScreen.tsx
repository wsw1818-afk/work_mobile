import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { database, Category } from '../lib/db/database';

export default function CategoriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await database.getCategories(type);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCategories();
  }, [loadCategories]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerText}>
          카테고리 목록
        </Text>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as 'income' | 'expense')}
          buttons={[
            { value: 'income', label: '수입' },
            { value: 'expense', label: '지출' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            {categories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  카테고리가 없습니다.
                </Text>
              </View>
            ) : (
              categories.map((category, index) => (
                <View key={category.id}>
                  <View style={styles.categoryItem}>
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: category.color },
                        ]}
                      />
                      <Text variant="bodyLarge" style={styles.categoryName}>
                        {category.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor:
                            category.type === 'income' ? '#d1fae5' : '#fee2e2',
                        },
                      ]}
                    >
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              category.type === 'income' ? '#059669' : '#dc2626',
                          },
                        ]}
                      >
                        {category.type === 'income' ? '수입' : '지출'}
                      </Text>
                    </View>
                  </View>
                  {index < categories.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              카테고리 정보
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • 총 {categories.length}개의 카테고리가 등록되어 있습니다.
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • 거래 추가 시 카테고리를 선택할 수 있습니다.
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              • 각 카테고리는 고유한 색상으로 구분됩니다.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 12,
  },
  headerText: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6b7280',
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#f0fdf4',
  },
  infoTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  infoText: {
    color: '#047857',
    marginBottom: 8,
  },
});
