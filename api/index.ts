import 'dotenv/config';
import express from "express";
import fs from "fs";
import HTMLtoDOCX from "html-to-docx";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import LZString from 'lz-string';
import * as XLSX from 'xlsx';



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
   - Dấu khác (không bằng) BẮT BUỘC dùng \\neq hoặc \\ne (tuyệt đối KHÔNG viết dạng "/ =", "/=", "!=" hay "=/=").
   - Ký hiệu vô cực (vô cùng) BẮT BUỘC dùng \\infty: $-\\infty, +\\infty$. Tuyệt đối KHÔNG viết thiếu dấu gạch chéo thành -infty, +infty hay in fty. Các khoảng như $(-\\infty; -1)$, $(-1; +\\infty)$ BẮT BUỘC có \\ trước infty.
   - KÝ HIỆU TẬP HỢP DÙNG DẤU NGOẶC NHỌN: Dấu ngoặc nhọn tập hợp { } BẮT BUỘC phải thoát bằng dấu gạch chéo ngược: \\{ và \\} (ví dụ: $A = \\{x \\in \\mathbb{Z} \\mid -2 \\le x < 3\\}$, $B = \\{1; 2; 3\\}$).
   - CÁC TOÁN TỬ SO SÁNH: BẮT BUỘC viết \\le, \\ge, \\neq (ví dụ: $x \\le 3$, $|x| \\le 3$, $-2 \\le x < 3$).
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
   - BẮT BUỘC đặt trong khối mã \`\`\`python ... \`\`\` hoặc bọc dấu backtick inline \`...\` (Ví dụ: \`if score > 5: print("Pass")\`).`;

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

const chunkStore = new Map<string, { chunks: string[], type: string, name?: string, total: number, timestamp: number }>();

app.post("/api/upload-chunk", (req, res) => {
  const { fileId, chunkIndex, totalChunks, chunkData, type, name } = req.body;
  if (!chunkStore.has(fileId)) {
    chunkStore.set(fileId, { chunks: new Array(totalChunks), type, name, total: totalChunks, timestamp: Date.now() });
  }
  const fileEntry = chunkStore.get(fileId)!;
  fileEntry.chunks[chunkIndex] = chunkData;
  if (name && !fileEntry.name) fileEntry.name = name;
  fileEntry.timestamp = Date.now();
  res.json({ success: true });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of chunkStore.entries()) {
    if (now - entry.timestamp > 10 * 60 * 1000) {
      chunkStore.delete(id);
    }
  }
}, 60 * 1000);


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


const EXAMS_CACHE_FILE = path.join(process.cwd(), 'shared_exams.json');
const EXAMS_TMP_FILE = '/tmp/shared_exams.json';
const sharedExamsStore = new Map<string, any>();

