import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * 거래 데이터 실시간 동기화 Context
 *
 * 거래 추가/수정/삭제 시 모든 화면에서 실시간으로 데이터를 반영합니다.
 * - DashboardScreen: 월별 요약, 최근 거래
 * - TransactionsScreen: 거래 목록
 * - AddTransactionScreen: 거래 추가 후 알림
 */

interface TransactionContextType {
  // 마지막 업데이트 타임스탬프 (변경 감지용)
  lastUpdate: number;
  // 데이터 새로고침 트리거
  refreshData: () => void;
  // 거래 추가됨 알림
  notifyTransactionAdded: () => void;
  // 거래 삭제됨 알림
  notifyTransactionDeleted: () => void;
  // 거래 수정됨 알림
  notifyTransactionUpdated: () => void;
  // 카테고리 변경 알림
  notifyCategoryChanged: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // 데이터 새로고침 트리거
  const refreshData = useCallback(() => {
    setLastUpdate(Date.now());
  }, []);

  // 거래 추가됨
  const notifyTransactionAdded = useCallback(() => {
    console.log('[TransactionContext] Transaction added');
    setLastUpdate(Date.now());
  }, []);

  // 거래 삭제됨
  const notifyTransactionDeleted = useCallback(() => {
    console.log('[TransactionContext] Transaction deleted');
    setLastUpdate(Date.now());
  }, []);

  // 거래 수정됨
  const notifyTransactionUpdated = useCallback(() => {
    console.log('[TransactionContext] Transaction updated');
    setLastUpdate(Date.now());
  }, []);

  // 카테고리 변경됨
  const notifyCategoryChanged = useCallback(() => {
    console.log('[TransactionContext] Category changed');
    setLastUpdate(Date.now());
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        lastUpdate,
        refreshData,
        notifyTransactionAdded,
        notifyTransactionDeleted,
        notifyTransactionUpdated,
        notifyCategoryChanged,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
}

export default TransactionContext;
