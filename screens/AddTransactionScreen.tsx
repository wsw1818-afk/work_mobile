import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Text,
  Menu,
  Divider,
} from 'react-native-paper';
import { format } from 'date-fns';
import { database, Category, Account } from '../lib/db/database';

export default function AddTransactionScreen() {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories(type);
    loadAccounts();
  }, [type]);

  const loadCategories = async (transactionType: 'income' | 'expense') => {
    try {
      const cats = await database.getCategories(transactionType);
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0]);
      } else {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const accs = await database.getAccounts();
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccount(accs[0]);
      } else {
        setSelectedAccount(null);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleSubmit = async () => {
    // 입력 검증
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('오류', '금액을 입력해주세요.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('오류', '카테고리를 선택해주세요.');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('오류', '결제수단을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await database.addTransaction({
        amount: parseFloat(amount),
        type,
        categoryId: selectedCategory.id,
        accountId: selectedAccount.id,
        description,
        date,
      });

      // 성공 알림
      Alert.alert('성공', '거래가 추가되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            // 폼 초기화
            setAmount('');
            setDescription('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      Alert.alert('오류', '거래 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            {/* 수입/지출 선택 */}
            <Text variant="titleMedium" style={styles.label}>
              유형
            </Text>
            <View style={styles.typeButtons}>
              <Button mode={type === 'income' ? 'contained' : 'outlined'} onPress={() => setType('income')} style={[styles.typeButton, type === 'income' ? styles.activeButton : undefined]} icon="plus-circle">수입</Button>
              <Button mode={type === 'expense' ? 'contained' : 'outlined'} onPress={() => setType('expense')} style={[styles.typeButton, type === 'expense' ? styles.activeButton : undefined]} icon="minus-circle">지출</Button>
            </View>

            {/* 금액 입력 */}
            <Text variant="titleMedium" style={styles.label}>
              금액
            </Text>
            <TextInput
              mode="outlined"
              label="금액"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              right={<TextInput.Affix text="원" />}
              style={styles.input}
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              textContentType="none"
            />

            {/* 카테고리 선택 */}
            <Text variant="titleMedium" style={styles.label}>
              카테고리
            </Text>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCategoryMenuVisible(true)}
                  style={styles.categoryButton}
                  contentStyle={styles.categoryButtonContent}
                >
                  {selectedCategory ? (
                    <View style={styles.categoryButtonInner}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: selectedCategory.color },
                        ]}
                      />
                      <Text>{selectedCategory.name}</Text>
                    </View>
                  ) : (
                    <Text>카테고리 선택</Text>
                  )}
                </Button>
              }
            >
              {categories.map((category) => (
                <Menu.Item
                  key={category.id}
                  onPress={() => {
                    setSelectedCategory(category);
                    setCategoryMenuVisible(false);
                  }}
                  title={
                    <View style={styles.menuItemContent}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: category.color },
                        ]}
                      />
                      <Text>{category.name}</Text>
                    </View>
                  }
                />
              ))}
            </Menu>

            {/* 계좌 선택 */}
            <Text variant="titleMedium" style={styles.label}>
              결제수단
            </Text>
            <Menu
              visible={accountMenuVisible}
              onDismiss={() => setAccountMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setAccountMenuVisible(true)}
                  style={styles.categoryButton}
                  contentStyle={styles.categoryButtonContent}
                >
                  <Text>{selectedAccount ? selectedAccount.name : '계좌 선택'}</Text>
                </Button>
              }
            >
              {accounts.map((account) => (
                <Menu.Item
                  key={account.id}
                  onPress={() => {
                    setSelectedAccount(account);
                    setAccountMenuVisible(false);
                  }}
                  title={account.name}
                />
              ))}
            </Menu>

            {/* 날짜 입력 */}
            <Text variant="titleMedium" style={styles.label}>
              날짜
            </Text>
            <TextInput
              mode="outlined"
              label="날짜"
              value={date}
              onChangeText={setDate}
              placeholder="yyyy-MM-dd"
              style={styles.input}
              keyboardType="default"
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              textContentType="none"
            />

            {/* 메모 입력 */}
            <Text variant="titleMedium" style={styles.label}>
              메모 (선택)
            </Text>
            <TextInput
              mode="outlined"
              label="메모"
              value={description}
              onChangeText={setDescription}
              placeholder="메모를 입력하세요"
              multiline
              numberOfLines={3}
              style={styles.input}
              keyboardType="default"
              autoCorrect={false}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              textContentType="none"
            />

            <Divider style={styles.divider} />

            {/* 추가 버튼 */}
            <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.submitButton} buttonColor={type === 'income' ? '#10b981' : '#ef4444'}>{type === 'income' ? '수입' : '지출'} 추가</Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    margin: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
  },
  activeButton: {
    backgroundColor: '#e0f2fe',
  },
  input: {
    marginBottom: 8,
  },
  categoryButton: {
    marginBottom: 8,
  },
  categoryButtonContent: {
    justifyContent: 'flex-start',
  },
  categoryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  submitButton: {
    marginTop: 8,
  },
});
