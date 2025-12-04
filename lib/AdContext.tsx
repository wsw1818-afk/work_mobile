import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AD_SETTINGS_KEY = '@gagyebu_ad_settings';

interface AdSettings {
  isPremium: boolean;
  showAds: boolean;
  purchaseDate?: string;
}

interface AdContextType {
  isPremium: boolean;
  showAds: boolean;
  setPremium: (value: boolean) => Promise<void>;
  setShowAds: (value: boolean) => Promise<void>;
  purchasePremium: () => Promise<void>;
  restorePurchase: () => Promise<boolean>;
}

const defaultSettings: AdSettings = {
  isPremium: false,
  showAds: false, // 개발자 테스트용: 광고 비활성화
};

const AdContext = createContext<AdContextType | undefined>(undefined);

interface AdProviderProps {
  children: ReactNode;
}

export function AdProvider({ children }: AdProviderProps) {
  const [settings, setSettings] = useState<AdSettings>(defaultSettings);

  // 앱 시작 시 설정 로드
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(AD_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AdSettings;
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error);
    }
  };

  const saveSettings = async (newSettings: AdSettings) => {
    try {
      await AsyncStorage.setItem(AD_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save ad settings:', error);
    }
  };

  const setPremium = async (value: boolean) => {
    const newSettings = {
      ...settings,
      isPremium: value,
      showAds: value ? false : settings.showAds,
      purchaseDate: value ? new Date().toISOString() : undefined,
    };
    await saveSettings(newSettings);
  };

  const setShowAds = async (value: boolean) => {
    if (!settings.isPremium) {
      const newSettings = { ...settings, showAds: value };
      await saveSettings(newSettings);
    }
  };

  // 프리미엄 구매 (실제 결제 로직은 추후 구현)
  const purchasePremium = async () => {
    // TODO: 실제 인앱 결제 로직 구현
    // Google Play Billing / Apple IAP 연동 필요
    await setPremium(true);
  };

  // 구매 복원
  const restorePurchase = async (): Promise<boolean> => {
    // TODO: 실제 구매 복원 로직 구현
    // Google Play Billing / Apple IAP에서 기존 구매 확인
    return settings.isPremium;
  };

  const value: AdContextType = {
    isPremium: settings.isPremium,
    showAds: settings.showAds,
    setPremium,
    setShowAds,
    purchasePremium,
    restorePurchase,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
}

export default AdContext;
