/**
 * Google AdMob 광고 설정
 *
 * 테스트 광고 ID (Google 공식 테스트 ID)
 * - 개발/테스트 중에는 반드시 테스트 ID를 사용해야 합니다.
 * - 실제 광고 ID로 테스트하면 계정이 정지될 수 있습니다.
 *
 * 배포 시 주의사항:
 * 1. 아래 테스트 ID를 실제 AdMob 광고 단위 ID로 교체
 * 2. app.json에 AdMob 앱 ID 추가 필요
 * 3. Android: android/app/src/main/AndroidManifest.xml에 메타데이터 추가
 */

// Google AdMob 공식 테스트 광고 ID
export const ADMOB_TEST_IDS = {
  // 앱 ID (테스트용)
  ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  IOS_APP_ID: 'ca-app-pub-3940256099942544~1458002511',

  // 배너 광고 (테스트용)
  ANDROID_BANNER: 'ca-app-pub-3940256099942544/6300978111',
  IOS_BANNER: 'ca-app-pub-3940256099942544/2934735716',

  // 전면 광고 (테스트용) - 추후 사용
  ANDROID_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  IOS_INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',

  // 보상형 광고 (테스트용) - 추후 사용
  ANDROID_REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  IOS_REWARDED: 'ca-app-pub-3940256099942544/1712485313',
};

// 실제 광고 ID (가계부 앱용 - AdMob 콘솔에서 생성)
export const ADMOB_PRODUCTION_IDS = {
  // 가계부 앱 App ID
  ANDROID_APP_ID: 'ca-app-pub-8246259258904809~1663711660',
  IOS_APP_ID: 'ca-app-pub-8246259258904809~1663711660', // iOS도 동일하게 설정 (iOS 미사용시)

  // 배너 광고 (현재 미사용 - 필요시 AdMob에서 생성)
  ANDROID_BANNER: 'ca-app-pub-3940256099942544/6300978111', // 테스트 ID 유지
  IOS_BANNER: 'ca-app-pub-3940256099942544/2934735716',

  // 전면 광고 단위 ID (2개 생성됨)
  ANDROID_INTERSTITIAL: 'ca-app-pub-8246259258904809/4884771370', // 메인 전면 광고
  ANDROID_INTERSTITIAL_2: 'ca-app-pub-8246259258904809/2885529399', // 보조 전면 광고 (통계/백업용)
  IOS_INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910', // iOS 테스트 ID 유지

  // 보상형 광고 (현재 미사용)
  ANDROID_REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  IOS_REWARDED: 'ca-app-pub-3940256099942544/1712485313',
};

// 현재 환경에 따른 광고 ID 선택
// ⚠️ 릴리즈 빌드 시 true로 설정!
const IS_PRODUCTION = false; // 테스트 모드 (광고 비활성화)

export const ADMOB_IDS = IS_PRODUCTION ? ADMOB_PRODUCTION_IDS : ADMOB_TEST_IDS;

// 광고 설정
export const AD_CONFIG = {
  // 배너 광고 크기 (표준 배너: 320x50)
  BANNER_HEIGHT: 50,

  // 광고 갱신 간격 (초) - 최소 30초
  REFRESH_INTERVAL: 60,

  // 전면 광고 표시 간격 (액션 횟수) - 5번 액션마다 1번 광고
  INTERSTITIAL_FREQUENCY: 5,

  // 전면 광고 쿨다운 (밀리초) - 최소 60초 간격
  // Google 정책: 너무 자주 표시하면 안 됨
  INTERSTITIAL_COOLDOWN_MS: 60 * 1000,

  // 앱 시작 후 전면 광고 지연 (밀리초) - 30초
  // Google 정책: 앱 시작 직후 광고 금지
  INTERSTITIAL_INITIAL_DELAY_MS: 30 * 1000,

  // 전면 광고 1일 최대 표시 횟수
  INTERSTITIAL_DAILY_LIMIT: 10,

  // 프리미엄 가격 (원화)
  PREMIUM_PRICE: 3900,
  PREMIUM_PRICE_DISPLAY: '₩3,900',
};

/**
 * 전면 광고 타이밍 가이드 (Google 정책 준수)
 *
 * ✅ 허용되는 타이밍:
 * - 거래 추가/수정 완료 후 (작업 완료 시점)
 * - 엑셀 가져오기 완료 후 (대량 작업 완료)
 * - 백업/복원 완료 후 (중요 작업 완료)
 * - 화면 전환 사이 (자연스러운 전환점)
 *
 * ❌ 금지되는 타이밍:
 * - 앱 시작 직후 (INTERSTITIAL_INITIAL_DELAY_MS 이전)
 * - 사용자 입력 중 갑자기
 * - 뒤로가기 시 반복적으로
 * - 일정 시간마다 강제 노출
 * - 앱 종료 막는 용도
 */

export default ADMOB_IDS;