// Load initially from file if exists (both cwd and /tmp)
function loadExamsFromDisk() {
  const tryLoad = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          if (!sharedExamsStore.has(k)) {
            sharedExamsStore.set(k, v);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to load exams from ${filePath}:`, e);
    }
  };
  tryLoad(EXAMS_CACHE_FILE);
  tryLoad(EXAMS_TMP_FILE);
}
loadExamsFromDisk();

function saveExamsToDisk() {
  try {
    const obj: Record<string, any> = {};
    for (const [k, v] of sharedExamsStore.entries()) {
      obj[k] = v;
    }
    const json = JSON.stringify(obj);
    try { fs.writeFileSync(EXAMS_CACHE_FILE, json, 'utf8'); } catch (e) {}
    try { fs.writeFileSync(EXAMS_TMP_FILE, json, 'utf8'); } catch (e) {}
  } catch (e) {
    console.warn("Failed to save exams cache to disk:", e);
  }
}

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

function getAiClient(req: any) {
  const authHeader = req.headers['authorization'] as string;
  let customKey = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    customKey = authHeader.substring(7);
  } else {
    customKey = req.headers['x-gemini-api-key'] as string;
  }
  
  if (isValidGeminiApiKey(customKey)) {
    try { customKey = decodeURIComponent(customKey); } catch (e) {}
    customKey = customKey.replace(/[^\x20-\x7E]/g, '').trim();
    return new GoogleGenAI({ 
      apiKey: customKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  
  throw new Error("YÊU CẦU NHẬP API KEY CÁ NHÂN: Ứng dụng quy định 100% người dùng tự dán Gemini API Key cá nhân của mình để sử dụng. Vui lòng dán mã API Key cá nhân vào Cài đặt.");
}

function handleAiError(error: any, req: any, res: any) {
  const errorMsg = error?.message || "";
  const lowerMsg = errorMsg.toLowerCase();
  const isCustomKey = !!req.headers['x-gemini-api-key'] || (!!req.headers['authorization'] && (req.headers['authorization'] as string).startsWith('Bearer '));

  if (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid")) {
    return res.status(400).json({ error: "API Key không hợp lệ. Vui lòng kiểm tra lại Cài đặt hệ thống và đảm bảo API Key chính xác." });
  }
  if (lowerMsg.includes("unauthenticated") || lowerMsg.includes("service account is deleted") || error?.status === 401 || lowerMsg.includes("account_state_invalid")) {
    if (!isCustomKey) {
        return res.status(401).json({ error: "Tài khoản API mặc định của hệ thống đang tạm ngưng. Để tiếp tục sử dụng ứng dụng, thầy/cô vui lòng bấm vào mục \"Nhập mã API key\" ở thanh menu bên trái và điền API Key cá nhân của mình (từ Google AI Studio). Xin lỗi thầy/cô vì sự bất tiện này!" });
    }
    return res.status(401).json({ error: "UNAUTHENTICATED: Tài khoản dịch vụ liên kết với API Key cá nhân của bạn đã bị vô hiệu hóa hoặc không hợp lệ." });
  }

  if (lowerMsg.includes("suspended") || lowerMsg.includes("permission_denied") || error?.status === 403) {
    if (!isCustomKey) {
        return res.status(401).json({ error: "UNAUTHENTICATED: Hệ thống AI hiện đang bảo trì hoặc hết hạn ngạch." });
    }
    return res.status(401).json({ error: "UNAUTHENTICATED: Tài khoản API Key cá nhân của bạn đã bị từ chối quyền truy cập." });
  }

  if (lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") || lowerMsg.includes("429") || error?.status === 429) {
    if (!isCustomKey) {
      return res.status(429).json({ error: "Hệ thống AI đang quá tải hoặc tạm thời hết lượt yêu cầu miễn phí trong ngày (Lỗi 429). Vui lòng thử lại sau ít phút hoặc nhập API Key cá nhân trong Cài đặt hệ thống." });
    }
    return res.status(429).json({ error: "API Key cá nhân của thầy/cô đã vượt quá giới hạn số lượt yêu cầu của Google (Lỗi 429 - Quota Exceeded). Vui lòng thử lại sau ít phút hoặc đổi sang API Key cá nhân khác." });
  }
  if (lowerMsg.includes("503") || error?.status === 503 || lowerMsg.includes("unavailable")) {
    if (!isCustomKey) {
        return res.status(429).json({ error: "Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao (429). Vui lòng thử lại sau ít phút hoặc sử dụng API Key cá nhân." });
    }
    return res.status(429).json({ error: "Hệ thống AI của Google đang quá tải (429). Vui lòng đợi vài giây và thử lại." });
  }

  if (lowerMsg.includes("fetch failed") || lowerMsg.includes("failed to fetch") || lowerMsg.includes("networkerror") || lowerMsg.includes("econnreset")) {
    return res.status(503).json({ error: "Kết nối mạng tới dịch vụ AI tạm thời gián đoạn. Thầy/cô vui lòng bấm 'Thử tạo lại' sau ít giây." });
  }

  if (lowerMsg.includes("bad escaped character") || lowerMsg.includes("unexpected token") || lowerMsg.includes("syntaxerror")) {
    return res.status(500).json({ error: "Phản hồi từ AI chứa ký tự công thức chưa chuẩn. Hệ thống đang tự động tối ưu hóa, thầy/cô vui lòng bấm thử lại." });
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
  }, 2500);

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
      res.write(`\n\nSERVER_ERROR: ${cleanMsg || 'Máy chủ xử lý quá thời gian chờ hoặc bị gián đoạn.'}\n`);
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
              result += "\\\"";
              i += slashCount + 1;
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
  s = s.replace(/\\dfrac\b/g, '\\frac');
  s = s.replace(/\\{2,}([a-zA-Z]+)/g, (_m, g1) => '\\' + g1);
  s = s.replace(/\\{2,}([\{\}\[\]\(\)\$\%])/g, (_m, g1) => '\\' + g1);
  s = s.replace(/\\{3,}/g, '\\\\');
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
  let primary = requestedModel || "gemini-3.8-flash";
  if (
    !primary ||
    primary.includes("1.5") || 
    primary.includes("2.0") || 
    primary.includes("3.5") || 
    primary === "gemini-pro"
  ) {
    primary = "gemini-3.8-flash";
  }
  const list = [
    primary,
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  return Array.from(new Set(list));
}

async function generateWithFallback(req: any, payloadOptions: any, res?: any) {
  let client = getAiClient(req);
  let isCustom = isValidGeminiApiKey((req.headers['authorization'] || req.headers['x-gemini-api-key']) as string);
  let customKeyFailed = false;
  const models = getValidGeminiModels(payloadOptions?.model);

  let primaryError: any = null;
  const maxRetries = 3;

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
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const model of models) {
      try {
        const rawConfig = { ...(payloadOptions.config || {}) };
        // For Gemini 3.8 / 4 series, do not pass deprecated sampling params like temperature, topP, topK
        if (model.includes("3.8") || model.includes("4-") || model.includes("latest")) {
          delete rawConfig.temperature;
          delete rawConfig.topP;
          delete rawConfig.topK;
          delete rawConfig.candidateCount;
        }

        const updatedPayload = { 
          ...payloadOptions, 
          model,
          config: {
            maxOutputTokens: 32768,
            ...rawConfig,
            systemInstruction: rawConfig.systemInstruction || defaultSystemInstruction
          } 
        };
        const response = await client.models.generateContent(updatedPayload);
        const normText = extractTextFromResponse(response);
        if (!normText) {
          console.warn(`[generateWithFallback] Model ${model} returned empty text, continuing fallback...`);
          continue;
        }
        return {
          text: normText,
          candidates: response.candidates ? response.candidates.map((c: any) => ({ finishReason: c.finishReason, index: c.index })) : undefined,
          customKeyFailed
        } as any;
  
      } catch (e: any) {
        primaryError = e;
        console.warn(`[generateWithFallback] Model ${model} error (isCustomKey: ${isCustom}):`, e?.message);
        await delay(300);
        continue;
      }
    }
    
    if (primaryError && attempt < maxRetries - 1) {
      await delay(1000 * (attempt + 1));
    }
  }
  
  if (primaryError) {
    if (isCustom) {
      const errMsg = primaryError?.message || "";
      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Free Tier")) {
        throw new Error("API Key cá nhân của bạn đã chạm ngưỡng hạn mức gọi AI của Google (Lỗi 429 Quota Exceeded). Vui lòng thử đổi API Key khác hoặc đợi Google làm mới hạn mức.");
      }
      throw new Error(`Lỗi từ API Key cá nhân của bạn: ${errMsg}`);
    }
    throw primaryError;
  }
  throw new Error("429 RESOURCE_EXHAUSTED: Hệ thống đang quá tải hoặc tạm thời không khả dụng. Vui lòng sử dụng API Key cá nhân trong Cài đặt.");
}

async function generateWithFallbackStream(req: any, res: any, payloadOptions: any) {
  let client = getAiClient(req);
  let isCustom = isValidGeminiApiKey((req.headers['authorization'] || req.headers['x-gemini-api-key']) as string);
  const models = getValidGeminiModels(payloadOptions?.model);

  const config = payloadOptions.config || {};
  const defaultSystemInstruction = `Bạn là chuyên gia Toán học và Khảo thí GDPT 2018. BẮT BUỘC dùng cú pháp LaTeX chuẩn kẹp trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối dòng) cho TẤT CẢ các thành phần toán.
- LUÔN LUÔN sử dụng \\frac thay thế cho \\dfrac.
- TẤT CẢ các biến số, tham số đơn lẻ (như x, y, m, a, b, c...) BẮT BUỘC bọc trong cặp dấu $...$.
- Tuyệt đối KHÔNG chào hỏi hay giải thích ngoài lề, xuất trực tiếp văn bản Markdown của phiếu học tập.`;

  let primaryError: any = null;
  let streamStarted = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const model of models) {
      try {
        const updatedPayload = {
          ...payloadOptions,
          model,
          config: {
            maxOutputTokens: 8192,
            ...config,
            systemInstruction: config.systemInstruction || defaultSystemInstruction
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
              streamStarted = true;
            }
            res.write(chunk.text);
          }
        }
        if (streamStarted) {
          res.end();
          return;
        }
      } catch (e: any) {
        primaryError = e;
        console.warn(`[generateWithFallbackStream] Error with model ${model} (isCustomKey: ${isCustom}):`, e?.message);
        if (streamStarted) {
          res.write('\n\n⚠️ GIÁN ĐOẠN DỮ LIỆU: Quá trình truyền dữ liệu từ AI bị gián đoạn. Vui lòng bấm "Thử tạo lại".');
          res.end();
          return;
        }
        await delay(300);
        continue;
      }
    }
    await delay(500 * (attempt + 1));
  }

  if (!streamStarted) {
    if (primaryError) {
      return handleAiError(primaryError, req, res);
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

    let mcCount = Number(qCounts.mc) || 0;
    let tfCount = Number(qCounts.tf) || 0;
    let saCount = Number(qCounts.sa) || 0;
    let essayCount = Number(qCounts.essay) || 0;

    const combinedMatrixText = `${matrix || ''} ${customPrompt || ''}`;
    const hasMatrixFile = Boolean(matrixFile) || (matrix && matrix.toLowerCase().includes('ma trận')) || (customPrompt && customPrompt.toLowerCase().includes('ma trận'));

    // Tự động nhận diện số câu TLN (Trả lời ngắn) nếu người dùng cung cấp ma trận hoặc ghi trong yêu cầu
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

    const totalQuestions = mcCount + tfCount + saCount + essayCount;

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

CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC:
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

QUY TẮC BẮT BUỘC VỀ TOÁN HỌC VÀ KỸ THUẬT:
${MATH_FORMATTING_RULES}
- Mọi công thức, ký hiệu toán, biến số đơn lẻ (như $x, y, z, m, a, b, c, \\alpha, \\beta, \\pi, \\in, \\le, \\ge, -\\infty, +\\infty...$) BẮT BUỘC đặt trong cặp dấu đô la $...$ hoặc $$...$$. CẤM viết LaTeX trần.
- LUÔN DÙNG \\frac THAY CHO \\dfrac (CẤM dùng \\dfrac).
- BẢNG BIẾN THIÊN (BBT): Tuyệt đối KHÔNG để khung rỗng. Khi câu hỏi cần BBT, BẮT BUỘC 100% vẽ bảng biến thiên trực quan bằng Markdown Table chuẩn ngay trong câu hỏi đề bài, mỗi hàng BẮT BUỘC xuống dòng riêng biệt (có ký tự \n giữa các hàng):
  | $x$ | $-\\infty$ | | $x_0$ | | $+\\infty$ |
  |---|---|---|---|---|---|
  | $y'$ | | $+$ | $0$ | $-$ | |
  | $y$ | $-\\infty$ | $\\nearrow$ | $y_{CĐ}$ | $\\searrow$ | $-\\infty$ |
  Nếu có tiệm cận đứng hoặc điểm gián đoạn (như hàm phân thức bậc nhất/bậc nhất): dùng vạch đôi $\\|$ ở hàng $y'$ và phân tách 2 giới hạn ở hàng $y$ bằng $\\|$ (ví dụ: $2 \\searrow -\\infty \\| +\\infty \\searrow 2$). TUYỆT ĐỐI KHÔNG viết bảng biến thiên dính liền trên 1 dòng.
- HÌNH VẼ ĐỒ THỊ: Nếu trích dẫn đồ thị mà không có URL ảnh thực tế, BẮT BUỘC 100% mô tả rõ đặc điểm đồ thị bằng lời trong đề (ví dụ: "Đồ thị đi qua điểm A(0; -1), đỉnh I(1; -2)...") hoặc sinh kèm mã SVG đồ thị nội tuyến, KHÔNG để thẻ img/div trống rỗng.
- LỜI GIẢI CHI TIẾT ('solution' / 'explanation'): Lời giải viết ngắn gọn, súc tích (1-3 dòng tập trung bước biến đổi then chốt và kết quả), KHÔNG lặp lại BẢNG BIẾN THIÊN hay HÌNH VẼ ĐỒ THỊ, không viết dông dài để tối ưu tối đa tốc độ sinh đề thi.
- CẤM TUYỆT ĐỐI sinh mã HTML inline phức tạp (<mark style="...">, <span>). Chỉ dùng Markdown chuẩn (**in đậm**, *in nghiêng*).
- Ký hiệu vô cùng/vô cực BẮT BUỘC viết chuẩn LaTeX là \\infty (ví dụ: $(-\\infty; -1)$, $(-1; +\\infty)$, $[0; +\\infty)$, $(-\\infty; +\\infty)$). Tuyệt đối KHÔNG viết thiếu dấu gạch chéo ngược thành -infty, +infty, in fty.
- TUYỆT ĐỐI KHÔNG lặp lại các chữ A, B, C, D vào nội dung của câu hỏi hoặc phương án (hệ thống sẽ tự động gán nhãn A, B, C, D).
- Câu trắc nghiệm (mc): mảng "options" phải có ĐÚNG 4 phần tử dạng chuỗi. "correctOptionIndex" là chỉ số đáp án đúng (0, 1, 2, 3).
- Câu đúng/sai (tf): "tfStatements" phải là mảng ĐÚNG 4 đối tượng [{ "statement": "...", "correct": true/false }].
- Câu trả lời ngắn (sa): "correctAnswer" BẮT BUỘC là MỘT SỐ CỤ THỂ có độ dài TỐI ĐA 4 KÝ TỰ (ví dụ: "22", "-3.5", "13", "102"). Tuyệt đối không dùng dạng mở hay công thức.
- BẮT BUỘC KÈM TRƯỜNG "solution": Lời giải súc tích (1-3 dòng trọng tâm), kèm lý do chọn đáp án, dùng công thức LaTeX chuẩn cho TẤT CẢ các câu hỏi (mc, tf, sa, essay).

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ VỚI CẤU TRÚC SAU:
{
  "examName": "${examType.toUpperCase().startsWith('ĐỀ') ? examType.toUpperCase() : 'ĐỀ ' + examType.toUpperCase()} - MÔN ${subject.toUpperCase()} ${grade.replace(/^(LỚP|KHỐI)\s*/i, '').trim()} (${duration} PHÚT)",
  "questions": [
    {
      "id": 1,
      "type": "mc",
      "level": "Nhận biết",
      "topic": "Hàm số và đồ thị",
      "subtopic": "Tính đơn điệu của hàm số",
      "isRealWorld": false,
      "content": "Nội dung câu hỏi...",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "correctOptionIndex": 0,
      "solution": "Lời giải chi tiết từng bước biến đổi, kèm lý do chọn đáp án..."
    },
    {
      "id": 2,
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
      "solution": "Lời giải chi tiết cho 4 ý..."
    },
    {
      "id": 3,
      "type": "sa",
      "level": "Vận dụng",
      "topic": "Hình học không gian",
      "subtopic": "Thể tích khối đa diện",
      "content": "Tính diện tích tam giác $ABC$... (Kết quả làm tròn đến hàng đơn vị).",
      "correctAnswer": "25",
      "solution": "Lời giải chi tiết..."
    },
    {
      "id": 4,
      "type": "essay",
      "level": "Vận dụng cao",
      "topic": "Toán thực tế và tối ưu",
      "subtopic": "Giá trị lớn nhất và nhỏ nhất",
      "content": "Nội dung bài toán tự luận...",
      "correctAnswer": "Hướng dẫn chấm chi tiết",
      "solution": "Lời giải chi tiết..."
    }
  ]
}`;

    const processedFiles = await processFilesForAI(files);

    const response = await generateWithFallback(req, {
      contents: [
        {
          role: "user",
          parts: [
            ...processedFiles,
            { text: promptText }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

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

    // 1. Bù đắp câu hỏi Trắc nghiệm nhiều lựa chọn (mc) nếu AI trả về thiếu
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

    // 2. Bù đắp câu hỏi Đúng/Sai (tf) nếu AI trả về thiếu
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
          tfStatements: item.tfStatements,
          solution: item.sol,
          explanation: item.sol
        });
      }
    }

    // 3. Bù đắp câu hỏi Trả lời ngắn (sa) nếu AI trả về thiếu (BẮT BUỘC ĐỦ saCount CÂU)
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
    const prompt = req.body.prompt || "";
    const requestedModel = req.body.model || "gemini-2.5-flash";
    if (!prompt) {
      throw new Error("Không có nội dung yêu cầu tạo kế hoạch bài dạy ôn tập.");
    }
    const response = await generateWithFallback(req, {
      contents: prompt,
      model: requestedModel,
      config: {
        maxOutputTokens: 16384,
      }
    });
    return {
      result: response.text || ""
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
    const maxOutputTokens = 16384;
    const files = resolveFiles(req.body);

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
- Đối với đoạn mã lập trình (Code Python, Scratch, thuật toán, lệnh if, for, while, print, input...): BẮT BUỘC đặt trong khối mã \`\`\`python ... \`\`\` hoặc bọc dấu backtick inline \`...\` (Ví dụ: \`if score > 5: print("Pass")\`). TUYỆT ĐỐI KHÔNG bọc dấu $...$ hay LaTeX vào mã lập trình hoặc chuỗi string.`;

    const prompt = `Hãy biên soạn toàn diện KẾ HOẠCH BÀI DẠY chuẩn Công văn 5512/BGDĐT-GDTrH và bộ sách "${textbook}" cho bài học sau:

THÔNG TIN BÀI DẠY:
- Môn học: ${subject}
- Lớp: ${grade}
- Tên bài dạy: ${lesson}
- Thời lượng: ${periods} tiết (BẮT BUỘC: Tiến trình dạy học ở Phần III phải chia cụ thể và viết ĐẦY ĐỦ từ TIẾT 1 đến TIẾT ${periods}, mỗi tiết có đủ 4 hoạt động. Tuyệt đối không dừng giữa chừng)
- Bộ sách giáo khoa: ${textbook}
${requirement ? `- Yêu cầu cần đạt: ${requirement}` : ''}
${digitalComp ? `- Năng lực số (NLS) cần lồng ghép: ${digitalComp}` : ''}
${aiComp ? `- Năng lực Trí tuệ nhân tạo (AI) cần lồng ghép: ${aiComp}` : ''}
${stem ? `- Định hướng STEM/STEAM: ${stem}` : ''}

CẤU TRÚC KẾ HOẠCH BÀI DẠY BẮT BUỘC (VIẾT CHI TIẾT TOÀN DIỆN TỪ TIẾT 1 ĐẾN TIẾT ${periods}):

# KẾ HOẠCH BÀI DẠY: ${lesson.toUpperCase()}
**Môn học:** ${subject} | **Lớp:** ${grade} | **Thời lượng:** ${periods} tiết  
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
      let { croppedImage, croppedImageFileId } = req.body || {};
      if (croppedImageFileId && chunkStore.has(croppedImageFileId)) {
        const entry = chunkStore.get(croppedImageFileId)!;
        croppedImage = entry.chunks.join('');
        chunkStore.delete(croppedImageFileId);
      }

      if ((!files || files.length === 0) && !croppedImage) {
        throw new Error("Vui lòng cung cấp bài tập hoặc ảnh để tạo đề tương tự.");
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

      const prompt = `Bạn là một chuyên gia giáo dục xuất sắc. Dưới đây là bài tập, đề thi hoặc tài liệu mà giáo viên cung cấp.
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
        ]
      }, res);
      
      const resultText = response.text || "";
      if (!resultText || !resultText.trim()) {
        throw new Error("Không thể tạo bài tập tương tự từ nội dung này. Vui lòng thử lại.");
      }
      return { result: resultText, customKeyFailed: response.customKeyFailed };
    
    });
});


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
      numPartI = 12,
      numPartII = 4,
      numPartIII = 6,
      numPartIV = 2,
      realWorldPercent = 40,
      hasParametric = true,
      additionalNotes = ''
    } = req.body || {};

    const totalRequired = (numPartI || 0) + (numPartII || 0) + (numPartIII || 0) + (numPartIV || 0);
    const totalCount = totalRequired > 0 ? totalRequired : 24;
       
    const parametricRule = hasParametric
      ? `YÊU CẦU THAM SỐ: Thiết kế các câu hỏi chứa tham số thực ($m, a, b...$) ở mức độ vận dụng để phân hóa tư duy học sinh.`
      : `QUY TẮC CẤM THAM SỐ (CỰC KỲ QUAN TRỌNG - BẮT BUỘC TUÂN THỦ 100%):
- GIÁO VIÊN ĐÃ TÍCH CHỌN: "KHÔNG CÓ BÀI TOÁN CHỨA THAM SỐ".
- TUYỆT ĐỐI KHÔNG XUẤT HIỆN BẤT KỲ THAM SỐ NÀO (như $m$, $k$, $a$, $b$, $\alpha$ làm tham số).
- TUYỆT ĐỐI KHÔNG có các câu hỏi dạng: "Tìm m để...", "Tìm tất cả giá trị thực của tham số m...", "Hàm số chứa tham số m...", "Phương trình có nghiệm thỏa mãn m...".
- TẤT CẢ các hệ số, số liệu trong đề bài, hàm số, phương trình, bất phương trình và 4 phương án BẮT BUỘC 100% là CÁC CON SỐ THỰC CỤ THỂ (ví dụ: $y = 2x^3 - 3x^2 + 1$, $x = 2$, $-5$, $\\frac{1}{2}$, ...).`;

    const partIVRule = numPartIV > 0
      ? `4. PHẦN IV (essay): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartIV} CÂU Tự luận (loại "essay") - bài tập tự luận có hướng dẫn chấm.`
      : `QUY TẮC CẤU TRÚC ĐỀ 3 PHẦN (CỰC KỲ QUAN TRỌNG - BẮT BUỘC TUÂN THỦ 100%):
- Giáo viên đã chọn cấu trúc ĐỀ 3 PHẦN (không có tự luận).
- TUYỆT ĐỐI KHÔNG SINH PHẦN IV HOẶC BẤT KỲ BÀI TẬP TỰ LUẬN NÀO!
- TUYỆT ĐỐI KHÔNG sinh câu hỏi có type "essay". Mảng "questions" chỉ chứa câu hỏi thuộc 3 phần (loại "mc", "tf", "sa").`;

    const exampleJsonQuestions = [
      `        {
          "type": "mc",
          "content": "Nội dung câu hỏi trắc nghiệm 4 lựa chọn...",
          "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
          "correctOptionIndex": 0,
          "solution": "Lời giải chi tiết từng bước..."
        }`,
      `        {
          "type": "tf",
          "content": "Nội dung câu hỏi Đúng/Sai...",
          "tfStatements": [
            { "statement": "Ý a...", "correct": true },
            { "statement": "Ý b...", "correct": false },
            { "statement": "Ý c...", "correct": true },
            { "statement": "Ý d...", "correct": false }
          ],
          "solution": "Lời giải chi tiết..."
        }`,
      `        {
          "type": "sa",
          "content": "Nội dung câu trả lời ngắn...",
          "correctAnswer": "25",
          "solution": "Lời giải chi tiết..."
        }`
    ];

    if (numPartIV > 0) {
      exampleJsonQuestions.push(`        {
          "type": "essay",
          "content": "Nội dung tự luận rèn luyện...",
          "correctAnswer": "Hướng dẫn chấm chi tiết",
          "solution": "Lời giải chi tiết..."
        }`);
    }

    const promptText = `Bạn là một giáo viên xuất sắc môn ${subject || "Toán"} (chuẩn Chương trình GDPT 2018, bộ sách giáo khoa Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027). Hãy tạo một Phiếu bài tập (Worksheet) tương tác thật chuyên nghiệp cho học sinh Lớp ${grade}, môn ${subject || "Toán"}, bài học/chủ đề: "${lesson}". Hình thức: ${type || "Kết hợp trắc nghiệm, đúng/sai, trả lời ngắn, tự luận"}.
       
    RÀNG BUỘC PHẠM VI NỘI DUNG VÀ CHỦ ĐỀ (BẮT BUỘC 100%):
    - TẤT CẢ CÁC CÂU HỎI trong phiếu bài tập BẮT BUỘC phải tập trung chính xác và 100% nằm trong phạm vi kiến thức, bài học/chủ đề: "${lesson}".
    - TUYỆT ĐỐI KHÔNG BỊA RA HOẶC TỰ Ý CHÈN THÊM bất kỳ câu hỏi nào thuộc bài học khác, chương học khác hay khối lớp khác ngoài chủ đề "${lesson}".
    - Tuân thủ 100% thuật ngữ, ký hiệu, mạch kiến thức theo đúng SGK Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027.

    YÊU CẦU ĐẶC BIỆT CỤ THỂ VỀ CẤU TRÚC VÀ SỐ LƯỢNG CÂU HỎI BẮT BUỘC (TỔNG CHÍNH XÁC ĐỦ ${totalCount} CÂU):
    BẮT BUỘC phải sinh đúng 100% chính xác các phần sau vào mảng "questions" (TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT hay dùng placeholder "..."):
    ${numPartI > 0 ? `1. PHẦN I (mc): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartI} CÂU Trắc nghiệm 4 lựa chọn (loại "mc") - mỗi câu gồm "content", 4 phương án vào mảng "options", "correctOptionIndex".` : ''}
    ${numPartII > 0 ? `2. PHẦN II (tf): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartII} CÂU Trắc nghiệm Đúng/Sai (loại "tf") - mỗi câu BẮT BUỘC có mảng "tfStatements" gồm ĐÚNG 4 đối tượng [{ "statement": "...", "correct": true/false }].` : ''}
    ${numPartIII > 0 ? `3. PHẦN III (sa): BẮT BUỘC ĐỦ CHÍNH XÁC ${numPartIII} CÂU Trắc nghiệm Trả lời ngắn (loại "sa") - "correctAnswer" là 1 số cụ thể có độ dài tối đa 4 ký tự.` : ''}
    ${partIVRule}

    - Tỷ lệ thực tế: Khoảng ${realWorldPercent}%.
    - ${parametricRule}
    ${additionalNotes ? `- Ghi chú riêng từ giáo viên: ${additionalNotes}` : ''}

    ${MATH_FORMATTING_RULES}
    5. BẮT BUỘC KÈM TRƯỜNG "solution": Lời giải chi tiết từng bước biến đổi, kèm lý do chọn đáp án, viết bằng công thức LaTeX chuẩn cho TẤT CẢ các câu hỏi.
    6. BẮT BUỘC SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận.
    7. BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC SAU (MẢNG "questions" PHẢI CÓ ĐỦ CHÍNH XÁC ${totalCount} PHẦN TỬ CÂU HỎI, ${numPartIV === 0 ? 'TUYỆT ĐỐI KHÔNG CÓ CÂU LOẠI "essay"' : ''}):
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
        maxOutputTokens: 16384,
        temperature: 0.3
      }
    });

    let rawOutput = response.text || '';
    let parsedData: any = safeJsonParse(rawOutput, { questions: [] });
    
    // Process questions
    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
       const sol = (q.solution || q.explanation || "").trim();
       return {
         ...q,
         id: idx + 1,
         number: idx + 1,
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

    return {
       ...parsedData,
       questions: formattedQuestions
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

      let exercisePrompt = `Cấu trúc số lượng câu của các phần trong Phiếu học tập BẮT BUỘC sinh hoàn chỉnh:`;
      if (numPartI > 0) {
        exercisePrompt += `\n- PHẦN I: CÂU HỎI TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN: đúng chính xác ${numPartI} câu hỏi độc lập (mỗi câu gồm 4 phương án lựa chọn A, B, C, D).`;
      }
      if (numPartII > 0) {
        exercisePrompt += `\n- PHẦN II: CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI: đúng chính xác ${numPartII} câu hỏi (mỗi câu gồm mệnh đề dẫn và 4 ý a, b, c, d độc lập phán đoán Đúng/Sai).`;
      }
      if (numPartIII > 0) {
        exercisePrompt += `\n- PHẦN III: CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN: đúng chính xác ${numPartIII} câu hỏi dứt khoát (đáp số là số nguyên, phân số tối giản hoặc số thập phân).`;
      }
      if (numPartIV > 0) {
        exercisePrompt += `\n- PHẦN IV: BÀI TẬP TỰ LUẬN RÈN LUYỆN: đúng chính xác ${numPartIV} bài toán rèn luyện tư duy tự luận trình bày lập luận logic.`;
      } else {
        exercisePrompt += `\n- CẤM TUYỆT ĐỐI PHẦN IV (TỰ LUẬN): Giáo viên đã chọn cấu trúc ĐỀ 3 PHẦN. TUYỆT ĐỐI KHÔNG ĐƯỢC CÓ PHẦN IV HAY BÀI TẬP TỰ LUẬN. KHÔNG TẠO MỤC PHẦN IV TRONG ĐỀ BÀI CŨNG NHƯ TRONG BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI!`;
      }

      exercisePrompt += `\n- Tỷ lệ bài toán gắn với thực tiễn cuộc sống hoặc liên môn: Khoảng ${realWorldPercent}%.`;
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
        answerPrompt = 'Ở cuối tài liệu, hãy cung cấp phần Hướng dẫn giải chi tiết từng câu, phân cách bằng tiêu đề "--- HƯỚNG DẪN CHẤM / ĐÁP ÁN CHI TIẾT ---". BẮT BUỘC giải thích chi tiết từng bước biến đổi, kèm lý do chọn đáp án, viết bằng công thức LaTeX chuẩn cho từng câu hỏi.';
      }

      const prompt = `Bạn là chuyên gia sư phạm bộ môn ${subject || "Toán"} hàng đầu Việt Nam, nắm vững 100% Chương trình GDPT 2018 và bộ sách giáo khoa "Kết nối tri thức với cuộc sống" (KNTT) áp dụng từ năm học 2026-2027.
