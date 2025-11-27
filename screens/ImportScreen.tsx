import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Button,
  Card,
  Text,
  ActivityIndicator,
  List,
  Chip,
  Divider,
  DataTable,
  Switch,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  parseExcelFile,
  suggestColumnMapping,
  applyMapping,
  extractCardNameFromFilename,
  removeDuplicateTransactions,
  ParseResult,
  NormalizedTransaction,
} from '../lib/excel-parser';
import { applyCategoryRulesBulk } from '../lib/auto-categorize';
import { database, ExclusionPattern } from '../lib/db/database';

export default function ImportScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [cardNames, setCardNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [allTransactions, setAllTransactions] = useState<NormalizedTransaction[]>([]);
  const [excludedIncomeTransactions, setExcludedIncomeTransactions] = useState<NormalizedTransaction[]>([]); // 제외된 입금 내역
  const [showExcludedIncome, setShowExcludedIncome] = useState(false); // 제외 내역 표시 토글
  const [duplicateInfo, setDuplicateInfo] = useState({ removed: 0, dbSkipped: 0, incomeExcluded: 0, patternExcluded: 0 });
  const [excludeIncome, setExcludeIncome] = useState(true); // 은행 입금 내역 제외 옵션 (기본: ON)
  const [strictDuplicateCheck, setStrictDuplicateCheck] = useState(false); // 엄격한 중복 체크 (날짜+금액만)
  const [exclusionPatterns, setExclusionPatterns] = useState<ExclusionPattern[]>([]);

  // 제외 패턴 로드
  React.useEffect(() => {
    loadExclusionPatterns();
  }, []);

  const loadExclusionPatterns = async () => {
    try {
      const patterns = await database.getExclusionPatterns(true);
      setExclusionPatterns(patterns);
    } catch (error) {
      console.error('제외 패턴 로드 실패:', error);
    }
  };

  // 거래가 제외 패턴과 일치하는지 확인
  const matchesExclusionPattern = (tx: NormalizedTransaction): boolean => {
    for (const pattern of exclusionPatterns) {
      const patternLower = pattern.pattern.toLowerCase();

      if (pattern.type === 'merchant') {
        const merchant = (tx.merchant || '').toLowerCase();
        if (merchant.includes(patternLower)) {
          console.log(`[제외 패턴 매칭] ${pattern.pattern} - 거래처: ${tx.merchant}`);
          return true;
        }
      }

      if (pattern.type === 'memo') {
        const memo = (tx.memo || '').toLowerCase();
        if (memo.includes(patternLower)) {
          console.log(`[제외 패턴 매칭] ${pattern.pattern} - 메모: ${tx.memo}`);
          return true;
        }
      }

      if (pattern.type === 'account') {
        const account = (tx.account || '').toLowerCase();
        if (account.includes(patternLower)) {
          console.log(`[제외 패턴 매칭] ${pattern.pattern} - 계좌: ${tx.account}`);
          return true;
        }
      }

      if (pattern.type === 'both') {
        const merchant = (tx.merchant || '').toLowerCase();
        const memo = (tx.memo || '').toLowerCase();
        const account = (tx.account || '').toLowerCase();
        if (merchant.includes(patternLower) || memo.includes(patternLower) || account.includes(patternLower)) {
          console.log(`[제외 패턴 매칭] ${pattern.pattern} - ${tx.merchant || tx.memo || tx.account}`);
          return true;
        }
      }
    }
    return false;
  };

  // 파일 선택 (여러 개 가능)
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: true, // 여러 파일 선택 가능
      });

      if (result.canceled === false && result.assets && result.assets.length > 0) {
        setLoading(true);
        const allResults: ParseResult[] = [];
        const allCardNames: string[] = [];
        const allPreviewData: any[] = [];
        let rawTransactions: NormalizedTransaction[] = [];

        // 각 파일을 순차적으로 처리
        for (const file of result.assets) {
          try {
            // 파일을 ArrayBuffer로 읽기
            let base64: string;
            try {
              // content:// URI를 지원하는 방식으로 파일 읽기
              base64 = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch (readError: any) {
              console.error('FileSystem 읽기 실패, 대체 방법 시도:', readError);
              // 대체 방법: fetch를 사용하여 읽기 (OneDrive 등 클라우드 파일)
              const response = await fetch(file.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              base64 = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  const result = reader.result as string;
                  // data:application/...;base64,... 형식에서 base64 부분만 추출
                  const base64Data = result.split(',')[1];
                  resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }

            if (!base64) {
              console.error(`파일 ${file.name}을 읽을 수 없습니다.`);
              continue;
            }

            // Base64를 ArrayBuffer로 변환
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = bytes.buffer;

            // 파일명에서 카드명 추출
            const detectedCard = extractCardNameFromFilename(file.name);
            allCardNames.push(detectedCard || '알 수 없음');

            // Excel 파일 파싱
            const parsed = parseExcelFile(arrayBuffer);
            allResults.push(parsed);

            // 자동 컬럼 매핑 추천
            const mapping = suggestColumnMapping(parsed.headers);

            // 매핑 적용하여 거래 데이터 생성
            const transactions = applyMapping(parsed.rows, mapping);
            rawTransactions.push(...transactions.map(tx => ({
              ...tx,
              account: detectedCard || tx.account,
            })));

            // 미리보기 데이터 추가 (각 파일당 최대 5개)
            allPreviewData.push(...transactions.slice(0, 5).map(tx => ({
              ...tx,
              fileName: file.name,
              cardName: detectedCard,
            })));
          } catch (fileError: any) {
            console.error(`파일 ${file.name} 처리 오류:`, fileError);
          }
        }

        // 중복 거래 제거 (strictDuplicateCheck가 true면 날짜+금액만, false면 날짜+가맹점+금액)
        const { unique, duplicateCount } = removeDuplicateTransactions(rawTransactions, strictDuplicateCheck);

        // 제외 패턴 확인 로그
        console.log(`[제외 패턴] 현재 ${exclusionPatterns.length}개 패턴 활성:`, exclusionPatterns.map(p => `${p.pattern}(${p.type})`).join(', '));

        // 입금(income) 내역 제외 옵션 적용 + 제외 패턴 적용
        let incomeExcludedCount = 0;
        let patternExcludedCount = 0;
        let filteredTransactions = unique;
        const excludedIncomes: NormalizedTransaction[] = [];

        filteredTransactions = unique.filter(tx => {
          // 입금 내역 제외
          if (excludeIncome && tx.type === 'income') {
            incomeExcludedCount++;
            excludedIncomes.push(tx);
            return false;
          }

          // 제외 패턴 적용
          if (matchesExclusionPattern(tx)) {
            patternExcludedCount++;
            return false;
          }

          return true;
        });

        setAllTransactions(filteredTransactions);
        setExcludedIncomeTransactions(excludedIncomes);
        setDuplicateInfo({ removed: duplicateCount, dbSkipped: 0, incomeExcluded: incomeExcludedCount, patternExcluded: patternExcludedCount });

        setParseResults(allResults);
        setCardNames(allCardNames);
        setPreviewData(allPreviewData);
        setLoading(false);

        const totalRows = allResults.reduce((sum, r) => sum + r.rows.length, 0);
        let message = `${result.assets.length}개 파일에서 총 ${totalRows}개의 거래를 찾았습니다.`;
        if (duplicateCount > 0) {
          message += `\n(중복 ${duplicateCount}개 자동 제거)`;
        }
        if (incomeExcludedCount > 0) {
          message += `\n(입금 내역 ${incomeExcludedCount}개 제외)`;
        }
        if (patternExcludedCount > 0) {
          message += `\n(패턴 매칭 ${patternExcludedCount}개 제외)`;
        }
        message += `\n→ 최종 ${filteredTransactions.length}개`;
        message += '\n미리보기를 확인하고 가져오기를 진행하세요.';
        Alert.alert('파싱 완료', message);
      }
    } catch (error: any) {
      console.error('파일 선택 오류:', error);
      setLoading(false);
      Alert.alert('오류', error.message || '파일을 읽을 수 없습니다.');
    }
  };

  // 거래 가져오기 (여러 파일 처리)
  const importTransactions = async () => {
    if (allTransactions.length === 0) {
      Alert.alert('오류', '먼저 파일을 선택해주세요.');
      return;
    }

    let confirmMessage = `${allTransactions.length}개의 거래를 가져오시겠습니까?`;
    if (duplicateInfo.removed > 0) {
      confirmMessage += `\n(파일 내 중복 ${duplicateInfo.removed}개 이미 제거됨)`;
    }
    confirmMessage += '\n자동 분류 규칙이 적용됩니다.\nDB에 이미 존재하는 거래는 자동으로 제외됩니다.';

    Alert.alert(
      '가져오기 확인',
      confirmMessage,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '가져오기',
          onPress: async () => {
            setImporting(true);
            try {
              // 기본 계좌 가져오기
              const accounts = await database.getAccounts();
              const defaultAccount = accounts[0];

              if (!defaultAccount) {
                Alert.alert('오류', '계좌를 찾을 수 없습니다. 먼저 계좌를 추가해주세요.');
                setImporting(false);
                return;
              }

              // 기존 거래 가져와서 중복 체크용 Set 생성
              const existingTransactions = await database.getTransactions();
              const existingKeys = new Set<string>();
              for (const tx of existingTransactions) {
                const merchantKey = (tx.merchant || tx.description || '').toLowerCase().replace(/\s+/g, '');
                const key = `${tx.date}|${merchantKey}|${tx.amount}`;
                existingKeys.add(key);
              }

              // 전체 거래 추가
              let successCount = 0;
              let failCount = 0;
              let dbSkippedCount = 0;

              // 자동 분류 적용
              const categoryIds = await applyCategoryRulesBulk(allTransactions);

              // 각 거래 추가
              for (let i = 0; i < allTransactions.length; i++) {
                const tx = allTransactions[i];

                // DB 중복 체크
                const merchantKey = (tx.merchant || tx.memo || '').toLowerCase().replace(/\s+/g, '');
                const txKey = `${tx.date}|${merchantKey}|${tx.amount}`;

                if (existingKeys.has(txKey)) {
                  console.log(`[DB 중복] 스킵: ${tx.date} / ${tx.merchant} / ${tx.amount}`);
                  dbSkippedCount++;
                  continue;
                }

                const categoryId = categoryIds[i];

                // 카테고리가 없으면 기본 카테고리 사용
                let finalCategoryId = categoryId;
                if (!finalCategoryId) {
                  const categories = await database.getCategories(tx.type as 'income' | 'expense');
                  finalCategoryId = categories[0]?.id || 1;
                }

                try {
                  await database.addTransaction({
                    amount: tx.amount,
                    type: tx.type as 'income' | 'expense',
                    categoryId: finalCategoryId,
                    accountId: defaultAccount.id,
                    description: tx.merchant || tx.memo || '',
                    merchant: tx.merchant || '',
                    memo: tx.memo || '',
                    date: tx.date,
                    tags: '',
                    isTransfer: false,
                    status: 'confirmed',
                    cardName: tx.account || '',
                    cardNumber: '',
                  });
                  successCount++;
                  // 추가된 거래를 Set에 추가하여 같은 세션 내 중복 방지
                  existingKeys.add(txKey);
                } catch (error) {
                  console.error(`거래 ${i + 1} 추가 실패:`, error);
                  failCount++;
                }
              }

              setImporting(false);
              let resultMessage = `성공: ${successCount}개`;
              if (dbSkippedCount > 0) {
                resultMessage += `\nDB 중복으로 제외: ${dbSkippedCount}개`;
              }
              if (duplicateInfo.removed > 0) {
                resultMessage += `\n파일 내 중복 제거: ${duplicateInfo.removed}개`;
              }
              if (failCount > 0) {
                resultMessage += `\n실패: ${failCount}개`;
              }

              Alert.alert(
                '가져오기 완료',
                resultMessage,
                [
                  {
                    text: '확인',
                    onPress: () => {
                      // 초기화
                      setParseResults([]);
                      setPreviewData([]);
                      setCardNames([]);
                      setAllTransactions([]);
                      setExcludedIncomeTransactions([]);
                      setShowExcludedIncome(false);
                      setDuplicateInfo({ removed: 0, dbSkipped: 0, incomeExcluded: 0 });
                      navigation.navigate('Main');
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('가져오기 오류:', error);
              setImporting(false);
              Alert.alert('오류', error.message || '거래 가져오기에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            거래 가져오기
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Excel 파일(.xlsx)을 선택하면 자동으로 거래 내역을 분석하고 가져옵니다.
            8개 은행/카드사를 지원합니다.
          </Text>

          <Button mode="contained" icon="file-excel" onPress={pickFile} style={styles.pickButton} disabled={loading || importing}>Excel 파일 선택</Button>

          <View style={styles.optionRow}>
            <View style={styles.optionTextContainer}>
              <Text variant="bodyMedium" style={styles.optionTitle}>입금 내역 제외</Text>
              <Text variant="bodySmall" style={styles.optionDesc}>은행 거래내역의 입금(수입)을 제외합니다</Text>
            </View>
            <Switch
              value={excludeIncome}
              onValueChange={setExcludeIncome}
              color="#6366f1"
            />
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionTextContainer}>
              <Text variant="bodyMedium" style={styles.optionTitle}>엄격한 중복 체크</Text>
              <Text variant="bodySmall" style={styles.optionDesc}>날짜+금액만으로 중복 판단 (내역명 무시)</Text>
            </View>
            <Switch
              value={strictDuplicateCheck}
              onValueChange={setStrictDuplicateCheck}
              color="#6366f1"
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.exclusionInfoSection}>
            <Text variant="titleSmall" style={styles.exclusionInfoTitle}>
              거래 제외 패턴
            </Text>
            <Text variant="bodySmall" style={styles.exclusionInfoText}>
              {exclusionPatterns.length > 0
                ? `현재 ${exclusionPatterns.length}개의 패턴이 적용되어 가져오기 시 자동으로 제외됩니다.`
                : '제외 패턴이 없습니다.'}
            </Text>
            <Text variant="bodySmall" style={styles.exclusionInfoHint}>
              제외 패턴을 추가하거나 수정하려면 메뉴의 "자동 분류 규칙"을 이용하세요.
            </Text>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>파일을 분석 중입니다...</Text>
            </View>
          )}

          {importing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>거래를 가져오는 중입니다...</Text>
            </View>
          )}

          {parseResults.length > 0 && !loading && !importing && (
            <>
              <Divider style={styles.divider} />

              <View style={styles.infoContainer}>
                <List.Item
                  title="선택된 파일"
                  description={`${parseResults.length}개`}
                  left={(props) => <List.Icon {...props} icon="file-multiple" />}
                />
                <List.Item
                  title="총 거래 수"
                  description={`${parseResults.reduce((sum, r) => sum + r.rows.length, 0)}개`}
                  left={(props) => <List.Icon {...props} icon="table-row" />}
                />
                {cardNames.length > 0 && (
                  <View style={styles.chipContainer}>
                    {cardNames.map((name, idx) => (
                      <Chip key={idx} icon="credit-card" style={styles.chip}>{name}</Chip>
                    ))}
                  </View>
                )}
              </View>

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.sectionTitle}>
                미리보기 (각 파일당 최대 5개)
              </Text>

              <ScrollView horizontal style={styles.previewScroll}>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title style={styles.column}>파일명</DataTable.Title>
                    <DataTable.Title style={styles.column}>날짜</DataTable.Title>
                    <DataTable.Title style={styles.column}>금액</DataTable.Title>
                    <DataTable.Title style={styles.column}>유형</DataTable.Title>
                    <DataTable.Title style={styles.column}>가맹점</DataTable.Title>
                  </DataTable.Header>

                  {previewData.map((tx, index) => (
                    <DataTable.Row key={index}>
                      <DataTable.Cell style={styles.column}>
                        <Text numberOfLines={1} style={{ maxWidth: 120 }}>
                          {tx.fileName || '-'}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Text>{tx.date}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Text>{Math.round(tx.amount).toLocaleString()}원</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Chip mode="flat" style={tx.type === 'income' ? styles.incomeChip : styles.expenseChip}>{tx.type === 'income' ? '수입' : '지출'}</Chip>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Text>{tx.merchant || tx.description || '-'}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>

              <Divider style={styles.divider} />

              <Button mode="contained" icon="check" onPress={importTransactions} style={styles.importButton} buttonColor="#10b981" disabled={importing}>거래 가져오기 ({allTransactions.length}개)</Button>

              {/* 제외된 입금 내역 섹션 */}
              {excludedIncomeTransactions.length > 0 && (
                <>
                  <Divider style={styles.divider} />

                  <Button
                    mode="text"
                    icon={showExcludedIncome ? 'chevron-up' : 'chevron-down'}
                    onPress={() => setShowExcludedIncome(!showExcludedIncome)}
                    style={styles.excludedToggleButton}
                    contentStyle={styles.excludedToggleContent}
                  >
                    제외된 입금 내역 ({excludedIncomeTransactions.length}개)
                  </Button>

                  {showExcludedIncome && (
                    <View style={styles.excludedContainer}>
                      <Text variant="bodySmall" style={styles.excludedHint}>
                        아래 입금 내역은 가져오기에서 제외됩니다
                      </Text>
                      <ScrollView horizontal style={styles.previewScroll}>
                        <DataTable>
                          <DataTable.Header>
                            <DataTable.Title style={styles.column}>날짜</DataTable.Title>
                            <DataTable.Title style={styles.column}>금액</DataTable.Title>
                            <DataTable.Title style={styles.column}>내용</DataTable.Title>
                          </DataTable.Header>

                          {excludedIncomeTransactions.map((tx, index) => (
                            <DataTable.Row key={`excluded-${index}`}>
                              <DataTable.Cell style={styles.column}>
                                <Text>{tx.date}</Text>
                              </DataTable.Cell>
                              <DataTable.Cell style={styles.column}>
                                <Text style={styles.incomeAmount}>+{Math.round(tx.amount).toLocaleString()}원</Text>
                              </DataTable.Cell>
                              <DataTable.Cell style={styles.column}>
                                <Text>{tx.merchant || tx.memo || '-'}</Text>
                              </DataTable.Cell>
                            </DataTable.Row>
                          ))}
                        </DataTable>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  pickButton: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
  },
  optionDesc: {
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  infoContainer: {
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  previewScroll: {
    marginBottom: 16,
  },
  column: {
    minWidth: 100,
  },
  incomeChip: {
    backgroundColor: '#d1fae5',
  },
  expenseChip: {
    backgroundColor: '#fee2e2',
  },
  importButton: {
    marginTop: 8,
  },
  excludedToggleButton: {
    marginTop: 8,
  },
  excludedToggleContent: {
    flexDirection: 'row-reverse',
  },
  excludedContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  excludedHint: {
    color: '#92400e',
    marginBottom: 8,
  },
  incomeAmount: {
    color: '#10b981',
    fontWeight: '600',
  },
  exclusionInfoSection: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  exclusionInfoTitle: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#0c4a6e',
  },
  exclusionInfoText: {
    color: '#075985',
    marginBottom: 8,
  },
  exclusionInfoHint: {
    color: '#0369a1',
    fontStyle: 'italic',
  },
});
