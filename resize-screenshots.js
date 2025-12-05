const sharp = require('sharp');
const path = require('path');

const inputDir = 'D:\\OneDrive\\코드작업\\결과물\\gagyebu';
const outputDir = 'D:\\OneDrive\\코드작업\\결과물\\gagyebu\\screenshots';

const fs = require('fs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Play Store 권장 크기: 1080 x 1920 (9:16 비율)
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

async function resizeScreenshots() {
  const files = ['1.jpg', '2.jpg', '3.jpg', '4.jpg'];

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, `screenshot-${file.replace('.jpg', '.png')}`);

    console.log(`처리 중: ${file}`);

    try {
      // 원본 이미지 정보 확인
      const metadata = await sharp(inputPath).metadata();
      console.log(`  원본 크기: ${metadata.width} x ${metadata.height}`);

      // 비율 유지하면서 리사이즈 후 중앙 정렬
      await sharp(inputPath)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✓ ${outputPath} 생성 완료 (${TARGET_WIDTH}x${TARGET_HEIGHT})`);
    } catch (err) {
      console.error(`  ✗ 오류: ${err.message}`);
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`파일 위치: ${outputDir}`);
}

resizeScreenshots().catch(console.error);