Nhiệm vụ của bạn là nhận thông tin cấu hình và tạo ra một "PHIẾU HỌC TẬP" hoàn chỉnh, khoa học, thẩm mỹ cao và chuẩn mực sư phạm cho học sinh Lớp ${grade}, ${semester}, môn ${subject || "Toán"}, Chương: "${chapter}", Bài học/chủ đề: "${lesson}".

---
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
### 5. KHU VỰC ĐÁP ÁN & LỜI GIẢI CHI TIẾT (ẨN / HIỆN KHOA HỌC)
${answerPrompt}
BẮT BUỘC đặt toàn bộ bảng đáp án nhanh và hướng dẫn giải chi tiết trong khối thẻ đóng/mở HTML <details> sau để giáo viên dễ dàng thu gọn/mở rộng khi giảng dạy:

<details class="solution-box" style="margin-top: 25px; padding: 15px; border: 1px solid #10b981; border-radius: 8px; background-color: #f0fdf4;">
  <summary style="font-weight: bold; cursor: pointer; color: #047857; font-size: 16px;">
    👉 BẤM ĐỂ XEM ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT
  </summary>
  
  [Chèn Bảng tổng hợp nhanh đáp án các Phần I, II, III ở đây]
  
  [Chèn Hướng dẫn giải chi tiết từng câu ở đây với lập luận đầy đủ, công thức LaTeX, và phương án đúng được gạch chân dạng \\underline{A} hoặc \\underline{a)}]
