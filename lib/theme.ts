/**
 * Doctor Appointment - Consultation App UI Kit Theme
 *
 * Figma 파일: Doctor Appointment - Consultation App UI Kit | Case Study (Community)
 * URL: figma.com/design/E06gDZVKgjfteu9sHVUfZB
 *
 * 색상 팔레트 (Figma API에서 추출):
 * - Primary: 틸 블루 (#0B8FAC)
 * - Gradient: 민트 그린 (#7BC1B7 → #D2EBE7)
 * - Text Primary: 다크 (#222222)
 * - Background: 화이트 (#FFFFFF)
 * - Card: 화이트 (#FFFFFF)
 */

// 라이트 테마 색상
const lightColors = {
  // Primary (틸 블루 - Figma 추출 색상)
  primary: '#0B8FAC',
  primaryLight: '#7BC1B7',
  primaryDark: '#087A94',

  // Accent (민트 그린)
  accent: '#7BC1B7',
  accentLight: '#D2EBE7',

  // 배경색
  background: '#F8FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F5F4',

  // 텍스트
  text: '#222222',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textTertiary: '#B0B7C3',

  // 상태 색상
  income: '#10B981',      // 수입 - 에메랄드 그린
  expense: '#EF4444',     // 지출 - 레드
  warning: '#F59E0B',     // 경고 - 앰버
  info: '#0B8FAC',        // 정보 - 프라이머리

  // 구분선
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // 버튼
  buttonPrimary: '#0B8FAC',
  buttonSecondary: '#222222',
  buttonDisabled: '#9CA3AF',

  // 카드 그림자
  shadow: 'rgba(0, 0, 0, 0.08)',
};

// 다크 테마 색상
const darkColors = {
  // Primary (틸 블루 - 다크 모드용 밝기 조정)
  primary: '#0B8FAC',
  primaryLight: '#7BC1B7',
  primaryDark: '#087A94',

  // Accent (민트 그린)
  accent: '#7BC1B7',
  accentLight: '#D2EBE7',

  // 배경색 (다크)
  background: '#111827',
  surface: '#1F2937',
  surfaceVariant: '#374151',

  // 텍스트 (밝은 색상)
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textTertiary: '#6B7280',

  // 상태 색상 (다크 모드에서 더 밝게)
  income: '#34D399',      // 수입 - 에메랄드
  expense: '#F87171',     // 지출 - 밝은 빨강
  warning: '#FBBF24',     // 경고 - 앰버
  info: '#0B8FAC',        // 정보 - 프라이머리

  // 구분선 (다크)
  border: '#374151',
  divider: '#4B5563',

  // 버튼
  buttonPrimary: '#0B8FAC',
  buttonSecondary: '#F9FAFB',
  buttonDisabled: '#4B5563',

  // 카드 그림자
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export const theme = {
  // 메인 색상
  colors: {
    // Primary (틸 블루 - Figma 추출 색상)
    primary: '#0B8FAC',
    primaryLight: '#7BC1B7',
    primaryDark: '#087A94',

    // Accent (민트 그린)
    accent: '#7BC1B7',
    accentLight: '#D2EBE7',

    // 배경색
    background: '#F8FAFB',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F5F4',

    // 텍스트
    text: '#222222',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textTertiary: '#B0B7C3',

    // 상태 색상
    income: '#10B981',      // 수입 - 에메랄드 그린
    expense: '#EF4444',     // 지출 - 레드
    warning: '#F59E0B',     // 경고 - 앰버
    info: '#0B8FAC',        // 정보 - 프라이머리

    // 구분선
    border: '#E5E7EB',
    divider: '#F3F4F6',

    // 버튼
    buttonPrimary: '#0B8FAC',
    buttonSecondary: '#222222',
    buttonDisabled: '#9CA3AF',

    // 카드 그림자
    shadow: 'rgba(0, 0, 0, 0.08)',
  },

  // 그라데이션 (민트 그린 계열)
  gradients: {
    primary: ['#7BC1B7', '#0B8FAC'],
    header: ['#0B8FAC', '#087A94'],
    accent: ['#D2EBE7', '#7BC1B7'],
  },

  // 간격
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // 둥근 모서리 (Doctor Appointment 스타일)
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 30,
    full: 9999,
  },

  // 폰트 크기 (Satoshi/Poppins 스타일)
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },

  // 폰트 굵기
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // 그림자 (Doctor Appointment 스타일 - 부드러운 그림자)
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};

// 다크 테마용 그라데이션 (다크 모드용)
const darkGradients = {
  primary: ['#1F2937', '#1F2937'],
  header: ['#1F2937', '#111827'],
  accent: ['#374151', '#1F2937'],
};

// 테마 생성 함수
export function createTheme(isDark: boolean) {
  const colors = isDark ? darkColors : lightColors;
  const gradients = isDark ? darkGradients : theme.gradients;

  return {
    ...theme,
    colors: {
      ...theme.colors,
      ...colors,
    },
    gradients,
  };
}

// 라이트/다크 테마 객체
export const lightTheme = createTheme(false);
export const darkTheme = createTheme(true);

export type Theme = typeof theme;
export type ThemeColors = typeof lightColors;
export default theme;
