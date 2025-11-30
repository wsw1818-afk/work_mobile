// Google OAuth 인증 훅 - expo-auth-session 사용
import { useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 웹 브라우저 세션 완료 처리
WebBrowser.maybeCompleteAuthSession();

// Google OAuth 설정
// expo-auth-session의 Google provider 사용
const GOOGLE_CLIENT_ID = '407408718192.apps.googleusercontent.com'; // Google OAuth Playground Client ID
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'gagyebu',
  path: 'oauth2redirect/google',
});

// Google Drive 접근 권한
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

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

  // OAuth Discovery 문서
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

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

  // 로그인 함수
  const login = useCallback(async () => {
    if (!discovery) {
      console.error('OAuth discovery 문서를 로드할 수 없습니다');
      return;
    }

    try {
      setIsLoading(true);

      // Auth Request 생성 (Implicit Grant)
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false,
      });

      // 인증 시작
      const result = await request.promptAsync(discovery);

      console.log('Auth result type:', result.type);
      console.log('Auth result:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.authentication) {
        const { accessToken: newToken, expiresIn } = result.authentication;
        if (newToken) {
          setAccessToken(newToken);
          setIsLoggedIn(true);
          await saveToken(newToken, expiresIn || 3600);
        }
      } else if (result.type === 'error') {
        console.error('인증 오류:', result.error);
      }
    } catch (error) {
      console.error('로그인 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [discovery]);

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