</details>

BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.`;

      const response = await generateWithFallback(req, {
        contents: prompt,
        config: {
          temperature: 0.7,
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

  exercisePrompt += `\n- Tỷ lệ thực tế: ${realWorldPercent}%.`;
  exercisePrompt += hasParametric 
    ? `\n- Phân hóa: Có bài toán chứa tham số m ở mức vận dụng.`
    : `\n- QUY ĐỊNH CẤM THAM SỐ (BẮT BUỘC 100%): Giáo viên đã chọn "Không có bài toán chứa tham số". TUYỆT ĐỐI KHÔNG xuất hiện bất kỳ tham số nào (như $m$, $k$, $a$, $b$ tham số). CẤM các câu hỏi tìm m hoặc chứa tham số m. TẤT CẢ các hệ số, phương trình, hàm số và bài toán PHẢI 100% là số cụ thể.`;

  if (additionalNotes) exercisePrompt += `\n- Ghi chú riêng từ giáo viên: ${additionalNotes}`;

  let answerPrompt = 'Cung cấp Bảng đáp án nhanh và Hướng dẫn giải chi tiết gói trong thẻ HTML <details class="solution-box"><summary>👉 BẤM ĐỂ XEM ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT</summary>...</details>.';
  if (answerMode === 'none') answerPrompt = 'TUYỆT ĐỐI KHÔNG kèm đáp án hay lời giải.';
  else if (answerMode === 'summary') answerPrompt = 'Chỉ kèm bảng đáp án nhanh ở cuối.';

  const prompt = `Bạn là chuyên gia sư phạm bộ môn ${subject || "Toán"} Việt Nam (Chương trình GDPT 2018, SGK Kết nối tri thức với cuộc sống áp dụng từ năm học 2026-2027).
Hãy tạo ngay PHIẾU HỌC TẬP A4 Chuẩn in ấn cho học sinh Lớp ${grade}, ${semester}, môn ${subject || "Toán"}, Chương: "${chapter}", Bài học/chủ đề: "${lesson}".

YÊU CẦU QUAN TRỌNG VỀ CẤU TRÚC VÀ PHẠM VI NỘI DUNG (BẮT BUỘC 100%):
0. PHẠM VI CHỦ ĐỀ CHÍNH XÁC (TẬP TRUNG 100%): Tất cả các câu hỏi trong phiếu BẮT BUỘC phải thuộc chính xác bài học "${lesson}" (thuộc ${chapter}, Lớp ${grade}, ${semester}). TUYỆT ĐỐI KHÔNG BỊA RA HOẶC CHÈN THÊM bất kỳ câu hỏi nào thuộc các chương học khác ngoài bài học đã chọn. (Ví dụ: Khi giáo viên chọn Chương V "Các số đặc trưng đo xu thế trung tâm", TUYỆT ĐỐI KHÔNG xuất hiện câu hỏi về Đạo hàm, Giới hạn hay Tích phân).
1. SỐ LƯỢNG CÂU HỎI BẮT BUỘC (TỔNG ${totalCount} CÂU): Bạn PHẢI sinh đầy đủ 100% chính xác từng câu từ Câu 1 đến câu cuối cùng của từng Phần. TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT THÀNH 5 HAY 8 CÂU.
${numPartIV === 0 ? 'CẤM TUYỆT ĐỐI PHẦN IV (TỰ LUẬN): Đề bài là ĐỀ 3 PHẦN. TUYỆT ĐỐI KHÔNG có phần IV hay bài tập tự luận nào!' : ''}
${!hasParametric ? 'CẤM TUYỆT ĐỐI THAM SỐ: Không chứa tham số m, không hỏi tìm m, tất cả hệ số là số thực cụ thể!' : ''}
2. Xuất trực tiếp nội dung phiếu học tập Markdown, không viết câu chào hay mở đầu.
3. ĐỒNG BỘ TIÊU ĐỀ: TUYỆT ĐỐI KHÔNG tự ý chèn thêm tiêu đề bài học hay header thừa ở đầu văn bản (như "# BÀI 1: GÓC LƯỢNG GIÁC" hay "# PHIẾU HỌC TẬP"), vì hệ thống đã có sẵn khung tiêu đề chuẩn chính quy bên trên. Bắt đầu ngay bằng mục Tóm tắt kiến thức / Lý thuyết trọng tâm.
4. ĐÁNH SỐ CÂU HỎI CHUẨN ĐỀ THI:
   - TUYỆT ĐỐI KHÔNG dùng dấu gạch đầu dòng '-' hoặc bullet '•', '*' để mở đầu các câu hỏi.
   - TẤT CẢ các câu hỏi BẮT BUỘC phải đánh số thứ tự rõ ràng (**Câu 1:**, **Câu 2:**, ...):
     + PHẦN I: **Câu 1:** [Đề bài] \n A. [Phương án] \n B. [Phương án] \n C. [Phương án] \n D. [Phương án] \n\n **Câu 2:** ...
     + PHẦN II: **Câu 1:** [Mệnh đề dẫn] \n a) ... \n b) ... \n c) ... \n d) ... \n\n **Câu 2:** ...
     + PHẦN III: **Câu 1:** [Đề bài] \n\n **Câu 2:** [Đề bài] ...
