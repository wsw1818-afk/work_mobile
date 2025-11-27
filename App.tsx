import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from './lib/db/database';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupGlobalErrorHandler, ignoreWarnings } from './lib/error-tracker';

// LogBox 완전 비활성화 (디버깅용)
LogBox.ignoreAllLogs(true);

// Screens
import DashboardScreen from './screens/DashboardScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import BankAccountsScreen from './screens/BankAccountsScreen';
import AccountsScreen from './screens/AccountsScreen';
import RecurringScreen from './screens/RecurringScreen';
import RulesScreen from './screens/RulesScreen';
import SettingsScreen from './screens/SettingsScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import ImportScreen from './screens/ImportScreen';
import ErrorLogsScreen from './screens/ErrorLogsScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// 하단 탭 네비게이터 (메인 화면들)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Add') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'grid' : 'grid-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '대시보드' }}
      />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{ title: '거래 추가' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: '거래 내역' }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: '카테고리' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 전역 에러 핸들러 설정
    setupGlobalErrorHandler();

    // 무시할 경고 설정 (원하는 경고 패턴 추가 가능)
    ignoreWarnings([
      'Non-serializable values were found in the navigation state',
    ]);

    // 데이터베이스 초기화
    const initializeApp = async () => {
      try {
        await database.init();
        setIsReady(true);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setIsReady(true); // 에러가 있어도 앱은 실행되도록
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider>
        <NavigationContainer>
          <Drawer.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6366f1',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            drawerActiveTintColor: '#6366f1',
            drawerInactiveTintColor: '#666',
          }}
        >
          {/* 메인 화면 (하단 탭) */}
          <Drawer.Screen
            name="Main"
            component={MainTabs}
            options={{
              title: '가계부',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }}
          />

          {/* 예산 관리 */}
          <Drawer.Screen
            name="Budgets"
            component={BudgetsScreen}
            options={{
              title: '예산 관리',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="wallet" size={size} color={color} />
              ),
            }}
          />

          {/* 통장 관리 */}
          <Drawer.Screen
            name="BankAccounts"
            component={BankAccountsScreen}
            options={{
              title: '통장 관리',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="business" size={size} color={color} />
              ),
            }}
          />

          {/* 계좌 관리 */}
          <Drawer.Screen
            name="Accounts"
            component={AccountsScreen}
            options={{
              title: '계좌 관리',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="card" size={size} color={color} />
              ),
            }}
          />

          {/* 반복 거래 */}
          <Drawer.Screen
            name="Recurring"
            component={RecurringScreen}
            options={{
              title: '반복 거래',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="repeat" size={size} color={color} />
              ),
            }}
          />

          {/* 자동 분류 규칙 */}
          <Drawer.Screen
            name="Rules"
            component={RulesScreen}
            options={{
              title: '자동 분류 규칙',
              drawerIcon: ({ color, size}) => (
                <Ionicons name="filter" size={size} color={color} />
              ),
            }}
          />

          {/* 영수증 스캔 */}
          <Drawer.Screen
            name="Receipt"
            component={ReceiptScreen}
            options={{
              title: '영수증 스캔',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="camera" size={size} color={color} />
              ),
            }}
          />

          {/* 거래 가져오기 */}
          <Drawer.Screen
            name="Import"
            component={ImportScreen}
            options={{
              title: '거래 가져오기',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="document" size={size} color={color} />
              ),
            }}
          />

          {/* 설정 */}
          <Drawer.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: '설정',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="settings" size={size} color={color} />
              ),
            }}
          />

          {/* 에러 로그 (개발용) */}
          {__DEV__ && (
            <Drawer.Screen
              name="ErrorLogs"
              component={ErrorLogsScreen}
              options={{
                title: '🐛 에러 로그',
                drawerIcon: ({ color, size }) => (
                  <Ionicons name="bug" size={size} color={color} />
                ),
              }}
            />
          )}
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
    </ErrorBoundary>
  );
}
