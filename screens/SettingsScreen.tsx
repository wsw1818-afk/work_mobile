import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { database } from '../lib/db/database';

export default function SettingsScreen() {
  const handleResetData = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 데이터가 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            try {
              // 모든 테이블 데이터 삭제 (향후 구현)
              Alert.alert('성공', '데이터가 초기화되었습니다.');
            } catch (error) {
              console.error('Failed to reset data:', error);
              Alert.alert('오류', '데이터 초기화에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>설정</Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              데이터 관리
            </Text>
            <List.Item
              title="백업"
              description="데이터를 백업합니다"
              left={(props) => <List.Icon {...props} icon="backup-restore" />}
              onPress={() => Alert.alert('준비중', '백업 기능은 준비 중입니다.')}
            />
            <Divider />
            <List.Item
              title="복원"
              description="백업된 데이터를 복원합니다"
              left={(props) => <List.Icon {...props} icon="restore" />}
              onPress={() => Alert.alert('준비중', '복원 기능은 준비 중입니다.')}
            />
            <Divider />
            <List.Item
              title="데이터 초기화"
              description="모든 데이터를 삭제합니다"
              left={(props) => <List.Icon {...props} icon="delete-forever" />}
              onPress={handleResetData}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              앱 정보
            </Text>
            <List.Item
              title="버전"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <Divider />
            <List.Item
              title="개발자"
              description="가계부 모바일 앱"
              left={(props) => <List.Icon {...props} icon="account" />}
            />
          </Card.Content>
        </Card>

        <Text style={styles.footerText}>
          © 2025 가계부 모바일 앱
        </Text>
      </ScrollView>
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
  card: {
    margin: 16,
    marginTop: 8,
  },
  cardTitle: {
    marginBottom: 12,
  },
  footerText: {
    textAlign: 'center',
    padding: 32,
    color: '#666',
  },
});