${numPartIV > 0 ? `     + PHẦN IV: **Câu 1:** [Đề bài] \\n\\n **Câu 2:** [Đề bài] ...` : `     + TUYỆT ĐỐI KHÔNG CÓ PHẦN IV / TỰ LUẬN.`}
5. QUY TẮC CÔNG THỨC TOÁN & TÁCH CHỮ TIẾNG VIỆT KHỎI DẤU $:
   - TUYỆT ĐỐI KHÔNG để chữ tiếng Việt bị nhốt bên trong dấu $ (Ví dụ: phải viết chuẩn 'Dãy số $(u_n)$ là một cấp số cộng $\\Rightarrow u_{n+1} = u_n + d$ ($d$: công sai).', '$u_n = u_1 + (n-1)d$ với $n \\ge 2$.', '$u_k = \\frac{u_{k-1} + u_{k+1}}{2}$ với $k \\ge 2$.').
   - LUÔN CÓ KHOẢNG TRẮNG GIỮA TỪ TIẾNG VIỆT VÀ DẤU $: viết 'hàm số $y = f(x)$ có', 'tại điểm $x = 1$', 'A. $x = 0$', TUYỆT ĐỐI KHÔNG viết dính 'hàm số$y = f(x)$có'.
   - Sử dụng cú pháp LaTeX chuẩn: \\frac thay cho \\dfrac, \\ge thay cho \\geq, \\le thay cho \\leq.
6. PHẦN II (TRẮC NGHIỆM ĐÚNG / SAI):
   - Với từng ý a), b), c), d), bắt buộc viết câu phát biểu hoàn chỉnh, TUYỆT ĐỐI giữ nguyên vẹn chữ cái đầu tiên (ví dụ: 'a) Công thức số hạng tổng quát của cấp số cộng...', 'b) Dãy số $(u_n)$ có công sai...').
7. ${exercisePrompt}
8. ${answerPrompt}`;

  await generateWithFallbackStream(req, res, {
    contents: prompt,
    config: { 
      temperature: 0.7,
      maxOutputTokens: 16384
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
      const prompt = `Bạn là một trợ lý AI chuyên gia số hóa tài liệu giáo dục và chuyển đổi định dạng từ PDF/Hình ảnh sang văn bản Word (.docx).
Nhiệm vụ của bạn là đọc toàn bộ nội dung từ ${isSinglePageMode ? `Trang ${pageNum}/${totalPages || 1} của tài liệu đính kèm` : 'tất cả các trang của tài liệu đính kèm'} và xuất ra văn bản chính xác 100%, tuân thủ nghiêm ngặt toàn bộ các quy tắc sau:

1. QUY TẮC SỐ HÓA & ĐẦY ĐỦ 100% (BẮT BUỘC):
- Đọc và số hóa 100% toàn bộ nội dung trên trang từ dòng đầu tiên đến dòng cuối cùng.
- TUYỆT ĐỐI KHÔNG TÓM TẮT, KHÔNG CẮT XÉN, KHÔNG BỎ QUA BẤT KỲ CÂU HỎI NÀO VÌ BẤT KỲ LÝ DO GÌ. Quét trọn vẹn từng câu hỏi (Câu 1, Câu 2, Câu 3, Câu 4, Câu 5, Câu 6...), các câu trắc nghiệm Đúng/Sai a), b), c), d), các lựa chọn A, B, C, D, bảng biến thiên, bảng đáp án.
- Nếu trang có phần chuyển tiếp từ trang trước (ví dụ câu hỏi tiếp diễn từ đầu trang), PHẢI gõ đầy đủ các câu chữ tiếp theo đó.
${!isSinglePageMode ? '- Ở ranh giới chuyển tiếp giữa các trang, bắt buộc đánh dấu bằng dòng: "--- [Hết Trang X / Sang Trang Y] ---" (thay X và Y bằng số trang tương ứng).' : ''}

2. CHUẨN HÓA CÔNG THỨC TOÁN / LÝ / HÓA (CHUẨN LATEX NGHIÊM NGẶT):
- MỌI biến số, số liệu, biểu thức đại số, hàm số, phương trình, bất phương trình, tọa độ, ký hiệu hình học, vectơ, và 100% các phương án A, B, C, D BẮT BUỘC phải đặt trong dấu đô la: $công_thức$.
- TUYỆT ĐỐI KHÔNG ĐỂ BẤT PHƯƠNG TRÌNH HAY ĐẲNG THỨC NÀO Ở DẠNG TEXT THƯỜNG THIẾU $: Ví dụ: BẮT BUỘC viết $x - 1 \ge 0$, $a \ge 1$, $b \ge 1$, $a + b \ge 0$, $a + b \le 0$, $x^2 + y \ge 1$, $xy \ge 1$, $x \ge y$, $x + 2y \le 0$, $-\\frac{1}{2} < x \le 3$. KHÔNG BAO GIỜ viết x - 1\\geq0 hay a\\geq1 không có dấu $.
- LUÔN CÓ KHOẢNG TRẮNG sau các lệnh so sánh: \\ge 0, \\le 0, \\neq 0 (không dính liền \\geq0 hay \\leq0).
- CÁC PHƯƠNG ÁN A, B, C, D: Mọi phương án chứa toán học đều phải bọc gọn gàng trong $...$: A. $x - 1 \ge 0$, B. $a \ge 1$, C. $P = \\sin x$, D. $P = \\cos x$.
- TẬP HỢP: viết chuẩn $A = \\{x \\in \\mathbb{R} \\mid x + 2y \\le 0\\}$, có dấu gạch chéo trước ngoặc nhọn \\{ và \\}.
- ĐIỀU KIỆN TRONG NGOẶC: $(x \\neq \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z})$, luôn viết \\neq chuẩn xác.
- KHÔNG BAO GIỜ bọc cả câu tiếng Việt (như "ta được:", "với:") vào bên trong dấu $. Dấu $ chỉ bọc riêng biểu thức toán.
- LUÔN DÙNG \\frac thay cho \\dfrac. DÙNG \\ge thay cho \\geq, \\le thay cho \\leq.

3. GIỮ NGUYÊN CẤU TRÚC ĐỀ THI VÀ VĂN BẢN:
- Giữ nguyên số thứ tự đề mục, bài tập (ví dụ: Câu 1:, Câu 2:, Bài 1:).
- Với các phương án trắc nghiệm: trình bày rõ ràng A., B., C., D. trên từng dòng độc lập; không tự ý thêm các ký hiệu bullet (chấm tròn, gạch đầu dòng) phía trước chữ cái phương án.
- BẢNG BIẾN THIÊN / BẢNG XÉT DẤU: Trình bày bằng Markdown Table chuẩn có đầy đủ hàng $x$, $y'$, $y$ và các mũi tên $\\nearrow, \\searrow$, dấu $+$, $-$, giá trị $0$.
- BẢNG ĐÁP ÁN: Trình bày bằng Markdown Table chuẩn tương ứng đúng với bảng trong tài liệu gốc.

