// Google OAuth 인증 훅 - WebView 기반 직접 로그인
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 토큰 저장 키
const TOKEN_STORAGE_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

interface GoogleAuthResult {
  isLoggedIn: boolean;
  isLoading: boolean;
  accessToken: string | null;
  showWebView: boolean;
  openLoginWebView: () => void;
  closeLoginWebView: () => void;
  handleTokenReceived: (token: string, expiresIn?: number) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

export function useGoogleAuth(): GoogleAuthResult {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);

  // 저장된 토큰 로드
  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const expiry = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);

      if (token && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          setAccessToken(token);
          setIsLoggedIn(true);
        } else {
          // 토큰 만료됨
          await clearStoredToken();
        }
      }
    } catch (error) {
      console.error('토큰 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToken = async (token: string, expiresIn: number) => {
    try {
      const expiryTime = Date.now() + (expiresIn * 1000);
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('토큰 저장 오류:', error);
    }
  };

  const clearStoredToken = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('토큰 삭제 오류:', error);
    }
  };

  // WebView 로그인 열기
  const openLoginWebView = useCallback(() => {
    setShowWebView(true);
  }, []);

  // WebView 로그인 닫기
  const closeLoginWebView = useCallback(() => {
    setShowWebView(false);
  }, []);

  // 토큰 수신 처리 (WebView에서 호출)
  const handleTokenReceived = useCallback(async (token: string, expiresIn: number = 3600) => {
    console.log('Google 로그인 성공!');
    setAccessToken(token);
    setIsLoggedIn(true);
    await saveToken(token, expiresIn);
    setShowWebView(false);
  }, []);

  // 로그아웃 함수
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await clearStoredToken();
      setAccessToken(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 토큰 갱신 (현재 토큰 반환 또는 재로그인 필요)
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);

    if (token && expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        return token;
      }
    }

    // 토큰이 없거나 만료됨 - 재로그인 필요
    return null;
  }, []);

  return {
    isLoggedIn,
    isLoading,
    accessToken,
    showWebView,
    openLoginWebView,
    closeLoginWebView,
    handleTokenReceived,
    logout,
    refreshToken,
  };
}
