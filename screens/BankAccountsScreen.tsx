import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, FAB, Chip, IconButton, RadioButton, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { database, BankAccount, Account } from '../lib/db/database';

export default function BankAccountsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // 통장 추가 다이얼로그
  const [addBankDialogVisible, setAddBankDialogVisible] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountType, setBankAccountType] = useState('생활비');
  const [bankInstitution, setBankInstitution] = useState('');
  const [bankBalance, setBankBalance] = useState('');

  // 결제수단 추가 다이얼로그
  const [addAccountDialogVisible, setAddAccountDialogVisible] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'card' | 'cash'>('card');
  const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);

  // 확장된 통장 ID
  const [expandedBankId, setExpandedBankId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bankList, accountList] = await Promise.all([
        database.getBankAccounts(),
        database.getAccounts(),
      ]);
      setBankAccounts(bankList);
      setAccounts(accountList);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
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

  // 통장 추가
  const handleAddBankAccount = async () => {
    if (!bankName || !bankBalance) {
      Alert.alert('입력 오류', '통장 이름과 잔액을 입력해주세요.');
      return;
    }

    try {
      await database.addBankAccount({
        name: bankName,
        accountType: bankAccountType,
        bankName: bankInstitution || undefined,
        accountNumber: undefined,
        balance: parseFloat(bankBalance),
        color: '#3b82f6',
        isActive: true,
      });

      setAddBankDialogVisible(false);
      setBankName('');
      setBankAccountType('생활비');
      setBankInstitution('');
      setBankBalance('');
      loadData();
      Alert.alert('성공', '통장이 추가되었습니다.');
    } catch (error) {
      console.error('Failed to add bank account:', error);
      Alert.alert('오류', '통장 추가에 실패했습니다.');
    }
  };

  // 결제수단 추가
  const handleAddAccount = async () => {
    if (!accountName) {
      Alert.alert('입력 오류', '결제수단 이름을 입력해주세요.');
      return;
    }

    try {
      await database.addAccount({
        name: accountName,
        type: accountType,
        cardType: accountType === 'card' ? cardType : undefined,
        color: accountType === 'card' ? '#3b82f6' : '#10b981',
        bankAccountId: selectedBankAccountId || undefined,
      });

      setAddAccountDialogVisible(false);
      setAccountName('');
      setAccountType('card');
      setCardType('credit');
      setSelectedBankAccountId(null);
      loadData();
      Alert.alert('성공', '결제수단이 추가되었습니다.');
    } catch (error) {
      console.error('Failed to add account:', error);
      Alert.alert('오류', '결제수단 추가에 실패했습니다.');
    }
  };

  const handleToggleBankActive = async (bank: BankAccount) => {
    try {
      await database.updateBankAccount(bank.id, { isActive: !bank.isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle bank account:', error);
      Alert.alert('오류', '통장 상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteBankAccount = async (bank: BankAccount) => {
    // 연결된 결제수단 확인
    const linkedAccountCount = await database.getBankAccountLinkedAccountCount(bank.id);
    const transactionCount = await database.getBankAccountTransactionCount(bank.id);

    if (linkedAccountCount > 0) {
      Alert.alert(
        '삭제 불가',
        `이 통장에 연결된 결제수단이 ${linkedAccountCount}개 있습니다.\n먼저 결제수단의 연결을 해제하거나 삭제해주세요.`
      );
      return;
    }

    if (transactionCount > 0) {
      Alert.alert(
        '삭제 불가',
        `이 통장에 연결된 거래가 ${transactionCount}건 있습니다.\n거래 내역이 있는 통장은 삭제할 수 없습니다.`
      );
      return;
    }

    Alert.alert(
      '통장 삭제',
      `${bank.name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteBankAccount(bank.id);
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

  const handleDeleteAccount = async (account: Account) => {
    // 연결된 거래 확인
    const transactionCount = await database.getAccountTransactionCount(account.id);

    if (transactionCount > 0) {
      Alert.alert(
        '삭제 불가',
        `이 결제수단에 연결된 거래가 ${transactionCount}건 있습니다.\n거래 내역이 있는 결제수단은 삭제할 수 없습니다.`
      );
      return;
    }

    Alert.alert(
      '결제수단 삭제',
      `${account.name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteAccount(account.id);
              loadData();
              Alert.alert('성공', '결제수단이 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert('오류', '결제수단 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const getAccountsByBankId = (bankId: number | null) => {
    return accounts.filter(a => a.bankAccountId === bankId);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'card': return '카드';
      case 'cash': return '현금';
      case 'bank': return '통장';
      default: return type;
    }
  };

  const getCardTypeLabel = (cardType?: string) => {
    if (!cardType) return '';
    return cardType === 'credit' ? '신용' : '체크';
  };

  const totalBalance = bankAccounts
    .filter(a => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);

  // 통장에 연결되지 않은 결제수단
  const unlinkedAccounts = accounts.filter(a => !a.bankAccountId);

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
            통장: {bankAccounts.filter(a => a.isActive).length}개 | 결제수단: {accounts.length}개
          </Text>
        </Card.Content>
      </Card>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 통장 목록 */}
        <Text style={styles.sectionTitle}>통장</Text>
        {bankAccounts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>등록된 통장이 없습니다.</Text>
            </Card.Content>
          </Card>
        ) : (
          bankAccounts.map((bank) => {
            const linkedAccounts = getAccountsByBankId(bank.id);
            const isExpanded = expandedBankId === bank.id;

            return (
              <Card key={bank.id} style={[styles.bankCard, !bank.isActive && styles.inactiveCard]}>
                <TouchableOpacity onPress={() => setExpandedBankId(isExpanded ? null : bank.id)}>
                  <Card.Content>
                    <View style={styles.bankHeader}>
                      <View style={styles.bankInfo}>
                        <Text variant="titleMedium">{bank.name}</Text>
                        <Text style={styles.bankType}>{bank.accountType}</Text>
                        {bank.bankName && (
                          <Text style={styles.bankInstitution}>{bank.bankName}</Text>
                        )}
                      </View>
                      <View style={styles.bankRight}>
                        <Chip mode="flat" compact style={{ backgroundColor: bank.isActive ? '#d1fae5' : '#f3f4f6' }}>
                          {bank.isActive ? '활성' : '비활성'}
                        </Chip>
                        <Text variant="titleLarge" style={styles.balance}>
                          {Math.round(bank.balance).toLocaleString()}원
                        </Text>
                      </View>
                    </View>
                    <View style={styles.linkedAccountsInfo}>
                      <Text style={styles.linkedAccountsText}>
                        연결된 결제수단: {linkedAccounts.length}개
                      </Text>
                      <IconButton
                        icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                      />
                    </View>
                  </Card.Content>
                </TouchableOpacity>

                {isExpanded && (
                  <>
                    <Divider />
                    <Card.Content style={styles.linkedAccountsContainer}>
                      {linkedAccounts.length === 0 ? (
                        <Text style={styles.noLinkedAccounts}>연결된 결제수단이 없습니다.</Text>
                      ) : (
                        linkedAccounts.map((account) => (
                          <View key={account.id} style={styles.linkedAccount}>
                            <View style={styles.linkedAccountInfo}>
                              <Text>{account.name}</Text>
                              <View style={styles.typeChips}>
                                <Chip mode="flat" compact style={styles.smallChip}>{getTypeLabel(account.type)}</Chip>
                                {account.cardType && (
                                  <Chip mode="flat" compact style={styles.smallChip}>{getCardTypeLabel(account.cardType)}</Chip>
                                )}
                              </View>
                            </View>
                            <IconButton
                              icon="delete"
                              size={20}
                              onPress={() => handleDeleteAccount(account)}
                            />
                          </View>
                        ))
                      )}
                      <Button
                        mode="text"
                        icon="plus"
                        onPress={() => {
                          setSelectedBankAccountId(bank.id);
                          setAddAccountDialogVisible(true);
                        }}
                        style={styles.addLinkedButton}
                      >
                        결제수단 추가
                      </Button>
                    </Card.Content>
                  </>
                )}

                <Card.Actions>
                  <Button onPress={() => handleToggleBankActive(bank)}>
                    {bank.isActive ? '비활성화' : '활성화'}
                  </Button>
                  <Button onPress={() => handleDeleteBankAccount(bank)}>삭제</Button>
                </Card.Actions>
              </Card>
            );
          })
        )}

        {/* 통장 미연결 결제수단 */}
        {unlinkedAccounts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>통장 미연결 결제수단</Text>
            {unlinkedAccounts.map((account) => (
              <Card key={account.id} style={styles.accountCard}>
                <Card.Content>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountInfo}>
                      <Text variant="titleMedium">{account.name}</Text>
                      <View style={styles.typeChips}>
                        <Chip mode="flat" compact style={styles.chip}>{getTypeLabel(account.type)}</Chip>
                        {account.cardType && (
                          <Chip mode="flat" compact style={styles.chip}>{getCardTypeLabel(account.cardType)}</Chip>
                        )}
                      </View>
                    </View>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => handleDeleteAccount(account)}>삭제</Button>
                </Card.Actions>
              </Card>
            ))}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB 메뉴 */}
      <FAB.Group
        open={false}
        visible
        icon="plus"
        actions={[
          {
            icon: 'bank',
            label: '통장 추가',
            onPress: () => setAddBankDialogVisible(true),
          },
          {
            icon: 'credit-card',
            label: '결제수단 추가',
            onPress: () => {
              setSelectedBankAccountId(null);
              setAddAccountDialogVisible(true);
            },
          },
        ]}
        onStateChange={() => {}}
        fabStyle={styles.fab}
      />

      {/* 통장 추가 모달 */}
      <Modal
        visible={addBankDialogVisible}
        onRequestClose={() => setAddBankDialogVisible(false)}
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
                      value={bankName}
                      onChangeText={setBankName}
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
                      value={bankAccountType}
                      onChangeText={setBankAccountType}
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
                      value={bankInstitution}
                      onChangeText={setBankInstitution}
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
                      value={bankBalance}
                      onChangeText={setBankBalance}
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
                    <Button onPress={() => setAddBankDialogVisible(false)} mode="outlined" style={styles.modalButton}>
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

      {/* 결제수단 추가 모달 */}
      <Modal
        visible={addAccountDialogVisible}
        onRequestClose={() => setAddAccountDialogVisible(false)}
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
                  <Text style={styles.modalTitle}>결제수단 추가</Text>

                  <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                    <TextInput
                      label="결제수단 이름"
                      value={accountName}
                      onChangeText={setAccountName}
                      mode="outlined"
                      style={styles.input}
                      placeholder="예: 신한카드, 현금"
                      keyboardType="default"
                      autoCorrect={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      textContentType="none"
                    />

                    <Text style={styles.label}>종류</Text>
                    <View style={styles.radioRow}>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setAccountType('card')}
                      >
                        <RadioButton.Android
                          value="card"
                          status={accountType === 'card' ? 'checked' : 'unchecked'}
                          onPress={() => setAccountType('card')}
                        />
                        <Text>카드</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.radioOption}
                        onPress={() => setAccountType('cash')}
                      >
                        <RadioButton.Android
                          value="cash"
                          status={accountType === 'cash' ? 'checked' : 'unchecked'}
                          onPress={() => setAccountType('cash')}
                        />
                        <Text>현금</Text>
                      </TouchableOpacity>
                    </View>

                    {accountType === 'card' && (
                      <>
                        <Text style={styles.label}>카드 종류</Text>
                        <View style={styles.radioRow}>
                          <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setCardType('credit')}
                          >
                            <RadioButton.Android
                              value="credit"
                              status={cardType === 'credit' ? 'checked' : 'unchecked'}
                              onPress={() => setCardType('credit')}
                            />
                            <Text>신용카드</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setCardType('debit')}
                          >
                            <RadioButton.Android
                              value="debit"
                              status={cardType === 'debit' ? 'checked' : 'unchecked'}
                              onPress={() => setCardType('debit')}
                            />
                            <Text>체크카드</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    <Text style={styles.label}>연결할 통장 (선택)</Text>
                    <View style={styles.bankSelectList}>
                      <TouchableOpacity
                        style={[
                          styles.bankSelectItem,
                          selectedBankAccountId === null && styles.bankSelectItemSelected,
                        ]}
                        onPress={() => setSelectedBankAccountId(null)}
                      >
                        <Text>연결 안 함</Text>
                      </TouchableOpacity>
                      {bankAccounts.filter(b => b.isActive).map((bank) => (
                        <TouchableOpacity
                          key={bank.id}
                          style={[
                            styles.bankSelectItem,
                            selectedBankAccountId === bank.id && styles.bankSelectItemSelected,
                          ]}
                          onPress={() => setSelectedBankAccountId(bank.id)}
                        >
                          <Text>{bank.name}</Text>
                          {bank.bankName && <Text style={styles.bankSelectSubtext}>{bank.bankName}</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <View style={styles.modalActions}>
                    <Button onPress={() => setAddAccountDialogVisible(false)} mode="outlined" style={styles.modalButton}>
                      취소
                    </Button>
                    <Button onPress={handleAddAccount} mode="contained" style={styles.modalButton}>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#374151',
  },
  emptyCard: {
    margin: 16,
    marginTop: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  bankCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankInfo: {
    flex: 1,
  },
  bankType: {
    color: '#666',
    marginTop: 4,
  },
  bankInstitution: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  bankRight: {
    alignItems: 'flex-end',
  },
  balance: {
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 8,
  },
  linkedAccountsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  linkedAccountsText: {
    color: '#666',
    fontSize: 13,
  },
  linkedAccountsContainer: {
    paddingTop: 8,
  },
  noLinkedAccounts: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 8,
  },
  linkedAccount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkedAccountInfo: {
    flex: 1,
  },
  addLinkedButton: {
    marginTop: 8,
  },
  accountCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountInfo: {
    flex: 1,
  },
  typeChips: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  smallChip: {
    marginRight: 4,
    transform: [{ scale: 0.9 }],
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
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
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankSelectList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 12,
  },
  bankSelectItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bankSelectItemSelected: {
    backgroundColor: '#e0e7ff',
  },
  bankSelectSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
