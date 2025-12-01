import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, FAB, Switch, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { database, Rule, Category, ExclusionPattern } from '../lib/db/database';
import { theme } from '../lib/theme';

export default function RulesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 그라데이션 */}
      <LinearGradient
        colors={theme.gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>규칙 설정</Text>
        <Text style={styles.headerSubtitle}>자동 분류 및 제외 규칙을 관리하세요</Text>
      </LinearGradient>

      {/* 탭 선택 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'category' && styles.tabButtonActive]}
          onPress={() => setActiveTab('category')}
        >
          <Ionicons
            name="pricetag"
            size={18}
            color={activeTab === 'category' ? '#4894FE' : '#8696BB'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'category' && styles.tabButtonTextActive]}>
            카테고리 배정
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'exclusion' && styles.tabButtonActive]}
          onPress={() => setActiveTab('exclusion')}
        >
          <Ionicons
            name="eye-off"
            size={18}
            color={activeTab === 'exclusion' ? '#4894FE' : '#8696BB'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'exclusion' && styles.tabButtonTextActive]}>
            거래 제외
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'category' ? (
          <>
            {/* 규칙 적용 버튼 */}
            {rules.length > 0 && (
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyRulesToExisting}>
                <Ionicons name="sync" size={18} color={theme.colors.primary} />
                <Text style={styles.applyButtonText}>기존 거래에 적용</Text>
              </TouchableOpacity>
            )}

            {rules.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="pricetag-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>등록된 규칙이 없습니다</Text>
                <Text style={styles.emptySubtext}>+ 버튼을 눌러 규칙을 추가하세요</Text>
              </View>
            ) : (
              rules.map((rule) => (
                <View key={rule.id} style={[styles.ruleCard, !rule.isActive && styles.inactiveCard]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.patternText}>{rule.pattern}</Text>
                      <View style={styles.tags}>
                        {rule.checkMerchant && (
                          <View style={styles.tagChip}>
                            <Text style={styles.tagChipText}>가맹점</Text>
                          </View>
                        )}
                        {rule.checkMemo && (
                          <View style={styles.tagChip}>
                            <Text style={styles.tagChipText}>메모</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.categoryRow}>
                        <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                        <Text style={styles.categoryLabel}>{rule.assignCategoryName}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: rule.isActive ? 'rgba(16, 185, 129, 0.1)' : theme.colors.surfaceVariant }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: rule.isActive ? theme.colors.income : theme.colors.textMuted }
                      ]}>
                        {rule.isActive ? '활성' : '비활성'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleActive(rule)}>
                      <Ionicons
                        name={rule.isActive ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.actionButtonText}>{rule.isActive ? '비활성화' : '활성화'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(rule)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                      <Text style={[styles.actionButtonText, { color: theme.colors.expense }]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {/* 제외 규칙 적용 버튼 */}
            {exclusions.length > 0 && (
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyExclusionsToExisting}>
                <Ionicons name="sync" size={18} color={theme.colors.primary} />
                <Text style={styles.applyButtonText}>기존 거래에 적용</Text>
              </TouchableOpacity>
            )}

            {exclusions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="eye-off-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>등록된 제외 규칙이 없습니다</Text>
                <Text style={styles.emptySubtext}>+ 버튼을 눌러 규칙을 추가하세요</Text>
              </View>
            ) : (
              exclusions.map((exclusion) => (
                <View key={exclusion.id} style={[styles.ruleCard, !exclusion.isActive && styles.inactiveCard]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.patternText}>{exclusion.pattern}</Text>
                      <View style={styles.tags}>
                        <View style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{getExclusionTypeLabel(exclusion.type)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: exclusion.isActive ? 'rgba(16, 185, 129, 0.1)' : theme.colors.surfaceVariant }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: exclusion.isActive ? theme.colors.income : theme.colors.textMuted }
                      ]}>
                        {exclusion.isActive ? '활성' : '비활성'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleExclusionActive(exclusion)}>
                      <Ionicons
                        name={exclusion.isActive ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.actionButtonText}>{exclusion.isActive ? '비활성화' : '활성화'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteExclusion(exclusion)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                      <Text style={[styles.actionButtonText, { color: theme.colors.expense }]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        color="#fff"
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
  },
  backButton: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.xs,
    alignSelf: 'flex-start',
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
  tabContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 16, // Figma: padding top/bottom 16
    paddingHorizontal: 32, // Figma: padding left/right 32
    borderRadius: 100, // Figma: cornerRadius: 100 (pill shape)
    backgroundColor: '#FAFAFA', // Figma: rgb(0.98, 0.98, 0.98)
  },
  tabButtonActive: {
    backgroundColor: 'rgba(99, 180, 255, 0.1)', // Figma: rgba(0.388, 0.706, 1, 0.1)
  },
  tabButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: '#8696BB', // Figma: rgb(0.525, 0.588, 0.733)
  },
  tabButtonTextActive: {
    color: '#4894FE', // Figma: rgb(0.282, 0.580, 0.996)
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  applyButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
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
  ruleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
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
  patternText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  tagChip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  tagChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  categoryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  label: {
    marginTop: theme.spacing.sm,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  segmentedButtons: {
    marginBottom: theme.spacing.md,
  },
  hint: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(19, 202, 214, 0.08)',
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
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
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  modalButton: {
    minWidth: 80,
  },
});
