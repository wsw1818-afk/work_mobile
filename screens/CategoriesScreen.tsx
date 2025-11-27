import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  ActivityIndicator,
  Divider,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
  Switch,
  Chip,
} from 'react-native-paper';
import { database, Category } from '../lib/db/database';

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4',
];

export default function CategoriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);

  // 추가 모달
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [isFixedExpense, setIsFixedExpense] = useState(false);
  const [excludeFromStats, setExcludeFromStats] = useState(false);

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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('오류', '카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      await database.addCategory({
        name: newCategoryName.trim(),
        type,
        color: newCategoryColor,
        excludeFromStats: excludeFromStats,
        isFixedExpense: isFixedExpense,
      });

      setAddModalVisible(false);
      setNewCategoryName('');
      setNewCategoryColor(PRESET_COLORS[0]);
      setIsFixedExpense(false);
      setExcludeFromStats(false);
      loadCategories();

      Alert.alert('성공', '카테고리가 추가되었습니다.');
    } catch (error: any) {
      console.error('Failed to add category:', error);
      Alert.alert('오류', error.message || '카테고리 추가에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerText}>
          카테고리 목록
        </Text>
        <View style={styles.typeButtons}>
          <Button mode={type === 'income' ? 'contained' : 'outlined'} onPress={() => setType('income')} style={styles.typeButton}>수입</Button>
          <Button mode={type === 'expense' ? 'contained' : 'outlined'} onPress={() => setType('expense')} style={styles.typeButton}>지출</Button>
        </View>
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
                      <View style={styles.categoryNameContainer}>
                        <Text variant="bodyLarge" style={styles.categoryName}>
                          {category.name}
                        </Text>
                        <View style={styles.categoryBadges}>
                          {category.isFixedExpense === true ? (
                            <Chip compact style={styles.categoryChip} textStyle={styles.categoryChipText}>고정</Chip>
                          ) : null}
                          {category.excludeFromStats === true ? (
                            <Chip compact style={styles.categoryChip} textStyle={styles.categoryChipText}>집계제외</Chip>
                          ) : null}
                        </View>
                      </View>
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

      {/* 추가 버튼 */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setAddModalVisible(true)}
        label="카테고리 추가"
      />

      {/* 추가 모달 */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => {
            setAddModalVisible(false);
            setNewCategoryName('');
            setNewCategoryColor(PRESET_COLORS[0]);
            setIsFixedExpense(false);
            setExcludeFromStats(false);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            카테고리 추가
          </Text>

          <TextInput
            label="카테고리 이름"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            mode="outlined"
            style={styles.input}
            keyboardType="default"
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            textContentType="none"
          />

          <Text variant="bodyMedium" style={styles.colorLabel}>
            색상 선택
          </Text>
          <View style={styles.colorPicker}>
            {PRESET_COLORS.map((color) => (
              <Button key={color} mode={newCategoryColor === color ? 'contained' : 'outlined'} onPress={() => setNewCategoryColor(color)} style={[styles.colorButton, { backgroundColor: color }]}>{''}</Button>
            ))}
          </View>

          {/* 지출 카테고리인 경우에만 고정지출 스위치 표시 */}
          {type === 'expense' && (
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text variant="bodyMedium" style={styles.switchLabel}>
                  고정지출
                </Text>
                <Text variant="bodySmall" style={styles.switchHint}>
                  월세, 보험료 등 매달 고정적으로 나가는 지출
                </Text>
              </View>
              <Switch value={isFixedExpense} onValueChange={setIsFixedExpense} />
            </View>
          )}

          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text variant="bodyMedium" style={styles.switchLabel}>
                집계 제외
              </Text>
              <Text variant="bodySmall" style={styles.switchHint}>
                통계 및 요약에서 제외 (예: 계좌이체)
              </Text>
            </View>
            <Switch value={excludeFromStats} onValueChange={setExcludeFromStats} />
          </View>

          <Text variant="bodyMedium" style={styles.typeLabel}>
            유형: {type === 'income' ? '수입' : '지출'}
          </Text>

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => { setAddModalVisible(false); setNewCategoryName(''); setNewCategoryColor(PRESET_COLORS[0]); setIsFixedExpense(false); setExcludeFromStats(false); }} style={styles.modalButton}>취소</Button>
            <Button mode="contained" onPress={handleAddCategory} style={styles.modalButton}>추가</Button>
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
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 12,
  },
  headerText: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
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
  categoryNameContainer: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryChip: {
    height: 24,
    backgroundColor: '#f3f4f6',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#374151',
    marginVertical: 0,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
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
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  typeLabel: {
    marginBottom: 16,
    color: '#6b7280',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  switchHint: {
    color: '#6b7280',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  modalButton: {
    flex: 1,
  },
});
