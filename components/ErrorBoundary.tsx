import React, { Component, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { logComponentError } from '../lib/error-tracker';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

/**
 * React Error Boundary
 * 컴포넌트 렌더링 중 발생하는 에러를 잡아서 상세 정보를 표시합니다.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // 에러 로그 기록
    logComponentError(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // 개발 모드에서 상세 로그 출력
    if (__DEV__) {
      console.error('🔴 Error Boundary Caught Error:', error);
      console.error('📍 Component Stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.errorTitle}>
                🔴 오류가 발생했습니다
              </Text>

              {this.state.error && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    에러 메시지:
                  </Text>
                  <ScrollView style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      {this.state.error.toString()}
                    </Text>
                  </ScrollView>
                </>
              )}

              {this.state.error?.stack && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Stack Trace:
                  </Text>
                  <ScrollView style={styles.errorBox}>
                    <Text style={styles.stackText}>
                      {this.state.error.stack}
                    </Text>
                  </ScrollView>
                </>
              )}

              {this.state.errorInfo?.componentStack && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Component Stack:
                  </Text>
                  <ScrollView style={styles.errorBox}>
                    <Text style={styles.stackText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </ScrollView>
                </>
              )}

              <Button mode="contained" onPress={this.handleReset} style={styles.resetButton}>다시 시도</Button>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#fff',
  },
  errorTitle: {
    color: '#ef4444',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  errorBox: {
    maxHeight: 150,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  stackText: {
    color: '#7f1d1d',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  resetButton: {
    marginTop: 24,
  },
});