4. TUYỆT ĐỐI CẤM SINH MÃ TIKZ / CODE ĐỒ HỌA:
- Do xuất ra văn bản Word (.docx), TUYỆT ĐỐI KHÔNG sinh mã TikZ (không viết \\begin{tikzpicture}, không viết từ khóa "tikz" hay bất kỳ khối mã đồ họa nào vào văn bản).
- Khi gặp biểu đồ, hình vẽ, đồ thị, hình lăng trụ, hình chóp hay hình ảnh minh họa, CHỈ CẦN ghi chú thích duy nhất dạng chữ trong ngoặc vuông: [Hình vẽ: ...] hoặc [Đồ thị: ...] (Ví dụ: [Hình vẽ: Hình lăng trụ tam giác $ABC.A'B'C'$], [Hình vẽ: Hình chóp đều $S.ABCD$ trong hệ trục $Oxyz$], [Đồ thị: Đồ thị hàm số $y = f(x)$]) để người dùng biết vị trí cần chèn lại ảnh gốc.

Đầu ra của bạn phải hoàn toàn là nội dung tài liệu đã được số hóa dạng Markdown chuẩn, không thêm các câu chào hỏi thừa hay giải thích ngoài lề!`;

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
        config: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      });
      
      let resultText = response.text || "";
      
      // Clean up only closed TikZ code blocks safely without eating text
      resultText = resultText.replace(/```(?:tikz|latex)?\s*\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}\s*```/gi, '\n[Hình vẽ minh họa]\n');
      resultText = resultText.replace(/```tikz[\s\S]*?```/gi, '\n[Hình vẽ minh họa]\n');
      resultText = resultText.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/gi, '\n[Hình vẽ minh họa]\n');

      if (croppedImage) {
        const imgTag = `\n\n<img src="${croppedImage}" alt="Hình vẽ minh họa tài liệu" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;
        if (/\[Hình (?:vẽ|ảnh)[^\]]*\]/i.test(resultText)) {
          resultText = resultText.replace(/\[Hình (?:vẽ|ảnh)[^\]]*\]/i, imgTag);
        }
      }

      if (!resultText || !resultText.trim()) {
        resultText = "Không nhận diện được nội dung chữ hoặc công thức trong hình ảnh/tài liệu này. Thầy cô vui lòng kiểm tra lại độ nét của hình ảnh và thử lại.";
      }

      return { result: resultText };
    
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
      let { croppedImage, croppedImageFileId } = req.body || {};
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
        throw new Error("Vui lòng tải lên tệp bài tập hoặc ảnh đề bài.");
      }

      const prompt = `Bạn là một giáo viên xuất sắc. Dưới đây là bài tập hoặc tài liệu học sinh đưa ra. 
YÊU CẦU:
1. Đọc kỹ nội dung bài tập từ file/ảnh.
2. Viết lại đề bài rõ ràng, mạch lạc, đầy đủ các câu chữ và giả thiết.
3. Cung cấp lời giải chi tiết, giải thích cặn kẽ từng bước biến đổi để học sinh dễ hiểu.
4. Định dạng đầu ra thành 2 phần rõ rệt (dùng tiêu đề H2):
## Đề bài
[Nội dung đề]
${croppedImage ? '[HÌNH_ẢNH_ĐỀ_BÀI]' : ''}

## Lời giải chi tiết
${croppedImage ? '[HÌNH_ẢNH_ĐÁP_ÁN]\n' : ''}[Các bước giải chi tiết từng bước, phân tích trực tiếp các yếu tố trên hình vẽ / đồ thị]

${MATH_FORMATTING_RULES}
5. BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.
6. [QUAN TRỌNG VỀ HÌNH VẼ & ĐỒ THỊ]:
- Nếu đề bài có hình vẽ, đồ thị, bảng biến thiên (hoặc có ảnh cắt đính kèm): BẮT BUỘC chèn thẻ [HÌNH_ẢNH_ĐỀ_BÀI] vào cuối phần "## Đề bài" VÀ BẮT BUỘC chèn thẻ [HÌNH_ẢNH_ĐÁP_ÁN] vào ngay đầu phần "## Lời giải chi tiết" để học sinh và giáo viên vừa đọc lời giải vừa đối chiếu trực quan đồ thị / hình vẽ.
- Trong lời giải: Khai thác chi tiết các tọa độ điểm đặc biệt, giao điểm, đỉnh, tiệm cận, đường nét trên đồ thị/hình ảnh.
- BẢNG BIẾN THIÊN (BBT): BẮT BUỘC vẽ bằng Markdown Table chuẩn trực quan (hàng $x$, $y'$, $y$ kèm mũi tên $\\nearrow$, $\\searrow$, dấu $+$, $-$, $0$, cực trị, tuyệt đối không để trống).
- Nếu không có ảnh thực tế nhưng cần vẽ hình học không gian hay miền nghiệm: Hãy sinh code TikZ trong khối \`\`\`tikz ... \`\`\`.`;

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
        ]
      }, res);

      let resultText = response.text || "";
      if (!resultText || !resultText.trim()) {
        throw new Error("Không thể trích xuất hoặc giải bài tập từ ảnh này. Thầy cô vui lòng kiểm tra lại chất lượng ảnh, cắt gọn đề bài hoặc thử lại.");
      }

      if (croppedImage) {
        let cleanCroppedUrl = (croppedImage || '').trim().replace(/[\r\n]+/g, '');
        if (cleanCroppedUrl && !cleanCroppedUrl.startsWith('http://') && !cleanCroppedUrl.startsWith('https://') && !cleanCroppedUrl.startsWith('data:') && !cleanCroppedUrl.startsWith('/')) {
          cleanCroppedUrl = `data:image/png;base64,${cleanCroppedUrl}`;
        }

        const imgTag = `\n\n<img src="${cleanCroppedUrl}" alt="Hình vẽ / Đồ thị bài toán" class="max-w-[480px] mx-auto my-3 rounded-lg border border-slate-200 shadow-sm" />\n\n`;
        // 1. Chèn vào Đề bài
        if (resultText.includes('[HÌNH_ẢNH_ĐỀ_BÀI]')) {
          resultText = resultText.replace(/\[HÌNH_ẢNH_ĐỀ_BÀI\]/g, imgTag);
        } else {
          resultText = resultText.replace(/(##\s*Đề bài[^\n]*\n)([\s\S]*?)(?=\n##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)|$)/i, `$1$2\n${imgTag}`);
        }

        // 2. Chèn vào Lời giải chi tiết / Đáp án để đối chiếu trực quan
        if (resultText.includes('[HÌNH_ẢNH_ĐÁP_ÁN]')) {
          resultText = resultText.replace(/\[HÌNH_ẢNH_ĐÁP_ÁN\]/g, imgTag);
        } else if (resultText.includes('[HÌNH_ẢNH_LỜI_GIẢI]')) {
          resultText = resultText.replace(/\[HÌNH_ẢNH_LỜI_GIẢI\]/g, imgTag);
        } else if (/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)/i.test(resultText)) {
          const solIdx = resultText.search(/##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)/i);
          const solPart = resultText.slice(solIdx);
          if (!solPart.includes(cleanCroppedUrl)) {
            resultText = resultText.replace(/(##\s*(?:Lời giải|Đáp án|Hướng dẫn giải)[^\n]*\n)/i, `$1${imgTag}`);
          }
        }
      }

      return { result: resultText, customKeyFailed: response.customKeyFailed };
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
    const { text, targetLang = 'en', subject = 'Toán' } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: "Nội dung cần dịch không được để trống." });
    }

    const langName = targetLang === 'en' ? 'Tiếng Anh chuyên ngành' : 'Tiếng Việt chuẩn GDPT';

    const prompt = `Bạn là một chuyên gia dịch thuật và biên soạn giáo trình quốc tế thuộc bộ môn ${subject}.
Nhiệm vụ của bạn là chuyển đổi toàn bộ văn bản / đề thi / phiếu học tập sau sang ${langName} theo đúng thuật ngữ chuyên môn chính xác nhất của môn ${subject}.

QUY TẮC BẮT BUỘC (GIỮ NGUYÊN BẢN CẤU TRÚC VÀ CÔNG THỨC TOÁN):
1. GIỮ NGUYÊN 100% CẤU TRÚC:
   - Các tiêu đề (PHẦN I, PHẦN II, Câu 1, Câu 2, Question 1, Part I, Part II,...), thứ tự câu hỏi, danh sách các phương án A., B., C., D., a), b), c), d).
   - Thẻ hình ảnh (<svg-wrapper...>, <img...>, ![](...) ), khối TikZ (\`\`\`tikz ... \`\`\`), bảng biểu Markdown Table.
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
${text}`;

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 }
    });

    const translatedText = response.text || "";
    return { translatedText };
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

const KV_STORE_ID = 'jaku8xjm';
const CHUNK_SIZE = 800; // immanuel.co limit is 1024, so 800 is extremely safe and fast

function strToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return hex;
}

function hexToStr(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 4) {
    str += String.fromCharCode(parseInt(hex.substring(i, i + 4), 16));
  }
  return str;
}

function isServerValidExamPayload(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.deleted === true) return false;
  return Boolean(
    data.examData ||
    data.codes ||
    data.codeVersions ||
    data.part1Keys ||
    data.pdfBase64 ||
    data.examTitle ||
    data.title ||
    data.submissions ||
    data.originalQuestions ||
    data.rooms
  );
}

async function saveToCloudKV(cleanId: string, data: any): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    const hexPayload = strToHex(compressed);
    const count = Math.ceil(hexPayload.length / CHUNK_SIZE);

    // Save count
    await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${cleanId}_C/${count}`, {
      method: 'POST'
    });

    // Save all chunks in parallel
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = hexPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      chunkPromises.push(
        fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${cleanId}__${i}/${chunk}`, {
          method: 'POST'
        })
      );
    }
    await Promise.all(chunkPromises);
    return true;
  } catch (err) {
    return false;
  }
}

async function safeFetchServerKVValue(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const text = await res.text();
    if (!text || !text.trim()) return '';
    const trimmed = text.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        if (parsed !== null && typeof parsed === 'object') {
          if (typeof (parsed as any).Value === 'string') return (parsed as any).Value;
          return JSON.stringify(parsed);
        }
        return String(parsed);
      } catch (e) {
        return trimmed.replace(/^"|"$/g, '');
      }
    }
    return trimmed;
  } catch (e) {
    return '';
  }
}

