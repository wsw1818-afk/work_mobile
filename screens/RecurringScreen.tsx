import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput, FAB, Chip, RadioButton, Switch } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { database, RecurringTransaction, Category, Account } from '../lib/db/database';

export default function RecurringScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recurringList, categoryList, accountList] = await Promise.all([
        database.getRecurringTransactions(),
        database.getCategories(),
        database.getAccounts(),
      ]);

      setRecurring(recurringList);
      setCategories(categoryList);
      setAccounts(accountList);
    } catch (error) {
      console.error('Failed to load recurring transactions:', error);
      Alert.alert('오류', '반복 거래 정보를 불러오는데 실패했습니다.');
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

  const handleAddRecurring = async () => {
    if (!name || !amount || !categoryId || !accountId) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await database.addRecurringTransaction({
        name,
        amount: parseFloat(amount),
        type,
        categoryId,
        accountId,
        frequency,
        dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? 0 : undefined,
        startDate: today,
        isActive: true,
      });

      setAddDialogVisible(false);
      resetForm();
      loadData();
      Alert.alert('성공', '반복 거래가 추가되었습니다.');
    } catch (error) {
      console.error('Failed to add recurring transaction:', error);
      Alert.alert('오류', '반복 거래 추가에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setType('expense');
    setCategoryId(null);
    setAccountId(null);
    setFrequency('monthly');
    setDayOfMonth('1');
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    try {
      await database.updateRecurringTransaction(item.id, { isActive: !item.isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle recurring transaction:', error);
      Alert.alert('오류', '상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = (item: RecurringTransaction) => {
    Alert.alert(
      '반복 거래 삭제',
      `${item.name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteRecurringTransaction(item.id);
              loadData();
              Alert.alert('성공', '반복 거래가 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete recurring transaction:', error);
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'monthly': return '매월';
      case 'weekly': return '매주';
      case 'yearly': return '매년';
      default: return freq;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>반복 거래 관리</Text>
        <Text style={styles.sectionSubtitle}>정기 구독료, 월세 등 자동으로 생성할 거래를 등록하세요</Text>

        {recurring.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>등록된 반복 거래가 없습니다.</Text>
              <Text style={styles.emptySubtext}>아래 + 버튼을 눌러 반복 거래를 추가하세요.</Text>
            </Card.Content>
          </Card>
        ) : (
          recurring.map((item) => (
            <Card key={item.id} style={[styles.card, !item.isActive && styles.inactiveCard]}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text variant="titleMedium">{item.name}</Text>
                    <View style={styles.tags}>
                      <Chip mode="flat" compact style={styles.chip}>
                        {item.type === 'income' ? '수입' : '지출'}
                      </Chip>
                      <Chip mode="flat" compact style={styles.chip}>
                        {getFrequencyLabel(item.frequency)}
                        {item.frequency === 'monthly' && item.dayOfMonth && ` ${item.dayOfMonth}일`}
                      </Chip>
                      <Chip mode="flat" compact style={styles.chip}>
                        {item.categoryName}
                      </Chip>
                    </View>
                  </View>
                  <Chip mode="flat" style={{ backgroundColor: item.isActive ? '#d1fae5' : '#f3f4f6' }}>
                    {item.isActive ? '활성' : '비활성'}
                  </Chip>
                </View>

                <Text variant="headlineSmall" style={[styles.amount, item.type === 'income' && styles.incomeAmount]}>
                  {item.amount.toLocaleString()}원
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleToggleActive(item)}>
                  {item.isActive ? '비활성화' : '활성화'}
                </Button>
                <Button onPress={() => handleDelete(item)}>삭제</Button>
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
          <Dialog.Title>반복 거래 추가</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              <Dialog.Content>
                <TextInput
                  label="거래 이름"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  placeholder="예: 넷플릭스 구독료"
                />

                <Text style={styles.label}>종류</Text>
                <RadioButton.Group onValueChange={(value) => setType(value as any)} value={type}>
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="지출" value="expense" />
                    <RadioButton.Item label="수입" value="income" />
                  </View>
                </RadioButton.Group>

                <TextInput
                  label="금액"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Affix text="원" />}
                />

                <Text style={styles.label}>카테고리</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={categoryId}
                    onValueChange={(value) => setCategoryId(value)}
                  >
                    <Picker.Item label="카테고리 선택" value={null} />
                    {categories
                      .filter(c => c.type === type)
                      .map((cat) => (
                        <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                      ))}
                  </Picker>
                </View>

                <Text style={styles.label}>계좌</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={accountId}
                    onValueChange={(value) => setAccountId(value)}
                  >
                    <Picker.Item label="계좌 선택" value={null} />
                    {accounts.map((acc) => (
                      <Picker.Item key={acc.id} label={acc.name} value={acc.id} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>반복 주기</Text>
                <RadioButton.Group onValueChange={(value) => setFrequency(value as any)} value={frequency}>
                  <RadioButton.Item label="매월" value="monthly" />
                  <RadioButton.Item label="매주" value="weekly" />
                  <RadioButton.Item label="매년" value="yearly" />
                </RadioButton.Group>

                {frequency === 'monthly' && (
                  <TextInput
                    label="매월 반복일"
                    value={dayOfMonth}
                    onChangeText={setDayOfMonth}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                    placeholder="1-31"
                  />
                )}
              </Dialog.Content>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>취소</Button>
            <Button onPress={handleAddRecurring}>추가</Button>
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
    marginBottom: 12,
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
  amount: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  incomeAmount: {
    color: '#10b981',
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
  radioRow: {
    flexDirection: 'row',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 12,
  },
});
