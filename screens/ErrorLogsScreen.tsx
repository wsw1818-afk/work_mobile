import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Share, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, IconButton } from 'react-native-paper';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { errorLogs, clearErrorLogs, exportErrorLogs } from '../lib/error-tracker';

export default function ErrorLogsScreen() {
  const [logs, setLogs] = useState(errorLogs);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    // 1초마다 로그 업데이트
    const interval = setInterval(() => {
      setLogs([...errorLogs]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = () => {
    Alert.alert(
      '로그 초기화',
      '모든 에러 로그를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            clearErrorLogs();
            setLogs([]);
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const logsText = exportErrorLogs();
      await Share.share({
        message: logsText,
        title: 'Error Logs Export',
      });
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#fee2e2';
      case 'warning':
        return '#fef3c7';
      case 'info':
        return '#dbeafe';
      default:
        return '#f3f4f6';
    }
  };

  const getTypeTextColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#991b1b';
      case 'warning':
        return '#92400e';
      case 'info':
        return '#1e40af';
      default:
        return '#374151';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="titleLarge" style={styles.headerTitle}>
            에러 로그
          </Text>
          <Chip compact style={styles.countChip}>{logs.length}개</Chip>
        </View>
        <View style={styles.headerButtons}>
          <Button mode="outlined" onPress={handleExportLogs} compact>내보내기</Button>
          <Button mode="outlined" onPress={handleClearLogs} compact>초기화</Button>
        </View>
      </View>

      <Divider />

      {/* 로그 목록 */}
      <ScrollView style={styles.scrollView}>
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              에러 로그가 없습니다.
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              앱에서 발생하는 모든 에러가 여기에 기록됩니다.
            </Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <Card
              key={index}
              style={[styles.logCard, { backgroundColor: getTypeColor(log.type) }]}
            >
              <Card.Content>
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    <Text style={styles.typeIcon}>{getTypeIcon(log.type)}</Text>
                    <View style={styles.logInfo}>
                      <Text
                        variant="bodySmall"
                        style={[styles.timestamp, { color: getTypeTextColor(log.type) }]}
                      >
                        {format(new Date(log.timestamp), 'HH:mm:ss.SSS', { locale: ko })}
                      </Text>
                      <Chip
                        compact
                        style={[styles.typeChip, { backgroundColor: getTypeColor(log.type) }]}
                        textStyle={{ color: getTypeTextColor(log.type), fontSize: 10 }}
                      >{log.type.toUpperCase()}</Chip>
                    </View>
                  </View>
                  <IconButton
                    icon={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    onPress={() => toggleExpand(index)}
                  />
                </View>

                {/* 메시지 */}
                <Text
                  variant="bodyMedium"
                  style={[styles.message, { color: getTypeTextColor(log.type) }]}
                  numberOfLines={expandedIndex === index ? undefined : 3}
                >
                  {log.message}
                </Text>

                {/* 확장된 정보 */}
                {expandedIndex === index && (
                  <>
                    {/* Stack Trace */}
                    {log.stack && (
                      <>
                        <Divider style={styles.divider} />
                        <Text variant="labelMedium" style={styles.sectionTitle}>
                          Stack Trace:
                        </Text>
                        <ScrollView style={styles.codeBox} horizontal>
                          <Text
                            style={[styles.codeText, { color: getTypeTextColor(log.type) }]}
                          >
                            {log.stack}
                          </Text>
                        </ScrollView>
                      </>
                    )}

                    {/* Component Stack */}
                    {log.componentStack && (
                      <>
                        <Divider style={styles.divider} />
                        <Text variant="labelMedium" style={styles.sectionTitle}>
                          Component Stack:
                        </Text>
                        <ScrollView style={styles.codeBox} horizontal>
                          <Text
                            style={[styles.codeText, { color: getTypeTextColor(log.type) }]}
                          >
                            {log.componentStack}
                          </Text>
                        </ScrollView>
                      </>
                    )}

                    {/* Metadata */}
                    {log.metadata && (
                      <>
                        <Divider style={styles.divider} />
                        <Text variant="labelMedium" style={styles.sectionTitle}>
                          Metadata:
                        </Text>
                        <ScrollView style={styles.codeBox} horizontal>
                          <Text
                            style={[styles.codeText, { color: getTypeTextColor(log.type) }]}
                          >
                            {JSON.stringify(log.metadata, null, 2)}
                          </Text>
                        </ScrollView>
                      </>
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  countChip: {
    backgroundColor: '#e0e7ff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
    textAlign: 'center',
  },
  logCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIcon: {
    fontSize: 24,
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  typeChip: {
    height: 20,
  },
  message: {
    fontWeight: '500',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  codeBox: {
    maxHeight: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 8,
    borderRadius: 4,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
