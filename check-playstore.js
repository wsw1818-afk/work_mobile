const { chromium } = require('playwright');

(async () => {
  // 기존 Chrome 브라우저에 연결 시도
  const browser = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);

  if (!browser) {
    console.log('기존 브라우저에 연결할 수 없습니다.');
    console.log('Chrome을 다음 명령어로 실행해주세요:');
    console.log('chrome.exe --remote-debugging-port=9222');
    process.exit(1);
  }

  const contexts = browser.contexts();
  if (contexts.length === 0) {
    console.log('브라우저 컨텍스트가 없습니다.');
    process.exit(1);
  }

  const pages = contexts[0].pages();
  console.log(`열린 탭 수: ${pages.length}`);

  // Play Console 페이지 찾기
  let playConsolePage = null;
  for (const page of pages) {
    const url = page.url();
    console.log(`탭 URL: ${url}`);
    if (url.includes('play.google.com/console')) {
      playConsolePage = page;
      break;
    }
  }

  if (!playConsolePage) {
    console.log('Play Console 페이지를 찾을 수 없습니다.');
    await browser.close();
    process.exit(1);
  }

  console.log('\n=== Play Console 페이지 분석 ===\n');

  // 페이지 내용 가져오기
  const content = await playConsolePage.content();

  // 오류/경고 메시지 찾기
  const errors = await playConsolePage.$$eval('[class*="error"], [class*="Error"], [class*="warning"], [class*="Warning"], [class*="invalid"], [class*="required"]',
    elements => elements.map(el => el.textContent?.trim()).filter(t => t && t.length > 0 && t.length < 200)
  );

  if (errors.length > 0) {
    console.log('발견된 오류/경고 메시지:');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }

  // 빨간색 텍스트 찾기
  const redTexts = await playConsolePage.$$eval('*', elements => {
    return elements
      .filter(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        return color.includes('rgb(213') || color.includes('rgb(211') || color.includes('rgb(244') || color.includes('red');
      })
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 0 && t.length < 200);
  });

  if (redTexts.length > 0) {
    console.log('\n빨간색 텍스트:');
    [...new Set(redTexts)].slice(0, 20).forEach((t, i) => console.log(`${i + 1}. ${t}`));
  }

  // 스크린샷 저장
  await playConsolePage.screenshot({ path: 'playstore-screenshot.png', fullPage: false });
  console.log('\n스크린샷 저장됨: playstore-screenshot.png');

  await browser.close();
})();
