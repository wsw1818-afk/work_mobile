import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, Card, Button, Portal, TextInput, FAB, Chip, Switch, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { database, Rule, Category, ExclusionPattern } from '../lib/db/database';

export default function RulesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [exclusions, setExclusions] = useState<ExclusionPattern[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState('category'); // 'category' | 'exclusion'

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [ruleType, setRuleType] = useState<'category' | 'exclusion'>('category');
  const [pattern, setPattern] = useState('');
  const [assignCategoryId, setAssignCategoryId] = useState<number | null>(null);
  const [checkMerchant, setCheckMerchant] = useState(true);
  const [checkMemo, setCheckMemo] = useState(false);
  const [exclusionType, setExclusionType] = useState<'merchant' | 'memo' | 'both' | 'account'>('merchant');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ruleList, exclusionList, categoryList] = await Promise.all([
        database.getRules(),
        database.getExclusionPatterns(),
        database.getCategories('expense'),
      ]);

      setRules(ruleList);
      setExclusions(exclusionList);
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
    if (!pattern) {
      Alert.alert('입력 오류', '패턴을 입력해주세요.');
      return;
    }

    if (ruleType === 'category') {
      if (!assignCategoryId) {
        Alert.alert('입력 오류', '카테고리를 선택해주세요.');
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
        resetForm();
        loadData();
        Alert.alert('성공', '카테고리 규칙이 추가되었습니다.');
      } catch (error) {
        console.error('Failed to add rule:', error);
        Alert.alert('오류', '규칙 추가에 실패했습니다.');
      }
    } else {
      try {
        await database.addExclusionPattern({
          pattern,
          type: exclusionType,
          isActive: true,
        });

        setAddDialogVisible(false);
        resetForm();
        loadData();
        Alert.alert('성공', '거래 제외 규칙이 추가되었습니다.');
      } catch (error) {
        console.error('Failed to add exclusion:', error);
        Alert.alert('오류', '제외 규칙 추가에 실패했습니다.');
      }
    }
  };

  const resetForm = () => {
    setPattern('');
    setAssignCategoryId(null);
    setCheckMerchant(true);
    setCheckMemo(false);
    setExclusionType('merchant');
    setRuleType('category');
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

  const handleToggleExclusionActive = async (exclusion: ExclusionPattern) => {
    try {
      await database.updateExclusionPattern(exclusion.id, { isActive: !exclusion.isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle exclusion:', error);
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

  const handleDeleteExclusion = (exclusion: ExclusionPattern) => {
    Alert.alert(
      '제외 규칙 삭제',
      `패턴 "${exclusion.pattern}" 제외 규칙을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteExclusionPattern(exclusion.id);
              loadData();
              Alert.alert('성공', '제외 규칙이 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete exclusion:', error);
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const openAddDialog = (type: 'category' | 'exclusion') => {
    setRuleType(type);
    setAddDialogVisible(true);
  };

  const getExclusionTypeLabel = (type: string) => {
    switch (type) {
      case 'merchant': return '가맹점';
      case 'memo': return '메모';
      case 'both': return '가맹점+메모';
      case 'account': return '계좌';
      default: return type;
    }
  };

  const handleApplyRulesToExisting = async () => {
    Alert.alert(
      '기존 거래에 규칙 적용',
      '모든 활성화된 카테고리 규칙을 기존 거래 내역에 적용하시겠습니까?\n\n이 작업은 실행 취소할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '적용',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await database.applyCategoryRulesToExistingTransactions();

              if (result.updated === 0) {
                Alert.alert('완료', '적용된 거래가 없습니다.');
              } else {
                const detailsText = result.details
                  .map(d => `• "${d.rulePattern}": ${d.count}건`)
                  .join('\n');

                Alert.alert(
                  '적용 완료',
                  `총 ${result.updated}건의 거래가 업데이트되었습니다.\n\n${detailsText}`,
                  [{ text: '확인', onPress: () => loadData() }]
                );
              }
            } catch (error) {
              console.error('Failed to apply rules:', error);
              Alert.alert('오류', '규칙 적용에 실패했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleApplyExclusionsToExisting = async () => {
    Alert.alert(
      '기존 거래에 제외 규칙 적용',
      '모든 활성화된 제외 규칙을 기존 거래 내역에 적용하시겠습니까?\n\n이 작업은 실행 취소할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '적용',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await database.applyExclusionPatternsToExistingTransactions();

              if (result.updated === 0) {
                Alert.alert('완료', '적용된 거래가 없습니다.');
              } else {
                const detailsText = result.details
                  .map(d => `• "${d.pattern}": ${d.count}건`)
                  .join('\n');

                Alert.alert(
                  '적용 완료',
                  `총 ${result.updated}건의 거래가 제외 처리되었습니다.\n\n${detailsText}`,
                  [{ text: '확인', onPress: () => loadData() }]
                );
              }
            } catch (error) {
              console.error('Failed to apply exclusions:', error);
              Alert.alert('오류', '제외 규칙 적용에 실패했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'category', label: '카테고리 자동 배정' },
          { value: 'exclusion', label: '거래 제외' },
        ]}
        style={styles.tabs}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'category' ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>카테고리 자동 배정 규칙</Text>
                <Text style={styles.sectionSubtitle}>
                  키워드를 포함한 거래를 자동으로 카테고리에 배정합니다
                </Text>
              </View>
              {rules.length > 0 && (
                <Button
                  mode="contained-tonal"
                  onPress={handleApplyRulesToExisting}
                  style={styles.applyButton}
                  compact
                >
                  기존 거래에 적용
                </Button>
              )}
            </View>

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
                            <Chip mode="flat" compact style={styles.chip}>가맹점 검사</Chip>
                          )}
                          {rule.checkMemo && (
                            <Chip mode="flat" compact style={styles.chip}>메모 검사</Chip>
                          )}
                        </View>
                        <Text style={styles.categoryLabel}>
                          → {rule.assignCategoryName}
                        </Text>
                      </View>
                      <Chip mode="flat" style={{ backgroundColor: rule.isActive ? '#d1fae5' : '#f3f4f6' }}>{rule.isActive ? '활성' : '비활성'}</Chip>
                    </View>
                  </Card.Content>
                  <Card.Actions>
                    <Button onPress={() => handleToggleActive(rule)}>{rule.isActive ? '비활성화' : '활성화'}</Button>
                    <Button onPress={() => handleDelete(rule)}>삭제</Button>
                  </Card.Actions>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>거래 제외 규칙</Text>
                <Text style={styles.sectionSubtitle}>
                  패턴과 일치하는 거래를 통계 및 예산에서 자동으로 제외합니다
                </Text>
              </View>
              {exclusions.length > 0 && (
                <Button
                  mode="contained-tonal"
                  onPress={handleApplyExclusionsToExisting}
                  style={styles.applyButton}
                  compact
                >
                  기존 거래에 적용
                </Button>
              )}
            </View>

            {exclusions.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>등록된 제외 규칙이 없습니다.</Text>
                  <Text style={styles.emptySubtext}>아래 + 버튼을 눌러 규칙을 추가하세요.</Text>
                </Card.Content>
              </Card>
            ) : (
              exclusions.map((exclusion) => (
                <Card key={exclusion.id} style={[styles.card, !exclusion.isActive && styles.inactiveCard]}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardInfo}>
                        <Text variant="titleMedium">{exclusion.pattern}</Text>
                        <View style={styles.tags}>
                          <Chip mode="flat" compact style={styles.chip}>
                            {getExclusionTypeLabel(exclusion.type)}
                          </Chip>
                        </View>
                      </View>
                      <Chip mode="flat" style={{ backgroundColor: exclusion.isActive ? '#d1fae5' : '#f3f4f6' }}>
                        {exclusion.isActive ? '활성' : '비활성'}
                      </Chip>
                    </View>
                  </Card.Content>
                  <Card.Actions>
                    <Button onPress={() => handleToggleExclusionActive(exclusion)}>
                      {exclusion.isActive ? '비활성화' : '활성화'}
                    </Button>
                    <Button onPress={() => handleDeleteExclusion(exclusion)}>삭제</Button>
                  </Card.Actions>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => openAddDialog(activeTab === 'category' ? 'category' : 'exclusion')}
      />

      <Modal
        visible={addDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setAddDialogVisible(false); resetForm(); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => { setAddDialogVisible(false); resetForm(); }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {ruleType === 'category' ? '카테고리 규칙 추가' : '거래 제외 규칙 추가'}
                  </Text>

                  <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                    <TextInput
                      label="검색 패턴"
                      value={pattern}
                      onChangeText={setPattern}
                      mode="outlined"
                      style={styles.input}
                      placeholder={ruleType === 'category' ? "예: 스타벅스, 쿠팡" : "예: 이체, 출금"}
                      multiline={true}
                      numberOfLines={1}
                      keyboardType="default"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />

                    {ruleType === 'category' ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <Text style={styles.label}>검색 위치</Text>
                        <SegmentedButtons
                          value={exclusionType}
                          onValueChange={(value) => setExclusionType(value as any)}
                          buttons={[
                            { value: 'merchant', label: '가맹점' },
                            { value: 'memo', label: '메모' },
                            { value: 'both', label: '둘 다' },
                            { value: 'account', label: '계좌' },
                          ]}
                          style={styles.segmentedButtons}
                        />

                        <Text style={styles.hint}>
                          💡 입력한 패턴을 포함한 거래가 자동으로 예산 및 통계에서 제외됩니다.
                        </Text>
                      </>
                    )}
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <Button
                      mode="outlined"
                      onPress={() => { setAddDialogVisible(false); resetForm(); }}
                      style={styles.modalButton}
                    >
                      취소
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleAddRule}
                      style={styles.modalButton}
                    >
                      추가
                    </Button>
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
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    margin: 16,
    marginBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitleContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  applyButton: {
    marginHorizontal: 16,
    marginBottom: 12,
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
  inputWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  nativeInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 4,
    padding: 12,
    paddingTop: 18,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputLabel: {
    position: 'absolute',
    left: 12,
    top: 4,
    fontSize: 12,
    color: '#666',
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
  segmentedButtons: {
    marginBottom: 12,
  },
  hint: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    color: '#1e40af',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    minWidth: 80,
  },
});
