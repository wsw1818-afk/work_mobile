import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { useAds } from '../lib/AdContext';
import { ADMOB_IDS, AD_CONFIG } from '../lib/adConfig';

// 광고 배너 높이 상수
export const AD_BANNER_HEIGHT = 50;

interface AdBannerProps {
  style?: object;
}

export function AdBanner({ style }: AdBannerProps) {
  const { theme: currentTheme } = useTheme();
  const { showAds, isPremium, purchasePremium } = useAds();
  const [adLoaded, setAdLoaded] = useState(false);

  // 현재 플랫폼에 맞는 광고 ID
  const bannerId = Platform.OS === 'ios'
    ? ADMOB_IDS.IOS_BANNER
    : ADMOB_IDS.ANDROID_BANNER;

  // 테스트 모드 표시 (개발 중에만)
  const isTestMode = bannerId.includes('3940256099942544');

  useEffect(() => {
    // 광고 로드 시뮬레이션 (실제 SDK 연동 시 제거)
    const timer = setTimeout(() => setAdLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // 프리미엄 사용자거나 광고 표시 안 함이면 렌더링하지 않음
  if (isPremium || !showAds) {
    return null;
  }

  const handlePremiumPress = () => {
    Alert.alert(
      '광고 제거',
      `${AD_CONFIG.PREMIUM_PRICE_DISPLAY}에 프리미엄으로 업그레이드하면 모든 광고가 제거됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매하기',
          onPress: async () => {
            // TODO: 실제 인앱 결제 로직
            await purchasePremium();
            Alert.alert('완료', '프리미엄으로 업그레이드되었습니다!');
          }
        },
      ]
    );
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: currentTheme.colors.surface },
      style
    ]}>
      <View style={[styles.adContent, { borderColor: currentTheme.colors.border }]}>
        {/* 광고 영역 - 실제 AdMob SDK 연동 시 BannerAd로 교체 */}
        <View style={styles.adPlaceholder}>
          {isTestMode && (
            <View style={styles.testBadge}>
              <Text style={styles.testBadgeText}>TEST</Text>
            </View>
          )}
          <Ionicons
            name="megaphone-outline"
            size={18}
            color={currentTheme.colors.textMuted}
          />
          <Text style={[styles.adText, { color: currentTheme.colors.textSecondary }]}>
            {adLoaded ? 'Google AdMob 광고' : '광고 로딩 중...'}
          </Text>
        </View>

        {/* 프리미엄 업그레이드 버튼 */}
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={handlePremiumPress}
        >
          <Text style={styles.upgradeText}>광고 제거</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: AD_BANNER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%',
    borderTopWidth: 1,
  },
  adPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  adText: {
    fontSize: 13,
    fontWeight: '500',
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdBanner;
