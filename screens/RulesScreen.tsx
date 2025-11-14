import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput, FAB, Chip, Switch } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { database, Rule, Category } from '../lib/db/database';

export default function RulesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [pattern, setPattern] = useState('');
  const [assignCategoryId, setAssignCategoryId] = useState<number | null>(null);
  const [checkMerchant, setCheckMerchant] = useState(true);
  const [checkMemo, setCheckMemo] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ruleList, categoryList] = await Promise.all([
        database.getRules(),
        database.getCategories('expense'),
      ]);

      setRules(ruleList);
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load rules:', error);
      Alert.alert('오류', '규칙 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAddRule = async () => {
    if (!pattern || !assignCategoryId) {
      Alert.alert('입력 오류', '패턴과 카테고리를 입력해주세요.');
      return;
    }

    try {
      await database.addRule({
        pattern,
        checkMerchant,
        checkMemo,
        assignCategoryId,
        priority: 0,
        isActive: true,
      });

      setAddDialogVisible(false);
      setPattern('');
      setAssignCategoryId(null);
      setCheckMerchant(true);
      setCheckMemo(false);
      loadData();
      Alert.alert('성공', '규칙이 추가되었습니다.');
    } catch (error) {
      console.error('Failed to add rule:', error);
      Alert.alert('오류', '규칙 추가에 실패했습니다.');
    }
  };

  const handleToggleActive = async (rule: Rule) => {
    try {
      await database.updateRule(rule.id, { isActive: !rule.isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      Alert.alert('오류', '상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = (rule: Rule) => {
    Alert.alert(
      '규칙 삭제',
      `패턴 "${rule.pattern}" 규칙을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteRule(rule.id);
              loadData();
              Alert.alert('성공', '규칙이 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete rule:', error);
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>자동 분류 규칙 관리</Text>
        <Text style={styles.sectionSubtitle}>
          키워드를 포함한 거래를 자동으로 카테고리에 배정합니다
        </Text>

        {rules.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>등록된 규칙이 없습니다.</Text>
              <Text style={styles.emptySubtext}>아래 + 버튼을 눌러 규칙을 추가하세요.</Text>
            </Card.Content>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} style={[styles.card, !rule.isActive && styles.inactiveCard]}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text variant="titleMedium">{rule.pattern}</Text>
                    <View style={styles.tags}>
                      {rule.checkMerchant && (
                        <Chip mode="flat" compact style={styles.chip}>
                          가맹점 검사
                        </Chip>
                      )}
                      {rule.checkMemo && (
                        <Chip mode="flat" compact style={styles.chip}>
                          메모 검사
                        </Chip>
                      )}
                    </View>
                    <Text style={styles.categoryLabel}>
                      → {rule.assignCategoryName}
                    </Text>
                  </View>
                  <Chip mode="flat" style={{ backgroundColor: rule.isActive ? '#d1fae5' : '#f3f4f6' }}>
                    {rule.isActive ? '활성' : '비활성'}
                  </Chip>
                </View>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleToggleActive(rule)}>
                  {rule.isActive ? '비활성화' : '활성화'}
                </Button>
                <Button onPress={() => handleDelete(rule)}>삭제</Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setAddDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>규칙 추가</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="검색 패턴"
              value={pattern}
              onChangeText={setPattern}
              mode="outlined"
              style={styles.input}
              placeholder="예: 스타벅스, 쿠팡"
            />

            <Text style={styles.label}>적용할 카테고리</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={assignCategoryId}
                onValueChange={(value) => setAssignCategoryId(value)}
              >
                <Picker.Item label="카테고리 선택" value={null} />
                {categories.map((cat) => (
                  <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                ))}
              </Picker>
            </View>

            <View style={styles.switchRow}>
              <Text>가맹점명에서 검색</Text>
              <Switch value={checkMerchant} onValueChange={setCheckMerchant} />
            </View>

            <View style={styles.switchRow}>
              <Text>메모에서 검색</Text>
              <Switch value={checkMemo} onValueChange={setCheckMemo} />
            </View>

            <Text style={styles.hint}>
              💡 입력한 패턴을 포함한 거래가 자동으로 선택한 카테고리로 분류됩니다.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>취소</Button>
            <Button onPress={handleAddRule}>추가</Button>
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
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  card: {
    margin: 16,
    marginTop: 8,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginTop: 4,
  },
  categoryLabel: {
    marginTop: 8,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    color: '#666',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  hint: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    color: '#1e40af',
    fontSize: 12,
  },
});
