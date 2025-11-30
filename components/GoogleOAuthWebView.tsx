// Google OAuth WebView 컴포넌트 - 직접 Google 로그인
import React, { useRef, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { WebView, WebViewNavigation } from 'react-native-webview';

// Google Cloud Console에서 발급받은 Web 클라이언트 ID
const GOOGLE_CLIENT_ID = '584528500804-tm95893irb80pjit981hhu87k9vphnet.apps.googleusercontent.com';

// Google Drive 접근 권한
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

// 리디렉션 URI (localhost 사용 - 앱 내에서 처리)
const REDIRECT_URI = 'http://localhost';

// Google OAuth URL 생성
const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

interface GoogleOAuthWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (accessToken: string, expiresIn?: number) => void;
  onError: (error: string) => void;
}

export default function GoogleOAuthWebView({
  visible,
  onClose,
  onSuccess,
  onError,
}: GoogleOAuthWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  // URL 변경 감지 - 토큰 추출
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    const { url } = navState;

    // localhost로 리디렉션되면 토큰 추출
    if (url.startsWith(REDIRECT_URI)) {
      // URL fragment에서 access_token 추출
      // 예: http://localhost#access_token=xxx&token_type=Bearer&expires_in=3600
      const hashParams = url.split('#')[1];
      if (hashParams) {
        const params = new URLSearchParams(hashParams);
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const error = params.get('error');

        if (accessToken) {
          console.log('Google 토큰 획득 성공!');
          onSuccess(accessToken, expiresIn ? parseInt(expiresIn, 10) : 3600);
          onClose();
        } else if (error) {
          console.error('OAuth 오류:', error);
          onError(error);
          onClose();
        }
      }
    }
  }, [onSuccess, onError, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
          />
          <Text variant="titleMedium" style={styles.headerTitle}>
            Google 로그인
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: getGoogleAuthUrl() }}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            style={styles.webView}
            userAgent="Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerRight: {
    width: 48,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
