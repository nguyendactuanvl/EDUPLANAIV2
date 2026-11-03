export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-api-key',
    },
  });
}

function safeJsonParse(str: string, fallback: any = null): any {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {}
    }
    return fallback;
  }
}

function cleanLatex(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  str = str.replace(/\\dfrac(?=\{|\s)/g, '\\frac');
  return str;
}

export async function onRequestPost(context: { request: Request; env: any }) {
  const { request, env } = context;
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const customKeyHeader = request.headers.get('x-gemini-api-key') || '';
    const apiKey = (
      customKeyHeader ||
      authHeader.replace(/^Bearer\s+/i, '') ||
      env.GEMINI_API_KEY ||
      ''
    ).trim();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Gemini API Key. Vui lòng cài đặt API Key cá nhân trong Cài đặt.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await request.json().catch(() => ({}));
    const {
      lesson = 'Toán học',
      subject = 'Toán',
      grade = '11',
      type = 'Phiếu bài tập',
      numPartI = 12,
      numPartII = 4,
      numPartIII = 6,
      numPartIV = 2,
      realWorldPercent = 40,
      hasParametric = true,
      additionalNotes = ''
    } = body;

    const totalRequired = (numPartI || 0) + (numPartII || 0) + (numPartIII || 0) + (numPartIV || 0);
    const totalCount = totalRequired > 0 ? totalRequired : 24;

    const parametricRule = hasParametric
      ? `YÊU CẦU THAM SỐ: Thiết kế các câu hỏi chứa tham số thực ($m, a, b...$) ở mức độ vận dụng để phân hóa tư duy học sinh.`
      : `QUY TẮC CẤM THAM SỐ: TUYỆT ĐỐI KHÔNG XUẤT HIỆN BẤT KỲ THAM SỐ NÀO (như $m$, $k$, $a$, $b$, $\\alpha$ làm tham số). Tất cả các hệ số trong đề bài, hàm số, phương trình và 4 phương án là các con số thực cụ thể.`;

    const partIVRule = numPartIV > 0
      ? `4. PHẦN IV (essay): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartIV} CÂU Tự luận (loại "essay") - bài tập tự luận có hướng dẫn chấm.`
      : `QUY TẮC CẤU TRÚC ĐỀ 3 PHẦN: TUYỆT ĐỐI KHÔNG SINH PHẦN IV HOẶC BÀI TẬP TỰ LUẬN! Mảng "questions" chỉ chứa câu hỏi thuộc 3 phần (loại "mc", "tf", "sa").`;

    const promptText = `Bạn là một giáo viên xuất sắc môn ${subject} (chuẩn Chương trình GDPT 2018, bộ sách giáo khoa Kết nối tri thức với cuộc sống). Hãy tạo một Phiếu bài tập (Worksheet) tương tác thật chuyên nghiệp cho học sinh Lớp ${grade}, môn ${subject}, bài học/chủ đề: "${lesson}". Hình thức: ${type}.
       
RÀNG BUỘC PHẠM VI NỘI DUNG VÀ CHỦ ĐỀ:
- TẤT CẢ CÁC CÂU HỎI trong phiếu bài tập BẮT BUỘC phải tập trung chính xác và 100% nằm trong phạm vi kiến thức, bài học/chủ đề: "${lesson}".
- Tuân thủ 100% thuật ngữ, ký hiệu, mạch kiến thức theo đúng SGK Kết nối tri thức với cuộc sống.

YÊU CẦU CỤ THỂ VỀ CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC (TỔNG CHÍNH XÁC ĐỦ ${totalCount} CÂU):
BẮT BUỘC phải sinh đúng các phần sau vào mảng "questions":
${numPartI > 0 ? `1. PHẦN I (mc): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartI} CÂU Trắc nghiệm 4 lựa chọn (loại "mc") - mỗi câu gồm "content", 4 phương án vào mảng "options", "correctOptionIndex" (0, 1, 2 hoặc 3).` : ''}
${numPartII > 0 ? `2. PHẦN II (tf): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartII} CÂU Trắc nghiệm Đúng/Sai (loại "tf") - mỗi câu BẮT BUỘC có mảng "tfStatements" gồm ĐÚNG 4 đối tượng [{ "statement": "...", "correct": true/false }].` : ''}
${numPartIII > 0 ? `3. PHẦN III (sa): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartIII} CÂU Trắc nghiệm Trả lời ngắn (loại "sa") - "correctAnswer" là 1 số cụ thể có độ dài tối đa 4 ký tự.` : ''}
${partIVRule}

- Tỷ lệ thực tế: Khoảng ${realWorldPercent}%.
- ${parametricRule}
${additionalNotes ? `- Ghi chú riêng từ giáo viên: ${additionalNotes}` : ''}

QUY TẮC CÔNG THỨC TOÁN HỌC:
- Tất cả công thức toán, biến số đơn lẻ (x, y, m, u_n, d, S_n...) BẮT BUỘC đặt trong cặp dấu đô la: $công_thức$.
- LUÔN LUÔN sử dụng \\frac thay thế cho \\dfrac.
- Kèm trường "solution": Lời giải chi tiết từng bước.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC SAU:
{
  "examName": "Phiếu bài tập: ${lesson}",
  "questions": [
    {
      "type": "mc",
      "content": "Nội dung câu hỏi trắc nghiệm...",
      "options": ["A. $...$", "B. $...$", "C. $...$", "D. $...$"],
      "correctOptionIndex": 0,
      "solution": "Lời giải chi tiết..."
    }
  ]
}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 16384
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Lỗi từ dịch vụ AI Google (${geminiRes.status}): ${errText}` }), {
        status: geminiRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsedData = safeJsonParse(rawText, { questions: [] });

    // Format & validate questions
    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
      const sol = (q.solution || q.explanation || "").trim();
      return {
        ...q,
        id: idx + 1,
        number: idx + 1,
        type: q.type || 'mc',
        content: cleanLatex(q.content || q.question || ''),
        question: cleanLatex(q.question || q.content || ''),
        options: Array.isArray(q.options) ? q.options.map(cleanLatex) : q.options,
        tfStatements: Array.isArray(q.tfStatements) ? q.tfStatements.map((tf: any) => ({
          ...tf,
          statement: cleanLatex(tf.statement)
        })) : q.tfStatements,
        correctAnswer: cleanLatex(q.correctAnswer),
        solution: cleanLatex(sol),
        explanation: cleanLatex(sol)
      };
    });

    const responsePayload = {
      examName: parsedData.examName || `Phiếu bài tập: ${lesson}`,
      questions: formattedQuestions
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
