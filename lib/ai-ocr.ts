// lib/ai-ocr.ts
// React Native용 AI OCR (fetch API 사용)
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface OCRResult {
  success: boolean;
  text: string;
  amount: number | null;
  date: string | null;
  merchant: string | null;
  cardNumber: string | null; // 카드번호 앞 6자리
  items: string[]; // 메뉴 항목 목록
  confidence: number;
  provider: "openai" | "gemini";
  error?: string;
}

// OpenAI GPT-4 Vision으로 영수증 분석 (React Native용 fetch 기반)
export async function analyzeReceiptWithOpenAI(
  base64Image: string,
  apiKey: string,
  model: string = "gpt-4o-mini"
): Promise<OCRResult> {
  try {
    if (!apiKey) {
      throw new Error("OpenAI API 키가 제공되지 않았습니다.");
    }

    // React Native에서는 OpenAI SDK 대신 직접 fetch 사용
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `다음 영수증 이미지를 분석하여 JSON 형식으로 반환해주세요:

{
  "merchant": "가맹점명",
  "amount": 금액(숫자만),
  "date": "YYYY-MM-DD",
  "cardNumber": "카드번호 앞 6자리",
  "items": ["항목1", "항목2"],
  "text": "추출된 전체 텍스트"
}

주의사항:
- amount는 합계 금액을 숫자로만 반환 (쉼표 제외)
- date는 YYYY-MM-DD 형식으로 변환
- merchant는 가맹점 이름만 추출
- cardNumber는 카드번호의 앞 6자리만 추출 (예: "123456")
- 영수증이 아니거나 읽을 수 없으면 null 반환`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI 응답이 비어있습니다.");
    }

    // Markdown 코드 블록 제거
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // JSON 파싱
    const parsedData = JSON.parse(cleanContent);

    return {
      success: true,
      text: parsedData.text || "",
      amount: parsedData.amount || null,
      date: parsedData.date || null,
      merchant: parsedData.merchant || null,
      cardNumber: parsedData.cardNumber || null,
      items: parsedData.items || [],
      confidence: 0.95,
      provider: "openai",
    };
  } catch (error: any) {
    console.error("OpenAI OCR 오류:", error);
    return {
      success: false,
      text: "",
      amount: null,
      date: null,
      merchant: null,
      cardNumber: null,
      items: [],
      confidence: 0,
      provider: "openai",
      error: error.message || String(error),
    };
  }
}

// Google Gemini Vision으로 영수증 분석
export async function analyzeReceiptWithGemini(
  base64Image: string,
  apiKey: string,
  modelName: string = "gemini-2.0-flash-exp"
): Promise<OCRResult> {
  try {
    if (!apiKey) {
      throw new Error("Gemini API 키가 제공되지 않았습니다.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `다음 영수증 이미지를 분석하여 JSON 형식으로 반환해주세요:

{
  "merchant": "가맹점명",
  "amount": 금액(숫자만),
  "date": "YYYY-MM-DD",
  "cardNumber": "카드번호 앞 6자리",
  "items": ["항목1", "항목2"],
  "text": "추출된 전체 텍스트"
}

주의사항:
- amount는 합계 금액을 숫자로만 반환 (쉼표 제외)
- date는 YYYY-MM-DD 형식으로 변환
- merchant는 가맹점 이름만 추출
- cardNumber는 카드번호의 앞 6자리만 추출 (예: "123456")
- 영수증이 아니거나 읽을 수 없으면 null 반환`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // JSON 추출 (```json ... ``` 형식 처리)
    let jsonText = text;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    // JSON 파싱
    const data = JSON.parse(jsonText);

    return {
      success: true,
      text: data.text || "",
      amount: data.amount || null,
      date: data.date || null,
      merchant: data.merchant || null,
      cardNumber: data.cardNumber || null,
      items: data.items || [],
      confidence: 0.95,
      provider: "gemini",
    };
  } catch (error: any) {
    console.error("Gemini OCR 오류:", error);
    return {
      success: false,
      text: "",
      amount: null,
      date: null,
      merchant: null,
      cardNumber: null,
      items: [],
      confidence: 0,
      provider: "gemini",
      error: error.message,
    };
  }
}
