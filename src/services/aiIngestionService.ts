import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY || ''
});

const TOPIC_CODES_REFERENCE = `
BẢNG KHUNG MÃ CHUYÊN ĐỀ SÁCH KẾT NỐI TRI THỨC VỚI CUỘC SỐNG:
LỚP 10:
- K10_CH1_B1, K10_CH1_B2 (Mệnh đề & Tập hợp)
- K10_CH2_B3, K10_CH2_B4 (BPT bậc nhất hai ẩn)
- K10_CH3_B5, K10_CH3_B6 (Hệ thức lượng trong tam giác)
- K10_CH4_B7, K10_CH4_B8, K10_CH4_B9, K10_CH4_B10, K10_CH4_B11 (Vectơ)
- K10_CH5_B12, K10_CH5_B13, K10_CH5_B14 (Số đặc trưng không ghép nhóm)
- K10_CH6_B15, K10_CH6_B16, K10_CH6_B17, K10_CH6_B18 (Hàm số & Đồ thị)
- K10_CH7_B19, K10_CH7_B20, K10_CH7_B21, K10_CH7_B22 (PP tọa độ mặt phẳng Oxy)
- K10_CH8_B23, K10_CH8_B24, K10_CH8_B25 (Đại số tổ hợp)
- K10_CH9_B26, K10_CH9_B27 (Xác suất cổ điển)

LỚP 11:
- K11_CH1_B1, K11_CH1_B2, K11_CH1_B3, K11_CH1_B4 (Lượng giác)
- K11_CH2_B5, K11_CH2_B6, K11_CH2_B7 (Dãy số, CSC, CSN)
- K11_CH3_B8, K11_CH3_B9 (Số đặc trưng ghép nhóm)
- K11_CH4_B10, K11_CH4_B11, K11_CH4_B12, K11_CH4_B13, K11_CH4_B14 (QH song song không gian)
- K11_CH5_B15, K11_CH5_B16, K11_CH5_B17 (Giới hạn & Liên tục)
- K11_CH6_B18, K11_CH6_B19, K11_CH6_B20, K11_CH6_B21 (Mũ & Lôgarit)
- K11_CH7_B22, K11_CH7_B23, K11_CH7_B24, K11_CH7_B25, K11_CH7_B26, K11_CH7_B27 (QH vuông góc không gian)
- K11_CH8_B28, K11_CH8_B29, K11_CH8_B30 (Quy tắc tính xác suất)
- K11_CH9_B31, K11_CH9_B32, K11_CH9_B33 (Đạo hàm)

LỚP 12:
- K12_CH1_B1, K12_CH1_B2, K12_CH1_B3, K12_CH1_B4, K12_CH1_B5 (Đạo hàm & KS hàm số)
- K12_CH2_B6, K12_CH2_B7, K12_CH2_B8 (Vectơ & Tọa độ không gian)
- K12_CH3_B9, K12_CH3_B10 (Số đặc trưng phân tán ghép nhóm)
- K12_CH4_B11, K12_CH4_B12, K12_CH4_B13 (Nguyên hàm & Tích phân)
- K12_CH5_B14, K12_CH5_B15, K12_CH5_B16, K12_CH5_B17 (PP tọa độ trong không gian Oxyz)
- K12_CH6_B18, K12_CH6_B19 (Xác suất có điều kiện & Bayes)
`;

const DIFFICULTY_GUIDELINES = `
TIÊU CHUẨN 4 MỨC ĐỘ TƯ DUY TOÁN GDPT 2018 (DIFFICULTY):
- "NB" (Nhận biết): Nhận diện trực tiếp công thức, định nghĩa, định lý, hình dáng đồ thị, đọc tọa độ hoặc số liệu trực quan mà không cần suy luận phức tạp.
- "TH" (Thông hiểu): Hiểu bản chất, thực hiện biến đổi trung gian cơ bản hoặc tính toán từ 1 đến 2 bước (thay số vào công thức giải trực tiếp).
- "VD" (Vận dụng): Phối hợp nhiều đơn vị kiến thức trong chương trình, giải quyết các bài toán biến đổi nâng cao, mô hình hóa toán học ở mức quen thuộc.
- "VDC" (Vận dụng cao): Phân hóa điểm 9-10; gồm các bài toán tối ưu thực tế, cực trị hình học/đại số phức tạp, tham số biện luận, hoặc bài toán xác suất tổng hợp.
`;

