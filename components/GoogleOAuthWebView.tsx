// Google OAuth WebView 컴포넌트 - OAuth Playground 방식
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';

// OAuth Playground URL - 여기서 토큰을 발급받음
const OAUTH_PLAYGROUND_URL = 'https://developers.google.com/oauthplayground';

// 토큰 추출용 JavaScript
const INJECTED_JAVASCRIPT = `
(function() {
  function checkForToken() {
    // OAuth Playground의 access token textarea 찾기
    var tokenArea = document.querySelector('textarea#access_token');
    if (tokenArea && tokenArea.value) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'token',
        token: tokenArea.value
      }));
      return true;
    }

    // Step 2 완료 후 표시되는 토큰 영역 찾기
    var tokenDisplay = document.querySelector('.token-response');
    if (tokenDisplay) {
      var accessTokenMatch = tokenDisplay.textContent.match(/"access_token"\\s*:\\s*"([^"]+)"/);
      if (accessTokenMatch && accessTokenMatch[1]) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'token',
          token: accessTokenMatch[1]
        }));
        return true;
      }
    }

    return false;
  }

  // 주기적 체크
  setInterval(checkForToken, 1000);
})();
true;
`;

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
  const [tokenReceived, setTokenReceived] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // JavaScript에서 메시지 수신
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    if (tokenReceived) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'token' && data.token) {
        setTokenReceived(true);
        onSuccess(data.token);
        onClose();
      }
    } catch (e) {
      console.log('Message parse error:', e);
    }
  }, [tokenReceived, onSuccess, onClose]);

  // WebView 로드 완료
  const handleLoadEnd = () => {
    setLoading(false);
  };

  // WebView 로드 시작
  const handleLoadStart = () => {
    setLoading(true);
  };

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setTokenReceived(false);
    setLoading(true);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={handleClose}
          />
          <Text variant="titleMedium" style={styles.headerTitle}>
            Google Drive 연결
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* 안내 */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>토큰 발급 방법</Text>
          <Text style={styles.instruction}>1. 왼쪽 목록에서 "Drive API v3" 선택</Text>
          <Text style={styles.instruction}>2. "../drive.file"과 "../drive.appdata" 체크</Text>
          <Text style={styles.instruction}>3. "Authorize APIs" 클릭 → Google 로그인</Text>
          <Text style={styles.instruction}>4. "Exchange authorization code for tokens" 클릭</Text>
          <Text style={styles.instruction}>5. 토큰이 자동으로 감지되어 연결됩니다</Text>
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: OAUTH_PLAYGROUND_URL }}
            onMessage={handleMessage}
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
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
  instructionBox: {
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  instructionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
    fontSize: 14,
  },
  instruction: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 18,
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
