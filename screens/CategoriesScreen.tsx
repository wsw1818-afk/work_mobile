import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import KoreanTextInput, { KoreanTextInputRef } from '../components/KoreanTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
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
import { theme } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { useTransactionContext } from '../lib/TransactionContext';

const GROUP_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#14b8a6',
];

// 이모지 프리셋 (카테고리별로 정리)
const EMOJI_PRESETS = [
  // 돈/금융
  '💰', '💵', '💳', '🏦', '💸', '🪙', '📈', '📊',
  // 생활
  '🏠', '🏡', '🚗', '🚌', '✈️', '🛒', '🛍️', '📦',
  // 음식
  '🍽️', '🍕', '🍔', '☕', '🍺', '🍷', '🥗', '🍱',
  // 여가/취미
  '🎮', '🎬', '🎵', '📚', '🎨', '⚽', '🏋️', '🎭',
  // 건강/의료
  '💊', '🏥', '💉', '🩺', '🧘', '❤️', '🏃', '🧴',
  // 교육/업무
  '📝', '💼', '🎓', '💻', '📱', '🖥️', '📞', '✏️',
  // 기타
  '⭐', '🔥', '💡', '🎁', '🔧', '🏷️', '📌', '🗂️',
];

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4',
];

export default function CategoriesScreen({ navigation }: any) {
  const { theme: currentTheme } = useTheme();
  const { notifyCategoryChanged } = useTransactionContext();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);

  // 지출 그룹 관련
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);

  // 추가/수정 모달
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [excludeFromStats, setExcludeFromStats] = useState(false);
  const categoryNameRef = useRef<KoreanTextInputRef>(null);

  // 그룹 관리 모달
  const [groupManageVisible, setGroupManageVisible] = useState(false);
  const [groupEditVisible, setGroupEditVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExpenseGroup | null>(null);
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const groupNameRef = useRef<KoreanTextInputRef>(null);

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

  // 카테고리 수정 모달 열기
  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryColor(category.color);
    setExcludeFromStats(category.excludeFromStats === true);
    setSelectedGroupId(category.groupId || null);
    setAddModalVisible(true);
    setTimeout(() => {
      categoryNameRef.current?.setValue(category.name);
    }, 100);
  };

  // 카테고리 삭제
  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      '카테고리 삭제',
      `"${category.name}" 카테고리를 삭제하시겠습니까?\n\n⚠️ 이 카테고리를 사용하는 거래의 카테고리가 미분류로 변경됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteCategory(category.id);
              Alert.alert('성공', '카테고리가 삭제되었습니다.');
              loadCategories();
              notifyCategoryChanged();
            } catch (error: any) {
              console.error('Failed to delete category:', error);
              Alert.alert('오류', error.message || '카테고리 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async () => {
    const categoryName = categoryNameRef.current?.getValue() || '';

    if (!categoryName.trim()) {
      Alert.alert('오류', '카테고리 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingCategory) {
        // 수정
        await database.updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          color: newCategoryColor,
          excludeFromStats: excludeFromStats,
          groupId: type === 'expense' ? selectedGroupId ?? undefined : undefined,
        });
        Alert.alert('성공', '카테고리가 수정되었습니다.');
      } else {
        // 추가
        await database.addCategory({
          name: categoryName.trim(),
          type,
          color: newCategoryColor,
          excludeFromStats: excludeFromStats,
          groupId: type === 'expense' ? selectedGroupId ?? undefined : undefined,
        });
        Alert.alert('성공', '카테고리가 추가되었습니다.');
      }

      setAddModalVisible(false);
      setEditingCategory(null);
      if (categoryNameRef.current) categoryNameRef.current.clear();
      setNewCategoryColor(PRESET_COLORS[0]);
      setSelectedGroupId(null);
      setExcludeFromStats(false);
      loadCategories();
      notifyCategoryChanged(); // 대시보드 실시간 업데이트
    } catch (error: any) {
      console.error('Failed to save category:', error);
      Alert.alert('오류', error.message || '카테고리 저장에 실패했습니다.');
    }
  };

  // 그룹 추가/수정 모달 열기
  const openAddGroup = () => {
    setEditingGroup(null);
    setNewGroupColor(GROUP_COLORS[0]);
    setSelectedEmoji('');
    setGroupEditVisible(true);
    setTimeout(() => {
      groupNameRef.current?.clear();
    }, 100);
  };

  const openEditGroup = (group: ExpenseGroup) => {
    setEditingGroup(group);
    setNewGroupColor(group.color);
    setSelectedEmoji(group.icon || '');
    setGroupEditVisible(true);
    setTimeout(() => {
      groupNameRef.current?.setValue(group.name);
    }, 100);
  };

  // 그룹 저장
  const handleSaveGroup = async () => {
    const name = groupNameRef.current?.getValue() || '';

    if (!name.trim()) {
      Alert.alert('오류', '그룹 이름을 입력해주세요.');
      return;
    }

    try {
      if (editingGroup) {
        await database.updateExpenseGroup(editingGroup.id, {
          name: name.trim(),
          color: newGroupColor,
          icon: selectedEmoji || undefined,
        });
      } else {
        await database.addExpenseGroup({
          name: name.trim(),
          color: newGroupColor,
          icon: selectedEmoji || undefined,
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
      notifyCategoryChanged(); // 대시보드 실시간 업데이트
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
      <View style={[styles.centered, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: currentTheme.colors.background }]}>
      {/* 헤더 그라데이션 (컴팩트) */}
      <LinearGradient
        colors={currentTheme.gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.getParent()?.openDrawer()}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카테고리</Text>
        </View>

        {/* 타입 선택 버튼 */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && styles.typeButtonActive,
            ]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={type === 'income' ? currentTheme.colors.primary : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.typeButtonText,
                type === 'income' && styles.typeButtonTextActive,
              ]}
            >
              수입
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && styles.typeButtonActive,
            ]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="remove-circle"
              size={18}
              color={type === 'expense' ? currentTheme.colors.primary : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.typeButtonText,
                type === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              지출
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[currentTheme.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 카테고리 목록 */}
        <View style={[styles.card, { backgroundColor: currentTheme.colors.surface }]}>
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={currentTheme.colors.textMuted} />
              <Text style={styles.emptyText}>카테고리가 없습니다</Text>
              <Text style={styles.emptySubtext}>+ 버튼을 눌러 추가하세요</Text>
            </View>
          ) : (
            categories.map((category, index) => (
              <View key={category.id}>
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => openEditCategory(category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <View style={styles.categoryNameContainer}>
                      <Text style={styles.categoryName}>
                        {category.name}
                      </Text>
                      <View style={styles.categoryBadges}>
                        {category.groupName ? (
                          <View style={[styles.categoryChip, { backgroundColor: category.groupColor || currentTheme.colors.surfaceVariant }]}>
                            <Text style={styles.categoryChipText}>{category.groupName}</Text>
                          </View>
                        ) : null}
                        {category.excludeFromStats === true ? (
                          <View style={[styles.categoryChip, { backgroundColor: currentTheme.colors.surfaceVariant }]}>
                            <Text style={[styles.categoryChipText, { color: currentTheme.colors.textSecondary }]}>집계제외</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    {category.type === 'expense' && (
                      <TouchableOpacity
                        style={styles.dashboardToggle}
                        onPress={() => toggleShowOnDashboard(category.id, category.showOnDashboard)}
                      >
                        <Ionicons
                          name={category.showOnDashboard === false ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={category.showOnDashboard === false ? currentTheme.colors.textMuted : currentTheme.colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCategory(category)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={currentTheme.colors.expense}
                      />
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor:
                            category.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              category.type === 'income' ? currentTheme.colors.income : currentTheme.colors.expense,
                          },
                        ]}
                      >
                        {category.type === 'income' ? '수입' : '지출'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {index < categories.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        {/* 정보 카드 */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={currentTheme.colors.primary} />
            <Text style={styles.infoTitle}>카테고리 정보</Text>
          </View>
          <Text style={styles.infoText}>• 총 {categories.length}개의 카테고리가 등록되어 있습니다.</Text>
          <Text style={styles.infoText}>• 거래 추가 시 카테고리를 선택할 수 있습니다.</Text>
          <Text style={styles.infoText}>• 각 카테고리는 고유한 색상으로 구분됩니다.</Text>
        </View>
      </ScrollView>

      {/* 추가 버튼 */}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        color="#fff"
        onPress={() => setAddModalVisible(true)}
      />

      {/* 추가 모달 */}
      <Portal>
        <Modal
          visible={addModalVisible}
          onDismiss={() => {
            setAddModalVisible(false);
            setEditingCategory(null);
            if (categoryNameRef.current) categoryNameRef.current.clear();
            setNewCategoryColor(PRESET_COLORS[0]);
            setSelectedGroupId(null);
            setExcludeFromStats(false);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingCategory ? '카테고리 수정' : '카테고리 추가'}
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
            <Button mode="outlined" onPress={() => { setAddModalVisible(false); setEditingCategory(null); if (categoryNameRef.current) categoryNameRef.current.clear(); setNewCategoryColor(PRESET_COLORS[0]); setSelectedGroupId(null); setExcludeFromStats(false); }} style={styles.modalButton}>취소</Button>
            <Button mode="contained" onPress={handleSaveCategory} style={styles.modalButton}>{editingCategory ? '수정' : '추가'}</Button>
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
          <View style={styles.selectedEmojiContainer}>
            <Text style={styles.selectedEmojiText}>
              {selectedEmoji || '선택 안함'}
            </Text>
            {selectedEmoji && (
              <TouchableOpacity onPress={() => setSelectedEmoji('')}>
                <Text style={styles.clearEmojiText}>지우기</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScrollView}>
            <View style={styles.emojiGrid}>
              {EMOJI_PRESETS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.emojiOption,
                    selectedEmoji === emoji && styles.emojiOptionSelected
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

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
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  menuButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeButtonActive: {
    backgroundColor: '#fff',
  },
  typeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  typeButtonTextActive: {
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
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
    marginRight: theme.spacing.md,
  },
  categoryNameContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  categoryChipText: {
    fontSize: theme.fontSize.xs,
    color: '#fff',
    fontWeight: theme.fontWeight.medium,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dashboardToggle: {
    padding: theme.spacing.xs,
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  typeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: 'rgba(19, 202, 214, 0.08)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.lg,
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
  // 이모지 선택 스타일
  selectedEmojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedEmojiText: {
    fontSize: 24,
  },
  clearEmojiText: {
    color: '#6366f1',
    fontSize: 14,
  },
  emojiScrollView: {
    marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionSelected: {
    backgroundColor: '#e0e7ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  emojiText: {
    fontSize: 22,
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
