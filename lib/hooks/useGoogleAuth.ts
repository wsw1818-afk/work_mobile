// Google OAuth 인증 훅 - expo-auth-session/providers/google 사용
import { useState, useEffect, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 웹 브라우저 세션 완료 처리
WebBrowser.maybeCompleteAuthSession();

// Google OAuth 클라이언트 ID (Google Cloud Console에서 발급)
// Android 앱용 클라이언트 ID (패키지명 + SHA-1으로 생성)
const ANDROID_CLIENT_ID = '584528500804-dh7chsh5j60mv495e55cor4bdrom60ib.apps.googleusercontent.com';
// Web 클라이언트 ID (리디렉션 URI 필요)
const WEB_CLIENT_ID = '584528500804-tm95893irb80pjit981hhu87k9vphnet.apps.googleusercontent.com';

// 토큰 저장 키
const TOKEN_STORAGE_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

interface GoogleAuthResult {
  isLoggedIn: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

export function useGoogleAuth(): GoogleAuthResult {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Google Auth Request 설정
  // Google Drive 접근 권한 포함
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata',
    ],
  });

  // 저장된 토큰 로드
  useEffect(() => {
    loadStoredToken();
  }, []);

  // 인증 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        console.log('Google 로그인 성공!');
        setAccessToken(authentication.accessToken);
        setIsLoggedIn(true);
        saveToken(authentication.accessToken, authentication.expiresIn || 3600);
      }
    } else if (response?.type === 'error') {
      console.error('Google 인증 오류:', response.error);
    }

    if (response) {
      setIsLoading(false);
    }
  }, [response]);

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

  // 로그인 함수
  const login = useCallback(async () => {
    if (!request) {
      console.error('Google Auth Request가 준비되지 않았습니다');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Google 로그인 시작...');
      await promptAsync();
      // 응답은 useEffect에서 처리됨
    } catch (error) {
      console.error('로그인 오류:', error);
      setIsLoading(false);
    }
  }, [request, promptAsync]);

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
    login,
    logout,
    refreshToken,
  };
}
