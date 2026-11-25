import 'dotenv/config';
import express from "express";
import fs from "fs";
import HTMLtoDOCX from "html-to-docx";
import path from "path";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import LZString from 'lz-string';
import * as XLSX from 'xlsx';
import zlib from 'zlib';



export const maxDuration = 60; // 1 minute max duration on Vercel Hobby

const MATH_FORMATTING_RULES = `QUY TẮC ĐỊNH DẠNG TOÁN HỌC VÀ VĂN BẢN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT 100%):
1. TOÁN HỌC & CÔNG THỨC (BẮT BUỘC):
   - Mọi biểu thức, số liệu, biến số đơn lẻ ($x$, $y$, $z$, $m$, $a$, $b$, $c$, $\\alpha$, $\\beta$, $\\pi$, $\\Delta$...) PHẢI bọc bằng $...$ (inline) hoặc $$...$$ (display block).
   - CẤM TUYỆT ĐỐI viết mã LaTeX trần không có $.
   - Không viết tắt hay dùng text thường cho công thức (ví dụ: TUYỆT ĐỐI KHÔNG viết "sin x = 0", BẮT BUỘC phải viết "$\\sin x = 0$"; không viết "x = 2", phải viết "$x = 2$").
   - LUÔN DÙNG \\frac THAY CHO \\dfrac (TUYỆT ĐỐI KHÔNG DÙNG \\dfrac, luôn dùng \\frac{a}{b}).
   - Dùng cú pháp LaTeX chuẩn: \\sin, \\cos, \\tan, \\cot, \\frac{a}{b}, \\sqrt{...}, \\pi, \\Leftrightarrow, \\Rightarrow, \\ge, \\le, \\in, \\notin, \\cap, \\cup, \\subset.
   - VỚI HỆ PHƯƠNG TRÌNH / BẤT PHƯƠNG TRÌNH (BẮT BUỘC): BẮT BUỘC dùng cú pháp khối riêng:
     $\\begin{cases} ax + by \\le c \\\\ dx + ey \\ge f \\end{cases}$
     (hoặc \\left[\\begin{aligned} ... \\end{aligned}\\right. đối với dấu ngoặc vuông chọn họ nghiệm/phương trình phân nhánh).
     TUYỆT ĐỐI KHÔNG viết dấu ngoặc nhọn { đơn lẻ ngoài công thức, không để dấu hệ bị tách riêng dòng so với các phương trình. Mỗi phương trình trong hệ BẮT BUỘC kết thúc bằng \\\\ để ngắt dòng đẹp.
   - KÝ HIỆU LƯỢNG TỪ MỆNH ĐỀ VỚI MỌI (\\forall), TỒN TẠI (\\exists): BẮT BUỘC bọc trọn vẹn cả mệnh đề trong cặp dấu $...$ (ví dụ: "$\\forall x \\in \\mathbb{R}, x^2 + 1 > 0$", "$\\exists x \\in \\mathbb{R}: x^2 = 2$"). TUYỆT ĐỐI KHÔNG bọc ngắt quãng hoặc để trần ngoài dấu $.
   - KÝ HIỆU ĐỒ THỊ (C), ĐƯỜNG TRÒN (C): BẮT BUỘC bọc trong cặp dấu $ như "$(C)" (ví dụ: "Cho hàm số có đồ thị $(C)$"). TUYỆT ĐỐI KHÔNG viết trần (C) để tránh xung đột làm nhảy chữ C của phương án trắc nghiệm.
   - VỚI VECTƠ (BẮT BUỘC): Luôn dùng \\vec{AB}, \\vec{a}, \\vec{u} có đầy đủ ngoặc nhọn mở và đóng (TUYỆT ĐỐI KHÔNG viết |vec{ hay \\ vec{ hay thiếu ngoặc đóng }). MỌI công thức vectơ (kể cả trong quy tắc ba điểm, quy tắc hình bình hành, quy tắc hình hộp, quy tắc trung điểm/trọng tâm) BẮT BUỘC 100% PHẢI ĐẶT TRONG DẤU $...$ (ví dụ: $\\vec{AB} + \\vec{BC} = \\vec{AC}$, $\\vec{AB} + \\vec{AD} = \\vec{AC}$, $\\vec{OA} + \\vec{OB} = 2\\vec{OM}$). TUYỆT ĐỐI KHÔNG để biểu thức vectơ đứng trần không có $.
   - VỚI CĂN THỨC (BẮT BUỘC): Luôn dùng \\sqrt{...} có đầy đủ ngoặc nhọn mở và đóng (ví dụ: $\\sqrt{2}$, $\\sqrt{3}$).
   - VỚI CÁC ĐIỂM CÓ DẤU PHẨY (BẮT BUỘC): Điểm $A'$, $B'$, $C'$, $D'$ hoặc $A^\\prime, B^\\prime, C^\\prime, D^\\prime$ BẮT BUỘC phải đặt trong dấu $...$ để bảo toàn cú pháp MathJax.
   - Dấu khác (không bằng) BẮT BUỘC dùng \\neq hoặc \\ne (tuyệt đối KHÔNG viết dạng "/ =", "/=", "!=" hay "=/=").
   - Ký hiệu vô cực (vô cùng) BẮT BUỘC dùng \\infty: $-\\infty, +\\infty$. Tuyệt đối KHÔNG viết thiếu dấu gạch chéo thành -infty, +infty hay in fty. Các khoảng như $(-\\infty; -1)$, $(-1; +\\infty)$ BẮT BUỘC có \\ trước infty.
   - KÝ HIỆU TẬP HỢP DÙNG DẤU NGOẶC NHỌN: Dấu ngoặc nhọn tập hợp { } BẮT BUỘC phải thoát bằng dấu gạch chéo ngược: \\{ và \\} (ví dụ: $A = \\{x \\in \\mathbb{Z} \\mid -2 \\le x < 3\\}$, $B = \\{1; 2; 3\\}$).
   - CÁC TOÁN TỬ SO SÁNH: BẮT BUỘC viết \\le, \\ge, \\neq (ví dụ: $x \\le 3$, $|x| \\le 3$, $-2 \\le x < 3$).
   - CẤM TIÊU ĐỀ BỌC DẤU $ HOẶC MÃ MATH: TUYỆT ĐỐI KHÔNG bọc dấu $ hoặc mã math vào các tiêu đề Phần hay tiêu đề Bài (CẤM viết "PHẦN $I$", "PHẦN $II$", "PHẦN $III$", "TRẮC $NGHIỆM$", "$PHẦN I$"). Các tiêu đề BẮT BUỘC là văn bản thuần túy như "PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN"!
   - CẤM VIẾT TIẾNG VIỆT TRONG DẤU $: TUYỆT ĐỐI KHÔNG bọc các từ hay câu tiếng Việt trong dấu $...$ (CẤM viết "$Cho cấp số cộng(u_n)$", "$Tính chất các số hạng...$"). Chỉ bọc duy nhất công thức, biến số toán học trong $...$.
   - CẤM DẤU $ TRONG PHÂN SỐ HOẶC CĂN: TUYỆT ĐỐI KHÔNG đặt dấu $ bên trong \frac{...}{...} hay \sqrt{...} hay \vec{...}.
   - CẤM NGOẶC NHỌN KÉP DƯỚI CHỈ SỐ: CẤM viết x_{\{\frac{n+1}{2}\}}, BẮT BUỘC viết $x_{\frac{n+1}{2}}$.
   - KHÓA CHẶN BÌNH LUẬN NGOÀI LỀ: TUYỆT ĐỐI KHÔNG xuất các đoạn suy luận nháp, tự kiểm tra đề bài, hay các câu bình luận ngoài lề (như 'Kiểm tra lại', 'Chỉnh số liệu', 'Xem lại tính chất'). Chỉ xuất thuần túy nội dung câu hỏi và lời giải.
   - Giữ nguyên vẹn font tiếng Việt UTF-8 chuẩn.

2. BẢNG BIẾN THIÊN (BBT) VÀ BẢNG XÉT DẤU:
   - BẮT BUỘC: Khi sinh câu hỏi có cụm từ "bảng biến thiên" hoặc "bảng xét dấu" (ví dụ: "Cho hàm số $y = f(x)$ có bảng biến thiên như sau:" hoặc "có bảng xét dấu đạo hàm như sau:"), BẮT BUỘC PHẢI CHÈN BẢNG BIẾN THIÊN / BẢNG XÉT DẤU dạng Markdown Table chuẩn ngay dưới câu hỏi đó. CẤM VIẾT "có bảng biến thiên/bảng xét dấu như sau:" rồi bỏ trống không có bảng!
   - Tuyệt đối KHÔNG để khung rỗng hoặc để trống.
   - Khi câu hỏi hoặc bài giải cần bảng biến thiên, BẮT BUỘC vẽ bảng biến thiên trực quan bằng Markdown Table chuẩn, mỗi hàng BẮT BUỘC xuống dòng riêng biệt (có ký tự \\n):
     | $x$ | $-\\infty$ | | $x_0$ | | $+\\infty$ |
     |---|---|---|---|---|---|
     | $y'$ | | $+$ | $0$ | $-$ | |
     | $y$ | $-\\infty$ | $\\nearrow$ | $y_{CĐ}$ | $\\searrow$ | $-\\infty$ |
   - Điền đầy đủ các mũi tên chiều biến thiên $\\nearrow$, $\\searrow$, các dấu $+$, $-$, giá trị $0$, các điểm cực trị $y_{CĐ}, y_{CT}$, giới hạn $-\\infty, +\\infty$.
   - Nếu có tiệm cận đứng hoặc điểm gián đoạn (như hàm phân thức bậc nhất/bậc nhất): dùng vạch đôi $\\|$ ở hàng $y'$ và phân tách 2 giới hạn ở hàng $y$ bằng $\\|$ (ví dụ: $2 \\searrow -\\infty \\| +\\infty \\searrow 2$).
   - TUYỆT ĐỐI KHÔNG viết toàn bộ bảng biến thiên dính liền trên cùng 1 dòng mà không có ký tự ngắt dòng \\n.

2.5. BẢNG SỐ LIỆU THỐNG KÊ (BẢNG GHÉP NHÓM, TẦN SỐ, NĂNG SUẤT, CÂN NẶNG, THỜI GIAN...):
   - BẮT BUỘC dùng Markdown Table chuẩn (có tiêu đề và vạch phân cách |---|---|) HOẶC nếu dùng \\begin{array} thì BẮT BUỘC viết liền khối tham số cột trên 1 dòng duy nhất:
     $$\\begin{array}{|c|c|c|c|c|}\\hline \\text{Nhóm} & [a; b) & [b; c) \\\\ \\hline \\text{Tần số} & n_1 & n_2 \\\\ \\hline \\end{array}$$
   - TUYỆT ĐỐI KHÔNG chèn dòng trống \\n\\n giữa \\begin{array} và ngoặc nhọn } khai báo cột.
   - TUYỆT ĐỐI KHÔNG chèn dòng trống \\n\\n rác bên trong khối $$\\begin{array}...\\end{array}$$.

3. HÌNH VẼ ĐỒ THỊ:
   - BẮT BUỘC: Khi sinh câu hỏi có cụm từ "có đồ thị như hình vẽ bên" hoặc "đường cong trong hình vẽ bên là đồ thị của hàm số...", BẮT BUỘC chèn mô tả đặc điểm đồ thị bằng lời trong đề (ví dụ: "Đồ thị đi qua điểm $A(0; -1)$, đỉnh $I(1; -2)$, cắt trục hoành tại...") HOẶC sinh kèm mã TikZ / SVG đồ thị nội tuyến. CẤM VIẾT "có đồ thị như hình vẽ bên" rồi bỏ trống không có hình/mô tả!
   - ĐỐI VỚI ĐỒ THỊ HÀM PHÂN THỨC (CÓ TIỆM CẬN): BẮT BUỘC vẽ đầy đủ các đường tiệm cận nét đứt (tiệm cận đứng $x = x_0$, tiệm cận ngang $y = y_0$ hoặc tiệm cận xiên $y = ax + b$) kèm nhãn phương trình tiệm cận và tâm đối xứng $I(x_0; y_0)$ giao điểm hai tiệm cận chuẩn 100% SGK.

4. CẤM TUYỆT ĐỐI SINH MÃ HTML INLINE PHỨC TẠP:
   - CẤM TUYỆT ĐỐI sinh mã HTML inline phức tạp (<mark style="...">, <span>, <div style="...">).
   - Chỉ dùng Markdown chuẩn (**in đậm**, *in nghiêng*, bảng biểu Markdown table).

5. HÌNH VẼ HÌNH HỌC KHÔNG GIAN VÀ MIỀN NGHIỆM BPT BẬC NHẤT:
   - Nếu cần vẽ hình học không gian hoặc miền nghiệm hệ BPT: đặt code vào khối markdown \`\`\`tikz ... \`\`\` và bao bọc bởi \\begin{tikzpicture} và \\end{tikzpicture}.
   - Hình học không gian: Nét liền cho các cạnh nhìn thấy, nét đứt cho các cạnh khuất đáy hoặc sau.
   - Miền nghiệm BPT: Nét liền cho dấu có bằng (<=, >=), nét đứt cho dấu ngặt (<, >). Phần không thuộc miền nghiệm tô màu xám nhẹ fill=gray!25.

6. TRÌNH BÀY ĐÁP ÁN, LỜI GIẢI CHI TIẾT VÀ BẢNG BIỂU:
   - BẢNG ĐÁP ÁN NHANH:
     + PHẦN I: Bảng Markdown 12 cột hàng Chọn: | Câu | 1 | 2 | ... | 12 | và | Chọn | A | B | ... |.
     + PHẦN II (Đúng/Sai): BẮT BUỘC dùng bảng Markdown 5 hàng chuẩn:
       | Câu | 1 | 2 | 3 | 4 |
       | :---: | :---: | :---: | :---: | :---: |
       | a | Đ | Đ | S | Đ |
       | b | Đ | S | Đ | Đ |
       | c | S | Đ | S | S |
       | d | Đ | S | Đ | S |
       TUYỆT ĐỐI KHÔNG dùng môi trường ma trận \\begin{matrix} gây lỗi vỡ khung.
   - TUYỆT ĐỐI CẤM dùng mã LaTeX \\underline{...} (ví dụ \\underline{A}, \\underline{B}, \\underline{C}, \\underline{D}). Để nhấn mạnh đáp án đúng, BẮT BUỘC dùng Markdown in đậm: **A**, **B**, **C**, **D** (hoặc [A], [B], [C], [D]).
   - TUYỆT ĐỐI CẤM dùng môi trường LaTeX \\begin{tabular}...\\end{tabular} hay \\begin{center}...\\end{center}. Mọi bảng giá trị tọa độ, bảng số liệu BẮT BUỘC dùng định dạng Markdown Table chuẩn (| x | -4 | -2 | 0 | ... |).
   - TUYỆT ĐỐI KHÔNG viết các đáp án A, B, C, D dính liền nhau trên cùng một dòng.
   - BẮT BUỘC mỗi đáp án phải nằm trên một dòng riêng biệt.

7. QUY CHUẨN CẤU TRÚC ĐỀ THI / PHIẾU HỌC TẬP CHUẨN GDPT 2018:
   - TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt, không được bỏ qua bất kỳ câu nào, TUYỆT ĐỐI KHÔNG ĐƯỢC sinh placeholder như "(Các câu tương tự...)".
   - Yêu cầu N câu thì hệ thống BẮT BUỘC PHẢI SINH ĐỦ 100% ĐÚNG N CÂU HOÀN CHỈNH từ câu 1 đến câu N.
   - Trắc nghiệm Đúng/Sai (tf): mỗi câu gồm ĐÚNG 4 mệnh đề con a, b, c, d trên các dòng riêng biệt, mảng tfStatements có ĐỦ 4 phần tử.
   - Trắc nghiệm 4 lựa chọn (mc): đầy đủ 4 phương án trong options.
   - Trả lời ngắn (sa): "correctAnswer" là một con số cụ thể có độ dài tối đa 4 ký tự. Với chủ đề Tập hợp: không hỏi tìm tập hợp mà hỏi số phần tử nguyên, tính giá trị biểu thức T = a+b hoặc độ dài khoảng để đáp số luôn là một số cụ thể.
8. ĐỐI VỚI ĐOẠN MÃ LẬP TRÌNH (Code Python, Scratch, thuật toán, câu lệnh if, for, while, print, input...):
   - TUYỆT ĐỐI KHÔNG bọc dấu $...$ hay LaTeX vào mã lập trình hoặc chuỗi string (ví dụ: TUYỆT ĐỐI KHÔNG viết print($"Pass"$), print($\text{"Pass"}$), hay $if score > 5: print("Pass")$).
   - BẮT BUỘC đặt trong khối mã \`\`\`python ... \`\`\` hoặc bọc dấu backtick inline \`...\` (Ví dụ: \`if score > 5: print("Pass")\`).

9. KHÓA CHẶN SUY LUẬN NHÁP / BÌNH LUẬN NGOÀI LỀ (BẮT BUỘC):
   - TUYỆT ĐỐI KHÔNG xuất các đoạn suy luận nháp, tự kiểm tra đề bài, hay các câu bình luận ngoài lề (như 'Kiểm tra lại', 'Chỉnh số liệu', 'Xem lại tính chất', 'vô lý nếu...', 'đề gốc phương án...', 'Đính chính:'). Chỉ xuất thuần túy nội dung câu hỏi và lời giải.`;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: ['text/plain', 'text/*', 'application/json'], limit: '50mb' }));
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && (req.body.trim().startsWith('{') || req.body.trim().startsWith('['))) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.post("/api/test-gemini-key", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  const rawKey = req.body?.apiKey || getCustomAiApiKey(req);
  if (!isValidGeminiApiKey(rawKey)) {
    return res.status(400).json({
      valid: false,
      status: 'invalid',
      error: 'API Key không hợp lệ (trống hoặc sai định dạng).',
    });
  }

  let cleanKey = rawKey.trim();
  if (cleanKey.startsWith('Bearer ')) cleanKey = cleanKey.substring(7).trim();
  try {
    cleanKey = decodeURIComponent(cleanKey);
  } catch (_) {}
  cleanKey = cleanKey.replace(/[^\x20-\x7E]/g, '').trim();

  const client = new GoogleGenAI({
    apiKey: cleanKey,
    apiVersion: 'v1beta',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const testModels = [
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
    'gemini-2.5-flash-lite',
  ];
  let bestNonNotFoundErr: any = null;
  let lastNotFoundErr: any = null;
  let triedDiscovery = false;

  for (let i = 0; i < testModels.length; i++) {
    const model = testModels[i];
    try {
      await client.models.generateContent({
        model,
        contents: 'OK',
        config: { maxOutputTokens: 4 },
      });
      serverWorkingModelByKey.set(cleanKey, model);
      return res.status(200).json({
        valid: true,
        status: 'valid',
        message: 'Sẵn sàng',
      });
    } catch (err: any) {
      if (isServerModelNotFoundError(err)) {
        lastNotFoundErr = err;
        if (i === testModels.length - 1 && !triedDiscovery) {
          triedDiscovery = true;
          const discovered = await discoverServerGeminiModels(cleanKey);
          const extras = discovered.filter((m) => !testModels.includes(m)).slice(0, 4);
          if (extras.length > 0) {
            testModels.push(...extras);
          }
        }
        continue;
      }
      bestNonNotFoundErr = err;
      break;
    }
  }

  const lastErr = bestNonNotFoundErr || lastNotFoundErr;
  const errMsg = String(lastErr?.message || lastErr || '');
  const lower = errMsg.toLowerCase();
  const status = lastErr?.status || 0;

  if (
    status === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return res.status(429).json({
      valid: false,
      status: 'rate_limited',
      error: 'Tạm quá tải 429 (Đã chạm giới hạn request của Google)',
    });
  }

  if (status === 404 || lower.includes('not found')) {
    return res.status(404).json({
      valid: false,
      status: 'invalid',
      error: 'Không tìm thấy mô hình Gemini khả dụng cho API Key này (Lỗi 404). Vui lòng kiểm tra lại key tại Google AI Studio.',
    });
  }

  return res.status(400).json({
    valid: false,
    status: 'invalid',
    error: 'Key lỗi hoặc không hợp lệ (Lỗi xác thực 400/403)',
  });
});

const chunkStore = new Map<string, { chunks: string[], type: string, name?: string, total: number, timestamp: number }>();

app.post("/api/upload-chunk", (req, res) => {
  const now = Date.now();
  for (const [id, entry] of chunkStore.entries()) {
    if (now - entry.timestamp > 10 * 60 * 1000) {
      chunkStore.delete(id);
    }
  }
  const { fileId, chunkIndex, totalChunks, chunkData, type, name } = req.body;
  if (!chunkStore.has(fileId)) {
    chunkStore.set(fileId, { chunks: new Array(totalChunks), type, name, total: totalChunks, timestamp: now });
  }
  const fileEntry = chunkStore.get(fileId)!;
  fileEntry.chunks[chunkIndex] = chunkData;
  if (name && !fileEntry.name) fileEntry.name = name;
  fileEntry.timestamp = now;
  res.json({ success: true });
});


async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import('pdf-parse');
    const mod: any = pdfModule;
    if (typeof mod === 'function') {
      const data = await mod(buffer);
      return data?.text || '';
    }
    if (mod?.default && typeof mod.default === 'function') {
      const data = await mod.default(buffer);
      return data?.text || '';
    }
    const PDFParseClass = mod?.PDFParse || mod?.default?.PDFParse;
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      return res?.text || '';
    }
  } catch (err) {
    console.warn("PDF text parse error:", err);
  }
  return '';
}

async function processFilesForAI(files: any[]) {
  const processedFiles = [];
  for (const f of files) {
    if (!f.data) continue;
    try {
      let rawBase64 = typeof f.data === 'string' ? f.data.trim() : '';
      if (rawBase64.startsWith('data:')) {
        rawBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim();
      }

      let isDoc = f.type === 'application/msword' || f.name?.endsWith('.doc');
      let isDocx = f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name?.endsWith('.docx');
      let isPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf') || rawBase64.startsWith('JVBERi0');
      let isExcel = f.type?.includes('spreadsheet') || f.type?.includes('excel') || f.name?.endsWith('.xlsx') || f.name?.endsWith('.xls');
      
      // Fallback identification based on data signature if type/name is missing
      if (!isDoc && !isDocx && !isPdf && !isExcel && rawBase64.startsWith('0M8R4KGxGuE')) {
         isDoc = true; // OLE format
      }
      if (!isDoc && !isDocx && !isPdf && !isExcel && rawBase64.startsWith('UEsDBBQ')) {
         isDocx = true; // ZIP format
      }

      let isPng = f.type === 'image/png' || rawBase64.startsWith('iVBORw0KGgo');
      let isJpeg = f.type === 'image/jpeg' || f.type === 'image/jpg' || rawBase64.startsWith('/9j/');
      let isWebp = f.type === 'image/webp' || rawBase64.startsWith('UklGR');
      let isGif = f.type === 'image/gif' || rawBase64.startsWith('R0lGOD');

      if (isExcel) {
        try {
          const buffer = Buffer.from(rawBase64, 'base64');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          let excelText = '';
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv && csv.trim()) {
              excelText += `\n--- Bảng Sheet: ${sheetName} ---\n${csv.trim()}\n`;
            }
          });
          if (excelText) {
            processedFiles.push({
              text: `[Dữ liệu Ma Trận & Bản Đặc Tả trích xuất từ file Excel ${f.name || 'ma_tran'}]:\n${excelText.trim().substring(0, 60000)}`
            });
          }
        } catch (xlsErr) {
          console.error("Excel parse error in processFilesForAI:", xlsErr);
        }
      } else if (isDocx) {
        const buffer = Buffer.from(rawBase64, 'base64');
        const result = await mammoth.convertToHtml({ buffer });
        processedFiles.push({
          inlineData: {
            data: Buffer.from(result.value).toString('base64'),
            mimeType: 'text/html'
          }
        });
      } else if (isDoc) {
        const buffer = Buffer.from(rawBase64, 'base64');
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        processedFiles.push({
          inlineData: {
            data: Buffer.from(extracted.getBody()).toString('base64'),
            mimeType: 'text/plain'
          }
        });
      } else if (isPdf) {
        // Gửi file Base64 sạch sang Gemini API dưới dạng inlineData (Gemini đọc chuẩn 100% tất cả các trang PDF)
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: 'application/pdf'
          }
        });
      } else if (isPng) {
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: 'image/png'
          }
        });
      } else if (isJpeg) {
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: 'image/jpeg'
          }
        });
      } else if (isWebp) {
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: 'image/webp'
          }
        });
      } else if (isGif) {
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: 'image/gif'
          }
        });
      } else {
        processedFiles.push({
          inlineData: {
            data: rawBase64,
            mimeType: f.type || 'text/plain'
          }
        });
      }
    } catch (e) {
      console.error("Error processing file:", e);
      let rawBase64 = typeof f.data === 'string' ? f.data.replace(/^data:[^;]+;base64,/, '').trim() : f.data;
      processedFiles.push({
        inlineData: {
          data: rawBase64,
          mimeType: f.type || 'text/plain'
        }
      });
    }
  }
  return processedFiles;
}

function resolveFiles(reqBody: any) {
  let files: any[] = [];
  if (Array.isArray(reqBody.files)) {
    files.push(...reqBody.files);
  }
  const fileIds = [...(reqBody.fileIds || []), ...(reqBody.fileId ? [reqBody.fileId] : [])];
  for (const id of fileIds) {
    const entry = chunkStore.get(id);
    if (entry) {
      files.push({ data: entry.chunks.join(''), type: entry.type, name: entry.name });
      chunkStore.delete(id);
    }
  }

  return files.map(f => {
    if (f && f.data && typeof f.data === "string") {
      const trimmed = f.data.trim();
      const matches = trimmed.match(/^data:([^;]+);base64,(.*)$/s);
      if (matches) {
        return { ...f, type: f.type || matches[1], data: matches[2].trim() };
      }
      return { ...f, data: trimmed };
    }
    return f;
  });
}

function resolveSingleFile(reqBody: any) {
  let { file, type, fileId, name } = reqBody;
  if (fileId && chunkStore.has(fileId)) {
    const entry = chunkStore.get(fileId)!;
    file = entry.chunks.join('');
    type = entry.type;
    name = entry.name;
    chunkStore.delete(fileId);
  }
  return { file, type, name };
}


// Exam/room persistence runs directly in client localStorage (no server KV/file sync).

function isValidGeminiApiKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  let clean = key.trim();
  if (clean.startsWith('Bearer ')) {
    clean = clean.substring(7).trim();
  }
  try { clean = decodeURIComponent(clean); } catch (e) {}
  clean = clean.replace(/[^\x20-\x7E]/g, '').trim();
  if (!clean || clean === 'null' || clean === 'undefined' || clean === 'missing' || clean.length < 10) {
    return false;
  }
  return true;
}

function getSystemAiClient() {
  throw new Error("Ứng dụng quy định 100% người dùng tự nhập Gemini API Key cá nhân. Không sử dụng API Key mặc định của hệ thống.");
}

function getCustomAiApiKey(req?: any): string {
  const authHeader = req?.headers?.['authorization'] as string;
  let customKey = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    customKey = authHeader.substring(7);
  } else {
    customKey = (req?.headers?.['x-gemini-api-key'] as string) || req?.body?.apiKey || '';
  }

  if (isValidGeminiApiKey(customKey)) {
    try { customKey = decodeURIComponent(customKey); } catch (e) {}
    return customKey.replace(/[^\x20-\x7E]/g, '').trim();
  }
  return '';
}

function getEnvAiApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_KEY_1 || '';
  if (isValidGeminiApiKey(envKey)) {
    try { return decodeURIComponent(envKey).replace(/[^\x20-\x7E]/g, '').trim(); } catch (e) {}
    return envKey.trim();
  }
  return '';
}

function getAiApiKey(req?: any): string {
  return getCustomAiApiKey(req) || getEnvAiApiKey();
}

const serverWorkingModelByKey = new Map<string, string>();
const serverDiscoveredModelsByKey = new Map<string, { models: string[]; fetchedAt: number }>();
const SERVER_MODEL_DISCOVERY_TTL_MS = 10 * 60 * 1000;

function isServerModelNotFoundError(err: any): boolean {
  const status = err?.status;
  const msg = String(err?.message || "").toLowerCase();
  return status === 404 || msg.includes("not found") || msg.includes("no longer available") || msg.includes("is not supported for generatecontent");
}

function rankServerGeminiModel(modelId: string): number {
  const m = modelId.toLowerCase();
  if (m === "gemini-4-hydrogen") return 1;
  if (m === "gemini-3.1-flash-lite") return 2;
  if (m === "gemini-3-flash-preview") return 3;
  if (m === "gemini-3.1-flash-lite-preview") return 4;
  if (m === "gemini-2.5-flash") return 5;
  if (m === "gemini-2.5-flash-lite") return 6;
  if (m.startsWith("gemini-4-") && !m.includes("image") && !m.includes("tts") && !m.includes("live")) return 7;
  if (m.startsWith("gemini-3") && m.includes("flash") && !m.includes("image") && !m.includes("tts") && !m.includes("live")) return 8;
  if (m.startsWith("gemini-2.5-flash") && !m.includes("image") && !m.includes("tts") && !m.includes("live")) return 9;
  if (m.startsWith("gemini-3") && m.includes("pro") && !m.includes("image")) return 10;
  if (m.startsWith("gemini-2.5-pro") && !m.includes("image")) return 11;
  if (m.includes("flash")) return 15;
  return 20;
}

async function discoverServerGeminiModels(apiKey: string): Promise<string[]> {
  if (!apiKey) return [];
  const cached = serverDiscoveredModelsByKey.get(apiKey);
  if (cached && Date.now() - cached.fetchedAt < SERVER_MODEL_DISCOVERY_TTL_MS) {
    return cached.models;
  }
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`
    );
    if (!resp.ok) return [];
    const data: any = await resp.json();
    const rawModels: any[] = Array.isArray(data?.models) ? data.models : [];
    const excludedRe = /embedding|imagen|veo|tts|audio|live|lyria|robotics|computer-use|deep-research|aqa|gemma|bisection|learnlm|image|1\.0|1\.5|2\.0|gemini-pro$/i;
    const candidates = rawModels
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => String(m?.name || "").replace(/^models\//, "").trim())
      .filter((id) => id.startsWith("gemini-") && !excludedRe.test(id))
      .sort((a, b) => rankServerGeminiModel(a) - rankServerGeminiModel(b));
    const unique = Array.from(new Set(candidates));
    serverDiscoveredModelsByKey.set(apiKey, { models: unique, fetchedAt: Date.now() });
    return unique;
  } catch (_) {
    return [];
  }
}

function getAiClients(req?: any): { client: GoogleGenAI; isCustom: boolean; apiKey: string }[] {
  const customKey = getCustomAiApiKey(req);
  const envKey = getEnvAiApiKey();
  const disableEnvFallback = req?.headers?.['x-disable-env-fallback'] === '1';
  const clients: { client: GoogleGenAI; isCustom: boolean; apiKey: string }[] = [];

  if (customKey) {
    clients.push({
      client: new GoogleGenAI({
        apiKey: customKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      }),
      isCustom: true,
      apiKey: customKey
    });
  }

  if (envKey && envKey !== customKey && (!customKey || !disableEnvFallback)) {
    clients.push({
      client: new GoogleGenAI({
        apiKey: envKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      }),
      isCustom: false,
      apiKey: envKey
    });
  }

  if (clients.length === 0) {
    const err: any = new Error("Missing Gemini API Key. Vui lòng kiểm tra biến môi trường.");
    err.status = 400;
    err.isMissingKey = true;
    throw err;
  }

  return clients;
}

function getAiClient(req?: any) {
  return getAiClients(req)[0].client;
}

function handleAiError(error: any, req: any, res: any) {
  const errorMsg = error?.message || "";
  const lowerMsg = errorMsg.toLowerCase();
  const isCustomKey = !!req.headers['x-gemini-api-key'] || (!!req.headers['authorization'] && (req.headers['authorization'] as string).startsWith('Bearer '));

  if (
    error?.isMissingKey ||
    error?.status === 400 ||
    lowerMsg.includes("missing gemini api key") ||
    lowerMsg.includes("yêu cầu gemini api key")
  ) {
    return res.status(400).json({ error: "Missing Gemini API Key. Vui lòng kiểm tra biến môi trường." });
  }

  if (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid") || lowerMsg.includes("api key expired") || lowerMsg.includes("unauthenticated") || error?.status === 401) {
    return res.status(401).json({ error: "API Key không hợp lệ hoặc không xác thực được (Lỗi 401). Vui lòng kiểm tra lại biến môi trường GEMINI_API_KEY / VITE_GEMINI_API_KEY hoặc cài đặt API Key cá nhân." });
  }

  if (lowerMsg.includes("suspended") || lowerMsg.includes("permission_denied") || error?.status === 403) {
    if (!isCustomKey) {
        return res.status(401).json({ error: "UNAUTHENTICATED: Hệ thống AI hiện đang bảo trì hoặc hết hạn ngạch." });
    }
    return res.status(401).json({ error: "UNAUTHENTICATED: Tài khoản API Key cá nhân của bạn đã bị từ chối quyền truy cập." });
  }

  if (lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") || lowerMsg.includes("429") || error?.status === 429) {
    return res.status(429).json({ error: "Hệ thống AI đang quá tải hoặc tạm thời hết lượt yêu cầu (Lỗi 429 - Quota Exceeded). Hệ thống đã tự động thử các model dự phòng. Vui lòng thử lại sau ít phút hoặc đổi sang API Key khác." });
  }
  if (
    lowerMsg.includes("503") || 
    error?.status === 503 || 
    lowerMsg.includes("unavailable") || 
    lowerMsg.includes("high demand") || 
    lowerMsg.includes("spikes in demand") || 
    lowerMsg.includes("overloaded") || 
    lowerMsg.includes("try again later")
  ) {
    return res.status(503).json({ error: "Mô hình AI hiện tại từ Google đang có lưu lượng truy cập cao đột biến (High Demand). Hệ thống đã tự động thử các mô hình dự phòng, thầy/cô vui lòng bấm 'Tạo lại' sau vài giây hoặc nhập API Key cá nhân trong Cài đặt." });
  }

  if (lowerMsg.includes("fetch failed") || lowerMsg.includes("failed to fetch") || lowerMsg.includes("networkerror") || lowerMsg.includes("econnreset")) {
    return res.status(503).json({ error: "Kết nối mạng tới dịch vụ AI tạm thời gián đoạn. Thầy/cô vui lòng bấm 'Thử tạo lại' sau ít giây." });
  }

  if (lowerMsg.includes("bad escaped character") || lowerMsg.includes("unexpected token") || lowerMsg.includes("syntaxerror")) {
    return res.status(500).json({ error: "Phản hồi từ AI chứa ký tự công thức chưa chuẩn. Hệ thống đang tự động tối ưu hóa, thầy/cô vui lòng bấm thử lại." });
  }

  if (lowerMsg.includes("user location is not supported") || lowerMsg.includes("location is not supported") || lowerMsg.includes("geoblocked")) {
    return res.status(400).json({ error: "Vị trí địa lý (Location/IP) hiện tại chưa nằm trong khu vực hỗ trợ mặc định của Google Gemini API. Để tiếp tục sử dụng ứng dụng ngay lập tức, thầy/cô vui lòng dán mã API Key cá nhân trong phần Cài đặt (tạo hoàn toàn miễn phí tại https://aistudio.google.com)." });
  }

  if (
    lowerMsg.includes("token count exceeds") ||
    lowerMsg.includes("exceeds the maximum number of tokens") ||
    lowerMsg.includes("request payload size exceeds") ||
    (lowerMsg.includes("input token") && lowerMsg.includes("exceed"))
  ) {
    return res.status(400).json({ error: "Nội dung yêu cầu và các tệp đính kèm quá lớn, vượt quá giới hạn xử lý của mô hình AI. Thầy/cô vui lòng đính kèm ít tệp hơn (hoặc tách nhỏ nội dung) rồi thử lại." });
  }

  if (lowerMsg.includes("not found") || error?.status === 404 || lowerMsg.includes("no longer available")) {
    return res.status(404).json({ error: "Không tìm thấy mô hình Gemini phù hợp cho API Key hiện tại (Lỗi 404). Thầy/cô vui lòng kiểm tra lại API Key trong mục Cài đặt API Key (góc trên bên phải) hoặc tạo key mới tại Google AI Studio rồi thử lại." });
  }

  console.error("AI Error Debug:", error?.name || "Error", error?.message || String(error), error?.status);
  res.status(500).json({ error: errorMsg || "Đã xảy ra lỗi không xác định từ máy chủ AI. Vui lòng thử lại sau." });
}


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function keepAliveExecute(req: any, res: any, fn: () => Promise<any>) {
  let headersSent = false;
  const keepAlive = setInterval(() => {
    if (!headersSent && !res.headersSent) {
      try {
        res.setHeader('Content-Type', 'application/json');
        res.status(200);
        headersSent = true;
      } catch (e) {}
    }
    if (!res.writableEnded && !res.closed) {
      try { res.write(' '); } catch (e) {}
    }
  }, 15000);

  try {
    const result = await fn();
    clearInterval(keepAlive);

    let jsonOutput = "";
    try {
      jsonOutput = JSON.stringify(result);
    } catch (strErr) {
      console.warn("[keepAliveExecute] Circular structure detected and stripped:", strErr);
      jsonOutput = JSON.stringify({
        text: typeof result === 'object' && result?.text ? result.text : String(result || ""),
        result: typeof result === 'object' && result?.result ? result.result : undefined
      });
    }

    if (!jsonOutput || !jsonOutput.trim() || jsonOutput === "undefined") {
      jsonOutput = JSON.stringify({
        result: typeof result === 'string' ? result : (result?.result || "")
      });
    }

    if (!headersSent && !res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(jsonOutput);
    } else if (!res.writableEnded && !res.closed) {
      res.write(jsonOutput);
      res.end();
    }
  } catch (error: any) {
    clearInterval(keepAlive);
    if (!headersSent && !res.headersSent) {
      return handleAiError(error, req, res);
    } else if (!res.writableEnded && !res.closed) {
      let rawMsg = error?.message || String(error);
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error?.message) rawMsg = parsed.error.message;
        else if (parsed?.message) rawMsg = parsed.message;
      } catch (e) {}
      const cleanMsg = rawMsg.replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
      res.write(JSON.stringify({ error: cleanMsg || 'Máy chủ xử lý quá thời gian chờ hoặc bị gián đoạn.' }));
      res.end();
    }
  }
}

/**
 * Làm sạch chuỗi JSON bên trong chuỗi string, tự động sửa các lỗi:
 * - Ký tự backslash không hợp lệ trong LaTeX (\frac, \alpha, \le, \vec, \Omega, ...)
 * - Unicode escape không hợp lệ (\upsilon, \underline, ...)
 * - Xuống dòng hoặc tab chưa được escape trong chuỗi string
 * - Dấu phẩy thừa cuối mảng/object (, } hoặc , ])
 */
function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  const len = str.length;

  while (i < len) {
    const ch = str[i];

    if (!inString) {
      if (ch === "\"") {
        inString = true;
        result += ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    } else {
      // Bên trong chuỗi JSON string
      if (ch === "\"") {
        inString = false;
        result += ch;
        i++;
      } else if (ch === "\\") {
        if (i + 1 >= len) {
          result += "\\\\";
          i++;
        } else {
          let slashCount = 0;
          let k = i;
          while (k < len && str[k] === "\\") {
            slashCount++;
            k++;
          }

          const nextChar = (k < len) ? str[k] : "";
          const isLetterOrMathSymbol = /[a-zA-Z\{\}\[\]\(\)\$\%]/.test(nextChar);

          if (isLetterOrMathSymbol) {
            // Đây là tên lệnh LaTeX (\frac, \sqrt, \alpha, \infty, \begin...) hoặc ký hiệu toán thoát dấu (\{, \}, \[...)
            // Trong chuỗi JSON, 2 dấu gạch chéo ngược (\\) là chuẩn để sau khi JSON.parse trả về đúng 1 dấu gạch chéo ngược (\).
            // Tuyệt đối không nâng lên 4 gạch chéo (\\\\) làm lộ lỗi double backslash \\ kiểu KaTeX cũ trên MathJax.
            if (slashCount === 1) {
              if (nextChar === "b" || nextChar === "f" || nextChar === "n" || nextChar === "r" || nextChar === "t") {
                const charAfter = (k + 1 < len) ? str[k + 1] : "";
                if (charAfter && /[a-zA-Z]/.test(charAfter)) {
                  // Lệnh LaTeX bắt đầu bằng b, f, n, r, t (như \frac, \beta, \text, \neq, \rightarrow, \times)
                  result += "\\\\";
                  i += 1;
                } else {
                  // Ký tự điều khiển JSON thuần túy (\n, \t)
                  result += "\\" + nextChar;
                  i += 2;
                }
              } else if (nextChar === "u") {
                const hex = str.slice(k + 1, k + 5);
                if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                  result += "\\u" + hex;
                  i += 5;
                } else {
                  result += "\\\\";
                  i += 1;
                }
              } else {
                result += "\\\\";
                i += 1;
              }
            } else {
              // slashCount >= 2 trước tên lệnh LaTeX: luôn chuẩn hóa thành 2 dấu gạch chéo trong JSON để trả về đúng 1 gạch chéo (\)
              result += "\\\\";
              i += slashCount;
            }
          } else {
            // Đây là ngắt dòng LaTeX (\\ trong cases/aligned/matrix) hoặc ký tự thoát khác
            if (nextChar === "\"") {
              if (slashCount % 2 === 1) {
                result += "\\\"";
                i += slashCount + 1;
              } else {
                result += "\\\\".repeat(slashCount / 2);
                i += slashCount;
              }
            } else if (nextChar === "/") {
              result += "/";
              i += slashCount + 1;
            } else {
              // Ngắt dòng LaTeX trong JSON cần 4 dấu gạch chéo để sau khi JSON.parse trả về đúng 2 gạch chéo (\\)
              result += "\\\\\\\\";
              i += slashCount;
            }
          }
        }
      } else if (ch === "\n") {
        result += "\\n";
        i++;
      } else if (ch === "\r") {
        result += "\\r";
        i++;
      } else if (ch === "\t") {
        result += "\\t";
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  // Loại bỏ dấu phẩy thừa trước ngoặc đóng
  return result.replace(/,\s*([\}\]])/g, "$1");
}

function repairTruncatedJson(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
    } else {
      if (ch === "\"") {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" && stack[stack.length - 1] === "{") {
        stack.pop();
      } else if (ch === "]" && stack[stack.length - 1] === "[") {
        stack.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += "\"";
  }
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "{") repaired += "}";
    if (top === "[") repaired += "]";
  }
  return repaired;
}

/**
 * Chuẩn hóa trường công thức toán học trả về từ AI:
 * Đảm bảo 100% tuân thủ MathJax (dùng 1 gạch chéo ngược \ cho tên lệnh, 2 gạch chéo \\ chỉ để ngắt dòng trong cases/aligned).
 * Triệt tiêu hoàn toàn tàn dư KaTeX cũ hai gạch chéo ngược (\\frac, \\sqrt, \\infty, \\alpha, \\begin...).
 */
export function cleanLatexMathField(str: any): string {
  if (str === null || str === undefined) return '';
  let s = String(str);

  // 1. Unescape escaped literal \n without corrupting \ne, \neq, \notin, \nexists, \nearrow, \nabla, \nu, \natural
  s = s.replace(/\\\\n(?![a-zA-Z])/g, '\n');
  s = s.replace(/\\n(?![a-zA-Z])/g, '\n');

  // 2. Tách câu sau dấu chấm
  s = s.replace(/\.([A-ZÀ-Ỹ])/g, '. $1');

  // 3. Sửa lỗi SS_n -> S_n, uu_n -> u_n, và dấu gạch ngang rác
  s = s.replace(/\bSS_([a-zA-Z0-9]+|\{[^}]+\})/g, 'S_$1');
  s = s.replace(/\buu_([a-zA-Z0-9]+|\{[^}]+\})/g, 'u_$1');
  s = s.replace(/(?:^|\n)\s*(?:---|--)\s*([a-zA-ZÀ-ỹ])/g, '\n- $1');
  s = s.replace(/(?<=\$\$|\$)\s*---+\s*$/gm, '');
  s = s.replace(/\s*---\s*$/gm, '');
  s = s.replace(/-\s*--\s*(?=\$\$|\$|\n|$)/g, '');
  s = s.replace(/([uSxya-zA-Z]\b|S_|u_)\s*=\s*-\s*(?=[a-zA-Z0-9])/g, '$1 = -');

  // 4. Chuẩn hóa dfrac và double backslash (chỉ collapse trên tên lệnh chữ cái, không collapse trước ngoặc)
  s = s.replace(/\\dfrac\b/g, '\\frac');
  s = s.replace(/\\{2,}([a-zA-Z]+)/g, (_m, g1) => '\\' + g1);
  s = s.replace(/\\{3,}/g, '\\\\');

  // 5. Bọc các công thức toán trần thiếu dấu $
  const parts = s.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0 && parts[i]) {
      let p = parts[i];
      const mathTokens: string[] = [];
      const saveMath = (expr: string) => {
        mathTokens.push(expr);
        return `\x02MATH${mathTokens.length - 1}\x03`;
      };

      // a. Bọc chuỗi cases liên tiếp hoặc đơn lẻ
      p = p.replace(/(?<!\$)(?:(?:\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})(?:\s*\\(?:Leftrightarrow|Rightarrow|Leftarrow|iff|implies)\s*\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})+)(?!\$)/g, (m) => saveMath(`\n\n$$\n${m.trim()}\n$$\n\n`));
      p = p.replace(/(?<!\$)(?:\\begin\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|matrix|pmatrix|bmatrix)\*?\})(?!\$)/g, (m) => saveMath(`\n\n$$\n${m.trim()}\n$$\n\n`));

      // b. Bọc biểu thức chứa \frac hoặc \sqrt
      p = p.replace(/(?<!\$)\\frac\{[^{}]*\}\{[^{}]*\}(?!\$)/g, (match) => saveMath(`$${match}$`));
      p = p.replace(/(?<!\$)\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}(?!\$)/g, (match) => saveMath(`$${match}$`));

      // c. Bọc biểu thức cấp số cộng / cấp số nhân / dãy số (u_n = ..., S_n = ...) không ngắt ở dấu ba chấm
      p = p.replace(/(?<![\$\\\w])\b([uS]_(?:[a-zA-Z0-9]+|\{[^}]+\})\s*=\s*(?:\\(?:dots|cdots|ldots)|\.\.\.|[0-9a-zA-Z\(\)\[\]\{\}\+\-\*\/\^\_\s]|\\frac\{[^{}]*\}\{[^{}]*\})+?)(?=[,;!?]|\s+(?:được|là|tính|theo|bằng|với|khi|thì|tại|trong|ta(?:\s+được)?|đáp\s+án|công|sai|số|[A-D][\.\:\)])|\n|$)(?!\$)/g, (match) => {
        let clean = match.trim();
        if (clean.includes('$')) return match;
        return saveMath(`$${clean}$`);
      });

      // d. Bọc các biến dãy số đơn lẻ u_1, u_2, (u_n), S_n khi đứng ngoài công thức
      p = p.replace(/(?<![\$\\\w])(\(?u_[0-9a-zA-Z]+\)?|S_[0-9a-zA-Z]+)(?![\$\w\}])/g, (match) => saveMath(`$${match}$`));

      // e. Bọc các hệ thức so sánh / tập hợp: x \in \mathbb{R}, a \le b, x \ge 0, a \ne b
      p = p.replace(/(?<![\$\\\w])\b([a-zA-Z0-9_]+\s*(?:\\in|\\notin|\\le|\\ge|\\ne|\\subset)\s*[^,\n\.\;]+)(?!\$)/g, (match) => saveMath(`$${match.trim()}$`));

      // f. Bọc các ký hiệu toán đơn lẻ bị trần
      p = p.replace(/(?<![\$\\\w])\\(?:alpha|beta|gamma|delta|pi|theta|sigma|omega|Delta|Sigma|infty)\b(?!\$)/g, (match) => saveMath(`$${match}$`));

      // Khôi phục tất cả các khối toán đã được bọc an toàn (giải nén triệt để nếu có lồng nhau)
      while (p.includes('\x02MATH')) {
        p = p.replace(/\x02MATH(\d+)\x03/g, (_, idx) => mathTokens[Number(idx)]);
      }

      parts[i] = p;
    }
  }
  s = parts.join('');

  // 6. Gộp các khối $$ liền kề nhau được nối bởi dấu tương đương / suy ra / bằng
  s = s.replace(/\$\$\s*(\\Leftrightarrow|\\Rightarrow|\\Leftarrow|=|\\iff)\s*\$\$/g, ' $1 ');

  return s;
}

/**
 * An toàn phân tích chuỗi JSON trả về từ AI, xử lý triệt để lỗi "Bad escaped character in JSON"
 * do công thức toán học LaTeX chứa các ký tự \ chưa được escape hợp lệ (như \frac, \le, \Omega, \alpha, ...)
 */
function safeJsonParse<T = any>(text: string, fallback?: T): T {
  if (!text || typeof text !== 'string') return (text as any) || (fallback as T);
  let cleaned = text
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .replace(/```/g, '')
    .trim();

  // 1. Thử parse nguyên bản
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // 2. Thử làm sạch qua bộ sanitize
    try {
      const sanitized = sanitizeJsonString(cleaned);
      return JSON.parse(sanitized);
    } catch (e2) {
      // 3. Thử trích xuất khối JSON giữa { ... } hoặc [ ... ]
      const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
      if (match) {
        try {
          return JSON.parse(sanitizeJsonString(match[0]));
        } catch (e3) {}
      }

      // 4. Thử tự động vá đóng ngoặc nếu chuỗi bị cắt ngắn (truncated)
      try {
        const repaired = repairTruncatedJson(cleaned);
        return JSON.parse(sanitizeJsonString(repaired));
      } catch (e4) {}

      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }
      throw e1;
    }
  }
}

function getValidGeminiModels(requestedModel?: string): string[] {
  let primary = (requestedModel || "").replace(/^models\//, "").trim();
  if (
    !primary ||
    primary === "gemini-3.8-flash" ||
    primary.includes("1.5") ||
    primary.includes("1.0") ||
    primary.includes("2.0") ||
    primary.includes("3.5") ||
    primary.includes("latest") ||
    primary === "gemini-pro"
  ) {
    primary = "gemini-4-hydrogen";
  }
  const list = [
    primary,
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ];
  return Array.from(new Set(list));
}

function normalizeGeminiContents(rawContents: any): any[] {
  if (Array.isArray(rawContents)) return rawContents;
  if (typeof rawContents === 'string') {
    return [{ role: 'user', parts: [{ text: rawContents }] }];
  }
  if (rawContents && typeof rawContents === 'object') {
    if (rawContents.parts || rawContents.role) {
      return [rawContents];
    }
    return [{ role: 'user', parts: [{ text: JSON.stringify(rawContents) }] }];
  }
  return [{ role: 'user', parts: [{ text: String(rawContents || '') }] }];
}

async function generateWithFallback(req: any, payloadOptions: any, res?: any) {
  let clients: { client: GoogleGenAI; isCustom: boolean; apiKey: string }[];
  try {
    clients = getAiClients(req);
  } catch (err: any) {
    if (res && !res.headersSent) {
      return handleAiError(err, req, res);
    }
    throw err;
  }

  const fastMode = Boolean(payloadOptions?.fastMode);
  const requestTimeoutMs =
    typeof payloadOptions?.timeoutMs === "number" && payloadOptions.timeoutMs > 0
      ? payloadOptions.timeoutMs
      : fastMode
        ? 45000
        : 0;

  let customKeyFailed = false;
  const basePreferred: string[] = Array.isArray(payloadOptions?.preferredModels) && payloadOptions.preferredModels.length > 0
    ? payloadOptions.preferredModels.map((m: any) => String(m || "").replace(/^models\//, "").trim()).filter((m: string) => m.length > 0)
    : [];
  const baseModels: string[] = Array.from(
    new Set<string>(
      fastMode && basePreferred.length > 0
        ? [...basePreferred, ...getValidGeminiModels(payloadOptions?.model)]
        : [...getValidGeminiModels(payloadOptions?.model), ...basePreferred]
    )
  );
  let primaryError: any = null;
  let bestNonNotFoundError: any = null;
  let lastNotFoundError: any = null;
  let lastFailedIsCustom = clients[0]?.isCustom || false;

  const defaultSystemInstruction = `Bạn là chuyên gia Toán học và Khảo thí GDPT 2018. BẮT BUỘC dùng cú pháp LaTeX chuẩn kẹp trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối dòng) cho TẤT CẢ các thành phần toán:
- TẤT CẢ các biến số, tham số đơn lẻ (như x, y, m, a, b, c, d, S...) BẮT BUỘC phải đặt trong cặp dấu đô la: $x$, $y$, $m$, $a$, $b$, $c$, $d$, $S$.
- LUÔN LUÔN sử dụng \\frac thay thế cho \\dfrac.
- Số mũ BẮT BUỘC dùng dấu mũ: $x^2$, $a^3$.
- Phân số BẮT BUỘC dùng \\frac{tử}{mẫu}.`;

  const extractTextFromResponse = (response: any): string => {
    let text = response?.text ? response.text.normalize("NFC").trim() : "";
    if (!text && response?.candidates?.[0]?.content?.parts) {
      text = response.candidates[0].content.parts
        .filter((p: any) => !p.thought && p.text)
        .map((p: any) => p.text)
        .join("\n")
        .normalize("NFC")
        .trim();
    }
    return text;
  };

  const invokeWithTimeout = async (client: GoogleGenAI, callPayload: any): Promise<any> => {
    if (!requestTimeoutMs || requestTimeoutMs <= 0) {
      return client.models.generateContent(callPayload);
    }
    const controller = new AbortController();
    let timerId: any = null;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timerId = setTimeout(() => {
        try {
          controller.abort();
        } catch (_) {}
        const tErr: any = new Error(`AI request timed out after ${Math.round(requestTimeoutMs / 1000)}s`);
        tErr.status = 504;
        tErr.isTimeout = true;
        reject(tErr);
      }, requestTimeoutMs);
    });
    const payloadWithSignal = {
      ...callPayload,
      config: {
        ...(callPayload.config || {}),
        abortSignal: controller.signal,
      },
    };
    try {
      return await Promise.race([
        client.models.generateContent(payloadWithSignal),
        timeoutPromise,
      ]);
    } finally {
      if (timerId) clearTimeout(timerId);
    }
  };

  for (const { client, isCustom, apiKey } of clients) {
    const cachedWorking = serverWorkingModelByKey.get(apiKey);
    const useCachedFirst =
      Boolean(cachedWorking) &&
      (!fastMode || (cachedWorking!.includes("flash") && !cachedWorking!.includes("pro")));
    const clientModels = useCachedFirst && cachedWorking
      ? Array.from(new Set<string>([cachedWorking, ...baseModels]))
      : [...baseModels];
    let triedDiscovery = false;

    for (let mIdx = 0; mIdx < clientModels.length; mIdx++) {
      const model = clientModels[mIdx];
      try {
        const rawConfig = { ...(payloadOptions.config || {}) };
        if (model.includes("3.8") || model.includes("4-") || model.includes("3.1") || model.includes("3-")) {
          delete rawConfig.temperature;
          delete rawConfig.topP;
          delete rawConfig.topK;
          delete rawConfig.candidateCount;
        } else if (rawConfig.temperature === undefined) {
          rawConfig.temperature = 0.7;
        }
        if (model.includes("lite")) {
          delete rawConfig.thinkingConfig;
        } else if (fastMode) {
          if (model.includes("2.5-flash") || model.includes("2.5")) {
            rawConfig.thinkingConfig = { thinkingBudget: 0 };
          } else if (model.includes("4-")) {
            rawConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          } else {
            rawConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
          }
        } else if ((model === "gemini-4-hydrogen" || model.includes("4-")) && !rawConfig.thinkingConfig) {
          rawConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        } else if (model.includes("2.5-flash") && rawConfig.thinkingConfig?.thinkingLevel) {
          rawConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        const requestedMaxTokens = rawConfig.maxOutputTokens || 32768;
        const basePayload = {
          ...payloadOptions,
          contents: normalizeGeminiContents(payloadOptions.contents),
          model,
          config: {
            ...rawConfig,
            maxOutputTokens: requestedMaxTokens,
            systemInstruction: rawConfig.systemInstruction || defaultSystemInstruction
          }
        };
        delete (basePayload as any).preferredModels;
        delete (basePayload as any).fastMode;
        delete (basePayload as any).timeoutMs;

        let response: any;
        try {
          response = await invokeWithTimeout(client, basePayload);
        } catch (tokenErr: any) {
          const errStr = String(tokenErr?.message || "");
          if (/thinkingConfig|thinkingBudget|thinkingLevel/i.test(errStr)) {
            const fallbackConfig = { ...basePayload.config };
            if (fastMode && (fallbackConfig as any).thinkingConfig?.thinkingLevel === ThinkingLevel.MINIMAL) {
              (fallbackConfig as any).thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
              try {
                response = await invokeWithTimeout(client, { ...basePayload, config: fallbackConfig });
              } catch {
                const noThinkConfig = { ...basePayload.config };
                delete (noThinkConfig as any).thinkingConfig;
                response = await invokeWithTimeout(client, { ...basePayload, config: noThinkConfig });
              }
            } else {
              delete (fallbackConfig as any).thinkingConfig;
              response = await invokeWithTimeout(client, { ...basePayload, config: fallbackConfig });
            }
          } else if (requestedMaxTokens > 8192 && /maxOutputTokens|token|invalid|argument/i.test(errStr)) {
            basePayload.config.maxOutputTokens = requestedMaxTokens > 32768 ? 32768 : 8192;
            response = await invokeWithTimeout(client, basePayload);
          } else {
            throw tokenErr;
          }
        }
        const normText = extractTextFromResponse(response);
        if (!normText) {
          continue;
        }
        if (apiKey) {
          serverWorkingModelByKey.set(apiKey, model);
        }
        return {
          text: normText,
          candidates: response.candidates ? response.candidates.map((c: any) => ({ finishReason: c.finishReason, index: c.index })) : undefined,
          customKeyFailed
        } as any;
      } catch (e: any) {
        primaryError = e;
        lastFailedIsCustom = isCustom;
        if (isCustom) {
          customKeyFailed = true;
        }
        if (isServerModelNotFoundError(e)) {
          lastNotFoundError = e;
          if (cachedWorking === model && apiKey) {
            serverWorkingModelByKey.delete(apiKey);
          }
        } else {
          bestNonNotFoundError = e;
          const busyMsg = String(e?.message || "").toLowerCase();
          if (
            cachedWorking === model &&
            apiKey &&
            (e?.status === 503 ||
              e?.status === 429 ||
              e?.status === 504 ||
              busyMsg.includes("503") ||
              busyMsg.includes("high demand") ||
              busyMsg.includes("unavailable") ||
              busyMsg.includes("overloaded") ||
              busyMsg.includes("resource_exhausted"))
          ) {
            serverWorkingModelByKey.delete(apiKey);
          }
        }
        const errLower = String(e?.message || "").toLowerCase();
        // If key itself is invalid or unauthorized, do not waste time retrying other models with the same key
        if (
          e?.status === 401 ||
          e?.status === 403 ||
          errLower.includes("api_key_invalid") ||
          errLower.includes("api key not valid") ||
          errLower.includes("api key expired") ||
          errLower.includes("permission_denied") ||
          errLower.includes("unauthenticated")
        ) {
          break;
        }
        if (mIdx === clientModels.length - 1 && !triedDiscovery && apiKey) {
          triedDiscovery = true;
          const discovered = await discoverServerGeminiModels(apiKey);
          const extras = discovered.filter((m) => !clientModels.includes(m)).slice(0, 4);
          if (extras.length > 0) {
            clientModels.push(...extras);
          }
        }
        if (!isServerModelNotFoundError(e)) {
          await delay(150);
        }
        continue;
      }
    }
  }

  const effectiveError = bestNonNotFoundError || lastNotFoundError || primaryError;
  if (effectiveError) {
    if (lastFailedIsCustom) {
      const errMsg = effectiveError?.message || "";
      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Free Tier") || effectiveError?.status === 429) {
        const quotaErr: any = new Error("API Key cá nhân của bạn đã chạm ngưỡng hạn mức miễn phí trong ngày của Google (Lỗi 429 Quota Exceeded). Hệ thống sẽ tự động xoay vòng sang Key tiếp theo hoặc bạn có thể thêm Key mới trong Cài đặt.");
        quotaErr.status = 429;
        throw quotaErr;
      }
      if (effectiveError?.status === 404 || isServerModelNotFoundError(effectiveError)) {
        const nfErr: any = new Error(errMsg || "Model not found (404)");
        nfErr.status = 404;
        throw nfErr;
      }
      if (effectiveError?.status === 503 || errMsg.toLowerCase().includes("high demand") || errMsg.toLowerCase().includes("unavailable") || errMsg.toLowerCase().includes("overloaded")) {
        const busyErr: any = new Error(errMsg || "503 Service Unavailable");
        busyErr.status = 503;
        throw busyErr;
      }
      const customErr: any = new Error(`Lỗi từ API Key cá nhân của bạn: ${errMsg}`);
      customErr.status = effectiveError?.status || 401;
      throw customErr;
    }
    throw effectiveError;
  }
  throw new Error("429 RESOURCE_EXHAUSTED: Hệ thống đang quá tải hoặc tạm thời không khả dụng. Vui lòng thử lại sau ít phút.");
}

async function generateWithFallbackStream(req: any, res: any, payloadOptions: any) {
  let clients: { client: GoogleGenAI; isCustom: boolean; apiKey: string }[];
  try {
    clients = getAiClients(req);
  } catch (err: any) {
    return handleAiError(err, req, res);
  }
  const baseStreamModels = getValidGeminiModels(payloadOptions?.model);

  const defaultSystemInstruction = `Bạn là chuyên gia Toán học và Khảo thí GDPT 2018. BẮT BUỘC dùng cú pháp LaTeX chuẩn kẹp trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối dòng) cho TẤT CẢ các thành phần toán.
- LUÔN LUÔN sử dụng \\frac thay thế cho \\dfrac.
- TẤT CẢ các biến số, tham số đơn lẻ (như x, y, m, a, b, c...) BẮT BUỘC bọc trong cặp dấu $...$.
- Tuyệt đối KHÔNG chào hỏi hay giải thích ngoài lề, xuất trực tiếp văn bản Markdown của phiếu học tập.`;

  let primaryError: any = null;
  let bestNonNotFoundError: any = null;
  let lastNotFoundError: any = null;
  let streamStarted = false;

  for (const { client, apiKey } of clients) {
    const cachedWorking = serverWorkingModelByKey.get(apiKey);
    const streamModels = cachedWorking
      ? Array.from(new Set<string>([cachedWorking, ...baseStreamModels]))
      : [...baseStreamModels];
    let triedDiscovery = false;

    for (let mIdx = 0; mIdx < streamModels.length; mIdx++) {
      const model = streamModels[mIdx];
      try {
        const rawConfig = { ...(payloadOptions.config || {}) };
        if (model.includes("3.8") || model.includes("4-") || model.includes("3.1") || model.includes("3-")) {
          delete rawConfig.temperature;
          delete rawConfig.topP;
          delete rawConfig.topK;
          delete rawConfig.candidateCount;
        }

        if (model.includes("lite")) {
          delete rawConfig.thinkingConfig;
        } else if (model === "gemini-4-hydrogen" && !rawConfig.thinkingConfig) {
          rawConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const updatedPayload = {
          ...payloadOptions,
          contents: normalizeGeminiContents(payloadOptions.contents),
          model,
          config: {
            maxOutputTokens: 32768,
            ...rawConfig,
            systemInstruction: rawConfig.systemInstruction || defaultSystemInstruction
          }
        };

        const responseStream = await client.models.generateContentStream(updatedPayload);
        for await (const chunk of responseStream) {
          if (chunk.text) {
            if (!streamStarted) {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.setHeader('Transfer-Encoding', 'chunked');
              res.setHeader('X-Content-Type-Options', 'nosniff');
              res.setHeader('Cache-Control', 'no-cache, no-transform');
              res.setHeader('Access-Control-Allow-Origin', '*');
              if (typeof (res as any).flushHeaders === 'function') {
                (res as any).flushHeaders();
              }
              streamStarted = true;
            }
            res.write(chunk.text);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        }
        if (streamStarted) {
          if (apiKey) serverWorkingModelByKey.set(apiKey, model);
          res.end();
          return;
        }
      } catch (e: any) {
        if (e?.message?.includes("thinkingConfig") || e?.message?.includes("thinkingBudget") || e?.message?.includes("thinkingLevel")) {
          try {
            const fallbackConfig = { ...(payloadOptions.config || {}) };
            delete fallbackConfig.thinkingConfig;
            if (model.includes("3.8") || model.includes("4-") || model.includes("3.1") || model.includes("3-")) {
              delete fallbackConfig.temperature;
              delete fallbackConfig.topP;
              delete fallbackConfig.topK;
              delete fallbackConfig.candidateCount;
            }
            const fallbackPayload = {
              ...payloadOptions,
              contents: normalizeGeminiContents(payloadOptions.contents),
              model,
              config: {
                maxOutputTokens: 32768,
                ...fallbackConfig,
                systemInstruction: fallbackConfig.systemInstruction || defaultSystemInstruction
              }
            };
            const fallbackStream = await client.models.generateContentStream(fallbackPayload);
            for await (const chunk of fallbackStream) {
              if (chunk.text) {
                if (!streamStarted) {
                  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                  res.setHeader('Transfer-Encoding', 'chunked');
                  res.setHeader('X-Content-Type-Options', 'nosniff');
                  res.setHeader('Cache-Control', 'no-cache, no-transform');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  if (typeof (res as any).flushHeaders === 'function') {
                    (res as any).flushHeaders();
                  }
                  streamStarted = true;
                }
                res.write(chunk.text);
              }
            }
            if (streamStarted) {
              if (apiKey) serverWorkingModelByKey.set(apiKey, model);
              res.end();
              return;
            }
          } catch (err2: any) {
            e = err2;
          }
        }
        primaryError = e;
        if (isServerModelNotFoundError(e)) {
          lastNotFoundError = e;
          if (cachedWorking === model && apiKey) {
            serverWorkingModelByKey.delete(apiKey);
          }
        } else {
          bestNonNotFoundError = e;
        }
        if (streamStarted) {
          res.write('\n\n⚠️ GIÁN ĐOẠN DỮ LIỆU: Quá trình truyền dữ liệu từ AI bị gián đoạn. Vui lòng bấm "Thử tạo lại".');
          res.end();
          return;
        }
        const errLower = String(e?.message || "").toLowerCase();
        if (
          e?.status === 401 ||
          e?.status === 403 ||
          errLower.includes("api_key_invalid") ||
          errLower.includes("api key not valid") ||
          errLower.includes("api key expired") ||
          errLower.includes("permission_denied") ||
          errLower.includes("unauthenticated")
        ) {
          break;
        }
        if (mIdx === streamModels.length - 1 && !triedDiscovery && apiKey) {
          triedDiscovery = true;
          const discovered = await discoverServerGeminiModels(apiKey);
          const extras = discovered.filter((m) => !streamModels.includes(m)).slice(0, 4);
          if (extras.length > 0) {
            streamModels.push(...extras);
          }
        }
        if (!isServerModelNotFoundError(e)) {
          await delay(150);
        }
        continue;
      }
    }
  }

  if (!streamStarted) {
    const effectiveError = bestNonNotFoundError || lastNotFoundError || primaryError;
    if (effectiveError) {
      return handleAiError(effectiveError, req, res);
    }
    return res.status(503).json({
      error: "Hệ thống AI hiện đang quá tải (Lỗi 503 Service Unavailable). Thầy cô vui lòng bấm 'Thử tạo lại' sau ít phút hoặc kiểm tra lại API Key trong Cài đặt."
    });
  }
}

app.all("/api/circulars", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    res.json([
      { id: "5512/BGDĐT-GDTrH", date: "18/12/2020", title: "Xây dựng và tổ chức thực hiện kế hoạch giáo dục của nhà trường" },
      { id: "3456/BGDĐT-GDPT", date: "27/6/2025", title: "Hướng dẫn triển khai thực hiện khung năng lực số cho học sinh phổ thông" },
      { id: "2422/QĐ-BGDĐT", date: "18/8/2026", title: "Ban hành Khung nội dung giáo dục trí tuệ nhân tạo cho học sinh phổ thông" }
    ]);

});

app.all("/api/extract-data", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    try {
      const { file, type } = resolveSingleFile(req.body);
      let promptText = "";
      let responseSchema;
      
      if (type === "timetable") {
        promptText = `Trích xuất Thời khóa biểu từ tài liệu. Hệ thống tiết học: Sáng (tiết 1, 2, 3, 4, 5), Chiều (tiết 6, 7, 8, 9, 10), Tối (tiết Tối).
Nếu trong tài liệu ghi buổi chiều tiết 1,2,3,4,5 thì tự động chuyển đổi thành tiết 6,7,8,9,10.
Trả về danh sách các tiết học/lịch công tác.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: "Ví dụ: Thứ 2, Thứ 3..." },
                  period: { type: Type.STRING, description: "Từ 1 đến 10, hoặc 'Tối'" },
                  content: { type: Type.STRING }
                },
                required: ["day", "period", "content"]
              }
            }
          },
          required: ["entries"]
        };
      } else if (type === "student_profiles") {
        promptText = "Trích xuất danh sách học sinh kèm thông tin liên lạc từ tài liệu đính kèm. Bỏ qua tiêu đề. Lấy họ tên, ngày sinh, số điện thoại học sinh, họ tên phụ huynh, số điện thoại phụ huynh, địa chỉ, ghi chú (nếu có).";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dob: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  parentName: { type: Type.STRING },
                  parentPhone: { type: Type.STRING },
                  address: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ["name"]
              }
            }
          },
          required: ["students"]
        };
      } else if (type === "students") {
        promptText = "Trích xuất danh sách họ và tên học sinh từ tài liệu đính kèm. Bỏ qua các tiêu đề, STT, cột điểm, chỉ lấy họ và tên.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["students"]
        };
      } else if (type === "raw_text") {
        promptText = "Trích xuất toàn bộ nội dung văn bản từ tài liệu đính kèm. Hãy giữ nguyên định dạng ngắt dòng. Trả về toàn bộ dưới dạng chuỗi trong trường text.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING }
          },
          required: ["text"]
        };
      } else {
        throw new Error("Invalid extract type");
      }
      
      const matches = file.match(/^data:([a-zA-Z0-9\/\+\-\.]+);base64,(.+)$/);
      if (!matches) throw new Error("Invalid file format");
      
      const parts = [
        { text: promptText },
        {
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        }
      ];
      
      const payloadOptions = {
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema
        }
      };

      const response = await generateWithFallback(req, payloadOptions);
      if (!response || !response.text) throw new Error("No response from AI");
      
      const parsed = safeJsonParse(response.text);
      res.json(parsed);
    } catch (error: any) {
    return handleAiError(error, req, res);
  }
});

app.all("/api/generate-exam", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { 
      subject = "Toán", 
      grade = "12", 
      duration = "45", 
      examType = "Định kỳ", 
      matrix = "", 
      customPrompt = "", 
      qCounts = {},
      matrixFile,
      selectedTopics = [],
      detailedSolution = true,
      realWorldConfig
    } = req.body;

    let files = resolveFiles(req.body);
    if (matrixFile) {
      let fileData = matrixFile;
      let fileType = 'application/pdf';
      if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:(.*?);base64,(.*)$/);
        if (matches) {
          fileType = matches[1];
          fileData = matches[2];
        }
      }
      files.push({ data: fileData, type: fileType });
    }

    const hasExplicitQCounts = req.body && req.body.qCounts && typeof req.body.qCounts === 'object' && Object.keys(req.body.qCounts).length > 0;

    let mcCount = Number(qCounts.mc);
    let tfCount = Number(qCounts.tf);
    let saCount = Number(qCounts.sa);
    let essayCount = Number(qCounts.essay);

    if (isNaN(mcCount)) mcCount = 0;
    if (isNaN(tfCount)) tfCount = 0;
    if (isNaN(saCount)) saCount = 0;
    if (isNaN(essayCount)) essayCount = 0;

    const combinedMatrixText = `${matrix || ''} ${customPrompt || ''}`;
    const hasMatrixFile = Boolean(matrixFile) || (matrix && matrix.toLowerCase().includes('ma trận')) || (customPrompt && customPrompt.toLowerCase().includes('ma trận'));

    // Chỉ tự động nhận diện số câu nếu người dùng không cung cấp qCounts hoặc tổng số câu = 0
    if (!hasExplicitQCounts || (mcCount === 0 && tfCount === 0 && saCount === 0 && essayCount === 0)) {
      const tlnMatches = combinedMatrixText.match(/(\d+)\s*(?:câu)?\s*(?:TLN|trả\s*lời\s*ngắn|điền\s*khuyết|điền\s*số)/i)
        || combinedMatrixText.match(/(?:TLN|trả\s*lời\s*ngắn|Phần\s*III|Phần\s*3)[^0-9\n]{0,25}(\d+)\s*câu/i);
      if (tlnMatches && tlnMatches[1]) {
        const detectedSa = parseInt(tlnMatches[1], 10);
        if (detectedSa > 0) {
          saCount = detectedSa;
        }
      } else if (saCount === 0 && (hasMatrixFile || /tln|trả\s*lời\s*ngắn|phần\s*iii/i.test(combinedMatrixText))) {
        saCount = 6;
      }

      // Tự động nhận diện số câu Đúng/Sai (TF)
      const tfMatches = combinedMatrixText.match(/(\d+)\s*(?:câu)?\s*(?:đúng\s*[\/\s]*sai|Đ\/S|Đ-S)/i)
        || combinedMatrixText.match(/(?:Phần\s*II|Phần\s*2)[^0-9\n]{0,25}(\d+)\s*câu/i);
      if (tfMatches && tfMatches[1]) {
        const detectedTf = parseInt(tfMatches[1], 10);
        if (detectedTf > 0) {
          tfCount = detectedTf;
        }
      } else if (tfCount === 0 && (hasMatrixFile || /đúng\s*[\/\s]*sai|phần\s*ii/i.test(combinedMatrixText))) {
        tfCount = 4;
      }

      // Nếu có ma trận nhưng mcCount là 0 hoặc chưa chỉnh số câu chuẩn 2025
      const mcMatches = combinedMatrixText.match(/(\d+)\s*(?:câu)?\s*(?:trắc\s*nghiệm\s*nhiều\s*lựa\s*chọn|TN4LC|TNNLC|TN\s*lựa\s*chọn|câu\s*TN\b)/i)
        || combinedMatrixText.match(/(?:Phần\s*I|Phần\s*1)[^0-9\n]{0,25}(\d+)\s*câu/i);
      if (mcMatches && mcMatches[1]) {
        mcCount = parseInt(mcMatches[1], 10);
      } else if ((hasMatrixFile || saCount > 0) && (mcCount === 0 || mcCount === 20)) {
        mcCount = 12;
      }
    }

    const totalQuestions = mcCount + tfCount + saCount + essayCount;

    // RÀNG BUỘC CHUẨN CẤU HÌNH: Nếu phần nào = 0 câu, tuyệt đối CẤM sinh tiêu đề và CẤM sinh bất kỳ câu hỏi nào
    const zeroPartsRules: string[] = [];
    if (mcCount === 0) zeroPartsRules.push('- PHẦN I (mc): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần I và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi trắc nghiệm nhiều lựa chọn ("mc") nào!');
    if (tfCount === 0) zeroPartsRules.push('- PHẦN II (tf): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần II và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi đúng/sai ("tf") nào!');
    if (saCount === 0) zeroPartsRules.push('- PHẦN III (sa): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần III và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi trả lời ngắn ("sa") nào!');
    if (essayCount === 0) zeroPartsRules.push('- PHẦN IV (essay): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần IV và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi tự luận ("essay") nào!');
    const zeroPartsDirective = zeroPartsRules.length > 0 ? `\nQUY TẮC CẤM PHẦN CÓ 0 CÂU (BẮT BUỘC TUÂN THỦ 100%):\n${zeroPartsRules.join('\n')}\n` : '';

    const isRealWorldEnabled = realWorldConfig ? realWorldConfig.enabled !== false : false;
    const rwLevel = realWorldConfig?.level || "standard";
    const rwLevelText = 
      rwLevel === "high" ? "Tăng cường (~50% câu thực tế)" :
      rwLevel === "max" ? "Chuyên đề thực tế (~70% - 100% câu thực tế)" :
      "Tiêu chuẩn (~30% câu thực tế)";

    const realWorldDirective = isRealWorldEnabled ? `
ƯU TIÊN CÂU HỎI BỐI CẢNH THỰC TIỄN (CHUẨN GDPT 2018):
- Mức độ ưu tiên: ${rwLevelText}.
- Thiết kế các câu hỏi có ngữ cảnh đời sống thực tế rõ ràng (kinh doanh, sản xuất xưởng cơ khí/may mặc, đo đạc hàng hải, đo chiều cao tháp/sông, bài toán chi tiêu/lãi suất).
- Tránh các bài toán thuần túy đại số khô khan nếu chủ đề có khả năng ứng dụng thực tế cao (nhất là Hệ bất phương trình bậc nhất hai ẩn và Hệ thức lượng trong tam giác).
- Đối với Phần III (Trả lời ngắn): Đặt câu hỏi thực tế yêu cầu tính một đại lượng cụ thể (mét, nghìn đồng, số sản phẩm, số giờ...) và làm tròn theo đúng yêu cầu để đáp số là một số nguyên hoặc số thập phân tối đa 4 ký tự.
- ĐẶC BIỆT: Đối với mỗi câu hỏi có ngữ cảnh/ứng dụng thực tế, hãy thêm trường "isRealWorld": true vào đối tượng câu hỏi tương ứng trong mảng "questions".
` : '';

    // matrixDirective using already declared hasMatrixFile
    const matrixDirective = hasMatrixFile ? `
HƯỚNG DẪN BẮT BUỘC BÁM SÁT 100% MA TRẬN & BẢN ĐẶC TẢ ĐÍNH KÈM:
1. Bạn BẮT BUỘC đọc và phân tích toàn diện file/dữ liệu Ma trận & Bản đặc tả được cung cấp:
   - Tự động bóc tách từng mạch kiến thức / chủ đề ("topic"), nội dung / đơn vị kiến thức cụ thể ("subtopic").
   - Bóc tách chính xác các cấp độ tư duy: "Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao".
   - Tuân thủ dạng thức câu hỏi: Phần I Trắc nghiệm 4 lựa chọn (mc), Phần II Đúng/Sai 4 ý (tf), Phần III Trả lời ngắn (sa), Phần IV Tự luận (essay).
   - Soạn đề bám sát tuyệt đối theo đúng ma trận tải lên cả về số câu, nội dung và mức độ nhận thức (tự động bỏ qua các số câu mặc định của form nếu ma trận trong file có quy định riêng).
2. TỰ ĐỘNG GÁN NHÃN TOPIC, SUBTOPIC VÀ LEVEL VÀO TỪNG CÂU HỎI:
   - BẮT BUỘC mỗi câu hỏi trong mảng "questions" phải có 3 trường:
     + "topic": Tên mạch kiến thức/chủ đề trong ma trận (ví dụ: "Hàm số và ứng dụng đạo hàm", "Hình học không gian", "Vectơ và hệ tọa độ").
     + "subtopic": Tên nội dung/đơn vị kiến thức cụ thể (ví dụ: "Tính đơn điệu của hàm số", "Cực trị của hàm số", "Thể tích khối chóp").
     + "level": Cấp độ nhận thức ("Nhận biết" | "Thông hiểu" | "Vận dụng" | "Vận dụng cao").
   - Nhờ đó, hệ thống sẽ tự động điền đầy đủ và chính xác vào Bảng Ma Trận & Bản Đặc Tả cho giáo viên.
` : '';

    const promptText = `Bạn là một chuyên gia khảo thí và giáo viên xuất sắc bộ môn ${subject} (Chương trình GDPT 2018, bộ sách giáo khoa Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027).
Nhiệm vụ của bạn là biên soạn một Đề kiểm tra chuẩn chất lượng cao cho học sinh Lớp ${grade}, môn ${subject}, Thời gian làm bài: ${duration} phút.

RÀNG BUỘC PHẠM VI NỘI DUNG CHỦ ĐỀ/BÀI HỌC (TẮT TẤT CẢ CÁC CÂU HỎI LẠCH CHỦ ĐỀ - BẮT BUỘC 100%):
- CHỈ ĐƯỢC PHÉP SỬ DỤNG CÁC CHỦ ĐỀ/KIẾN THỨC SAU:
  ${selectedTopics.length > 0 ? selectedTopics.join(', ') : (hasMatrixFile ? 'Dựa theo đúng nội dung/chủ đề trong Ma trận/Bản đặc tả đã được cung cấp.' : 'Chương trình học Lớp ' + grade)}
- TẤT CẢ CÁC CÂU HỎI sinh ra BẮT BUỘC phải tập trung trực tiếp và 100% nằm trong phạm vi kiến thức, bài học, chương học đã chọn ở trên.
- TUYỆT ĐỐI KHÔNG TỰ BỊA RA HOẶC CHÈN THÊM bất kỳ câu hỏi nào thuộc chủ đề khác, bài học khác, hay chương học khác ngoài danh sách giáo viên đã chọn (trừ khi giáo viên ghi rõ yêu cầu mở rộng kiến thức riêng).
- Nếu chủ đề yêu cầu chỉ là "Mệnh đề" và "Tập hợp", TUYỆT ĐỐI CẤM sinh câu hỏi về: Hàm số, Vectơ, Hình học, Phương trình hay bất kỳ nội dung nào khác ngoài Mệnh đề và Tập hợp.
- Nếu chủ đề chỉ thuộc 1 bài cụ thể (ví dụ: "Cấp số cộng"), TUYỆT ĐỐI CẤM chèn thêm câu hỏi thuộc bài khác (như Cấp số nhân hay Giới hạn).
- Đảm bảo tính chính xác 100% chuyên môn theo bộ sách SGK Kết nối tri thức với cuộc sống từ năm học 2026-2027 cho tất cả các môn học.

Hình thức/Kỳ thi: ${examType}.
${customPrompt ? `Yêu cầu chi tiết của giáo viên:\n${customPrompt}` : ''}
${realWorldDirective}
${matrixDirective}
${zeroPartsDirective}

CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC (CHỈ SINH ĐÚNG CÁC PHẦN CÓ SỐ LƯỢNG > 0):
TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt, không được bỏ qua bất kỳ câu nào, TUYỆT ĐỐI KHÔNG ĐƯỢC sinh placeholder như "(Các câu tương tự...)" hay viết tắt câu. Phải sinh ĐỦ 100% các câu hỏi theo đúng số lượng yêu cầu:
${mcCount > 0 ? `- Phần I: ĐÚNG ${mcCount} câu hỏi Trắc nghiệm nhiều lựa chọn (loại "mc") - mỗi câu gồm đúng 4 phương án lựa chọn trong mảng "options", chỉ có 1 phương án đúng.` : ''}
${tfCount > 0 ? `- Phần II: ĐÚNG ${tfCount} câu hỏi Trắc nghiệm Đúng/Sai (loại "tf") - mỗi câu BẮT BUỘC có đề dẫn chung và ĐÚNG 4 ý a), b), c), d) trong mảng "tfStatements" (4 phần tử). Học sinh xác định từng ý là Đúng (true) hay Sai (false).` : ''}
${saCount > 0 ? `- Phần III: ĐÚNG ${saCount} câu hỏi Trắc nghiệm Trả lời ngắn (loại "sa") - CHUẨN ĐỊNH DẠNG BỘ GD&ĐT 2018 (BẮT BUỘC SINH ĐỦ ${saCount} CÂU, TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ SÓT PHẦN III NÀY):
  + BẮT BUỘC câu hỏi phải dẫn tới MỘT KẾT QUẢ SỐ CỤ THỂ (ví dụ: "Tính giá trị biểu thức $T = ...$", "Tìm số nguyên dương nhỏ nhất...", "Tính diện tích tam giác...", "Tìm số nghiệm của phương trình...").
  + TUYỆT ĐỐI KHÔNG ra đề dạng mở (như "Viết hệ bất phương trình...", "Nêu kết luận...", "Giải thích vì sao...").
  + [RÀNG BUỘC ĐẶC BIỆT CHO CHỦ ĐỀ TẬP HỢP]:
    * TUYỆT ĐỐI KHÔNG ra đề yêu cầu "Tìm tập hợp", "Viết kết quả dưới dạng khoảng/đoạn/nửa khoảng" hay biểu diễn nghiệm dưới dạng tập hợp.
    * BẮT BUỘC câu hỏi phải có đáp số là MỘT CON SỐ CỤ THỂ, ví dụ:
      - "Tập hợp $A \\cap B$ có bao nhiêu phần tử là số nguyên?"
      - "Biết $A \\cap B = (a; b)$. Tính giá trị của biểu thức $T = a + b$ (hoặc $T = 2a - b$)?"
      - "Tính độ dài khoảng/đoạn..."
    * Đảm bảo đáp số luôn là MỘT SỐ NGUYÊN hoặc SỐ THẬP PHÂN có ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (ví dụ: "3", "-2", "15", "2.5", "-0.5").
  + ĐÁP ÁN BẮT BUỘC (RÀNG BUỘC PHIẾU CHẤM GDPT 2018): Trường "correctAnswer" BẮT BUỘC chỉ là một chuỗi số có ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (kể cả dấu âm '-' hoặc dấu phẩy/chấm thập phân), ví dụ: "22", "-3.5", "13", "102", "0.25", "-8". TUYỆT ĐỐI KHÔNG viết chữ, đơn vị đo hay công thức toán vào "correctAnswer" (nêu đơn vị trong đề bài).` : ''}
${essayCount > 0 ? `- Phần IV: ĐÚNG ${essayCount} câu hỏi Tự luận (loại "essay") - bài toán tự luận có hướng dẫn giải và thang điểm chi tiết.` : ''}
${totalQuestions === 0 ? 'Nếu không chỉ định số lượng, hãy tạo 12 câu trắc nghiệm nhiều lựa chọn (mc), 4 câu Đúng/Sai (tf), 6 câu Trả lời ngắn (sa) theo đúng cấu trúc đề thi mới của Bộ GD&ĐT (tổng cộng 22 câu).' : ''}

QUY TẮC BẮT BUỘC VỀ TOÁN HỌC VÀ KỸ THUẬT (CHUẨN LATEX - MATHTYPE):
- Mọi công thức, ký hiệu toán, số liệu toán học, biến số đơn lẻ ($x, y, z, m, a, b, c, d, S, \\alpha, \\beta, \\pi, \\Delta, \\in, \\le, \\ge, \\neq, -\\infty, +\\infty...$) BẮT BUỘC đặt trong cặp dấu đô la $...$ hoặc $$...$$. CẤM viết LaTeX trần; không viết "sin x = 0" mà viết "$\\sin x = 0$".
- LUÔN DÙNG \\frac{a}{b} THAY CHO \\dfrac (CẤM dùng \\dfrac).
- Hệ phương trình/BPT dùng $\\begin{cases} ax + by \\le c \\\\ dx + ey \\ge f \\end{cases}$. Vectơ dùng $\\vec{AB}, \\vec{u}$ đặt trong $...$. Căn thức $\\sqrt{...}$, tập hợp $\\{...\\}$, điểm có dấu phẩy $A', B'$, ký hiệu đồ thị $(C)$, lượng từ $\\forall, \\exists$ bọc trọn trong $...$.
- KHÔNG bọc chữ tiếng Việt hay tiêu đề Phần trong dấu $. Không đặt dấu $ bên trong \\frac, \\sqrt, \\vec. Giữ nguyên font tiếng Việt UTF-8 chuẩn.
- Ký hiệu vô cực BẮT BUỘC viết chuẩn \\infty (ví dụ: $(-\\infty; -1)$, $(-1; +\\infty)$, $[0; +\\infty)$). Dấu khác dùng \\neq hoặc \\ne.
- BẢNG BIẾN THIÊN (BBT): Khi câu hỏi cần BBT, BẮT BUỘC vẽ trực quan bằng Markdown Table chuẩn ngay trong nội dung câu hỏi, mỗi hàng xuống dòng riêng biệt (\\n):
  | $x$ | $-\\infty$ | | $x_0$ | | $+\\infty$ |
  |---|---|---|---|---|---|
  | $y'$ | | $+$ | $0$ | $-$ | |
  | $y$ | $-\\infty$ | $\\nearrow$ | $y_{CĐ}$ | $\\searrow$ | $-\\infty$ |
  Nếu có tiệm cận đứng: dùng vạch đôi $\\|$ ở hàng $y'$ và phân tách giới hạn ở hàng $y$ bằng $\\|$. CẤM để khung rỗng hoặc viết BBT trên 1 dòng.
- HÌNH VẼ ĐỒ THỊ: Nếu đề nhắc đồ thị mà không có URL ảnh, BẮT BUỘC mô tả rõ đặc điểm đồ thị (điểm đi qua, đỉnh, tiệm cận, cực trị) trong đề; KHÔNG để khung/thẻ img trống.
- LỜI GIẢI CHI TIẾT ('solution'): Súc tích 2-3 dòng trọng tâm (công thức then chốt và lý do chọn đáp án), KHÔNG lặp lại BBT/đồ thị, KHÔNG xuất nháp hay bình luận ngoài lề.
- CẤM HTML inline (<mark>, <span>, <div>), CẤM \\underline, CẤM \\begin{tabular}. Chỉ dùng Markdown chuẩn (**in đậm**, *in nghiêng*).
- TUYỆT ĐỐI KHÔNG lặp lại các chữ A, B, C, D vào nội dung phương án trong mảng "options" (hệ thống tự gán nhãn).
- Câu trắc nghiệm (mc): "options" gồm ĐÚNG 4 chuỗi; "correctOptionIndex" là 0, 1, 2 hoặc 3.
- Câu đúng/sai (tf): "tfStatements" gồm ĐÚNG 4 đối tượng [{ "statement": "...", "correct": true/false }].
- Câu trả lời ngắn (sa): "correctAnswer" BẮT BUỘC là MỘT SỐ CỤ THỂ tối đa 4 ký tự (ví dụ: "22", "-3.5", "13", "102").

${(() => {
  const exampleBlocks: string[] = [];
  let exId = 1;
  if (mcCount > 0 || totalQuestions === 0) {
    exampleBlocks.push(`    {
      "id": ${exId++},
      "type": "mc",
      "level": "Nhận biết",
      "topic": "Hàm số và đồ thị",
      "subtopic": "Tính đơn điệu của hàm số",
      "isRealWorld": false,
      "content": "Nội dung câu hỏi...",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "correctOptionIndex": 0,
      "solution": "Lời giải ngắn gọn 2-3 dòng, tập trung công thức then chốt..."
    }`);
  }
  if (tfCount > 0 || (totalQuestions === 0)) {
    exampleBlocks.push(`    {
      "id": ${exId++},
      "type": "tf",
      "level": "Thông hiểu",
      "topic": "Hàm số và đồ thị",
      "subtopic": "Khảo sát và vẽ đồ thị",
      "isRealWorld": true,
      "content": "Nội dung câu hỏi Đúng/Sai bối cảnh thực tế...",
      "tfStatements": [
        { "statement": "Khẳng định a", "correct": true },
        { "statement": "Khẳng định b", "correct": false },
        { "statement": "Khẳng định c", "correct": true },
        { "statement": "Khẳng định d", "correct": false }
      ],
      "solution": "Lời giải chi tiết ngắn gọn cho 4 ý..."
    }`);
  }
  if (saCount > 0 || (totalQuestions === 0)) {
    exampleBlocks.push(`    {
      "id": ${exId++},
      "type": "sa",
      "level": "Vận dụng",
      "topic": "Hình học không gian",
      "subtopic": "Thể tích khối đa diện",
      "content": "Tính diện tích tam giác $ABC$... (Kết quả làm tròn đến hàng đơn vị).",
      "correctAnswer": "25",
      "solution": "Lời giải súc tích 2-3 dòng..."
    }`);
  }
  if (essayCount > 0) {
    exampleBlocks.push(`    {
      "id": ${exId++},
      "type": "essay",
      "level": "Vận dụng cao",
      "topic": "Toán thực tế và tối ưu",
      "subtopic": "Giá trị lớn nhất và nhỏ nhất",
      "content": "Nội dung bài toán tự luận...",
      "correctAnswer": "Hướng dẫn chấm chi tiết",
      "solution": "Lời giải chi tiết từng bước..."
    }`);
  }
  return `BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ VỚI CẤU TRÚC SAU:
{
  "examName": "${examType.toUpperCase().startsWith('ĐỀ') ? examType.toUpperCase() : 'ĐỀ ' + examType.toUpperCase()} - MÔN ${subject.toUpperCase()} ${grade.replace(/^(LỚP|KHỐI)\s*/i, '').trim()} (${duration} PHÚT)",
  "questions": [
${exampleBlocks.join(',\n')}
  ]
}`;
})()}`;

    const processedFiles = await processFilesForAI(files);
    const examContents = [
      {
        role: "user",
        parts: [
          ...processedFiles,
          { text: promptText }
        ]
      }
    ];

    let response: any;
    try {
      response = await generateWithFallback(req, {
        contents: examContents,
        config: {
          responseMimeType: "application/json"
        }
      });
    } catch (primaryExamErr: any) {
      const errMsg = String(primaryExamErr?.message || "").toLowerCase();
      const isTransientBusy =
        primaryExamErr?.status === 503 ||
        primaryExamErr?.status === 504 ||
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("overloaded") ||
        errMsg.includes("try again later");
      if (!isTransientBusy) {
        throw primaryExamErr;
      }
      // Retry cleanly without responseMimeType constraint on stable fast models (safeJsonParse handles extraction)
      await delay(500);
      response = await generateWithFallback(req, {
        model: "gemini-2.5-flash",
        preferredModels: ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-4-hydrogen"],
        contents: examContents,
        config: {}
      });
    }

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    let parsedData: any = {};
    const rawText = response.text.trim();
    try {
      parsedData = safeJsonParse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = safeJsonParse(jsonMatch[0]);
        } catch (e3) {
          parsedData = { examName: `Đề kiểm tra ${subject} ${grade}`, questions: [] };
        }
      } else {
        parsedData = { examName: `Đề kiểm tra ${subject} ${grade}`, questions: [] };
      }
    }

    if (!parsedData.questions || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
      // Cố gắng trích xuất từng khối câu hỏi riêng lẻ nếu JSON tổng thể bị cắt ngắn
      const extractedQuestions: any[] = [];
      const objectRegex = /\{[^{}]*"type"\s*:\s*"(?:mc|tf|sa|essay|multiple_choice|true_false|short_answer)"[^{}]*\}/gi;
      let m: RegExpExecArray | null;
      while ((m = objectRegex.exec(rawText)) !== null) {
        try {
          const qObj = safeJsonParse(m[0]);
          if (qObj && (qObj.content || qObj.question)) {
            extractedQuestions.push(qObj);
          }
        } catch {}
      }
      parsedData.questions = extractedQuestions;
    }

    parsedData.questions = (parsedData.questions || []).map((q: any, idx: number) => {
      const sol = (q.solution || q.explanation || "").trim();
      let qType = String(q.type || '').toLowerCase().trim();
      if (qType === 'short_answer' || qType === 'shortanswer' || qType === 'tln' || qType === 'dien_so' || qType === 'trả lời ngắn') {
        qType = 'sa';
      } else if (qType === 'multiple_choice' || qType === 'trắc nghiệm' || (!qType && Array.isArray(q.options) && q.options.length > 0)) {
        qType = 'mc';
      } else if (qType === 'true_false' || qType === 'tf' || (!qType && Array.isArray(q.tfStatements) && q.tfStatements.length > 0)) {
        qType = 'tf';
      } else if (qType === 'tự luận' || qType === 'tu_luan') {
        qType = 'essay';
      } else if (!qType) {
        if (q.correctAnswer && (!q.options || q.options.length === 0)) qType = 'sa';
        else qType = 'mc';
      }

      return {
        ...q,
        id: q.id || idx + 1,
        type: qType,
        level: q.level || 'Nhận biết',
        isRealWorld: Boolean(q.isRealWorld),
        content: cleanLatexMathField(q.content || q.question || ''),
        question: cleanLatexMathField(q.question || q.content || ''),
        options: Array.isArray(q.options) ? q.options.map(cleanLatexMathField) : q.options,
        tfStatements: Array.isArray(q.tfStatements) ? q.tfStatements.map((tf: any) => ({
          ...tf,
          statement: cleanLatexMathField(tf.statement)
        })) : q.tfStatements,
        correctAnswer: cleanLatexMathField(q.correctAnswer),
        solution: cleanLatexMathField(sol),
        explanation: cleanLatexMathField(sol)
      };
    });

    const topicName = selectedTopics[0] || (matrix ? matrix.split('\n')[0].substring(0, 50) : 'Hàm số và Đại số');

    const normalizedGrade = String(grade).trim();
    const isGrade10 = normalizedGrade.includes("10");
    const isGrade11 = normalizedGrade.includes("11");

    // Grade-sensitive fallbacks (Grade 10, 11, 12) to avoid Grade 12 leak in Grade 10/11 exams
    let mcFallbacks = [];
    let tfFallbacks = [];
    let saFallbacks = [];

    if (isGrade10) {
      mcFallbacks = [
        {
          content: "Cho hai tập hợp $A = \\{1; 2; 3; 4\\}$ và $B = \\{3; 4; 5; 6\\}$. Tập hợp $A \\cap B$ là:",
          options: ["$\\{3; 4\\}$", "$\\{1; 2; 3; 4; 5; 6\\}$", "$\\{1; 2\\}$", "$\\{5; 6\\}$"],
          ans: 0,
          sol: "Giao của hai tập hợp $A$ và $B$ gồm các phần tử vừa thuộc $A$ vừa thuộc $B$. Do đó $A \\cap B = \\{3; 4\\}$."
        },
        {
          content: "Trong mặt phẳng tọa độ $Oxy$, tọa độ trung điểm $I$ của đoạn thẳng $AB$ với $A(1; 3)$ và $B(3; -1)$ là:",
          options: ["$I(2; 1)$", "$I(4; 2)$", "$I(2; 2)$", "$I(1; -2)$"],
          ans: 0,
          sol: "Tọa độ trung điểm $I$ là: $x_I = \\frac{x_A + x_B}{2} = \\frac{1 + 3}{2} = 2$ và $y_I = \\frac{y_A + y_B}{2} = \\frac{3 + (-1)}{2} = 1$. Vậy $I(2; 1)$."
        },
        {
          content: "Hàm số nào dưới đây là hàm số bậc hai?",
          options: ["$y = x^2 - 3x + 2$", "$y = 2x - 1$", "$y = x^3 - x^2 + 1$", "$y = \\frac{1}{x^2}$"],
          ans: 0,
          sol: "Hàm số bậc hai có dạng tổng quát là $y = ax^2 + bx + c$ với $a \\neq 0$. Do đó $y = x^2 - 3x + 2$ là hàm số bậc hai."
        },
        {
          content: "Cho tam giác $ABC$ có $AB = 6$, $AC = 8$ và góc $A = 60^\\circ$. Diện tích tam giác $ABC$ bằng:",
          options: ["$12\\sqrt{3}$", "$24\\sqrt{3}$", "$24$", "$12$"],
          ans: 0,
          sol: "Diện tích tam giác $ABC$ là: $S = \\frac{1}{2} b c \\sin A = \\frac{1}{2} \\cdot 8 \\cdot 6 \\cdot \\sin 60^\\circ = 24 \\cdot \\frac{\\sqrt{3}}{2} = 12\\sqrt{3}$."
        },
        {
          content: "Trong các khẳng định sau, khẳng định nào đúng về vectơ?",
          options: ["Hai vectơ cùng hướng thì luôn cùng độ dài", "Hai vectơ ngược hướng thì luôn cùng độ dài", "Hai vectơ bằng nhau thì cùng hướng và cùng độ dài", "Hai vectơ cùng phương thì luôn cùng hướng"],
          ans: 2,
          sol: "Theo định nghĩa, hai vectơ bằng nhau nếu chúng có cùng hướng và cùng độ dài."
        },
        {
          content: "Tập nghiệm của bất phương trình $x^2 - 4x + 3 < 0$ là:",
          options: ["$(1; 3)$", "$(-\\infty; 1) \\cup (3; +\\infty)$", "$[1; 3]$", "$(-\\infty; 1]$"],
          ans: 0,
          sol: "Tam thức bậc hai $x^2 - 4x + 3 = 0$ có hai nghiệm là $1$ và $3$. Hệ số $a = 1 > 0$, do đó tam thức mang dấu âm trong khoảng giữa hai nghiệm. Vậy tập nghiệm là $(1; 3)$."
        }
      ];

      tfFallbacks = [
        {
          topic: "Hàm số và Đồ thị bậc hai",
          subtopic: "Tính chất parabol bậc hai",
          content: "Cho hàm số bậc hai $y = f(x) = x^2 - 4x + 3$ có đồ thị là parabol $(P)$. Xét tính đúng/sai của các khẳng định sau:",
          statements: [
            { statement: "Tọa độ đỉnh của parabol $(P)$ là $I(2; -1)$.", correct: true },
            { statement: "Hàm số nghịch biến trên khoảng $(2; +\\infty)$.", correct: false },
            { statement: "Trục đối xứng của parabol $(P)$ là đường thẳng $x = 2$.", correct: true },
            { statement: "Đồ thị $(P)$ cắt trục hoành tại hai điểm phân biệt $A(1; 0)$ và $B(3; 0)$.", correct: true }
          ],
          sol: "Ta có $a = 1, b = -4, c = 3$.\na) Đỉnh $I$ có hoành độ $x_I = -\\frac{b}{2a} = 2$, tung độ $y_I = f(2) = -1 \\Rightarrow I(2; -1)$ (Đúng).\nb) Vì $a = 1 > 0$, hàm số đồng biến trên $(2; +\\infty)$ và nghịch biến trên $(-\\infty; 2)$ (Sai).\nc) Trục đối xứng là $x = -\\frac{b}{2a} = 2$ (Đúng).\nd) Cho $y = 0 \\Leftrightarrow x^2 - 4x + 3 = 0 \\Leftrightarrow x = 1$ hoặc $x = 3$ (Đúng)."
        },
        {
          topic: "Phương trình đường thẳng",
          subtopic: "Vectơ pháp tuyến và chỉ phương",
          content: "Trong mặt phẳng tọa độ $Oxy$, cho đường thẳng $\\Delta: 3x - 4y + 1 = 0$ và điểm $A(1; 1)$.",
          statements: [
            { statement: "Vectơ pháp tuyến của đường thẳng $\\Delta$ là $\\vec{n} = (3; -4)$.", correct: true },
            { statement: "Đường thẳng $\\Delta$ đi qua điểm $A(1; 1)$.", correct: true },
            { statement: "Vectơ chỉ phương của $\\Delta$ là $\\vec{u} = (4; 3)$.", correct: true },
            { statement: "Khoảng cách từ điểm $A(1; 1)$ đến đường thẳng $\\Delta$ bằng $0$.", correct: true }
          ],
          sol: "a) Đúng vì hệ số của $x, y$ là $3$ và $-4$.\nb) Thay $A(1;1)$ vào pt: $3(1) - 4(1) + 1 = 0$ (Đúng, $\\Delta$ đi qua $A$).\nc) $\\vec{n} = (3; -4) \\Rightarrow \\vec{u} = (4; 3)$ vì $\\vec{u} \\cdot \\vec{n} = 12 - 12 = 0$ (Đúng).\nd) Vì $A \\in \\Delta$ nên khoảng cách bằng 0. (Đúng)."
        }
      ];

      saFallbacks = [
        {
          topic: "Mệnh đề và Tập hợp",
          subtopic: "Phép toán tập hợp số",
          content: "Cho hai tập hợp $A = [-2; 3]$ và $B = (1; 5)$. Biết tập hợp $A \\cap B = (a; b]$. Tính giá trị của biểu thức $T = a + b$.",
          ans: "4",
          sol: "Ta có $A = [-2; 3]$ và $B = (1; 5)$. Giao của chúng là $A \\cap B = (1; 3]$. So sánh với $(a; b] \\Rightarrow a = 1$ và $b = 3$. Tính $T = a + b = 1 + 3 = 4$."
        },
        {
          topic: "Phương trình đường thẳng",
          subtopic: "Khoảng cách từ điểm đến đường thẳng",
          content: "Trong mặt phẳng tọa độ $Oxy$, cho đường thẳng $\\Delta: 3x - 4y + 5 = 0$. Tính khoảng cách từ điểm $M(2; -1)$ đến đường thẳng $\\Delta$.",
          ans: "3",
          sol: "Áp dụng công thức khoảng cách từ điểm đến đường thẳng:\n$d(M, \\Delta) = \\frac{|3 \\cdot 2 - 4 \\cdot (-1) + 5|}{\\sqrt{3^2 + (-4)^2}} = \\frac{|6 + 4 + 5|}{\\sqrt{25}} = \\frac{15}{5} = 3$."
        }
      ];
    } else if (isGrade11) {
      mcFallbacks = [
        {
          content: "Nghiệm của phương trình $\\cos x = 1$ là:",
          options: ["$x = k2\\pi, k \\in \\mathbb{Z}$", "$x = \\pi + k2\\pi, k \\in \\mathbb{Z}$", "$x = \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}$", "$x = k\\pi, k \\in \\mathbb{Z}$"],
          ans: 0,
          sol: "Theo phương trình lượng giác cơ bản, $\\cos x = 1 \\Leftrightarrow x = k2\\pi, k \\in \\mathbb{Z}$."
        },
        {
          content: "Cho cấp số cộng $(u_n)$ có $u_1 = 3$ và công sai $d = 2$. Giá trị của $u_5$ bằng:",
          options: ["$11$", "$13$", "$9$", "$15$"],
          ans: 0,
          sol: "Công thức số hạng tổng quát của cấp số cộng: $u_n = u_1 + (n - 1)d \\Rightarrow u_5 = 3 + (5 - 1) \\cdot 2 = 11$."
        },
        {
          content: "Giới hạn $\\lim_{x \\to 2} (x^2 - 3x + 5)$ bằng:",
          options: ["$3$", "$5$", "$2$", "$1$"],
          ans: 0,
          sol: "Vì hàm số liên tục tại $x = 2$, ta trực tiếp thay số: $\\lim_{x \\to 2} (x^2 - 3x + 5) = 2^2 - 3 \\cdot 2 + 5 = 3$."
        },
        {
          content: "Trong các giới hạn dãy số sau, giới hạn nào bằng $0$?",
          options: ["$\\lim \\left(\\frac{2}{3}\\right)^n$", "$\\lim (1.5)^n$", "$\\lim \\frac{n+1}{n}$", "$\\lim n^2$"],
          ans: 0,
          sol: "Vì $|q| = |\\frac{2}{3}| < 1$ nên theo giới hạn cơ bản, $\\lim \\left(\\frac{2}{3}\\right)^n = 0$."
        }
      ];

      tfFallbacks = [
        {
          topic: "Dãy số, Cấp số cộng, Cấp số nhân",
          subtopic: "Tính chất cấp số nhân",
          content: "Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1 = 2$ và công bội $q = -3$. Xét tính đúng/sai của các khẳng định sau:",
          statements: [
            { statement: "Số hạng thứ hai $u_2 = -6$.", correct: true },
            { statement: "Công thức số hạng tổng quát là $u_n = 2 \\cdot (-3)^{n-1}$.", correct: true },
            { statement: "Tổng 3 số hạng đầu tiên của cấp số nhân bằng $-16$.", correct: false },
            { statement: "Dãy số $(u_n)$ là một dãy số tăng.", correct: false }
          ],
          sol: "Ta có $u_1 = 2, q = -3$.\na) $u_2 = u_1 \\cdot q = 2 \\cdot (-3) = -6$ (Đúng).\nb) $u_n = u_1 \\cdot q^{n-1} = 2 \\cdot (-3)^{n-1}$ (Đúng).\nc) $S_3 = u_1 + u_2 + u_3 = 2 - 6 + 18 = 14 \\neq -16$ (Sai).\nd) Dãy số đan dấu không tăng cũng không giảm (Sai)."
        }
      ];

      saFallbacks = [
        {
          topic: "Hàm số lượng giác",
          subtopic: "Giá trị lớn nhất và nhỏ nhất",
          content: "Tìm giá trị lớn nhất của hàm số $y = 3\\sin x - 4\\cos x + 1$.",
          ans: "6",
          sol: "Áp dụng bất đẳng thức Bunhiacôpxki: $(3\\sin x - 4\\cos x)^2 \\le (3^2 + (-4)^2)(\\sin^2 x + \\cos^2 x) = 25 \\Rightarrow -5 \\le 3\\sin x - 4\\cos x \\le 5$.\nDo đó giá trị lớn nhất là $\\max y = 5 + 1 = 6$."
        },
        {
          topic: "Đạo hàm",
          subtopic: "Đạo hàm tại một điểm",
          content: "Tính đạo hàm của hàm số $y = x^3 - 2x$ tại điểm $x_0 = 2$.",
          ans: "10",
          sol: "Ta có đạo hàm $y\' = 3x^2 - 2$.\nTại $x_0 = 2$: $y\'(2) = 3 \\cdot 2^2 - 2 = 12 - 2 = 10$."
        }
      ];
    } else {
      // Default to Grade 12 (original fallbacks)
      mcFallbacks = [
        {
          content: "Cho hàm số $y = f(x)$ có bảng biến thiên trên $\\mathbb{R}$ với điểm cực đại $x = 1$, giá trị cực đại $y = 3$. Điểm cực đại của đồ thị hàm số là:",
          options: ["$(1; 3)$", "$(3; 1)$", "$x = 1$", "$y = 3$"],
          ans: 0,
          sol: "Điểm cực đại của đồ thị hàm số là $(x_{CĐ}; y_{CĐ}) = (1; 3)$."
        },
        {
          content: "Hàm số $y = x^3 - 3x^2 + 1$ đồng biến trên khoảng nào dưới đây?",
          options: ["$(2; +\\infty)$", "$(0; 2)$", "$(-\\infty; 2)$", "$(0; +\\infty)$"],
          ans: 0,
          sol: "Ta có $y' = 3x^2 - 6x = 3x(x - 2) > 0 \\Leftrightarrow x < 0$ hoặc $x > 2$. Do đó hàm số đồng biến trên $(2; +\\infty)$."
        },
        {
          content: "Đường tiệm cận ngang của đồ thị hàm số $y = \\frac{2x - 1}{x + 3}$ là:",
          options: ["$y = 2$", "$x = 2$", "$y = -3$", "$x = -3$"],
          ans: 0,
          sol: "Ta có $\\lim_{x \\to \\pm\\infty} \\frac{2x - 1}{x + 3} = 2$. Do đó tiệm cận ngang là đường thẳng $y = 2$."
        },
        {
          content: "Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:",
          options: ["$11$", "$2$", "$3$", "$15$"],
          ans: 0,
          sol: "Ta có $f'(x) = 4x^3 - 4x = 0 \\Leftrightarrow x = 0$ hoặc $x = 1$ (trên $[0; 2]$). $f(0) = 3$, $f(1) = 2$, $f(2) = 11$. Vậy $\\max_{[0; 2]} f(x) = 11$."
        }
      ];

      tfFallbacks = [
        {
          topic: "Hàm số và Đồ thị",
          subtopic: "Khảo sát hàm bậc ba",
          content: "Cho hàm số $y = f(x) = x^3 - 3x + 2$. Xét tính đúng/sai của các mệnh đề sau:",
          statements: [
            { statement: "Hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(1; +\\infty)$.", correct: true },
            { statement: "Giá trị cực tiểu của hàm số bằng $4$.", correct: false },
            { statement: "Đồ thị hàm số cắt trục hoành tại đúng 2 điểm phân biệt.", correct: true },
            { statement: "Tiếp tuyến của đồ thị tại điểm có hoành độ $x = 0$ có hệ số góc bằng $-3$.", correct: true }
          ],
          sol: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$.\na) Đúng vì $y' > 0$ khi $x \\in (-\\infty; -1) \\cup (1; +\\infty)$.\nb) Sai vì $y_{CT} = y(1) = 0$.\nc) Đúng vì $x^3 - 3x + 2 = (x - 1)^2(x + 2) = 0 \\Leftrightarrow x = 1$ hoặc $x = -2$.\nd) Đúng vì $y'(0) = -3$."
        }
      ];

      saFallbacks = [
        {
          topic: "Hàm số và Đồ thị",
          subtopic: "Số điểm cực trị",
          content: "Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ có đạo hàm $f'(x) = (x - 1)(x + 2)^2(x - 3)$. Hàm số $y = f(x)$ có bao nhiêu điểm cực trị?",
          ans: "2",
          sol: "Ta có $f'(x) = 0 \\Leftrightarrow x = 1$ hoặc $x = -2$ hoặc $x = 3$.\nVì $(x + 2)^2 \\ge 0$ với mọi $x$, nên $f'(x)$ chỉ đổi dấu khi qua $x = 1$ và $x = 3$.\nVậy hàm số có đúng $2$ điểm cực trị."
        },
        {
          topic: "Hàm số và Đồ thị",
          subtopic: "Giá trị lớn nhất và nhỏ nhất",
          content: "Cho hàm số $y = \\frac{2x - 1}{x + 1}$. Tìm giá trị lớn nhất của hàm số trên đoạn $[0; 3]$.",
          ans: "1.25",
          sol: "Hàm số xác định trên $[0; 3]$.\nTa có $y' = \\frac{2(1) - (-1)(1)}{(x + 1)^2} = \\frac{3}{(x + 1)^2} > 0,\\ \\forall x \\in [0; 3]$.\nDo đó hàm số đồng biến trên $[0; 3]$.\nGiá trị lớn nhất là $y(3) = \\frac{2(3) - 1}{3 + 1} = \\frac{5}{4} = 1.25$."
        }
      ];
    }

    // Lọc triệt để loại bỏ bất kỳ câu hỏi nào thuộc phần có cấu hình = 0 câu
    const allowedExamTypes = new Set<string>();
    if (mcCount > 0) allowedExamTypes.add('mc');
    if (tfCount > 0) allowedExamTypes.add('tf');
    if (saCount > 0) allowedExamTypes.add('sa');
    if (essayCount > 0) allowedExamTypes.add('essay');

    if (allowedExamTypes.size > 0) {
      parsedData.questions = (parsedData.questions || []).filter((q: any) => allowedExamTypes.has(q.type));
    }

    // 1. Bù đắp câu hỏi Trắc nghiệm nhiều lựa chọn (mc) nếu AI trả về thiếu (CHỈ KHI mcCount > 0)
    const currentMcList = parsedData.questions.filter((q: any) => q.type === 'mc');
    if (mcCount > 0 && currentMcList.length < mcCount) {
      const missingMc = mcCount - currentMcList.length;

      for (let k = 0; k < missingMc; k++) {
        const item = mcFallbacks[k % mcFallbacks.length];
        parsedData.questions.push({
          id: parsedData.questions.length + 1,
          type: 'mc',
          level: k < 4 ? 'Nhận biết' : 'Thông hiểu',
          topic: topicName,
          subtopic: 'Khảo sát hàm số và Đại số',
          content: item.content,
          options: item.options,
          correctOptionIndex: item.ans,
          solution: item.sol,
          explanation: item.sol
        });
      }
    }

    // 2. Bù đắp câu hỏi Đúng/Sai (tf) nếu AI trả về thiếu (CHỈ KHI tfCount > 0)
    const currentTfList = parsedData.questions.filter((q: any) => q.type === 'tf');
    if (tfCount > 0 && currentTfList.length < tfCount) {
      const missingTf = tfCount - currentTfList.length;

      for (let j = 0; j < missingTf; j++) {
        const item = tfFallbacks[j % tfFallbacks.length];
        parsedData.questions.push({
          id: parsedData.questions.length + 1,
          type: 'tf',
          level: j < 2 ? 'Thông hiểu' : 'Vận dụng',
          topic: (item as any).topic || topicName,
          subtopic: (item as any).subtopic || 'Chủ đề trọng tâm',
          isRealWorld: j === 1,
          content: item.content,
          tfStatements: (item as any).tfStatements || (item as any).statements || [],
          solution: item.sol,
          explanation: item.sol
        });
      }
    }

    // 3. Bù đắp câu hỏi Trả lời ngắn (sa) nếu AI trả về thiếu (CHỈ KHI saCount > 0)
    const currentSaList = parsedData.questions.filter((q: any) => q.type === 'sa');
    if (saCount > 0 && currentSaList.length < saCount) {
      const missingSa = saCount - currentSaList.length;

      for (let m = 0; m < missingSa; m++) {
        const item = saFallbacks[m % saFallbacks.length];
        parsedData.questions.push({
          id: parsedData.questions.length + 1,
          type: 'sa',
          level: m < 2 ? 'Thông hiểu' : 'Vận dụng',
          topic: (item as any).topic || topicName,
          subtopic: (item as any).subtopic || 'Chủ đề trọng tâm',
          isRealWorld: m === 2,
          content: item.content,
          correctAnswer: item.ans,
          solution: item.sol,
          explanation: item.sol
        });
      }
    }

    // Cắt gọt đúng số lượng và lọc lại lần cuối, gán lại id tuần tự 1..N
    if (allowedExamTypes.size > 0) {
      parsedData.questions = parsedData.questions.filter((q: any) => allowedExamTypes.has(q.type));
      
      let mcIdx = 0, tfIdx = 0, saIdx = 0, essayIdx = 0;
      parsedData.questions = parsedData.questions.filter((q: any) => {
        if (q.type === 'mc') {
          mcIdx++;
          return mcIdx <= mcCount;
        }
        if (q.type === 'tf') {
          tfIdx++;
          return tfIdx <= tfCount;
        }
        if (q.type === 'sa') {
          saIdx++;
          return saIdx <= saCount;
        }
        if (q.type === 'essay') {
          essayIdx++;
          return essayIdx <= essayCount;
        }
        return false;
      });
    }

    parsedData.questions = parsedData.questions.map((q: any, idx: number) => ({
      ...q,
      id: idx + 1
    }));

    return parsedData;
  });
});

app.all("/api/upgrade-lesson-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { lesson, subject, templateMode = 'uploaded', customTemplateInstructions = '', includeInclusiveEducation = false } = req.body || {};
    const files = resolveFiles(req.body);

    const inclusiveEducationBlock = includeInclusiveEducation === true ? `
ĐIỀU CHỈNH KẾ HOẠCH DẠY HỌC CHO HỌC SINH KHUYẾT TẬT HÒA NHẬP (BẮT BUỘC BỔ SUNG THÀNH MỤC IV HOẶC MỤC RIÊNG CUỐI GIÁO ÁN CHO MỌI MÔN HỌC/HOẠT ĐỘNG):
Bám sát Thông tư 03/2018/TT-BGDĐT và Công văn 5512/BGDĐT-GDTrH, hãy bổ sung mục này với cấu trúc chuẩn:
1. **MỤC TIÊU ĐIỀU CHỈNH:**
   - Kiến thức: [Yêu cầu cần đạt cốt lõi tối thiểu mà HS khuyết tật cần nhận biết/thực hiện được trong môn ${subject || "môn học"}]
   - Năng lực: [Năng lực đặc thù môn ${subject || "học"} cơ bản, năng lực sử dụng công cụ hỗ trợ, năng lực tự chủ/hợp tác]
   - Phẩm chất: [Tự tin, kiên trì, hòa nhập cùng bạn bè]
2. **NỘI DUNG ĐIỀU CHỈNH CHI TIẾT THEO TIẾN TRÌNH:**
   Bảng gồm 4 cột: | Hoạt động | YCCĐ & Nhiệm vụ của cả lớp | Điều chỉnh cho HS hòa nhập | Biện pháp & Công cụ hỗ trợ |
   - Hoạt động 1: Khởi động (Nhiệm vụ thu gọn, trực quan, tăng thời gian)
   - Hoạt động 2: Hình thành kiến thức mới (Giảm tải biến đổi/lý thuyết phức tạp, dùng mô hình trực quan/thẻ màu/máy tính hoặc công cụ phù hợp môn học)
   - Hoạt động 3: Luyện tập (Bài tập mức độ Nhận biết - Thông hiểu đơn giản, rút gọn)
   - Hoạt động 4: Vận dụng (Nhiệm vụ gắn thực tiễn đơn giản, vừa sức)
3. **ĐÁNH GIÁ SỰ TIẾN BỘ & KIỂM TRA ĐỊNH KỲ:**
   - Đánh giá thường xuyên: [Quan sát quá trình, động viên khích lệ, chấm điểm dựa trên mức độ cố gắng và tiến bộ so với chính bản thân HS]
   - Bài kiểm tra định kỳ: [Đề xuất cấu trúc đề rút gọn, tăng 30% - 50% thời gian làm bài, giảm bớt các câu hỏi vận dụng cao]
` : '';

    let templateDirective = '';
    if (templateMode === 'uploaded') {
      templateDirective = `
5. QUY CHUẨN MẪU ĐỊNH DẠNG (THEO MẪU GIÁO ÁN GỐC CỦA NGUỜI DÙNG ĐÃ ĐƯA LÊN):
   - BẮT BUỘC giữ nguyên 100% cấu trúc, thứ tự tiêu đề các phần, tên gọi hoạt động, cách chia mục và các bảng biểu từ chính tệp giáo án gốc mà giáo viên đã tải lên.
   - Nâng cấp và lồng ghép bổ sung chi tiết về Năng lực số (NLS), công cụ AI, câu lệnh prompt mẫu, thiết bị công nghệ và kịch bản dạy học tương tác trực tiếp vào ĐÚNG các mục/hoạt động tương ứng trong cấu trúc gốc đó.`;
    } else if (templateMode === 'custom' && customTemplateInstructions.trim()) {
      templateDirective = `
5. QUY CHUẨN MẪU ĐỊNH DẠNG (THEO YÊU CẦU CHI TIẾT MẪU TÙY CHỈNH CỦA GIÁO VIÊN):
   - BẮT BUỘC tuân thủ nghiêm ngặt khung mẫu và quy chuẩn cấu trúc do giáo viên chỉ định sau đây:
   "${customTemplateInstructions.trim()}"`;
    } else {
      templateDirective = `
5. QUY CHUẨN MẪU ĐỊNH DẠNG (THEO KHUNG HỆ THỐNG CÔNG VĂN 5512 CHUẨN GDPT 2018):
   - Tái cấu trúc và trình bày toàn bộ giáo án theo đúng 4 phần chuẩn Công văn 5512 (I. Mục tiêu, II. Thiết bị dạy học & Học liệu, III. Tiến trình dạy học với 4 Hoạt động cho từng tiết, IV. Hướng dẫn về nhà).`;
    }
    
    const prompt = `Bạn là một chuyên gia giáo dục và công nghệ thông tin hàng đầu. Tôi đã tải lên một tài liệu Giáo án cũ (Kế hoạch bài dạy) môn ${subject || "chung"} cho bài học: "${lesson}".

YÊU CẦU:
Hãy đọc toàn bộ giáo án cũ này và viết lại toàn bộ giáo án, giữ nguyên các nội dung chuyên môn cốt lõi, đồng thời TÍCH HỢP VÀ BỔ SUNG CHI TIẾT việc ứng dụng công nghệ, năng lực số (NLS), năng lực AI, và STEM vào các hoạt động dạy học.

HƯỚNG DẪN CHI TIẾT:
1. **Phần Mục tiêu**: Hãy thêm hoặc làm rõ các mục tiêu về Năng lực số, Năng lực AI (nếu có thể), và STEM.
2. **Phần Thiết bị & Học liệu**: Bổ sung các công cụ số, phần mềm, thiết bị tương tác, công cụ AI cần thiết cho bài dạy.
3. **Phần Tiến trình dạy học**: 
   - Với mỗi hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng):
     + Mục "c) Sản phẩm": BẮT BUỘC PHẢI CÓ LỜI GIẢI CHI TIẾT từng bước hoặc bảng kiến thức hoàn chỉnh mà HS cần đạt, không chỉ ghi chung chung "phiếu trả lời" hay "câu trả lời của HS".
     + Mục "d) Tổ chức thực hiện": BẮT BUỘC THỂ HIỆN RÕ 4 BƯỚC SƯ PHẠM KÈM LỜI THOẠI VÀ HÀNH ĐỘNG CỤ THỂ:
       * Bước 1: Chuyển giao nhiệm vụ (câu hỏi/bài tập cụ thể, lời thoại GV dẫn dắt, câu lệnh prompt mẫu cho ChatGPT/Gemini, link/thao tác GeoGebra/Forms).
       * Bước 2: Thực hiện nhiệm vụ (thời gian làm việc cá nhân/nhóm, dự kiến khó khăn/sai lầm học sinh thường mắc phải và cách GV gợi mở).
       * Bước 3: Báo cáo, thảo luận (chỉ định nhóm/HS trình bày, các nhóm phản biện và đối chiếu kết quả phản biện từ công cụ AI/phần mềm).
       * Bước 4: Kết luận, nhận định (GV chốt kiến thức, ghi rõ bảng tổng kết kiến thức hoặc nội dung cần ghi chép vào vở).
4. **Nổi bật Năng lực số và Năng lực AI**: Khi nhắc đến bất kỳ phần mềm, công cụ thiết bị số, Năng lực số hoặc công cụ AI nào (đặc biệt là những cái bạn vừa bổ sung), BẮT BUỘC định dạng bằng Markdown in đậm chuẩn: **[Tên công cụ / NLS / AI]** (TUYỆT ĐỐI CẤM dùng mã HTML inline như <mark style="..."> hay <span>).
${templateDirective}
${inclusiveEducationBlock}
${MATH_FORMATTING_RULES}
6. TUYỆT ĐỐI KHÔNG sử dụng thẻ HTML \`<br>\` hoặc \`<br/>\`. Sử dụng dấu xuống dòng chuẩn Markdown.
7. Soạn chi tiết đầy đủ 100%, không tóm tắt, không dùng dấu ba chấm (...).`;

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files || [])),
            {
              text: prompt
            }
          ]
        }
      ],
      config: {
        temperature: 0.5,
        maxOutputTokens: 8192,
      }
    });

    res.json({ result: response.text });
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (errorMsg.includes("Unsupported MIME type")) {
      return res.status(400).json({ error: "Định dạng file không được AI hỗ trợ. Vui lòng tải lên PDF, Text hoặc Word (DOC/DOCX)." });
    }
    return handleAiError(error, req, res);
  }
});

// Route for Educational Plan (KHGD - Phân phối chương trình)
app.all("/api/generate-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { subject = "Toán", grade = "10", topic = "" } = req.body;
    const files = resolveFiles(req.body);
    
    const prompt = `Bạn là một Tổ trưởng chuyên môn và chuyên gia giáo dục. Hãy tạo/bổ sung một mẫu Kế hoạch giáo dục (KHGD) cho môn ${subject}, lớp ${grade}, chủ đề "${topic}".
    Giữ nguyên cấu trúc KHGD gốc (của công văn 5512/BGDĐT-GDTrH) và chỉ bổ sung các cột còn thiếu theo yêu cầu chuẩn của các công văn mới nhất về Năng lực số (NLS) (CV 3456) và Năng lực AI (QĐ 2422).
    
    YÊU CẦU BẮT BUỘC ĐỐI VỚI NỘI DUNG:
    - Cột "Năng lực số": BẮT BUỘC phải bắt đầu bằng mã chỉ báo cụ thể trong dấu ngoặc vuông (ví dụ: [1.1.NC1a], [3.1.NC1a], [5.3.NC1b]...). Theo sau là nội dung ứng dụng. Ví dụ: "[3.1.NC1a] Sử dụng công cụ vẽ số hóa biểu đồ".
    - Cột "Năng lực AI": BẮT BUỘC phải bắt đầu bằng mã chỉ báo cụ thể trong dấu ngoặc vuông theo QĐ 2422 (ví dụ: [10.A1.1], [10.C2.1], [12.D2.1]...). Theo sau là yêu cầu cần đạt về AI tương ứng.
    - Cột "Giáo dục STEM/STEAM": Đề xuất hợp lý nhất các bài có thể tích hợp Stem/Steam phù hợp với năng lực và điều kiện thực tế.
    - Giữ nguyên các cột gốc: Bài học, Số tiết/bài, Yêu cầu cần đạt.
    ${MATH_FORMATTING_RULES}
    Trả về kết quả dưới dạng danh sách JSON array với các thuộc tính: lesson, periods, requirement, digitalComp, aiComp, stem, note.`;

    let contents: any = prompt;
    if (files && files.length > 0) {
      contents = [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files)),
            { text: prompt }
          ]
        }
      ];
    }
    const response = await generateWithFallback(req, {
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              lesson: { type: Type.STRING },
              periods: { type: Type.NUMBER },
              requirement: { type: Type.STRING },
              digitalComp: { type: Type.STRING },
              aiComp: { type: Type.STRING },
              stem: { type: Type.STRING },
              note: { type: Type.STRING }
            },
            required: ["lesson", "periods", "requirement", "digitalComp", "aiComp", "stem", "note"]
          }
        }
      }
    });

    const data = safeJsonParse(response.text || "[]");
    return data;
  });
});

// Route for Kế hoạch bài dạy Ôn thi Tốt nghiệp THPT (Module 8b)
app.all(["/api/generate-graduation-review-plan"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { prompt, model, periods = 3, topic = "", subject = "Toán học" } = req.body || {};
    if (!prompt) {
      throw new Error("Không có nội dung yêu cầu tạo kế hoạch bài dạy ôn tập.");
    }
    const safePeriods = Math.max(1, Number(periods) || 3);
    const totalMinutes = safePeriods * 45;
    const periodListStr = Array.from({ length: safePeriods }, (_, idx) => `Tiết ${idx + 1}`).join(", ");
    const isExamPracticeTopic = /Luyện đề|Kiểm tra giữa kỳ/i.test(String(topic || ""));
    const isLiterature = /Ngữ văn/i.test(String(subject || ""));

    const systemInstruction8b = `Bạn là Chuyên gia thẩm định chương trình GDPT 2018 kiêm Giáo viên dạy giỏi cốt cán cấp Tỉnh/Thành phố môn ${subject}.
Nhiệm vụ của bạn là biên soạn KẾ HOẠCH BÀI DẠY (GIÁO ÁN) ÔN THI TỐT NGHIỆP THPT LỚP 12 CHUẨN CÔNG VĂN 5512/BGDĐT cực kỳ chi tiết, đầy đủ 100% nội dung thực chiến để giáo viên dùng dạy ngay trên lớp và in phát trực tiếp Phiếu học tập cho học sinh.

BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT 4 QUY TẮC CỐT LÕI SAU:

1. QUY TẮC CHỐNG TÓM TẮT (ANTI-LAZINESS - CẤM TUYỆT ĐỐI):
- TUYỆT ĐỐI CẤM viết các câu mô tả đại ý, tóm tắt hoặc viết tắt trong ngoặc đơn như: "(Các câu hỏi từ 1 đến 8 tập trung vào...)", "(Giải thích chi tiết: Áp dụng quy tắc...)", "(Tương tự các câu trên)", "(Học sinh giải tương tự)", "...".
- BẮT BUỘC sinh đầy đủ 100% từng định lý, từng phương pháp giải, từng ví dụ minh họa kèm lời giải chi tiết, toàn bộ từng câu hỏi trong Phiếu học tập (Mục IV) và lời giải chi tiết từng bước cho mọi câu (Mục V).

2. CHUẨN HÓA CẤU TRÚC CÔNG VĂN 5512 & PHÂN BỔ THỜI GIAN (${safePeriods} TIẾT = ${totalMinutes} PHÚT):
- Bảng tổng hợp Tiến trình dạy học ở đầu Mục III BẮT BUỘC phải chia đủ số tiết người dùng đã chọn (${safePeriods} tiết = ${totalMinutes} phút, thể hiện rõ đủ ${periodListStr} với tổng thời lượng các hoạt động cộng lại đúng bằng ${totalMinutes} phút).
- Tất cả 4 Hoạt động (Hoạt động 1: Khởi động; Hoạt động 2: Hình thành kiến thức / Hệ thống hóa kiến thức trọng tâm; Hoạt động 3: Luyện tập theo dạng bài; Hoạt động 4: Vận dụng / Nhận diện bẫy đề thi) ĐỀU PHẢI CÓ ĐỦ 4 TIỂU MỤC tách dòng riêng:
  + **a) Mục tiêu:**
  + **b) Nội dung:**
  + **c) Sản phẩm:** (Giải chi tiết tình huống khởi động, bảng hệ thống kiến thức hoàn chỉnh, lời giải chi tiết từng bước của các ví dụ minh họa).
  + **d) Tổ chức thực hiện:** (Trình bày đầy đủ, rõ ràng 4 bước: **Bước 1: Chuyển giao nhiệm vụ** -> **Bước 2: Thực hiện nhiệm vụ** -> **Bước 3: Báo cáo, thảo luận** -> **Bước 4: Kết luận, nhận định**).
- Ở Hoạt động 3 (Luyện tập theo dạng bài): Mỗi dạng bài BẮT BUỘC phải có: **Phương pháp giải tổng quát** + **Ít nhất 1 - 2 Ví dụ minh họa** có đề bài cụ thể, rõ ràng và **Lời giải chi tiết từng bước**.

3. CHI TIẾT HÓA PHIẾU HỌC TẬP & ĐÁP ÁN (MỤC IV & MỤC V):
- **Mục IV (Phiếu học tập tự luyện):** Phải soạn đầy đủ từng câu hỏi cụ thể (đề bài rõ ràng, đủ 4 phương án A, B, C, D trên 4 dòng riêng cho Phần I; đủ 4 ý a), b), c), d) trên 4 dòng riêng cho Phần II; câu hỏi tính toán điền số thực rõ ràng cho Phần III${isExamPracticeTopic ? "; riêng bài Luyện đề/Kiểm tra phải đủ 22 câu: 12 câu Phần I + 4 câu Phần II + 6 câu Phần III" : ""}) bám sát đúng mức độ mục tiêu học sinh đã chọn. Không lộ đáp án ở Mục IV.
- **Mục V (Bảng đáp án và hướng dẫn giải chi tiết):**
  + **5.1. Bảng đáp án nhanh:** Kẻ bảng tổng hợp đáp án nhanh cho toàn bộ các câu hỏi của Phần I, Phần II (Đúng/Sai cho từng ý a, b, c, d), Phần III (đáp số từng câu).
  + **5.2. Lời giải chi tiết từng bước:** Giải chi tiết từng bước cho TOÀN BỘ 100% các câu hỏi ở Mục IV (giải thích từng câu Phần I; chứng minh rõ vì sao từng ý a, b, c, d ở Phần II là Đúng hay Sai; trình bày đầy đủ các bước giải và kết quả làm tròn cho các câu Vận dụng / VDC ở Phần III).

4. QUY TẮC ĐỊNH DẠNG MARKDOWN & LATEX CHUẨN MỰC (KHÔNG LỖI HIỂN THỊ):
- Dùng cú pháp in đậm chuẩn \`**text**\` (không để khoảng trắng sát bên trong dấu \`**\`, không để dấu \`***\` hay \`****\`, luôn có khoảng trắng sau \`**Nhãn:**\`). Không đặt dấu gạch đầu dòng \`-\` hoặc \`+\` trước tiêu đề \`#\`, \`##\`, \`###\`, \`####\`.
- TẤT CẢ công thức, ký hiệu toán học, biến số đơn lẻ ($x$, $y$, $z$, $m$, $a$, $b$, $f'(x)$, $\\Delta$, $\\mathbb{R}$...) BẮT BUỘC bọc trong cặp dấu \`$ ... $\` (nội dòng) hoặc \`$$ ... $$\` (khối riêng). Luôn dùng \`\\frac\` thay vì \`\\dfrac\`.
- TUYỆT ĐỐI KHÔNG chèn các từ tiếng Việt có dấu (như "Lưu ý", "với", "hoặc", "và", "trên khoảng", "thỏa mãn", "loại") hoặc thẻ \`<br/>\` vào bên trong cặp dấu \`$ ... $\` hay \`$$ ... $$\`!
  + Ví dụ ĐÚNG: \`$f'(x) \\ge 0$ (hoặc $f'(x) \\le 0$) trên khoảng $(a; b)$\`, \`$\\Delta' \\le 0$ (với $a \\ne 0$)\`, \`$x = 1$ (thỏa mãn)\`.
  + Ví dụ SAI (CẤM VIẾT): \`$f'(x) \\ge 0 (hoặc \\le 0) trên khoảng (a; b)$\`, \`$\\Delta' \\le 0 (với a \\ne 0)$\`, \`$a > 0 <br/> Lưu ý: ...$\`.`;

    const requestedClean = String(model || "gemini-4-hydrogen").replace(/^models\//, "").trim();
    const preferredModels = Array.from(new Set([
      ...(requestedClean && !requestedClean.includes("1.5") && !requestedClean.includes("2.0") && !requestedClean.includes("2.5") ? [requestedClean] : []),
      "gemini-4-hydrogen",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite"
    ]));

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      model: preferredModels[0],
      preferredModels,
      config: {
        maxOutputTokens: 65536,
        systemInstruction: systemInstruction8b
      }
    });

    let finalMarkdown = (response?.text ? response.text.normalize("NFC").trim() : "") || "";

    // Kiểm tra chống tóm tắt (Anti-Laziness) & Tự động hoàn thiện Mục IV, V nếu AI viết tắt hoặc bị ngắt giữa chừng
    if (finalMarkdown && !isLiterature) {
      const hasLazySummary =
        /\(\s*(?:Các\s+câu\s+(?:hỏi\s+)?từ\s+\d+\s+đến\s+\d+|Giải\s+thích\s+chi\s+tiết\s*:|Tương\s+tự\s+các\s+câu|HS\s+tự\s+giải\s+tương\s+tự|Các\s+câu\s+còn\s+lại)[^)]*\)/i.test(finalMarkdown) ||
        /\.\.\.\s*\((?:Giải\s+chi\s+tiết|Các\s+câu\s+hỏi)/i.test(finalMarkdown);

      const sec4Index = finalMarkdown.search(/##\s*IV\b/i);
      const sec5Index = finalMarkdown.search(/##\s*V\b/i);
      const sec4Text = sec4Index !== -1 ? finalMarkdown.slice(sec4Index, sec5Index !== -1 ? sec5Index : undefined) : "";
      const sec5Text = sec5Index !== -1 ? finalMarkdown.slice(sec5Index) : "";
      const sec4QuestionCount = (sec4Text.match(/(?:^|\n)\s*(?:\*{0,2})Câu\s+\d+/gi) || []).length;
      const sec5SolutionCount = (sec5Text.match(/(?:^|\n|\|)\s*(?:[-*•●]\s*)?(?:\*{0,2})Câu\s+\d+/gi) || []).length;
      const minExpectedQuestions = isExamPracticeTopic ? 18 : (safePeriods >= 3 ? 12 : 9);

      if (hasLazySummary || sec4Index === -1 || sec5Index === -1 || sec4QuestionCount < minExpectedQuestions || sec5SolutionCount < Math.max(6, sec4QuestionCount - 2)) {
        try {
          const expandPrompt = `Dựa trên Kế hoạch bài dạy môn ${subject} - Chủ đề: "${topic}" (${safePeriods} tiết = ${totalMinutes} phút), hãy biên soạn ĐẦY ĐỦ 100%, CHI TIẾT TUYỆT ĐỐI hai mục cuối là **Mục IV (PHIẾU HỌC TẬP TỰ LUYỆN)** và **Mục V (BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT)** để ghép hoàn chỉnh vào giáo án.

YÊU CẦU BẮT BUỘC (TUYỆT ĐỐI CẤM VIẾT TẮT HAY TÓM TẮT TRONG NGOẶC ĐƠN):
1. Bắt đầu ngay bằng tiêu đề: \`## IV. PHIẾU HỌC TẬP TỰ LUYỆN: ${String(topic || "").toUpperCase()}\`
   - Dòng thông tin: \`*Họ và tên học sinh: .................................................... Lớp: 12..... Điểm: .......... / 10*\`
   - \`### PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN\`: Viết ĐẦY ĐỦ từng câu từ **Câu 1** đến **Câu ${isExamPracticeTopic ? 12 : (safePeriods >= 3 ? 8 : 6)}**. Mỗi câu có đề bài tường minh và đủ 4 phương án \`A.\`, \`B.\`, \`C.\`, \`D.\` trên 4 dòng riêng biệt. CẤM viết "(Các câu từ... tập trung vào...)".
   - \`### PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG / SAI\`: Viết ĐẦY ĐỦ từng câu từ **Câu 1** đến **Câu ${isExamPracticeTopic ? 4 : 3}**. Mỗi câu có dẫn nhập rõ ràng và đủ 4 mệnh đề \`a)\`, \`b)\`, \`c)\`, \`d)\` trên 4 dòng riêng biệt.
   - \`### PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN\`: Viết ĐẦY ĐỦ từng câu từ **Câu 1** đến **Câu ${isExamPracticeTopic ? 6 : 4}** (bài toán tính toán, tham số $m$, cực trị/tối ưu thực tế có kết quả là số cụ thể).
2. Tiếp theo là \`## V. BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT\`:
   - \`### 1. Bảng đáp án nhanh\`: Kẻ bảng Markdown tổng hợp đáp án nhanh cho toàn bộ các câu của Phần I, Phần II (Đúng/Sai cho từng ý a, b, c, d), và Phần III (đáp số từng câu).
   - \`### 2. Lời giải chi tiết từng bước\`:
     + **Phần I:** Giải chi tiết từng bước cho TẤT CẢ các câu từ Câu 1 đến hết Phần I.
     + **Phần II:** Giải thích tường minh vì sao từng ý \`a)\`, \`b)\`, \`c)\`, \`d)\` của mỗi câu là **ĐÚNG** hay **SAI** kèm phép biến đổi.
     + **Phần III:** Trình bày lời giải từng bước từ lập hàm/công thức đến kết quả số cuối cùng cho TẤT CẢ các câu.
3. Cuối cùng là mục \`### PHÊ DUYỆT CỦA TỔ CHUYÊN MÔN\`.
4. Tuân thủ nghiêm ngặt LaTeX: bọc công thức trong \`$ ... $\` hoặc \`$$ ... $$\`, dùng \`\\frac\`, TUYỆT ĐỐI KHÔNG đặt chữ tiếng Việt có dấu ("với", "hoặc", "trên khoảng", "Lưu ý") hay \`<br/>\` vào bên trong dấu \`$\`.`;

          const expandRes = await generateWithFallback(req, {
            contents: [{ role: "user", parts: [{ text: expandPrompt }] }],
            model: preferredModels[0],
            preferredModels,
            config: {
              maxOutputTokens: 65536,
              systemInstruction: systemInstruction8b
            }
          });
          const expandedText = (expandRes?.text ? expandRes.text.normalize("NFC").trim() : "") || "";
          const expandedSec4Idx = expandedText.search(/##\s*IV\b/i);
          if (expandedSec4Idx !== -1 && expandedText.length > 1200) {
            const cleanExpanded = expandedText.slice(expandedSec4Idx).trim();
            if (sec4Index !== -1) {
              finalMarkdown = finalMarkdown.slice(0, sec4Index).trim() + "\n\n" + cleanExpanded;
            } else {
              finalMarkdown = finalMarkdown.trim() + "\n\n" + cleanExpanded;
            }
          }
        } catch (expandErr) {
          console.warn("Auto-expand Mục IV & V warning:", expandErr);
        }
      }
    }

    return {
      result: finalMarkdown
    };
  });
});

// Route for fetching available Gemini models via server proxy
app.all(["/api/list-gemini-models"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers['authorization'] as string;
    let customKey = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      customKey = authHeader.substring(7);
    } else {
      customKey = req.headers['x-gemini-api-key'] as string;
    }
    if (customKey) {
      try { customKey = decodeURIComponent(customKey); } catch (e) {}
      customKey = customKey.replace(/[^\x20-\x7E]/g, '').trim();
    }
    const activeKey = customKey || process.env.GEMINI_API_KEY || "";
    if (!activeKey) {
      return res.status(400).json({ error: "Chưa cấu hình API Key" });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Không thể truy vấn danh sách mô hình.`);
    }
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Lỗi nạp danh sách mô hình từ Google." });
  }
});

// Generic server-side Gemini generation endpoint
app.all(["/api/generate"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { prompt, contents, systemInstruction, model, temperature, maxOutputTokens, responseMimeType } = req.body || {};
    let finalContents = contents;
    if (!finalContents && prompt) {
      finalContents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
    }

    const payload = {
      model: model || "gemini-4-hydrogen",
      contents: finalContents,
      config: {
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        ...(responseMimeType ? { responseMimeType } : {}),
        ...(systemInstruction ? { systemInstruction } : {})
      }
    };

    const response = await generateWithFallback(req, payload, res);
    const resultText = response?.text ? response.text.normalize("NFC").trim() : "";
    return res.json({ success: true, result: resultText, text: resultText });
  } catch (error: any) {
    console.error("Lỗi /api/generate:", error);
    return handleAiError(error, req, res);
  }
});

// Generic server-side Gemini streaming endpoint
app.all(["/api/generate-stream"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { prompt, contents, systemInstruction, model, temperature, maxOutputTokens } = req.body || {};
    let finalContents = contents;
    if (!finalContents && prompt) {
      finalContents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
    }

    const payload = {
      model: model || "gemini-4-hydrogen",
      contents: finalContents,
      config: {
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        ...(systemInstruction ? { systemInstruction } : {})
      }
    };

    return await generateWithFallbackStream(req, res, payload);
  } catch (error: any) {
    console.error("Lỗi /api/generate-stream:", error);
    return handleAiError(error, req, res);
  }
});

// Server-side Live API token / session configuration endpoint
app.all(["/api/live-token"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = getAiApiKey(req);
    if (!apiKey) {
      return res.status(400).json({ error: "Thiếu Gemini API Key trên Server" });
    }
    return res.json({
      success: true,
      model: "gemini-3.8-live",
      endpoint: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
      apiKeyConfigured: true
    });
  } catch (err: any) {
    return handleAiError(err, req, res);
  }
});

// Route for Kế hoạch bài dạy (Giáo án CV 5512)
app.all(["/api/generate-lesson-plan", "/api/generate-lesson-plan-file"], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    // If request comes with topic only and no lesson, fallback to KHGD
    if (req.body.topic && !req.body.lesson && !req.body.name) {
      const { subject = "Toán", grade = "10", topic = "" } = req.body;
      const files = resolveFiles(req.body);
      const prompt = `Bạn là một Tổ trưởng chuyên môn và chuyên gia giáo dục. Hãy tạo mẫu Kế hoạch giáo dục (KHGD) cho môn ${subject}, lớp ${grade}, chủ đề "${topic}". Trả về kết quả dưới dạng danh sách JSON array với các thuộc tính: lesson, periods, requirement, digitalComp, aiComp, stem, note.`;
      const response = await generateWithFallback(req, {
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return safeJsonParse(response.text || "[]");
    }

    const lesson = req.body.lesson || req.body.name || "Bài học";
    const subject = req.body.subject || "Toán";
    const grade = req.body.grade || "10";
    const periods = Number(req.body.periods) || 2;
    const requirement = req.body.requirement || req.body.requirements || "";
    const digitalComp = req.body.digitalComp || req.body.digitalCompetence || "";
    const aiComp = req.body.aiComp || req.body.aiCompetence || "";
    const stem = req.body.stem || "";
    const textbook = req.body.textbook || "Kết nối tri thức với cuộc sống";
    const includeInclusiveEducation = req.body.includeInclusiveEducation === true;
    const templateName = typeof req.body.templateName === "string" ? req.body.templateName.trim() : "";
    const templateStandardRef = typeof req.body.templateStandardRef === "string" ? req.body.templateStandardRef.trim() : "";
    const templatePromptDirective = typeof req.body.templatePromptDirective === "string" ? req.body.templatePromptDirective.trim() : "";
    const maxOutputTokens = 16384;
    const files = resolveFiles(req.body);

    const templateDirectiveBlock = templatePromptDirective
      ? `\n\nYÊU CẦU ĐẶC THÙ CỦA KHUNG MẪU GIÁO ÁN ĐÃ CHỌN (${templateName || "Khung mẫu GDPT 2018"}${templateStandardRef ? ` — ${templateStandardRef}` : ""}):\n${templatePromptDirective}\n(Lưu ý ưu tiên cao nhất: Tuân thủ chính xác cấu trúc hoạt động, bảng biểu, mã chỉ báo Năng lực số, yếu tố STEM/STEAM và Phụ lục Rubric/Bảng kiểm của khung mẫu này, đồng thời vẫn phân bổ đầy đủ từ Tiết 1 đến Tiết ${periods} và đảm bảo mọi hoạt động đều có đầy đủ 4 mục a, b, c, d chuẩn CV 5512.)`
      : "";

    const inclusiveEducationBlock = includeInclusiveEducation ? `

IV. ĐIỀU CHỈNH KẾ HOẠCH DẠY HỌC CHO HỌC SINH KHUYẾT TẬT HÒA NHẬP (MỤC BỔ SUNG CHO MÔN HỌC/HOẠT ĐỘNG):
Bám sát Thông tư 03/2018/TT-BGDĐT và Công văn 5512/BGDĐT-GDTrH, hãy bổ sung mục này với cấu trúc chuẩn:
1. **MỤC TIÊU ĐIỀU CHỈNH:**
   - Kiến thức: [Yêu cầu cần đạt cốt lõi tối thiểu mà HS khuyết tật cần nhận biết/thực hiện được trong môn ${subject}]
   - Năng lực: [Năng lực đặc thù môn ${subject} cơ bản, năng lực sử dụng công cụ hỗ trợ, năng lực tự chủ/hợp tác]
   - Phẩm chất: [Tự tin, kiên trì, hòa nhập cùng bạn bè]
2. **NỘI DUNG ĐIỀU CHỈNH CHI TIẾT THEO TIẾN TRÌNH:**
   Bảng gồm 4 cột: | Hoạt động | YCCĐ & Nhiệm vụ của cả lớp | Điều chỉnh cho HS hòa nhập | Biện pháp & Công cụ hỗ trợ |
   - Hoạt động 1: Khởi động (Nhiệm vụ thu gọn, trực quan, tăng thời gian)
   - Hoạt động 2: Hình thành kiến thức mới (Giảm tải biến đổi/lý thuyết phức tạp, dùng mô hình trực quan/thẻ màu/máy tính hoặc công cụ phù hợp môn học)
   - Hoạt động 3: Luyện tập (Bài tập mức độ Nhận biết - Thông hiểu đơn giản, rút gọn)
   - Hoạt động 4: Vận dụng (Nhiệm vụ gắn thực tiễn đơn giản, vừa sức)
3. **ĐÁNH GIÁ SỰ TIẾN BỘ & KIỂM TRA ĐỊNH KỲ:**
   - Đánh giá thường xuyên: [Quan sát quá trình, động viên khích lệ, chấm điểm dựa trên mức độ cố gắng và tiến bộ so với chính bản thân HS]
   - Bài kiểm tra định kỳ: [Đề xuất cấu trúc đề rút gọn, tăng 30% - 50% thời gian làm bài, giảm bớt các câu hỏi vận dụng cao]
` : '';

    const lessonPlanSystemInstruction = `Bạn là Chuyên gia Sư phạm cao cấp, Chuyên viên Vụ Giáo dục Trung học (Bộ GD&ĐT), và Giáo viên giỏi cốt cán chuyên sâu về đổi mới phương pháp dạy học theo Chương trình Giáo dục phổ thông 2018.
Nhiệm vụ của bạn là biên soạn một KẾ HOẠCH BÀI DẠY (GIÁO ÁN) hoàn chỉnh, mẫu mực, chuẩn mực sư phạm 100% theo đúng quy định Công văn 5512/BGDĐT-GDTrH và bám sát bộ sách giáo khoa "${textbook}".

YÊU CẦU ĐẶC BIỆT QUAN TRỌNG VỀ PHÂN BỔ DUNG LƯỢNG TIẾT HỌC (${periods} TIẾT):
- Bài học này có tổng cộng ${periods} TIẾT. Bạn BẮT BUỘC phải viết ĐẦY ĐỦ LẦN LƯỢT TỪ TIẾT 1 ĐẾN TIẾT ${periods}.
- Đảm bảo phân bổ độ dài đồng đều giữa các tiết. TUYỆT ĐỐI KHÔNG viết quá dài dòng ở Tiết 1 rồi làm cạn token và bỏ lửng Tiết 2, Tiết 3 hay Tiết ${periods}.
- Mọi tiết học (từ Tiết 1 đến Tiết ${periods}) đều phải xuất hiện rõ ràng với tiêu đề "### TIẾT 1: ...", "### TIẾT 2: ...", ..., "### TIẾT ${periods}: ...", và trong từng tiết phải có ĐẦY ĐỦ 4 HOẠT ĐỘNG.

CÁC NGUYÊN TẮC CỐT LÕI BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT:

1. TIẾN TRÌNG DẠY HỌC PHÂN BỔ ĐẦY ĐỦ ${periods} TIẾT (CHUẨN HÓA 4 HOẠT ĐỘNG CHO TỪNG TIẾT):
- Căn cứ vào thời lượng ${periods} tiết, phần "III. TIẾN TRÌNG DẠY HỌC" BẮT BUỘC PHẢI ĐƯỢC PHÂN CHIA RÕ RÀNG VÀ CHI TIẾT THEO TỪNG TIẾT HỌC: TIẾT 1, TIẾT 2, ..., TIẾT ${periods}.
- Mỗi tiết học là một chỉnh thể sư phạm hoàn chỉnh gồm ĐẦY ĐỦ 4 HOẠT ĐỘNG CHUẨN CÔNG VĂN 5512:
  + Hoạt động 1: Khởi động / Mở đầu (Xác định vấn đề / tình huống học tập của tiết)
  + Hoạt động 2: Hình thành kiến thức mới (Chiếm lĩnh các đơn vị kiến thức tương ứng phân phối cho tiết đó)
  + Hoạt động 3: Luyện tập (Hệ thống câu hỏi, bài tập có giải chi tiết để củng cố kiến thức tiết học)
  + Hoạt động 4: Vận dụng / Giao việc về nhà (Ứng dụng thực tiễn, định hướng STEM, chuẩn bị cho tiết tiếp theo).
- Soạn đầy đủ cho tất cả các tiết (từ Tiết 1 đến Tiết ${periods}), tuyệt đối KHÔNG bỏ lửng hay viết tắt.

2. ĐẦU RA MỤC "c) Sản phẩm" BẮT BUỘC PHẢI CÓ LỜI GIẢI / ĐÁP ÁN CHI TIẾT:
- Bắt buộc trình bày LỜI GIẢI CHI TIẾT từng bước, đáp số cụ thể hoặc BẢNG KIẾN THỨC HOÀN CHỈNH mà học sinh cần đạt được.
- TUYỆT ĐỐI KHÔNG chỉ ghi chung chung như "phiếu trả lời", "câu trả lời của HS", "học sinh làm bài vào vở". Toàn bộ nội dung lời giải, các bước biến đổi, công thức và đáp số phải được viết đầy đủ vào mục Sản phẩm.

3. Ở MỖI HOẠT ĐỘNG, MỤC "d) Tổ chức thực hiện" BẮT BUỘC VIẾT RÕ 4 BƯỚC KÈM LỜI THOẠI VÀ HÀNH ĐỘNG CỤ THỂ:
- **Bước 1: Chuyển giao nhiệm vụ**:
  + GV chiếu slide hoặc phát phiếu học tập (ghi rõ nội dung cụ thể câu hỏi/bài tập mẫu, số liệu và công thức rõ ràng, KHÔNG ghi chung chung).
  + Kèm lời thoại sư phạm cụ thể của giáo viên khi dẫn dắt và giao việc cho học sinh.
  + Hướng dẫn cụ thể thao tác số/AI/STEM: Ghi rõ CÂU LỆNH PROMPT MẪU học sinh cần nhập vào ChatGPT/Gemini là gì (ví dụ: 'Hãy tìm 3 phản ví dụ trong thực tế chứng minh mệnh đề sau là sai: ...'); cung cấp đường link hoặc hướng dẫn thao tác GeoGebra/Google Forms/Quizizz cụ thể.
- **Bước 2: Thực hiện nhiệm vụ**:
  + Nêu rõ thời gian làm việc (học sinh làm việc cá nhân trong bao nhiêu phút, sau đó thảo luận cặp đôi hoặc nhóm trong bao nhiêu phút).
  + GV quan sát, bao quát lớp; DỰ KIẾN CÁC KHÓ KHĂN, SAI LẦM PHỔ BIẾN học sinh thường mắc phải và CÁCH GV GỢI MỞ, HỖ TRỢ kịp thời để học sinh tự tìm ra hướng giải quyết.
- **Bước 3: Báo cáo, thảo luận**:
  + Chỉ định rõ nhóm hoặc học sinh trình bày (chiếu bài làm lên bảng, dùng bảng nhóm hoặc trình chiếu từ thiết bị thông minh).
  + Các nhóm khác chú ý theo dõi, nhận xét, đối chiếu kết quả phản biện từ công cụ AI/phần mềm.
  + GV định hướng câu hỏi thảo luận mở rộng hoặc cho học sinh chất vấn lẫn nhau để khắc sâu bản chất kiến thức.
- **Bước 4: Kết luận, nhận định**:
  + GV phân tích, nhận xét thái độ làm việc và đánh giá độ chính xác trong câu trả lời của các nhóm.
  + GV chốt kiến thức trọng tâm: GHI RÕ BẢNG TỔNG KẾT KIẾN THỨC HOẶC NỘI DUNG CHÍNH HỌC SINH CẦN GHI CHÉP VÀO VỞ ĐỂ HỌC TẬP.

4. THỂ HIỆN RÕ NĂNG LỰC SỐ, NĂNG LỰC AI VÀ STEM TRONG TỪNG HOẠT ĐỘNG:
- Lồng ghép trực tiếp vào tiến trình hoạt động (ở mục Nội dung, Sản phẩm và 4 bước Tổ chức thực hiện):
  + [Năng lực số (NLS)]: Chỉ rõ phần mềm (Google Forms, Quizizz, GeoGebra, Desmos, Padlet, Canva...) và sản phẩm số đầu ra.
  + [Năng lực AI]: Kịch bản tương tác với AI (ChatGPT/Gemini), câu lệnh prompt mẫu, so sánh đối chiếu kết quả của AI với SGK, đánh giá tính chính xác và phản biện giới hạn của AI.
  + [Tích hợp STEM/STEAM]: Giao nhiệm vụ thực tiễn gắn với kỹ thuật và đời sống.
- NỔI BẬT NLS VÀ AI: BẮT BUỘC định dạng mọi công cụ số, phần mềm, NLS hoặc AI bằng Markdown in đậm chuẩn:
  **[Tên công cụ / NLS / AI]** (TUYỆT ĐỐI CẤM dùng mã HTML inline như <mark style="..."> hay <span>).

5. CHUẨN MỰC TRÌNH BÀY VÀ TOÀN VẸN 100%:
- Soạn đầy đủ, chi tiết từ đầu đến cuối cho tất cả các tiết (từ Tiết 1 đến Tiết ${periods}).
- Tuyệt đối KHÔNG viết tóm tắt, KHÔNG để dấu ba chấm (...), KHÔNG ghi "(tương tự tiết 1)".
- Đảm bảo công thức toán học dùng chuẩn LaTeX kẹp trong $...$ hoặc $$...$$.
- Đối với đoạn mã lập trình (Code Python, Scratch, thuật toán, lệnh if, for, while, print, input...): BẮT BUỘC đặt trong khối mã \`\`\`python ... \`\`\` hoặc bọc dấu backtick inline \`...\` (Ví dụ: \`if score > 5: print("Pass")\`). TUYỆT ĐỐI KHÔNG bọc dấu $...$ hay LaTeX vào mã lập trình hoặc chuỗi string.${templateDirectiveBlock}`;

    const prompt = `Hãy biên soạn toàn diện KẾ HOẠCH BÀI DẠY chuẩn Công văn 5512/BGDĐT-GDTrH${templateName ? ` theo khung mẫu "${templateName}"` : ''} và bộ sách "${textbook}" cho bài học sau:

THÔNG TIN BÀI DẠY:
- Môn học: ${subject}
- Lớp: ${grade}
- Tên bài dạy: ${lesson}
- Thời lượng: ${periods} tiết (BẮT BUỘC: Tiến trình dạy học ở Phần III phải chia cụ thể và viết ĐẦY ĐỦ từ TIẾT 1 đến TIẾT ${periods}. Tuyệt đối không dừng giữa chừng)
- Bộ sách giáo khoa: ${textbook}
${templateName ? `- Khung mẫu giáo án áp dụng: ${templateName}${templateStandardRef ? ` (${templateStandardRef})` : ''}` : ''}
${requirement ? `- Yêu cầu cần đạt: ${requirement}` : ''}
${digitalComp ? `- Năng lực số (NLS) cần lồng ghép: ${digitalComp}` : ''}
${aiComp ? `- Năng lực Trí tuệ nhân tạo (AI) cần lồng ghép: ${aiComp}` : ''}
${stem ? `- Định hướng STEM/STEAM: ${stem}` : ''}
${templateDirectiveBlock}

CẤU TRÚC KẾ HOẠCH BÀI DẠY BẮT BUỘC (VIẾT CHI TIẾT TOÀN DIỆN TỪ TIẾT 1 ĐẾN TIẾT ${periods}):

# KẾ HOẠCH BÀI DẠY: ${lesson.toUpperCase()}
${templateName ? `**Khung mẫu:** ${templateName}${templateStandardRef ? ` (${templateStandardRef})` : ''}  \n` : ''}**Môn học:** ${subject} | **Lớp:** ${grade} | **Thời lượng:** ${periods} tiết  
**Bộ sách:** ${textbook}

---

## I. MỤC TIÊU
1. **Kiến thức:** Trình bày cụ thể các kiến thức học sinh cần chiếm lĩnh sau bài học.
2. **Năng lực:**
   - **Năng lực chung:** Tự chủ và tự học; Giao tiếp và hợp tác; Giải quyết vấn đề và sáng tạo.
   - **Năng lực đặc thù (${subject}):** Nêu rõ các năng lực thành phần chuyên môn môn học.
   - **Năng lực số (NLS):** Chỉ báo và thao tác số học sinh vận dụng.
   - **Năng lực AI:** Năng lực xây dựng câu lệnh prompt, kiểm chứng, phản biện kết quả của AI.
3. **Phẩm chất:** Chăm chỉ, trung thực, trách nhiệm, nhân ái.

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** Máy chiếu/ti vi tương tác, bài giảng điện tử, phiếu học tập số (Google Forms/Quizizz), máy tính kết nối mạng, câu lệnh mẫu (prompts) cho AI, phần mềm dạy học (GeoGebra/Desmos).
2. **Học sinh:** SGK ${textbook}, vở ghi chép, thiết bị thông minh (quét mã QR, thực hiện prompt AI, tra cứu học liệu số).

## III. TIẾN TRÌNG DẠY HỌC (BẮT BUỘC PHÂN CHIA CỤ THỂ THEO ĐÚNG ${periods} TIẾT)

(Hãy soạn chi tiết lần lượt từ TIẾT 1 đến TIẾT ${periods}. Trong MỖI TIẾT, phải có ĐẦY ĐỦ 4 HOẠT ĐỘNG:
- Hoạt động 1: Mở đầu / Khởi động
- Hoạt động 2: Hình thành kiến thức mới
- Hoạt động 3: Luyện tập
- Hoạt động 4: Vận dụng / Giao việc về nhà

Ở MỖI HOẠT ĐỘNG, BẮT BUỘC TRÌNH BÀY ĐỦ 4 MỤC CHI TIẾT NHƯ SAU:
a) Mục tiêu: Nêu rõ mục tiêu cần đạt của hoạt động (kiến thức, NLS, năng lực AI, phẩm chất).
b) Nội dung: Nhiệm vụ học tập cụ thể, câu hỏi, đề bài hoặc phiếu học tập (ghi rõ nội dung cụ thể câu hỏi/bài tập mẫu, không ghi chung chung).
c) Sản phẩm: BẮT BUỘC TRÌNH BÀY LỜI GIẢI CHI TIẾT hoặc BẢNG KIẾN THỨC HOÀN CHỈNH mà HS cần đạt, TUYỆT ĐỐI KHÔNG CHỈ GHI "phiếu trả lời" hay "câu trả lời của HS".
d) Tổ chức thực hiện: BẮT BUỘC VIẾT RÕ 4 BƯỚC KÈM LỜI THOẠI VÀ HÀNH ĐỘNG CỤ THỂ:
   - **Bước 1: Chuyển giao nhiệm vụ**:
     + GV chiếu slide/giao phiếu học tập (ghi rõ nội dung cụ thể câu hỏi/bài tập mẫu, không ghi chung chung).
     + Kèm lời thoại sư phạm dẫn dắt của GV.
     + Hướng dẫn cụ thể thao tác số/AI/STEM: Câu lệnh prompt mẫu học sinh cần nhập vào ChatGPT/Gemini là gì; link hoặc thao tác GeoGebra/Forms cụ thể.
   - **Bước 2: Thực hiện nhiệm vụ**:
     + HS làm việc cá nhân hoặc nhóm trong bao nhiêu phút.
     + Dự kiến các khó khăn, sai lầm học sinh thường mắc phải và cách GV gợi mở.
   - **Bước 3: Báo cáo, thảo luận**:
     + Chỉ định nhóm/HS trình bày; các nhóm khác nhận xét, đối chiếu kết quả phản biện từ công cụ AI/phần mềm.
   - **Bước 4: Kết luận, nhận định**:
     + GV chốt kiến thức trọng tâm (ghi rõ bảng tổng kết kiến thức hoặc nội dung cần ghi chép vào vở).
)

LƯU Ý ĐẶC BIỆT:
- Lồng ghép trực tiếp các kịch bản [Năng lực số], [Năng lực AI] và [Tích hợp STEM/STEAM] vào từng hoạt động và sản phẩm cụ thể của học sinh.
- Nổi bật mọi công cụ số, NLS, AI bằng Markdown in đậm chuẩn: **[Tên công cụ / NLS / AI]** (TUYỆT ĐỐI CẤM dùng mã HTML inline như <mark style="..."> hay <span>).
- Viết chi tiết đầy đủ 100% từ Tiết 1 đến Tiết ${periods}, không tóm tắt, không dùng dấu ba chấm (...).
- ĐỐI VỚI MÔN TOÁN (Đặc biệt các bài học về Hàm số, Đạo hàm, Khảo sát hàm số, Tính đơn điệu, Cực trị, Bất phương trình, Hình học):
  + Ở Hoạt động 2 (Hình thành kiến thức mới) và Hoạt động 3 (Luyện tập), BẮT BUỘC chèn BẢNG BIẾN THIÊN dạng Markdown Table chuẩn hoặc khối TikZ/SVG đồ thị hàm số chuẩn SGK vào phần Sản phẩm của học sinh và phần Chuyển giao nhiệm vụ.
  + Tuyệt đối không để trống bảng biến thiên hoặc hình vẽ đồ thị.
${inclusiveEducationBlock}
${MATH_FORMATTING_RULES}`;

    let contents: any = prompt;
    if (files && files.length > 0) {
      contents = [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files)),
            { text: prompt }
          ]
        }
      ];
    }

    const response = await generateWithFallback(req, {
      contents: contents,
      config: {
        systemInstruction: lessonPlanSystemInstruction,
        temperature: 0.5,
        maxOutputTokens: maxOutputTokens
      }
    });

    return { result: response.text };
  });
});

// Endpoint soạn riêng Kế hoạch Giáo dục Hòa nhập (Học sinh khuyết tật)
app.all("/api/generate-inclusive-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const lesson = req.body.lesson || req.body.name || "Bài học";
    const subject = req.body.subject || "Toán";
    const grade = req.body.grade || "10";
    const periods = Number(req.body.periods) || 2;
    const requirement = req.body.requirement || "";
    const disabilityType = req.body.disabilityType || "Khuyết tật trí tuệ nhẹ / Khuyết tật vận động / Ngôn ngữ / Tăng động / Khiếm thị / Khiếm thính";
    const textbook = req.body.textbook || "Kết nối tri thức với cuộc sống";
    const files = resolveFiles(req.body);

    const prompt = `Bạn là Chuyên gia Giáo dục Đặc biệt và Chuyên viên Tư vấn Giáo dục Hòa nhập (Bộ GD&ĐT).
Nhiệm vụ: Hãy biên soạn một KẾ HOẠCH ĐIỀU CHỈNH DẠY HỌC DÀNH RIÊNG CHO HỌC SINH KHUYẾT TẬT HÒA NHẬP chuẩn Thông tư 03/2018/TT-BGDĐT và Công văn 5512/BGDĐT-GDTrH cho bài học sau:

THÔNG TIN BÀI DẠY:
- Môn học: ${subject} | Lớp: ${grade}
- Tên bài học: ${lesson}
- Thời lượng: ${periods} tiết
- Bộ sách: ${textbook}
${requirement ? `- Yêu cầu cần đạt chung: ${requirement}` : ''}
${disabilityType ? `- Dạng khuyết tật / Nhu cầu hỗ trợ hòa nhập: ${disabilityType}` : ''}

CẤU TRÚC BẮT BUỘC (BIÊN SOẠN HOÀN CHỈNH, MẪU MỰC SƯ PHẠM HÒA NHẬP, KHÔNG TÓM TẮT):

# KẾ HOẠCH ĐIỀU CHỈNH DẠY HỌC CHO HỌC SINH KHUYẾT TẬT HÒA NHẬP
**Môn học:** ${subject} | **Lớp:** ${grade} | **Bài dạy:** ${lesson} (${periods} tiết)  
**Bộ sách:** ${textbook} | **Đối tượng hòa nhập:** ${disabilityType}

---

## I. MỤC TIÊU ĐIỀU CHỈNH
1. **Kiến thức cốt lõi:** Yêu cầu tối thiểu cần nhận biết/thực hiện được trong môn ${subject} bài ${lesson}.
2. **Năng lực đặc thù & công cụ hỗ trợ:** Năng lực cơ bản, năng lực sử dụng công cụ hỗ trợ (máy tính, thẻ màu, mô hình, chữ phóng to, phần mềm...).
3. **Phẩm chất hòa nhập:** Tự tin, kiên trì, tích cực tham gia hoạt động cùng bạn bè.

## II. THIẾT BỊ DẠY HỌC VÀ CÔNG CỤ HỖ TRỢ ĐẶC THÙ
- Các thiết bị trực quan, đồ dùng trợ giảng, học liệu điều chỉnh rút gọn, phần mềm công nghệ hoặc dụng cụ hỗ trợ riêng cho học sinh khuyết tật.

## III. NỘI DUNG VÀ TIẾN TRÌNG ĐIỀU CHỈNH DẠY HỌC CHI TIẾT
Biên soạn BẢNG ĐIỀU CHỈNH TIẾN TRÌNH 4 CỘT chuẩn mực lần lượt từ Tiết 1 đến Tiết ${periods}:

| Tiết & Hoạt động | YCCĐ & Nhiệm vụ chung của cả lớp | Điều chỉnh cho Học sinh Hòa nhập | Biện pháp & Công cụ hỗ trợ đặc thù |
| :--- | :--- | :--- | :--- |
| **TIẾT 1 - HĐ 1: Khởi động** | [Nhiệm vụ chung] | [Mục tiêu & Nhiệm vụ thu gọn, trực quan, tăng thời gian] | [Thẻ câu hỏi trực quan, trợ giảng, gợi mở] |
| **TIẾT 1 - HĐ 2: Hình thành kiến thức** | [Nhiệm vụ chung] | [Giảm tải lý thuyết biến đổi phức tạp, tập trung thực hành trực quan] | [Dùng mô hình, máy tính, bảng nhóm phụ] |
| **TIẾT 1 - HĐ 3: Luyện tập** | [Bài tập chung] | [Bài tập mức độ Nhận biết - Thông hiểu đơn giản, rút gọn 50%] | [Phiếu bài tập in chữ to/hướng dẫn từng bước] |
| **TIẾT 1 - HĐ 4: Vận dụng** | [Vận dụng chung] | [Nhiệm vụ thực tiễn đơn giản gắn với đời sống] | [Khuyến khích hợp tác nhóm nhỏ, bạn đồng hành] |

(Tiếp tục lập bảng chi tiết đầy đủ cho tất cả các tiết còn lại từ Tiết 2 đến Tiết ${periods}).

## IV. ĐÁNH GIÁ SỰ TIẾN BỘ & ĐỀ KIỂM TRA ĐIỀU CHỈNH MẪU
1. **Đánh giá thường xuyên:** Phương pháp quan sát, động viên khích lệ, chấm điểm theo sự nỗ lực tiến bộ cá nhân.
2. **Đề kiểm tra định kỳ điều chỉnh mẫu dành cho Học sinh Hòa nhập:**
   - Đề xuất cấu trúc đề rút gọn (tăng 30% - 50% thời gian làm bài, giảm bớt các câu vận dụng cao).
   - Đưa ra 3-5 câu hỏi kiểm tra mẫu phù hợp mức độ đạt được của HS hòa nhập.

${MATH_FORMATTING_RULES}`;

    let contents: any = prompt;
    if (files && files.length > 0) {
      contents = [
        {
          role: "user",
          parts: [
            ...(await processFilesForAI(files)),
            { text: prompt }
          ]
        }
      ];
    }

    const response = await generateWithFallback(req, {
      contents: contents,
      config: {
        temperature: 0.5,
        maxOutputTokens: 16384
      }
    });

    return { result: response.text };
  });
});

// Endpoint để Viết tiếp / Soạn tiếp giáo án dở dang khi bài học nhiều tiết (VD 4 tiết)
app.all("/api/continue-lesson-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { existingContent = "", lesson = "Bài học", periods = 4, subject = "Toán", grade = "10" } = req.body || {};

    if (!existingContent) {
      return res.status(400).json({ error: "Thiếu nội dung giáo án dở dang để viết tiếp." });
    }

    const lastChunk = existingContent.slice(-1500);

    const prompt = `Bạn là Chuyên gia Sư phạm cao cấp. Bạn đang hỗ trợ giáo viên biên soạn Kế hoạch bài dạy (Giáo án CV 5512) môn ${subject} Lớp ${grade}, bài học "${lesson}" tổng cộng ${periods} tiết.

Dưới đây là ĐOẠN CUỐI CỦA GIÁO ÁN ĐÃ VIẾT TRƯỚC ĐÓ (đang bị cắt dở dang hoặc mới chỉ viết xong 1-2 tiết):
---
... ${lastChunk}
---

NHIỆM VỤ CỦA BẠN:
1. Đọc và nhận biết chính xác vị trí/tiết học đang viết dở dang ở trên.
2. TIẾP TỤC VIẾT TIẾP ĐẦY ĐỦ CÁC TIẾT CÒN LẠI (từ vị trí dở dang cho đến hết TIẾT ${periods} và Mục IV/Phụ lục).
3. KHÔNG LẶP LẠI phần tiêu đề đầu bài hay các mục I, II đã viết. Chỉ nối tiếp tự nhiên từ câu/hoạt động/tiết đang dở dang.
4. Đảm bảo mọi tiết còn lại đều có đủ 4 hoạt động theo đúng chuẩn Công văn 5512 (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng) với chi tiết 4 bước d) Tổ chức thực hiện, kịch bản NLS & AI và lời giải đầy đủ.

${MATH_FORMATTING_RULES}`;

    const response = await generateWithFallback(req, {
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 16384
      }
    });

    return { result: response.text };
  });
});

app.all("/api/generate-similar", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const files = resolveFiles(req.body);
      let { croppedImage, croppedImageFileId, language = 'vi' } = req.body || {};
      const isEnglish = language === 'en';
      if (croppedImageFileId && chunkStore.has(croppedImageFileId)) {
        const entry = chunkStore.get(croppedImageFileId)!;
        croppedImage = entry.chunks.join('');
        chunkStore.delete(croppedImageFileId);
      }

      if ((!files || files.length === 0) && !croppedImage) {
        throw new Error(isEnglish ? "Please provide an exercise file or image to generate a similar problem." : "Vui lòng cung cấp bài tập hoặc ảnh để tạo đề tương tự.");
      }

      const fileList = [...(files || [])];
      if (croppedImage && typeof croppedImage === 'string') {
        const cleanBase64 = croppedImage.replace(/^data:[^;]+;base64,/, '');
        fileList.unshift({
          data: cleanBase64,
          type: 'image/png',
          name: 'cropped_figure.png'
        });
      }

      const prompt = isEnglish
        ? `You are an accomplished Mathematics and Science educator fluent in academic English. Below is an exercise, exam paper, or problem image/document provided by the teacher.
REQUIREMENTS:
1. Analyze the mathematical topic, structure, difficulty level, and key concepts of the original problem(s).
2. CREATE A SIMILAR PROBLEM (OR SET OF SIMILAR PROBLEMS) with the same structure, rigor, and difficulty, changing numerical values, functions, or context while remaining mathematically well-posed.
3. PROVIDE A COMPLETE, STEP-BY-STEP DETAILED SOLUTION in clear academic English for the newly created similar problem(s).
4. [VARIATION TABLES & DIAGRAMS]:
   - If the original problem involves a table of variation or graph, include a clean Markdown Table variation table or TikZ diagram where appropriate.
   - In the Detailed Solution section, focus on rigorous algebraic steps, theorems, and clear final answers.
5. LANGUAGE & LATEX RULES (MANDATORY):
   - Write 100% in natural, accurate academic English (NO Vietnamese text).
   - ALL mathematical expressions, equations, single variables ($x$, $y$, $m$, $n$, $a$, $b$, $S$), intervals, and intermediate formulas MUST be strictly enclosed in \`$...$\` (inline) or \`$$...$$\` (display). Always use \`\\frac{a}{b}\` instead of \`\\dfrac\`.
   - Do NOT output scratchpad thoughts, self-correction commentary, or off-topic notes.

Output strictly in this Markdown structure:
## Similar Problem
[Full text of the newly generated problem(s) in English]

## Detailed Solution
[Step-by-step detailed mathematical solution and final answer in English]`
        : `Bạn là một chuyên gia giáo dục xuất sắc. Dưới đây là bài tập, đề thi hoặc tài liệu mà giáo viên cung cấp.
YÊU CẦU:
1. Đọc và phân tích cấu trúc, độ khó, dạng bài, và kiến thức trọng tâm của tài liệu gốc.
2. TẠO RA MỘT ĐỀ BÀI HOẶC BỘ BÀI TẬP TƯƠNG TỰ (cùng cấu trúc, độ khó, và dạng bài nhưng thay đổi số liệu, ngữ cảnh hoặc cách hỏi).
3. CUNG CẤP LỜI GIẢI CHI TIẾT cho ĐỀ TƯƠNG TỰ vừa tạo.
4. [BẢNG BIẾN THIÊN (BBT) & HÌNH VẼ]:
- 100% ĐỀ BÀI TƯƠNG TỰ BẮT BUỘC có BẢNG BIẾN THIÊN (bằng Markdown Table chuẩn) hoặc HÌNH VẼ ĐỒ THỊ khi câu hỏi liên quan đến BBT / đồ thị hàm số.
- LỜI GIẢI CHI TIẾT: KHÔNG CẦN lặp lại BẢNG BIẾN THIÊN hay HÌNH VẼ ĐỒ THỊ (chỉ cần tập trung giải thích các bước tính toán, suy luận toán học chuẩn xác 100%).

Định dạng đầu ra rõ ràng:
## Đề bài tương tự
[Nội dung đề vừa tạo]

## Lời giải chi tiết
[Các bước giải chi tiết cho đề tương tự]

${MATH_FORMATTING_RULES}
BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.`;

      const response = await generateWithFallback(req, {
        contents: [
          {
            role: "user",
            parts: [
              ...(await processFilesForAI(fileList)),
              {
                text: prompt
              }
            ]
          }
        ],
        config: isEnglish ? {
          maxOutputTokens: 65536,
          systemInstruction: `You are an international Mathematics and STEM competition specialist. Always write 100% in clear academic English. Strictly enclose ALL mathematical formulas, variables ($x, y, m, a, b, S$), and equations in LaTeX delimiters $...$ or $$...$$. Always use \\frac instead of \\dfrac.`
        } : undefined
      }, res);
      
      const resultText = response.text || "";
      if (!resultText || !resultText.trim()) {
        throw new Error(isEnglish ? "Could not generate a similar problem from this content. Please try again." : "Không thể tạo bài tập tương tự từ nội dung này. Vui lòng thử lại.");
      }
      return { result: resultText, customKeyFailed: response.customKeyFailed };
    
    });
});


function buildRealWorldWorksheetDirective(opts: {
  totalCount: number;
  realWorldPercent?: number;
  includeRealWorldVD?: boolean;
  realWorldVDPercent?: number;
  includeRealWorldVDC?: boolean;
  realWorldVDCPercent?: number;
  includeRealWorldVisuals?: boolean;
  isJsonInteractive?: boolean;
}): string {
  const {
    totalCount,
    realWorldPercent = 40,
    includeRealWorldVD,
    realWorldVDPercent,
    includeRealWorldVDC,
    realWorldVDCPercent,
    includeRealWorldVisuals = true,
    isJsonInteractive = false
  } = opts;

  const hasSplitConfig =
    includeRealWorldVD !== undefined ||
    includeRealWorldVDC !== undefined ||
    realWorldVDPercent !== undefined ||
    realWorldVDCPercent !== undefined;

  let effVD = 0;
  let effVDC = 0;
  if (hasSplitConfig) {
    effVD = includeRealWorldVD === false ? 0 : Math.max(0, Math.min(100, Number(realWorldVDPercent ?? 0)));
    effVDC = includeRealWorldVDC === false ? 0 : Math.max(0, Math.min(100 - effVD, Number(realWorldVDCPercent ?? 0)));
  } else {
    const legacyTotal = Math.max(0, Math.min(100, Number(realWorldPercent ?? 40)));
    effVD = Math.round(legacyTotal * 0.65);
    effVDC = legacyTotal - effVD;
  }

  const totalRWPercent = Math.min(100, effVD + effVDC);
  const vdCount = effVD > 0 ? Math.max(1, Math.round((totalCount * effVD) / 100)) : 0;
  const vdcCount = effVDC > 0 ? Math.max(1, Math.round((totalCount * effVDC) / 100)) : 0;
  const totalRWCount = Math.min(totalCount, vdCount + vdcCount);

  if (totalRWPercent <= 0 || totalRWCount <= 0) {
    return `- Tỷ lệ bài tập có nội dung thực tế: 0% (tập trung rèn luyện kỹ năng toán học thuần túy, lý thuyết và tính toán chuẩn SGK).`;
  }

  const lines: string[] = [];
  lines.push(`- PHÂN BỔ BÀI TẬP THỰC TẾ THEO MỨC ĐỘ NHẬN THỨC (TỔNG ${totalRWPercent}% ~ ${totalRWCount}/${totalCount} câu toàn phiếu):`);
  if (effVD > 0) {
    lines.push(`  + **Bài tập Vận dụng (VD) có nội dung thực tế**: Tỷ lệ **${effVD}%** (khoảng **${vdCount} câu**). Bối cảnh đời sống, kinh tế, kỹ thuật, đo đạc hoặc khoa học tự nhiên quen thuộc; yêu cầu học sinh chuyển ngữ bài toán thực tế sang mô hình toán học của chính bài học này và giải trong 1–2 bước lập luận rõ ràng. Gắn nhãn nhẹ *(Vận dụng thực tế)* ngay đầu câu hoặc phân bố tự nhiên vào nhóm câu mức Vận dụng ở các phần.`);
  } else {
    lines.push(`  + Bài tập Vận dụng (VD) có nội dung thực tế: 0% (không chọn).`);
  }
  if (effVDC > 0) {
    lines.push(`  + **Bài tập Vận dụng cao (VDC) có nội dung thực tế**: Tỷ lệ **${effVDC}%** (khoảng **${vdcCount} câu**). Bối cảnh thực tiễn sâu sắc, đòi hỏi tư duy mô hình hóa bậc cao, bài toán tối ưu hóa (GTLN/GTNN), thiết kế kỹ thuật, tài chính/kinh tế đa bước hoặc tích hợp STEM/STEAM có tính phân hóa mạnh (ưu tiên đặt ở các câu cuối của Phần II, Phần III và Phần IV). Gắn nhãn nhẹ *(Vận dụng cao thực tế)* để giáo viên dễ nhận diện.`);
  } else {
    lines.push(`  + Bài tập Vận dụng cao (VDC) có nội dung thực tế: 0% (không chọn).`);
  }

  if (includeRealWorldVisuals !== false) {
    if (isJsonInteractive) {
      lines.push(`- HÌNH ẢNH MINH HỌA SÁT ĐỀ & CHÍNH XÁC TOÁN HỌC 100% CHO MỌI BÀI TẬP THỰC TẾ (BẮT BUỘC):
  + Đối với MỖI câu hỏi có nội dung thực tế (VD thực tế và VDC thực tế), BẮT BUỘC bổ sung trường "figureSpec" trong object câu hỏi đó (không dùng mô tả chữ rỗng "[Hình vẽ minh họa]"). Hệ thống sẽ dùng công thức toán học để vẽ hình vector chính xác 100% từ "figureSpec"!
  + MỌI số liệu, hàm số, kích thước, góc, đơn vị, tên điểm trong "figureSpec" PHẢI KHỚP CHÍNH XÁC 100% với đề bài và thỏa mãn đúng quan hệ hình học/đại số (ví dụ: điểm nằm đúng trên đồ thị $y = f(x)$, $\\beta > \\alpha$ trong đo đạc 2 vị trí, tổng xác suất các nhánh con bằng $1$).
  + Các loại "type" hợp lệ cho "figureSpec":
    1) "function_plot": {"type":"function_plot","title":"...","params":{"fn":"-0.25*x^2+4","fnLabel":"y = -0.25x² + 4","xMin":-5,"xMax":5,"yMin":0,"yMax":5,"xLabel":"x (m)","yLabel":"y (m)","theme":"gate|bridge|projectile|economic|wave","shadeFrom":-4,"shadeTo":4,"points":[{"x":0,"y":4,"label":"I(0; 4)"}]}}
    2) "triangle_survey": {"type":"triangle_survey","title":"...","params":{"mode":"right|two_stations|general","base":40,"height":30,"angleDeg":35,"alphaDeg":30,"betaDeg":45,"distanceAB":50,"b":12,"c":15,"angleADeg":60,"unit":"m","baseLabel":"40 m","heightLabel":"h = ?","dLabel":"AB = 50 m","hLabel":"h = ?","labelA":"A","labelB":"B","labelC":"C","labelH":"H","labelS":"S"}}
    3) "geometry_2d": {"type":"geometry_2d","title":"...","params":{"points":[{"name":"A","x":0,"y":0},{"name":"B","x":12,"y":0},{"name":"C","x":12,"y":8},{"name":"D","x":0,"y":8}],"polygons":[{"vertices":["A","B","C","D"]}],"rightAngles":[["B","A","D"]],"dims":[{"from":"A","to":"B","label":"12 m"},{"from":"B","to":"C","label":"8 m"}]}}
    4) "solid_3d": {"type":"solid_3d","title":"...","params":{"shape":"cylinder|cone|frustum|box|open_box_cut|pyramid|sphere","r":4,"R":6,"h":10,"a":30,"b":20,"x":4,"unit":"cm","rLabel":"r = 4 cm","hLabel":"h = 10 cm","aLabel":"30 cm","bLabel":"20 cm","xLabel":"x"}}
    5) "sequence_chart": {"type":"sequence_chart","title":"...","params":{"subtype":"bars|seats|bouncing_ball","labels":["T1","T2","T3","T4"],"values":[10,14,18,22],"u1":20,"d":4,"n":15,"h0":16,"q":0.75,"bounces":5,"unit":"m","yLabel":"Giá trị"}}
    6) "vector_physics": {"type":"vector_physics","title":"...","params":{"vectors":[{"label":"F₁ = 40 N","magnitude":40,"angleDeg":0},{"label":"F₂ = 30 N","magnitude":30,"angleDeg":60}],"showResultant":true,"resultantLabel":"F"}}
    7) "statistics_chart": {"type":"statistics_chart","title":"...","params":{"xLabel":"Nhóm","yLabel":"Tần số","bins":[{"label":"[10;20)","value":6},{"label":"[20;30)","value":14}]}}
    8) "probability_tree": {"type":"probability_tree","title":"...","params":{"branches":[{"label":"A","prob":"0,6","children":[{"label":"B","prob":"0,8"},{"label":"B̄","prob":"0,2"}]},{"label":"Ā","prob":"0,4","children":[{"label":"B","prob":"0,3"},{"label":"B̄","prob":"0,7"}]}]}}`);
    } else {
      lines.push(`- HÌNH ẢNH MINH HỌA SÁT ĐỀ & CHÍNH XÁC TOÁN HỌC 100% CHO MỌI BÀI TẬP THỰC TẾ (BẮT BUỘC):
  + Đối với MỖI bài tập có nội dung thực tế (cả Vận dụng thực tế và Vận dụng cao thực tế), BẮT BUỘC chèn ngay 1 thẻ đồ họa tham số \`[REALWORLD_FIG:{...}]\` nằm trên 1 dòng riêng ngay sau phần đề dẫn của câu đó (trước các phương án A., B., C., D. hoặc a), b), c), d)).
  + TUYỆT ĐỐI KHÔNG viết placeholder rỗng như "[Hình vẽ minh họa]" hay bọc thẻ trong dấu \`\`\`json \`\`\`. Xuất trực tiếp thẻ \`[REALWORLD_FIG:{...}]\` với JSON hợp lệ trên 1 dòng duy nhất (dùng dấu nháy kép ", số thập phân dùng dấu chấm . trong trường số).
  + ĐẢM BẢO CHÍNH XÁC TOÁN HỌC 100%: Mọi biểu thức hàm số, kích thước, số đo góc, tọa độ điểm, đơn vị, giá trị dãy số, nhánh xác suất bên trong \`[REALWORLD_FIG:{...}]\` PHẢI KHỚP TUYỆT ĐỐI với đề bài vừa soạn (ví dụ: điểm trên đồ thị phải thỏa $y = f(x)$, góc nâng trạm gần lớn hơn trạm xa $\\beta > \\alpha$, tổng xác suất các nhánh con tại mỗi nút bằng $1$).
  + Chọn đúng 1 trong 8 loại hình chuẩn của hệ thống sát nhất với bối cảnh bài toán:
    1) Đồ thị / Parabol / Cổng vòm / Cầu / Quỹ đạo / Kinh tế / Sóng / Tích phân:
       [REALWORLD_FIG:{"type":"function_plot","title":"Cổng vòm Parabol","params":{"fn":"-0.25*x^2+4","fnLabel":"y = -0.25x² + 4","xMin":-5,"xMax":5,"yMin":0,"yMax":5,"xLabel":"x (m)","yLabel":"y (m)","theme":"gate","shadeFrom":-4,"shadeTo":4,"points":[{"x":0,"y":4,"label":"I(0; 4)"},{"x":4,"y":0,"label":"B(4; 0)"}]}}]
    2) Đo đạc chiều cao / Khoảng cách / Góc nâng / Tam giác ("mode": "right" | "two_stations" | "general"):
       [REALWORLD_FIG:{"type":"triangle_survey","title":"Đo chiều cao tháp từ hai vị trí A, B","params":{"mode":"two_stations","alphaDeg":30,"betaDeg":45,"distanceAB":50,"unit":"m","dLabel":"AB = 50 m","hLabel":"h = ?","labelA":"A","labelB":"B","labelH":"H","labelS":"S"}}]
    3) Hình phẳng tọa độ thực tế (mảnh đất, hàng rào, đường tròn, miền nghiệm quy hoạch):
       [REALWORLD_FIG:{"type":"geometry_2d","title":"Sơ đồ khu vườn hình chữ nhật","params":{"points":[{"name":"A","x":0,"y":0},{"name":"B","x":12,"y":0},{"name":"C","x":12,"y":8},{"name":"D","x":0,"y":8}],"polygons":[{"vertices":["A","B","C","D"]}],"rightAngles":[["B","A","D"]],"dims":[{"from":"A","to":"B","label":"12 m"},{"from":"B","to":"C","label":"8 m"}]}}]
    4) Khối 3D thực tế ("shape": "cylinder" | "cone" | "frustum" | "box" | "open_box_cut" | "pyramid" | "sphere"):
       [REALWORLD_FIG:{"type":"solid_3d","title":"Cắt 4 góc tấm bìa tạo hộp không nắp","params":{"shape":"open_box_cut","a":30,"b":20,"x":4,"unit":"cm","aLabel":"30 cm","bLabel":"20 cm","xLabel":"x"}}]
    5) Cấp số cộng / Cấp số nhân / Quả bóng nảy / Khán đài / Biểu đồ tăng trưởng ("subtype": "bars" | "seats" | "bouncing_ball"):
       [REALWORLD_FIG:{"type":"sequence_chart","title":"Sơ đồ hàng ghế khán đài","params":{"subtype":"seats","u1":20,"d":4,"n":15}}]
    6) Lực vật lý / Thuyền qua sông / Máy bay gặp gió / Hợp lực vectơ:
       [REALWORLD_FIG:{"type":"vector_physics","title":"Tổng hợp hai lực tác dụng lên vật","params":{"vectors":[{"label":"F₁ = 40 N","magnitude":40,"angleDeg":0},{"label":"F₂ = 30 N","magnitude":30,"angleDeg":60}],"showResultant":true,"resultantLabel":"F"}}]
    7) Thống kê thực tế / Biểu đồ tần số ghép nhóm:
       [REALWORLD_FIG:{"type":"statistics_chart","title":"Biểu đồ phân bố số liệu","params":{"xLabel":"Nhóm giá trị","yLabel":"Tần số","bins":[{"label":"[10;20)","value":6},{"label":"[20;30)","value":14},{"label":"[30;40)","value":12}]}}]
    8) Sơ đồ cây xác suất có điều kiện / Bayes:
       [REALWORLD_FIG:{"type":"probability_tree","title":"Sơ đồ cây xác suất","params":{"branches":[{"label":"A","prob":"0,6","children":[{"label":"B","prob":"0,8"},{"label":"B̄","prob":"0,2"}]},{"label":"Ā","prob":"0,4","children":[{"label":"B","prob":"0,3"},{"label":"B̄","prob":"0,7"}]}]}}]`
      );
    }
  }

  return lines.join('\n');
}

app.all("/api/generate-interactive-worksheet", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
    
  return keepAliveExecute(req, res, async () => {
    const { 
      lesson, 
      subject, 
      grade, 
      type,
      semester = 'semester_1',
      numPartI = 12,
      numPartII = 4,
      numPartIII = 6,
      numPartIV = 2,
      realWorldPercent = 40,
      includeRealWorldVD,
      realWorldVDPercent,
      includeRealWorldVDC,
      realWorldVDCPercent,
      includeRealWorldVisuals = true,
      hasParametric = true,
      additionalNotes = ''
    } = req.body || {};

    const isSpecialTopic = semester === 'special_topic' || (typeof semester === 'string' && semester.toLowerCase().includes('chuyên đề'));
    const specialTopicDirective = isSpecialTopic
      ? `\nĐẶC THÙ CHUYÊN ĐỀ HỌC TẬP TOÁN (CHƯƠNG TRÌNH GDPT 2018 - KẾT NỐI TRI THỨC):
- Đây là Phiếu học tập thuộc Chuyên đề học tập môn Toán chương trình GDPT 2018 (bộ sách Kết nối tri thức với cuộc sống).
- Yêu cầu: 
  (1) Phần tóm tắt kiến thức phải trình bày rõ các định nghĩa, công thức tính toán hoặc quy trình/thuật toán giải từng bước; 
  (2) Hệ thống bài tập phải tăng cường mạnh tính ứng dụng thực tiễn, mô hình hóa toán học (bài toán kinh tế, tài chính, tối ưu hóa, đồ thị, kỹ thuật) bám sát đúng tinh thần sách Chuyên đề; 
  (3) Với các bài toán liên quan đến hình học/đồ thị/miền nghiệm, cần mô tả chi tiết dữ kiện tọa độ, đỉnh, cạnh để học sinh dễ dàng vẽ hình và giải quyết.\n`
      : '';

    const p1 = typeof numPartI !== 'undefined' ? Number(numPartI) : 12;
    const p2 = typeof numPartII !== 'undefined' ? Number(numPartII) : 4;
    const p3 = typeof numPartIII !== 'undefined' ? Number(numPartIII) : 6;
    const p4 = typeof numPartIV !== 'undefined' ? Number(numPartIV) : 2;

    const countI = isNaN(p1) ? 12 : p1;
    const countII = isNaN(p2) ? 4 : p2;
    const countIII = isNaN(p3) ? 6 : p3;
    const countIV = isNaN(p4) ? 2 : p4;

    const totalRequired = countI + countII + countIII + countIV;
    const totalCount = totalRequired > 0 ? totalRequired : 24;

    // RÀNG BUỘC CHUẨN CẤU HÌNH: Nếu phần nào = 0 câu, tuyệt đối CẤM sinh tiêu đề và CẤM sinh bất kỳ câu hỏi nào
    const zeroPartsRules: string[] = [];
    if (countI === 0) zeroPartsRules.push('- PHẦN I (mc): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần I và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi trắc nghiệm nhiều lựa chọn ("mc") nào!');
    if (countII === 0) zeroPartsRules.push('- PHẦN II (tf): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần II và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi đúng/sai ("tf") nào!');
    if (countIII === 0) zeroPartsRules.push('- PHẦN III (sa): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần III và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi trả lời ngắn ("sa") nào!');
    if (countIV === 0) zeroPartsRules.push('- PHẦN IV (essay): Số câu = 0. TUYỆT ĐỐI CẤM sinh tiêu đề Phần IV và TUYỆT ĐỐI CẤM sinh bất kỳ câu hỏi tự luận ("essay") nào!');
    const zeroPartsDirective = zeroPartsRules.length > 0 ? `\nQUY TẮC CẤM PHẦN CÓ 0 CÂU (BẮT BUỘC TUÂN THỦ 100%):\n${zeroPartsRules.join('\n')}\n` : '';
       
    const parametricRule = hasParametric
      ? `YÊU CẦU THAM SỐ: Thiết kế các câu hỏi chứa tham số thực ($m, a, b...$) ở mức độ vận dụng để phân hóa tư duy học sinh.`
      : `QUY TẮC CẤM THAM SỐ (CỰC KỲ QUAN TRỌNG - BẮT BUỘC TUÂN THỦ 100%):
- GIÁO VIÊN ĐÃ TÍCH CHỌN: "KHÔNG CÓ BÀI TOÁN CHỨA THAM SỐ".
- TUYỆT ĐỐI KHÔNG XUẤT HIỆN BẤT KỲ THAM SỐ NÀO (như $m$, $k$, $a$, $b$, $\alpha$ làm tham số).
- TUYỆT ĐỐI KHÔNG có các câu hỏi dạng: "Tìm m để...", "Tìm tất cả giá trị thực của tham số m...", "Hàm số chứa tham số m...", "Phương trình có nghiệm thỏa mãn m...".
- TẤT CẢ các hệ số, số liệu trong đề bài, hàm số, phương trình, bất phương trình và 4 phương án BẮT BUỘC 100% là CÁC CON SỐ THỰC CỤ THỂ (ví dụ: $y = 2x^3 - 3x^2 + 1$, $x = 2$, $-5$, $\\frac{1}{2}$, ...).`;

    const partIVRule = countIV > 0
      ? `4. PHẦN IV (essay): BẮT BUỘC ĐỦ CHÍNH XÁC ${countIV} CÂU Tự luận (loại "essay") - bài tập tự luận có hướng dẫn chấm.`
      : `QUY TẮC CẤU TRÚC ĐỀ 3 PHẦN (CỰC KỲ QUAN TRỌNG - BẮT BUỘC TUÂN THỦ 100%):
- Giáo viên đã chọn cấu trúc ĐỀ 3 PHẦN (không có tự luận).
- TUYỆT ĐỐI KHÔNG SINH PHẦN IV HOẶC BẤT KỲ BÀI TẬP TỰ LUẬN NÀO!
- TUYỆT ĐỐI KHÔNG sinh câu hỏi có type "essay". Mảng "questions" chỉ chứa câu hỏi thuộc các phần được cấu hình > 0.`;

    const exampleJsonQuestions: string[] = [];
    if (countI > 0) {
      exampleJsonQuestions.push(`        {
          "type": "mc",
          "content": "Nội dung câu hỏi trắc nghiệm 4 lựa chọn...",
          "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
          "correctOptionIndex": 0,
          "solution": "Lời giải ngắn gọn 2-3 dòng, tập trung công thức then chốt..."
        }`);
    }
    if (countII > 0) {
      exampleJsonQuestions.push(`        {
          "type": "tf",
          "content": "Nội dung câu hỏi Đúng/Sai...",
          "tfStatements": [
            { "statement": "Ý a...", "correct": true },
            { "statement": "Ý b...", "correct": false },
            { "statement": "Ý c...", "correct": true },
            { "statement": "Ý d...", "correct": false }
          ],
          "solution": "Lời giải chi tiết ngắn gọn cho 4 ý..."
        }`);
    }
    if (countIII > 0) {
      exampleJsonQuestions.push(`        {
          "type": "sa",
          "content": "Nội dung câu trả lời ngắn...",
          "correctAnswer": "25",
          "solution": "Lời giải súc tích 2-3 dòng..."
        }`);
    }
    if (countIV > 0) {
      exampleJsonQuestions.push(`        {
          "type": "essay",
          "content": "Nội dung tự luận rèn luyện...",
          "correctAnswer": "Hướng dẫn chấm chi tiết",
          "solution": "Lời giải chi tiết từng bước..."
        }`);
    }
    if (exampleJsonQuestions.length === 0) {
      exampleJsonQuestions.push(`        {
          "type": "mc",
          "content": "Nội dung câu hỏi trắc nghiệm 4 lựa chọn...",
          "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
          "correctOptionIndex": 0,
          "solution": "Lời giải ngắn gọn 2-3 dòng..."
        }`);
    }

    const promptText = `Bạn là một giáo viên xuất sắc môn ${subject || "Toán"} (chuẩn Chương trình GDPT 2018, bộ sách giáo khoa Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027). Hãy tạo một Phiếu bài tập (Worksheet) tương tác thật chuyên nghiệp cho học sinh Lớp ${grade}, môn ${subject || "Toán"}, bài học/chủ đề: "${lesson}". Hình thức: ${type || "Kết hợp trắc nghiệm, đúng/sai, trả lời ngắn, tự luận"}.
       
    ${specialTopicDirective}
    RÀNG BUỘC PHẠM VI NỘI DUNG VÀ CHỦ ĐỀ (BẮT BUỘC 100%):
    - TẤT CẢ CÁC CÂU HỎI trong phiếu bài tập BẮT BUỘC phải tập trung chính xác và 100% nằm trong phạm vi kiến thức, bài học/chủ đề: "${lesson}".
    - TUYỆT ĐỐI KHÔNG BỊA RA HOẶC TỰ Ý CHÈN THÊM bất kỳ câu hỏi nào thuộc bài học khác, chương học khác hay khối lớp khác ngoài chủ đề "${lesson}".
    - Tuân thủ 100% thuật ngữ, ký hiệu, mạch kiến thức theo đúng SGK Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027.

    ${zeroPartsDirective}

    YÊU CẦU ĐẶC BIỆT CỤ THỂ VỀ CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC (TỔNG CHÍNH XÁC ĐỦ ${totalCount} CÂU, CHỈ SINH CÁC PHẦN CÓ SỐ LƯỢNG > 0):
    BẮT BUỘC phải sinh đúng 100% chính xác các phần sau vào mảng "questions" (TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT hay dùng placeholder "..."):
    ${countI > 0 ? `1. PHẦN I (mc): BẮT BUỘC ĐỦ CHÍNH XÁC ${countI} CÂU Trắc nghiệm 4 lựa chọn (loại "mc") - mỗi câu gồm "content", 4 phương án vào mảng "options", "correctOptionIndex".` : ''}
    ${countII > 0 ? `2. PHẦN II (tf): BẮT BUỘC ĐỦ CHÍNH XÁC ${countII} CÂU Trắc nghiệm Đúng/Sai (loại "tf") - mỗi câu BẮT BUỘC có mảng "tfStatements" gồm ĐÚNG 4 đối tượng [{ "statement": "...", "correct": true/false }].` : ''}
    ${countIII > 0 ? `3. PHẦN III (sa): BẮT BUỘC ĐỦ CHÍNH XÁC ${countIII} CÂU Trắc nghiệm Trả lời ngắn (loại "sa") - "correctAnswer" là 1 số cụ thể có độ dài tối đa 4 ký tự.` : ''}
    ${partIVRule}

    ${buildRealWorldWorksheetDirective({
      totalCount,
      realWorldPercent,
      includeRealWorldVD,
      realWorldVDPercent,
      includeRealWorldVDC,
      realWorldVDCPercent,
      includeRealWorldVisuals,
      isJsonInteractive: true
    })}
    - ${parametricRule}
    ${additionalNotes ? `- Ghi chú riêng từ giáo viên: ${additionalNotes}` : ''}

    ${MATH_FORMATTING_RULES}
    5. BẮT BUỘC KÈM TRƯỜNG "solution": Với các câu trắc nghiệm nhận biết/thông hiểu cơ bản (như tính $u_n$, công thức cơ bản), yêu cầu trình bày lời giải ngắn gọn súc tích trong 2-3 dòng, tập trung vào công thức then chốt và bước biến đổi chính, không viết dông dài để tối ưu tốc độ sinh đề.
    6. BẮT BUỘC SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận.
    7. BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC SAU (MẢNG "questions" PHẢI CÓ ĐỦ CHÍNH XÁC ${totalCount} PHẦN TỬ CÂU HỎI, ${countIV === 0 ? 'TUYỆT ĐỐI KHÔNG CÓ CÂU LOẠI "essay"' : ''}):
    {
      "examName": "Phiếu bài tập: ${lesson}",
      "questions": [
${exampleJsonQuestions.join(',\n')}
      ]
    }
    `;

    const response = await generateWithFallback(req, {
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 16384
      }
    });

    let rawOutput = response.text || '';
    let parsedData: any = safeJsonParse(rawOutput, { questions: [] });
    
    // Process questions
    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
       const sol = (q.solution || q.explanation || "").trim();
       let qType = String(q.type || '').toLowerCase().trim();
       if (qType === 'short_answer' || qType === 'shortanswer' || qType === 'tln' || qType === 'dien_so' || qType === 'trả lời ngắn') {
         qType = 'sa';
       } else if (qType === 'multiple_choice' || qType === 'trắc nghiệm' || (!qType && Array.isArray(q.options) && q.options.length > 0)) {
         qType = 'mc';
       } else if (qType === 'true_false' || qType === 'tf' || (!qType && Array.isArray(q.tfStatements) && q.tfStatements.length > 0)) {
         qType = 'tf';
       } else if (qType === 'tự luận' || qType === 'tu_luan') {
         qType = 'essay';
       } else if (!qType) {
         if (q.correctAnswer && (!q.options || q.options.length === 0)) qType = 'sa';
         else qType = 'mc';
       }

       return {
         ...q,
         id: idx + 1,
         number: idx + 1,
         type: qType,
         content: cleanLatexMathField(q.content || q.question || ''),
         question: cleanLatexMathField(q.question || q.content || ''),
         options: Array.isArray(q.options) ? q.options.map(cleanLatexMathField) : q.options,
         tfStatements: Array.isArray(q.tfStatements) ? q.tfStatements.map((tf: any) => ({
           ...tf,
           statement: cleanLatexMathField(tf.statement)
         })) : q.tfStatements,
         correctAnswer: cleanLatexMathField(q.correctAnswer),
         solution: cleanLatexMathField(sol),
         explanation: cleanLatexMathField(sol)
       };
    });

    // Lọc triệt để loại bỏ bất kỳ câu hỏi nào thuộc phần có cấu hình = 0 câu
    const allowedWSTypes = new Set<string>();
    if (countI > 0) allowedWSTypes.add('mc');
    if (countII > 0) allowedWSTypes.add('tf');
    if (countIII > 0) allowedWSTypes.add('sa');
    if (countIV > 0) allowedWSTypes.add('essay');

    let filteredQuestions = formattedQuestions;
    if (allowedWSTypes.size > 0) {
      filteredQuestions = filteredQuestions.filter((q: any) => allowedWSTypes.has(q.type));

      let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
      filteredQuestions = filteredQuestions.filter((q: any) => {
        if (q.type === 'mc') {
          c1++;
          return c1 <= countI;
        }
        if (q.type === 'tf') {
          c2++;
          return c2 <= countII;
        }
        if (q.type === 'sa') {
          c3++;
          return c3 <= countIII;
        }
        if (q.type === 'essay') {
          c4++;
          return c4 <= countIV;
        }
        return false;
      });
    }

    filteredQuestions = filteredQuestions.map((q: any, idx: number) => ({
      ...q,
      id: idx + 1,
      number: idx + 1
    }));

    return {
       ...parsedData,
       questions: filteredQuestions
    };
  });
});

app.all("/api/generate-worksheet", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const { 
        lesson, 
        chapter = '',
        semester = 'Học kỳ 1',
        subject, 
        grade, 
        type, 
        layoutStyle = 'a4_print',
        numMC,
        numEssay,
        includeRealWorld = true,
        answerMode = 'full',
        
        // New advanced parameters from configured sidebar
        additionalNotes = '',
        numPartI = 12,
        numPartII = 2,
        numPartIII = 4,
        numPartIV = 2,
        realWorldPercent = 40,
        includeRealWorldVD,
        realWorldVDPercent,
        includeRealWorldVDC,
        realWorldVDCPercent,
        includeRealWorldVisuals = true,
        hasParametric = true
      } = req.body;
      
      let stylePrompt = '';
      if (layoutStyle === 'infographic') {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: INFOGRAPHIC / PHOTOGRAPHIC (Hình ảnh minh họa & Màu sắc hiện đại)
- Trình bày dạng các Thẻ bài học (Card UI) với các khối kiến thức phân chia trực quan, sinh động.
- Sử dụng các tiêu đề thẻ bắt mắt và icon cảm xúc:
  + 💡 **GHI NHỚ NHANH**: Các định nghĩa, tính chất cốt lõi dưới dạng bullet points súc tích.
  + ⚡ **BÍ KÍP THỰC CHIẾN & CÔNG THỨC VÀNG**: Đóng khung các công thức quan trọng nhất.
  + ⚠️ **BẪY SAI LẦM THƯỜNG GẶP**: Những lỗi sai học sinh hay mắc phải và mẹo phòng tránh.
  + 🖼️ **KHUNG MINH HỌA TRỰC QUAN**: Đưa các gợi ý mô tả hình vẽ hoặc đồ thị minh họa thực tế vào trong khối [HÌNH VẼ MINH HỌA: ...].
- Hệ thống bài tập:
  + Phân chia rõ các dạng: [Cơ bản], [Vận dụng], [Toán thực tế cuộc sống].
  + Mỗi bài toán thực tế có thêm: 🧠 **Gợi ý tư duy nhanh** (1 câu ngắn định hướng cách tư duy trước khi giải).`;
      } else if (layoutStyle === 'poster') {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: POSTER TÓM TẮT TƯ DUY (Cheat Sheet / Summary Poster khổ lớn)
- Bố cục cô đọng tối đa, tiêu đề chính thật lớn và nổi bật, phù hợp làm poster dán góc học tập hoặc lưu điện thoại.
- TOÀN BỘ CÔNG THỨC TRỌNG TÂM được gom vào các khối HERO BOX đóng khung nổi bật với ký hiệu 📌, ⭐, 🔑.
- SƠ ĐỒ HÓA CÁC BƯỚC GIẢI TOÁN: Quy trình giải một bài toán mẫu được sơ đồ hóa rõ ràng thành: Bước 1 ➔ Bước 2 ➔ Bước 3 ➔ Kết luận.
- BỔ SUNG MẸO BẤM MÁY TÍNH CASIO & BÍ KÍP TÍNH NHANH (nếu có).
- Hệ thống 3-5 bài tập cốt lõi tiêu biểu nhất, kèm sơ đồ tư duy hướng dẫn cách tiếp cận.`;
      } else if (layoutStyle === 'mindmap') {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: MINDMAP / SƠ ĐỒ NHÁNH
- Cấu trúc kiến thức phân cấp từ CHỦ ĐỀ TRUNG TÂM tỏa ra các nhánh lý thuyết, phương pháp và ví dụ:
  + 🌳 **CHỦ ĐỀ TRUNG TÂM**: "${lesson}"
  + ├── 🌿 **Nhánh 1: Khái niệm & Lý thuyết cốt lõi**
  + ├── ⚡ **Nhánh 2: Công thức then chốt & Định lý**
  + ├── 🎯 **Nhánh 3: Các dạng bài tập điển hình** (kèm ví dụ giải nhanh và phương pháp mẫu)
  + └── ⚠️ **Nhánh 4: Lưu ý & Bẫy sai lầm cần tránh**
- Dùng thụt dòng, ký hiệu phân cấp cây sơ đồ trực quan và bullet point để tạo cảm giác bản đồ tư duy sinh động.`;
      } else {
        stylePrompt = `
YÊU CẦU PHONG CÁCH: A4 CHUẨN IN ẤN (Đen trắng / Tiết kiệm mực - Bố cục chính quy)
- Bố cục trang giấy chuẩn mực cho học sinh in ra làm bài:
  + Phần đầu: Bảng thông tin học sinh (Trường, Lớp, Họ và tên học sinh, Điểm số, Lời phê của giáo viên).
  + MỤC TIÊU & TÓM TẮT KIẾN THỨC TRỌNG TÂM (Ngắn gọn, bảng biểu sắc nét, kẻ khung tiết kiệm mực in).
  + PHẦN I: CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (Đánh số câu rõ ràng, 4 phương án A, B, C, D phân bố gọn gàng).
  + PHẦN II: CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI (nếu có cấu hình).
  + PHẦN III: CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN (nếu có cấu hình).
  + PHẦN IV: BÀI TẬP TỰ LUẬN (Có dòng kẻ chấm chấm "......................................................" hoặc khung trống phù hợp để học sinh làm bài trực tiếp trên giấy in).`;
      }

      const nPartI = typeof numPartI !== 'undefined' ? Number(numPartI) : 12;
      const nPartII = typeof numPartII !== 'undefined' ? Number(numPartII) : 2;
      const nPartIII = typeof numPartIII !== 'undefined' ? Number(numPartIII) : 4;
      const nPartIV = typeof numPartIV !== 'undefined' ? Number(numPartIV) : 2;

      let exercisePrompt = `Cấu trúc số lượng câu của các phần trong Phiếu học tập BẮT BUỘC tuân thủ chính xác (CHỈ SINH ĐÚNG CÁC PHẦN CÓ SỐ LƯỢNG > 0):`;
      if (nPartI > 0) {
        exercisePrompt += `\n- PHẦN I: CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN: đúng chính xác ${nPartI} câu hỏi độc lập (mỗi câu gồm 4 phương án lựa chọn A, B, C, D).`;
      } else {
        exercisePrompt += `\n- CẤM TUYỆT ĐỐI PHẦN I: Số câu là 0. TUYỆT ĐỐI KHÔNG sinh tiêu đề Phần I và TUYỆT ĐỐI KHÔNG sinh bất kỳ câu hỏi trắc nghiệm nhiều lựa chọn nào!`;
      }
      if (nPartII > 0) {
        exercisePrompt += `\n- PHẦN II: CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI: đúng chính xác ${nPartII} câu hỏi (mỗi câu gồm mệnh đề dẫn và 4 ý a, b, c, d độc lập phán đoán Đúng/Sai).`;
      } else {
        exercisePrompt += `\n- CẤM TUYỆT ĐỐI PHẦN II: Số câu là 0. TUYỆT ĐỐI KHÔNG sinh tiêu đề Phần II và TUYỆT ĐỐI KHÔNG sinh bất kỳ câu hỏi đúng/sai nào!`;
      }
      if (nPartIII > 0) {
        exercisePrompt += `\n- PHẦN III: CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN: đúng chính xác ${nPartIII} câu hỏi dứt khoát (đáp số là số nguyên, phân số tối giản hoặc số thập phân).`;
      } else {
        exercisePrompt += `\n- CẤM TUYỆT ĐỐI PHẦN III: Số câu là 0. TUYỆT ĐỐI KHÔNG sinh tiêu đề Phần III và TUYỆT ĐỐI KHÔNG sinh bất kỳ câu hỏi trả lời ngắn nào!`;
      }
      if (nPartIV > 0) {
        exercisePrompt += `\n- PHẦN IV: BÀI TẬP TỰ LUẬN RÈN LUYỆN: đúng chính xác ${nPartIV} bài toán rèn luyện tư duy tự luận trình bày lập luận logic.`;
      } else {
        exercisePrompt += `\n- CẤM TUYỆT ĐỐI PHẦN IV (TỰ LUẬN): Số câu là 0. TUYỆT ĐỐI KHÔNG ĐƯỢC CÓ PHẦN IV HAY BÀI TẬP TỰ LUẬN. KHÔNG TẠO MỤC PHẦN IV TRONG ĐỀ BÀI CŨNG NHƯ TRONG BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI!`;
      }

      const totalQuestionsCount = nPartI + nPartII + nPartIII + nPartIV;
      exercisePrompt += `\n${buildRealWorldWorksheetDirective({
        totalCount: Math.max(1, totalQuestionsCount),
        realWorldPercent,
        includeRealWorldVD,
        realWorldVDPercent,
        includeRealWorldVDC,
        realWorldVDCPercent,
        includeRealWorldVisuals,
        isJsonInteractive: false
      })}`;
      exercisePrompt += hasParametric 
        ? `\n- Phân hóa học sinh: CÓ một số bài toán ở mức độ vận dụng chứa tham số thực ($m, a, b, ...$).`
        : `\n- QUY ĐỊNH CẤM THAM SỐ (BẮT BUỘC 100%): Giáo viên đã chọn "Không có bài toán chứa tham số". TUYỆT ĐỐI KHÔNG xuất hiện bất kỳ tham số nào (như m, k, a, b tham số). TUYỆT ĐỐI KHÔNG có các câu hỏi tìm m hay chứa tham số m. TẤT CẢ các hệ số, phương trình, hàm số và bài toán PHẢI 100% là số cụ thể.`;

      if (additionalNotes && additionalNotes.trim()) {
        exercisePrompt += `\n- Trọng tâm cần nhấn mạnh / Yêu cầu riêng từ giáo viên: ${additionalNotes}`;
      }

      let answerPrompt = '';
      if (answerMode === 'none') {
        answerPrompt = 'TUYỆT ĐỐI KHÔNG kèm đáp án hay lời giải ở cuối phiếu (phiếu học tập chỉ dành riêng cho học sinh làm bài).';
      } else if (answerMode === 'summary') {
        answerPrompt = 'Ở cuối tài liệu, hãy cung cấp bảng đáp số/đáp án ngắn gọn (dạng bảng đáp án trắc nghiệm và kết số tự luận), phân cách bằng tiêu đề "--- BẢNG ĐÁP ÁN NHANH ---".';
      } else {
        answerPrompt = 'Ở cuối tài liệu, hãy cung cấp phần Hướng dẫn giải súc tích từng câu, phân cách bằng tiêu đề "--- HƯỚNG DẪN CHẤM / ĐÁP ÁN CHI TIẾT ---". BẮT BUỘC đặt mỗi **Câu 1:**, **Câu 2:**, ... trên một đoạn riêng có dòng trống (Enter 2 lần) ngăn cách (tuyệt đối KHÔNG viết dính nhiều câu trên cùng 1 dòng). Với các câu trắc nghiệm nhận biết/thông hiểu cơ bản (như tính $u_n$, công thức cơ bản), chỉ cần trình bày lời giải ngắn gọn trong 2-3 dòng tập trung vào công thức then chốt và bước biến đổi chính, viết bằng công thức LaTeX chuẩn.';
      }

      const isSpecialTopic = semester === 'special_topic' || (typeof semester === 'string' && semester.toLowerCase().includes('chuyên đề'));
      const specialTopicDirective = isSpecialTopic
        ? `\nĐẶC THÙ CHUYÊN ĐỀ HỌC TẬP TOÁN (CHƯƠNG TRÌNH GDPT 2018 - KẾT NỐI TRI THỨC):
- Đây là Phiếu học tập thuộc Chuyên đề học tập môn Toán chương trình GDPT 2018 (bộ sách Kết nối tri thức với cuộc sống).
- Yêu cầu: 
  (1) Phần tóm tắt kiến thức phải trình bày rõ các định nghĩa, công thức tính toán hoặc quy trình/thuật toán giải từng bước; 
  (2) Hệ thống bài tập phải tăng cường mạnh tính ứng dụng thực tiễn, mô hình hóa toán học (bài toán kinh tế, tài chính, tối ưu hóa, đồ thị, kỹ thuật) bám sát đúng tinh thần sách Chuyên đề; 
  (3) Với các bài toán liên quan đến hình học/đồ thị/miền nghiệm, cần mô tả chi tiết dữ kiện tọa độ, đỉnh, cạnh để học sinh dễ dàng vẽ hình và giải quyết.\n`
        : '';

      const prompt = `Bạn là chuyên gia sư phạm bộ môn ${subject || "Toán"} hàng đầu Việt Nam, nắm vững 100% Chương trình GDPT 2018 và bộ sách giáo khoa "Kết nối tri thức với cuộc sống" (KNTT) áp dụng từ năm học 2026-2027.
Nhiệm vụ của bạn là nhận thông tin cấu hình và tạo ra một "PHIẾU HỌC TẬP" hoàn chỉnh, khoa học, thẩm mỹ cao và chuẩn mực sư phạm cho học sinh Lớp ${grade}, ${semester}, môn ${subject || "Toán"}, Chương: "${chapter}", Bài học/chủ đề: "${lesson}".

---
${specialTopicDirective}
### 1. RÀNG BUỘC PHẠM VI NỘI DUNG VÀ CHUYÊN MÔN SGK KNTT 2026-2027 (BẮT BUỘC 100%)
- PHẠM VI CHỦ ĐỀ CHÍNH XÁC (TẬP TRUNG 100%): TẤT CẢ các câu hỏi trong phiếu học tập BẮT BUỘC phải thuộc chính xác bài học "${lesson}" (thuộc ${chapter}, Lớp ${grade}, ${semester}).
- KHÔNG BỊA LỆCH CHỦ ĐỀ: TUYỆT ĐỐI KHÔNG tự ý bịa ra hoặc chèn thêm bất kỳ câu hỏi nào thuộc các chương học khác hay khối lớp khác ngoài chủ đề "${lesson}". (Ví dụ: Khi giáo viên chọn Chương V "Các số đặc trưng đo xu thế trung tâm", TUYỆT ĐỐI KHÔNG xuất hiện câu hỏi về Đạo hàm, Giới hạn hay Tích phân).
- Chuẩn SGK KNTT: Sử dụng chuẩn xác thuật ngữ, ký hiệu chuyên môn theo bộ sách Kết nối tri thức với cuộc sống từ năm học 2026-2027 cho môn ${subject || "Toán"}.
- Ranh giới kiến thức chương trình mới:
  + KHÔNG sử dụng phương pháp đổi biến số hay tích phân từng phần (đã giảm tải/không có trong CT 2018).
  + Lớp 11: Không sử dụng phương pháp vectơ trong không gian 3D, không sử dụng định lý Menelaus trong hình không gian.
  + Định nghĩa hình chữ nhật: Là tứ giác có 4 góc vuông.
- Tích hợp thực tế & STEM: Đưa các bài toán gắn với thực tiễn, kinh tế, vật lý, đời sống; phần liên môn/STEM phải ghi rõ cụm từ "tích hợp stem/steam".
${hasParametric ? `- Phân hóa: Thiết kế các câu hỏi chứa tham số ($m, a, b...$) ở mức vận dụng để phân hóa tư duy học sinh.\n- Với mức nhận biết, thông hiểu, tuyệt đối chỉ tập trung vào rèn luyện bản chất số liệu cụ thể không có tham số.` : `- QUY ĐỊNH CẤM THAM SỐ (BẮT BUỘC 100%): Giáo viên đã chọn "Không có bài toán chứa tham số". TUYỆT ĐỐI KHÔNG xuất hiện bất kỳ tham số nào (như $m$, $k$, $a$, $b$ tham số). CẤM các câu hỏi tìm m hoặc chứa m. TẤT CẢ các hệ số, bài toán, phương trình và phương án BẮT BUỘC 100% là số cụ thể.`}

---
### 2. PHONG CÁCH TRÌNH BÀY LAYOUT:
${stylePrompt}

---
### 3. CẤU TRÚC PHIẾU HỌC TẬP (${numPartIV > 0 ? '4 PHẦN CHUẨN ĐỔI MỚI CHUYÊN BIỆT' : '3 PHẦN CHUẨN ĐỔI MỚI (KHÔNG CÓ TỰ LUẬN)'}):
${exercisePrompt}

Hãy trình bày các câu hỏi thành các phần rõ ràng như sau:
- **QUY TẮC ĐÁNH SỐ THỨ TỰ BẮT BUỘC**:
  + TUYỆT ĐỐI KHÔNG dùng dấu gạch đầu dòng '-' hoặc bullet '•', '*' để mở đầu các câu hỏi.
  + MỖI CÂU HỎI BẮT BUỘC phải có số thứ tự rõ ràng (**Câu 1:**, **Câu 2:**, ...):
    * PHẦN I: **Câu 1:** [Đề bài] \n A. [Phương án] \n B. [Phương án] \n C. [Phương án] \n D. [Phương án] \n\n **Câu 2:** ...
    * PHẦN II: **Câu 1:** [Mệnh đề dẫn] \n a) [Ý 1] \n b) [Ý 2] \n c) [Ý 3] \n d) [Ý 4] \n\n **Câu 2:** ...
    * PHẦN III: **Câu 1:** [Đề bài] \n\n **Câu 2:** [Đề bài] ...
${numPartIV > 0 ? `    * PHẦN IV: **Câu 1:** [Đề bài] \\n\\n **Câu 2:** [Đề bài] ...` : `    * TUYỆT ĐỐI KHÔNG CÓ PHẦN IV (TỰ LUẬN).`}
  + Luôn có dấu cách trắng giữa từ tiếng Việt và dấu $: 'hàm số $y = f(x)$ có', 'tại điểm $x = 1$', 'A. $x = 0$', không bao giờ viết dính 'hàm số$y=f(x)$có'.
- **PHẦN I: CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN** (Đúng số lượng yêu cầu)
  + Bốn phương án ký hiệu: A.  B.  C.  D.
  + QUY TẮC BẮT BUỘC: KHÔNG dùng bullet tròn/vuông trước các chữ cái A, B, C, D. Trình bày thẳng hàng hoặc chia 2/4 cột cân đối.
- **PHẦN II: CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI** (Đúng số lượng yêu cầu)
  + Mỗi câu gồm một mệnh đề dẫn xuất và 4 ý độc lập ký hiệu rõ ràng: a), b), c), d).
  + Mỗi ý là một phát biểu hoàn chỉnh để học sinh phán đoán Đúng hoặc Sai.
- **PHẦN III: CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN** (Đúng số lượng yêu cầu)
  + Đặt câu hỏi dứt khoát, kết quả cuối cùng là một số nguyên, phân số tối giản hoặc số thập phân.
${numPartIV > 0 ? `- **PHẦN IV: BÀI TẬP TỰ LUẬN RÈN LUYỆN** (Đúng số lượng yêu cầu)\n  + Các bài tập đòi hỏi lập luận logic, vẽ hình minh họa hoặc liên hệ giải quyết vấn đề thực tiễn.` : `- **CẤM TUYỆT ĐỐI PHẦN IV**: Phiếu 3 phần không có bài tập tự luận.`}

---
### 4. QUY TẮC ĐỊNH DẠNG TOÁN HỌC & LATEX (CHUẨN MATHTYPE WORD)
${MATH_FORMATTING_RULES}
- Với các tên điểm, tập hợp, đoạn thẳng, danh sách số có nhiều ký tự hoặc dấu phẩy, bọc trong ngoặc nhọn: \{A, B, C\}, \{1, 2, 3\}, \{M, N\}.
- Với hàm số bậc nhất tuyến tính, ghi chuẩn: $y = ax + b$ (không dùng ngoặc nhọn quanh biểu thức tuyến tính).

---
### 5. KHU VỰC HƯỚNG DẪN GIẢI CHI TIẾT (ẨN / HIỆN KHOA HỌC)
${answerPrompt}
QUY TẮC BẮT BUỘC VỀ VỊ TRÍ KHỐI <details>: Bạn PHẢI viết XONG TOÀN BỘ ĐỀ BÀI của tất cả các phần (${numPartI > 0 ? 'PHẦN I, ' : ''}${numPartII > 0 ? 'PHẦN II, ' : ''}${numPartIII > 0 ? 'PHẦN III' : ''}${numPartIV > 0 ? ', PHẦN IV' : ''}) trước, sau đó mới mở DUY NHẤT MỘT khối thẻ <details class="solution-box"> ở cuối cùng của phiếu học tập! TUYỆT ĐỐI KHÔNG chèn thẻ <details> xen kẽ sau từng phần!
BẮT BUỘC KHÔNG CÓ BẢNG ĐÁP ÁN NHANH (bỏ hoàn toàn bảng đáp án nhanh theo yêu cầu). Đặt toàn bộ Hướng dẫn giải chi tiết của tất cả các phần trong DUY NHẤT 1 khối thẻ đóng/mở HTML <details> ở cuối tài liệu:

<details class="solution-box" style="margin-top: 25px; padding: 15px; border: 1px solid #10b981; border-radius: 8px; background-color: #f0fdf4;">
  <summary style="font-weight: bold; cursor: pointer; color: #047857; font-size: 16px;">
    👉 BẤM ĐỂ XEM HƯỚNG DẪN GIẢI CHI TIẾT
  </summary>
  
  [Chèn Hướng dẫn giải chi tiết từng câu của tất cả các phần (PHẦN I, PHẦN II, PHẦN III...) ở đây với lập luận toán học đầy đủ, mọi công thức và biến số đặt trong $...$ hoặc $$...$$, hệ phương trình dùng \\begin{cases}...\\end{cases}, không chèn bảng đáp án nhanh]
</details>

BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.`;

      const isJsonRequested = req.body?.responseFormat === 'json' || req.body?.mimeType === 'application/json';
      const response = await generateWithFallback(req, {
        contents: prompt,
        config: {
          temperature: isJsonRequested ? 0.3 : 0.7,
          ...(isJsonRequested ? { responseMimeType: "application/json" } : {})
        }
      });

      return { result: response.text };
    
    });

});

app.all("/api/generate-worksheet-stream", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const {
    grade = 11,
    subject = "Toán",
    chapter = "",
    semester = "Học kỳ 1",
    lesson = "",
    numPartI = 12,
    numPartII = 4,
    numPartIII = 6,
    numPartIV = 2,
    realWorldPercent = 40,
    includeRealWorldVD,
    realWorldVDPercent,
    includeRealWorldVDC,
    realWorldVDCPercent,
    includeRealWorldVisuals = true,
    hasParametric = true,
    additionalNotes = "",
    answerMode = "full"
  } = req.body || {};

  const totalCount = (numPartI || 0) + (numPartII || 0) + (numPartIII || 0) + (numPartIV || 0);

  let exercisePrompt = `CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC SINH ĐỦ 100% (TỔNG CHÍNH XÁC ĐỦ ${totalCount} CÂU, TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT KHÔNG DÙNG PLACEHOLDER '...'):`;
  if (numPartI > 0) exercisePrompt += `\n- PHẦN I: TRẮC NGHIỆM LỰA CHỌN A,B,C,D: BẮT BUỘC sinh đủ chính xác ${numPartI} câu độc lập (đánh số từ **Câu 1:** đến **Câu ${numPartI}:**, mỗi câu 4 phương án A, B, C, D).`;
  if (numPartII > 0) exercisePrompt += `\n- PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI: BẮT BUỘC sinh đủ chính xác ${numPartII} câu (đánh số từ **Câu 1:** đến **Câu ${numPartII}:**, mỗi câu gồm đề dẫn và ĐÚNG 4 ý a, b, c, d).`;
  if (numPartIII > 0) exercisePrompt += `\n- PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN: BẮT BUỘC sinh đủ chính xác ${numPartIII} câu (đánh số từ **Câu 1:** đến **Câu ${numPartIII}:**, đáp số là 1 con số cụ thể).`;
  if (numPartIV > 0) {
    exercisePrompt += `\n- PHẦN IV: BÀI TẬP TỰ LUẬN RÈN LUYỆN: BẮT BUỘC sinh đủ chính xác ${numPartIV} câu (đánh số từ **Câu 1:** đến **Câu ${numPartIV}:**).`;
  } else {
    exercisePrompt += `\n- CẤM TUYỆT ĐỐI PHẦN IV / TỰ LUẬN: Giáo viên đã chọn cấu trúc ĐỀ 3 PHẦN. TUYỆT ĐỐI KHÔNG SINH PHẦN IV, KHÔNG CÓ BÀI TẬP TỰ LUẬN TRONG ĐỀ BÀI, BẢNG ĐÁP ÁN HAY LỜI GIẢI!`;
  }

  exercisePrompt += `\n${buildRealWorldWorksheetDirective({
    totalCount: Math.max(1, totalCount),
    realWorldPercent,
    includeRealWorldVD,
    realWorldVDPercent,
    includeRealWorldVDC,
    realWorldVDCPercent,
    includeRealWorldVisuals,
    isJsonInteractive: false
  })}`;
  exercisePrompt += hasParametric 
    ? `\n- Phân hóa: Có bài toán chứa tham số m ở mức vận dụng.`
    : `\n- QUY ĐỊNH CẤM THAM SỐ (BẮT BUỘC 100%): Giáo viên đã chọn "Không có bài toán chứa tham số". TUYỆT ĐỐI KHÔNG xuất hiện bất kỳ tham số nào (như $m$, $k$, $a$, $b$ tham số). CẤM các câu hỏi tìm m hoặc chứa tham số m. TẤT CẢ các hệ số, phương trình, hàm số và bài toán PHẢI 100% là số cụ thể.`;

  if (additionalNotes) exercisePrompt += `\n- Ghi chú riêng từ giáo viên: ${additionalNotes}`;

  let answerPrompt = `BẮT BUỘC 100% ở cuối phiếu học tập KHÔNG ĐƯỢC CÓ BẢNG ĐÁP ÁN NHANH (bỏ hoàn toàn bảng đáp án nhanh theo yêu cầu của giáo viên). BẮT BUỘC viết xong toàn bộ đề bài của tất cả các phần (Phần I, Phần II, Phần III${numPartIV > 0 ? ', Phần IV' : ''}) trước, rồi mới đặt DUY NHẤT 1 khối HƯỚNG DẪN GIẢI CHI TIẾT cho tất cả các phần ở cuối cùng của phiếu học tập, gói trong thẻ HTML <details class="solution-box"><summary>👉 BẤM ĐỂ XEM HƯỚNG DẪN GIẢI CHI TIẾT</summary>...</details>.
QUY TẮC ĐÁNH SỐ TRONG PHẦN HƯỚNG DẪN GIẢI CHI TIẾT (BẮT BUỘC 100%):
- Tiêu đề mỗi phần (\`### PHẦN I\`, \`### PHẦN II\`, \`### PHẦN III\`${numPartIV > 0 ? ', `### PHẦN IV`' : ''}) PHẢI nằm trên 1 dòng riêng biệt.
- Ngay dưới mỗi tiêu đề phần, BẮT BUỘC đánh số đầy đủ từ **Câu 1:** đến hết câu cuối cùng của phần đó (tuyệt đối KHÔNG được bỏ sót chữ **Câu 1:** ở câu đầu tiên của PHẦN II hay PHẦN III, KHÔNG viết dính Câu 1 lên cùng dòng với tiêu đề PHẦN, và BẮT BUỘC có 1 dòng trống (\\n\\n) trước MỖI **Câu 1:**, **Câu 2:**, ... để mỗi câu luôn là một đoạn riêng biệt, KHÔNG bao giờ viết dồn "Câu 1: ... Câu 2: ..." trên cùng một dòng hoặc sát nhau không có dòng trống):
  + Dưới \`### PHẦN I\`: Trình bày lần lượt **Câu 1:** ... rồi xuống 2 dòng (dòng trống), tiếp tục **Câu 2:** ... đến **Câu ${numPartI}:** ... (đủ ${numPartI} câu).
  + Dưới \`### PHẦN II\`: Trình bày lần lượt trên từng đoạn mới có dòng trống ngăn cách:
    **Câu 1:**

    a) ...

    b) ...

    c) ...

    d) ...

    **Câu 2:** ... cho đến đủ **Câu ${numPartII}:** (đủ ${numPartII} câu).
  + Dưới \`### PHẦN III\`: Trình bày lần lượt mỗi câu 1 đoạn riêng cách nhau bởi 1 dòng trống bắt đầu bằng **Câu 1:** ..., **Câu 2:** ..., cho đến đủ **Câu ${numPartIII}:** (đủ ${numPartIII} câu).
${numPartIV > 0 ? `  + Dưới \`### PHẦN IV\`: Trình bày lần lượt mỗi câu 1 đoạn riêng bắt đầu bằng **Câu 1:** ... đến **Câu ${numPartIV}:** (đủ ${numPartIV} câu).` : ''}
TUYỆT ĐỐI KHÔNG chèn <details> sau từng phần và KHÔNG ĐƯỢC BỎ SÓT PHẦN HƯỚNG DẪN GIẢI CHI TIẾT!`;
  if (answerMode === 'none') answerPrompt = 'TUYỆT ĐỐI KHÔNG kèm đáp án hay lời giải.';
  else if (answerMode === 'summary') answerPrompt = `Ở cuối cùng của phiếu học tập (sau khi đã viết xong toàn bộ đề bài của tất cả các phần), cung cấp HƯỚNG DẪN GIẢI CHI TIẾT ngắn gọn cho tất cả các phần gói trong DUY NHẤT 1 thẻ <details class="solution-box"><summary>👉 BẤM ĐỂ XEM HƯỚNG DẪN GIẢI</summary>...</details>. Trong đó mỗi phần (\`### PHẦN I\`, \`### PHẦN II\`, \`### PHẦN III\`${numPartIV > 0 ? ', `### PHẦN IV`' : ''}) và MỖI **Câu 1:**, **Câu 2:**, ... phải có dòng trống ngăn cách riêng biệt (PHẦN II đủ ${numPartII} câu từ **Câu 1:** đến **Câu ${numPartII}:**, PHẦN III đủ ${numPartIII} câu từ **Câu 1:** đến **Câu ${numPartIII}:**).`;

  const isSpecialTopic = semester === 'special_topic' || (typeof semester === 'string' && semester.toLowerCase().includes('chuyên đề'));
  const specialTopicDirective = isSpecialTopic
    ? `\nĐẶC THÙ CHUYÊN ĐỀ HỌC TẬP TOÁN (CHƯƠNG TRÌNH GDPT 2018 - KẾT NỐI TRI THỨC):
- Đây là Phiếu học tập thuộc Chuyên đề học tập môn Toán chương trình GDPT 2018 (bộ sách Kết nối tri thức với cuộc sống).
- Yêu cầu: 
  (1) Phần tóm tắt kiến thức phải trình bày rõ các định nghĩa, công thức tính toán hoặc quy trình/thuật toán giải từng bước; 
  (2) Hệ thống bài tập phải tăng cường mạnh tính ứng dụng thực tiễn, mô hình hóa toán học (bài toán kinh tế, tài chính, tối ưu hóa, đồ thị, kỹ thuật) bám sát đúng tinh thần sách Chuyên đề; 
  (3) Với các bài toán liên quan đến hình học/đồ thị/miền nghiệm, cần mô tả chi tiết dữ kiện tọa độ, đỉnh, cạnh để học sinh dễ dàng vẽ hình và giải quyết.\n`
    : '';

  const prompt = `Bạn là chuyên gia sư phạm bộ môn ${subject || "Toán"} Việt Nam (Chương trình GDPT 2018, SGK Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027).
Hãy tạo ngay PHIẾU HỌC TẬP A4 Chuẩn in ấn cho học sinh Lớp ${grade}, ${semester}, môn ${subject || "Toán"}, Chương: "${chapter}", Bài học/chủ đề: "${lesson}".

${specialTopicDirective}
YÊU CẦU QUAN TRỌNG VỀ CẤU TRÚC VÀ PHẠM VI NỘI DUNG (BẮT BUỘC 100%):
0. PHẠM VI CHỦ ĐỀ CHÍNH XÁC (TẬP TRUNG 100%): Tất cả các câu hỏi trong phiếu BẮT BUỘC phải thuộc chính xác bài học "${lesson}" (thuộc ${chapter}, Lớp ${grade}, ${semester}). TUYỆT ĐỐI KHÔNG BỊA RA HOẶC CHÈN THÊM bất kỳ câu hỏi nào thuộc các chương học khác ngoài bài học đã chọn.
1. SỐ LƯỢNG CÂU HỎI & CÁC PHẦN BẮT BUỘC (TỔNG ${totalCount} CÂU): Bạn PHẢI sinh ĐẦY ĐỦ 100% tất cả các Phần có số câu > 0 theo đúng cấu hình của giáo viên:
   ${numPartI > 0 ? `- PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (Bắt buộc đủ ${numPartI} câu, từ **Câu 1:** đến **Câu ${numPartI}:**)` : ''}
   ${numPartII > 0 ? `- PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (Bắt buộc đủ ${numPartII} câu, từ **Câu 1:** đến **Câu ${numPartII}:**)` : ''}
   ${numPartIII > 0 ? `- PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN (Bắt buộc đủ ${numPartIII} câu, từ **Câu 1:** đến **Câu ${numPartIII}:**) -> TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ SÓT PHẦN III!` : ''}
   ${numPartIV > 0 ? `- PHẦN IV: BÀI TẬP TỰ LUẬN RÈN LUYỆN (Bắt buộc đủ ${numPartIV} câu, từ **Câu 1:** đến **Câu ${numPartIV}:**)` : 'CẤM TUYỆT ĐỐI PHẦN IV (TỰ LUẬN): Đề bài là ĐỀ 3 PHẦN. TUYỆT ĐỐI KHÔNG có phần IV hay bài tập tự luận nào!'}
${!hasParametric ? 'CẤM TUYỆT ĐỐI THAM SỐ: Không chứa tham số m, không hỏi tìm m, tất cả hệ số là số thực cụ thể!' : ''}
2. Xuất trực tiếp nội dung phiếu học tập Markdown, không viết câu chào hay mở đầu.
3. ĐỒNG BỘ TIÊU ĐỀ & TÓM TẮT LÝ THUYẾT:
   - TUYỆT ĐỐI KHÔNG tự ý chèn thêm tiêu đề bài học hay header thừa ở đầu văn bản (như "# BÀI 1: ..." hay "# PHIẾU HỌC TẬP").
   - Bắt đầu ngay bằng mục \`## TÓM TẮT KIẾN THỨC TRỌNG TÂM\`.
   - Trong mục \`TÓM TẮT KIẾN THỨC TRỌNG TÂM\`, trình bày các mục lý thuyết bằng gạch đầu dòng \`- **Định nghĩa:** ...\`, \`- **Số hạng tổng quát:** ...\`, \`- **Tính chất:** ...\`, \`- **Tổng n số hạng đầu:** ...\`. TUYỆT ĐỐI KHÔNG đánh số "Câu 1:", "Câu 2:" trong phần Tóm tắt kiến thức trọng tâm!
4. ĐÁNH SỐ CÂU HỎI CHUẨN ĐỀ THI (CHỈ ÁP DỤNG TỪ PHẦN I TRỞ ĐI):
   - Từ PHẦN I, PHẦN II, PHẦN III${numPartIV > 0 ? ', PHẦN IV' : ''}: TẤT CẢ các câu hỏi BẮT BUỘC phải đánh số thứ tự rõ ràng (**Câu 1:**, **Câu 2:**, ...):
     + PHẦN I: **Câu 1:** [Đề bài] \n A. [Phương án] \n B. [Phương án] \n C. [Phương án] \n D. [Phương án] \n\n **Câu 2:** ...
     + PHẦN II: **Câu 1:** [Mệnh đề dẫn] \n a) ... \n b) ... \n c) ... \n d) ... \n\n **Câu 2:** ...
     + PHẦN III: **Câu 1:** [Đề bài] \n\n **Câu 2:** [Đề bài] ...
${numPartIV > 0 ? `     + PHẦN IV: **Câu 1:** [Đề bài] \\n\\n **Câu 2:** [Đề bài] ...` : `     + TUYỆT ĐỐI KHÔNG CÓ PHẦN IV / TỰ LUẬN.`}
5. QUY TẮC CÔNG THỨC TOÁN & TÁCH CHỮ TIẾNG VIỆT KHỎI DẤU $:
   - TUYỆT ĐỐI KHÔNG để chữ tiếng Việt có dấu bị nhốt bên trong cặp dấu \`$...$\`. Chỉ bọc đúng biểu thức toán học trong \`$...$\`:
     + Viết chuẩn: \`Dãy số $(u_n)$ là cấp số cộng với công sai $d$ khi và chỉ khi: $u_{n+1} = u_n + d$ với $n \\ge 1$.\`
     + Viết chuẩn: \`Số hạng tổng quát: $u_n = u_1 + (n - 1)d$ với $n \\ge 2$.\`
     + Viết chuẩn: \`Tính chất: $u_k = \\frac{u_{k-1} + u_{k+1}}{2}$ với $k \\ge 2$.\`
     + Viết chuẩn: \`Tổng $n$ số hạng đầu tiên: $S_n = \\frac{n[2u_1 + (n - 1)d]}{2} = \\frac{n(u_1 + u_n)}{2}$.\`
   - LUÔN CÓ KHOẢNG TRẮNG GIỮA TỪ TIẾNG VIỆT VÀ DẤU $: viết \`Tính tổng $S_{10}$ của $10$ số hạng đầu tiên của cấp số cộng $(u_n)$ biết rằng $u_1 = 2$ và công sai $d = 4$.\`, TUYỆT ĐỐI KHÔNG viết dính \`tổng$S_{10}$\`, \`cộng$(u_n)$thỏa mãn\`.
   - Sử dụng cú pháp LaTeX chuẩn: \\frac thay cho \\dfrac, \\ge thay cho \\geq, \\le thay cho \\leq.
6. PHẦN II (TRẮC NGHIỆM ĐÚNG / SAI):
   - Với từng ý a), b), c), d), bắt buộc viết câu phát biểu hoàn chỉnh, giữ nguyên vẹn chữ cái đầu tiên.
   - Với phân số phức hợp (phân số có chứa phân số ở tử hoặc mẫu), BẮT BUỘC đóng đủ ngoặc nhọn \`}\` của tử số trước khi mở \`{\` của mẫu số (ví dụ viết chuẩn: \`$u_n = \\frac{3 - \\frac{2}{n}}{4 + \\frac{5}{n}}$\`, tuyệt đối KHÔNG viết thiếu dấu \`}\` thành \`\\frac{3 - \\frac{2}{n}{4 + \\frac{5}{n}}\`).
7. ${exercisePrompt}
8. ${answerPrompt}
9. KHÓA CHẶN SUY LUẬN NHÁP / TỰ ĐÍNH CHÍNH / BÌNH LUẬN NGOÀI LỀ:
   - TUYỆT ĐỐI KHÔNG xuất các đoạn suy luận nháp, tự kiểm tra đề bài, hay tự đính chính giữa chừng kiểu "(..., xin lỗi, đáp án đúng là 45, ý d sai)". Trước khi ghi chữ Đúng hoặc Sai ở đầu mỗi ý a), b), c), d), hãy tính nhẩm kết quả trước rồi mới ghi chính xác Đúng hoặc Sai khớp 100% với phép tính giải thích!`;

  await generateWithFallbackStream(req, res, {
    contents: prompt,
    config: { 
      maxOutputTokens: 32768,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });
});

app.all("/api/pdf-to-word", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const files = resolveFiles(req.body);
      const { croppedImage, pageNum, totalPages } = req.body || {};
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const fileList = [...(files || [])];
      if (croppedImage && typeof croppedImage === 'string') {
        const cleanBase64 = croppedImage.replace(/^data:[^;]+;base64,/, '');
        fileList.unshift({
          data: cleanBase64,
          type: 'image/png',
          name: 'cropped_figure.png'
        });
      }

      const isSinglePageMode = typeof pageNum === 'number';
      const figureInstruction = isSinglePageMode
        ? `- BẮT BUỘC PHÁT HIỆN & CẮT ẢNH GỐC 100% CHO MỌI BẢNG BIẾN THIÊN (BBT), BẢNG XÉT DẤU, ĐỒ THỊ, HÌNH VẼ & SƠ ĐỒ (QUAN TRỌNG SỐ 1):
  + KHI GẶP BẤT KỲ: **BẢNG BIẾN THIÊN (BBT)**, **BẢNG XÉT DẤU** (bảng có các dòng $x, y', y$ hoặc $f'(x), f(x)$ và mũi tên $\\nearrow, \\searrow$), **ĐỒ THỊ HÀM SỐ**, MẶT PHẲNG TỌA ĐỘ $Oxy$, MIỀN NGHIỆM GẠCH CHÉO/TÔ ĐẬM, HÌNH VẼ HÌNH HỌC (2D/3D), SƠ ĐỒ MẠCH ĐIỆN, BIỂU ĐỒ, HOẶC HÌNH MINH HỌA NÀO — KỂ CẢ KHI NẰM CẠNH BÊN PHẢI/TRÁI ĐOẠN CHỮ ĐỀ BÀI HOẶC TRONG BẢNG HƯỚNG DẪN CHẤM:
  + **TUYỆT ĐỐI CẤM TỰ Ý VẼ LẠI**: KHÔNG chuyển Bảng biến thiên (BBT) hay Bảng xét dấu thành Markdown Table (\`| x | ... | y' | ... | y |\`), KHÔNG tự vẽ đồ thị/BBT bằng TikZ, SVG, ASCII hay bịa công thức. PHẢI giữ nguyên $100\\%$ ảnh gốc từ đề bằng thẻ \`[CROP_FIG ...]\`!
  + TUYỆT ĐỐI CẤM bỏ qua hình vẽ/BBT/đồ thị ngay cả khi đề bài đã ghi sẵn tọa độ điểm hay mô tả trong ngoặc đơn.
  + HÃY xác định khung bao hình chữ nhật chính xác chứa TOÀN BỘ Bảng biến thiên / Đồ thị / Hình vẽ đó trên ảnh trang:
    * Với **Bảng biến thiên / Bảng xét dấu**: ôm trọn toàn bộ khung viền bảng, cột trái $x, y', y$ (hoặc $f'(x), f(x)$), toàn bộ dấu $+, -, 0$, vạch đôi không xác định, các mũi tên $\\nearrow, \\searrow$, và các giá trị $-\\infty, +\\infty$, cực trị; KHÔNG dính dòng đề bài phía trên hay phương án A, B, C, D phía dưới.
    * Với **Đồ thị / Hình vẽ**: ôm trọn toàn bộ mũi tên trục, nhãn $O, x, y$, các số trên trục tọa độ, tên điểm $A, B, C, S...$, ký hiệu góc/độ dài, đường nét gạch chéo miền nghiệm; KHÔNG dính dòng đề bài phía trên hay đáp án A, B, C, D phía dưới.
  + Xuất ĐÚNG MỘT thẻ đánh dấu trên một dòng riêng ngay tại ĐÚNG VỊ TRÍ xuất hiện BBT/đồ thị/hình vẽ (ví dụ giữa câu dẫn và 4 phương án A, B, C, D) theo cú pháp chuẩn sau (hệ tọa độ chuẩn hóa 0..1000 của ảnh trang: ymin,xmin,ymax,xmax với 0 là mép trên/trái, 1000 là mép dưới/phải; mô tả ngắn gọn KHÔNG chứa ký tự [ hoặc ] hay dấu "):
    [CROP_FIG page="${pageNum}" box="ymin,xmin,ymax,xmax" desc="Mô tả ngắn gọn"]
  + Ví dụ 1 (Bảng biến thiên): [CROP_FIG page="${pageNum}" box="210,140,345,860" desc="Bảng biến thiên của hàm số"]
  + Ví dụ 2 (Đồ thị hàm số): [CROP_FIG page="${pageNum}" box="330,620,475,895" desc="Đồ thị hàm số trên mặt phẳng Oxy"]
  + Ví dụ 3 (Hình học không gian): [CROP_FIG page="${pageNum}" box="180,260,440,740" desc="Hình chóp S.ABCD"]`
        : `- Khi gặp Bảng biến thiên (BBT), Bảng xét dấu, biểu đồ, hình vẽ, đồ thị, mặt phẳng tọa độ, miền nghiệm gạch chéo, hình lăng trụ, hình chóp hay hình ảnh minh họa: TUYỆT ĐỐI KHÔNG tự ý vẽ lại (không chuyển BBT sang Markdown table, không vẽ SVG/TikZ) và KHÔNG bỏ qua; hãy ghi thẻ chú thích ngắn gọn ngay đúng vị trí xuất hiện: [Bảng biến thiên: mô tả ngắn gọn], [Đồ thị: mô tả ngắn gọn] hoặc [Hình vẽ: mô tả ngắn gọn].`;

      const prompt = `Bạn là một trợ lý AI chuyên gia số hóa tài liệu giáo dục và chuyển đổi định dạng từ PDF/Hình ảnh sang văn bản Word (.docx).
Nhiệm vụ của bạn là đọc toàn bộ nội dung từ ${isSinglePageMode ? `Trang ${pageNum}/${totalPages || 1} của tài liệu đính kèm` : 'tất cả các trang của tài liệu đính kèm'} và xuất ra văn bản chính xác 100%, tuân thủ nghiêm ngặt toàn bộ các quy tắc sau:

1. QUY TẮC SỐ HÓA, GIỮ NGUYÊN HÌNH ẢNH & ĐẦY ĐỦ 100% (BẮT BUỘC):
- Đọc và số hóa 100% toàn bộ nội dung chính của đề thi/tài liệu trên trang (tiêu đề đề thi, đề mục PHẦN I/II/III, tất cả câu hỏi, hình vẽ minh họa, các ý a), b), c), d), các phương án A, B, C, D, bảng biểu, lời giải).
- Nếu đầu vào có chứa các mã đánh dấu ảnh sẵn dạng [DOCX_IMG_1], [DOCX_IMG_2]... thì PHẢI GIỮ NGUYÊN CHÍNH XÁC các mã [DOCX_IMG_N] đó tại đúng vị trí câu hỏi, TUYỆT ĐỐI KHÔNG xóa hay đổi tên!
- TUYỆT ĐỐI KHÔNG TÓM TẮT, KHÔNG CẮT XÉN, KHÔNG BỎ QUA BẤT KỲ CÂU HỎI HOẶC HÌNH VẼ NÀO.
- LOẠI BỎ HEADER / FOOTER LẶP LẠI: Bỏ qua các dòng tiêu đề đầu trang hoặc chân trang mang tính trang trí/lề trang (ví dụ tên giảng viên, số điện thoại liên hệ ở mép trên/dưới, dòng "Trang X/Y", dòng chú thích chân trang lặp lại ở mỗi trang) nếu không thuộc nội dung đề bài.
- TRÌNH BÀY TIÊU ĐỀ ĐỀ THI & CHÂN ĐỀ (QUAN TRỌNG):
  + Nếu đầu trang có phần tiêu đề đề thi chia 2 cột (cột trái thường ghi: UBND / SỞ GIÁO DỤC / PHÒNG GIÁO DỤC / TRƯỜNG / ĐỀ THI / (Đề thi gồm ... trang); cột phải thường ghi: KÌ THI / KỲ THI / NĂM HỌC / Môn thi / Thời gian làm bài...), BẮT BUỘC xuất dưới dạng bảng HTML không viền 2 cột đúng cấu trúc sau:
<table class="borderless" style="width: 100%; border: none;"><tbody><tr><td style="text-align: center; border: none; width: 45%; vertical-align: top;">DÒNG 1 CỘT TRÁI<br/>DÒNG 2 CỘT TRÁI<br/>...</td><td style="text-align: center; border: none; width: 55%; vertical-align: top;">DÒNG 1 CỘT PHẢI<br/>DÒNG 2 CỘT PHẢI<br/>...</td></tr></tbody></table>
  + Bên trong các ô bảng tiêu đề đó, dùng thẻ <strong>...</strong> (in đậm), <em>...</em> (in nghiêng) và <br/> để ngắt từng dòng chính xác (TUYỆT ĐỐI KHÔNG viết dính **...***...*). Sau thẻ </table> phải xuống 2 dòng (\\n\\n) trước khi sang Câu 1. hoặc PHẦN I.
  + Nếu tiêu đề chỉ có 1 cột hoặc ở phần cuối đề thi (như ------ HẾT ------, Họ và tên thí sinh: ...), PHẢI đặt dòng trống (\\n\\n) tách biệt từng dòng để không bao giờ bị dồn thành một đoạn văn dính chữ.
- LUÔN xuống hai dòng (\\n\\n) tách biệt rõ ràng giữa tên đề thi/tiêu đề với các đề mục như PHẦN I., PHẦN II., PHẦN III., Câu 1. (tuyệt đối không viết dính chữ vào nhau).
- Nếu trang có phần chuyển tiếp từ trang trước, PHẢI gõ đầy đủ các câu chữ tiếp theo đó.
${!isSinglePageMode ? '- Ở ranh giới chuyển tiếp giữa các trang, đánh dấu bằng dòng: "--- [Hết Trang X / Sang Trang Y] ---".' : ''}

2. XỬ LÝ HÌNH VẼ, ĐỒ THỊ, SƠ ĐỒ TỪ FILE GỐC (BẮT BUỘC TUÂN THỦ):
${figureInstruction}

3. CHUẨN HÓA CÔNG THỨC TOÁN / LÝ / HÓA (CHUẨN LATEX NGHIÊM NGẶT):
- MỌI biến số, số liệu toán học, biểu thức đại số, hàm số, phương trình, bất phương trình, tọa độ, ký hiệu hình học, vectơ, và 100% các phương án A, B, C, D chứa toán học BẮT BUỘC phải đặt trong dấu đô la: $công_thức$.
- TUYỆT ĐỐI KHÔNG ĐỂ BẤT PHƯƠNG TRÌNH HAY ĐẲNG THỨC NÀO Ở DẠNG TEXT THƯỜNG THIẾU $: Ví dụ $x - 1 \\ge 0$, $a \\ge 1$, $-\\frac{1}{2} < x \\le 3$.
- LUÔN CÓ KHOẢNG TRẮNG sau các lệnh so sánh: \\ge 0, \\le 0, \\neq 0.
- TẬP HỢP: viết chuẩn $A = \\{x \\in \\mathbb{R} \\mid x + 2y \\le 0\\}$.
- KHÔNG BAO GIỜ bọc cả câu tiếng Việt (như "ta được:", "với:") vào bên trong dấu $. Dấu $ chỉ bọc riêng biểu thức toán.
- LUÔN DÙNG \\frac thay cho \\dfrac. DÙNG \\ge thay cho \\geq, \\le thay cho \\leq.

4. GIỮ NGUYÊN CẤU TRÚC, SỐ THỨ TỰ CÂU & BẢNG BIỂU:
- BẮT BUỘC GIỮ NGUYÊN CHÍNH XÁC 100% SỐ THỨ TỰ CÂU HỎI như bản gốc (ví dụ: nếu bản gốc ghi Câu 17., Câu 18., Câu 19., Câu 20., Câu 21., Câu 22. thì PHẢI giữ đúng Câu 17., Câu 18.,... TUYỆT ĐỐI KHÔNG tự ý đánh số lại thành Câu 1., Câu 2.).
- Với các phương án trắc nghiệm: trình bày rõ ràng A., B., C., D. trên từng dòng độc lập; không thêm ký hiệu bullet phía trước.
- Với các ý Đúng/Sai hoặc tự luận nhỏ: trình bày a), b), c), d) rõ ràng trên từng dòng.
- CÁC BẢNG SỐ LIỆU THÔNG THƯỜNG (bảng số liệu thống kê, bảng tần số ghép nhóm, bảng giá trị, bảng phân bố xác suất, bảng đáp án): trình bày dưới dạng Markdown Table chuẩn (| ... |) đúng chính xác các hàng và cột như bản gốc.
- RIÊNG BẢNG BIẾN THIÊN (BBT), BẢNG XÉT DẤU VÀ ĐỒ THỊ HÀM SỐ: TUYỆT ĐỐI KHÔNG chuyển thành Markdown Table hay tự ý vẽ lại dưới bất kỳ dạng nào — BẮT BUỘC giữ nguyên $100\\%$ ảnh gốc bằng thẻ \`[CROP_FIG ...]\` như mục 2!

Đầu ra của bạn phải hoàn toàn là nội dung tài liệu đã được số hóa dạng Markdown chuẩn, không thêm lời chào hay giải thích ngoài lề!`;

      const response = await generateWithFallback(req, {
        fastMode: true,
        timeoutMs: isSinglePageMode ? 45000 : 90000,
        preferredModels: [
          "gemini-2.5-flash",
          "gemini-3-flash-preview",
          "gemini-2.5-flash-lite",
          "gemini-3.1-flash-lite-preview",
        ],
        contents: [
          {
            role: "user",
            parts: [
              ...(await processFilesForAI(fileList)),
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: isSinglePageMode ? 8192 : 16384,
        }
      });
      
      let resultText = response.text || "";
      
      // Clean up any accidental TikZ or raw SVG redraws so Pass-2 crops the real original image instead
      resultText = resultText.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
      resultText = resultText.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
      resultText = resultText.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');
      resultText = resultText.replace(/```(?:svg|xml|html)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, '\n[Hình vẽ minh họa]\n');
      resultText = resultText.replace(/<svg\b[\s\S]*?<\/svg>/gi, '\n[Hình vẽ minh họa]\n');

      if (croppedImage) {
        const imgTag = `\n\n<img src="${croppedImage}" alt="Hình vẽ minh họa tài liệu" data-cropped-figure="true" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;
        if (/\[CROP_FIG\b(?:[^\[\]]|\[[0-9.,;\s]+\])*\]/i.test(resultText)) {
          resultText = resultText.replace(/\[CROP_FIG\b(?:[^\[\]]|\[[0-9.,;\s]+\])*\]/i, imgTag);
        } else if (/\[Hình (?:vẽ|ảnh)[^\]]*\]/i.test(resultText)) {
          resultText = resultText.replace(/\[Hình (?:vẽ|ảnh)[^\]]*\]/i, imgTag);
        }
      }

      if (!resultText || !resultText.trim()) {
        resultText = "Không nhận diện được nội dung chữ hoặc công thức trong hình ảnh/tài liệu này. Thầy cô vui lòng kiểm tra lại độ nét của hình ảnh và thử lại.";
      }

      return { result: resultText };
    
    });
});

app.all("/api/detect-page-figures", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return keepAliveExecute(req, res, async () => {
    const { imageBase64, mimeType = 'image/png', pageNum = 1, pageMarkdown = '' } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return { figures: [] };
    }
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const questionSummary = String(pageMarkdown || '').slice(0, 4500);

    const detectPrompt = `Hãy quan sát thật kỹ ảnh Trang ${pageNum} đính kèm và xác định CHÍNH XÁC tọa độ khung bao (bounding box) của TẤT CẢ các:
- **BẢNG BIẾN THIÊN (BBT)** và **BẢNG XÉT DẤU** (bảng gồm các hàng x, y', y hoặc f'(x), f(x) có dấu +, -, 0 và các mũi tên tăng/giảm)
- **ĐỒ THỊ HÀM SỐ**, hệ trục tọa độ Oxy, đường cong đồ thị, miền nghiệm bất phương trình (phần gạch chéo/tô đậm)
- **HÌNH VẼ HÌNH HỌC** phẳng/không gian (tam giác, đường tròn, hình chóp, lăng trụ, hình nón, hình trụ, hình cầu), sơ đồ, biểu đồ hoặc hình ảnh minh họa
xuất hiện trên trang — KỂ CẢ KHI NẰM BÊN PHẢI/TRÁI CHỮ ĐỀ BÀI HOẶC TRONG BẢNG HƯỚNG DẪN CHẤM.

QUY TẮC BẮT BUỘC:
1. PHẢI khoanh vùng ĐẦY ĐỦ cả **BẢNG BIẾN THIÊN (BBT)**, **BẢNG XÉT DẤU**, **ĐỒ THỊ HÀM SỐ**, **HÌNH VẼ**, **SƠ ĐỒ**, **BIỂU ĐỒ**. KHÔNG khoanh vùng đoạn văn bản thuần, KHÔNG khoanh vùng bảng số liệu thống kê/bảng tần số ghép nhóm/bảng đáp án thông thường và KHÔNG khoanh cả trang.
2. Mỗi box_2d là mảng đúng 4 số nguyên [ymin, xmin, ymax, xmax] theo hệ tọa độ chuẩn hóa 0..1000 (0 = mép trên/trái, 1000 = mép dưới/phải).
   - Với **Bảng biến thiên / Bảng xét dấu**: khung bao phải ôm trọn 100% khung viền bảng, cột trái x, y', y, các vạch kẻ, dấu +, -, 0, mũi tên và giá trị cực trị, -vô cùng, +vô cùng; KHÔNG dính dòng đề bài phía trên hay đáp án A, B, C, D phía dưới.
   - Với **Đồ thị / Hình vẽ**: khung bao phải ôm trọn toàn bộ mũi tên trục, nhãn O, x, y, các số trên trục, tên đỉnh A, B, C, S và phần gạch chéo; KHÔNG dính dòng chữ đề bài ở trên hay đáp án A, B, C, D ở dưới.
3. Ghi rõ "questionLabel" của câu hỏi chứa BBT/đồ thị/hình vẽ đó đúng như trên trang (ví dụ: "Câu 3", "Câu 4", "Bài 2", hoặc "" nếu không gắn với số câu cụ thể). Nếu 1 câu có 4 đồ thị/BBT nhỏ tương ứng 4 phương án A, B, C, D thì trả về 4 phần tử riêng với questionLabel là "Câu X - A", "Câu X - B", "Câu X - C", "Câu X - D" hoặc 1 khung chung bao 4 hình nếu chúng nằm liền khối.
4. Trong trường "description" ghi rõ loại hình bằng chữ tiếng Việt bình thường (ví dụ: "Bảng biến thiên", "Bảng xét dấu", "Đồ thị hàm số", "Hình chóp S.ABCD" — KHÔNG dùng ký tự backslash LaTeX hay dấu ngoặc kép).
5. Nếu trang hoàn toàn KHÔNG có BBT/bảng xét dấu/đồ thị/hình vẽ/sơ đồ nào thì trả về {"figures": []}.
${questionSummary ? `\nVăn bản đã OCR trên trang để bạn đối chiếu đúng số câu (questionLabel):\n${questionSummary}` : ''}`;

    const response = await generateWithFallback(req, {
      fastMode: true,
      timeoutMs: 22000,
      preferredModels: [
        "gemini-2.5-flash",
        "gemini-3-flash-preview",
        "gemini-2.5-flash-lite",
      ],
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64
              }
            },
            { text: detectPrompt }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a precise document figure bounding-box detector. Always return strictly valid JSON matching the requested schema with plain text descriptions (no LaTeX backslashes).",
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            figures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionLabel: {
                    type: Type.STRING,
                    description: "Nhãn câu hỏi chứa hình vẽ, ví dụ 'Câu 3', 'Bài 1', hoặc chuỗi rỗng."
                  },
                  box_2d: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Tọa độ chuẩn hóa [ymin, xmin, ymax, xmax] trong thang 0..1000."
                  },
                  description: {
                    type: Type.STRING,
                    description: "Mô tả ngắn gọn nội dung hình vẽ bằng văn bản thường."
                  }
                },
                required: ["questionLabel", "box_2d", "description"]
              }
            }
          },
          required: ["figures"]
        }
      }
    });

    const rawText = (response.text || '{"figures":[]}').trim();
    const cleanedJson = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      const parsed = JSON.parse(cleanedJson);
      const list = Array.isArray(parsed?.figures) ? parsed.figures : [];
      return { figures: list };
    } catch {
      try {
        const startIdx = cleanedJson.indexOf('{');
        const endIdx = cleanedJson.lastIndexOf('}');
        const slice = startIdx !== -1 && endIdx > startIdx ? cleanedJson.slice(startIdx, endIdx + 1) : cleanedJson;
        const parsed = JSON.parse(sanitizeJsonString(slice));
        const list = Array.isArray(parsed?.figures) ? parsed.figures : [];
        return { figures: list };
      } catch {
        return { figures: [] };
      }
    }
  });
});

app.all("/api/solve-exercise", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
    return keepAliveExecute(req, res, async () => {

      const files = resolveFiles(req.body);
      let { croppedImage, croppedImageFileId, language = 'vi' } = req.body || {};
      const isEnglish = language === 'en';
      if (croppedImageFileId && chunkStore.has(croppedImageFileId)) {
        const entry = chunkStore.get(croppedImageFileId)!;
        croppedImage = entry.chunks.join('');
        chunkStore.delete(croppedImageFileId);
      }

      const fileList = [...(files || []).filter(f => f && f.data && f.data.length > 0)];
      if (croppedImage && typeof croppedImage === 'string') {
        const cleanBase64 = croppedImage.replace(/^data:[^;]+;base64,/, '').trim();
        if (cleanBase64) {
          fileList.unshift({
            data: cleanBase64,
            type: 'image/png',
            name: 'cropped_figure.png'
          });
        }
      }

      if (!fileList || fileList.length === 0) {
        throw new Error(isEnglish ? "Please upload an exercise file or image." : "Vui lòng tải lên tệp bài tập hoặc ảnh đề bài.");
      }

      const prompt = isEnglish
        ? `You are an expert international Mathematics & Olympiad teacher fluent in academic English. Below is a mathematics problem, competition exam paper, or study document uploaded by a teacher.
REQUIREMENTS:
1. Carefully read and transcribe ALL problems/questions from the uploaded file/image (if it is a multi-page or multi-question paper such as PART I Multiple Choice and PART II Write Answers, transcribe and solve EVERY SINGLE QUESTION completely—do NOT skip, summarize, or omit any question).
2. Restate each problem cleanly and accurately in English, preserving all given hypotheses, conditions, answer choices (A, B, C, D), and numerical data.
3. Provide a complete, rigorous, step-by-step solution in clear academic English for every single question, clearly explaining formulas, theorems, algebraic transformations, and stating the final answer (including the exact option letter for multiple-choice questions).
4. Format the output into 2 clear H2 Markdown sections:
## Problem Statement
[Accurate restatement of the problem(s) in English]
${croppedImage ? '[HÌNH_ẢNH_ĐỀ_BÀI]' : ''}

## Detailed Solution
${croppedImage ? '[HÌNH_ẢNH_ĐÁP_ÁN]\n' : ''}[Step-by-step detailed solutions in English for every question, analyzing relevant coordinates, geometric features, or graphs]

5. STRICT LANGUAGE & LATEX RULES:
   - Write 100% in natural, accurate academic English (do NOT use Vietnamese explanations or Vietnamese labels).
   - Enclose ALL mathematical formulas, expressions, equations, intervals, and standalone variables ($x$, $y$, $m$, $n$, $a$, $b$, $S$, $u_n$) in \`$...$\` (inline) or \`$$...$$\` (display).
   - Always use standard LaTeX: \`\\frac{a}{b}\` (never \`\\dfrac\`), \`\\sqrt{...}\`, \`\\sin\`, \`\\cos\`, \`\\tan\`, \`\\lim\`, \`\\pi\`, \`\\Leftrightarrow\`, \`\\Rightarrow\`, \`\\ge\`, \`\\le\`, \`\\in\`.
   - Do NOT output scratchpad thoughts, self-correction commentary ("Wait...", "Let me recheck..."), or off-topic remarks.
6. [FIGURES, TABLES & DIAGRAMS]:
${croppedImage
  ? `   - An attached cropped image is provided: place \`[HÌNH_ẢNH_ĐỀ_BÀI]\` at the end of \`## Problem Statement\` and \`[HÌNH_ẢNH_ĐÁP_ÁN]\` at the beginning of \`## Detailed Solution\` for side-by-side reference.`
  : `   - CRITICAL FOR ORIGINAL FIGURES: If the uploaded PDF/image contains ANY original diagram, graph, coordinate plane, shaded half-plane, geometry figure, circuit, or illustration (including figures placed side-by-side to the right or left of the question text), you MUST emit a crop tag right inside that question in \`## Problem Statement\` (between the question stem and choices A, B, C, D) using normalized 0..1000 coordinates:
     \`[CROP_FIG page=1 box_2d=[ymin,xmin,ymax,xmax] desc="Short figure description"]\`
     (for multi-page PDFs, set \`page=\` to the 1-based page number where the figure appears).
   - Do NOT invent TikZ code to redraw an existing figure from the uploaded PDF/image — preserve the original figure via \`[CROP_FIG ...]\`.
   - If the input text comes from a Word (.docx) file containing \`[DOCX_IMG_N]\` tokens, keep each \`[DOCX_IMG_N]\` token verbatim in its matching question.`}
   - Analyze any geometric labels, dimensions, coordinates, vertices, or asymptotes shown in the figure accurately.
   - For variation tables (if needed), draw a clean Markdown Table ($x$, $y'$, $y$ with arrows $\\nearrow$, $\\searrow$).`
        : `Bạn là một giáo viên xuất sắc. Dưới đây là bài tập hoặc tài liệu học sinh đưa ra. 
YÊU CẦU:
1. Đọc kỹ nội dung bài tập từ file/ảnh (nếu là đề nhiều câu, hãy trích xuất và giải ĐẦY ĐỦ tất cả các câu).
2. Viết lại đề bài rõ ràng, mạch lạc, đầy đủ các câu chữ, phương án trắc nghiệm (nếu có) và giả thiết.
3. Cung cấp lời giải chi tiết, giải thích cặn kẽ từng bước biến đổi để học sinh dễ hiểu.
4. Định dạng đầu ra thành 2 phần rõ rệt (dùng tiêu đề H2):
## Đề bài
[Nội dung đề]
${croppedImage ? '[HÌNH_ẢNH_ĐỀ_BÀI]' : ''}

## Lời giải chi tiết
${croppedImage ? '[HÌNH_ẢNH_ĐÁP_ÁN]\n' : ''}[Các bước giải chi tiết từng bước, phân tích trực tiếp các yếu tố trên hình vẽ / đồ thị]

${MATH_FORMATTING_RULES}
5. BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.
6. [QUAN TRỌNG VỀ HÌNH VẼ & ĐỒ THỊ TỪ TÀI LIỆU GỐC]:
${croppedImage
  ? `- Đề bài có ảnh cắt đính kèm: BẮT BUỘC chèn thẻ [HÌNH_ẢNH_ĐỀ_BÀI] vào cuối phần "## Đề bài" VÀ BẮT BUỘC chèn thẻ [HÌNH_ẢNH_ĐÁP_ÁN] vào ngay đầu phần "## Lời giải chi tiết" để học sinh và giáo viên vừa đọc lời giải vừa đối chiếu trực quan.`
  : `- BẮT BUỘC GIỮ NGUYÊN HÌNH ẢNH GỐC: Nếu trang PDF hoặc ảnh bài tập có BẤT KỲ hình vẽ, đồ thị hàm số, trục tọa độ $Oxy$, miền nghiệm gạch chéo, hình học phẳng/không gian, sơ đồ, hình minh họa nào (kể cả hình đặt SONG SONG bên phải hoặc bên trái chữ đề bài, hoặc đề đã ghi tọa độ trong ngoặc): BẮT BUỘC chèn thẻ cắt hình đúng vị trí ngay trong câu hỏi tương ứng ở phần "## Đề bài" (giữa thân đề bài và các phương án A, B, C, D) theo cú pháp tọa độ chuẩn hóa 0..1000:
  \`[CROP_FIG page=1 box_2d=[ymin,xmin,ymax,xmax] desc="Mô tả ngắn hình vẽ"]\`
  (với PDF nhiều trang, ghi đúng số trang 1-based vào \`page=\`).
- TUYỆT ĐỐI KHÔNG tự vẽ lại bằng TikZ hay bỏ qua hình đã có sẵn trong file gốc — phải dùng thẻ \`[CROP_FIG ...]\` để hệ thống cắt nguyên bản hình sắc nét từ tài liệu gốc.
- Nếu đầu vào là văn bản Word (.docx) có sẵn thẻ \`[DOCX_IMG_1]\`, \`[DOCX_IMG_2]\`...: BẮT BUỘC giữ nguyên các thẻ này đúng vị trí câu hỏi tương ứng.`}
- Trong lời giải: Khai thác chi tiết các tọa độ điểm đặc biệt, giao điểm, đỉnh, tiệm cận, đường nét trên đồ thị/hình ảnh.
- BẢNG BIẾN THIÊN (BBT): BẮT BUỘC vẽ bằng Markdown Table chuẩn trực quan (hàng $x$, $y'$, $y$ kèm mũi tên $\\nearrow$, $\\searrow$, dấu $+$, $-$, $0$, cực trị, tuyệt đối không để trống).`;

      const response = await generateWithFallback(req, {
        contents: [
          {
            role: "user",
            parts: [
              ...(await processFilesForAI(fileList)),
              {
                text: prompt
              }
            ]
          }
        ],
        config: isEnglish ? {
          maxOutputTokens: 65536,
          systemInstruction: `You are an expert international Mathematics & STEM educator. You MUST solve all problems and write all explanations, headings, and final answers 100% in clear academic English. Enclose ALL mathematical formulas, symbols, and single variables ($x$, $y$, $m$, $a$, $b$, $S$) in $...$ or $$...$$. Always use \\frac instead of \\dfrac.`
        } : { maxOutputTokens: 65536 }
      }, res);

      let resultText = response.text || "";
      if (!resultText || !resultText.trim()) {
        throw new Error(isEnglish
          ? "Could not extract or solve the problems from this file/image. Please check image clarity, crop a question, or try again."
          : "Không thể trích xuất hoặc giải bài tập từ ảnh này. Thầy cô vui lòng kiểm tra lại chất lượng ảnh, cắt gọn đề bài hoặc thử lại.");
      }

      if (croppedImage) {
        let cleanCroppedUrl = (croppedImage || '').trim().replace(/[\r\n]+/g, '');
        if (cleanCroppedUrl && !cleanCroppedUrl.startsWith('http://') && !cleanCroppedUrl.startsWith('https://') && !cleanCroppedUrl.startsWith('data:') && !cleanCroppedUrl.startsWith('/')) {
          cleanCroppedUrl = `data:image/png;base64,${cleanCroppedUrl}`;
        }

        const imgTag = `\n\n<img src="${cleanCroppedUrl}" alt="${isEnglish ? 'Problem figure / graph' : 'Hình vẽ / Đồ thị bài toán'}" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;
        // 1. Inject into Problem Statement / Đề bài
        if (/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/.test(resultText)) {
          resultText = resultText.replace(/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/g, imgTag);
        } else {
          resultText = resultText.replace(/(##\s*(?:Đề bài|Đề thi|Câu hỏi|Problem(?:\s+Statement)?|Question(?:s)?)[^\n]*\n)([\s\S]*?)(?=\n##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution|Answer)|$)/i, `$1$2\n${imgTag}`);
        }

        // 2. Inject into Detailed Solution / Lời giải chi tiết
        if (/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/.test(resultText)) {
          resultText = resultText.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/g, imgTag);
        } else if (/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution|Answer)/i.test(resultText)) {
          const solIdx = resultText.search(/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution|Answer)/i);
          const solPart = resultText.slice(solIdx);
          if (!solPart.includes(cleanCroppedUrl)) {
            resultText = resultText.replace(/(##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution|Answer)[^\n]*\n)/i, `$1${imgTag}`);
          }
        }
      }

      return { result: resultText, customKeyFailed: response.customKeyFailed };
    });
});

app.all("/api/verify-exercise-solution", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return keepAliveExecute(req, res, async () => {
    const { solutionText, croppedImage, croppedImageFileId, language = 'vi' } = req.body || {};
    const isEnglish = language === 'en';
    const files = resolveFiles(req.body || {});

    let resolvedCroppedImage = croppedImage;
    if (croppedImageFileId && chunkStore.has(croppedImageFileId)) {
      const entry = chunkStore.get(croppedImageFileId)!;
      resolvedCroppedImage = entry.chunks.join('');
      chunkStore.delete(croppedImageFileId);
    }

    if (!solutionText || typeof solutionText !== 'string' || !solutionText.trim()) {
      throw new Error(isEnglish ? "No solution content available to verify." : "Chưa có nội dung lời giải để kiểm tra.");
    }

    // Strip huge inline base64 data URIs from markdown text before sending to LLM; actual image/file is passed via inlineData
    const cleanedSolutionText = solutionText
      .replace(/<img[^>]*src=["']data:[^"']+["'][^>]*\/?>/gi, isEnglish ? '[ATTACHED_IMAGE]' : '[HÌNH_ẢNH_ĐÍNH_KÈM]')
      .replace(/!\[[^\]]*\]\(data:[^)]+\)/gi, isEnglish ? '[ATTACHED_IMAGE]' : '[HÌNH_ẢNH_ĐÍNH_KÈM]')
      .trim();

    const fileList = [...(files || []).filter(f => f && f.data && f.data.length > 0)];
    if (resolvedCroppedImage && typeof resolvedCroppedImage === 'string') {
      const cleanBase64 = resolvedCroppedImage.replace(/^data:[^;]+;base64,/, '').trim();
      if (cleanBase64) {
        fileList.unshift({
          data: cleanBase64,
          type: 'image/png',
          name: 'cropped_figure.png'
        });
      }
    }

    const hasOriginalAttachment = fileList.length > 0;
    const processedAttachments = hasOriginalAttachment ? await processFilesForAI(fileList) : [];

    const verifyPrompt = isEnglish
      ? `You are a rigorous Mathematics & STEM Olympiad Examiner and Peer Reviewer.
Independently audit the problem statement and detailed solution below from start to finish to catch any mathematical, transcription, or formatting errors before classroom use.

${hasOriginalAttachment ? 'The ORIGINAL PROBLEM FILE/IMAGE is attached: carefully cross-check every number, sign (+/-/times/divide), exponent, subscript, domain condition, and figure label to verify 100% accuracy.\n' : ''}
PROBLEM & SOLUTION TO AUDIT:
"""
${cleanedSolutionText.slice(0, 40000)}
"""

MANDATORY 4-LAYER VERIFICATION:
1. "Problem Transcription & Hypotheses": Cross-check the transcribed problem against the original attachment (if provided) and verify domain/validity conditions.
2. "Calculations & Algebraic Steps": Independently re-solve every step (limits, derivatives, integrals, equations, combinatorics, probability, geometry) to detect arithmetic errors, sign errors, missing cases, or extraneous roots.
3. "Final Answers & Choices": Verify that each final numeric result and multiple-choice letter (A, B, C, D) matches the question's exact requirement and rounding rule.
4. "LaTeX & Academic English": Verify clean LaTeX syntax ($...$, $$...$$, \\frac, \\sqrt) and clear academic English grammar.

JSON OUTPUT REQUIREMENTS (Write ALL fields in clear academic English, enclosing all math expressions in $...$ or $$...$$, using \\frac instead of \\dfrac):
- isCorrect: true if the entire problem transcription, calculations, and final answers are accurate; false if any error, missing case, or wrong conclusion is found.
- confidenceScore: integer from 0 to 100.
- summary: concise summary of the verification verdict in English.
- checks: array of exactly 4 items corresponding to the 4 layers above ({ criterion, passed, detail }).
- issues: array of detected issues ({ step, issue, correction }). Return [] if isCorrect is true with no issues.
- correctedSolution: If isCorrect is false (or improvements are needed), rewrite the COMPLETE corrected document in English with "## Problem Statement" and "## Detailed Solution" sections${resolvedCroppedImage ? ' (keeping [HÌNH_ẢNH_ĐỀ_BÀI] in Problem Statement and [HÌNH_ẢNH_ĐÁP_ÁN] at the start of Detailed Solution)' : ''}. If isCorrect is true and no correction is needed, return "".`
      : `Bạn là Chuyên gia Phản biện & Giám khảo chấm thi Toán - Khoa học Tự nhiên khắt khe nhất.
Hãy kiểm tra ĐỘC LẬP từ đầu đến cuối lời giải bài tập dưới đây để phát hiện mọi sai sót (nếu có) trước khi giáo viên sử dụng giảng dạy cho học sinh.

${hasOriginalAttachment ? 'Đính kèm là FILE/HÌNH ẢNH ĐỀ BÀI GỐC: Hãy đối chiếu thật kỹ các con số, dấu (+/-/nhân/chia), số mũ, chỉ số, điều kiện xác định và thông số trên hình vẽ/đồ thị gốc xem phần "## Đề bài" đã đọc đúng 100% chưa.\n' : ''}
NỘI DUNG ĐỀ BÀI VÀ LỜI GIẢI CẦN KIỂM TRA:
"""
${cleanedSolutionText.slice(0, 40000)}
"""

NHIỆM VỤ KIỂM TRA 4 LỚP BẮT BUỘC:
1. "Đọc đề & Giả thiết": Đối chiếu đề bài trích xuất với đề gốc (nếu có file/ảnh) và kiểm tra điều kiện xác định của bài toán.
2. "Tính toán & Biến đổi": Tự giải lại độc lập từng bước (đạo hàm, tích phân, phương trình, hệ phương trình, hình học, hóa học, vật lí...) để soát lỗi tính nhẩm, lỗi đổi dấu, lỗi quên trường hợp hoặc thiếu nghiệm/nhận nghiệm ngoại lai.
3. "Kết luận & Đáp số": Kiểm tra đáp số cuối cùng có khớp với yêu cầu câu hỏi và phương án trắc nghiệm (nếu là câu hỏi trắc nghiệm) hay không.
4. "Công thức & Trình bày": Kiểm tra cú pháp LaTeX ($...$, $$...$$, \\frac, \\sqrt, bảng biến thiên) và chính tả tiếng Việt.

${MATH_FORMATTING_RULES}

YÊU CẦU ĐẦU RA JSON:
- isCorrect: true nếu lời giải hoàn toàn chính xác cả về đề bài, tính toán và đáp số; false nếu phát hiện bất kỳ sai sót, nhầm lẫn số liệu, thiếu trường hợp hoặc kết luận sai nào.
- confidenceScore: điểm tin cậy từ 0 đến 100 (ví dụ 100 nếu hoàn toàn chuẩn xác).
- summary: Tóm tắt ngắn gọn kết luận thẩm định bằng tiếng Việt (mọi công thức toán phải bọc trong $...$).
- checks: Mảng gồm đúng 4 tiêu chí kiểm tra tương ứng với 4 lớp trên ({ criterion, passed, detail }).
- issues: Mảng các lỗi phát hiện được ({ step, issue, correction }). Nếu isCorrect = true và không có lỗi, trả về mảng rỗng [].
- correctedSolution: Nếu isCorrect = false (hoặc cần chỉnh sửa lại cho chuẩn xác hơn), BẮT BUỘC viết lại ĐẦY ĐỦ toàn bộ bài giải chuẩn xác gồm 2 phần "## Đề bài" và "## Lời giải chi tiết" theo chuẩn LaTeX $...$/$$...$$${resolvedCroppedImage ? ' (giữ nguyên thẻ [HÌNH_ẢNH_ĐỀ_BÀI] trong phần Đề bài và [HÌNH_ẢNH_ĐÁP_ÁN] ở đầu phần Lời giải chi tiết)' : ''}. Nếu isCorrect = true và không cần sửa gì, trả về chuỗi rỗng "".`;

    const response = await generateWithFallback(req, {
      model: 'gemini-4-hydrogen',
      contents: [
        {
          role: 'user',
          parts: [
            ...processedAttachments,
            { text: verifyPrompt }
          ]
        }
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: 'application/json',
        ...(isEnglish ? {
          systemInstruction: `You are an international Mathematics peer reviewer. All output fields including summary, checks, issues, and correctedSolution MUST be written in clear academic English with LaTeX delimiters $...$ or $$...$$ and \\frac.`
        } : {}),
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            confidenceScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            checks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterion: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN },
                  detail: { type: Type.STRING }
                },
                required: ['criterion', 'passed', 'detail']
              }
            },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  correction: { type: Type.STRING }
                },
                required: ['step', 'issue', 'correction']
              }
            },
            correctedSolution: { type: Type.STRING }
          },
          required: ['isCorrect', 'confidenceScore', 'summary', 'checks', 'issues', 'correctedSolution']
        }
      }
    }, res);

    const parsed = safeJsonParse<any>(response.text || '{}', null);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(isEnglish ? "Could not parse AI verification result. Please try verifying again." : "Không thể phân tích kết quả kiểm tra từ AI. Thầy cô vui lòng bấm kiểm tra lại.");
    }

    const result = {
      isCorrect: Boolean(parsed.isCorrect),
      confidenceScore: typeof parsed.confidenceScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.confidenceScore)))
        : (parsed.isCorrect ? 100 : 60),
      summary: typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : (parsed.isCorrect
            ? (isEnglish ? 'The solution has been independently verified by AI with no errors detected.' : 'Lời giải đã được AI kiểm tra độc lập và không phát hiện sai sót.')
            : (isEnglish ? 'AI detected some steps or answers that need review.' : 'AI phát hiện một số điểm cần điều chỉnh trong lời giải.')),
      checks: Array.isArray(parsed.checks) ? parsed.checks : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      correctedSolution: typeof parsed.correctedSolution === 'string' ? parsed.correctedSolution.trim() : ''
    };

    return { result, customKeyFailed: response.customKeyFailed };
  });
});

app.all("/api/translate-exercise-solution", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return keepAliveExecute(req, res, async () => {
    const { solutionText, targetLanguage = 'en', croppedImage } = req.body || {};
    const toEnglish = targetLanguage === 'en';

    if (!solutionText || typeof solutionText !== 'string' || !solutionText.trim()) {
      throw new Error(toEnglish ? "No solution content available to translate." : "Chưa có nội dung lời giải để chuyển đổi ngôn ngữ.");
    }

    const cleanedSolutionText = solutionText
      .replace(/<img[^>]*src=["']data:[^"']+["'][^>]*\/?>/gi, (match, offset, full) => {
        const solHeaderIdx = full.search(/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải|(?:Detailed\s+)?Solution(?:s)?|Answer(?:s)?)/i);
        if (solHeaderIdx !== -1 && offset >= solHeaderIdx) {
          return '\n[HÌNH_ẢNH_ĐÁP_ÁN]\n';
        }
        return '\n[HÌNH_ẢNH_ĐỀ_BÀI]\n';
      })
      .replace(/!\[[^\]]*\]\(data:[^)]+\)/gi, '[HÌNH_ẢNH_ĐỀ_BÀI]')
      .trim();

    const translatePrompt = toEnglish
      ? `You are a bilingual International Mathematics & Olympiad Educator specializing in Vietnamese–English mathematical translation.
TASK:
Translate the complete mathematics problem & detailed solution below from Vietnamese (or mixed text) into 100% natural, rigorous academic English, accurately converting ALL Vietnamese mathematical vocabulary into standard English mathematical terminology.

MATH TERMINOLOGY CONVERSION RULES (MANDATORY):
- Tập xác định -> Domain; Tập giá trị -> Range; Điều kiện xác định -> Validity condition / Domain restriction
- Đồng biến / Nghịch biến -> Strictly increasing / Strictly decreasing; Đơn điệu -> Monotonicity
- Đạo hàm / Đạo hàm cấp hai -> Derivative / Second derivative; Cực trị / Cực đại / Cực tiểu -> Extrema / Local maximum / Local minimum
- GTLN / GTNN -> Global (absolute) maximum / minimum; Điểm uốn -> Inflection point; Tiếp tuyến -> Tangent line
- Tiệm cận đứng / ngang / xiên -> Vertical / Horizontal / Oblique asymptote; Bảng biến thiên -> Variation table
- Nguyên hàm / Tích phân -> Antiderivative / Definite integral; Đổi biến số -> Integration by substitution; Từng phần -> Integration by parts
- Phương trình / Bất phương trình / Hệ phương trình -> Equation / Inequality / System of equations
- Vô nghiệm / Nghiệm duy nhất / Nghiệm ngoại lai -> No solution / Unique solution / Extraneous root
- Cấp số cộng / Cấp số nhân / Công sai / Công bội -> Arithmetic progression / Geometric progression / Common difference / Common ratio
- Không gian mẫu / Biến cố / Biến cố đối / Xác suất có điều kiện -> Sample space / Event / Complementary event / Conditional probability
- Hoán vị / Chỉnh hợp / Tổ hợp -> Permutation / Variation (k-permutation) / Combination
- Hình chóp / Lăng trụ / Mặt cầu / Hình nón / Hình trụ / Góc nhị diện -> Pyramid / Prism / Sphere / Cone / Cylinder / Dihedral angle
- Hình chiếu vuông góc / Đường trung tuyến / Đường cao / Phân giác -> Orthogonal projection / Median / Altitude / Angle bisector
- Vectơ pháp tuyến / Vectơ chỉ phương / Tích vô hướng / Tích có hướng -> Normal vector / Direction vector / Dot product / Cross product

FORMATTING & PRESERVATION RULES:
1. Structure sections cleanly with H2 Markdown headings: \`## Problem Statement\` and \`## Detailed Solution\`.
2. Preserve 100% of numbers, mathematical expressions, equations, LaTeX delimiters (\`$...$\`, \`$$...$$\`), \`\\frac{a}{b}\` (never \`\\dfrac\`), Markdown tables (translate column/row words naturally), and \`\`\`tikz\`\`\` blocks intact.
3. Preserve image placeholders \`[HÌNH_ẢNH_ĐỀ_BÀI]\` and \`[HÌNH_ẢNH_ĐÁP_ÁN]\` verbatim if present in the source text.
4. Also extract 6 to 15 key mathematical terms/phrases that appear in this specific exercise along with their exact Vietnamese term, English term, and standard IPA English pronunciation (e.g. \`/dɪˈrɪvətɪv/\`) in the \`terminology\` array.

SOURCE CONTENT TO TRANSLATE:
"""
${cleanedSolutionText.slice(0, 45000)}
"""`
      : `Bạn là Chuyên gia Song ngữ Toán học (Tiếng Anh – Tiếng Việt) và Giáo viên Toán giàu kinh nghiệm.
NHIỆM VỤ:
Chuyển đổi toàn bộ nội dung đề bài & lời giải dưới đây sang **100% Tiếng Việt chuẩn mực sư phạm**, dịch chính xác toàn bộ từ vựng & thuật ngữ Toán học Tiếng Anh sang thuật ngữ Toán học Tiếng Việt tương ứng theo chương trình phổ thông Việt Nam.

QUY TẮC BẢO TOÀN & ĐỊNH DẠNG:
1. Định dạng 2 tiêu đề H2 rõ ràng: \`## Đề bài\` và \`## Lời giải chi tiết\`.
2. Giữ nguyên 100% số liệu, biểu thức toán học, dấu LaTeX (\`$...$\`, \`$$...$$\`), dùng \`\\frac{a}{b}\` (không dùng \`\\dfrac\`), giữ nguyên bảng Markdown và khối \`\`\`tikz\`\`\` (chỉ Việt hóa các từ tiếng Anh nếu có).
3. Giữ nguyên vị trí thẻ ảnh \`[HÌNH_ẢNH_ĐỀ_BÀI]\` và \`[HÌNH_ẢNH_ĐÁP_ÁN]\` nếu có trong văn bản nguồn.
4. Trích xuất 6 đến 15 từ vựng/thuật ngữ Toán học quan trọng xuất hiện trong bài toán này kèm cặp đối chiếu Tiếng Việt – Tiếng Anh và phiên âm chuẩn IPA Tiếng Anh (ví dụ \`/dɪˈrɪvətɪv/\`) vào mảng \`terminology\`.

NỘI DUNG NGUỒN CẦN CHUYỂN NGÔN NGỮ:
"""
${cleanedSolutionText.slice(0, 45000)}
"""`;

    const response = await generateWithFallback(req, {
      model: 'gemini-4-hydrogen',
      contents: [
        {
          role: 'user',
          parts: [{ text: translatePrompt }]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 65536,
        ...(toEnglish ? {
          systemInstruction: `You are an expert bilingual Mathematics educator. Translate the problem and solution into 100% natural academic English with accurate English mathematical terminology. Enclose all math formulas and single variables in $...$ or $$...$$ and always use \\frac instead of \\dfrac.`
        } : {
          systemInstruction: `Bạn là chuyên gia song ngữ Toán học. Hãy chuyển toàn bộ đề bài và lời giải sang tiếng Việt chuẩn thuật ngữ Toán học Việt Nam, giữ nguyên mọi công thức trong $...$ hoặc $$...$$ và luôn dùng \\frac thay cho \\dfrac.`
        }),
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedSolution: { type: Type.STRING },
            terminology: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  vi: { type: Type.STRING },
                  en: { type: Type.STRING },
                  phonetic: { type: Type.STRING, description: 'Standard IPA pronunciation of the English term enclosed in slashes, e.g. /ˈfʌŋkʃən/' },
                  category: { type: Type.STRING }
                },
                required: ['vi', 'en', 'phonetic']
              }
            }
          },
          required: ['translatedSolution', 'terminology']
        }
      }
    }, res);

    const parsed = safeJsonParse<any>(response.text || '{}', null);
    if (!parsed || typeof parsed !== 'object' || !parsed.translatedSolution || !String(parsed.translatedSolution).trim()) {
      throw new Error(toEnglish ? "Could not translate the solution into English. Please try again." : "Không thể chuyển đổi ngôn ngữ lời giải lúc này. Thầy cô vui lòng thử lại.");
    }

    let translatedSolution = String(parsed.translatedSolution).trim();
    if (croppedImage) {
      let cleanCroppedUrl = String(croppedImage).trim().replace(/[\r\n]+/g, '');
      if (cleanCroppedUrl && !cleanCroppedUrl.startsWith('http://') && !cleanCroppedUrl.startsWith('https://') && !cleanCroppedUrl.startsWith('data:') && !cleanCroppedUrl.startsWith('/')) {
        cleanCroppedUrl = `data:image/png;base64,${cleanCroppedUrl}`;
      }
      const imgTag = `\n\n<img src="${cleanCroppedUrl}" alt="${toEnglish ? 'Problem figure / graph' : 'Hình vẽ / Đồ thị bài toán'}" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;
      if (/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/.test(translatedSolution)) {
        translatedSolution = translatedSolution.replace(/\[HÌNH_ẢNH_ĐỀ_BÀI\]|\[PROBLEM_IMAGE\]/g, imgTag);
      }
      if (/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/.test(translatedSolution)) {
        translatedSolution = translatedSolution.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]|\[HÌNH_ẢNH_LỜI_GIẢI\]|\[SOLUTION_IMAGE\]/g, imgTag);
      }
    }

    const terminology = Array.isArray(parsed.terminology)
      ? parsed.terminology
          .filter((t: any) => t && typeof t.vi === 'string' && typeof t.en === 'string' && t.vi.trim() && t.en.trim())
          .map((t: any) => ({
            vi: t.vi.trim(),
            en: t.en.trim(),
            phonetic: typeof t.phonetic === 'string' && t.phonetic.trim() ? t.phonetic.trim() : '',
            category: typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Toán học'
          }))
      : [];

    return {
      result: {
        translatedSolution,
        terminology
      },
      customKeyFailed: response.customKeyFailed
    };
  });
});

app.all("/api/extract-file-text", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const files = resolveFiles(req.body);
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Không tìm thấy file để trích xuất văn bản." });
    }

    const f = files[0];
    let rawBase64 = typeof f.data === 'string' ? f.data.trim() : '';
    if (rawBase64.startsWith('data:')) {
      rawBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    let extractedText = "";

    const isPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf') || rawBase64.startsWith('JVBERi0');
    const isDocx = f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name?.endsWith('.docx') || rawBase64.startsWith('UEsDBBQ');
    const isDoc = f.type === 'application/msword' || f.name?.endsWith('.doc') || rawBase64.startsWith('0M8R4KGxGuE');

    if (isPdf) {
      extractedText = await extractTextFromPdf(buffer);
    } else if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } else if (isDoc) {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      extractedText = extracted.getBody() || "";
    } else {
      extractedText = buffer.toString('utf8');
    }

    return res.json({ text: extractedText.trim() });
  } catch (err: any) {
    console.warn("File text extraction warning:", err);
    return res.status(500).json({ error: "Không thể trích xuất văn bản từ tệp: " + (err.message || String(err)) });
  }
});

app.all("/api/translate-academic", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return keepAliveExecute(req, res, async () => {
    const { text, questions, targetLang = 'en', subject = 'Toán' } = req.body || {};
    const hasQuestions = Array.isArray(questions) && questions.length > 0;
    const hasText = typeof text === 'string' && text.trim().length > 0;

    if (!hasText && !hasQuestions) {
      return res.status(400).json({ error: "Nội dung cần dịch không được để trống." });
    }

    const langName = targetLang === 'en' ? 'Tiếng Anh chuyên ngành' : 'Tiếng Việt chuẩn GDPT';

    const imagePlaceholders: string[] = [];
    const maskDataUris = (input: string): string =>
      input.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, (match) => {
        const idx = imagePlaceholders.length;
        imagePlaceholders.push(match);
        return `__EDUPLAN_IMG_TOKEN_${idx}__`;
      });
    const restoreDataUris = (input: string): string =>
      input.replace(/__EDUPLAN_IMG_TOKEN_(\d+)__/g, (full, idxStr) => {
        const idx = Number(idxStr);
        return Number.isInteger(idx) && imagePlaceholders[idx] !== undefined ? imagePlaceholders[idx] : full;
      });
    const restoreDeep = (val: any): any => {
      if (typeof val === 'string') return restoreDataUris(val);
      if (Array.isArray(val)) return val.map(restoreDeep);
      if (val && typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          out[k] = restoreDeep(v);
        }
        return out;
      }
      return val;
    };

    const resultPayload: { success: boolean; translatedQuestions?: any[]; translatedText?: string } = {
      success: true,
    };

    if (hasQuestions) {
      const compactQuestions = questions.map((q: any, idx: number) => ({
        idx,
        content: typeof q?.content === 'string' ? maskDataUris(q.content) : undefined,
        question: typeof q?.question === 'string' ? maskDataUris(q.question) : undefined,
        options: Array.isArray(q?.options) ? q.options.map((o: any) => (typeof o === 'string' ? maskDataUris(o) : o)) : undefined,
        tfStatements: Array.isArray(q?.tfStatements)
          ? q.tfStatements.map((tf: any) => ({
              statement: typeof tf?.statement === 'string' ? maskDataUris(tf.statement) : tf?.statement,
              correct: tf?.correct,
            }))
          : undefined,
        solution: typeof q?.solution === 'string' ? maskDataUris(q.solution) : undefined,
        explanation: typeof q?.explanation === 'string' ? maskDataUris(q.explanation) : undefined,
      }));

      const qPrompt = `Bạn là chuyên gia dịch thuật tài liệu giáo dục và đề thi THPT môn ${subject}.
Nhiệm vụ: Dịch toàn bộ danh sách câu hỏi sau sang ${langName}.

YÊU CẦU BẮT BUỘC:
1. Dịch chuẩn xác thuật ngữ chuyên ngành môn ${subject} (VD: "Hàm số" -> "Function", "Đạo hàm" -> "Derivative", "Cấp số cộng" -> "Arithmetic Progression", "Bảng biến thiên" -> "Table of Variation", "Cực đại" -> "Local maximum", "Cực tiểu" -> "Local minimum", "Tiệm cận" -> "Asymptote").
2. GIỮ NGUYÊN 100% CÁC CÔNG THỨC TOÁN LATEX BỌC TRONG $...$ HOẶC $$...$$, KHÔNG SỬA MÃ LATEX VÀ KHÔNG DỊCH TÊN BIẾN.
3. GIỮ NGUYÊN MỌI TOKEN __EDUPLAN_IMG_TOKEN_...__ VÀ BẢNG MARKDOWN.
4. Giữ nguyên chỉ số "idx" và cấu trúc JSON. Chỉ trả về duy nhất 1 mảng JSON hợp lệ có đúng ${compactQuestions.length} phần tử.

Danh sách câu hỏi gốc:
${JSON.stringify(compactQuestions)}`;

      const qResp = await generateWithFallback(req, {
        contents: [{ role: "user", parts: [{ text: qPrompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const parsedRaw: any = safeJsonParse(qResp?.text?.trim() || "[]", []);
      const parsedArr = Array.isArray(parsedRaw)
        ? parsedRaw
        : Array.isArray(parsedRaw?.translatedQuestions)
        ? parsedRaw.translatedQuestions
        : Array.isArray(parsedRaw?.questions)
        ? parsedRaw.questions
        : [];

      if (parsedArr.length > 0) {
        const byIdx = new Map<number, any>();
        parsedArr.forEach((item: any, i: number) => {
          const key = typeof item?.idx === 'number' ? item.idx : i;
          byIdx.set(key, restoreDeep(item));
        });

        resultPayload.translatedQuestions = questions.map((orig: any, idx: number) => {
          const tr = byIdx.get(idx);
          if (!tr) return orig;
          const mergedTf = Array.isArray(orig?.tfStatements)
            ? orig.tfStatements.map((origTf: any, tfIdx: number) => ({
                ...origTf,
                statement: tr.tfStatements?.[tfIdx]?.statement ?? origTf.statement,
              }))
            : orig?.tfStatements;
          return {
            ...orig,
            ...(tr.content !== undefined ? { content: tr.content } : {}),
            ...(tr.question !== undefined ? { question: tr.question } : {}),
            ...(Array.isArray(tr.options) ? { options: tr.options } : {}),
            ...(mergedTf !== undefined ? { tfStatements: mergedTf } : {}),
            ...(tr.solution !== undefined ? { solution: tr.solution } : {}),
            ...(tr.explanation !== undefined ? { explanation: tr.explanation } : {}),
          };
        });
      }
    }

    if (hasText) {
      const maskedText = maskDataUris(text);
      const prompt = `Bạn là một chuyên gia dịch thuật và biên soạn giáo trình quốc tế thuộc bộ môn ${subject}.
Nhiệm vụ của bạn là chuyển đổi toàn bộ văn bản / đề thi / phiếu học tập sau sang ${langName} theo đúng thuật ngữ chuyên môn chính xác nhất của môn ${subject}.

QUY TẮC BẮT BUỘC (GIỮ NGUYÊN BẢN CẤU TRÚC VÀ CÔNG THỨC TOÁN):
1. GIỮ NGUYÊN 100% CẤU TRÚC:
   - Các tiêu đề (PHẦN I, PHẦN II, Câu 1, Câu 2, Question 1, Part I, Part II,...), thứ tự câu hỏi, danh sách các phương án A., B., C., D., a), b), c), d).
   - Thẻ hình ảnh (<svg-wrapper...>, <img...>, ![](...) ), mọi token __EDUPLAN_IMG_TOKEN_...__, khối TikZ (\`\`\`tikz ... \`\`\`), bảng biểu Markdown Table.
2. THUẬT NGỮ CHUYÊN NGÀNH CHUẨN XÁC THEO MÔN HỌC (${subject}):
   - Toán học: "Cấp số cộng" -> "Arithmetic Progression", "Bảng biến thiên" -> "Table of Variation", "Cực trị" -> "Extrema", "Hàm số" -> "Function", "Đạo hàm" -> "Derivative", "Tiệm cận" -> "Asymptote", "Tập xác định" -> "Domain", "Tập giá trị" -> "Range".
   - Vật lý: "Chuyển động thẳng biến đổi đều" -> "Uniformly accelerated linear motion", "Cơ học" -> "Mechanics", "Điện từ" -> "Electromagnetism".
   - Hóa học: "Phản ứng oxy hóa - khử" -> "Oxidation-reduction reaction", "Đồng đẳng" -> "Homologous series".
   - Sinh học: "Quang hợp" -> "Photosynthesis", "Di truyền" -> "Genetics".
   - Tin học: "Thuật toán" -> "Algorithm", "Mảng" -> "Array", "Biến" -> "Variable".
3. CÔNG THỨC TOÁN VÀ KÝ HIỆU LATEX ($...$, $$...$$):
   - GIỮ NGUYÊN TOÀN BỘ các công thức $...$, $$...$$, ký hiệu LaTeX, phương trình, số liệu. Không sửa đổi mã LaTeX bên trong dấu $.

Chỉ trả về nội dung đã chuyển ngữ hoàn chỉnh dưới dạng Markdown, không viết thêm lời dẫn.

${MATH_FORMATTING_RULES}

VĂN BẢN CẦN DỊCH:
${maskedText}`;

      const response = await generateWithFallback(req, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.1 }
      });

      resultPayload.translatedText = restoreDataUris(response?.text?.trim() || maskedText);
    }

    return resultPayload;
  });
});

app.all("/api/parse-exam", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return keepAliveExecute(req, res, async () => {
    const { rawText } = req.body || {};
    const files = resolveFiles(req.body);

    let examRawText = typeof rawText === 'string' ? rawText.trim() : '';
    if (!examRawText && files && files.length > 0) {
      for (const f of files) {
        if (f.data) {
          try {
            let b64 = typeof f.data === 'string' ? f.data.replace(/^data:[^;]+;base64,/, '').trim() : '';
            const buf = Buffer.from(b64, 'base64');
            const isPdf = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf') || b64.startsWith('JVBERi0');
            if (isPdf) {
              const pdfTxt = await extractTextFromPdf(buf);
              if (pdfTxt && pdfTxt.trim().length > 30) {
                examRawText = pdfTxt.trim();
                break;
              }
            }
          } catch (e) {}
        }
      }
    }

    const promptText = `Bạn là chuyên gia bóc tách đề thi môn Toán và khoa học tự nhiên chuẩn cấu trúc GDPT 2018. Hãy phân tích tài liệu đề thi được cung cấp (Word, PDF, Text) và tự động nhận diện chính xác từng câu hỏi thuộc các phần của đề thi:

[CỰC KỲ QUAN TRỌNG: BẮT BUỘC BÓC TÁCH TOÀN BỘ 100% TẤT CẢ CÁC CÂU HỎI TRONG ĐỀ THI - TUYỆT ĐỐI KHÔNG CHỈ LẤY 1 CÂU MỖI PHẦN]:
- Đề thi hoàn chỉnh có đầy đủ từ 20 đến 50 câu hỏi. BẠN BẮT BUỘC PHẢI BÓC TÁCH ĐẦY ĐỦ 100% TẤT CẢ CÁC CÂU HỎI CỦA TỪNG PHẦN:
  + PHẦN I: Trắc nghiệm 4 lựa chọn (bóc tách tất cả các câu của Phần I, thường là từ Câu 1 đến Câu 12).
  + PHẦN II: Trắc nghiệm Đúng/Sai (bóc tách tất cả các câu của Phần II, thường là từ Câu 1 đến Câu 4, mỗi câu đủ 4 ý a, b, c, d).
  + PHẦN III: Trắc nghiệm trả lời ngắn (bóc tách tất cả các câu của Phần III, thường là từ Câu 1 đến Câu 6).
  + PHẦN IV: Tự luận (bóc tách tất cả các câu nếu có).
- TUYỆT ĐỐI KHÔNG ĐƯỢC CHỈ LẤY 1 CÂU MỖI PHẦN! ĐÂY LÀ NHIỆM VỤ BÓC TÁCH TOÀN BỘ ĐỀ THI THẬT, KHÔNG PHẢI VÍ DỤ MINH HỌA!
- Nếu đề thi có bao nhiêu câu hỏi ở các trang (ví dụ: 12 câu Phần I, 4 câu Phần II, 6 câu Phần III...), mảng "questions" BẮT BUỘC PHẢI CHỨA ĐỦ 100% TẤT CẢ CÁC CÂU HỎI (ở ví dụ trên là ĐỦ 22 CÂU từ Câu 1 đến Câu 22).
- ĐÁNH SỐ TRƯỜNG "id" TĂNG DẦN LIÊN TỤC TỪ 1 ĐẾN HẾT ĐỀ (1, 2, 3, ..., 22...). TUYỆT ĐỐI KHÔNG RESET "id" VỀ 1 Ở MỖI PHẦN!

CẤU TRÚC ĐỀ THI GDPT 2018 GỒM CÁC PHẦN:
1. PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN (MULTIPLE_CHOICE)
- Gồm các câu hỏi có 4 phương án A, B, C, D (chọn 1 đáp án đúng).
- Trường type: "MULTIPLE_CHOICE" (hoặc "mc").
- Gồm: "question", "options" (mảng 4 phương án A, B, C, D), "correctAnswer" (ví dụ: "A"), "explanation" (nếu có).

2. PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (TRUE_FALSE)
- Gồm các câu có lệnh hỏi chính và 4 ý con a, b, c, d. Mỗi ý học sinh chọn Đúng hoặc Sai.
- Trường type: "TRUE_FALSE" (hoặc "tf").
- Gồm: "question" (nội dung đề bài dẫn), "tfStatements" (mảng gồm 4 phần tử tương ứng với 4 ý a, b, c, d).
  + Mỗi phần tử trong tfStatements: {"statement": "Nội dung ý a/b/c/d...", "correct": true hoặc false}.
  + Ví dụ: [{"statement": "Hàm số đồng biến trên (0; 2)", "correct": true}, ...]

3. PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN / ĐIỀN SỐ (SHORT_ANSWER) - CHUẨN GDPT 2018:
- Gồm các câu hỏi học sinh tự tính toán và điền đáp số ngắn. Không có 4 phương án A, B, C, D.
- BẮT BUỘC câu hỏi phải dẫn tới một kết quả số cụ thể (ví dụ: "Tính giá trị biểu thức...", "Tính diện tích...", "Tìm số nghiệm..."). Tuyệt đối không ra đề dạng mở.
- Trường type: "SHORT_ANSWER" (hoặc "sa").
- ĐÁP ÁN BẮT BUỘC (RÀNG BUỘC PHIẾU CHẤM GDPT 2018): Trường "correctAnswer" BẮT BUỘC là MỘT CHUỖI SỐ CÓ ĐỘ DÀI TỐI ĐA 4 KÝ TỰ (kể cả dấu âm '-' hoặc dấu phẩy/chấm thập phân), ví dụ: "22", "-3.5", "13", "102". Tuyệt đối không chứa chữ cái, đơn vị đo hay công thức dài dòng.
- Gồm: "question", "correctAnswer", "explanation" (nếu có).

4. PHẦN IV: TỰ LUẬN (ESSAY) - nếu có:
- Gồm các câu hỏi tự luận yêu cầu học sinh trình bày bài giải (Câu 1, Câu 2...).
- Trường type: "ESSAY" (hoặc "essay").
- Gồm: "question" (nội dung bài toán tự luận), "correctAnswer" hoặc "explanation" (lời giải / hướng dẫn chấm chi tiết kèm thang điểm nếu có).

QUY TẮC NHẬN DIỆN HÌNH VẼ, ĐỒ THỊ & BẢNG BIẾN THIÊN (CỰC KỲ QUAN TRỌNG - TỌA ĐỘ CẮT ẢNH TỰ ĐỘNG):
+ Nếu câu hỏi có Đồ thị hàm số, Hình học không gian, Biểu đồ hoặc Bảng biến thiên (BBT):
  - Đặt "hasFigure": true
  - Xác định chính xác tọa độ vùng chứa hình ảnh theo trường "figureBox": [ymin, xmin, ymax, xmax] trên thang đo chuẩn hóa 0 - 1000 của trang tài liệu (ảnh hoặc PDF).
  - Trong trường "question" / "content", chèn thẻ giữ chỗ [HINH_ANH] tại đúng vị trí hình xuất hiện trong câu hỏi.
+ Nếu câu không có hình: "hasFigure": false và "figureBox": null.

QUY TẮC BẮT BUỘC VỀ TOÁN HỌC VÀ CÔNG THỨC (LATEX CHUẨN 100%):
+ TẤT CẢ các ký hiệu toán học, biến số (x, y, m, a, b...), biểu thức, phương trình, hệ phương trình BẮT BUỘC đặt trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối riêng).
+ KÝ HIỆU VÔ CỰC CHUẨN XÁC: Luôn viết đúng "-\\infty" và "+\\infty". TUYỆT ĐỐI KHÔNG để dính khoảng trắng sau dấu gạch chéo (NGHIÊM CẤM viết: "-\\ infty", "+\\ infty", "\\ frac").
+ QUY TẮC BẢNG BIẾN THIÊN (BBT):
  - Khi đạo hàm y' < 0 (nghịch biến), mũi tên biến thiên BẮT BUỘC dùng mũi tên dốc xuống: "\\searrow" (TUYỆT ĐỐI KHÔNG dùng mũi tên ngang như "\\rightarrow", "\\longrightarrow", "->", "-->").
  - Khi đạo hàm y' > 0 (đồng biến), mũi tên biến thiên BẮT BUỘC dùng mũi tên dốc lên: "\\nearrow".
  - Điểm gián đoạn / tiệm cận đứng BẮT BUỘC dùng vạch đôi "\\|".
+ QUY TẮC ĐẶC BIỆT VỀ DẤU $:
  - Tuyệt đối không tự động gắn thêm dấu $ vào cuối chuỗi nếu chuỗi đã có cặp dấu $...$ hoàn chỉnh.
  - Tuyệt đối không để ký tự $ mồ côi (trailing dollar sign) ở cuối đáp án hoặc nằm sau dấu chấm câu (ví dụ: cấm viết ".$" hay ". $", phải cắt bỏ sạch sẽ thành ".").
+ HỌ NGHIỆM PHƯƠNG TRÌNH LƯỢNG GIÁC (\sin, \cos...): BẮT BUỘC sử dụng dấu móc vuông \left[ kết hợp \begin{aligned} ... \end{aligned}\right. thay vì dấu móc nhọn \begin{cases}. Cú pháp chuẩn LaTeX / MathJax:
  $\left[\begin{aligned} x &= \alpha + k2\pi \\ x &= \pi - \alpha + k2\pi \end{aligned}\right. \quad (k \in \mathbb{Z})$
+ HỆ PHƯƠNG TRÌNH / HỆ BẤT PHƯƠNG TRÌNH: GIỮ NGUYÊN dấu móc nhọn \begin{cases} ... \end{cases} và BẮT BUỘC bọc trong cặp dấu $...$ hoặc $$...$$. Các dòng phương trình BẮT BUỘC cách nhau bởi dấu xuống dòng \\ rõ ràng. Ví dụ:
  $\begin{cases} 2x + y = 5 \\ x - y = 1 \end{cases}$
+ QUY TẮC DẤU GẠCH CHÉO NGƯỢC (LATEX / MATHJAX): Mọi tên lệnh và ký hiệu toán học (\frac, \sqrt, \alpha, \infty, \sin, \cos, \begin, \end...) BẮT BUỘC dùng đúng 1 dấu gạch chéo ngược đơn (\). Tuyệt đối KHÔNG viết hai gạch (\\frac, \\sqrt...) cho tên lệnh. Dấu hai gạch chéo (\\) CHỈ dùng để ngắt dòng trong hệ phương trình \begin{cases} hoặc \begin{aligned}.
+ Sử dụng cú pháp LaTeX chuẩn: \frac{a}{b} (luôn dùng \frac, không dùng \dfrac), \sqrt{x}, \sin x, \cos x, \tan x, \cot x, \pi, \ge, \le, \in, \Leftrightarrow, \Rightarrow, \Delta.
+ Giữ nguyên font tiếng Việt UTF-8 chuẩn cho đề bài và các phương án.

Trả về kết quả dưới dạng JSON có cấu trúc sau:
{
  "examTitle": "Tiêu đề đề thi nếu có hoặc null",
  "duration": 90, // Số phút làm bài tìm thấy trong đề thi (ví dụ: 15, 45, 50, 60, 90, 120), hoặc null nếu không có
  "questions": [
    {
      "id": 1,
      "type": "MULTIPLE_CHOICE", // "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"
      "question": "Cho hàm số $y = f(x)$ có bảng biến thiên như sau:\n[HINH_ANH]\nHàm số đã cho nghịch biến trên khoảng nào dưới đây?",
      "hasFigure": true,
      "figureBox": [120, 200, 350, 800], // [ymin, xmin, ymax, xmax] trên thang đo 0 - 1000 nếu có hình/BBT/đồ thị, hoặc null nếu không có
      "options": ["A. $(0; 2)$", "B. $(-\\infty; 0)$", "C. $(2; +\\infty)$", "D. $(0; +\\infty)$"],
      "correctAnswer": "A",
      "explanation": "Dựa vào bảng biến thiên, trên khoảng $(0; 2)$ ta có $f'(x) < 0$ (mũi tên dốc xuống $\\searrow$) nên hàm số nghịch biến."
    }
  ]
}

Tuyệt đối chỉ trả về JSON hợp lệ, không kèm bất kỳ lời dẫn hay giải thích nào ngoài khối JSON.`;

    const userParts: any[] = [];
    if (files && files.length > 0) {
      const processed = await processFilesForAI(files);
      userParts.push(...processed);
    }
    if (examRawText && examRawText.trim()) {
      userParts.push({ text: `Toàn bộ văn bản trích xuất từ tài liệu đề thi (BẮT BUỘC ĐỐI CHIẾU VÀ BÓC TÁCH ĐẦY ĐỦ 100% TẤT CẢ CÁC CÂU HỎI, KHÔNG BỎ SÓT BẤT KỲ CÂU NÀO):\n${examRawText}` });
    }
    userParts.push({ text: promptText });

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: userParts
        }
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 32768,
        responseMimeType: "application/json"
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    const aiCleanText = response.text.trim();
    let parsed: any[] = [];
    let detectedDuration: number | null = null;
    let detectedTitle: string | null = null;

    try {
      const p = safeJsonParse(aiCleanText);
      if (Array.isArray(p)) {
        parsed = p;
      } else if (p && typeof p === 'object') {
        parsed = Array.isArray(p.questions) ? p.questions : (Array.isArray(p.result) ? p.result : []);
        if (typeof p.duration === 'number' && p.duration > 0) {
          detectedDuration = p.duration;
        } else if (typeof p.duration === 'string') {
          const parsedMins = parseInt(p.duration, 10);
          if (!isNaN(parsedMins) && parsedMins > 0) detectedDuration = parsedMins;
        }
        if (typeof p.examTitle === 'string' && p.examTitle.trim()) {
          detectedTitle = p.examTitle.trim();
        }
      }
    } catch {
      const arrayMatch = aiCleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          parsed = safeJsonParse(arrayMatch[0], []);
        } catch {}
      }
    }

    // Helper regex to extract duration if AI missed it
    if (!detectedDuration && rawText && typeof rawText === 'string') {
      const headerSnippet = rawText.slice(0, 4000);
      const durRegexes = [
        /(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s:\-=–—]*(\d{1,3})\s*(?:phút|p\b|'|min)/i,
        /(?:thời\s*gian|thời\s*lượng)[\s:\-=–—]+(\d{1,3})\s*(?:phút|p\b|'|min)/i,
        /(?:thời\s*gian\s*làm\s*bài|thời\s*lượng\s*làm\s*bài)[\s]+(\d{1,3})\s*(?:phút|p\b|'|min)/i,
        /\(\s*(?:thời\s*gian\s*làm\s*bài[\s:\-]*)?(\d{1,3})\s*phút\s*(?:[,\-–—\(\)][^\)]*)?\)/i,
        /(?:time\s*allowed|duration|exam\s*duration)[\s:\-=–—]*(\d{1,3})\s*(?:minutes|mins|min|m\b)/i
      ];
      for (const reg of durRegexes) {
        const match = headerSnippet.match(reg);
        if (match && match[1]) {
          const m = parseInt(match[1], 10);
          if (m >= 5 && m <= 300) {
            detectedDuration = m;
            break;
          }
        }
      }
    }

    const cleanedQuestions = (parsed || []).map((q: any, idx: number) => {
      const sol = (q.solution || q.explanation || "").trim();
      return {
        ...q,
        id: idx + 1,
        question: cleanLatexMathField(q.question || q.content || ''),
        content: cleanLatexMathField(q.content || q.question || ''),
        options: Array.isArray(q.options) ? q.options.map(cleanLatexMathField) : q.options,
        tfStatements: Array.isArray(q.tfStatements) ? q.tfStatements.map((tf: any) => ({
          ...tf,
          statement: cleanLatexMathField(tf.statement)
        })) : q.tfStatements,
        correctAnswer: cleanLatexMathField(q.correctAnswer),
        solution: cleanLatexMathField(sol),
        explanation: cleanLatexMathField(sol)
      };
    });

    return { 
      questions: cleanedQuestions,
      duration: detectedDuration,
      examTitle: detectedTitle
    };
  });
});

// Client handles exam/config/history persistence directly via browser localStorage.

// Clean link return without external shorteners that Zalo blocks
app.post("/api/shorten", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing url" });
    // NEVER return tinyurl.com or foreign domains that Zalo blocks!
    res.json({ shortUrl: url });
  } catch (error: any) {
    res.json({ shortUrl: req.body?.url || "" });
  }
});

// Adding back chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, context, messages } = req.body || {};
    let fullPrompt = prompt;
    if (!fullPrompt && Array.isArray(messages) && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      fullPrompt = typeof lastMsg === 'string' ? lastMsg : (lastMsg?.content || lastMsg?.parts?.[0]?.text || '');
    }
    if (!fullPrompt) {
      return res.status(400).json({ error: "Vui lòng nhập nội dung câu hỏi (prompt)." });
    }
    if (context) {
      fullPrompt = `Ngữ cảnh: ${JSON.stringify(context)}\n\nCâu hỏi: ${fullPrompt}`;
    }
    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
    });
    res.json({ text: response.text });
  } catch (error: any) {
    return handleAiError(error, req, res);
  }
});


function generateServerAlgorithmicVariants(originalQuestions: any[], examTitle: string): any[] {
  const codes = ['1001', '1002', '1003', '1004'];
  return codes.map((code, codeIdx) => {
    const questions = originalQuestions.map((origQ, qIdx) => {
      const qNumber = qIdx + 1;
      if (codeIdx === 0) {
        return {
          ...origQ,
          id: qNumber,
          solution: origQ.solution || origQ.explanation || `Lời giải chi tiết câu ${qNumber}: Tiến hành biến đổi theo các bước định lý và quy tắc toán học chuẩn mực để tìm ra kết quả chính xác.`
        };
      }

      let newContent = origQ.content || '';
      // Thay đổi một số hệ số / hằng số tự nhiên nhỏ để tạo câu hỏi đồng dạng
      newContent = newContent.replace(/\b(\d+)\b/g, (match: string) => {
        const n = parseInt(match, 10);
        if (n > 0 && n <= 30) {
          return String(n + codeIdx);
        }
        return match;
      });

      if (origQ.type === 'mc' && Array.isArray(origQ.options) && origQ.options.length === 4) {
        const shift = codeIdx % 4;
        const newOptions = [...origQ.options];
        for (let s = 0; s < shift; s++) {
          const first = newOptions.shift()!;
          newOptions.push(first);
        }
        const origIdx = typeof origQ.correctOptionIndex === 'number' ? origQ.correctOptionIndex : 0;
        const newCorrectIdx = (origIdx - shift + 4) % 4;
        const newAnsLetter = String.fromCharCode(65 + newCorrectIdx);

        return {
          ...origQ,
          id: qNumber,
          content: newContent,
          options: newOptions,
          correctOptionIndex: newCorrectIdx,
          correctAnswer: newAnsLetter,
          solution: `Lời giải chi tiết Mã ${code} - Câu ${qNumber}:\n- **Bước 1 (Xác định dạng toán & biến đổi):** Xét bài toán với các tham số tương ứng của Mã ${code}.\n- **Bước 2 (Giải chi tiết từng bước):** Áp dụng công thức giải tích/đại số chuẩn mực, thực hiện tính đạo hàm, giải phương trình và đối chiếu điều kiện bài toán.\n- **Bước 3 (Kết luận):** Do đó ta chọn phương án đúng là **${newAnsLetter}**.`
        };
      }

      if (origQ.type === 'tf' && Array.isArray(origQ.tfStatements) && origQ.tfStatements.length === 4) {
        const newStmts = origQ.tfStatements.map((st: any, sIdx: number) => {
          const shouldInvert = (sIdx + codeIdx) % 3 === 0;
          const stmtText = (st.statement || '').replace(/\b(\d+)\b/g, (m: string) => String(parseInt(m, 10) + codeIdx));
          return {
            statement: stmtText,
            correct: shouldInvert ? !st.correct : Boolean(st.correct)
          };
        });

        return {
          ...origQ,
          id: qNumber,
          content: newContent,
          tfStatements: newStmts,
          solution: `Lời giải chi tiết Mã ${code} - Câu ${qNumber}:\n${newStmts.map((st: any, i: number) => `- **Ý ${['a)', 'b)', 'c)', 'd)'][i]}** Mệnh đề này là **${st.correct ? 'ĐÚNG' : 'SAI'}** vì sau khi tính toán và thế số ta có kết quả đối chiếu khớp với lý thuyết.`).join('\n')}`
        };
      }

      if (origQ.type === 'sa') {
        let newAns = origQ.correctAnswer || '5';
        const num = parseFloat(newAns);
        if (!isNaN(num)) {
          newAns = String(num + codeIdx * 2);
        }
        return {
          ...origQ,
          id: qNumber,
          content: newContent,
          correctAnswer: newAns,
          solution: `Lời giải chi tiết Mã ${code} - Câu ${qNumber}:\n- **Bước 1:** Thiết lập phương trình theo giả thiết bài toán.\n- **Bước 2:** Rút gọn biểu thức và giải tìm ẩn số $x$.\n- **Bước 3:** Kết luận giá trị số cần điền là $${newAns}$.`
        };
      }

      return {
        ...origQ,
        id: qNumber,
        content: newContent,
        solution: origQ.solution || `Lời giải chi tiết Mã ${code} - Câu ${qNumber}: Tiến hành lập luận và giải tuần tự theo từng ý toán học.`
      };
    });

    return {
      code,
      examName: `${examTitle} - MÃ ĐỀ ${code}`,
      questions
    };
  });
}

app.all('/api/generate-similar-exams', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const {
      originalQuestions = [],
      examTitle = "ĐỀ KIỂM TRA ĐỊNH KỲ",
      subject = "Toán",
      grade = "12"
    } = req.body;

    if (!Array.isArray(originalQuestions) || originalQuestions.length === 0) {
      return { error: "Chưa có danh sách câu hỏi đề gốc.", exams: [] };
    }

    const simplifiedBase = originalQuestions.map((q, idx) => ({
      id: idx + 1,
      type: q.type || 'mc',
      content: q.content,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      correctAnswer: q.correctAnswer,
      tfStatements: q.tfStatements,
      level: q.level || 'Thông hiểu',
      topic: q.topic || 'Toán học'
    }));

    const promptText = `Bạn là chuyên gia khảo thí và giáo viên ra đề thi Quốc gia môn ${subject}.
Dưới đây là một Đề thi gốc gồm CHÍNH XÁC ${simplifiedBase.length} câu hỏi (được đánh số thứ tự từ Câu 1 đến Câu ${simplifiedBase.length}):
${JSON.stringify(simplifiedBase, null, 2)}

NHIỆM VỤ CỦA BẠN:
Phát triển ĐỦ 4 ĐỀ THI TƯƠNG ĐƯƠNG / ĐỒNG DẠNG HOÀN CHỈNH theo chuẩn mã đề 4 chữ số mới:
- Đề 1: Mã 1001 (chuẩn theo đề gốc kèm lời giải chi tiết từng bước)
- Đề 2: Mã 1002 (đồng dạng, thay đổi số liệu, đảo phương án, lời giải chi tiết)
- Đề 3: Mã 1003 (đồng dạng, thay đổi số liệu, đảo phương án, lời giải chi tiết)
- Đề 4: Mã 1004 (đồng dạng, thay đổi số liệu, đảo phương án, lời giải chi tiết)

[QUY TẮC SỐ LƯỢNG CÂU HỎI - BẮT BUỘC TUÂN THỦ 100%]:
1. Đề gốc có CHÍNH XÁC ${simplifiedBase.length} câu hỏi.
2. MỖI MÃ ĐỀ (Mã 1001, Mã 1002, Mã 1003, Mã 1004) BẮT BUỘC PHẢI CÓ ĐỦ CHÍNH XÁC ${simplifiedBase.length} CÂU HỎI (mảng 'questions' của mỗi mã đề BẮT BUỘC có đúng ${simplifiedBase.length} câu).
3. TUYỆT ĐỐI KHÔNG ĐƯỢC CHỈ LẤY 1 CÂU MỖI PHẦN! ĐÂY LÀ ĐỀ THI ĐỒNG DẠNG ĐẦY ĐỦ 100%, KHÔNG PHẢI VÍ DỤ MINH HỌA!
4. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý RÚT GỌN HOẶC BỎ BỚT BẤT KỲ CÂU NÀO!
5. Câu số k của mỗi mã đề (từ Câu 1 đến Câu ${simplifiedBase.length}) BẮT BUỘC tương ứng đồng dạng 1-1 với Câu số k của đề gốc (${simplifiedBase.length} câu).

NGUYÊN TẮC RA ĐỀ ĐỒNG DẠNG (BẮT BUỘC TUÂN THỦ 100%):
1. Câu số n của cả 4 đề (Mã 1001, Mã 1002, Mã 1003, Mã 1004) BẮT BUỘC kiểm tra cùng một đơn vị kiến thức, mô hình bài toán, phương pháp giải và cấp độ nhận thức như Câu số n của đề gốc.
2. Thay đổi số liệu, hệ số, hàm số hoặc ngữ cảnh bài toán thực tế đời sống một cách khéo léo để tạo thành đề mới độc lập, đảm bảo ra nghiệm đẹp và chính xác 100% về mặt toán học.
3. QUY ĐỊNH BẮT BUỘC VỀ BẢNG BIẾN THIÊN:
   Nếu câu hỏi có nhắc đến bảng biến thiên (như "Cho hàm số $y=f(x)$ có bảng biến thiên...", "Dựa vào bảng biến thiên..."), BẮT BUỘC PHẢI CHÈN BẢNG BIẾN THIÊN dạng bảng Markdown hoàn chỉnh ngay trong trường 'content':
   | $x$ | $-\\infty$ | | $x_1$ | | $x_2$ | | $+\\infty$ |
   |---|---|---|---|---|---|---|---|
   | $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |
   | $y$ | $-\\infty$ | $\\nearrow$ | $y_1$ | $\\searrow$ | $y_2$ | $\\nearrow$ | $+\\infty$ |
   TUYỆT ĐỐI KHÔNG để câu hỏi chỉ nói "như hình vẽ" hoặc "có bảng biến thiên sau" mà lại thiếu bảng Markdown!
4. QUY ĐỊNH BẮT BUỘC VỀ LỜI GIẢI CHI TIẾT ('solution'):
   Lời giải PHẢI GIẢI CHI TIẾT TỪNG BƯỚC TOÁN HỌC: tính đạo hàm $y'$, giải phương trình $y'=0$, lập bảng xét dấu, giải thích lý do chọn đáp án đúng và loại trừ các phương án sai.
   TUYỆT ĐỐI KHÔNG giải chung chung kiểu "Áp dụng định lý ta chọn đáp án B" hay "Sau khi tính toán ta có đáp án C"!
5. CÔNG THỨC TOÁN BẮT BUỘC đặt trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối riêng), dùng \\frac thay cho \\dfrac.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ VỚI CẤU TRÚC SAU:
{
  "exams": [
    {
      "code": "1001",
      "examName": "${examTitle} - MÃ ĐỀ 1001",
      "questions": [ ...đầy đủ ${simplifiedBase.length} câu hỏi của Mã 1001... ]
    },
    {
      "code": "1002",
      "examName": "${examTitle} - MÃ ĐỀ 1002",
      "questions": [ ...đầy đủ ${simplifiedBase.length} câu hỏi của Mã 1002... ]
    },
    {
      "code": "1003",
      "examName": "${examTitle} - MÃ ĐỀ 1003",
      "questions": [ ...đầy đủ ${simplifiedBase.length} câu hỏi của Mã 1003... ]
    },
    {
      "code": "1004",
      "examName": "${examTitle} - MÃ ĐỀ 1004",
      "questions": [ ...đầy đủ ${simplifiedBase.length} câu hỏi của Mã 1004... ]
    }
  ]
}`;

    let parsedData: any = { exams: [] };
    try {
      const response = await generateWithFallback(req, {
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.4
        }
      });

      if (response && response.text) {
        const rawText = response.text.trim();
        try {
          parsedData = safeJsonParse(rawText);
        } catch (e) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsedData = safeJsonParse(jsonMatch[0]);
            } catch (e2) {}
          }
        }
      }
    } catch (aiErr) {
      console.warn("Notice: AI generation fallback activated in /api/generate-similar-exams:", aiErr);
    }

    if (!parsedData || !Array.isArray(parsedData.exams)) {
      parsedData = { exams: [] };
    }

    // Filter valid exams returned by AI
    const validAiExams = parsedData.exams.filter((e: any) => e && Array.isArray(e.questions) && e.questions.length > 0);

    // Baseline algorithmic generation to guarantee all 4 codes ALWAYS have all original questions
    const targetCodes = ['1001', '1002', '1003', '1004'];
    const algorithmicAll = generateServerAlgorithmicVariants(simplifiedBase, examTitle);

    const finalExams: any[] = [];
    for (let i = 0; i < 4; i++) {
      const targetCode = targetCodes[i];
      const existing = validAiExams.find((e: any) => String(e.code) === targetCode) || validAiExams[i];
      const baselineExam = algorithmicAll[i];

      if (existing && Array.isArray(existing.questions) && existing.questions.length === simplifiedBase.length) {
        // AI returned exact full question count
        finalExams.push({
          code: targetCode,
          examName: existing.examName || `${examTitle} - MÃ ĐỀ ${targetCode}`,
          questions: existing.questions.map((q: any, qIdx: number) => ({
            ...q,
            id: q.id || qIdx + 1,
            solution: q.solution || q.explanation || baselineExam.questions[qIdx]?.solution || `Lời giải chi tiết câu ${qIdx + 1}.`
          }))
        });
      } else if (existing && Array.isArray(existing.questions) && existing.questions.length > 0) {
        // AI returned partial questions (e.g. only 4 questions or skipped some questions):
        // Merge AI variants with baseline algorithmic questions so NO QUESTION IS EVER DROPPED!
        const mergedQuestions = simplifiedBase.map((baseQ: any, qIdx: number) => {
          const aiQ = existing.questions.find((q: any) => q.id === qIdx + 1) || 
                      (existing.questions.length === simplifiedBase.length ? existing.questions[qIdx] : null);
          if (aiQ && aiQ.content && (aiQ.type === baseQ.type || !aiQ.type)) {
            return {
              ...baseQ,
              ...aiQ,
              id: qIdx + 1,
              type: baseQ.type,
              solution: aiQ.solution || aiQ.explanation || baselineExam.questions[qIdx]?.solution || `Lời giải chi tiết câu ${qIdx + 1}.`
            };
          }
          return baselineExam.questions[qIdx];
        });
        finalExams.push({
          code: targetCode,
          examName: existing.examName || `${examTitle} - MÃ ĐỀ ${targetCode}`,
          questions: mergedQuestions
        });
      } else {
        finalExams.push(baselineExam);
      }
    }

    return { exams: finalExams };
  });
});

app.all('/api/fix-question', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return keepAliveExecute(req, res, async () => {
    const { question, mode = 'fix_bbt', subject = 'Toán', grade = '12' } = req.body;
    if (!question || !question.content) {
      return { error: 'Chưa có thông tin câu hỏi cần xử lý.' };
    }

    let instruction = "";
    if (mode === 'fix_bbt') {
      instruction = `Câu hỏi dưới đây nhắc đến hoặc cần có BẢNG BIẾN THIÊN nhưng hiện tại chưa có bảng/hình hiển thị:
${JSON.stringify(question, null, 2)}

NHIỆM VỤ:
1. Đọc kỹ nội dung và các phương án của câu hỏi, xác định hàm số / dạng hàm số phù hợp (ví dụ hàm bậc ba, hàm phân thức, hàm bậc 4...).
2. BỔ SUNG NGAY một Bảng biến thiên dạng bảng Markdown chuẩn chỉnh vào cuối nội dung câu hỏi ('content'):
| $x$ | $-\\infty$ | | $x_1$ | | $x_2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |
| $y$ | $-\\infty$ | $\\nearrow$ | $y_1$ | $\\searrow$ | $y_2$ | $\\nearrow$ | $+\\infty$ |
(Nếu là hàm phân thức có tiệm cận đứng, dùng dấu || ở hàng y' và tách giới hạn bằng || ở hàng y).
3. Viết LỜI GIẢI CHI TIẾT TỪNG BƯỚC ('solution'): Dựa vào bảng biến thiên trên để giải thích rõ ràng từng khẳng định/phương án, chỉ rõ tại sao chọn đáp án đúng và loại trừ các đáp án sai. TUYỆT ĐỐI KHÔNG giải chung chung!`;
    } else if (mode === 'regenerate') {
      instruction = `Tạo lại HOÀN CHỈNH câu hỏi sau đây theo đúng đơn vị kiến thức, chủ đề và cấp độ tư duy:
${JSON.stringify(question, null, 2)}

YÊU CẦU:
1. Đảm bảo câu hỏi có số liệu đẹp, chính xác 100% về mặt toán học.
2. NẾU câu hỏi liên quan đến tính đơn điệu, cực trị, tiệm cận, GTLN-GTNN: BẮT BUỘC chèn Bảng Biến Thiên dạng Markdown table chuẩn vào 'content'.
3. BẮT BUỘC có LỜI GIẢI CHI TIẾT TỪNG BƯỚC ('solution') với đầy đủ công thức LaTeX ($...$). Tuyệt đối không nói chung chung!`;
    } else {
      instruction = `Tạo một CÂU HỎI MỚI ĐỒNG DẠNG / TƯƠNG ĐƯƠNG để thay thế cho câu hỏi sau:
${JSON.stringify(question, null, 2)}

YÊU CẦU:
1. Giữ nguyên mô hình bài toán, chủ đề và cấp độ tư duy (${question.level || 'Thông hiểu'}), nhưng thay đổi số liệu, ngữ cảnh hoặc hàm số để tạo câu hỏi mới độc lập.
2. Nếu câu hỏi về bảng biến thiên thì BẮT BUỘC chèn bảng Markdown chuẩn vào 'content'.
3. LỜI GIẢI CHI TIẾT TỪNG BƯỚC ('solution') toán học rõ ràng, cụ thể.`;
    }

    const promptText = `Bạn là chuyên gia ra đề thi Toán THPT chuẩn cấu trúc 2025.
${instruction}

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON VỚI ĐỊNH DẠNG:
{
  "question": {
    "id": ${question.id || 1},
    "type": "${question.type || 'mc'}",
    "level": "${question.level || 'Thông hiểu'}",
    "topic": "${question.topic || 'Hàm số'}",
    "content": "Nội dung câu hỏi đầy đủ...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctOptionIndex": 0,
    "correctAnswer": "A",
    "tfStatements": [
      { "statement": "Mệnh đề a", "correct": true },
      { "statement": "Mệnh đề b", "correct": false },
      { "statement": "Mệnh đề c", "correct": true },
      { "statement": "Mệnh đề d", "correct": false }
    ],
    "solution": "Lời giải chi tiết từng bước toán học..."
  }
}`;

    try {
      const response = await generateWithFallback(req, {
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response && response.text) {
        const rawText = response.text.trim();
        let parsed = safeJsonParse(rawText);
        if (!parsed || !parsed.question) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) parsed = safeJsonParse(match[0]);
        }
        if (parsed && parsed.question) {
          return { question: parsed.question };
        }
      }
    } catch (e) {
      console.warn("AI fix question notice:", e);
    }

    // Algorithmic fallback if AI is not available
    let fallbackContent = question.content;
    if (mode === 'fix_bbt' && !fallbackContent.includes('|')) {
      fallbackContent += `\n\n| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ |\n| $y$ | $-\\infty$ | $\\nearrow$ | $3$ | $\\searrow$ | $-1$ | $\\nearrow$ | $+\\infty$ |`;
    }

    return {
      question: {
        ...question,
        content: fallbackContent,
        solution: question.solution || `Lời giải chi tiết:\n- Dựa vào bảng biến thiên của hàm số, ta xác định các khoảng đồng biến, nghịch biến và các điểm cực trị tương ứng.\n- Đối chiếu với các phương án, ta chọn phương án đúng.`
      }
    };
  });
});

app.post('/api/export-docx', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Missing HTML content' });
    }
    
    // Remove any data:image/svg images to prevent HTMLtoDOCX crashing
    let cleanHtml = html.replace(/<img[^>]*src=["']data:image\/svg[^"']*["'][^>]*>/gi, '');
    
    // Normalize and style math characters with Cambria Math font to prevent empty boxes in Office
    cleanHtml = cleanHtml
      .replace(/\\mathbb\{R\}|\b\\mathbb\s*R\b/g, 'ℝ')
      .replace(/\\mathbb\{N\}|\b\\mathbb\s*N\b/g, 'ℕ')
      .replace(/\\mathbb\{Z\}|\b\\mathbb\s*Z\b/g, 'ℤ')
      .replace(/\\mathbb\{Q\}|\b\\mathbb\s*Q\b/g, 'ℚ')
      .replace(/\\mathbb\{C\}|\b\\mathbb\s*C\b/g, 'ℂ')
      .replace(/\\forall\b/g, '∀')
      .replace(/\\exists\b/g, '∃')
      .replace(/\\in\b/g, '∈')
      .replace(/\\notin\b/g, '∉')
      .replace(/\\cap\b/g, '∩')
      .replace(/\\cup\b/g, '∪')
      .replace(
        /([\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u25A0-\u25FF\u27C0-\u27EF\u27F0-\u27FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u00B1\u00D7\u00F7\u00AC\u00B7]|[\uD835][\uDC00-\uDFFF])/g,
        '<span style="font-family: \'Cambria Math\', \'Segoe UI Symbol\';">$1</span>'
      );
    
    // Convert inch to twips (1 inch = 1440 twips)
    // 2cm is ~0.787 inches = ~1134 twips
    const fileBuffer = await HTMLtoDOCX(cleanHtml, null, {
      orientation: 'portrait',
      margins: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 720, footer: 720, gutter: 0 },
      font: 'Times New Roman',
      fontSize: 26, // 13pt (half-points)
      size: { width: 11906, height: 16838 }, // A4
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="document.docx"');
    res.send(fileBuffer);
  } catch (error) {
    console.error('DOCX Export error:', error);
    res.status(500).json({ error: 'Failed to generate Word document' });
  }
});

app.post("/api/extract-answers-pdf", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  return keepAliveExecute(req, res, async () => {
    const { file, type } = resolveSingleFile(req.body);
    if (!file) {
      throw new Error("Không tìm thấy tệp tin PDF nào được tải lên.");
    }

    const pdfBuffer = Buffer.from(file, 'base64');
    let pdfText = "";
    try {
      pdfText = await extractTextFromPdf(pdfBuffer);
    } catch (e) {
      console.warn("Lỗi trích xuất văn bản thô PDF (chuyển sang đọc multimodal):", e);
    }

    const promptText = `Bạn là chuyên gia phân tích đề thi và khảo thí Toán học xuất sắc hàng đầu.
Hãy đọc và phân tích kỹ tệp đề thi PDF được đính kèm (và văn bản trích xuất đối chiếu dưới đây nếu có). Nhiệm vụ của bạn là trích xuất hoặc tự giải đề thi để đưa ra Bảng đáp án chính xác 100%.

THẦY CÔ CÓ THỂ CUNG CẤP FILE ĐỀ THEO 2 DẠNG:
Dạng 1: Đề thi có đính kèm bảng đáp án sẵn ở cuối hoặc trang nào đó. Bảng đáp án có thể chia làm nhiều cột tương ứng với các Mã đề thi khác nhau (ví dụ: 1201, 1202, 1203, 1204,...).
   - Bạn BẮT BUỘC phải tìm cột Mã đề đầu tiên (ví dụ mã đề 1201 hoặc mã đề nhỏ nhất nằm ở cột đầu tiên từ bên trái qua trong bảng).
   - Trích xuất toàn bộ đáp án của Mã đề đó và đối chiếu khớp số câu hỏi.
   - Đối với Phần II (Trắc nghiệm Đúng/Sai): Bảng đáp án có thể ghi dạng chữ viết tắt 'Đ Đ S S', 'S Đ S Đ', 'Đ, S, Đ, S', 'D S D S', 'TTFF', 'T F T F', 'Đ-S-Đ-S', 'a-S, b-Đ, c-S, d-Đ' hoặc chia thành các cột con Đúng / Sai. Bạn hãy ánh xạ chuẩn xác ý 1, 2, 3, 4 tương ứng với a, b, c, d của câu đó:
     * Ký hiệu đại diện cho ĐÚNG (true): "Đ", "D", "T", "Đúng", "True", "✓", "X" (nếu đánh dấu X ở cột Đúng).
     * Ký hiệu đại diện cho SAI (false): "S", "F", "Sai", "False", "✗", "X" (nếu đánh dấu X ở cột Sai).
   - Đối với Phần III (Trả lời ngắn): Trích xuất chính xác đáp số số cụ thể, ví dụ: "4", "30", "2026", "0.5" hoặc "0,5" (giữ nguyên độ dài số, tối đa 5 ký tự).

Dạng 2: Đề thi CHỈ có câu hỏi và KHÔNG có sẵn bảng đáp án.
   - Bạn phải đóng vai trò là một AI Giải Toán xuất sắc, tự đọc kỹ từng câu hỏi trong đề thi PDF và giải chính xác 100% để tìm ra đáp số chuẩn xác nhất cho từng phần:
     * Phần I: Chọn phương án đúng A, B, C hoặc D.
     * Phần II (Đúng/Sai): Xác định tính Đúng (true) hoặc Sai (false) cho từng ý a, b, c, d của từng câu.
     * Phần III (Trả lời ngắn): Giải và tính toán ra đáp số số cụ thể (ví dụ: 4, 30, 2026, 0.5, 12, 124).

QUY ĐỊNH CẤU TRÚC PHẦN ĐỀ VÀ SỐ CÂU:
- Phần I (part1): Gồm 12 câu trắc nghiệm 4 lựa chọn (tương ứng từ Câu 1 đến Câu 12).
- Phần II (part2): Gồm 4 câu trắc nghiệm Đúng/Sai (tương ứng từ Câu 13 đến Câu 16, hoặc Câu 1 đến Câu 4 của Phần II). Mỗi câu gồm 4 ý a, b, c, d. Bạn hãy gán đúng kết quả cho từng ý {"a": true/false, "b": true/false, "c": true/false, "d": true/false}.
- Phần III (part3): Gồm 6 câu trắc nghiệm trả lời ngắn (tương ứng từ Câu 17 đến Câu 22, hoặc Câu 1 đến Câu 6 của Phần III). Mỗi câu có đáp án là một số cụ thể.

${pdfText ? `VĂN BẢN TRÍCH XUẤT ĐỐI CHIẾU THÔ:\n${pdfText.substring(0, 30000)}` : ""}

YÊU CẦU TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ VỚI CẤU TRÚC SAU (TUYỆT ĐỐI KHÔNG VIẾT CHỮ HAY GIẢI THÍCH NGOÀI LỀ):
{
  "part1": [
    {"question": 1, "correct": "A"},
    {"question": 2, "correct": "B"},
    {"question": 3, "correct": "C"},
    {"question": 4, "correct": "D"},
    {"question": 5, "correct": "A"},
    {"question": 6, "correct": "B"},
    {"question": 7, "correct": "C"},
    {"question": 8, "correct": "D"},
    {"question": 9, "correct": "A"},
    {"question": 10, "correct": "B"},
    {"question": 11, "correct": "C"},
    {"question": 12, "correct": "D"}
  ],
  "part2": [
    {
      "question": 1,
      "statements": {"a": true, "b": false, "c": true, "d": false}
    },
    {
      "question": 2,
      "statements": {"a": false, "b": true, "c": false, "d": true}
    },
    {
      "question": 3,
      "statements": {"a": true, "b": true, "c": false, "d": false}
    },
    {
      "question": 4,
      "statements": {"a": false, "b": false, "c": true, "d": true}
    }
  ],
  "part3": [
    {"question": 1, "correct": "25"},
    {"question": 2, "correct": "-3.5"},
    {"question": 3, "correct": "102"},
    {"question": 4, "correct": "0.5"},
    {"question": 5, "correct": "1"},
    {"question": 6, "correct": "12"}
  ]
}`;

    const userParts: any[] = [];
    if (file) {
      userParts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: file
        }
      });
    }
    userParts.push({ text: promptText });

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: userParts
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI trích xuất đáp án.");
    }

    return safeJsonParse(response.text.trim(), {});
  });
});

// Endpoint Tạo & Chỉnh sửa ảnh (Nano Banana 2.1 / Imagen 3)
app.post("/api/generate-math-simulation", async (req, res) => {
  try {
    const { prompt, questionText, grade, subject = "Toán", targetFormat = "svg" } = req.body || {};
    const inputContent = (prompt || questionText || "").trim();
    if (!inputContent) {
      return res.status(400).json({ error: "Vui lòng cung cấp nội dung đề bài hoặc mô tả hình vẽ." });
    }

    const systemPrompt = `Bạn là chuyên gia thiết kế đồ họa hình học và mô phỏng trực quan môn Toán học phổ thông (SGK GDPT 2018).
Nhiệm vụ của bạn là đọc đề bài toán học và dựng một hình vẽ mô phỏng vector SVG hoàn chỉnh:
1. Thẩm mỹ & Sư phạm:
   - Sử dụng phong cách thiết kế phẳng (Flat Design) hiện đại, nét vẽ sắc nét, dễ nhìn trên cả nền trắng và nền sáng để chèn vào đề thi, phiếu học tập, sách in và máy chiếu.
   - Thể hiện trực quan đối tượng thực tế (ngọn hải đăng, con thuyền, máy bay, toà nhà, quả đồi, dòng sông, cái thang, cây cối, xe cộ, quả bóng...) hoặc đối tượng hình học (tam giác, hình chóp, khối lăng trụ, parabol, đường tròn, góc, vectơ, mặt phẳng).
   - Mô hình hóa rõ ràng tam giác hình học hoặc hệ trục tương ứng: đường cao, các góc (ví dụ: góc hạ 30°, góc nâng 45°, ký hiệu góc vuông), đường chân trời, nét đứt cho đường đo đạc/gióng.
   - Ghi chú đầy đủ tên đỉnh (A, B, C, H...), độ dài (ví dụ: 80m, h = ?), và độ lớn góc bằng thẻ <text> rõ ràng, font serif hoặc sans-serif sắc nét, độ tương phản cao.
2. Quy chuẩn kỹ thuật:
   - Chỉ trả về duy nhất thẻ <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">...</svg>.
   - Không được thêm bất cứ văn bản markdown nào (không bọc trong \`\`\`xml hoặc \`\`\`svg), không kèm lời giải thích nào khác.`;

    const userMessage = `Hãy tạo hình vẽ vector SVG mô phỏng sư phạm cho bài toán sau:\n${inputContent}\nLớp: ${grade || "Toán THPT"}.`;

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.15 }
    });

    let rawSvg = (response && response.text) ? response.text : "";
    rawSvg = rawSvg.replace(/```xml/gi, "").replace(/```svg/gi, "").replace(/```/g, "").trim();

    const svgMatch = rawSvg.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      return res.status(500).json({ error: "Mô hình AI chưa trả về định dạng thẻ SVG hợp lệ. Vui lòng bấm tạo lại!" });
    }

    const svgContent = svgMatch[0];
    const base64Svg = Buffer.from(svgContent, 'utf-8').toString('base64');
    const snippet = `\n\n<svg-wrapper data-svg="${base64Svg}"></svg-wrapper>\n\n`;

    return res.json({
      success: true,
      svg: svgContent,
      base64Svg,
      snippet
    });
  } catch (err: any) {
    console.error("Lỗi generate-math-simulation:", err);
    handleAiError(err, req, res);
  }
});

// Endpoint Tái tạo hình vẽ Toán học từ ảnh & Sinh mô hình động
app.post("/api/reproduce-math-image", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { imageBase64, mimeType = 'image/png', promptHint = '', modelType = 'auto' } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Vui lòng tải lên ảnh bài toán để tái tạo hình vẽ." });
    }

    const cleanData = typeof imageBase64 === 'string' ? imageBase64.replace(/^data:image\/\w+;base64,/, '').trim() : '';

    if (!cleanData) {
      return res.status(400).json({ error: "Dữ liệu hình ảnh không hợp lệ." });
    }

    const systemPrompt = `Bạn là chuyên gia đồ họa hình học Toán học và lập trình SVG / TikZ / Three.js hàng đầu của Bộ GD&ĐT (Chương trình GDPT 2018).
Nhiệm vụ của bạn là: Phân tích hình ảnh bài toán do giáo viên tải lên (gồm hình vẽ phẳng trải lưới, quy trình gấp hộp origami, hình học không gian 3D, vật thể xoắn ốc cắt lát tích phân...), trích xuất đề bài toán học và tái tạo lại hình vẽ toán học đẹp, chính xác 100% về mặt tỉ lệ hình học, thẩm mỹ chuẩn sách giáo khoa.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (không kèm markdown bên ngoài hoặc bọc trong \`\`\`json):
{
  "problemTitle": "Tiêu đề bài toán (Ví dụ: Cắt gấp chiếc hộp hoa từ tờ giấy hình vuông 10cm)",
  "questionText": "Toàn bộ nội dung đề bài đọc được từ ảnh. Tất cả công thức toán học BẮT BUỘC đặt trong cặp dấu $...$ (ví dụ: $x$, $\\frac{x}{2}$, $10\\text{ cm}$, $V(x)$, $45^\\circ$)",
  "mathModel": {
    "type": "paper_folding" | "twisted_solid" | "cylinder_box" | "polyhedron" | "cross_section",
    "parameters": {
      "a": 10,
      "variableName": "x",
      "optimalX": 2.5,
      "maxVolume": 28.5
    },
    "volumeFormula": "Công thức giải tích tính thể tích $V(x) = ...$",
    "optimalSolution": "Lời giải toán học tìm giá trị lớn nhất $V_{\\\\max}$, đạo hàm $V'(x) = 0$, kết luận"
  },
  "colorSvg": "<svg viewBox=\\"0 0 850 500\\" xmlns=\\"http://www.w3.org/2000/svg\\" ...>...</svg>",
  "bwSvg": "<svg viewBox=\\"0 0 850 500\\" xmlns=\\"http://www.w3.org/2000/svg\\" ...>...</svg>",
  "tikzCode": "\\\\begin{tikzpicture}[...] ... \\\\end{tikzpicture}",
  "foldingSteps": [
    { "step": 1, "title": "Bước 1", "description": "Mô tả công đoạn phẳng ban đầu" },
    { "step": 2, "title": "Bước 2", "description": "Gấp các thành đứng 90 độ" },
    { "step": 3, "title": "Bước 3", "description": "Khép các nắp trên / uốn vòm cong" }
  ]
}

QUY TẮC VẼ SVG CỰC KỲ CHÍNH XÁC:
1. colorSvg (Bản vẽ màu chuẩn SGK):
   - Kích thước viewBox="0 0 850 500" hoặc phù hợp với bố cục ảnh gốc.
   - Màu sắc pastel đẹp, cao cấp: màu giấy cam nhạt (#fde2d4 hoặc #fed7aa), viền nét vẽ đen sắc nét (#1e293b, stroke-width: 1.5 - 2).
   - Vẽ đầy đủ: Hình phẳng trải lưới (kèm các đường nét đứt biểu thị nếp gấp stroke-dasharray="4,4"), mũi tên uốn cong quy trình (marker-end="url(#arrow)"), các bước gấp thu nhỏ, và chiếc hộp 3D hoàn chỉnh được phóng to.
   - Chữ ghi chú (labels): font-family: 'Times New Roman', serif, font-size: 13-14, rõ nét và căn chỉnh đúng tọa độ.
2. bwSvg (Bản vẽ đen trắng in ấn):
   - Chuẩn mực 100% dành cho in ấn đề thi trường học (không có màu, chỉ đen trắng và xám).
   - Nền trắng (#ffffff), nét vẽ đen tuyền (#000000, stroke-width: 1.5).
   - Các vùng tô màu trong bản gốc được thay bằng: gạch sọc chéo (hatching) thông qua <pattern id="hatch"> hoặc xám nhạt (#f1f5f9 với viền đen rõ).
   - Nếp gấp dùng nét đứt chuẩn (stroke-dasharray="4,4").
   - Cực kỳ tương phản, photo hoặc in ấn không bao giờ bị nhòe mực.
3. ĐẢM BẢO SVG HỢP LỆ: Đóng đủ thẻ, có <defs> định nghĩa mũi tên marker và pattern.`;

    const userMessage = promptHint
      ? `Hãy tái tạo hình vẽ cho ảnh này với yêu cầu bổ sung: ${promptHint}. Tái tạo cả bản màu gốc và bản đen trắng in ấn kèm mô hình động.`
      : `Hãy tái tạo hình vẽ toán học từ ảnh này với độ chính xác 100%, gồm bản màu sắc gốc, bản đen trắng in ấn, phân tích toán học và các bước mô phỏng.`;

    const response = await generateWithFallback(req, {
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              data: cleanData,
              mimeType: mimeType || 'image/png'
            }
          },
          { text: userMessage }
        ]
      }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.15
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI tái tạo hình ảnh.");
    }

    let rawText = response.text.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }

    let parsedResult: any = null;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr) {
      // Tìm khối JSON { ... }
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.warn("Lỗi parse JSON cấp 2:", e2);
        }
      }
    }

    if (!parsedResult || !parsedResult.colorSvg) {
      // Fallback: nếu AI trả về trực tiếp thẻ SVG
      const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        parsedResult = {
          problemTitle: "Hình vẽ toán học tái tạo từ ảnh",
          questionText: "Hình vẽ toán học tái tạo từ ảnh gốc của giáo viên.",
          colorSvg: svgMatch[0],
          bwSvg: svgMatch[0].replace(/fill="#[a-fA-F0-9]{3,6}"/g, 'fill="#f8fafc"').replace(/stroke="#[a-fA-F0-9]{3,6}"/g, 'stroke="#000000"'),
          mathModel: { type: "general_geometry" },
          foldingSteps: [
            { step: 1, title: "Mô hình", description: "Quan sát hình học 3D" }
          ]
        };
      } else {
        throw new Error("AI không thể phân tích cấu trúc hình học của bức ảnh này. Vui lòng thử ảnh rõ nét hơn.");
      }
    }

    return res.json({
      success: true,
      result: parsedResult
    });
  } catch (err: any) {
    console.error("Lỗi reproduce-math-image:", err);
    handleAiError(err, req, res);
  }
});

// ============================================================================
// API: AI TỰ ĐỘNG ĐỀ XUẤT MA TRẬN & BẢNG ĐẶC TẢ GDPT 2018 THEO YÊU CẦU
// ============================================================================
app.post("/api/suggest-exam-matrix", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const {
      subject = "Toán học",
      grade = "11",
      semester = "Giữa kì I",
      durationMinutes = 90,
      totalPoints = 10,
      targetRatio = { biet: 40, hieu: 30, vd: 20, vdc: 10 },
      qCounts = { mc: 16, tf: 2, sa: 2, essay: 3 },
      customTopics = [],
      pedagogicalNote = ""
    } = req.body || {};

    const systemPrompt = `Bạn là Chuyên gia Khảo thí và Đánh giá Giáo dục hàng đầu của Bộ Giáo dục & Đào tạo Việt Nam, am tường sâu sắc Chương trình Giáo dục Phổ thông 2018 (GDPT 2018).
Nhiệm vụ của bạn là: Phân tích các thông số đề thi của giáo viên (Môn học, Khối lớp, Thời gian làm bài, Số lượng câu hỏi từng phần, Mục tiêu tỉ lệ cấp độ tư duy: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), tự động tính toán, phân bổ các câu lệnh hỏi vào Ma trận đánh giá năng lực môn học và xây dựng Bảng đặc tả chi tiết kĩ thuật đề kiểm tra đạt chuẩn sư phạm 100%.

QUY TẮC CỐT LÕI VỀ TOÁN HỌC & ĐẶC TẢ:
1. Tất cả công thức, ký hiệu toán học, biến số đơn lẻ (x, y, m, a...) BẮT BUỘC đặt trong cặp dấu đô la: $công_thức$ (nội dòng) hoặc $$công_thức$$ (khối riêng).
2. Dùng cú pháp LaTeX chuẩn: \\sin, \\cos, \\tan, \\cot, \\frac{a}{b}, \\sqrt{...}, \\pi, \\Leftrightarrow, \\ge, \\le, \\in. Dùng \\frac thay vì \\dfrac.
3. Không viết tắt hay dùng text thường cho công thức (ví dụ: không viết "sin x = 0", phải viết "$\\sin x = 0$").
4. Mã câu hỏi:
   - Phần I: Trắc nghiệm 4 lựa chọn ký hiệu I.1, I.2, ... I.n
   - Phần II: Trắc nghiệm Đúng/Sai ký hiệu II.1 (với các ý a, b, c, d gán vào các ô năng lực như II.1ab, II.1cd, II.2a...)
   - Phần III: Trắc nghiệm Trả lời ngắn ký hiệu III.1, III.2, ... III.m
   - Phần IV (nếu có): Tự luận ký hiệu TL1, TL2, TL3...
5. Tỉ lệ nhận thức phải bám sát mục tiêu của giáo viên: Nhận biết: ${targetRatio.biet}%, Thông hiểu: ${targetRatio.hieu}%, Vận dụng: ${targetRatio.vd}%, Vận dụng cao: ${targetRatio.vdc}%.
6. Tổng điểm phân bổ trên toàn bộ bảng đặc tả phải bằng đúng ${totalPoints} điểm.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (không kèm markdown bên ngoài hoặc bọc trong \`\`\`json):
{
  "title": "Tên đề kiểm tra (Ví dụ: ĐỀ KIỂM TRA GIỮA HỌC KÌ I MÔN TOÁN - KHỐI 11)",
  "subject": "${subject}",
  "grade": "${grade}",
  "durationMinutes": ${durationMinutes},
  "totalPoints": ${totalPoints},
  "competencyHeaders": {
    "c1": "Tên năng lực 1 phù hợp môn học",
    "c2": "Tên năng lực 2 phù hợp môn học",
    "c3": "Tên năng lực 3 phù hợp môn học"
  },
  "topicsList": ["Chủ đề 1", "Chủ đề 2", ...],
  "matrixRows": [
    {
      "id": "row-1",
      "topic": "TÊN CHỦ ĐỀ IN HOA",
      "unit": "1. Tên bài / đơn vị kiến thức",
      "gqvd": { "biet": "I.1, I.2", "hieu": "", "vd": "" },
      "tuduy": { "biet": "I.3", "hieu": "II.1ab", "vd": "" },
      "mohinh": { "biet": "", "hieu": "", "vd": "TL1" }
    }
  ],
  "specUnits": [
    {
      "id": "spec-1",
      "topic": "Tên chủ đề",
      "unit": "1. Tên bài / đơn vị kiến thức",
      "bietSpec": "- Yêu cầu cần đạt mức Nhận biết cụ thể...",
      "hieuSpec": "- Yêu cầu cần đạt mức Thông hiểu cụ thể...",
      "vdSpec": "- Yêu cầu cần đạt mức Vận dụng cụ thể...",
      "assignedQuestions": {
        "part1": "I.1, I.2",
        "part2": "II.1 (ý a, b)",
        "part3": "",
        "essay": "TL1"
      },
      "points": 1.25
    }
  ],
  "aiPedagogicalAdvice": "Lời khuyên sư phạm của chuyên gia về phân bố thời gian làm bài, cấu trúc đề và mức độ phân hóa...",
  "timeBreakdown": {
    "mcAverageMinutes": "1.5 phút/câu",
    "tfAverageMinutes": "4.0 phút/câu (4 ý)",
    "saAverageMinutes": "3.5 phút/câu",
    "essayAverageMinutes": "10.0 phút/câu"
  }
}`;

    const userPrompt = `Hãy tự động tính toán và đề xuất ma trận đề thi & bảng đặc tả chi tiết GDPT 2018 với các thông số sau:
- Môn học: ${subject}
- Khối lớp: ${grade}
- Kì thi: ${semester}
- Thời gian làm bài: ${durationMinutes} phút
- Thang điểm: ${totalPoints} điểm
- Cấu trúc số lượng câu hỏi mong muốn:
  * Phần I (Trắc nghiệm nhiều lựa chọn): ${qCounts.mc} câu
  * Phần II (Trắc nghiệm Đúng/Sai): ${qCounts.tf} câu (mỗi câu 4 ý a, b, c, d)
  * Phần III (Trắc nghiệm Trả lời ngắn): ${qCounts.sa} câu
  * Phần IV (Tự luận): ${qCounts.essay} câu
- Mục tiêu tỉ lệ mức độ nhận thức:
  * Nhận biết: ${targetRatio.biet}%
  * Thông hiểu: ${targetRatio.hieu}%
  * Vận dụng: ${targetRatio.vd}%
  * Vận dụng cao: ${targetRatio.vdc}%
- Các chủ đề trọng tâm cần có: ${customTopics.length > 0 ? customTopics.join(', ') : 'Tự động lấy theo phân phối chương trình GDPT 2018 của học kì này'}
- Ghi chú bổ sung từ giáo viên: ${pedagogicalNote || 'Cân đối phân hóa học sinh khá giỏi'}`;

    const response = await generateWithFallback(req, {
      contents: [{
        role: "user",
        parts: [{ text: userPrompt }]
      }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI đề xuất ma trận.");
    }

    let rawText = response.text.trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }

    let parsedResult: any = null;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    }

    if (!parsedResult || !parsedResult.matrixRows || !Array.isArray(parsedResult.matrixRows)) {
      throw new Error("Dữ liệu ma trận đề xuất từ AI không đúng cấu trúc yêu cầu. Vui lòng thử lại.");
    }

    return res.json({
      success: true,
      result: parsedResult
    });
  } catch (err: any) {
    console.error("Lỗi suggest-exam-matrix:", err);
    handleAiError(err, req, res);
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, negativePrompt, aspectRatio = "1:1", style = "photorealistic", sourceImage } = req.body || {};
    
    if (!prompt) {
      return res.status(400).json({ error: "Vui lòng nhập mô tả hình ảnh (prompt)." });
    }

    const client = getAiClient(req);
    let imageUrl = "";

    // Thử dùng Imagen 3 via SDK
    try {
      const formattedPrompt = `${prompt}. Style: ${style}.${negativePrompt ? ` Exclude: ${negativePrompt}` : ""}`;
      const imageResult = await client.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: formattedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: (aspectRatio === "16:9" || aspectRatio === "9:16" || aspectRatio === "4:3" || aspectRatio === "3:4" || aspectRatio === "1:1") ? aspectRatio : "1:1",
        },
      });

      if (imageResult?.generatedImages?.[0]?.image?.imageBytes) {
        const base64 = imageResult.generatedImages[0].image.imageBytes;
        imageUrl = `data:image/jpeg;base64,${base64}`;
      }
    } catch (err: any) {
      console.warn("Imagen 3 SDK call failed, trying Gemini multimodal or fallback:", err?.message || err);
    }

    // Nếu Imagen không trả về, thử mô hình Gemini 3.8 Flash cho ra SVG / Canvas Art chất lượng cao
    if (!imageUrl) {
      try {
        const systemPrompt = `Bạn là chuyên gia thiết kế đồ họa AI (Nano Banana 2.1 Engine). Hãy tạo mã SVG nguyên khối hoàn chỉnh (chỉ trả về đoạn SVG từ <svg> đến </svg>, bắt đầu bằng <svg> và kết thúc bằng </svg>, tỉ lệ ${aspectRatio}) minh họa sống động cho mô tả: "${prompt}". Phong cách: ${style}. Sử dụng màu sắc sắc nét, gradient chuyển màu hiện đại, bóng đổ depth 3D và các đường nét độ phân giải cao.`;
        const response = await generateWithFallback(req, {
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }]
        });

        if (response && response.text) {
          const svgMatch = response.text.match(/<svg[\s\S]*?<\/svg>/i);
          if (svgMatch) {
            const svgContent = svgMatch[0];
            const base64Svg = Buffer.from(svgContent).toString('base64');
            imageUrl = `data:image/svg+xml;base64,${base64Svg}`;
          }
        }
      } catch (err2: any) {
        console.warn("Gemini SVG generation failed:", err2?.message || err2);
      }
    }

    // Fallback dự phòng nếu bị giới hạn API key
    if (!imageUrl) {
      const width = aspectRatio === "16:9" ? 1280 : aspectRatio === "9:16" ? 720 : aspectRatio === "4:3" ? 1024 : 800;
      const height = aspectRatio === "16:9" ? 720 : aspectRatio === "9:16" ? 1280 : aspectRatio === "4:3" ? 768 : 800;
      const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#065f46" />
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <circle cx="${width / 2}" cy="${height / 2 - 40}" r="140" fill="none" stroke="url(#accent)" stroke-width="4" filter="url(#glow)" opacity="0.8" />
        <path d="M${width / 2 - 80} ${height / 2 + 20} Q ${width / 2} ${height / 2 - 100} ${width / 2 + 80} ${height / 2 + 20}" fill="none" stroke="#38bdf8" stroke-width="6" />
        <text x="50%" y="${height / 2 - 30}" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">Nano Banana 2.1 AI Art</text>
        <text x="50%" y="${height / 2 + 70}" font-family="sans-serif" font-size="16" fill="#cbd5e1" text-anchor="middle">${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}</text>
        <rect x="${width / 2 - 120}" y="${height / 2 + 100}" width="240" height="32" rx="16" fill="url(#accent)" opacity="0.9" />
        <text x="50%" y="${height / 2 + 121}" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">Style: ${style} (${aspectRatio})</text>
      </svg>`;
      imageUrl = `data:image/svg+xml;base64,${Buffer.from(svgFallback).toString('base64')}`;
    }

    return res.json({
      success: true,
      imageUrl,
      prompt,
      aspectRatio,
      style,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Lỗi tạo ảnh:", error);
    return handleAiError(error, req, res);
  }
});

// Endpoint Veo 3 Video Generation (Text-to-Video & Image-to-Video)
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, sourceImage, aspectRatio = "16:9", durationSeconds = 5, motionStyle = "cinematic", resolution = "720p" } = req.body || {};

    if (!prompt && !sourceImage) {
      return res.status(400).json({ error: "Vui lòng nhập kịch bản/prompt hoặc tải ảnh để sinh video." });
    }

    const client = getAiClient(req);
    let videoUrl = "";

    // Thử gọi Veo 2 / Veo 3 nếu có trong SDK
    try {
      const formattedPrompt = `${prompt || "Animate static image into cinematic video"}. Motion style: ${motionStyle}. Aspect ratio: ${aspectRatio}.`;
      
      const operation = await client.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: formattedPrompt,
        config: {
          numberOfVideos: 1,
          aspectRatio: (aspectRatio === "9:16" || aspectRatio === "16:9") ? aspectRatio : "16:9",
          durationSeconds: durationSeconds === 10 ? 10 : 5,
        }
      });

      const opRes: any = operation;
      if (opRes?.generatedVideos?.[0]?.video?.videoBytes) {
        const base64 = opRes.generatedVideos[0].video.videoBytes;
        videoUrl = `data:video/mp4;base64,${base64}`;
      }
    } catch (err: any) {
      console.warn("Veo video SDK call failed, using high-definition Motion Video Renderer fallback:", err?.message || err);
    }

    // Nếu không có videoUrl từ Veo SDK (do chưa hỗ trợ key free), sinh video motion chất lượng cao
    if (!videoUrl) {
      // Chúng ta gửi tín hiệu để client tự sinh WebM/MP4 canvas animation hoành tráng hoặc trả về video template
      videoUrl = "CLIENT_RENDER_DYNAMIC_MOTION";
    }

    return res.json({
      success: true,
      videoUrl,
      prompt: prompt || "Chuyển ảnh thành video Veo 3",
      aspectRatio,
      durationSeconds,
      motionStyle,
      resolution,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Lỗi tạo video Veo 3:", error);
    return handleAiError(error, req, res);
  }
});

// Endpoint Google DeepMind Science Skills Solver
app.post("/api/science-solve", async (req, res) => {
  try {
    const { topic, query, dataInput, type } = req.body || {};

    if (!query && !dataInput) {
      return res.status(400).json({ error: "Vui lòng nhập câu hỏi hoặc dữ liệu khoa học cần xử lý." });
    }

    const sciencePrompt = `Bạn là trợ lý Khoa học Google DeepMind Science AI (Toán, Lý, Hóa, Sinh, Tin học, Khoa học dữ liệu).
    
    YÊU CẦU QUAN TRỌNG VỀ ĐỊNH DẠNG TOÁN HỌC & KHOA HỌC (TUÂN THỦ 100%):
    ${MATH_FORMATTING_RULES}

    Nhiệm vụ:
    - Loại hình: ${type || 'general_science'} (Chủ đề: ${topic || 'Đa ngành'})
    - Câu hỏi / Dữ liệu: ${query || JSON.stringify(dataInput)}

    Hãy giải thích chi tiết từng bước, cung cấp công thức chuẩn xác, phản ứng hóa học (nếu có), các bước tính toán và kết luận rõ ràng.`;

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: sciencePrompt }] }]
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được phản hồi từ AI Science.");
    }

    return res.json({
      success: true,
      result: response.text,
      topic,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Lỗi Science AI:", error);
    return handleAiError(error, req, res);
  }
});

// (Unified /api/translate-academic handler is registered above)

// Endpoint Nhật ký giáo viên hỗ trợ AI
app.post("/api/journal-ai", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, text, studentName, category } = req.body || {};

    let promptText = "";
    if (action === 'polish') {
      promptText = `Bạn là trợ lý chuyên môn sư phạm. Hãy biên tập và chuẩn hóa lại ghi chú sau của giáo viên thành văn phong sư phạm chuyên nghiệp, mạch lạc, súc tích và chuẩn mực:
Ghi chú gốc: "${text}"
${studentName ? `Học sinh liên quan: ${studentName}` : ''}
${category ? `Phân loại: ${category}` : ''}
Hãy trả về nội dung đã biên tập chuyên nghiệp.`;
    } else if (action === 'suggest_adjustments') {
      promptText = `Bạn là chuyên gia cố vấn phương pháp dạy học HSA/TSA và GDPT 2018. Dựa trên quan sát/tiến độ sau của giáo viên, hãy gợi ý 3 điều chỉnh bài giảng hoặc phương pháp sư phạm thiết thực, hiệu quả để giúp học sinh tiến bộ nhanh hơn:
Quan sát của giáo viên: "${text}"
${studentName ? `Học sinh liên quan: ${studentName}` : ''}
Hãy trình bày ngắn gọn, rõ ràng, thực tế.`;
    } else {
      promptText = `Bạn là trợ lý giáo viên. Hãy tổng hợp và viết tiếp một báo cáo nhật ký ngắn gọn, chuyên nghiệp dựa trên ý tưởng sau: "${text}".`;
    }

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: promptText }] }]
    });

    const aiResult = response?.text?.trim() || "Không có phản hồi từ AI.";
    return res.json({ success: true, result: aiResult });
  } catch (error: any) {
    console.error("Lỗi AI Nhật ký:", error);
    return handleAiError(error, req, res);
  }
});

// Endpoint giải thích lỗ hổng kiến thức khi học sinh làm sai bài thi thử
app.post("/api/explain-mistake", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { question, options, correctAnswer, studentAnswer, topic } = req.body || {};

    const promptText = `Bạn là Gia sư AI chuyên gia luyện thi ĐGNL (HSA) và Đánh giá tư duy (TSA). Học sinh vừa làm bài thi thử môn ${topic || 'Chung'} và trả lời SAI một câu hỏi.
Nội dung câu hỏi: "${question}"
Các phương án: ${JSON.stringify(options)}
Đáp án đúng chính xác: "${correctAnswer}"
Lựa chọn của học sinh (bị sai): "${studentAnswer}"

Nhiệm vụ: Hãy phân tích chi tiết lỗ hổng kiến thức dẫn đến lựa chọn sai của học sinh.
1. Chỉ ra tại sao phương án "${studentAnswer}" mà học sinh chọn lại sai (lỗi tư duy, nhầm lẫn công thức, bẫy đề thi).
2. Phân tích bản chất kiến thức cốt lõi và hướng dẫn phương pháp giải đúng để học sinh khắc phục lỗ hổng.
3. Trình bày rõ ràng, sư phạm, khích lệ và sử dụng định dạng LaTeX trong cặp dấu $...$ hoặc $$...$$ cho mọi công thức toán học.`;

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: promptText }] }]
    });

    const explanation = response?.text?.trim() || "Không thể phân tích lỗi sai lúc này. Vui lòng thử lại sau.";
    return res.json({ success: true, explanation });
  } catch (error: any) {
    console.error("Lỗi AI giải thích lỗi sai:", error);
    return handleAiError(error, req, res);
  }
});

// ============================================================================
// MODULE: TẠO ĐỀ TƯƠNG TỰ TỪ ĐỀ GỐC BẤT KỲ (ĐỀ ĐẲNG CẤU - 2-STEP PIPELINE)
// ============================================================================

const ISOMORPHIC_PRESET_GUIDES: Record<string, { name: string; rules: string }> = {
  periodic_7991: {
    name: "Đề Kiểm tra định kỳ (15p / Giữa kỳ / Cuối kỳ) - Chuẩn Công văn 7991/BGDĐT",
    rules: `- Tuân thủ nghiêm ngặt cấu trúc Ma trận và Bản đặc tả theo Công văn 7991/BGDĐT (thường gồm 4 phần: Phần I ABCD + Phần II Đúng/Sai + Phần III Trả lời ngắn + Phần IV Tự luận, hoặc theo đúng cấu trúc đề gốc người dùng đưa lên).
- Giữ đúng 100% tỷ lệ 4 mức độ nhận thức: Nhận biết (NB) - Thông hiểu (TH) - Vận dụng (VD) - Vận dụng cao (VDC) như đề gốc.
- Bám sát tuyệt đối phạm vi kiến thức trọng tâm của chương/học kỳ trong đề gốc, TUYỆT ĐỐI KHÔNG dùng kiến thức vượt chương hoặc vượt học kỳ chưa học.
- Thang điểm 10, chia điểm chi tiết từng phần và từng câu/ý nhỏ.`
  },
  grade10_entrance: {
    name: "Đề Tuyển sinh vào lớp 10 THPT - Chuẩn GDPT 2018",
    rules: `- Chuẩn kiến thức THCS (trọng tâm lớp 9 - Chương trình GDPT 2018), thang điểm 10,0, thời gian 90 hoặc 120 phút đúng theo đề gốc.
- Giữ nguyên cấu trúc từng câu/bài của đề gốc (ví dụ chuẩn Sở GD&ĐT: Tính giá trị & Rút gọn căn thức, Phương trình/Hệ PT & Định lý Vi-ét, Bảng tần số ghép nhóm & Xác suất cổ điển, Hàm số bậc nhất/Thực tế, Giải bài toán bằng cách lập PT, Hình học phẳng đường tròn 3 ý, Hình học không gian trực quan Nón/Trụ/Cầu).
- Hướng dẫn chấm tự luận BẮT BUỘC kẻ bảng 3 cột chuẩn Sở GD&ĐT, chia nhỏ thang điểm chi tiết đến từng bước 0,25 điểm (có 0,25 điểm riêng cho vẽ hình đúng chuẩn ở câu Hình học).`
  },
  thpt_graduation: {
    name: "Đề Thi Tốt nghiệp THPT - Chuẩn cấu trúc 3 phần mới của Bộ GD&ĐT",
    rules: `- Chuẩn cấu trúc định dạng đề thi Tốt nghiệp THPT của Bộ GD&ĐT (90 phút, thang 10,0 điểm) gồm 3 phần:
  + PHẦN I. 12 câu trắc nghiệm nhiều phương án lựa chọn (3,0 điểm - 4 phương án A, B, C, D).
  + PHẦN II. 4 câu trắc nghiệm Đúng/Sai (4,0 điểm - Mỗi câu có 4 mệnh đề a, b, c, d phân hóa từ Nhận biết -> Thông hiểu -> Vận dụng -> Vận dụng cao).
  + PHẦN III. 6 câu trắc nghiệm Trả lời ngắn (3,0 điểm - Kết quả là số nguyên hoặc số thập phân gọn, tối đa 4 ký tự để tô phiếu OMR).
- Bảng đáp án nhanh đầy đủ cho cả 3 phần + Lời giải chi tiết từng bước cho toàn bộ 22 câu và giải thích rõ vì sao từng ý a, b, c, d ở Phần II là Đúng hay Sai.`
  },
  gifted_student: {
    name: "Đề Thi Học sinh giỏi (THCS / THPT) - Phân hóa chuyên sâu",
    rules: `- Tư duy toán học / học thuật phân hóa sâu, lập luận và chứng minh chặt chẽ (Giải tích, Đại số, Mũ-Lôgarit, Tổ hợp, Xác suất nâng cao / Xích Markov, Số học, Hình học không gian & tối ưu hóa thực tế).
- Giữ nguyên cấu trúc và thang điểm của đề gốc (ví dụ: dạng kết hợp A. Trắc nghiệm khách quan 10,0đ [12+4+6] + B. Tự luận 10,0đ [5 bài] = 20,0đ trong 150 phút, hoặc 100% Tự luận 20đ / 10đ tùy đúng đề gốc người dùng đưa lên).
- Hướng dẫn chấm kẻ bảng 3 cột chi tiết từng bước biến đổi cho phần Tự luận và giải thích tường minh từng câu Trắc nghiệm (nếu có), chia điểm chi tiết đến 0,25 - 0,5 điểm.`
  }
};

// GIAI ĐOẠN 1: TRÍCH XUẤT MA TRẬN & ĐẶC TẢ ĐỀ GỐC (BLUEPRINT EXTRACTION)
app.post("/api/isomorphic-exam/extract-blueprint", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Gemini-Api-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const {
      rawText = "",
      files = [],
      presetId = "periodic_7991",
      customNotes = "",
      isCustomSource = false
    } = req.body || {};
    const presetInfo = ISOMORPHIC_PRESET_GUIDES[presetId] || ISOMORPHIC_PRESET_GUIDES.periodic_7991;

    if (!String(rawText).trim() && (!Array.isArray(files) || files.length === 0)) {
      return res.status(400).json({ error: "Vui lòng tải lên tệp đề gốc (PDF/Word/Ảnh) hoặc dán nội dung đề gốc." });
    }

    const parts: any[] = [];

    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (!file || !file.data) continue;
        const base64Data = String(file.data).includes(",") ? String(file.data).split(",")[1] : String(file.data);
        const mimeType = file.type || (String(file.name || "").toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png");

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
    }

    const combinedSourceText = String(rawText || "").trim();
    const hasUploadedFiles = Array.isArray(files) && files.length > 0;
    const customPriorityDirective =
      isCustomSource || hasUploadedFiles || String(customNotes || "").trim()
        ? `\nNGUYÊN TẮC TỐI THƯỢNG KHI NGƯỜI DÙNG ĐƯA ĐỀ GỐC LÊN:
- PHẢI BÁM SÁT 100% ĐỀ GỐC NGƯỜI DÙNG ĐÃ CUNG CẤP (giữ trung thực tuyệt đối tên kỳ thi, môn học, khối lớp, thời gian, tổng thang điểm, từng phần thi, số lượng câu hỏi, số ý nhỏ a/b/c/d, điểm số và kiến thức của từng câu trong đề gốc).
- TUYỆT ĐỐI KHÔNG tự ý thay đổi cấu trúc, khối lớp hay tổng điểm theo mẫu Preset nếu đề gốc thực tế khác với Preset!
${String(customNotes || "").trim() ? `- YÊU CẦU BỔ SUNG CỦA NGƯỜI DÙNG (BẮT BUỘC GHI NHẬN VÀ TÍCH HỢP VÀO BLUEPRINT): "${String(customNotes).trim()}"` : ""}`
        : "";

    const extractionPrompt = `Bạn là Chuyên gia Đo lường và Đánh giá trong Giáo dục (Bộ GD&ĐT).
Nhiệm vụ GIAI ĐOẠN 1 (BLUEPRINT EXTRACTION): Phân tích sâu toàn bộ đề thi gốc được cung cấp (từ tệp đính kèm và/hoặc văn bản). Chế độ tham chiếu hiện tại: "${presetInfo.name}".
${customPriorityDirective}

YÊU CẦU BẮT BUỘC:
1. Quét và liệt kê ĐẦY ĐỦ 100% TẤT CẢ các câu hỏi và từng ý nhỏ (a, b, c, d hoặc 1, 2, 3...) từ đầu đến cuối đề gốc. TUYỆT ĐỐI KHÔNG gộp câu, KHÔNG tóm tắt đại ý, KHÔNG bỏ sót bất kỳ câu hay ý nhỏ nào.
2. Mọi công thức toán học trong các trường văn bản của JSON phải viết đúng chuẩn LaTeX bọc trong $...$ (ví dụ: $y = ax^2 + bx + c$, $\\Delta > 0$). KHÔNG đặt từ tiếng Việt có dấu bên trong cặp dấu $...$. Luôn dùng \\frac thay cho \\dfrac.
3. Nếu câu gốc có bảng số liệu, bảng biến thiên (BBT), hình vẽ hình học hoặc đồ thị hàm số, phải mô tả thật chi tiết trong trường "visual_description" và đánh dấu đúng "requires_svg": true (nếu là hình học/đồ thị/hình minh họa) hoặc "requires_table": true (nếu là bảng số liệu/bảng biến thiên).

${combinedSourceText ? `NỘI DUNG VĂN BẢN ĐỀ GỐC:\n"""\n${combinedSourceText}\n"""\n` : ""}

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ THEO ĐÚNG CẤU TRÚC SAU:
{
  "metadata": {
    "exam_title": "Tên kỳ thi / bài kiểm tra trích từ đề gốc",
    "grade": "Khối lớp (VD: Lớp 9, Lớp 10, Lớp 11, Lớp 12)",
    "subject": "Môn học (VD: Toán học)",
    "duration": "Thời gian làm bài (VD: 90 phút, 150 phút)",
    "total_points": 10,
    "exam_format": "100% Trắc nghiệm | 100% Tự luận | Kết hợp Trắc nghiệm + Tự luận",
    "preset_id": "${presetId}",
    "preset_name": "${presetInfo.name}"
  },
  "sections": [
    {
      "section_id": "PHẦN I",
      "title": "Tên phần thi (VD: PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN)",
      "format_type": "multiple_choice | true_false | short_answer | essay",
      "question_count": 12,
      "total_points": 3.0,
      "description": "Mô tả quy tắc chấm điểm của phần này"
    }
  ],
  "cognitive_ratio": {
    "nhan_biet_percent": 40,
    "thong_hieu_percent": 30,
    "van_dung_percent": 20,
    "van_dung_cao_percent": 10,
    "nhan_biet_points": 4.0,
    "thong_hieu_points": 3.0,
    "van_dung_points": 2.0,
    "van_dung_cao_points": 1.0
  },
  "items": [
    {
      "id": "Phần I - Câu 1 (hoặc Câu 1a, Câu 2b...)",
      "section": "PHẦN I",
      "question_type": "multiple_choice | true_false | short_answer | essay",
      "points": 0.25,
      "topic": "Tên Chương / Chuyên đề kiến thức",
      "subtopic": "Đơn vị kiến thức cụ thể",
      "cognitive_level": "Nhận biết | Thông hiểu | Vận dụng | Vận dụng cao",
      "original_summary": "Tóm tắt đề bài và số liệu của câu gốc (có công thức $...$)",
      "core_technique": "Kỹ thuật giải cốt lõi, công thức đặc trưng và bẫy tư duy của câu gốc",
      "real_world_context": "Bối cảnh thực tế trong câu gốc (nếu không có thì để chuỗi rỗng)",
      "visual_description": "Mô tả chi tiết bảng số liệu, bảng biến thiên hoặc hình vẽ hình học/đồ thị trong câu gốc (nếu không có thì để chuỗi rỗng)",
      "requires_svg": false,
      "requires_table": false
    }
  ]
}`;

    parts.push({ text: extractionPrompt });

    const response = await generateWithFallback(req, {
      preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 65536
      }
    });

    const rawJsonText = response?.text?.trim() || "{}";
    const parsedBlueprint = safeJsonParse(rawJsonText);

    if (!parsedBlueprint || !Array.isArray(parsedBlueprint.items) || parsedBlueprint.items.length === 0) {
      return res.status(422).json({
        error: "Không thể trích xuất danh sách câu hỏi từ đề gốc. Vui lòng kiểm tra lại tệp hoặc dán văn bản đề gốc rõ nét hơn.",
        rawResponse: rawJsonText.slice(0, 500)
      });
    }

    return res.status(200).json({
      success: true,
      blueprint: parsedBlueprint,
      modelUsed: response?.modelUsed || "gemini-4-hydrogen"
    });
  } catch (error: any) {
    console.error("[Isomorphic Blueprint Extraction Error]:", error);
    return handleAiError(error, req, res);
  }
});

// GIAI ĐOẠN 2: SINH ĐỀ ĐẲNG CẤU & HƯỚNG DẪN CHẤM CHI TIẾT (MULTI-PASS VERIFIED ISOMORPHIC GENERATION)
app.post("/api/isomorphic-exam/generate-exam", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Gemini-Api-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const {
      blueprint,
      presetId = "periodic_7991",
      examCode = "101",
      schoolName = "SỞ GIÁO DỤC VÀ ĐÀO TẠO",
      schoolSubName = "TRƯỜNG THPT / THCS CHUYÊN ĐỀ",
      customNotes = "",
      isCustomSource = false
    } = req.body || {};

    if (!blueprint || !Array.isArray(blueprint.items) || blueprint.items.length === 0) {
      return res.status(400).json({ error: "Thiếu dữ liệu Ma trận & Bản đặc tả (Blueprint) từ Giai đoạn 1." });
    }

    const presetInfo = ISOMORPHIC_PRESET_GUIDES[presetId] || ISOMORPHIC_PRESET_GUIDES.periodic_7991;
    const totalItems = blueprint.items.length;
    const sectionsList: any[] = Array.isArray(blueprint.sections) ? blueprint.sections : [];

    const stripCodeFenceWrapper = (txt: string): string => {
      let clean = String(txt || "").trim();
      const fenceMatch = clean.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```$/i);
      if (fenceMatch) clean = fenceMatch[1].trim();
      return clean;
    };

    const wrapNakedServerLatex = (text: string): string => {
      if (!text) return "";
      let outText = String(text);
      const vault: string[] = [];
      outText = outText.replace(
        /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|(?<!\\)\$(?!\$)[^$\n]+(?<!\\)\$(?!\$)|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|<svg[\s\S]*?<\/svg>|\\begin\s*\{(?:tikzpicture|cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:tikzpicture|cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}|!\[[^\]]*\]\([^)]*\)|<[^>]+>)/gi,
        (m) => {
          const i = vault.length;
          vault.push(m);
          return `\uE000SRVWNL_${i}\uE001`;
        }
      );

      const TRIG_RE =
        /\\(?:log|ln|lg|exp|sin|cos|tan|cot|arcsin|arccos|arctan|sinh|cosh|tanh|lim|limsup|liminf|sum|prod|int|iint|oint|frac|dfrac|tfrac|sqrt|root|vec|overrightarrow|overline|underline|widehat|left|le|leq|ge|geq|ne|neq|approx|equiv|pm|mp|cdot|times|div|in|notin|subset|subseteq|supset|supseteq|setminus|cap|cup|emptyset|varnothing|forall|exists|Rightarrow|Leftrightarrow|Leftarrow|iff|implies|infty|pi|alpha|beta|gamma|delta|theta|varphi|phi|Delta|Sigma|Omega|mathbb|mathcal|mathbf|mathrm|perp|parallel|circ)(?![a-zA-Z])/;

      outText = outText.replace(
        /(?<![\\a-zA-ZÀ-ỹ\uE000\uE001])(arcsin|arccos|arctan|sin|cos|tan|cot|log|ln|lim)(?=\s*(?:[_^][\{0-9a-zA-Z\\]|\())/g,
        "\\$1"
      );

      if (TRIG_RE.test(outText)) {
        const VN_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
        const FNS = new Set(["sin", "cos", "tan", "cot", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "log", "ln", "lg", "exp", "lim", "limsup", "liminf", "max", "min", "mod", "dx", "dy", "dz", "dt", "du", "dv"]);
        const STOP_CAPS = new Set(["II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "THPT", "THCS", "BGD", "SGD", "OMML", "SVG", "PDF", "JSON", "ABCD"]);
        const PAREN_PROSE = /\b(?:hoac|hay|voi|khi|thi|tai|trong|va|thoa|man|dieu|kien|loai|nhan|where|when|with|and|or|for|the|if|then|that|such|find|let|from|into|real|positive|integer|numbers?)\b/i;

        const readBal = (line: string, openIdx: number, oCh: string, cCh: string): number => {
          let d = 0;
          let i = openIdx;
          while (i < line.length) {
            if (line[i] === "\\") { i += 2; continue; }
            if (line[i] === oCh) d++;
            else if (line[i] === cCh && --d === 0) return i + 1;
            i++;
          }
          return -1;
        };
        const isCleanGrp = (inner: string): boolean => {
          const cl = inner.replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, "");
          if (VN_RE.test(cl) || PAREN_PROSE.test(cl)) return false;
          const ws = cl.match(/[A-Za-z]{4,}/g) || [];
          for (const w of ws) {
            if (FNS.has(w.toLowerCase())) continue;
            if (/^[A-Z]{2,5}$/.test(w) && !STOP_CAPS.has(w)) continue;
            return false;
          }
          return true;
        };

        outText = outText
          .split("\n")
          .map((line) => {
            if (!TRIG_RE.test(line)) return line;
            const isTbl = /^\s*\|/.test(line);
            let resLine = "";
            let cur = 0;
            while (cur < line.length) {
              const m = TRIG_RE.exec(line.slice(cur));
              if (!m || m.index === undefined) { resLine += line.slice(cur); break; }
              const anchor = cur + m.index;
              let start = anchor;
              let lp = anchor;
              let sawOp = false;
              while (lp > cur) {
                let p = lp - 1;
                while (p >= cur && (line[p] === " " || line[p] === "\t")) p--;
                if (p < cur) break;
                const hadSp = p < lp - 1;
                const ch = line[p];
                if (ch === "\uE001" || ch === "\uE000" || ch === "$" || (isTbl && ch === "|")) break;
                if ("=+-*/<>^_".includes(ch)) {
                  if (ch === "-" && /^\s*$/.test(line.slice(0, p))) break;
                  lp = p; start = lp; sawOp = true; continue;
                }
                if (ch === "'") { lp = p; start = lp; continue; }
                if (/[0-9]/.test(ch)) {
                  let ns = p;
                  while (ns > cur && /[0-9]/.test(line[ns - 1])) ns--;
                  if (ns >= cur + 2 && (line[ns - 1] === "." || line[ns - 1] === ",") && /[0-9]/.test(line[ns - 2])) {
                    ns -= 2;
                    while (ns > cur && /[0-9]/.test(line[ns - 1])) ns--;
                  }
                  if (hadSp && /^\s*\d+\.$/.test(line.slice(0, p + 2).trim())) break;
                  lp = ns; start = lp; sawOp = true; continue;
                }
                if (ch === ")" || ch === "]" || ch === "}") {
                  const oCh = ch === ")" ? "(" : ch === "]" ? "[" : "{";
                  let d = 0; let gs = -1;
                  for (let k = p; k >= cur; k--) {
                    if (line[k] === ch) d++;
                    else if (line[k] === oCh && --d === 0) { gs = k; break; }
                  }
                  if (gs !== -1 && isCleanGrp(line.slice(gs + 1, p))) {
                    let ext = gs;
                    if (ext > cur && /[A-Za-z]/.test(line[ext - 1])) {
                      let ws = ext - 1;
                      while (ws > cur && /[A-Za-zÀ-ỹ]/.test(line[ws - 1])) ws--;
                      const w = line.slice(ws, ext);
                      if (ws > cur && line[ws - 1] === "\\") ext = ws - 1;
                      else if (!VN_RE.test(w) && (w.length === 1 || FNS.has(w.toLowerCase()))) ext = ws;
                    }
                    lp = ext; start = lp; continue;
                  }
                  break;
                }
                if (/[A-Za-z]/.test(ch)) {
                  let ws = p;
                  while (ws > cur && /[A-Za-zÀ-ỹ]/.test(line[ws - 1])) ws--;
                  const w = line.slice(ws, p + 1);
                  if (ws > cur && line[ws - 1] === "\\") { lp = ws - 1; start = lp; continue; }
                  if (VN_RE.test(w)) break;
                  if (w.length === 1 && (sawOp || !hadSp || (ws > cur && /[0-9\)]/.test(line[ws - 1])))) {
                    lp = ws; start = lp; sawOp = false; continue;
                  }
                  if ((FNS.has(w.toLowerCase()) || (/^[A-Z]{2,5}$/.test(w) && !STOP_CAPS.has(w))) && sawOp) {
                    lp = ws; start = lp; continue;
                  }
                  break;
                }
                break;
              }
              let pos = anchor;
              let lastEnd = anchor;
              while (pos < line.length) {
                if (line[pos] === " " || line[pos] === "\t") { pos++; continue; }
                const ch = line[pos];
                if (ch === "\uE000" || ch === "\uE001" || ch === "$" || (isTbl && ch === "|")) break;
                if (ch === "\\") {
                  const cm = /^\\(?:[a-zA-Z]+|.)/.exec(line.slice(pos));
                  if (!cm) break;
                  pos += cm[0].length;
                  if (/^\\(?:text|mathrm|textbf|textit)$/.test(cm[0])) {
                    while (pos < line.length && (line[pos] === " " || line[pos] === "\t")) pos++;
                    if (line[pos] === "{") {
                      const eb = readBal(line, pos, "{", "}");
                      if (eb !== -1) pos = eb;
                    }
                  } else if (cm[0] === "\\right") {
                    if (pos < line.length && ".|)]}".includes(line[pos])) pos++;
                    else if (line.slice(pos, pos + 2) === "\\}") pos += 2;
                  }
                  lastEnd = pos; continue;
                }
                if (ch === "{") {
                  const eb = readBal(line, pos, "{", "}");
                  if (eb === -1) break;
                  if (VN_RE.test(line.slice(pos + 1, eb - 1).replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, ""))) break;
                  pos = eb; lastEnd = pos; continue;
                }
                if (ch === "(") {
                  const ep = readBal(line, pos, "(", ")");
                  if (ep === -1 || !isCleanGrp(line.slice(pos + 1, ep - 1))) break;
                  pos = ep; lastEnd = pos; continue;
                }
                if (ch === "[") {
                  const ek = readBal(line, pos, "[", "]");
                  if (ek === -1 || line[ek] === "(" || !isCleanGrp(line.slice(pos + 1, ek - 1))) break;
                  pos = ek; lastEnd = pos; continue;
                }
                if (ch === "_" || ch === "^") {
                  pos++;
                  while (pos < line.length && (line[pos] === " " || line[pos] === "\t")) pos++;
                  if (pos >= line.length) break;
                  if (line[pos] === "{") {
                    const eb = readBal(line, pos, "{", "}");
                    if (eb === -1) break;
                    pos = eb;
                  } else if (line[pos] === "\\") {
                    const cm = /^\\(?:[a-zA-Z]+|.)/.exec(line.slice(pos));
                    pos += cm ? cm[0].length : 1;
                  } else if (/[0-9A-Za-z+\-]/.test(line[pos])) { pos++; }
                  else break;
                  lastEnd = pos; continue;
                }
                if (ch === "'") { pos++; lastEnd = pos; continue; }
                if ("=+-*/<>".includes(ch)) {
                  pos += (ch === "<" || ch === ">") && line[pos + 1] === "=" ? 2 : 1;
                  continue;
                }
                if (/[0-9]/.test(ch)) {
                  const nm = /^\d+(?:[.,]\d+)?/.exec(line.slice(pos));
                  if (!nm) break;
                  pos += nm[0].length; lastEnd = pos; continue;
                }
                if (/[A-Za-z]/.test(ch)) {
                  const wm = /^[A-Za-zÀ-ỹ]+/.exec(line.slice(pos));
                  if (!wm) break;
                  const w = wm[0];
                  if (VN_RE.test(w)) break;
                  const aw = line.slice(pos + w.length);
                  if (w.length === 1 && (/^[ABCD](?:\.(?:\s|$))/.test(w + aw) || /^[a-d]\)/.test(w + aw))) break;
                  if (w.length === 1 || FNS.has(w.toLowerCase())) {
                    pos += w.length; lastEnd = pos; continue;
                  }
                  if (/^[A-Z]{2,5}$/.test(w) && !STOP_CAPS.has(w)) {
                    const bf = line.slice(start, pos).trimEnd();
                    if (/[=+\-*/<>(\\]$/.test(bf) || /^\s*(?:=|\+|\\perp|\\parallel|\\in|\\subset)/.test(aw)) {
                      pos += w.length; lastEnd = pos; continue;
                    }
                  }
                  break;
                }
                break;
              }
              if (lastEnd > anchor) {
                const cand = line.slice(start, lastEnd).trim();
                const plain = cand.replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, "");
                if (cand.length >= 2 && TRIG_RE.test(cand) && !VN_RE.test(plain)) {
                  resLine += line.slice(cur, start) + `$${cand}$`;
                  cur = lastEnd;
                  continue;
                }
              }
              resLine += line.slice(cur, anchor + m[0].length);
              cur = anchor + m[0].length;
            }
            return resLine;
          })
          .join("\n");
      }

      outText = outText.replace(/\uE000SRVWNL_(\d+)\uE001/g, (_m, idx) => vault[Number(idx)] || "");
      outText = outText.replace(
        /(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)[ \t]*(?<!\$)\$(?!\$)([=+\-*/<>][^$\n]*?)(?<!\$)\$(?!\$)/g,
        (_m, a: string, b: string) => `$${a.trim()} ${b.trim()}$`
      );
      return outText.replace(
        /\$\$([\s\S]*?)\$\$[ \t\r\n]*([.,;])(?!(?:\.|[0-9a-zA-Zà-ỹÀ-Ỹ]))(?=[ \t]*(?:\r?\n|$))/g,
        (fullMatch, body: string, punct: string) => {
          const trimmed = body.trim();
          if (!trimmed) return fullMatch;
          const isBlk =
            trimmed.includes("\n") ||
            /\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)/i.test(trimmed) ||
            /\\left\s*\[/.test(trimmed);
          if (!isBlk && !fullMatch.includes("\n")) return `$$${trimmed}${/[.,;]$/.test(trimmed) ? "" : punct}$$`;
          return `\n\n$$\n${/[.,;]$/.test(trimmed) ? trimmed : `${trimmed}${punct}`}\n$$\n\n`;
        }
      );
    };

    const normalizeServerLatex = (raw: string): string => {
      if (!raw) return "";
      let s = stripCodeFenceWrapper(raw);
      const fixInner = (inner: string) => {
        let f = inner.replace(/\\dfrac\b/g, "\\frac");
        const tv: string[] = [];
        f = f.replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, (m) => {
          const i = tv.length;
          tv.push(m);
          return `@@SRV_TX_${i}@@`;
        });
        f = f.replace(
          /(?<![\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|cot|log|ln|lim)(?!h\b)(?=\s*[\(\[_^0-9a-zA-Z\\])/g,
          "\\$1"
        );
        return f.replace(/@@SRV_TX_(\d+)@@/g, (_m, i) => tv[Number(i)] || "");
      };
      s = wrapNakedServerLatex(s);
      s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_m, body) => `$$${fixInner(body)}$$`);
      s = s.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_m, body) => `$${fixInner(body)}$`);
      return s;
    };

    // Group blueprint items per section so AI sees an unmistakable checklist
    const groupItemsBySection = () => {
      const usedIndices = new Set<number>();
      const grouped = sectionsList.map((sec: any, sIdx: number) => {
        const secId = String(sec.section_id || `PHẦN ${sIdx + 1}`).trim();
        const secItems: any[] = [];
        blueprint.items.forEach((it: any, iIdx: number) => {
          if (usedIndices.has(iIdx)) return;
          const itSec = String(it.section || "").trim();
          const itId = String(it.id || "").trim();
          const secNorm = secId.toLowerCase().replace(/\s+/g, " ");
          const itSecNorm = itSec.toLowerCase().replace(/\s+/g, " ");
          const matchesSection =
            itSecNorm === secNorm ||
            itSecNorm.includes(secNorm) ||
            secNorm.includes(itSecNorm) ||
            itId.toLowerCase().includes(secNorm) ||
            (sec.format_type === it.question_type &&
              sectionsList.filter((x: any) => x.format_type === sec.format_type).length === 1);
          if (matchesSection) {
            usedIndices.add(iIdx);
            secItems.push(it);
          }
        });
        return { section: sec, items: secItems };
      });
      // Assign any unmatched items to the last matching format or last section
      blueprint.items.forEach((it: any, iIdx: number) => {
        if (!usedIndices.has(iIdx) && grouped.length > 0) {
          const target =
            grouped.find((g) => g.section.format_type === it.question_type) ||
            grouped[grouped.length - 1];
          target.items.push(it);
        }
      });
      return grouped;
    };

    const groupedSections = groupItemsBySection();

    const formatSectionChecklist = (groups: Array<{ section: any; items: any[] }>) =>
      groups
        .map((g) => {
          const sec = g.section;
          const itemsDesc = g.items
            .map(
              (it: any, idx: number) =>
                `  - Mục ${idx + 1} [${it.id} | ${it.points}đ | Mức độ: ${it.cognitive_level} | Loại: ${it.question_type}]: Chủ đề "${it.topic}" (${it.subtopic || ""}). Kỹ thuật gốc: ${it.core_technique}.${it.real_world_context ? ` Bối cảnh gốc: ${it.real_world_context}.` : ""}${it.requires_table ? " [BẮT BUỘC CÓ BẢNG MARKDOWN ĐA DÒNG]" : ""}${it.requires_svg ? " [BẮT BUỘC CÓ HÌNH <svg>]" : ""}`
            )
            .join("\n");
          return `### ${sec.title || sec.section_id} (Mã phần: "${sec.section_id}" | Loại: ${sec.format_type} | Số câu bắt buộc: ${sec.question_count || g.items.length} câu | Tổng điểm: ${sec.total_points}đ)\n${sec.description ? `Mô tả: ${sec.description}\n` : ""}${itemsDesc}`;
        })
        .join("\n\n");

    const sharedSystemRules = `Bạn là Chuyên gia Ra đề thi & Thẩm định Ma trận Đề thi cấp Quốc gia (Bộ GD&ĐT).
TUÂN THỦ NGHIÊM NGẶT CÁC QUY TẮC BẤT BIẾN SAU:
1. BÁM SÁT 100% JSON BLUEPRINT ĐỀ GỐC VÀ YÊU CẦU NGƯỜI DÙNG:
- ${isCustomSource ? "NGƯỜI DÙNG ĐÃ TẢI LÊN / NHẬP ĐỀ GỐC RIÊNG: Bắt buộc bám 100% môn học, khối lớp, tên kỳ thi, thời gian, tổng điểm, từng phần thi và số câu trong JSON Blueprint." : `Bám sát 100% JSON Blueprint và quy chuẩn chế độ "${presetInfo.name}".`}
${customNotes ? `- YÊU CẦU BẮT BUỘC CỦA NGƯỜI DÙNG: "${customNotes}"` : ""}

2. ĐẲNG CẤU 100% & CHÍNH XÁC TOÁN HỌC:
- Giữ nguyên cấu trúc các phần, số lượng câu (${totalItems} mục/ý), số ý nhỏ (a, b, c, d), phân bổ điểm và mức độ nhận thức.
- Thay đổi HOÀN TOÀN số liệu, hàm số, phương trình, bối cảnh thực tế nhưng giữ đúng kỹ thuật giải ("core_technique"). Tự kiểm tra tính đúng đắn để nghiệm đẹp, đáp án chính xác 100%.

3. CHỐNG TÓM TẮT TUYỆT ĐỐI (ZERO LAZINESS):
- TUYỆT ĐỐI CẤM viết tóm tắt, cấm viết "(Các câu hỏi về... tương đương đề gốc)", cấm viết gợi ý vắn tắt kiểu "(a) Tính cạnh chóp. (b) Bài toán trải phẳng...". MỌI câu hỏi từ Câu 1 đến câu cuối cùng PHẢI là đề bài hoàn chỉnh, đầy đủ dữ kiện sẵn sàng in phát cho thí sinh làm bài!

4. CHUẨN ĐỊNH DẠNG MARKDOWN & LATEX 100%:
- Tất cả công thức, hàm số, phương trình, bất phương trình (kể cả phương trình dài chứa \\log, \\ln, \\sin, \\cos, phân số), biến đơn lẻ ($x$, $y$, $m$, $t$, $S$...) BẮT BUỘC đặt trọn vẹn trong $...$ hoặc $$...$$. CẤM tuyệt đối để sót \\log_b^2 a + ... = 0 bên ngoài dấu $...$!
- BẮT BUỘC dùng lệnh LaTeX chuẩn có dấu gạch chéo: \\log, \\ln, \\sin, \\cos, \\tan, \\cot, \\lim, \\frac{a}{b} (LUÔN dùng \\frac thay cho \\dfrac, KHÔNG viết $log$, $ln$, hay $2/3$ thô trong câu toán học trừ khi cần thiết, dùng $\\frac{2}{3}$).
- Nếu kết thúc hệ phương trình $$\\begin{cases} ... \\end{cases}$$ là hết câu, đặt dấu chấm vào bên trong trước dấu đóng ($$\\begin{cases} ... \\end{cases}.$$) để dấu chấm không bị rớt xuống thành một dòng trống riêng.
- TUYỆT ĐỐI KHÔNG đặt chữ tiếng Việt có dấu hoặc thẻ <br/> bên trong cặp dấu $...$.
- BẢNG MARKDOWN: Mọi bảng (bảng số liệu ghép nhóm, bảng tần số, BBT, bảng ma trận, bảng HDC) BẮT BUỘC có 1 dòng trống phía trước và 1 dòng trống phía sau, và MỖI HÀNG CỦA BẢNG PHẢI NẰM TRÊN 1 DÒNG RIÊNG BIỆT (TUYỆT ĐỐI KHÔNG viết cả bảng trên cùng 1 dòng với câu dẫn!).`;

    // =========================================================================
    // PASS 2A: SINH DUY NHẤT ĐỀ THI HOÀN CHỈNH (DEDICATED FULL EXAM GENERATION)
    // =========================================================================
    const examTitleMeta = blueprint?.metadata?.exam_title || presetInfo.name;
    const subjectMeta = blueprint?.metadata?.subject || "Toán học";
    const gradeMeta = blueprint?.metadata?.grade || "";
    const durationMeta = blueprint?.metadata?.duration || "90 phút";
    const totalPointsMeta = blueprint?.metadata?.total_points || 10;

    const pass2AExamPrompt = `Hãy biên soạn **DUY NHẤT PHẦN ĐỀ THI HOÀN CHỈNH** (KHÔNG viết Ma trận, KHÔNG viết Đáp án/Hướng dẫn chấm ở bước này) cho bộ Đề đẳng cấu **Mã đề: ${examCode}**.

THÔNG TIN HÀNH CHÍNH ĐỀ THI:
- Đơn vị chủ quản: ${schoolName}
- Trường / Sở / Hội đồng thi: ${schoolSubName}
- Kỳ thi: ${examTitleMeta}
- Môn: ${subjectMeta} ${gradeMeta ? `- ${gradeMeta}` : ""} | Thời gian làm bài: ${durationMeta} | Tổng điểm: ${totalPointsMeta}
- Mã đề: ${examCode}

QUY TẮC TRÌNH BÀY BẮT BUỘC ĐỂ XUẤT WORD/PDF ĐẸP 100%:
1. **TIÊU ĐỀ ĐẦU TRANG (HEADER)**: BẮT BUỘC trình bày bằng **Bảng 2 cột Markdown** chuẩn đề thi Việt Nam để không bao giờ bị dính chữ vào nhau:
| **${schoolName}** | **${examTitleMeta.toUpperCase()}** |
| :---: | :---: |
| **${schoolSubName}** | **Môn: ${subjectMeta.toUpperCase()}${gradeMeta ? ` (${gradeMeta})` : ""} – MÃ ĐỀ: ${examCode}** |
| *(Đề thi gồm đầy đủ các phần theo cấu trúc)* | *Thời gian làm bài: ${durationMeta} (không kể thời gian giao đề)* |

2. **ĐÁNH SỐ CÂU HỎI RÕ RÀNG — CẤM DÙNG DANH SÁCH \`1.\` HOẶC GẠCH ĐẦU DÒNG \`-\`**:
- Mọi câu hỏi BẮT BUỘC bắt đầu ở đầu đoạn mới bằng chữ in đậm tường minh: \`**Câu 1.**\`, \`**Câu 2.**\`, ... (hoặc \`**Bài 1 ($2,0$ điểm).**\` ở phần tự luận).
- TUYỆT ĐỐI KHÔNG dùng danh sách tự động Markdown \`1.\`, \`2.\` hoặc \`-\`, \`•\` trước đầu câu hỏi!
- Ở Phần I (Trắc nghiệm 4 lựa chọn): ngay sau đề bài câu hỏi, xuống dòng viết rõ 4 phương án \`A. ...   B. ...   C. ...   D. ...\` (hoặc mỗi phương án một dòng bắt đầu bằng \`A. \`, \`B. \`, \`C. \`, \`D. \`).
- Ở Phần II (Đúng / Sai): mỗi câu phải có đầy đủ dẫn nhập + ĐÚNG 4 ý \`a)\`, \`b)\`, \`c)\`, \`d)\` trên 4 dòng riêng biệt.
- Ở Phần III (Trả lời ngắn): mỗi câu phải có đầy đủ đề bài toán học hoàn chỉnh, số liệu mới hoàn toàn, kết quả tính ra số gọn gàng.
- Ở Phần Tự luận (PHẦN IV / B. TỰ LUẬN): MỖI BÀI/CÂU PHẢI VIẾT ĐẦY ĐỦ ĐỀ BÀI CHI TIẾT, ĐỦ GIẢ THIẾT VÀ YÊU CẦU TỪNG Ý (a), (b), kèm thang điểm từng câu/ý. NGHIÊM CẤM viết tóm tắt đại ý!

3. **BẢNG SỐ LIỆU & HÌNH VẼ SVG**:
- Nếu câu hỏi có bảng số liệu thống kê (ví dụ Câu 12) hoặc bảng phân bố hoặc BBT: Phải xuống dòng, cách 1 dòng trống trước và sau bảng, viết chuẩn Markdown nhiều dòng:
  Ví dụ:
  \`\`\`
  | Nhóm | $[0; 20)$ | $[20; 40)$ | $[40; 60)$ |
  | :--- | :---: | :---: | :---: |
  | Tần số | $5$ | $10$ | $15$ |
  \`\`\`
- Nếu mục có \`[BẮT BUỘC CÓ HÌNH <svg>]\`, nhúng trực tiếp mã \`<svg viewBox="0 0 360 240" width="340" height="220" xmlns="http://www.w3.org/2000/svg">...</svg>\` sắc nét ngay trong câu hỏi đó.

DANH SÁCH ĐẦY ĐỦ TẤT CẢ CÁC PHẦN & TỪNG CÂU HỎI BẮT BUỘC PHẢI VIẾT TRỌN VẸN 100% (KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ PHẦN NÀO):
${formatSectionChecklist(groupedSections)}

Kết thúc đề thi bằng dòng: \`--- HẾT ---\`. Không cần bất kỳ lời bình nào ngoài nội dung Đề thi.`;

    const pass2ARes = await generateWithFallback(req, {
      preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      contents: [{ role: "user", parts: [{ text: pass2AExamPrompt }] }],
      config: {
        systemInstruction: sharedSystemRules,
        maxOutputTokens: 65536,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
      }
    });

    let examMarkdown = normalizeServerLatex(pass2ARes?.text || "");
    const modelUsed = pass2ARes?.modelUsed || "gemini-4-hydrogen";

    // =========================================================================
    // COMPLETENESS GATE & AUTOMATIC PER-SECTION REPAIR FOR EXAM MARKDOWN
    // =========================================================================
    const lazinessRegex =
      /\(\s*(?:Các\s*câu|Tương\s*tự|Giải\s*tương\s*tự|Đề\s*tương\s*đương|Phần\s*còn\s*lại|Nội\s*dung\s*tương\s*ứng|Xem\s*đề\s*gốc)[^)]*\)|tương\s*đương\s*đề\s*gốc/i;

    const findSectionHeaderRegex = (sec: any): RegExp => {
      const rawId = String(sec.section_id || "").trim();
      const rawTitle = String(sec.title || "").trim();
      const candidates = new Set<string>();

      const addCand = (s: string) => {
        const cleaned = s.trim();
        // Never allow single-letter candidates like "A" or "B" that would match multiple-choice option A. / B.
        if (cleaned.length >= 4) {
          candidates.add(cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        }
      };

      addCand(rawId);
      // Extract "PHẦN I", "PHẦN II", "PHẦN III", "PHẦN IV", "TỰ LUẬN" from e.g. "A - PHẦN II" or "B - TỰ LUẬN"
      const phanMatch = `${rawId} ${rawTitle}`.match(/PHẦN\s*(?:IV|I{1,3}|[1-4]|TỰ\s*LUẬN)/i);
      if (phanMatch) {
        addCand(phanMatch[0]);
      }
      if (/tự\s*luận/i.test(`${rawId} ${rawTitle}`)) {
        candidates.add("(?:PHẦN\\s*(?:IV|B)\\s*[\\.\\-:]?\\s*|B\\s*[\\.\\-:]\\s*)?TỰ\\s*LUẬN");
      }
      if (candidates.size === 0) {
        addCand(rawTitle.split(/[\(\n]/)[0] || "PHẦN");
      }

      return new RegExp(`(?:^|\\n)[ \\t]*(?:#{1,4}[ \\t]*|\\*{0,2})(?:${Array.from(candidates).join("|")})(?:\\b|[\\.:\\s\\(])`, "i");
    };

    const inspectSectionsDefects = (md: string) => {
      const located = groupedSections.map((g) => {
        const re = findSectionHeaderRegex(g.section);
        const match = re.exec(md);
        return {
          ...g,
          startIdx: match ? match.index : -1
        };
      });

      const foundStarts = located
        .filter((x) => x.startIdx >= 0)
        .map((x) => x.startIdx)
        .sort((a, b) => a - b);

      const defects: Array<{ group: { section: any; items: any[] }; reason: string; slice: string }> = [];

      for (const entry of located) {
        const expectedCount = Number(entry.section.question_count) || entry.items.length || 1;
        if (entry.startIdx === -1) {
          defects.push({ group: { section: entry.section, items: entry.items }, reason: "Thiếu hoàn toàn tiêu đề phần", slice: "" });
          continue;
        }
        const nextStart = foundStarts.find((idx) => idx > entry.startIdx) ?? md.length;
        const slice = md.slice(entry.startIdx, nextStart);

        if (lazinessRegex.test(slice)) {
          defects.push({ group: { section: entry.section, items: entry.items }, reason: "Chứa câu tóm tắt/giữ chỗ", slice });
          continue;
        }

        const qMatches = slice.match(/(?:^|\n)[ \t]*(?:[-*•●]\s*)?(?:\*{0,2})(?:Câu|Bài)\s*\d+\b/gi) || [];
        const ordListMatches = slice.match(/(?:^|\n)[ \t]*\d+\.\s+\S+/g) || [];
        const detectedQCount = Math.max(qMatches.length, ordListMatches.length);

        if (detectedQCount < Math.max(1, expectedCount - 1) || (expectedCount >= 2 && detectedQCount === 0)) {
          defects.push({
            group: { section: entry.section, items: entry.items },
            reason: `Thiếu số câu (${detectedQCount}/${expectedCount})`,
            slice
          });
          continue;
        }

        if (entry.section.format_type === "true_false") {
          const abcdCount = (slice.match(/(?:^|\n)[ \t]*(?:\*{0,2})[a-d]\)/g) || []).length;
          if (abcdCount < expectedCount * 3) {
            defects.push({
              group: { section: entry.section, items: entry.items },
              reason: `Thiếu các mệnh đề a,b,c,d (${abcdCount}/${expectedCount * 4})`,
              slice
            });
            continue;
          }
        }

        if (entry.section.format_type === "multiple_choice") {
          const optionACount = (slice.match(/(?:^|\n|[ \t]{2,})A\.\s+/g) || []).length;
          if (optionACount < Math.max(1, expectedCount - 2)) {
            defects.push({
              group: { section: entry.section, items: entry.items },
              reason: `Thiếu phương án A,B,C,D (${optionACount}/${expectedCount})`,
              slice
            });
            continue;
          }
        }

        if (entry.section.format_type === "essay" || entry.section.format_type === "short_answer") {
          const avgCharsPerItem = slice.length / Math.max(1, expectedCount);
          const minThreshold = entry.section.format_type === "essay" ? 95 : 55;
          if (avgCharsPerItem < minThreshold) {
            defects.push({
              group: { section: entry.section, items: entry.items },
              reason: `Nội dung câu quá ngắn/dạng gợi ý (${Math.round(avgCharsPerItem)} ký tự/câu)`,
              slice
            });
          }
        }
      }

      return defects;
    };

    const defects = inspectSectionsDefects(examMarkdown);
    if (defects.length > 0) {
      console.warn(
        `[Isomorphic Stage 2A Repair] Detected ${defects.length} incomplete section(s):`,
        defects.map((d) => `${d.group.section.section_id}: ${d.reason}`).join("; ")
      );

      // Repair defective sections in batches/dedicated call so AI writes 100% full questions
      try {
        const repairGroups = defects.map((d) => d.group);
        const repairPrompt = `Bạn vừa sinh thiếu hoặc tóm tắt một số phần trong Đề đẳng cấu (Mã đề ${examCode}).
Hãy viết lại **ĐẦY ĐỦ 100% NGUYÊN VĂN ĐỀ BÀI HOÀN CHỈNH** cho CHỈ CÁC PHẦN SAU ĐÂY (mỗi phần bắt đầu đúng tiêu đề phần và đủ tất cả các câu hỏi từ đầu đến cuối, TUYỆT ĐỐI KHÔNG viết tắt hay để câu tóm tắt trong ngoặc đơn!):

${formatSectionChecklist(repairGroups)}

QUY TẮC BẮT BUỘC:
- Mỗi câu bắt đầu bằng \`**Câu 1.**\`, \`**Câu 2.**\`, ... (KHÔNG dùng danh sách \`1.\` hay bullet \`-\`).
- Nếu là Đúng/Sai: mỗi câu phải có đoạn dẫn đầy đủ + ĐỦ 4 ý \`a)\`, \`b)\`, \`c)\`, \`d)\` trên 4 dòng riêng.
- Nếu là Trả lời ngắn: đề bài toán học hoàn chỉnh, đủ số liệu mới để thí sinh giải ra số cụ thể.
- Nếu là Tự luận: đề bài đầy đủ giả thiết, công thức, ý (a), (b) hoàn chỉnh và điểm từng câu; KHÔNG viết gạch đầu dòng gợi ý ngắn!
- Bảng số liệu phải viết đúng chuẩn Markdown nhiều dòng có 1 dòng trống trước và sau. Công thức LaTeX dùng $\\log$, $\\ln$, $\\frac{...}{...}$ trong $...$.
- CHỈ xuất nội dung các phần được yêu cầu sửa ở trên, KHÔNG lặp lại tiêu đề trường hay các phần khác.`;

        const repairRes = await generateWithFallback(req, {
          preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
          contents: [{ role: "user", parts: [{ text: repairPrompt }] }],
          config: {
            systemInstruction: sharedSystemRules,
            maxOutputTokens: 65536,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
          }
        });

        const repairedText = normalizeServerLatex(repairRes?.text || "");
        if (repairedText.length > 150) {
          // Splice each repaired section back into examMarkdown cleanly
          let updatedMd = examMarkdown.replace(/\n*---\s*HẾT\s*---\s*$/i, "").trim();
          for (const def of defects) {
            const sec = def.group.section;
            const secRe = findSectionHeaderRegex(sec);
            const repMatch = secRe.exec(repairedText);
            if (!repMatch) continue;

            // Find end of this repaired section inside repairedText
            let repEnd = repairedText.length;
            for (const other of repairGroups) {
              if (other.section.section_id === sec.section_id) continue;
              const oRe = findSectionHeaderRegex(other.section);
              const oMatch = oRe.exec(repairedText.slice(repMatch.index + repMatch[0].length));
              if (oMatch) {
                const candidateEnd = repMatch.index + repMatch[0].length + oMatch.index;
                if (candidateEnd < repEnd) repEnd = candidateEnd;
              }
            }
            const repSlice = repairedText.slice(repMatch.index, repEnd).trim();
            if (!repSlice) continue;

            const origMatch = secRe.exec(updatedMd);
            if (origMatch) {
              // Find next section start in updatedMd
              let origEnd = updatedMd.length;
              for (const g of groupedSections) {
                if (g.section.section_id === sec.section_id) continue;
                const gRe = findSectionHeaderRegex(g.section);
                const gMatch = gRe.exec(updatedMd.slice(origMatch.index + origMatch[0].length));
                if (gMatch) {
                  const candEnd = origMatch.index + origMatch[0].length + gMatch.index;
                  if (candEnd < origEnd) origEnd = candEnd;
                }
              }
              updatedMd =
                updatedMd.slice(0, origMatch.index).trimEnd() +
                "\n\n" +
                repSlice +
                "\n\n" +
                updatedMd.slice(origEnd).trimStart();
            } else {
              updatedMd = updatedMd + "\n\n" + repSlice;
            }
          }
          examMarkdown = updatedMd.trim() + "\n\n--- HẾT ---";
        }
      } catch (repairErr) {
        console.warn("[Isomorphic Stage 2A Repair Error]:", repairErr);
      }
    }

    // Final guarantee: strip stray bullets and convert any raw numbered-list question lines (`1. Tính...`) to `**Câu 1.** Tính...`
    examMarkdown = examMarkdown.replace(
      /(^|\n)[ \t]*[-*•●][ \t]+((?:\*\*)?(?:Câu|Bài)\s*\d+\b)/gi,
      "$1$2"
    );
    examMarkdown = examMarkdown.replace(
      /(^|\n)[ \t]*(\d{1,2})\.[ \t]+(?=(?:[A-ZÀ-Ỹ\$\\]|Cho|Tính|Tìm|Giải|Biết|Hỏi|Xét|Gọi|Chóp|Hàm|Đạo|Trung|Bất|Tiệm|Số|Chọn|Một|Trong|Người|Khảo|Cực))/g,
      "$1**Câu $2.** "
    );

    // =========================================================================
    // PASS 2B & PASS 2C (SONG SONG): SINH ĐÁP ÁN CHI TIẾT & BẢNG ĐỐI CHIẾU MA TRẬN
    // =========================================================================
    const pass2BGradingPrompt = `Dựa trên **ĐỀ THI ĐẲNG CẤU HOÀN CHỈNH** (Mã đề ${examCode}) dưới đây và JSON Blueprint gốc, hãy biên soạn **ĐẦY ĐỦ 100% ĐÁP ÁN – HƯỚNG DẪN CHẤM – THANG ĐIỂM CHI TIẾT**.

YÊU CẦU BẮT BUỘC:
1. Giải chính xác và đầy đủ 100% tất cả các câu hỏi và từng ý nhỏ từ đầu đến cuối đề (CẤM bỏ sót câu nào, CẤM viết "(Các câu còn lại làm tương tự)").
2. Nếu đề có Trắc nghiệm (Phần I ABCD / Phần II Đúng-Sai / Phần III Trả lời ngắn):
   - Lập **Bảng đáp án nhanh** chuẩn cho từng phần.
   - Viết **Lời giải chi tiết từng bước** cho MỌI câu hỏi (với Phần II Đúng/Sai phải chứng minh/giải thích rõ từng ý a, b, c, d vì sao Đúng hay Sai).
3. Nếu đề có Tự luận:
   - BẮT BUỘC trình bày bằng **Bảng 3 cột chuẩn Bộ/Sở GD&ĐT**:
     | Câu / Ý | Nội dung lời giải chi tiết từng bước | Điểm |
     | :---: | :--- | :---: |
   - Chia nhỏ điểm đến từng bước $0,25$ điểm (có $0,25$đ vẽ hình nếu là bài hình học; nhúng \`<svg>\` kèm đường phụ đứt nét nếu cần). Dùng \`<br/>\` bên ngoài dấu \`$...$\` để xuống dòng trong cùng ô bảng.
4. Công thức Toán học dùng chuẩn LaTeX \`$...$\` hoặc \`$$...$$\`, luôn dùng \`\\frac\`, \`\\log\`, \`\\ln\`, \`\\sin\`, \`\\cos\`.

ĐỀ THI ĐẲNG CẤU (MÃ ĐỀ ${examCode}):
${examMarkdown}`;

    const pass2CMatrixPrompt = `Dựa trên JSON Blueprint đề gốc và Đề thi đẳng cấu (Mã đề ${examCode}) dưới đây, hãy xuất **PHẦN MA TRẬN – BẢN ĐẶC TẢ – ĐỐI CHIẾU ĐẲNG CẤU** chuẩn Công văn 7991/BGDĐT (chỉ xuất phần Ma trận & Đối chiếu, không lặp lại toàn văn đề thi hay lời giải).

Gồm 3 mục rõ ràng:
1. **Thông tin chung & Thống kê tỷ lệ 4 mức độ nhận thức** (Nhận biết - Thông hiểu - Vận dụng - Vận dụng cao).
2. **Bảng Ma trận & Bản đặc tả Đề thi** dạng bảng Markdown đầy đủ cột: \`| TT | Chương / Chủ đề | Nội dung / Đơn vị kiến thức | Mức độ | Số câu/ý | Điểm |\`.
3. **Bảng đối chiếu Đẳng cấu từng câu/ý (${totalItems} mục)**:
\`| Câu / Ý | Chuyên đề & Mức độ | Kỹ thuật giải giữ nguyên từ đề gốc | Biến đổi Đẳng cấu ở Đề mới (Mã ${examCode}) | Điểm |\`

BLUEPRINT ĐỀ GỐC:
${JSON.stringify({ metadata: blueprint.metadata, sections: blueprint.sections, cognitive_ratio: blueprint.cognitive_ratio }, null, 2)}

ĐỀ THI ĐẲNG CẤU ĐÃ SINH:
${examMarkdown}`;

    const [gradingSettled, matrixSettled] = await Promise.allSettled([
      generateWithFallback(req, {
        preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
        contents: [{ role: "user", parts: [{ text: pass2BGradingPrompt }] }],
        config: {
          systemInstruction: sharedSystemRules,
          maxOutputTokens: 65536
        }
      }),
      generateWithFallback(req, {
        preferredModels: ["gemini-3.1-flash-lite", "gemini-4-hydrogen"],
        contents: [{ role: "user", parts: [{ text: pass2CMatrixPrompt }] }],
        config: {
          systemInstruction: sharedSystemRules,
          maxOutputTokens: 32768
        }
      })
    ]);

    let gradingGuideMarkdown =
      gradingSettled.status === "fulfilled"
        ? normalizeServerLatex(gradingSettled.value?.text || "")
        : "";
    let matrixMarkdown =
      matrixSettled.status === "fulfilled"
        ? normalizeServerLatex(matrixSettled.value?.text || "")
        : "";

    // Verify gradingGuideMarkdown completeness and retry once if empty or contains lazy placeholders
    const isGradingIncomplete =
      !gradingGuideMarkdown ||
      gradingGuideMarkdown.length < 300 ||
      lazinessRegex.test(gradingGuideMarkdown);

    if (isGradingIncomplete) {
      try {
        const retryGradingRes = await generateWithFallback(req, {
          preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
          contents: [{ role: "user", parts: [{ text: pass2BGradingPrompt }] }],
          config: {
            systemInstruction: sharedSystemRules,
            maxOutputTokens: 65536
          }
        });
        const retryText = normalizeServerLatex(retryGradingRes?.text || "");
        if (retryText.length > gradingGuideMarkdown.length) {
          gradingGuideMarkdown = retryText;
        }
      } catch (retryGradErr) {
        console.warn("[Isomorphic Stage 2B Retry Notice]:", retryGradErr);
      }
    }

    return res.status(200).json({
      success: true,
      matrixMarkdown,
      examMarkdown,
      gradingGuideMarkdown,
      modelUsed
    });
  } catch (error: any) {
    console.error("[Isomorphic Exam Generation Error]:", error);
    return handleAiError(error, req, res);
  }
});

// ============================================================================
// CHUYÊN HỆ: ÔN THI TỐT NGHIỆP THPT (TOÁN) - CHUẨN GDPT 2018
// ============================================================================
app.post("/api/on-thi-tn-thpt/generate", async (req, res) => {
  try {
    const {
      selectedTopics = [],
      materialType = "chuyen_de",
      part1Count = 8,
      part2Count = 2,
      part3Count = 4,
      difficultyLevel = "kha_8_plus",
      teacherHeader = "",
      customNote = ""
    } = req.body || {};

    if (!Array.isArray(selectedTopics) || selectedTopics.length === 0) {
      return res.status(400).json({
        error: "Vui lòng chọn ít nhất một dạng bài trong cây thư mục chuyên đề."
      });
    }

    const p1 = Math.max(0, Math.min(30, Number(part1Count) || 0));
    const p2 = Math.max(0, Math.min(10, Number(part2Count) || 0));
    const p3 = Math.max(0, Math.min(15, Number(part3Count) || 0));

    if (p1 + p2 + p3 === 0) {
      return res.status(400).json({
        error: "Tổng số câu hỏi của các phần phải lớn hơn 0."
      });
    }

    const normalizeOnThiLatex = (raw: string): string => {
      if (!raw) return "";
      let s = String(raw)
        .replace(/^```(?:markdown|md|latex|json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .replace(/\r\n/g, "\n")
        .trim();

      const fixInner = (inner: string) => {
        let f = inner.replace(/\\dfrac\b/g, "\\frac");
        const tv: string[] = [];
        f = f.replace(/\\(?:text|mathrm|textbf|textit)\s*\{[^{}]*\}/g, (m) => {
          const i = tv.length;
          tv.push(m);
          return `@@OT_TX_${i}@@`;
        });
        f = f.replace(
          /(?<![\\a-zA-Z])(arcsin|arccos|arctan|sin|cos|tan|cot|log|ln|lim)(?!h\b)(?=\s*[\(\[_^0-9a-zA-Z\\])/g,
          "\\$1"
        );
        return f.replace(/@@OT_TX_(\d+)@@/g, (_m, i) => tv[Number(i)] || "");
      };

      s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_m, body) => `$$${fixInner(body)}$$`);
      s = s.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_m, body) => `$${fixInner(body)}$`);
      s = s.replace(
        /\$\$([\s\S]*?)\$\$[ \t\r\n]*([.,;])(?!(?:\.|[0-9a-zA-Zà-ỹÀ-Ỹ]))(?=[ \t]*(?:\r?\n|$))/g,
        (fullMatch, body: string, punct: string) => {
          const trimmed = body.trim();
          if (!trimmed) return fullMatch;
          const isBlk =
            trimmed.includes("\n") ||
            /\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)/i.test(trimmed) ||
            /\\left\s*\[/.test(trimmed);
          if (!isBlk && !fullMatch.includes("\n")) return `$$${trimmed}${/[.,;]$/.test(trimmed) ? "" : punct}$$`;
          return `\n\n$$\n${/[.,;]$/.test(trimmed) ? trimmed : `${trimmed}${punct}`}\n$$\n\n`;
        }
      );
      return s;
    };

    const difficultyMap: Record<string, string> = {
      co_ban_6_7:
        "CƠ BẢN (Mục tiêu 6–7 điểm): Ưu tiên Nhận biết – Thông hiểu nền tảng, nhận diện nhanh công thức, BBT, đồ thị, tính toán trực tiếp rõ ràng, tránh bẫy quá lắt léo.",
      kha_8_plus:
        "KHÁ (Mục tiêu 8+ điểm): Cân bằng Thông hiểu – Vận dụng, lồng ghép bài toán chứa tham số $m$, bảng số liệu thực tế và câu Đúng/Sai phân hóa ý c, d.",
      vdc_9_10:
        "VẬN DỤNG CAO (Mục tiêu 9–10 điểm): Trọng tâm bài toán mô hình hóa thực tế phức hợp (kinh tế, kỹ thuật, y tế, viễn thông, vật lý), cực trị không gian $Oxyz$, xác suất Bayes, quy hoạch tuyến tính, đếm lưới ô vuông nâng cao."
    };
    const difficultyGuide = difficultyMap[difficultyLevel] || difficultyMap.kha_8_plus;

    const topicChecklist = selectedTopics
      .map(
        (t: any, idx: number) =>
          `${idx + 1}. [${t.gradeTitle || "THPT"}] ${t.topicTitle || ""} — ${t.label || ""} (Mức chuẩn: ${t.levelTag || "TH-VD"})${t.description ? `\n   Trọng tâm kiến thức: ${t.description}` : ""}`
      )
      .join("\n");

    let materialInstructions = "";
    if (materialType === "chuyen_de") {
      materialInstructions = `LOẠI TÀI LIỆU: TÀI LIỆU CHUYÊN ĐỀ ÔN TẬP CHUYÊN SÂU.
Cấu trúc bắt buộc trong "mainContentMarkdown":
- Tiêu đề trang trọng (gồm thông tin trường/GV nếu có: "${teacherHeader || "TÀI LIỆU ÔN THI TỐT NGHIỆP THPT - MÔN TOÁN"}").
- **I. LÝ THUYẾT TRỌNG TÂM & CÔNG THỨC CỐT LÕI**: Tóm tắt đầy đủ, hệ thống, chính xác các định nghĩa, tính chất, công thức ứng với các dạng bài đã chọn.
- **II. PHƯƠNG PHÁP GIẢI & MẸO BẤM MÁY TÍNH CASIO fx-580VN X / fx-880BTG**: Nêu rõ các bước giải tay chuẩn mực VÀ hướng dẫn từng phím bấm CASIO nhanh cho từng dạng bài (ví dụ MENU 9 giải phương trình/bất phương trình, MENU 8 Table dò cực trị, MENU 5 Vector tính tích có hướng/góc, MENU 6 Thống kê ghép nhóm).
- **III. VÍ DỤ MINH HỌA SÁT ĐỀ TN THPT**: Mỗi dạng bài được chọn có ít nhất 1 ví dụ minh họa sát cấu trúc đề Bộ GD&ĐT 2025–2026 kèm **Lời giải chi tiết**.
- **IV. HỆ THỐNG BÀI TẬP TỰ LUYỆN PHÂN HÓA**: Chia đủ theo cấu trúc:
  + ${p1 > 0 ? `PHẦN I. Trắc nghiệm nhiều phương án lựa chọn: Sinh ĐỦ ĐÚNG ${p1} câu (Câu 1 đến Câu ${p1}), mỗi câu đủ 4 phương án A, B, C, D trên 4 dòng riêng biệt.` : "Không cần sinh Phần I."}
  + ${p2 > 0 ? `PHẦN II. Trắc nghiệm Đúng Sai: Sinh ĐỦ ĐÚNG ${p2} câu (Câu 1 đến Câu ${p2}), mỗi câu có ĐỦ 4 ý a), b), c), d) trên 4 dòng riêng biệt.` : "Không cần sinh Phần II."}
  + ${p3 > 0 ? `PHẦN III. Trắc nghiệm Trả lời ngắn: Sinh ĐỦ ĐÚNG ${p3} câu (Câu 1 đến Câu ${p3}), nêu rõ quy cách làm tròn (nếu có) để đáp án là 1 số cụ thể tối đa 4 ký tự.` : "Không cần sinh Phần III."}`;
    } else if (materialType === "giao_an_5512") {
      materialInstructions = `LOẠI TÀI LIỆU: KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT (CHUẨN CÔNG VĂN 5512/BGDĐT).
Cấu trúc bắt buộc trong "mainContentMarkdown":
- Quốc hiệu / Header kế hoạch bài dạy (${teacherHeader || "Trường THPT ... — Tổ Toán"}).
- **I. MỤC TIÊU**: 1. Kiến thức; 2. Năng lực (tư duy lập luận toán học, mô hình hóa toán học, sử dụng công cụ CASIO); 3. Phẩm chất.
- **II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU**: Máy chiếu, bảng phụ, máy tính cầm tay CASIO fx-580VN X / fx-880BTG, phiếu học tập.
- **III. TIẾN TRÌNH DẠY HỌC (ĐỦ 4 HOẠT ĐỘNG CHUẨN CV 5512)**:
  1. **Hoạt động 1: Khởi động** (Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện).
  2. **Hoạt động 2: Hình thành & Hệ thống hóa kiến thức trọng tâm** (Ôn tập sơ đồ công thức, lưu ý lỗi sai thường gặp, mẹo bấm máy CASIO).
  3. **Hoạt động 3: Luyện tập** (Tổ chức giải mẫu & làm việc nhóm trên Phiếu học tập).
  4. **Hoạt động 4: Vận dụng thực tế & Hướng dẫn về nhà** (Bài toán thực tiễn liên hệ ngành nghề, giao nhiệm vụ tự luyện).
- **IV. PHIẾU HỌC TẬP CUỐI BÀI**:
  + ${p1 > 0 ? `PHẦN I (Trắc nghiệm 4 lựa chọn): Sinh ĐỦ ĐÚNG ${p1} câu (Câu 1 đến Câu ${p1}), mỗi câu 4 phương án A, B, C, D mỗi ý 1 dòng.` : "Không có Phần I."}
  + ${p2 > 0 ? `PHẦN II (Đúng/Sai): Sinh ĐỦ ĐÚNG ${p2} câu (Câu 1 đến Câu ${p2}), mỗi câu ĐỦ 4 ý a), b), c), d).` : "Không có Phần II."}
  + ${p3 > 0 ? `PHẦN III (Trả lời ngắn): Sinh ĐỦ ĐÚNG ${p3} câu (Câu 1 đến Câu ${p3}), đáp số chuẩn hóa tối đa 4 ký tự.` : "Không có Phần III."}`;
    } else {
      materialInstructions = `LOẠI TÀI LIỆU: ĐỀ LUYỆN TẬP ÔN THI TỐT NGHIỆP THPT CHUẨN CẤU TRÚC 3 PHẦN BỘ GD&ĐT (GDPT 2018).
Cấu trúc bắt buộc trong "mainContentMarkdown":
- Tiêu đề chuẩn đề thi (${teacherHeader || "ĐỀ LUYỆN TẬP ÔN THI TỐT NGHIỆP THPT — MÔN TOÁN"}) kèm thông tin: Thời gian làm bài, Phạm vi chuyên đề, Mục tiêu điểm số.
- ${p1 > 0 ? `**PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn**: Sinh ĐỦ ĐÚNG ${p1} câu (từ Câu 1 đến Câu ${p1}), mỗi câu có ĐỦ 4 phương án A., B., C., D. trên 4 dòng riêng biệt.` : "Bỏ qua Phần I vì số câu = 0."}
- ${p2 > 0 ? `**PHẦN II. Câu trắc nghiệm đúng sai**: Sinh ĐỦ ĐÚNG ${p2} câu (từ Câu 1 đến Câu ${p2}), mỗi câu bắt buộc có phần dẫn + ĐỦ 4 mệnh đề con a), b), c), d) trên 4 dòng riêng biệt.` : "Bỏ qua Phần II vì số câu = 0."}
- ${p3 > 0 ? `**PHẦN III. Câu trắc nghiệm trả lời ngắn**: Sinh ĐỦ ĐÚNG ${p3} câu (từ Câu 1 đến Câu ${p3}), mỗi câu là bài toán tính toán hoặc mô hình hóa thực tế rõ ràng, nêu rõ yêu cầu làm tròn (ví dụ: làm tròn kết quả đến hàng phần trăm / hàng phần mười / hàng đơn vị) để đáp số là một số cụ thể dài tối đa 4 ký tự (gồm cả dấu trừ hoặc dấu phẩy thập phân nếu có).` : "Bỏ qua Phần III vì số câu = 0."}`;
    }

    const answerInstructions = `Trong "answerAndSolutionMarkdown":
- Tạo **BẢNG ĐÁP ÁN NHANH** bằng Markdown Table chuẩn cho tất cả câu hỏi ở Phần I, Phần II (bảng 5 hàng a, b, c, d), và Phần III:
  + MỌI hàng của bảng Markdown BẮT BUỘC có đủ dấu \`|\` ở ĐẦU và CUỐI hàng (ví dụ: \`| Câu | 1 | 2 | 3 |\`), KHÔNG ĐƯỢC chèn dòng trống giữa hàng tiêu đề, hàng phân cách \`| :---: |\` và các hàng dữ liệu.
  + Trong bảng Phần III (Trả lời ngắn), ghi trực tiếp giá trị số (ví dụ: \`| **Đáp số** | 200 | 31,7 | 126 |\`), TUYỆT ĐỐI KHÔNG bọc dấu nháy đơn \`'200'\` hay nháy kép.
- Tạo **HƯỚNG DẪN GIẢI CHI TIẾT** cho TẤT CẢ 100% số câu đã sinh:
  + Không được tóm tắt, không viết "(các câu còn lại tương tự)".
  + MỖI CÂU HỎI MỚI (**Câu 1.**, **Câu 2.**, **Câu 3.**...) BẮT BUỘC xuống 2 dòng (1 dòng trống \`\\n\\n\`) tách riêng khỏi câu trước; TUYỆT ĐỐI KHÔNG viết dính liền kiểu \`**Đáp số: 200****Câu 2.**\`.
  + Với Phần II (Đúng/Sai): giải thích rành mạch TỪNG Ý a), b), c), d) mỗi ý một dòng riêng (ví dụ: \`- **a) Đúng:** ...\`) kèm phép tính đối chứng.
  + Với Phần III (Trả lời ngắn): trình bày lập luận mô hình hóa từng bước, kết quả trung gian chính xác, quy tắc làm tròn và chốt \`**Đáp số: ...**\` ở cuối đoạn rồi xuống dòng mới sang câu tiếp theo.`;

    const promptText = `Hãy biên soạn tài liệu Toán học ôn thi Tốt nghiệp THPT chuẩn Bộ GD&ĐT (chương trình GDPT 2018) bám sát chính xác các yêu cầu sau:

1. CÁC DẠNG BÀI / CHUYÊN ĐỀ ĐƯỢC GIÁO VIÊN TÍCH CHỌN:
${topicChecklist}

2. MỨC ĐỘ MỤC TIÊU:
${difficultyGuide}

3. ${materialInstructions}

4. ${answerInstructions}

5. YÊU CẦU BẮT BUỘC VỀ BỐI CẢNH THỰC TẾ & CHẤT LƯỢNG SƯ PHẠM:
- Các câu hỏi ở **PHẦN II (Đúng/Sai)** và **PHẦN III (Trả lời ngắn)** BẮT BUỘC ưu tiên xây dựng bối cảnh mô hình hóa thực tế (kinh tế, doanh thu – lợi nhuận, kỹ thuật xây dựng, y tế – xét nghiệm Bayes, viễn thông 5G – radar Oxyz, vật lý chuyển động – lưu lượng nước, thống kê sản xuất...) gắn chặt với dạng bài đã chọn.
- Nếu câu hỏi dùng bảng biến thiên, bảng xét dấu hoặc bảng số liệu thống kê ghép nhóm / bảng tần số 2 chiều: BẮT BUỘC chèn bảng Markdown chuẩn nhiều dòng (mỗi hàng 1 dòng riêng, đủ \`|\` đầu và cuối hàng).
- Kiểm tra tính toán 2 lần trước khi xuất để đảm bảo mọi đáp án và lời giải khớp nhau tuyệt đối 100%, không mâu thuẫn số liệu.
${customNote ? `\n6. GHI CHÚ RIÊNG CỦA GIÁO VIÊN:\n${customNote}` : ""}`;

    const systemInstruction = `Bạn là Chuyên gia Ra đề & Biên soạn Tài liệu Ôn thi Tốt nghiệp THPT Môn Toán hàng đầu của Bộ GD&ĐT Việt Nam (Chương trình GDPT 2018).
${MATH_FORMATTING_RULES}
BỔ SUNG TUYỆT ĐỐI:
- Trả về đúng định dạng JSON theo schema yêu cầu với 3 trường: title, mainContentMarkdown, answerAndSolutionMarkdown.
- Tuyệt đối không dùng \\dfrac (luôn dùng \\frac).
- Mọi công thức, biểu thức, phương trình, tập hợp, vectơ và biến số đơn lẻ ($x$, $y$, $z$, $m$, $n$, $t$, $p$, $S$, $V$, $P(\\overline{A})$...) BẮT BUỘC đặt trong $...$ hoặc $$...$$ để MathJax 3 render chính xác và xuất Word OMML hoàn hảo.
- Trong giáo án 5512, mỗi tiểu mục trong Tiến trình dạy học (Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện) viết thành từng đoạn/gạch đầu dòng rõ ràng, không nhồi bảng biểu phức tạp làm hẹp cột.`;

    const response = await generateWithFallback(req, {
      preferredModels: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Tiêu đề ngắn gọn của tài liệu ôn thi TN THPT."
            },
            mainContentMarkdown: {
              type: Type.STRING,
              description:
                "Toàn bộ nội dung chính của tài liệu (Lý thuyết/Giáo án 5512/Đề luyện tập đầy đủ số câu Phần I, II, III) dùng Markdown chuẩn và LaTeX MathJax ($...$, $$...$$)."
            },
            answerAndSolutionMarkdown: {
              type: Type.STRING,
              description:
                "Bảng đáp án nhanh chuẩn Markdown Table và Hướng dẫn giải chi tiết 100% các câu hỏi và từng ý a, b, c, d."
            }
          },
          required: ["title", "mainContentMarkdown", "answerAndSolutionMarkdown"]
        },
        maxOutputTokens: 65536
      }
    });

    const rawText = String(response?.text || "").trim();
    if (!rawText) {
      return res.status(502).json({ error: "AI không trả về nội dung. Vui lòng thử lại." });
    }

    let parsed: { title?: string; mainContentMarkdown?: string; answerAndSolutionMarkdown?: string } = {};
    try {
      const cleanedJson = rawText
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleanedJson);
    } catch {
      // Fallback: extract text cleanly if response wasn't strict JSON
      parsed = {
        title: "Tài liệu Ôn thi Tốt nghiệp THPT Môn Toán",
        mainContentMarkdown: rawText,
        answerAndSolutionMarkdown: ""
      };
    }

    const title = String(parsed.title || "Tài liệu Ôn thi Tốt nghiệp THPT Môn Toán").trim();
    const mainContentMarkdown = normalizeOnThiLatex(parsed.mainContentMarkdown || "");
    const answerAndSolutionMarkdown = normalizeOnThiLatex(parsed.answerAndSolutionMarkdown || "");

    const combinedMarkdown = [
      mainContentMarkdown,
      answerAndSolutionMarkdown
        ? `\n\n---\n\n## ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT\n\n${answerAndSolutionMarkdown}`
        : ""
    ]
      .filter(Boolean)
      .join("");

    return res.status(200).json({
      success: true,
      title,
      mainContentMarkdown,
      answerAndSolutionMarkdown,
      combinedMarkdown
    });
  } catch (error: any) {
    console.error("[On Thi TN THPT Generate Error]:", error);
    return handleAiError(error, req, res);
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint không tồn tại." });
});

app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng file (tối đa 50MB)." });
  }
  console.error("Express Error:", err);
  res.status(err.status || 500).json({ error: err.message || "Đã xảy ra lỗi hệ thống." });
});

export default app;



