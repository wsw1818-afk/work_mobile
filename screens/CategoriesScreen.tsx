import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import KoreanTextInput, { KoreanTextInputRef } from '../components/KoreanTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  ActivityIndicator,
  Divider,
  FAB,
  Portal,
  Modal,
  Button,
  Switch,
  Chip,
  Menu,
  IconButton,
} from 'react-native-paper';
import { database, Category, ExpenseGroup } from '../lib/db/database';

const GROUP_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#14b8a6',
];

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4',
];

export default function CategoriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);

  // 지출 그룹 관련
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);

  // 추가 모달
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [excludeFromStats, setExcludeFromStats] = useState(false);
  const categoryNameRef = useRef<KoreanTextInputRef>(null);

  // 그룹 관리 모달
  const [groupManageVisible, setGroupManageVisible] = useState(false);
  const [groupEditVisible, setGroupEditVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExpenseGroup | null>(null);
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const groupNameRef = useRef<KoreanTextInputRef>(null);
  const groupIconRef = useRef<KoreanTextInputRef>(null);

  const loadCategories = useCallback(async () => {
    try {
      const [cats, groups] = await Promise.all([
        database.getCategories(type),
        database.getExpenseGroups(),
      ]);
      setCategories(cats);
      setExpenseGroups(groups);
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
    const newCategoryName = categoryNameRef.current?.getValue() || '';

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
        groupId: type === 'expense' ? selectedGroupId ?? undefined : undefined,
      });

      setAddModalVisible(false);
      if (categoryNameRef.current) categoryNameRef.current.clear();
      setNewCategoryColor(PRESET_COLORS[0]);
      setSelectedGroupId(null);
      setExcludeFromStats(false);
      loadCategories();

      Alert.alert('성공', '카테고리가 추가되었습니다.');
    } catch (error: any) {
      console.error('Failed to add category:', error);
      Alert.alert('오류', error.message || '카테고리 추가에 실패했습니다.');
    }
  };

  // 그룹 추가/수정 모달 열기
  const openAddGroup = () => {
    setEditingGroup(null);
    setNewGroupColor(GROUP_COLORS[0]);
    setGroupEditVisible(true);
    setTimeout(() => {
      groupNameRef.current?.clear();
      groupIconRef.current?.clear();
    }, 100);
  };

  const openEditGroup = (group: ExpenseGroup) => {
    setEditingGroup(group);
    setNewGroupColor(group.color);
    setGroupEditVisible(true);
    setTimeout(() => {
      groupNameRef.current?.setValue(group.name);
      groupIconRef.current?.setValue(group.icon || '');
    }, 100);
  };

  // 그룹 저장
  const handleSaveGroup = async () => {
    const name = groupNameRef.current?.getValue() || '';
    const icon = groupIconRef.current?.getValue() || '';

    if (!name.trim()) {
      Alert.alert('오류', '그룹 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingGroup) {
        await database.updateExpenseGroup(editingGroup.id, {
          name: name.trim(),
          color: newGroupColor,
          icon: icon || undefined,
        });
      } else {
        await database.addExpenseGroup({
          name: name.trim(),
          color: newGroupColor,
          icon: icon || undefined,
          sortOrder: 0,
          isDefault: false,
        });
      }

      const groups = await database.getExpenseGroups();
      setExpenseGroups(groups);
      setGroupEditVisible(false);
      Alert.alert('성공', editingGroup ? '그룹이 수정되었습니다.' : '그룹이 추가되었습니다.');
    } catch (error: any) {
      console.error('Failed to save group:', error);
      Alert.alert('오류', error.message || '그룹 저장에 실패했습니다.');
    }
  };

  // 대시보드 표시 여부 토글
  const toggleShowOnDashboard = async (categoryId: number, currentValue: boolean | undefined) => {
    try {
      await database.updateCategory(categoryId, {
        showOnDashboard: currentValue === false ? true : false
      });
      loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      Alert.alert('오류', '설정 변경에 실패했습니다.');
    }
  };

  // 그룹 삭제
  const handleDeleteGroup = (group: ExpenseGroup) => {
    Alert.alert(
      '그룹 삭제',
      `"${group.name}" 그룹을 삭제하시겠습니까?\n해당 그룹의 카테고리는 미분류로 이동합니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteExpenseGroup(group.id);
              const groups = await database.getExpenseGroups();
              setExpenseGroups(groups);
              loadCategories();
            } catch (error) {
              console.error('Failed to delete group:', error);
              Alert.alert('오류', '그룹 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
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
                          {category.groupName ? (
                            <Chip
                              compact
                              style={[styles.categoryChip, { backgroundColor: category.groupColor || '#f3f4f6' }]}
                              textStyle={[styles.categoryChipText, { color: '#fff' }]}
                            >
                              {category.groupName}
                            </Chip>
                          ) : null}
                          {category.excludeFromStats === true ? (
                            <Chip compact style={styles.categoryChip} textStyle={styles.categoryChipText}>집계제외</Chip>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={styles.categoryRight}>
                      {/* 지출 카테고리일 때만 대시보드 표시 토글 아이콘 */}
                      {category.type === 'expense' && (
                        <IconButton
                          icon={category.showOnDashboard === false ? 'eye-off' : 'eye'}
                          size={20}
                          iconColor={category.showOnDashboard === false ? '#9ca3af' : '#6366f1'}
                          onPress={() => toggleShowOnDashboard(category.id, category.showOnDashboard)}
                          style={styles.dashboardToggle}
                        />
                      )}
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
            if (categoryNameRef.current) categoryNameRef.current.clear();
            setNewCategoryColor(PRESET_COLORS[0]);
            setSelectedGroupId(null);
            setExcludeFromStats(false);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            카테고리 추가
          </Text>

          <Text variant="bodyMedium" style={styles.inputLabel}>
            카테고리 이름
          </Text>
          <KoreanTextInput
            ref={categoryNameRef}
            style={styles.nativeInput}
            placeholder="카테고리 이름 입력"
          />

          <Text variant="bodyMedium" style={styles.colorLabel}>
            색상 선택
          </Text>
          <View style={styles.colorPicker}>
            {PRESET_COLORS.map((color) => (
              <Button key={color} mode={newCategoryColor === color ? 'contained' : 'outlined'} onPress={() => setNewCategoryColor(color)} style={[styles.colorButton, { backgroundColor: color }]}>{''}</Button>
            ))}
          </View>

          {/* 지출 카테고리인 경우에만 그룹 선택 표시 */}
          {type === 'expense' && (
            <>
              <View style={styles.groupLabelRow}>
                <Text variant="bodyMedium" style={styles.inputLabel}>
                  지출 그룹
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setGroupManageVisible(true)}
                  labelStyle={styles.groupManageButtonLabel}
                >
                  그룹 관리
                </Button>
              </View>
              <Menu
                visible={groupMenuVisible}
                onDismiss={() => setGroupMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.groupSelector}
                    onPress={() => setGroupMenuVisible(true)}
                  >
                    {selectedGroupId ? (
                      <View style={styles.selectedGroupRow}>
                        <View
                          style={[
                            styles.groupDot,
                            { backgroundColor: expenseGroups.find(g => g.id === selectedGroupId)?.color || '#6b7280' },
                          ]}
                        />
                        <Text style={styles.selectedGroupText}>
                          {expenseGroups.find(g => g.id === selectedGroupId)?.name || '그룹 선택'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.groupPlaceholder}>그룹 선택 (선택사항)</Text>
                    )}
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedGroupId(null);
                    setGroupMenuVisible(false);
                  }}
                  title="선택 안함"
                />
                <Divider />
                {expenseGroups.map((group) => (
                  <Menu.Item
                    key={group.id}
                    onPress={() => {
                      setSelectedGroupId(group.id);
                      setGroupMenuVisible(false);
                    }}
                    title={
                      <View style={styles.groupMenuItem}>
                        <View
                          style={[styles.groupDot, { backgroundColor: group.color }]}
                        />
                        <Text>{group.name}</Text>
                      </View>
                    }
                  />
                ))}
              </Menu>
            </>
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
            <Button mode="outlined" onPress={() => { setAddModalVisible(false); if (categoryNameRef.current) categoryNameRef.current.clear(); setNewCategoryColor(PRESET_COLORS[0]); setSelectedGroupId(null); setExcludeFromStats(false); }} style={styles.modalButton}>취소</Button>
            <Button mode="contained" onPress={handleAddCategory} style={styles.modalButton}>추가</Button>
          </View>
        </Modal>

        {/* 그룹 관리 모달 */}
        <Modal
          visible={groupManageVisible}
          onDismiss={() => setGroupManageVisible(false)}
          contentContainerStyle={styles.groupManageModalContainer}
        >
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>
              지출 그룹 관리
            </Text>

            <Button
              mode="outlined"
              icon="plus"
              onPress={openAddGroup}
              style={styles.addGroupButton}
            >
              새 그룹 추가
            </Button>

            {expenseGroups.length === 0 ? (
              <Text style={styles.emptyGroupText}>등록된 그룹이 없습니다.</Text>
            ) : (
              expenseGroups.map((group) => (
                <View key={group.id} style={styles.groupListItem}>
                  <View style={styles.groupListLeft}>
                    <Text style={styles.groupListIcon}>{group.icon}</Text>
                    <View style={[styles.groupListDot, { backgroundColor: group.color }]} />
                    <Text style={styles.groupListName}>{group.name}</Text>
                  </View>
                  <View style={styles.groupListActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditGroup(group)}
                    />
                    {!group.isDefault && (
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleDeleteGroup(group)}
                      />
                    )}
                  </View>
                </View>
              ))
            )}

            <Button
              mode="contained"
              onPress={() => setGroupManageVisible(false)}
              style={styles.groupManageCloseButton}
            >
              닫기
            </Button>
          </ScrollView>
        </Modal>

        {/* 그룹 추가/수정 모달 */}
        <Modal
          visible={groupEditVisible}
          onDismiss={() => setGroupEditVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingGroup ? '그룹 수정' : '새 그룹 추가'}
          </Text>

          <Text variant="bodyMedium" style={styles.inputLabel}>
            그룹 이름
          </Text>
          <KoreanTextInput
            ref={groupNameRef}
            defaultValue={editingGroup?.name || ''}
            style={styles.nativeInput}
            placeholder="그룹 이름 입력"
          />

          <Text variant="bodyMedium" style={styles.inputLabel}>
            아이콘 (이모지)
          </Text>
          <KoreanTextInput
            ref={groupIconRef}
            defaultValue={editingGroup?.icon || ''}
            style={styles.nativeInput}
            placeholder="예: 💰, 🎮, 🏠"
          />

          <Text variant="bodyMedium" style={styles.colorLabel}>
            색상 선택
          </Text>
          <View style={styles.colorPicker}>
            {GROUP_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.groupColorOption,
                  { backgroundColor: color },
                  newGroupColor === color && styles.groupColorSelected
                ]}
                onPress={() => setNewGroupColor(color)}
              />
            ))}
          </View>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setGroupEditVisible(false)}
              style={styles.modalButton}
            >
              취소
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveGroup}
              style={styles.modalButton}
            >
              {editingGroup ? '수정' : '추가'}
            </Button>
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
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardToggle: {
    margin: 0,
    marginRight: 4,
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
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  nativeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    color: '#1f2937',
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
  groupSelector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  selectedGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedGroupText: {
    fontSize: 16,
    color: '#1f2937',
  },
  groupPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  groupMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  groupManageButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  groupManageModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '70%',
  },
  addGroupButton: {
    marginBottom: 16,
  },
  emptyGroupText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  groupListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  groupListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupListIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  groupListDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  groupListName: {
    fontSize: 15,
    fontWeight: '500',
  },
  groupListActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupManageCloseButton: {
    marginTop: 16,
  },
  groupColorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  groupColorSelected: {
    borderWidth: 3,
    borderColor: '#1f2937',
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
