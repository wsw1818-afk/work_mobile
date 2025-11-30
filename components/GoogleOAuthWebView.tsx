// Google OAuth WebView 컴포넌트
import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { WebView, WebViewNavigation } from 'react-native-webview';

// Google OAuth 설정
// 주의: 실제 앱에서는 Google Cloud Console에서 OAuth 클라이언트 ID를 발급받아야 합니다.
// 현재는 OAuth Playground의 클라이언트 ID를 사용합니다.
const GOOGLE_CLIENT_ID = '407408718192.apps.googleusercontent.com'; // OAuth Playground 클라이언트 ID
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

interface GoogleOAuthWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (accessToken: string) => void;
  onError: (error: string) => void;
}

export default function GoogleOAuthWebView({
  visible,
  onClose,
  onSuccess,
  onError,
}: GoogleOAuthWebViewProps) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // OAuth 인증 URL 생성
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&include_granted_scopes=true` +
    `&prompt=consent`;

  // URL 변경 감지하여 토큰 추출
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;

    // 리다이렉트 URL에서 액세스 토큰 추출
    if (url.includes('#access_token=')) {
      const tokenMatch = url.match(/access_token=([^&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        const accessToken = decodeURIComponent(tokenMatch[1]);
        onSuccess(accessToken);
        onClose();
      }
    }

    // 에러 처리
    if (url.includes('error=')) {
      const errorMatch = url.match(/error=([^&]+)/);
      const errorDesc = url.match(/error_description=([^&]+)/);
      const errorMessage = errorDesc
        ? decodeURIComponent(errorDesc[1].replace(/\+/g, ' '))
        : errorMatch
          ? decodeURIComponent(errorMatch[1])
          : '인증 오류가 발생했습니다.';
      onError(errorMessage);
      onClose();
    }
  };

  // WebView 로드 완료
  const handleLoadEnd = () => {
    setLoading(false);
  };

  // WebView 로드 시작
  const handleLoadStart = () => {
    setLoading(true);
  };

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
            source={{ uri: authUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            style={styles.webView}
          />

          {/* 로딩 인디케이터 */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>로딩 중...</Text>
            </View>
          )}
        </View>

        {/* 하단 안내 */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Google 계정으로 로그인하면 Google Drive에 백업할 수 있습니다.
          </Text>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6366f1',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
  },
});
