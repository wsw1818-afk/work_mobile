/**
 * 에러 추적 및 로깅 시스템
 * React Native에서 발생하는 모든 에러를 상세하게 추적합니다.
 */

import { LogBox } from 'react-native';

// 에러 로그 저장소
export const errorLogs: Array<{
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  componentStack?: string;
  metadata?: any;
}> = [];

/**
 * 에러 로그 추가
 */
export function logError(
  type: 'error' | 'warning' | 'info',
  message: string,
  metadata?: any
) {
  const log = {
    timestamp: new Date().toISOString(),
    type,
    message,
    stack: new Error().stack,
    metadata,
  };

  errorLogs.push(log);

  // 콘솔에도 출력 (개발 모드)
  if (__DEV__) {
    const prefix = type === 'error' ? '[ERROR]' : type === 'warning' ? '[WARN]' : '[INFO]';
    console.log(`\n${prefix} [${log.timestamp}] ${message}`);
    if (metadata) {
      console.log('Metadata:', metadata);
    }
    if (log.stack) {
      console.log('Stack:', log.stack);
    }
  }
}

/**
 * 전역 에러 핸들러 설정
 */
export function setupGlobalErrorHandler() {
  // 기존 에러 핸들러 저장
  const originalErrorHandler = global.ErrorUtils.getGlobalHandler();

  // 새로운 에러 핸들러 설정
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    logError(
      'error',
      `Global Error (Fatal: ${isFatal}): ${error.message}`,
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        isFatal,
      }
    );

    // 원래 핸들러 호출
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });

  // Console 오버라이드 임시 비활성화 (디버깅용)
  // TODO: 텍스트 렌더링 에러 해결 후 다시 활성화

  // const originalConsoleError = console.error;
  // console.error = (...args) => {
  //   try {
  //     const message = args.map(arg => {
  //       if (typeof arg === 'string') return arg;
  //       if (arg instanceof Error) return arg.message;
  //       try {
  //         return JSON.stringify(arg);
  //       } catch {
  //         return String(arg);
  //       }
  //     }).join(' ');
  //     logError('error', message, { args });
  //   } catch (e) {
  //     // 에러 로깅 중 에러 발생 시 무시
  //   }
  //   originalConsoleError(...args);
  // };

  // const originalConsoleWarn = console.warn;
  // console.warn = (...args) => {
  //   try {
  //     const message = args.map(arg => {
  //       if (typeof arg === 'string') return arg;
  //       if (arg instanceof Error) return arg.message;
  //       try {
  //         return JSON.stringify(arg);
  //       } catch {
  //         return String(arg);
  //       }
  //     }).join(' ');
  //     logError('warning', message, { args });
  //   } catch (e) {
  //     // 경고 로깅 중 에러 발생 시 무시
  //   }
  //   originalConsoleWarn(...args);
  // };
}

/**
 * React Error Boundary용 에러 로거
 */
export function logComponentError(error: Error, errorInfo: { componentStack: string }) {
  logError('error', `Component Error: ${error.message}`, {
    name: error.name,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });
}

/**
 * 에러 로그 내보내기 (문자열)
 */
export function exportErrorLogs(): string {
  return JSON.stringify(errorLogs, null, 2);
}

/**
 * 에러 로그 초기화
 */
export function clearErrorLogs() {
  errorLogs.length = 0;
}

/**
 * 특정 패턴의 경고 무시 설정
 */
export function ignoreWarnings(patterns: string[]) {
  LogBox.ignoreLogs(patterns);
}
