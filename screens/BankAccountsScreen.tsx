import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, Card, Button, TextInput, FAB, Chip, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { database, BankAccount } from '../lib/db/database';

export default function BankAccountsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // 통장 추가 다이얼로그
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('생활비');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const accounts = await database.getBankAccounts();
      setBankAccounts(accounts);
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
      Alert.alert('오류', '통장 정보를 불러오는데 실패했습니다.');
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

  const handleAddBankAccount = async () => {
    if (!name || !balance) {
      Alert.alert('입력 오류', '통장 이름과 잔액을 입력해주세요.');
      return;
    }

    try {
      await database.addBankAccount({
        name,
        accountType,
        bankName: bankName || undefined,
        accountNumber: undefined,
        balance: parseFloat(balance),
        color: '#3b82f6',
        isActive: true,
      });

      setAddDialogVisible(false);
      setName('');
      setAccountType('생활비');
      setBankName('');
      setBalance('');
      loadData();
      Alert.alert('성공', '통장이 추가되었습니다.');
    } catch (error) {
      console.error('Failed to add bank account:', error);
      Alert.alert('오류', '통장 추가에 실패했습니다.');
    }
  };

  const handleToggleActive = async (account: BankAccount) => {
    try {
      await database.updateBankAccount(account.id, { isActive: !account.isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle bank account:', error);
      Alert.alert('오류', '통장 상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteBankAccount = (account: BankAccount) => {
    Alert.alert(
      '통장 삭제',
      `${account.name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteBankAccount(account.id);
              loadData();
              Alert.alert('성공', '통장이 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete bank account:', error);
              Alert.alert('오류', '통장 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const totalBalance = bankAccounts
    .filter(a => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <View style={styles.container}>
      {/* 총 자산 요약 */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>총 자산</Text>
          <Text variant="headlineMedium" style={styles.totalAmount}>
            {Math.round(totalBalance).toLocaleString()}원
          </Text>
          <Text style={styles.accountCount}>
            활성 통장: {bankAccounts.filter(a => a.isActive).length}개
          </Text>
        </Card.Content>
      </Card>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {bankAccounts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>등록된 통장이 없습니다.</Text>
              <Text style={styles.emptySubtext}>아래 + 버튼을 눌러 통장을 추가하세요.</Text>
            </Card.Content>
          </Card>
        ) : (
          bankAccounts.map((account) => (
            <Card key={account.id} style={[styles.accountCard, !account.isActive && styles.inactiveCard]}>
              <Card.Content>
                <View style={styles.accountHeader}>
                  <View style={styles.accountInfo}>
                    <Text variant="titleMedium">{account.name}</Text>
                    <Text style={styles.accountType}>{account.accountType}</Text>
                    {account.bankName && (
                      <Text style={styles.bankName}>{account.bankName}</Text>
                    )}
                  </View>
                  <View style={styles.accountActions}>
                    <Chip mode="flat" style={{ backgroundColor: account.isActive ? '#d1fae5' : '#f3f4f6' }}>{account.isActive ? '활성' : '비활성'}</Chip>
                  </View>
                </View>

                <Text variant="headlineSmall" style={styles.balance}>
                  {Math.round(account.balance).toLocaleString()}원
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleToggleActive(account)}>{account.isActive ? '비활성화' : '활성화'}</Button>
                <Button onPress={() => handleDeleteBankAccount(account)}>삭제</Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      {/* 통장 추가 FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setAddDialogVisible(true)}
      />

      {/* 통장 추가 모달 */}
      <Modal
        visible={addDialogVisible}
        onRequestClose={() => setAddDialogVisible(false)}
        transparent
        animationType="fade"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>통장 추가</Text>

                  <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                    <TextInput
                      label="통장 이름"
                      value={name}
                      onChangeText={setName}
                      mode="outlined"
                      style={styles.input}
                      placeholder="예: 생활비 통장"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                      keyboardType="default"
                    />
                    <TextInput
                      label="통장 종류"
                      value={accountType}
                      onChangeText={setAccountType}
                      mode="outlined"
                      style={styles.input}
                      placeholder="예: 생활비, 저축, 투자"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                      keyboardType="default"
                    />
                    <TextInput
                      label="은행명 (선택)"
                      value={bankName}
                      onChangeText={setBankName}
                      mode="outlined"
                      style={styles.input}
                      placeholder="예: 신한은행"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                      keyboardType="default"
                    />
                    <TextInput
                      label="현재 잔액"
                      value={balance}
                      onChangeText={setBalance}
                      keyboardType="numeric"
                      mode="outlined"
                      style={styles.input}
                      right={<TextInput.Affix text="원" />}
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <Button onPress={() => setAddDialogVisible(false)} mode="outlined" style={styles.modalButton}>
                      취소
                    </Button>
                    <Button onPress={handleAddBankAccount} mode="contained" style={styles.modalButton}>
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
  summaryCard: {
    margin: 16,
    backgroundColor: '#6366f1',
  },
  summaryTitle: {
    color: '#fff',
    marginBottom: 8,
  },
  totalAmount: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountCount: {
    color: '#e0e7ff',
  },
  scrollView: {
    flex: 1,
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
  accountCard: {
    margin: 16,
    marginTop: 8,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountType: {
    color: '#666',
    marginTop: 4,
  },
  bankName: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  accountActions: {
    marginLeft: 8,
  },
  balance: {
    fontWeight: 'bold',
    color: '#3b82f6',
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
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 80,
  },
});