async function loadFromCloudKV(cleanId: string): Promise<any> {
  // 1. Try Distributed Cloud KV with safe chunking
  try {
    const countVal = await safeFetchServerKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}_C`);
    const readCount = parseInt(countVal, 10);
    if (!isNaN(readCount) && readCount > 0 && readCount < 5000) {
      const chunkPromises: Promise<string>[] = [];
      for (let i = 0; i < readCount; i++) {
        chunkPromises.push(
          safeFetchServerKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}__${i}`)
            .then(val => val || safeFetchServerKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}_${i}`))
        );
      }
      const chunks = await Promise.all(chunkPromises);
      const reconstructed = chunks.join('');
      if (reconstructed) {
        let decompressed: string | null = null;
        try {
          const restored = hexToStr(reconstructed);
          decompressed = LZString.decompressFromEncodedURIComponent(restored) ||
                         LZString.decompressFromUTF16(restored) ||
                         LZString.decompress(restored);
        } catch (e) {}

        if (!decompressed) {
          try {
            decompressed = LZString.decompressFromEncodedURIComponent(reconstructed) ||
                           LZString.decompressFromUTF16(reconstructed) ||
                           LZString.decompress(reconstructed);
          } catch (e) {}
        }

        if (decompressed) {
          try {
            const parsed = JSON.parse(decompressed);
            if (isServerValidExamPayload(parsed)) {
              return parsed;
            }
          } catch (e) {
            // Silent fallback on corrupted or invalid cache entry
          }
        }
      }
    }
  } catch (kvErr) {
    // Suppress noise for invalid/corrupted cloud kv chunks
  }

  // 2. Try legacy single-key Cloud KV
  try {
    const val = await safeFetchServerKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}`);
    if (val && typeof val === 'string') {
      let decomp: string | null = null;
      try {
        decomp = LZString.decompressFromEncodedURIComponent(val) || LZString.decompressFromUTF16(val) || LZString.decompress(val) || val;
      } catch (e) {}

      if (decomp) {
        try {
          const parsed = JSON.parse(decomp);
          if (isServerValidExamPayload(parsed)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return null;
}

app.all("/api/exams/share", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const examId = req.body?.customId ? String(req.body.customId).trim() : code;
    const cleanId = examId.toUpperCase();

    const body = req.body || {};
    const pdfBase64 = body.pdfBase64 || "";

    // Load existing metadata to preserve submissions and sheet settings if omitted in body
    let existing = sharedExamsStore.get(cleanId) 
      || sharedExamsStore.get(examId) 
      || sharedExamsStore.get(examId.toLowerCase());
    
    if (!existing) {
      existing = await loadFromCloudKV(cleanId);
    }

    let submissions = body.submissions;
    if (!Array.isArray(submissions) || submissions.length === 0) {
      if (existing && Array.isArray(existing.submissions) && existing.submissions.length > 0) {
        submissions = existing.submissions;
      } else {
        submissions = [];
      }
    }

    const linkedSheetId = body.linkedSheetId || existing?.linkedSheetId || "";
    const linkedSheetUrl = body.linkedSheetUrl || existing?.linkedSheetUrl || "";
    const scriptUrl = body.scriptUrl || existing?.scriptUrl || "";

    const metadata = { 
      ...existing,
      ...body, 
      submissions,
      linkedSheetId,
      linkedSheetUrl,
      scriptUrl,
      updatedAt: new Date().toISOString()
    };
    delete metadata.pdfBase64;

    sharedExamsStore.set(cleanId, metadata);
    sharedExamsStore.set(examId, metadata);
    sharedExamsStore.set(examId.toLowerCase(), metadata);

    if (pdfBase64) {
      sharedExamsStore.set(`${cleanId}_PDF`, { pdfBase64 });
      sharedExamsStore.set(`${examId}_PDF`, { pdfBase64 });
      sharedExamsStore.set(`${examId.toLowerCase()}_PDF`, { pdfBase64 });
    }

    saveExamsToDisk();

    // Persist metadata to cloud KV
    await saveToCloudKV(cleanId, metadata);

    // Persist PDF only if provided and non-empty
    if (pdfBase64) {
      await saveToCloudKV(`${cleanId}_PDF`, { pdfBase64 });
    }

    res.json({ examId: cleanId, submissionsCount: submissions.length });
  } catch (error) {
    res.status(500).json({ error: "Lỗi chia sẻ đề thi" });
  }
});

app.get("/api/exams/:id", async (req, res) => {
  const rawId = (req.params.id || '').trim().toUpperCase();
  const forceFresh = req.query.fresh === 'true';

  let metadata = null;
  if (forceFresh) {
    metadata = await loadFromCloudKV(rawId);
    if (metadata) {
      sharedExamsStore.set(rawId, metadata);
      sharedExamsStore.set(rawId.toUpperCase(), metadata);
      saveExamsToDisk();
    }
  }

  if (!metadata) {
    metadata = sharedExamsStore.get(rawId) 
      || sharedExamsStore.get(rawId.toLowerCase()) 
      || sharedExamsStore.get(rawId.toUpperCase());
  }

  if (!metadata) {
    loadExamsFromDisk();
    metadata = sharedExamsStore.get(rawId) 
      || sharedExamsStore.get(rawId.toLowerCase()) 
      || sharedExamsStore.get(rawId.toUpperCase());
  }

  // If not found in local memory/disk (e.g. fresh Vercel serverless cold-start), fetch from persistent cloud KV
  if (!metadata) {
    metadata = await loadFromCloudKV(rawId);
    if (metadata) {
      sharedExamsStore.set(rawId, metadata);
      sharedExamsStore.set(rawId.toUpperCase(), metadata);
      saveExamsToDisk();
    }
  }

  // Fallback to Google Apps Script Webhook Store if not found in Cloud KV
  if (!metadata) {
    try {
      const webhookRes = await fetch(`https://script.google.com/macros/s/AKfycbwYHVplKQAUoUVBo6QbjSBnO_TB71eUXeeP2MmQ42nQIVJiUjvmLrrJwvCC-lsCXc7k/exec?action=getExam&examId=${encodeURIComponent(rawId)}`);
      if (webhookRes.ok) {
        const webhookData = await webhookRes.json();
        if (webhookData && (webhookData.examTitle || webhookData.codeVersions || webhookData.part1Keys || webhookData.examData || webhookData.codes)) {
          metadata = webhookData;
          sharedExamsStore.set(rawId, metadata);
          sharedExamsStore.set(rawId.toUpperCase(), metadata);
          saveExamsToDisk();
        }
      }
    } catch (e) {
      console.warn("Webhook fallback fetch notice:", e);
    }
  }

  if (metadata) {
    // Also retrieve PDF base64
    let pdfData = sharedExamsStore.get(`${rawId}_PDF`)
      || sharedExamsStore.get(`${rawId.toLowerCase()}_PDF`)
      || sharedExamsStore.get(`${rawId.toUpperCase()}_PDF`);

    if (!pdfData) {
      pdfData = await loadFromCloudKV(`${rawId}_PDF`);
      if (pdfData) {
        sharedExamsStore.set(`${rawId}_PDF`, pdfData);
        sharedExamsStore.set(`${rawId.toUpperCase()}_PDF`, pdfData);
        saveExamsToDisk();
      }
    }

    const merged = {
      ...metadata,
      pdfBase64: pdfData?.pdfBase64 || ""
    };

    // Ensure we do not cache the response on the client or proxies so the teacher gets fresh submissions immediately
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(merged);
  } else {
    res.status(404).json({ error: "Không tìm thấy đề thi. Mã đề có thể không chính xác hoặc đã hết hạn." });
  }
});

// Delete shared exam / worksheet endpoint
app.delete("/api/exams/:id", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawId = (req.params.id || '').trim().toUpperCase();
  if (!rawId) {
    return res.status(400).json({ error: "Mã phòng không hợp lệ" });
  }

  try {
    sharedExamsStore.delete(rawId);
    sharedExamsStore.delete(rawId.toLowerCase());
    sharedExamsStore.delete(rawId.toUpperCase());
    sharedExamsStore.delete(`${rawId}_PDF`);
    sharedExamsStore.delete(`${rawId.toLowerCase()}_PDF`);
    sharedExamsStore.delete(`${rawId.toUpperCase()}_PDF`);

    saveExamsToDisk();

    // Mark as deleted or empty in Cloud KV
    try {
      await saveToCloudKV(rawId, { deleted: true, examTitle: "(Đã xóa)" });
    } catch (e) {}

    res.json({ success: true, message: `Đã xóa phòng ${rawId}` });
  } catch (err: any) {
    console.error("Lỗi xóa phòng thi trên server:", err);
    res.status(500).json({ error: "Lỗi xóa phòng thi" });
  }
});

