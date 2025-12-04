import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../lib/ThemeContext';
import { useAds } from '../lib/AdContext';
import { ADMOB_IDS, AD_CONFIG } from '../lib/adConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// AsyncStorage 키
const STORAGE_KEYS = {
  DAILY_AD_COUNT: 'interstitial_daily_count',
  LAST_AD_DATE: 'interstitial_last_date',
};

interface InterstitialAdProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 전면 광고 컴포넌트
 *
 * 사용법:
 * ```tsx
 * const [showAd, setShowAd] = useState(false);
 *
 * // 광고 표시
 * <InterstitialAd
 *   visible={showAd}
 *   onClose={() => setShowAd(false)}
 * />
 * ```
 */
export function InterstitialAd({ visible, onClose }: InterstitialAdProps) {
  const { theme: currentTheme } = useTheme();
  const { isPremium } = useAds();
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);

  // 테스트 모드 확인
  const isTestMode = ADMOB_IDS.ANDROID_INTERSTITIAL.includes('3940256099942544');

  // 카운트다운 타이머
  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      setCanClose(false);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [visible, countdown]);

  // 프리미엄 사용자는 광고 표시 안 함
  if (isPremium) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {
        if (canClose) onClose();
      }}
    >
      <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
        {/* 상단 바 */}
        <View style={[styles.topBar, { backgroundColor: currentTheme.colors.surface }]}>
          {isTestMode && (
            <View style={styles.testBadge}>
              <Text style={styles.testBadgeText}>TEST AD</Text>
            </View>
          )}
          <Text style={[styles.adLabel, { color: currentTheme.colors.textMuted }]}>
            광고
          </Text>
          <TouchableOpacity
            style={[
              styles.closeButton,
              { backgroundColor: canClose ? currentTheme.colors.primary : currentTheme.colors.textMuted }
            ]}
            onPress={onClose}
            disabled={!canClose}
          >
            {canClose ? (
              <Ionicons name="close" size={20} color="#fff" />
            ) : (
              <Text style={styles.countdownText}>{countdown}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 광고 콘텐츠 영역 - 실제 SDK 연동 시 교체 */}
        <View style={styles.adContent}>
          <View style={[styles.adPlaceholder, { backgroundColor: currentTheme.colors.surfaceVariant }]}>
            <Ionicons
              name="megaphone"
              size={64}
              color={currentTheme.colors.textMuted}
            />
            <Text style={[styles.adTitle, { color: currentTheme.colors.text }]}>
              Google AdMob 전면 광고
            </Text>
            <Text style={[styles.adDescription, { color: currentTheme.colors.textSecondary }]}>
              실제 SDK 연동 시 여기에 전면 광고가 표시됩니다
            </Text>

            {/* 테스트용 광고 정보 */}
            <View style={[styles.adInfo, { backgroundColor: currentTheme.colors.surface }]}>
              <Text style={[styles.adInfoLabel, { color: currentTheme.colors.textMuted }]}>
                광고 단위 ID (테스트)
              </Text>
              <Text style={[styles.adInfoValue, { color: currentTheme.colors.textSecondary }]}>
                {ADMOB_IDS.ANDROID_INTERSTITIAL}
              </Text>
            </View>
          </View>
        </View>

        {/* 하단 정보 */}
        <View style={[styles.bottomBar, { backgroundColor: currentTheme.colors.surface }]}>
          <Text style={[styles.bottomText, { color: currentTheme.colors.textMuted }]}>
            {canClose ? '닫기 버튼을 눌러 계속하세요' : `${countdown}초 후에 닫을 수 있습니다`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 전면 광고 표시 훅 (Google 정책 준수)
 *
 * 정책 준수 기능:
 * - 앱 시작 후 초기 지연 (30초)
 * - 광고 간 쿨다운 (60초)
 * - 일일 최대 표시 횟수 제한 (10회)
 * - 액션 빈도 기반 표시 (5번마다 1번)
 *
 * 사용법:
 * ```tsx
 * const { showInterstitial, InterstitialAdComponent } = useInterstitialAd();
 *
 * // 작업 완료 후 광고 표시 시도
 * const handleTaskComplete = () => {
 *   // 정책 조건을 모두 만족할 때만 광고 표시
 *   showInterstitial();
 * };
 *
 * // 렌더링
 * return (
 *   <>
 *     {InterstitialAdComponent}
 *     <YourComponent />
 *   </>
 * );
 * ```
 */
export function useInterstitialAd() {
  const [visible, setVisible] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { isPremium } = useAds();

  // 앱 시작 시간 및 마지막 광고 시간 추적
  const appStartTimeRef = useRef<number>(Date.now());
  const lastAdTimeRef = useRef<number>(0);

  // 초기화: 일일 카운트 로드 및 날짜 체크
  useEffect(() => {
    const initializeDailyCount = async () => {
      try {
        const storedDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_AD_DATE);
        const storedCount = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_AD_COUNT);
        const today = new Date().toDateString();

        if (storedDate === today && storedCount) {
          // 같은 날이면 저장된 카운트 사용
          setDailyCount(parseInt(storedCount, 10));
        } else {
          // 새로운 날이면 카운트 리셋
          await AsyncStorage.setItem(STORAGE_KEYS.LAST_AD_DATE, today);
          await AsyncStorage.setItem(STORAGE_KEYS.DAILY_AD_COUNT, '0');
          setDailyCount(0);
        }
      } catch (error) {
        console.error('Failed to initialize daily ad count:', error);
      }
      setIsInitialized(true);
    };

    initializeDailyCount();
  }, []);

  // 광고 표시 가능 여부 체크
  const canShowAd = useCallback((): { allowed: boolean; reason?: string } => {
    // 프리미엄 사용자
    if (isPremium) {
      return { allowed: false, reason: 'Premium user' };
    }

    // 초기화 전
    if (!isInitialized) {
      return { allowed: false, reason: 'Not initialized' };
    }

    // 앱 시작 후 초기 지연 체크
    const timeSinceAppStart = Date.now() - appStartTimeRef.current;
    if (timeSinceAppStart < AD_CONFIG.INTERSTITIAL_INITIAL_DELAY_MS) {
      return { allowed: false, reason: 'Initial delay not passed' };
    }

    // 마지막 광고 후 쿨다운 체크
    const timeSinceLastAd = Date.now() - lastAdTimeRef.current;
    if (lastAdTimeRef.current > 0 && timeSinceLastAd < AD_CONFIG.INTERSTITIAL_COOLDOWN_MS) {
      return { allowed: false, reason: 'Cooldown not passed' };
    }

    // 일일 최대 횟수 체크
    if (dailyCount >= AD_CONFIG.INTERSTITIAL_DAILY_LIMIT) {
      return { allowed: false, reason: 'Daily limit reached' };
    }

    return { allowed: true };
  }, [isPremium, isInitialized, dailyCount]);

  // 일일 카운트 증가 및 저장
  const incrementDailyCount = useCallback(async () => {
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_AD_COUNT, newCount.toString());
    } catch (error) {
      console.error('Failed to save daily ad count:', error);
    }
  }, [dailyCount]);

  // 광고 표시 (빈도 기반)
  const showInterstitial = useCallback(() => {
    const newCount = actionCount + 1;
    setActionCount(newCount);

    // 빈도 조건 체크 (5번마다 1번)
    if (newCount % AD_CONFIG.INTERSTITIAL_FREQUENCY !== 0) {
      return false;
    }

    // 정책 조건 체크
    const { allowed, reason } = canShowAd();
    if (!allowed) {
      console.log(`[InterstitialAd] Blocked: ${reason}`);
      return false;
    }

    // 광고 표시
    lastAdTimeRef.current = Date.now();
    incrementDailyCount();
    setVisible(true);
    return true;
  }, [actionCount, canShowAd, incrementDailyCount]);

  // 강제 광고 표시 (정책 조건은 체크)
  const forceShowInterstitial = useCallback(() => {
    const { allowed, reason } = canShowAd();
    if (!allowed) {
      console.log(`[InterstitialAd] Force blocked: ${reason}`);
      return false;
    }

    lastAdTimeRef.current = Date.now();
    incrementDailyCount();
    setVisible(true);
    return true;
  }, [canShowAd, incrementDailyCount]);

  const hideInterstitial = useCallback(() => {
    setVisible(false);
  }, []);

  // 디버그 정보
  const getAdStatus = useCallback(() => {
    const timeSinceAppStart = Date.now() - appStartTimeRef.current;
    const timeSinceLastAd = lastAdTimeRef.current > 0 ? Date.now() - lastAdTimeRef.current : null;

    return {
      isPremium,
      isInitialized,
      actionCount,
      dailyCount,
      dailyLimit: AD_CONFIG.INTERSTITIAL_DAILY_LIMIT,
      timeSinceAppStart: Math.floor(timeSinceAppStart / 1000),
      initialDelayRemaining: Math.max(0, Math.floor((AD_CONFIG.INTERSTITIAL_INITIAL_DELAY_MS - timeSinceAppStart) / 1000)),
      timeSinceLastAd: timeSinceLastAd ? Math.floor(timeSinceLastAd / 1000) : null,
      cooldownRemaining: timeSinceLastAd
        ? Math.max(0, Math.floor((AD_CONFIG.INTERSTITIAL_COOLDOWN_MS - timeSinceLastAd) / 1000))
        : 0,
      canShow: canShowAd().allowed,
    };
  }, [isPremium, isInitialized, actionCount, dailyCount, canShowAd]);

  const InterstitialAdComponent = (
    <InterstitialAd visible={visible} onClose={hideInterstitial} />
  );

  return {
    showInterstitial,
    forceShowInterstitial,
    hideInterstitial,
    InterstitialAdComponent,
    actionCount,
    dailyCount,
    canShowAd,
    getAdStatus,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  testBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  testBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  adLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  adContent: {
    flex: 1,
    padding: 20,
  },
  adPlaceholder: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  adTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  adDescription: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  adInfo: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
  },
  adInfoLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  adInfoValue: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  bottomBar: {
    padding: 16,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 13,
  },
});

export default InterstitialAd;
