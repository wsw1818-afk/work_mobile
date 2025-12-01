/**
 * Dokterian - Doctor Appointment Mobile App Theme (Figma API 기반 정확한 색상)
 *
 * Figma 파일: Dokterian - Doctor Appointment Mobile App (Community)
 *
 * 색상 팔레트 (Figma에서 추출):
 * - Primary: 스카이블루 (#1FB9FC)
 * - Accent: 핑크 (#DD3E7B)
 * - Text Primary: 다크네이비 (#22315B)
 * - Text Secondary: 연보라 (#8C99BE)
 * - Background: 연한 회색 (#F5F5F5)
 * - Card: 흰색 (#FFFFFF)
 */

export const theme = {
  // 메인 색상
  colors: {
    // Primary (스카이블루 - Figma 정확한 색상)
    primary: '#1FB9FC',
    primaryLight: '#5CCFFF',
    primaryDark: '#0A9FE0',

    // Accent (핑크)
    accent: '#DD3E7B',
    accentLight: '#E96A99',

    // 배경색
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F8F9FC',

    // 텍스트 (다크네이비)
    text: '#22315B',
    textSecondary: '#8C99BE',
    textMuted: '#B8C0D9',

    // 상태 색상
    income: '#2ED573',      // 수입 - 밝은 녹색
    expense: '#FF6B6B',     // 지출 - 밝은 빨강
    warning: '#FFBE21',     // 경고 - 노랑
    info: '#1FB9FC',        // 정보 - 프라이머리

    // 구분선
    border: '#E8ECF4',
    divider: '#F0F3F8',

    // 버튼
    buttonPrimary: '#1FB9FC',
    buttonSecondary: '#22315B',
    buttonDisabled: '#B8C0D9',

    // 카드 그림자
    shadow: 'rgba(34, 49, 91, 0.1)',
  },

  // 그라데이션
  gradients: {
    primary: ['#5CCFFF', '#1FB9FC'],
    header: ['#1FB9FC', '#0A9FE0'],
    accent: ['#E96A99', '#DD3E7B'],
  },

  // 간격
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // 둥근 모서리 (Dokterian: 부드러운 라운드)
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },

  // 폰트 크기 (Nunito 스타일)
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },

  // 폰트 굵기 (Nunito Bold, ExtraBold)
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // 그림자 (Dokterian 스타일 - 부드러운 그림자)
  shadows: {
    sm: {
      shadowColor: '#22315B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#22315B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    lg: {
      shadowColor: '#22315B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
export default theme;
