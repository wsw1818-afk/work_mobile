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
import { AdProvider, useAds } from './lib/AdContext';
import { TransactionProvider } from './lib/TransactionContext';
import { LanguageProvider, useLanguage } from './lib/LanguageContext';
import { AdBanner, AD_BANNER_HEIGHT } from './components/AdBanner';

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
import HelpScreen from './screens/HelpScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// 커스텀 드로어 컨텐츠 (Dokterian 스타일)
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme: currentTheme, isDark } = useTheme();
  const { t } = useLanguage();

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
        <Text style={styles.drawerTitle}>{t.app.name}</Text>
        <Text style={styles.drawerSubtitle}>{t.app.subtitle}</Text>
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
  const { showAds, isPremium } = useAds();
  const { t } = useLanguage();

  // 광고 표시 여부
  const shouldShowAd = showAds && !isPremium;

  // tabBarStyle을 useMemo로 메모이제이션 (광고 높이 제외)
  const tabBarStyle = React.useMemo(() => ({
    ...styles.tabBar,
    backgroundColor: currentTheme.colors.surface,
    height: 60 + insets.bottom,
    paddingBottom: insets.bottom + 6,
  }), [insets.bottom, currentTheme.colors.surface]);

  return (
    <View style={{ flex: 1 }}>
      {/* 메인 콘텐츠 영역 - 광고 높이만큼 하단 여백 */}
      <View style={{ flex: 1, marginBottom: shouldShowAd ? AD_BANNER_HEIGHT : 0 }}>
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
            options={{ title: t.nav.dashboard }}
          />
          <Tab.Screen
            name="Add"
            component={AddTransactionScreen}
            options={{
              title: t.nav.add,
              tabBarLabel: () => null, // Add 버튼은 라벨 숨김
            }}
          />
          <Tab.Screen
            name="Transactions"
            component={TransactionsScreen}
            options={{ title: t.nav.transactions }}
          />
          <Tab.Screen
            name="Categories"
            component={CategoriesScreen}
            options={{ title: t.nav.categories }}
          />
        </Tab.Navigator>
      </View>

      {/* 광고 배너 - 화면 최하단에 고정 */}
      {shouldShowAd && (
        <View style={[
          styles.adBannerContainer,
          {
            bottom: 0,
            paddingBottom: insets.bottom,
            backgroundColor: currentTheme.colors.surface,
          }
        ]}>
          <AdBanner />
        </View>
      )}
    </View>
  );
}

// 앱 내부 콘텐츠 (ThemeProvider 내부에서 사용)
function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const { theme: currentTheme, isDark } = useTheme();
  const { t } = useLanguage();

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
        <Text style={[styles.loadingText, { color: currentTheme.colors.text }]}>{t.app.name}</Text>
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
              title: t.nav.home,
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
              title: t.nav.budgets,
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
              title: t.nav.bankAccounts,
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
              title: t.nav.rules,
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
              title: t.nav.receipt,
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
              title: t.nav.import,
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
              title: t.nav.settings,
              headerShown: false,
              drawerIcon: ({ color, size }) => (
                <Ionicons name="settings" size={size} color={color} />
              ),
            }}
          />

          {/* 도움말 - 드로어에는 표시하지 않고 설정에서 접근 */}
          <Drawer.Screen
            name="Help"
            component={HelpScreen}
            options={{
              title: t.help.title,
              headerShown: false,
              drawerItemStyle: { display: 'none' }, // 드로어 메뉴에서 숨김
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
      <LanguageProvider>
        <ThemeProvider>
          <AdProvider>
            <TransactionProvider>
              <AppContent />
            </TransactionProvider>
          </AdProvider>
        </ThemeProvider>
      </LanguageProvider>
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

  // 광고 배너 컨테이너
  adBannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
