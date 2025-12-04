import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/LanguageContext';

interface HelpSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  items: { title: string; description: string }[];
  currentTheme: typeof theme;
}

function HelpSection({ icon, iconColor, title, items, currentTheme }: HelpSectionProps) {
  return (
    <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <RNText style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
          {title}
        </RNText>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.helpItem}>
          <RNText style={[styles.helpItemTitle, { color: currentTheme.colors.text }]}>
            {item.title}
          </RNText>
          <RNText style={[styles.helpItemDesc, { color: currentTheme.colors.textSecondary }]}>
            {item.description}
          </RNText>
        </View>
      ))}
    </View>
  );
}

interface TipItemProps {
  number: number;
  text: string;
  currentTheme: typeof theme;
}

function TipItem({ number, text, currentTheme }: TipItemProps) {
  return (
    <View style={styles.tipItem}>
      <View style={[styles.tipNumber, { backgroundColor: currentTheme.colors.primary }]}>
        <RNText style={styles.tipNumberText}>{number}</RNText>
      </View>
      <RNText style={[styles.tipText, { color: currentTheme.colors.text }]}>{text}</RNText>
    </View>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
  currentTheme: typeof theme;
}

function FAQItem({ question, answer, currentTheme }: FAQItemProps) {
  return (
    <View style={styles.faqItem}>
      <View style={styles.faqQuestion}>
        <Ionicons name="help-circle" size={20} color={currentTheme.colors.primary} />
        <RNText style={[styles.faqQuestionText, { color: currentTheme.colors.text }]}>
          {question}
        </RNText>
      </View>
      <RNText style={[styles.faqAnswer, { color: currentTheme.colors.textSecondary }]}>
        {answer}
      </RNText>
    </View>
  );
}

export default function HelpScreen({ navigation }: any) {
  const { theme: currentTheme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* 헤더 */}
      <LinearGradient
        colors={currentTheme.gradients.header as [string, string]}
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <RNText style={styles.headerTitle}>{t.help.title}</RNText>
            <RNText style={styles.headerSubtitle}>{t.help.subtitle}</RNText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 기본 사용법 */}
        <HelpSection
          icon="apps"
          iconColor="#4894FE"
          title={t.help.basics.title}
          items={[
            { title: t.help.basics.addTransaction, description: t.help.basics.addTransactionDesc },
            { title: t.help.basics.viewTransactions, description: t.help.basics.viewTransactionsDesc },
            { title: t.help.basics.categories, description: t.help.basics.categoriesDesc },
          ]}
          currentTheme={currentTheme}
        />

        {/* 데이터 관리 */}
        <HelpSection
          icon="cloud"
          iconColor="#00C48C"
          title={t.help.dataManagement.title}
          items={[
            { title: t.help.dataManagement.import, description: t.help.dataManagement.importDesc },
            { title: t.help.dataManagement.backup, description: t.help.dataManagement.backupDesc },
            { title: t.help.dataManagement.restore, description: t.help.dataManagement.restoreDesc },
          ]}
          currentTheme={currentTheme}
        />

        {/* 고급 기능 */}
        <HelpSection
          icon="settings"
          iconColor="#9C27B0"
          title={t.help.advanced.title}
          items={[
            { title: t.help.advanced.autoRules, description: t.help.advanced.autoRulesDesc },
            { title: t.help.advanced.receipt, description: t.help.advanced.receiptDesc },
            { title: t.help.advanced.darkMode, description: t.help.advanced.darkModeDesc },
          ]}
          currentTheme={currentTheme}
        />

        {/* 유용한 팁 */}
        <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FF962120' }]}>
              <Ionicons name="bulb" size={20} color="#FF9621" />
            </View>
            <RNText style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              {t.help.tips.title}
            </RNText>
          </View>
          <TipItem number={1} text={t.help.tips.tip1} currentTheme={currentTheme} />
          <TipItem number={2} text={t.help.tips.tip2} currentTheme={currentTheme} />
          <TipItem number={3} text={t.help.tips.tip3} currentTheme={currentTheme} />
          <TipItem number={4} text={t.help.tips.tip4} currentTheme={currentTheme} />
        </View>

        {/* FAQ */}
        <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F4433620' }]}>
              <Ionicons name="help-buoy" size={20} color="#F44336" />
            </View>
            <RNText style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              {t.help.faq.title}
            </RNText>
          </View>
          <FAQItem
            question={t.help.faq.q1}
            answer={t.help.faq.a1}
            currentTheme={currentTheme}
          />
          <FAQItem
            question={t.help.faq.q2}
            answer={t.help.faq.a2}
            currentTheme={currentTheme}
          />
          <FAQItem
            question={t.help.faq.q3}
            answer={t.help.faq.a3}
            currentTheme={currentTheme}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: theme.borderRadius.xxl,
    borderBottomRightRadius: theme.borderRadius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // 스크롤뷰
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // 섹션
  section: {
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  // 도움말 아이템
  helpItem: {
    marginBottom: 16,
  },
  helpItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  helpItemDesc: {
    fontSize: 14,
    lineHeight: 20,
  },

  // 팁
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // FAQ
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 28,
  },
});
