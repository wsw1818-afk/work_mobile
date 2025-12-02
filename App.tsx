import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { View, ActivityIndicator, LogBox, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from './lib/db/database';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupGlobalErrorHandler, ignoreWarnings } from './lib/error-tracker';
import { theme } from './lib/theme';
import { ThemeProvider, useTheme } from './lib/ThemeContext';

// LogBox 완전 비활성화 (디버깅용)
LogBox.ignoreAllLogs(true);

// Screens
import DashboardScreen from './screens/DashboardScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import BankAccountsScreen from './screens/BankAccountsScreen';
// AccountsScreen 제거됨 - 통장관리로 통합
// RecurringScreen 제거됨 - 미완성 기능
import RulesScreen from './screens/RulesScreen';
import SettingsScreen from './screens/SettingsScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import ImportScreen from './screens/ImportScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// 커스텀 드로어 컨텐츠 (Dokterian 스타일)
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme: currentTheme, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <LinearGradient
        colors={currentTheme.gradients.header as [string, string]}
        style={styles.drawerHeader}
      >
        <View style={styles.drawerLogoContainer}>
          <View style={[styles.drawerLogo, { backgroundColor: currentTheme.colors.surface }]}>
            <Ionicons name="wallet" size={32} color={currentTheme.colors.primary} />
          </View>
        </View>
        <Text style={styles.drawerTitle}>가계부</Text>
        <Text style={styles.drawerSubtitle}>개인 재정 관리</Text>
      </LinearGradient>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
        style={{ backgroundColor: currentTheme.colors.background }}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    </View>
  );
}

// 탭 아이콘 렌더링 함수 (메모이제이션용)
const getTabBarIcon = (route: { name: string }, focused: boolean, color: string, size: number) => {
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

  // Add 탭은 특별한 스타일 적용
  if (route.name === 'Add') {
    return (
      <View style={focused ? styles.addButtonActive : styles.addButton}>
        <Ionicons name={iconName} size={28} color={focused ? '#fff' : theme.colors.primary} />
      </View>
    );
  }

  return <Ionicons name={iconName} size={size} color={color} />;
};

// 하단 탭 네비게이터 (메인 화면들)
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { theme: currentTheme, isDark } = useTheme();

  // tabBarStyle을 useMemo로 메모이제이션
  const tabBarStyle = React.useMemo(() => ({
    ...styles.tabBar,
    backgroundColor: currentTheme.colors.surface,
    height: 60 + insets.bottom,
    paddingBottom: insets.bottom + 6,
  }), [insets.bottom, currentTheme.colors.surface]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => getTabBarIcon(route, focused, color, size),
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: currentTheme.colors.textSecondary,
        tabBarStyle,
        tabBarLabelStyle: styles.tabBarLabel,
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
        options={{
          title: '추가',
          tabBarLabel: () => null, // Add 버튼은 라벨 숨김
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: '거래내역' }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: '카테고리' }}
      />
    </Tab.Navigator>
  );
}

// 앱 내부 콘텐츠 (ThemeProvider 내부에서 사용)
function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const { theme: currentTheme, isDark } = useTheme();

  // React Native Paper 테마 설정
  const paperTheme = React.useMemo(() => {
    const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: currentTheme.colors.primary,
        background: currentTheme.colors.background,
        surface: currentTheme.colors.surface,
        onSurface: currentTheme.colors.text,
        onBackground: currentTheme.colors.text,
      },
    };
  }, [isDark, currentTheme]);

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
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
        <View style={[styles.loadingLogo, { backgroundColor: currentTheme.colors.surface }]}>
          <Ionicons name="wallet" size={48} color={currentTheme.colors.primary} />
        </View>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 20 }} />
        <Text style={[styles.loadingText, { color: currentTheme.colors.text }]}>가계부</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <Drawer.Navigator
          initialRouteName="Main"
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerStyle: {
              backgroundColor: currentTheme.colors.primary,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            drawerActiveTintColor: currentTheme.colors.primary,
            drawerInactiveTintColor: currentTheme.colors.textSecondary,
            drawerActiveBackgroundColor: `${currentTheme.colors.primary}15`,
            drawerStyle: {
              backgroundColor: currentTheme.colors.background,
            },
            drawerLabelStyle: {
              marginLeft: 0,
              fontSize: 15,
              fontWeight: '500',
            },
            drawerItemStyle: {
              borderRadius: 12,
              marginHorizontal: 8,
              paddingVertical: 2,
            },
          }}
        >
          {/* 메인 화면 (하단 탭) */}
          <Drawer.Screen
            name="Main"
            component={MainTabs}
            options={{
              title: '가계부',
              headerShown: false,
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
              headerShown: false,
              drawerIcon: ({ color, size }) => (
                <Ionicons name="pie-chart" size={size} color={color} />
              ),
            }}
          />

          {/* 통장/결제수단 관리 */}
          <Drawer.Screen
            name="BankAccounts"
            component={BankAccountsScreen}
            options={{
              title: '통장/결제수단',
              headerShown: false,
              drawerIcon: ({ color, size }) => (
                <Ionicons name="wallet" size={size} color={color} />
              ),
            }}
          />

          {/* 자동 분류 규칙 */}
          <Drawer.Screen
            name="Rules"
            component={RulesScreen}
            options={{
              title: '자동 분류 규칙',
              headerShown: false,
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
              headerShown: false,
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
              headerShown: false,
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
              headerShown: false,
              drawerIcon: ({ color, size }) => (
                <Ionicons name="settings" size={size} color={color} />
              ),
            }}
          />

        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// 메인 App 컴포넌트
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Dokterian 스타일 StyleSheet
const styles = StyleSheet.create({
  // 로딩 화면
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },

  // 탭바 (높이와 paddingBottom은 useSafeAreaInsets로 동적 적용)
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Add 버튼 (중앙 플로팅 스타일)
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  addButtonActive: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },

  // 드로어 헤더
  drawerHeader: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  drawerLogoContainer: {
    marginBottom: 16,
  },
  drawerLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  drawerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});
