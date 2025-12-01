import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, FAB, Chip, RadioButton, Divider, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { database, BankAccount, Account } from '../lib/db/database';
import { theme } from '../lib/theme';

export default function BankAccountsScreen() {
  const insets = useSafeAreaInsets();
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
  const [cardLast4, setCardLast4] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);

  // 확장된 통장 ID
  const [expandedBankId, setExpandedBankId] = useState<number | null>(null);

  // FAB 메뉴 상태
  const [fabOpen, setFabOpen] = useState(false);

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
        last4: accountType === 'card' && cardLast4 ? cardLast4 : undefined,
        color: accountType === 'card' ? '#3b82f6' : '#10b981',
        bankAccountId: selectedBankAccountId || undefined,
      });

      setAddAccountDialogVisible(false);
      setAccountName('');
      setAccountType('card');
      setCardType('credit');
      setCardLast4('');
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 그라데이션 + 총 자산 요약 */}
      <LinearGradient
        colors={theme.gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <Text style={styles.headerTitle}>통장 & 결제수단</Text>
        <Text style={styles.headerSubtitle}>자산을 관리하세요</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>총 자산</Text>
              <Text style={styles.totalAmount}>{Math.round(totalBalance).toLocaleString()}원</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Ionicons name="wallet-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.statText}>통장 {bankAccounts.filter(a => a.isActive).length}개</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="card-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.statText}>결제수단 {accounts.length}개</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 통장 목록 */}
        <View style={styles.sectionHeader}>
          <Ionicons name="wallet" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>통장</Text>
        </View>

        {bankAccounts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>등록된 통장이 없습니다</Text>
            <Text style={styles.emptySubtext}>+ 버튼을 눌러 추가하세요</Text>
          </View>
        ) : (
          bankAccounts.map((bank) => {
            const linkedAccounts = getAccountsByBankId(bank.id);
            const isExpanded = expandedBankId === bank.id;

            return (
              <View key={bank.id} style={[styles.bankCard, !bank.isActive && styles.inactiveCard]}>
                <TouchableOpacity onPress={() => setExpandedBankId(isExpanded ? null : bank.id)}>
                  <View style={styles.bankHeader}>
                    <View style={styles.bankInfo}>
                      <Text style={styles.bankName}>{bank.name}</Text>
                      <View style={styles.bankMeta}>
                        <Text style={styles.bankType}>{bank.accountType}</Text>
                        {bank.bankName && (
                          <Text style={styles.bankInstitution}>• {bank.bankName}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.bankRight}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: bank.isActive ? 'rgba(16, 185, 129, 0.1)' : theme.colors.surfaceVariant }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: bank.isActive ? theme.colors.income : theme.colors.textMuted }
                        ]}>
                          {bank.isActive ? '활성' : '비활성'}
                        </Text>
                      </View>
                      <Text style={styles.balance}>
                        {Math.round(bank.balance).toLocaleString()}원
                      </Text>
                    </View>
                  </View>
                  <View style={styles.linkedAccountsInfo}>
                    <Text style={styles.linkedAccountsText}>
                      연결된 결제수단: {linkedAccounts.length}개
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <>
                    <View style={styles.expandedDivider} />
                    <View style={styles.linkedAccountsContainer}>
                      {linkedAccounts.length === 0 ? (
                        <Text style={styles.noLinkedAccounts}>연결된 결제수단이 없습니다.</Text>
                      ) : (
                        linkedAccounts.map((account) => (
                          <View key={account.id} style={styles.linkedAccount}>
                            <View style={styles.linkedAccountInfo}>
                              <View style={styles.linkedAccountNameRow}>
                                <Text style={styles.linkedAccountName}>{account.name}</Text>
                                {account.last4 && (
                                  <Text style={styles.cardLast4}>(*{account.last4})</Text>
                                )}
                              </View>
                              <View style={styles.typeChips}>
                                <View style={styles.smallChip}>
                                  <Text style={styles.smallChipText}>{getTypeLabel(account.type)}</Text>
                                </View>
                                {account.cardType && (
                                  <View style={styles.smallChip}>
                                    <Text style={styles.smallChipText}>{getCardTypeLabel(account.cardType)}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity
                              style={styles.deleteIconButton}
                              onPress={() => handleDeleteAccount(account)}
                            >
                              <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                      <TouchableOpacity
                        style={styles.addLinkedButton}
                        onPress={() => {
                          setSelectedBankAccountId(bank.id);
                          setAddAccountDialogVisible(true);
                        }}
                      >
                        <Ionicons name="add" size={18} color={theme.colors.primary} />
                        <Text style={styles.addLinkedButtonText}>결제수단 추가</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleBankActive(bank)}
                  >
                    <Ionicons
                      name={bank.isActive ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.actionButtonText}>
                      {bank.isActive ? '비활성화' : '활성화'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteBankAccount(bank)}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.expense }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 통장 미연결 결제수단 */}
        {unlinkedAccounts.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
              <Ionicons name="card" size={20} color={theme.colors.warning} />
              <Text style={styles.sectionTitle}>통장 미연결 결제수단</Text>
            </View>
            {unlinkedAccounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.accountInfo}>
                    <View style={styles.accountNameRow}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      {account.last4 && (
                        <Text style={styles.cardLast4Large}>(*{account.last4})</Text>
                      )}
                    </View>
                    <View style={styles.typeChips}>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{getTypeLabel(account.type)}</Text>
                      </View>
                      {account.cardType && (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>{getCardTypeLabel(account.cardType)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteAccount(account)}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB 메뉴 */}
      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        color="#fff"
        actions={[
          {
            icon: 'bank',
            label: '통장 추가',
            onPress: () => {
              setFabOpen(false);
              setAddBankDialogVisible(true);
            },
            color: theme.colors.primary,
          },
          {
            icon: 'credit-card',
            label: '결제수단 추가',
            onPress: () => {
              setFabOpen(false);
              setSelectedBankAccountId(null);
              setAddAccountDialogVisible(true);
            },
            color: theme.colors.primary,
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
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

                        <TextInput
                          label="카드 뒷자리 4자리 (선택)"
                          value={cardLast4}
                          onChangeText={(text) => setCardLast4(text.replace(/[^0-9]/g, '').slice(0, 4))}
                          keyboardType="numeric"
                          mode="outlined"
                          style={styles.input}
                          placeholder="예: 1234"
                          maxLength={4}
                          autoCorrect={false}
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          textContentType="none"
                        />
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
    paddingBottom: theme.spacing.xl,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
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
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  summaryRow: {
    marginBottom: theme.spacing.sm,
  },
  summaryItem: {},
  summaryLabel: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.xs,
  },
  totalAmount: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statText: {
    fontSize: theme.fontSize.sm,
    color: '#fff',
    fontWeight: theme.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
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
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  bankCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
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
  bankName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bankMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bankType: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bankInstitution: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  bankRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  balance: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  linkedAccountsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  linkedAccountsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.sm,
  },
  linkedAccountsContainer: {
    paddingTop: theme.spacing.xs,
  },
  noLinkedAccounts: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.sm,
  },
  linkedAccount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  linkedAccountInfo: {
    flex: 1,
  },
  linkedAccountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  linkedAccountName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  cardLast4: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  deleteIconButton: {
    padding: theme.spacing.sm,
  },
  addLinkedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addLinkedButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
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
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  accountName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  cardLast4Large: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  typeChips: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  chip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  chipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  smallChip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  smallChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    backgroundColor: theme.colors.primary,
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
  radioRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankSelectList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  bankSelectItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  bankSelectItemSelected: {
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
  },
  bankSelectSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  modalButton: {
    minWidth: 80,
  },
});