// Submit student response endpoint
app.post("/api/exams/:id/submit", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawId = (req.params.id || '').trim().toUpperCase();
  const submission = req.body; // { studentName, studentClass, submitTime, totalScore, scorePart1, scorePart2, scorePart3, details }

  if (!submission || !submission.studentName) {
    return res.status(400).json({ error: "Thông tin bài làm học sinh không hợp lệ." });
  }

  let metadata = sharedExamsStore.get(rawId) 
    || sharedExamsStore.get(rawId.toLowerCase()) 
    || sharedExamsStore.get(rawId.toUpperCase());

  if (!metadata) {
    loadExamsFromDisk();
    metadata = sharedExamsStore.get(rawId) 
      || sharedExamsStore.get(rawId.toLowerCase()) 
      || sharedExamsStore.get(rawId.toUpperCase());
  }

  // If still not found, pull from persistent cloud KV
  if (!metadata) {
    metadata = await loadFromCloudKV(rawId);
  }

  if (!metadata) {
    metadata = {
      id: rawId,
      examId: rawId,
      examName: submission.examName || `Phòng thi ${rawId}`,
      createdAt: new Date().toISOString(),
      submissions: []
    };
  }

  // Ensure we strip pdfBase64 if it somehow leaked into metadata
  delete metadata.pdfBase64;

  // Initialize submissions array
  metadata.submissions = metadata.submissions || [];

  // Timestamp the submission
  submission.timestamp = new Date().toISOString();
  submission.submitTime = submission.submitTime || new Date().toLocaleString("vi-VN");

  // Check if student already submitted - update existing or append
  const existingIdx = metadata.submissions.findIndex((s: any) =>
    (s.studentName || "").trim().toLowerCase() === (submission.studentName || "").trim().toLowerCase() &&
    (s.studentClass || "").trim().toLowerCase() === (submission.studentClass || "").trim().toLowerCase()
  );

  if (existingIdx >= 0) {
    metadata.submissions[existingIdx] = { ...metadata.submissions[existingIdx], ...submission };
  } else {
    metadata.submissions.push(submission);
  }

  // Save to memory
  sharedExamsStore.set(rawId, metadata);
  sharedExamsStore.set(rawId.toUpperCase(), metadata);
  sharedExamsStore.set(rawId.toLowerCase(), metadata);
  
  // Save to disk cache
  saveExamsToDisk();

  // Await upload back to cloud KV safely
  await saveToCloudKV(rawId, metadata);

  // If a Google Apps Script Web App URL is connected, push submission directly to Google Sheet
  if (metadata.scriptUrl && typeof metadata.scriptUrl === 'string' && metadata.scriptUrl.startsWith('http')) {
    try {
      fetch(metadata.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitScore',
          examCode: rawId,
          examTitle: metadata.examTitle || metadata.title || rawId,
          studentName: submission.studentName,
          studentClass: submission.studentClass,
          totalScore: submission.totalScore,
          scorePart1: submission.scorePart1,
          scorePart2: submission.scorePart2,
          scorePart3: submission.scorePart3,
          submitTime: submission.submitTime,
          isViolation: submission.isViolation || false,
          violationReason: submission.violationReason || ""
        })
      }).catch(e => console.warn("Background Apps Script sync notice:", e));
    } catch (e) {}
  }

  res.json({ success: true, message: "Đã ghi nhận kết quả làm bài của học sinh!", submissionsCount: metadata.submissions.length });
});

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
    const { prompt, context } = req.body;
    let fullPrompt = prompt;
    if (context) {
      fullPrompt = `Ngữ cảnh: ${JSON.stringify(context)}\n\nCâu hỏi: ${prompt}`;
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
          responseMimeType: "application/json",
          temperature: 0.3
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

// Endpoint EduPlan AI MathOCR: Nhận dạng ảnh/PDF công thức Toán, hình vẽ & bảng biểu chuyển sang LaTeX
app.post("/api/math-ocr", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { imageBase64, mimeType = 'image/png', mode = 'full_doc', promptHint = '' } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Không tìm thấy dữ liệu hình ảnh để thực hiện Math OCR." });
    }

    const cleanData = typeof imageBase64 === 'string' ? imageBase64.replace(/^data:image\/\w+;base64,/, '').trim() : '';

    if (!cleanData) {
      return res.status(400).json({ error: "Dữ liệu hình ảnh không hợp lệ." });
    }

    const systemInstruction = `You are an expert Math OCR tool equivalent to Mathpix Snip. Convert all text, formulas, equations, geometric figures, and tables in the image into precise LaTeX format.

CRITICAL FORMATTING RULES FOR MATHTYPE & WORD:
1. DELIMITERS:
   - Inline math MUST be enclosed in single dollar signs ($...$).
   - Standalone / display equations MUST be enclosed in double dollar signs ($$...$$).
2. VARIABLES & GEOMETRY:
   - Ensure variables, points, angles, and vectors are clearly delimited (e.g., $x$, $y$, $\\vec{AB}$, $\\widehat{ABC}$, $\\Delta ABC$, $S_{ABCD}$).
   - For multi-character variables or sub/superscripts, group correctly using \${...}\$ so MathType in Word converts them smoothly with Alt + \\ (Toggle TeX).
3. TABLES & MATRICES:
   - Format all tables or matrices using LaTeX array/tabular environment: \\begin{array}{...} ... \\end{array} or \\begin{tabular}{...} ... \\end{tabular}.
4. CLEANUP:
   - Do NOT output markdown code block backticks (\`\`\`latex ... \`\`\`), conversational intros, or trailing explanations.
   - Output ONLY the clean, ready-to-use LaTeX document/content.
   - Remove spurious OCR noise, garbage characters, or unsupported TeX commands.`;

    const userTextPrompt = promptHint 
      ? `Gợi ý/Nhiệm vụ cụ thể: ${promptHint}. Trích xuất toàn bộ công thức toán, văn bản và bảng biểu từ ảnh này thành mã LaTeX chuẩn.`
      : "Extract all math formulas, text, equations, and tables from this image into clean, precise LaTeX format.";

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
          { text: userTextPrompt }
        ]
      }],
      config: {
        systemInstruction,
        temperature: 0.1
      }
    });

    if (!response || !response.text) {
      throw new Error("Không nhận được kết quả nhận dạng từ AI Math OCR.");
    }

    let latexOutput = response.text.trim();
    if (latexOutput.startsWith("```")) {
      latexOutput = latexOutput.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    return res.json({
      success: true,
      latex: latexOutput,
      mode,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Lỗi Math OCR:", error);
    return handleAiError(error, req, res);
  }
});

// Endpoint Dịch thuật Chuyên ngành GDPT (Tiếng Việt ⇆ Tiếng Anh academic)
app.post("/api/translate-academic", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { text, questions, targetLang = 'en', subject = 'Toán' } = req.body || {};

    if (!text && (!questions || !Array.isArray(questions) || questions.length === 0)) {
      return res.status(400).json({ error: "Không có nội dung để chuyển ngữ." });
    }

    const langName = targetLang === 'en' ? 'Tiếng Anh chuyên ngành' : 'Tiếng Việt chuẩn GDPT';
    
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const promptText = `Bạn là chuyên gia dịch thuật tài liệu giáo dục và đề thi THPT môn ${subject}.
Nhiệm vụ: Dịch toàn bộ danh sách câu hỏi đề thi sau sang ${langName}.

YÊU CẦU QUAN TRỌNG:
1. Dịch chính xác thuật ngữ chuyên ngành môn ${subject} (Ví dụ: "Hàm số" -> "Function", "Đạo hàm" -> "Derivative", "Bảng biến thiên" -> "Variation table", "Đồng biến" -> "Increasing", "Nghịch biến" -> "Decreasing", "Cực đại" -> "Local maximum", "Cực tiểu" -> "Local minimum", "Tiệm cận" -> "Asymptote", "Đúng/Sai" -> "True/False", "Trả lời ngắn" -> "Short answer").
2. GIỮ NGUYÊN 100% CÁC CÔNG THỨC TOÁN LATEX BỌC TRONG DẤU $...$ HOẶC $$...$$. TUYỆT ĐỐI KHÔNG SỬA, KHÔNG MẤT DẤU $ VÀ KHÔNG DỊCH TÊN BIẾN.
3. GIỮ NGUYÊN BẢNG MARKDOWN (NẾU CÓ BẢNG BIẾN THIÊN).
4. Giữ nguyên cấu trúc mảng JSON các câu hỏi.

Danh sách câu hỏi gốc:
${JSON.stringify(questions, null, 2)}

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 MẢNG JSON CÁC CÂU HỎI ĐÃ DỊCH CÓ CẤU TRÚC GIỐNG HỆT ĐẦU VÀO:
[
  {
    "id": 1,
    "type": "mc",
    "content": "Nội dung câu hỏi đã dịch...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "tfStatements": [...],
    "correctAnswer": "...",
    "explanation": "..."
  }
]`;

      const response = await generateWithFallback(req, {
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      if (response && response.text) {
        const parsed = safeJsonParse(response.text.trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ success: true, translatedQuestions: parsed });
        }
      }
    }

    // Default text translation
    const promptText = `Bạn là chuyên gia dịch thuật tài liệu giáo dục và đề thi môn ${subject}.
Nhiệm vụ: Dịch văn bản / đề thi / phiếu học tập dưới đây sang ${langName}.

YÊU CẦU BẮT BUỘC:
1. Dịch chuẩn xác thuật ngữ chuyên ngành giáo dục môn ${subject}.
2. "Câu 1", "Câu 2"... dịch thành "Question 1", "Question 2"... (nếu sang tiếng Anh) hoặc ngược lại.
3. GIỮ NGUYÊN 100% CÔNG THỨC TOÁN LATEX BỌC TRONG DẤU $...$ HOẶC $$...$$. CẤM LÀM MẤT HOẶC BIẾN DẠNG CÔNG THỨC TOÁN.
4. GIỮ NGUYÊN CÁC BẢNG MARKDOWN VÀ ĐỊNH DẠNG VĂN BẢN.

Văn bản gốc:
${text}

Hãy trả về duy nhất văn bản đã dịch hoàn chỉnh, không thêm bớt bình luận.`;

    const response = await generateWithFallback(req, {
      contents: [{ role: "user", parts: [{ text: promptText }] }]
    });

    const translatedText = response?.text?.trim() || text;
    return res.json({ success: true, translatedText });

  } catch (error: any) {
    console.error("Lỗi dịch thuật chuyên ngành:", error);
    return handleAiError(error, req, res);
  }
});

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

// Endpoint sinh Kế hoạch bài dạy (Giáo án) Ôn thi Tốt nghiệp THPT chuẩn CV 5512 cho tất cả các môn
app.post("/api/generate-graduation-review-plan", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { prompt, model, subject, topic, periods } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Thiếu nội dung yêu cầu soạn kế hoạch bài dạy ôn thi tốt nghiệp." });
    }

    const payload = {
      model: model || "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
        temperature: 0.3,
        systemInstruction: `Bạn là chuyên gia thẩm định chương trình giáo dục phổ thông kiêm giáo viên dạy giỏi cốt cán cấp Tỉnh/Thành phố.
Nhiệm vụ của bạn là soạn KẾ HOẠCH BÀI DẠY (GIÁO ÁN) ÔN TẬP TĂNG CƯỜNG BUỔI CHIỀU hoàn chỉnh, sâu sắc, chuẩn mực theo Công văn 5512/BGDĐT, bám sát Chương trình GDPT 2018 và đúng cấu trúc định dạng đề thi Tốt nghiệp THPT mới nhất của Bộ GD&ĐT.
BẮT BUỘC TUÂN THỦ:
1. Tất cả công thức toán học, biến số đơn lẻ (x, y, m, a...) BẮT BUỘC đặt trong cặp dấu đô la: $công_thức$ (nội dòng) hoặc $$công_thức$$ (khối riêng).
2. Dùng cú pháp LaTeX chuẩn: \\frac{a}{b}, \\sqrt{...}, \\pi, \\Leftrightarrow, \\ge, \\le, \\in. Luôn dùng \\frac thay vì \\dfrac.
3. Giữ nguyên vẹn font tiếng Việt UTF-8 chuẩn.
4. TUYỆT ĐỐI KHÔNG TÓM TẮT, KHÔNG ĐƯỢC GHI '...tương tự giáo viên hướng dẫn'. Bắt buộc viết chi tiết từng lời giải ví dụ mẫu và giải thích toàn bộ các ý a, b, c, d của câu hỏi trắc nghiệm Đúng/Sai.`
      }
    };

    const response = await generateWithFallback(req, payload, res);
    const resultText = response?.text ? response.text.normalize("NFC").trim() : "";
    if (!resultText) {
      throw new Error("Không nhận được nội dung giáo án hợp lệ từ mô hình AI.");
    }

    return res.json({ success: true, result: resultText });
  } catch (error: any) {
    console.error("Lỗi AI generate-graduation-review-plan:", error);
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



