import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Text as RNText,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  DataTable,
} from 'react-native-paper';
import { theme } from '../lib/theme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
import { useTheme } from '../lib/ThemeContext';
import { useInterstitialAd } from '../components/InterstitialAd';
import { useTransactionContext } from '../lib/TransactionContext';

export default function ImportScreen({ navigation }: any) {
  const { theme: currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { forceShowInterstitial, InterstitialAdComponent } = useInterstitialAd();
  const { notifyTransactionAdded } = useTransactionContext();
  const [loading, setLoading] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [cardNames, setCardNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [allTransactions, setAllTransactions] = useState<NormalizedTransaction[]>([]);
  const [excludedIncomeTransactions, setExcludedIncomeTransactions] = useState<NormalizedTransaction[]>([]); // 제외된 입금 내역
  const [showExcludedIncome, setShowExcludedIncome] = useState(false); // 제외 내역 표시 토글
  const [duplicateInfo, setDuplicateInfo] = useState({ removed: 0, dbSkipped: 0, incomeExcluded: 0, patternExcluded: 0 });
  const [excludeIncome, setExcludeIncome] = useState(false); // 은행 입금 내역 제외 옵션 (기본: OFF - 입금도 포함)
  const [strictDuplicateCheck, setStrictDuplicateCheck] = useState(true); // 엄격한 중복 체크 (날짜+금액만) - 기본: ON
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
            let arrayBuffer: ArrayBuffer;

            // 방법 1: FileSystem.readAsStringAsync (Base64)
            const encodingBase64 = FileSystem.EncodingType?.Base64 || 'base64';
            console.log(`[파일 읽기] ${file.name} - EncodingType.Base64: ${encodingBase64}`);

            try {
              const base64 = await FileSystem.readAsStringAsync(file.uri, {
                encoding: encodingBase64,
              });
              console.log(`[파일 읽기] FileSystem 성공, base64 길이: ${base64.length}`);

              // Base64를 ArrayBuffer로 변환
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              arrayBuffer = bytes.buffer;
            } catch (readError: any) {
              console.error('FileSystem 읽기 실패, fetch 방법 시도:', readError.message);

              // 방법 2: fetch + arrayBuffer() 직접 사용 (가장 안정적)
              try {
                const response = await fetch(file.uri);
                arrayBuffer = await response.arrayBuffer();
                console.log(`[파일 읽기] fetch.arrayBuffer() 성공, 크기: ${arrayBuffer.byteLength}`);
              } catch (fetchError: any) {
                console.error('fetch.arrayBuffer() 실패, FileReader 시도:', fetchError.message);

                // 방법 3: fetch + FileReader (마지막 수단)
                const response = await fetch(file.uri);
                const blob = await response.blob();
                arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    resolve(reader.result as ArrayBuffer);
                  };
                  reader.onerror = reject;
                  reader.readAsArrayBuffer(blob);
                });
                console.log(`[파일 읽기] FileReader 성공, 크기: ${arrayBuffer.byteLength}`);
              }
            }

            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
              console.error(`파일 ${file.name}을 읽을 수 없습니다.`);
              continue;
            }

            // 디버깅: ArrayBuffer 내용 확인
            const fileBytes = new Uint8Array(arrayBuffer.slice(0, 32));
            const hexHeader = Array.from(fileBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log(`[파일 읽기] ${file.name} - 크기: ${arrayBuffer.byteLength}바이트`);
            console.log(`[파일 읽기] 파일 헤더 (hex): ${hexHeader}`);

            // 파일 형식 확인 (OLE2 = D0 CF 11 E0)
            const isOLE2 = fileBytes[0] === 0xD0 && fileBytes[1] === 0xCF && fileBytes[2] === 0x11 && fileBytes[3] === 0xE0;
            const isZIP = fileBytes[0] === 0x50 && fileBytes[1] === 0x4B && fileBytes[2] === 0x03 && fileBytes[3] === 0x04;
            console.log(`[파일 읽기] 파일 형식: OLE2(xls)=${isOLE2}, ZIP(xlsx)=${isZIP}`);

            // 파일명에서 카드명 추출
            const detectedCard = extractCardNameFromFilename(file.name);
            allCardNames.push(detectedCard || '알 수 없음');

            // Excel 파일 파싱
            const parsed = parseExcelFile(arrayBuffer);
            console.log(`[파싱 결과] 헤더: ${parsed.headers.join(', ')}`);
            console.log(`[파싱 결과] 총 ${parsed.rowCount}개 행`);
            allResults.push(parsed);

            // 자동 컬럼 매핑 추천 (헤더 기반 + 데이터 기반 자동 감지)
            const mapping = suggestColumnMapping(parsed.headers, parsed.rows);
            console.log(`[컬럼 매핑] ${mapping.length}개 매핑:`, mapping.map(m => `${m.source}->${m.target}`).join(', '));

            // 매핑 적용하여 거래 데이터 생성
            const transactions = applyMapping(parsed.rows, mapping);

            // 디버깅: 수입/지출 통계
            const incomeCount = transactions.filter(tx => tx.type === 'income').length;
            const expenseCount = transactions.filter(tx => tx.type === 'expense').length;
            console.log(`[매핑 결과] 총 ${transactions.length}건 (수입: ${incomeCount}건, 지출: ${expenseCount}건)`);

            // 수입 거래 샘플 (최대 3건)
            const incomeSamples = transactions.filter(tx => tx.type === 'income').slice(0, 3);
            if (incomeSamples.length > 0) {
              console.log(`[수입 샘플] ${incomeSamples.map(tx => `${tx.date}/${tx.amount}원/${tx.merchant || tx.memo}`).join(' | ')}`);
            }

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

        // 입금/지출 통계 (중복 제거 전)
        const rawIncomeCount = unique.filter(tx => tx.type === 'income').length;
        const rawExpenseCount = unique.filter(tx => tx.type === 'expense').length;
        console.log(`[파싱 완료] 원본 거래: 수입 ${rawIncomeCount}개, 지출 ${rawExpenseCount}개`);

        // 최종 거래 통계
        const finalIncomeCount = filteredTransactions.filter(tx => tx.type === 'income').length;
        const finalExpenseCount = filteredTransactions.filter(tx => tx.type === 'expense').length;
        console.log(`[파싱 완료] 최종 거래: 수입 ${finalIncomeCount}개, 지출 ${finalExpenseCount}개`);

        const totalRows = allResults.reduce((sum, r) => sum + r.rows.length, 0);
        let message = `${result.assets.length}개 파일에서 총 ${totalRows}개의 거래를 찾았습니다.`;
        message += `\n수입 ${finalIncomeCount}개 / 지출 ${finalExpenseCount}개`;
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
              // 최적화: 가져올 거래의 날짜 범위만 조회 (전체 로드 대신)
              const dates = allTransactions.map(tx => tx.date).filter(Boolean);
              const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
              const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;

              // 해당 기간의 거래만 로드하여 중복 체크
              const existingTransactions = minDate && maxDate
                ? await database.getTransactions(minDate, maxDate)
                : [];
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

              // 기본 카테고리 미리 조회 (루프 밖에서 1회만)
              const incomeCategories = await database.getCategories('income');
              const expenseCategories = await database.getCategories('expense');

              // 카테고리가 없으면 생성 (첫 실행 시 또는 DB 초기화 후)
              let defaultIncomeId = incomeCategories[0]?.id;
              let defaultExpenseId = expenseCategories[0]?.id;

              if (!defaultIncomeId) {
                console.log('[ImportScreen] 수입 카테고리 없음, 기본 카테고리 생성');
                defaultIncomeId = await database.addCategory({
                  name: '급여',
                  type: 'income',
                  color: '#4CAF50',
                });
              }
              if (!defaultExpenseId) {
                console.log('[ImportScreen] 지출 카테고리 없음, 기본 카테고리 생성');
                defaultExpenseId = await database.addCategory({
                  name: '기타',
                  type: 'expense',
                  color: '#9E9E9E',
                });
              }

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

                // 카테고리가 없으면 기본 카테고리 사용 (타입별로 다른 기본값)
                let finalCategoryId = categoryId;
                if (!finalCategoryId) {
                  finalCategoryId = tx.type === 'income' ? defaultIncomeId : defaultExpenseId;
                  console.log(`[기본 카테고리] ${tx.merchant || tx.memo}: ${tx.type} → categoryId ${finalCategoryId}`);
                }

                try {
                  // 파일명 기반으로 카드/은행 분류 (나중에 결제수단/통장 연동 예정)
                  // tx.account에는 extractCardNameFromFilename에서 추출한 카드/은행명이 들어있음
                  const sourceType = tx.account || '';
                  // 은행 관련 키워드가 있으면 '은행', 카드 관련이면 '카드'로 분류
                  const isBank = /은행|저축|새마을|우체국|농협|수협|신협|산업|기업|하나|국민|신한|우리|SC|씨티|케이|IBK|BNK|DGB|경남|부산|전북|광주|제주/.test(sourceType) && !/카드/.test(sourceType);
                  const classifiedSource = isBank ? `[은행] ${sourceType}` : `[카드] ${sourceType}`;

                  await database.addTransaction({
                    amount: tx.amount,
                    type: tx.type as 'income' | 'expense',
                    categoryId: finalCategoryId,
                    accountId: undefined, // 계좌 연동은 나중에 별도로 진행
                    description: tx.merchant || tx.memo || '',
                    merchant: tx.merchant || '',
                    memo: tx.memo || '',
                    date: tx.date,
                    tags: '',
                    isTransfer: false,
                    status: 'confirmed',
                    cardName: classifiedSource, // 카드/은행 분류 표시
                    cardNumber: '',
                  });

                  // 입금 거래 DB 저장 로그
                  if (tx.type === 'income') {
                    console.log(`[DB 저장] ✅ 입금 추가: ${tx.date} / ${tx.merchant || tx.memo} / ${tx.amount}원`);
                  }

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

              // 거래 추가 알림 (다른 화면 실시간 업데이트)
              if (successCount > 0) {
                notifyTransactionAdded();
              }

              // 전면 광고 표시 (대량 작업 완료 - 자연스러운 타이밍)
              forceShowInterstitial();

              // 가져오기 완료 - 항상 현재 월로 이동
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
                      setDuplicateInfo({ removed: 0, dbSkipped: 0, incomeExcluded: 0, patternExcluded: 0 });
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
    <>
    {/* 전면 광고 컴포넌트 */}
    {InterstitialAdComponent}
    <View style={[styles.safeArea, { backgroundColor: currentTheme.colors.background }]}>
      {/* 헤더 */}
      <LinearGradient
        colors={currentTheme.gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.openDrawer()}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <RNText style={styles.headerTitle}>거래 가져오기</RNText>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* 메인 카드 */}
        <View style={styles.card}>
          <RNText style={styles.cardDescription}>
            Excel 파일(.xlsx)을 선택하면 자동으로 거래 내역을 분석하고 가져옵니다. 8개 은행/카드사를 지원합니다.
          </RNText>

          <TouchableOpacity
            style={[styles.pickButton, (loading || importing) && styles.buttonDisabled]}
            onPress={pickFile}
            disabled={loading || importing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradients.header as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pickButtonGradient}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <RNText style={styles.pickButtonText}>Excel 파일 선택</RNText>
            </LinearGradient>
          </TouchableOpacity>

          {/* 옵션들 - 기본값 사용 (입금 제외: ON, 엄격한 중복체크: ON) */}

          {/* 제외 패턴 정보 */}
          <View style={styles.exclusionInfoSection}>
            <View style={styles.exclusionInfoHeader}>
              <Ionicons name="filter" size={18} color={theme.colors.primary} />
              <RNText style={styles.exclusionInfoTitle}>거래 제외 패턴</RNText>
            </View>
            <RNText style={styles.exclusionInfoText}>
              {exclusionPatterns.length > 0
                ? `현재 ${exclusionPatterns.length}개의 패턴이 적용되어 가져오기 시 자동으로 제외됩니다.`
                : '제외 패턴이 없습니다.'}
            </RNText>
            <RNText style={styles.exclusionInfoHint}>
              제외 패턴을 추가하거나 수정하려면 메뉴의 "자동 분류 규칙"을 이용하세요.
            </RNText>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <RNText style={styles.loadingText}>파일을 분석 중입니다...</RNText>
            </View>
          )}

          {importing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.income} />
              <RNText style={styles.loadingText}>거래를 가져오는 중입니다...</RNText>
            </View>
          )}

          {parseResults.length > 0 && !loading && !importing && (
            <>
              <View style={styles.divider} />

              {/* 거래 가져오기 버튼 (상단 배치) */}
              <TouchableOpacity
                style={[styles.importButton, importing && styles.buttonDisabled]}
                onPress={importTransactions}
                disabled={importing}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <RNText style={styles.importButtonText}>거래 가져오기 ({allTransactions.length}개)</RNText>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* 파일 정보 */}
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="documents" size={20} color={theme.colors.primary} />
                    </View>
                    <View>
                      <RNText style={styles.infoLabel}>선택된 파일</RNText>
                      <RNText style={styles.infoValue}>{parseResults.length}개</RNText>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="list" size={20} color={theme.colors.primary} />
                    </View>
                    <View>
                      <RNText style={styles.infoLabel}>총 거래 수</RNText>
                      <RNText style={styles.infoValue}>{parseResults.reduce((sum, r) => sum + r.rows.length, 0)}개</RNText>
                    </View>
                  </View>
                </View>

                {cardNames.length > 0 && (
                  <View style={styles.chipContainer}>
                    {cardNames.map((name, idx) => (
                      <View key={idx} style={styles.chip}>
                        <Ionicons name="card" size={14} color={theme.colors.primary} />
                        <RNText style={styles.chipText}>{name}</RNText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <RNText style={styles.sectionTitle}>미리보기 (각 파일당 최대 5개)</RNText>

              <ScrollView horizontal style={styles.previewScroll} showsHorizontalScrollIndicator={false}>
                <DataTable style={styles.dataTable}>
                  <DataTable.Header style={styles.tableHeader}>
                    <DataTable.Title style={styles.column}><Text style={styles.headerText}>파일명</Text></DataTable.Title>
                    <DataTable.Title style={styles.column}><Text style={styles.headerText}>날짜</Text></DataTable.Title>
                    <DataTable.Title style={styles.columnSmall}><Text style={styles.headerText}>시간</Text></DataTable.Title>
                    <DataTable.Title style={styles.column}><Text style={styles.headerText}>금액</Text></DataTable.Title>
                    <DataTable.Title style={styles.column}><Text style={styles.headerText}>유형</Text></DataTable.Title>
                    <DataTable.Title style={styles.column}><Text style={styles.headerText}>가맹점</Text></DataTable.Title>
                  </DataTable.Header>

                  {previewData.map((tx, index) => (
                    <DataTable.Row key={index} style={styles.tableRow}>
                      <DataTable.Cell style={styles.column}>
                        <Text numberOfLines={1} style={styles.cellText}>{tx.fileName || '-'}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Text style={styles.cellText}>{tx.date}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.columnSmall}>
                        <Text style={styles.cellText}>{tx.time || '-'}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Text style={styles.cellText} numberOfLines={1}>{Math.round(tx.amount).toLocaleString()}원</Text>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <View style={tx.type === 'income' ? styles.incomeChip : styles.expenseChip}>
                          <RNText style={tx.type === 'income' ? styles.incomeChipText : styles.expenseChipText}>
                            {tx.type === 'income' ? '수입' : '지출'}
                          </RNText>
                        </View>
                      </DataTable.Cell>
                      <DataTable.Cell style={styles.column}>
                        <Text style={styles.cellText}>{tx.merchant || tx.description || '-'}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>

              {/* 제외된 입금 내역 섹션 */}
              {excludedIncomeTransactions.length > 0 && (
                <>
                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.excludedToggleButton}
                    onPress={() => setShowExcludedIncome(!showExcludedIncome)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showExcludedIncome ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                    <RNText style={styles.excludedToggleText}>
                      제외된 입금 내역 ({excludedIncomeTransactions.length}개)
                    </RNText>
                  </TouchableOpacity>

                  {showExcludedIncome && (
                    <View style={styles.excludedContainer}>
                      <RNText style={styles.excludedHint}>
                        아래 입금 내역은 가져오기에서 제외됩니다
                      </RNText>
                      <ScrollView horizontal style={styles.previewScroll} showsHorizontalScrollIndicator={false}>
                        <DataTable style={styles.dataTable}>
                          <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={styles.column}><Text style={styles.headerText}>날짜</Text></DataTable.Title>
                            <DataTable.Title style={styles.columnSmall}><Text style={styles.headerText}>시간</Text></DataTable.Title>
                            <DataTable.Title style={styles.column}><Text style={styles.headerText}>금액</Text></DataTable.Title>
                            <DataTable.Title style={styles.column}><Text style={styles.headerText}>내용</Text></DataTable.Title>
                          </DataTable.Header>

                          {excludedIncomeTransactions.map((tx, index) => (
                            <DataTable.Row key={`excluded-${index}`} style={styles.tableRow}>
                              <DataTable.Cell style={styles.column}>
                                <Text style={styles.cellText}>{tx.date}</Text>
                              </DataTable.Cell>
                              <DataTable.Cell style={styles.columnSmall}>
                                <Text style={styles.cellText}>{tx.time || '-'}</Text>
                              </DataTable.Cell>
                              <DataTable.Cell style={styles.column}>
                                <Text style={styles.incomeAmount} numberOfLines={1}>+{Math.round(tx.amount).toLocaleString()}원</Text>
                              </DataTable.Cell>
                              <DataTable.Cell style={styles.column}>
                                <Text style={styles.cellText}>{tx.merchant || tx.memo || '-'}</Text>
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
        </View>
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: theme.spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  cardDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  pickButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  pickButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  pickButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  optionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
  },
  optionDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  infoContainer: {
    marginBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  chipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium as any,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  previewScroll: {
    marginBottom: theme.spacing.md,
  },
  dataTable: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  tableHeader: {
    backgroundColor: theme.colors.background,
  },
  tableRow: {
    borderBottomColor: theme.colors.border,
  },
  headerText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
  },
  cellText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
  },
  column: {
    minWidth: 100,
  },
  columnSmall: {
    minWidth: 80,
  },
  incomeChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  incomeChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.income,
    fontWeight: theme.fontWeight.medium as any,
  },
  expenseChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  expenseChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.expense,
    fontWeight: theme.fontWeight.medium as any,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.income,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  importButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as any,
    color: '#fff',
  },
  excludedToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  excludedToggleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium as any,
  },
  excludedContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  excludedHint: {
    fontSize: theme.fontSize.xs,
    color: '#92400e',
    marginBottom: theme.spacing.sm,
  },
  incomeAmount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.income,
    fontWeight: theme.fontWeight.semibold as any,
  },
  exclusionInfoSection: {
    backgroundColor: 'rgba(19, 202, 214, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(19, 202, 214, 0.2)',
  },
  exclusionInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  exclusionInfoTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.primary,
  },
  exclusionInfoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  exclusionInfoHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
});