export async function ingestQuestionsWithAI(rawText: string, defaultGrade: 10 | 11 | 12): Promise<{ success: boolean; count: number; error?: string }> {
  if (!rawText || !rawText.trim()) {
    return { success: false, count: 0, error: 'Vui lòng nhập nội dung đề thi thô.' };
  }

  try {
    const prompt = `
Bạn là một AI chuyên gia số hóa câu hỏi môn Toán THPT theo chương trình GDPT 2018 (sách Kết nối tri thức với cuộc sống).
Hãy phân tích đoạn văn bản đề thi thô sau đây và trích xuất thành DUY NHẤT một mảng JSON hợp lệ theo đúng cấu trúc yêu cầu.

${TOPIC_CODES_REFERENCE}

${DIFFICULTY_GUIDELINES}

QUY TẮC BẮT BUỘC:
1. Định dạng công thức toán: Tất cả công thức, ký hiệu toán học, biến số đơn lẻ BẮT BUỘC đặt trong cặp dấu đô la $...$ (nội dòng) hoặc $$...$$ (khối riêng). Dùng \\frac thay vì \\dfrac.
2. Gán chính xác "grade" (${defaultGrade} nếu không rõ), "topic_code" phù hợp nhất từ danh sách trên, "difficulty" ("NB", "TH", "VD", "VDC"), và "q_type" ("MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER").
3. Đối với "MULTIPLE_CHOICE": mảng options có đúng 4 phần tử với key "A", "B", "C", "D" và is_correct boolean.
4. Đối với "TRUE_FALSE": mảng options có đúng 4 phần tử với key "a", "b", "c", "d" và is_correct boolean.
5. Đối với "SHORT_ANSWER": mảng options luôn là [].
6. Trả về KẾT QUẢ DUY NHẤT LÀ MỘT MẢNG JSON HỢP LỆ, không kèm theo bất kỳ văn bản giải thích nào ngoài JSON.

NỘI DUNG ĐỀ THI THÔ CẦN XỬ LÝ:
${rawText}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const textOutput = response.text || '';
    let jsonString = textOutput.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsedQuestions = JSON.parse(jsonString);
    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return { success: false, count: 0, error: 'Không trích xuất được câu hỏi nào từ AI.' };
    }

    const newItems = parsedQuestions.map((q: any, idx: number) => ({
      id: `ai_q_${Date.now()}_${idx}`,
      grade: q.grade || defaultGrade,
      topic_code: q.topic_code || `K${defaultGrade}_CH1_B1`,
      difficulty: q.difficulty || 'TH',
      q_type: q.q_type || 'MULTIPLE_CHOICE',
      tags: q.tags || ['ai_ingest'],
      content: q.content || '',
      options: q.options || [],
      solution: q.solution || '',
      updated_at: new Date().toISOString()
    }));

    const existingBank = JSON.parse(localStorage.getItem('EDUPLAN_QUESTIONS_BANK') || '[]');
    const updatedBank = [...existingBank, ...newItems];
    localStorage.setItem('EDUPLAN_QUESTIONS_BANK', JSON.stringify(updatedBank));

    return { success: true, count: newItems.length };
  } catch (err: any) {
    console.error("Lỗi ingestQuestionsWithAI:", err);
    return { success: false, count: 0, error: err.message || 'Lỗi kết nối AI hoặc phân tích JSON.' };
  }
}
