import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Dialog, Portal, TextInput, FAB, Chip, RadioButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { database, Account } from '../lib/db/database';

export default function AccountsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'card' | 'cash' | 'bank'>('card');
  const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const accountList = await database.getAccounts();
      setAccounts(accountList);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      Alert.alert('오류', '계좌 정보를 불러오는데 실패했습니다.');
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

  const handleAddAccount = async () => {
    if (!name) {
      Alert.alert('입력 오류', '계좌 이름을 입력해주세요.');
      return;
    }

    try {
      await database.addAccount({
        name,
        type,
        cardType: type === 'card' ? cardType : undefined,
        color: type === 'card' ? '#3b82f6' : type === 'cash' ? '#10b981' : '#8b5cf6',
      });

      setAddDialogVisible(false);
      setName('');
      setType('card');
      setCardType('credit');
      loadData();
      Alert.alert('성공', '계좌가 추가되었습니다.');
    } catch (error) {
      console.error('Failed to add account:', error);
      Alert.alert('오류', '계좌 추가에 실패했습니다.');
    }
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      '계좌 삭제',
      `${account.name}을(를) 삭제하시겠습니까?\n관련된 거래 내역도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteAccount(account.id);
              loadData();
              Alert.alert('성공', '계좌가 삭제되었습니다.');
            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert('오류', '계좌 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
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
    return cardType === 'credit' ? '신용카드' : '체크카드';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>결제수단 관리</Text>

        {accounts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>등록된 계좌가 없습니다.</Text>
              <Text style={styles.emptySubtext}>아래 + 버튼을 눌러 계좌를 추가하세요.</Text>
            </Card.Content>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} style={styles.accountCard}>
              <Card.Content>
                <View style={styles.accountHeader}>
                  <View style={styles.accountInfo}>
                    <Text variant="titleMedium">{account.name}</Text>
                    <View style={styles.typeChips}>
                      <Chip mode="flat" compact style={styles.chip}>
                        {getTypeLabel(account.type)}
                      </Chip>
                      {account.cardType && (
                        <Chip mode="flat" compact style={styles.chip}>
                          {getCardTypeLabel(account.cardType)}
                        </Chip>
                      )}
                    </View>
                  </View>
                </View>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => handleDeleteAccount(account)}>삭제</Button>
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
          <Dialog.Title>계좌 추가</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="계좌 이름"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              placeholder="예: 신한카드, 현금"
            />

            <Text style={styles.label}>종류</Text>
            <RadioButton.Group onValueChange={(value) => setType(value as any)} value={type}>
              <View style={styles.radioRow}>
                <RadioButton.Item label="카드" value="card" />
                <RadioButton.Item label="현금" value="cash" />
              </View>
            </RadioButton.Group>

            {type === 'card' && (
              <>
                <Text style={styles.label}>카드 종류</Text>
                <RadioButton.Group onValueChange={(value) => setCardType(value as any)} value={cardType}>
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="신용카드" value="credit" />
                    <RadioButton.Item label="체크카드" value="debit" />
                  </View>
                </RadioButton.Group>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>취소</Button>
            <Button onPress={handleAddAccount}>추가</Button>
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
  accountCard: {
    margin: 16,
    marginTop: 8,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    color: '#666',
  },
  radioRow: {
    flexDirection: 'row',
  },
});
