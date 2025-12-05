const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outputDir = 'D:\\OneDrive\\코드작업\\결과물\\gagyebu';

// 출력 폴더 확인
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function createStoreImages() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  // 1. 앱 아이콘 512x512 (Play Store용)
  console.log('1. 앱 아이콘 512x512 생성 중...');
  await sharp(iconPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'app-icon-512.png'));
  console.log('   ✓ app-icon-512.png 생성 완료');

  // 2. 그래픽 이미지 1024x500 (Feature Graphic)
  console.log('2. 그래픽 이미지 1024x500 생성 중...');

  // 배경 그라데이션 생성 (앱 테마 색상 #E8F5F3)
  const width = 1024;
  const height = 500;

  // SVG로 그래픽 이미지 생성
  const svgImage = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E8F5F3;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#D4EDE8;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#B8E0D8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>

      <!-- 장식 원들 -->
      <circle cx="900" cy="80" r="120" fill="#ffffff" opacity="0.3"/>
      <circle cx="150" cy="420" r="80" fill="#ffffff" opacity="0.2"/>
      <circle cx="950" cy="400" r="60" fill="#4CAF50" opacity="0.15"/>

      <!-- 텍스트 영역 -->
      <text x="600" y="200" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#2E7D6B" text-anchor="middle">가계부</text>
      <text x="600" y="280" font-family="Arial, sans-serif" font-size="32" fill="#5D9B8F" text-anchor="middle">간편한 수입/지출 관리</text>

      <!-- 기능 아이콘 표시 -->
      <text x="600" y="380" font-family="Arial, sans-serif" font-size="40" fill="#666666" text-anchor="middle">📊 💳 📸 💾</text>

      <!-- 하단 슬로건 -->
      <text x="600" y="450" font-family="Arial, sans-serif" font-size="24" fill="#7BA99E" text-anchor="middle">카테고리 통계 • 엑셀 가져오기 • 영수증 OCR • 클라우드 백업</text>
    </svg>
  `;

  // 배경 이미지 생성
  const background = await sharp(Buffer.from(svgImage))
    .png()
    .toBuffer();

  // 아이콘 리사이즈 (300x300)
  const resizedIcon = await sharp(iconPath)
    .resize(280, 280)
    .png()
    .toBuffer();

  // 합성
  await sharp(background)
    .composite([
      {
        input: resizedIcon,
        left: 80,
        top: 110
      }
    ])
    .png()
    .toFile(path.join(outputDir, 'feature-graphic-1024x500.png'));

  console.log('   ✓ feature-graphic-1024x500.png 생성 완료');

  console.log('\n=== 완료 ===');
  console.log(`파일 위치: ${outputDir}`);
  console.log('- app-icon-512.png (앱 아이콘)');
  console.log('- feature-graphic-1024x500.png (그래픽 이미지)');
}

createStoreImages().catch(console.error);
