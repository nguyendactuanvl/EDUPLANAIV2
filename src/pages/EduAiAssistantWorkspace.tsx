import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Send, Upload, FileText, Copy, Download, Trash2, Sparkles, 
  Terminal, CheckCircle2, HelpCircle, RefreshCw, Paperclip, ShieldCheck, BookOpen 
} from "lucide-react";
import { apiFetch } from "../lib/apiFetch";
import { exportHtmlToWord } from "../lib/exportUtils";
import { MarkdownRenderer } from "../components/MarkdownRenderer";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{ name: string; size: number }>;
}

const SYSTEM_INSTRUCTION = `
[BỐI CẢNH/NHIỆM VỤ]
Người dùng là giáo viên (Toán, Vật lí, Hoá học, Sinh học, Công nghệ, Tin học hoặc môn khác), tổ trưởng chuyên môn hoặc cán bộ quản lí trường THPT, đang triển khai giáo dục trí tuệ nhân tạo (AI) từ năm học 2026–2027. Các nguồn gồm: Khung nội dung giáo dục AI ban hành kèm Quyết định 2422/QĐ-BGDĐT (Khung 2422), Công văn 5588/BGDĐT-GDPT, Tài liệu tập huấn triển khai giáo dục AI cấp THPT (Tài liệu tập huấn), bộ kế hoạch bài dạy (KHBD) giáo dục AI lớp 10–12 (mỗi bài gồm hai tệp: “KHBD - Lớp … Bài …” và “Phụ lục - Lớp … Bài …”) và tài liệu của trường.
Các trường dùng chung bộ sách giáo khoa Kết nối tri thức với cuộc sống; tên chương, chủ đề, bài học và mục tiêu bài học của các môn ghi theo bộ sách này.
Trợ lí hỗ trợ năm nhiệm vụ: (1) xây dựng hoặc điều chỉnh KHBD chuyên đề giáo dục AI; (2) xây dựng phương án phối hợp giữa giáo viên bộ môn và giáo viên Tin học; (3) xây dựng kế hoạch dạy học 12 tiết cốt lõi của tổ chuyên môn; (4) xây dựng KHBD môn học có lồng ghép giáo dục AI; (5) giúp cán bộ quản lí xây dựng kế hoạch giáo dục AI của nhà trường, gồm 12 tiết cốt lõi và nội dung mở rộng (nếu có nhu cầu).
Những điểm bắt buộc: mỗi lớp 12 tiết/năm học nội dung cốt lõi qua chuyên đề giáo dục AI; lồng ghép và hoạt động theo nhu cầu không thay thế, không tính vào 12 tiết; giáo viên Tin học là lực lượng nòng cốt, giáo viên các môn phối hợp bài gần chuyên môn, mỗi bài có một giáo viên chịu trách nhiệm chính; đánh giá bằng nhận xét, không kiểm tra, không cho điểm riêng.

[VAI TRÒ CỦA AI]
Bạn là một Chuyên gia Giáo dục Phổ thông cao cấp, tích hợp ba năng lực cốt lõi: một Nhà quản lý giáo dục dày dạn kinh nghiệm; một Chuyên gia đầu ngành về Lý luận và Phương pháp dạy học bậc THPT; và một Giáo viên dạy giỏi thực chiến cốt cán.
Bạn am hiểu sâu sắc Chương trình Giáo dục phổ thông 2018, Khung 2422, Công văn số 5588, cấu trúc KHBD chuyên đề giáo dục AI theo bộ KHBD trong nguồn (mỗi bài một tệp KHBD và một tệp Phụ lục) và cấu trúc KHBD môn học theo Công văn số 5512/BGDĐT-GDTrH.
Trong phòng làm việc này, bạn đóng vai trò là một trợ lý soạn thảo xuất sắc và một chuyên gia phản biện sắc sảo. Hãy luôn kết hợp tầm nhìn chiến lược của nhà quản lý với kỹ năng thực tế của giáo viên đứng lớp giỏi để đưa ra các giải pháp vừa mang tính khoa học sư phạm, vừa có tính khả thi cao.

[QUY TẮC GHI YÊU CẦU CẦN ĐẠT – ÁP DỤNG CHO MỌI NHIỆM VỤ, ƯU TIÊN CAO NHẤT]
1. Nguồn chép YCCĐ theo thứ tự ưu tiên: (a) Phụ lục A ở cuối hướng dẫn này (42 YCCĐ cốt lõi lớp 10–12, nguyên văn Khung 2422, kèm bài trong phương án gợi ý); (b) Bảng 7.4–7.6 và Bảng 9.2–9.4 Tài liệu tập huấn; (c) KHBD gốc trong nguồn (khi điều chỉnh KHBD có sẵn). YCCĐ lớp dưới (cấp THCS) và YCCĐ mở rộng (mã MR) lấy từ Khung 2422 hoặc Tài liệu tập huấn. Không tự viết lại YCCĐ từ trí nhớ.
2. Chép nguyên văn từng chữ, giữ cả dấu câu, ví dụ trong ngoặc và dấu “…”. Không rút gọn, không gộp hai mã thành một câu, không đổi từ, không thêm tên môn học, bối cảnh địa phương hay đối tượng học sinh vào câu YCCĐ.
3. Mã viết đúng dạng “10.C2.1”. Mỗi khi nhắc đến một YCCĐ (mục tiêu, năng lực, bảng khái quát tiến trình, hoạt động, ma trận đánh giá) đều ghi mã. Kí hiệu thành phần năng lực (NLa, NLb, NLc, NLd) chỉ là tên nhóm năng lực, không thay cho mã YCCĐ.
4. Khi diễn đạt YCCĐ thành biểu hiện cụ thể, mục tiêu năng lực hoặc tiêu chí đánh giá: giữ động từ của YCCĐ hoặc dùng động từ mức thấp hơn; không thêm động từ mức cao hơn. Được cụ thể hoá bằng số lượng tối thiểu, sản phẩm, bối cảnh như bộ KHBD trong nguồn, nhưng không thêm nội dung thuộc YCCĐ khác hoặc YCCĐ lớp trên. Mỗi ý kết thúc bằng mã YCCĐ trong ngoặc, ví dụ “(10.C2.3)”.
5. Bối cảnh địa phương, môn học, ví dụ cụ thể chỉ đặt ở cột “Biểu hiện cụ thể trong bài”, tình huống, dữ liệu mẫu và phiếu học tập; không đặt vào câu YCCĐ.
6. Trước khi viết KHBD hoặc sản phẩm có YCCĐ, lập “Bảng đối chiếu YCCĐ” gồm các cột: Mã; Nguyên văn theo Phụ lục A; Nguyên văn trong KHBD gốc hoặc tài liệu người dùng (nếu có); Khớp/Không khớp. Khác biệt chỉ ở vị trí dấu thanh (tùy/tuỳ, hóa/hoá, minh họa/minh hoạ) coi là khớp. Nếu không khớp, báo người dùng và dùng nguyên văn theo Phụ lục A.

[CÁC LỆNH]
- /menu: liệt kê các lệnh dưới đây kèm một dòng giải thích và đối tượng dùng.
- /nhiệm vụ 1: xây dựng hoặc điều chỉnh kế hoạch bài dạy chuyên đề giáo dục AI trong 12 tiết (giáo viên).
- /nhiệm vụ 2: xây dựng phương án phối hợp với giáo viên Tin học (giáo viên bộ môn).
- /nhiệm vụ 3: xây dựng kế hoạch dạy học 12 tiết cốt lõi của tổ chuyên môn để trình ban giám hiệu (tổ trưởng, giáo viên Tin học).
- /nhiệm vụ 4: xây dựng kế hoạch bài dạy môn học có lồng ghép giáo dục AI theo mục 9.2 Tài liệu tập huấn (giáo viên).
- /nhiệm vụ 5: xây dựng kế hoạch giáo dục AI của nhà trường, gồm 12 tiết cốt lõi và nội dung mở rộng nếu có nhu cầu (cán bộ quản lí).
- /kiểm tra: soát sản phẩm vừa làm theo bảng tự kiểm tra.
- /khai báo: viết bản khai báo việc sử dụng AI cho sản phẩm vừa làm.
Hiểu các cách gõ tương đương là cùng một lệnh, ví dụ: “/nhiem vu 1”, “/nv1”, “nhiệm vụ 1”.

[QUY TRÌNH KHI NHẬN LỆNH /nhiệm vụ 1, 2, 3, 4 hoặc 5]
Bước 1 – Hỏi thông tin. Chưa làm sản phẩm. Gửi MỘT tin nhắn gồm toàn bộ câu hỏi đánh số trong mục “Thông tin cần hỏi” của nhiệm vụ đó; mỗi câu kèm một ví dụ trả lời ngắn; câu có dấu (*) là bắt buộc. Thông tin người dùng đã cho trước đó trong cuộc trò chuyện thì không hỏi lại, ghi “đã có: …”. Kết thúc tin nhắn bằng câu: “Thầy/cô trả lời theo số thứ tự; câu nào chưa có thông tin, ghi ‘bỏ qua’.”
Bước 2 – Xác nhận. Sau khi người dùng trả lời, tóm tắt thông tin thành một bảng ngắn; với câu “bỏ qua”, ghi giả định sẽ dùng. Thiếu câu bắt buộc thì hỏi lại đúng câu đó. Kết thúc bằng câu hỏi: “Thầy/cô đồng ý để tôi bắt đầu không?”
Bước 3 – Thực hiện. Khi người dùng đồng ý (ví dụ “đồng ý”, “ok”, “làm đi”), thực hiện theo mục “Yêu cầu” và “Đầu ra” của nhiệm vụ. Sản phẩm dài thì làm theo các lượt đã ghi ở từng nhiệm vụ; cuối mỗi lượt hỏi “Thầy/cô muốn tôi làm tiếp lượt sau không?”
Bước 4 – Kết thúc. Cuối sản phẩm có mục “Điểm cần kiểm tra lại” và gợi ý lệnh tiếp theo (/kiểm tra, /khai báo).
Nếu người dùng gõ lệnh kèm sẵn đủ thông tin, bỏ qua Bước 1 và chuyển sang Bước 2.

[PHỤ LỤC A – 42 YCCĐ CỐT LÕI LỚP 10–12]
- Lớp 10 (14 YCCĐ):
  + 10.C1.1: Nhận biết được các khái niệm cơ bản về trí tuệ nhân tạo (AI) và học máy.
  + 10.C1.2: Phân biệt được AI hẹp (Narrow AI) và AI tổng quát (General AI).
  + 10.C1.3: Nhận diện các ứng dụng phổ biến của AI trong đời sống và học tập.
  + 10.C1.4: Hiểu nguyên lý hoạt động cơ bản của hệ thống nhận dạng hình ảnh đơn giản.
  + 10.C2.1: Trình bày được vai trò của dữ liệu trong việc huấn luyện mô hình AI.
  + 10.C2.2: Phân tích được tầm quan trọng của chất lượng dữ liệu đối với độ chính xác của AI.
  + 10.C2.3: Thực hiện thu thập và chuẩn bị tập dữ liệu mẫu đơn giản cho bài toán phân loại.
  + 10.C2.4: Nhận thức được các vấn đề về quyền riêng tư và bảo mật dữ liệu cá nhân.
  + 10.C3.1: Sử dụng thành thạo một số công cụ trợ lý AI tạo sinh phổ biến (như ChatGPT, Gemini) phục vụ học tập.
  + 10.C3.2: Đặt câu hỏi (prompting) hiệu quả để khai thác thông tin từ trợ lý AI.
  + 10.C3.3: Đánh giá độ tin cậy và phát hiện thông tin sai lệch (hallucination) do AI tạo ra.
  + 10.C3.4: Tuân thủ các nguyên tắc đạo đức khi sử dụng AI trong học tập và nghiên cứu.
  + 10.C3.5: Thảo luận về tác động xã hội của AI đối với việc làm và nghề nghiệp tương lai.
- Lớp 11 (14 YCCĐ):
  + 11.C1.1: Giải thích được nguyên lý hoạt động của mạng neural nhân tạo (ANN) ở mức độ cơ bản.
  + 11.C1.2: Phân tích quá trình học có giám sát và không giám sát trong máy học.
  + 11.C1.3: Đánh giá hiệu suất của mô hình AI thông qua các độ đo cơ bản (độ chính xác, độ nhạy).
  + 11.C1.4: Nhận diện các thách thức kỹ thuật trong việc xây dựng hệ thống AI.
  + 11.C2.1: Xử lý và tiền xử lý dữ liệu thô phục vụ cho việc huấn luyện mô hình.
  + 11.C2.2: Ứng dụng các thuật toán phân loại dữ liệu đơn giản.
  + 11.C2.3: Khảo sát ảnh hưởng của việc chọn lọc đặc trưng (feature selection) đến kết quả mô hình.
  + 11.C2.4: Đảm bảo tính công bằng và tránh thiên kiến (bias) trong tập dữ liệu.
  + 11.C3.1: Tích hợp công cụ AI vào việc giải quyết các bài toán phức tạp liên môn.
  + 11.C3.2: Phát triển tư duy phản biện khi phân tích các quyết định do thuật toán AI đưa ra.
  + 11.C3.3: Thảo luận về vấn đề sở hữu trí tuệ đối với sản phẩm do AI sáng tạo.
  + 11.C3.4: Đánh giá tác động môi trường và năng lượng của việc huấn luyện mô hình lớn.
  + 11.C3.5: Xây dựng dự án nhỏ ứng dụng AI giải quyết vấn đề thực tiễn của cộng đồng.
- Lớp 12 (14 YCCĐ):
  + 12.C1.1: Phân tích kiến trúc của các mô hình ngôn ngữ lớn (LLM) hiện đại.
  + 12.C1.2: Đánh giá các xu hướng phát triển tiên tiến của AI trong khoa học và công nghệ.
  + 12.C1.3: Thảo luận về các giới hạn lý thuyết và kỹ thuật của trí tuệ nhân tạo hiện tại.
  + 12.C1.4: Nghiên cứu các vấn đề an toàn và kiểm soát siêu trí tuệ AI (AI Alignment).
  + 12.C2.1: Xây dựng và tinh chỉnh (fine-tune) các mô hình AI chuyên biệt cho bài toán cụ thể.
  + 12.C2.2: Phân tích các mô hình dự báo phức tạp dựa trên dữ liệu lớn (Big Data).
  + 12.C2.3: Đánh giá rủi ro an ninh mạng liên quan đến việc lạm dụng hệ thống AI.
  + 12.C2.4: Đề xuất giải pháp quản trị dữ liệu thông minh cho tổ chức hoặc doanh nghiệp.
  + 12.C3.1: Thiết kế giải pháp tổng thể ứng dụng AI giải quyết bài toán lớn cấp doanh nghiệp hoặc xã hội.
  + 12.C3.2: Đóng góp ý kiến hoàn thiện khung pháp lý và đạo đức về AI tại Việt Nam.
  + 12.C3.3: Lãnh đạo hoặc điều phối dự án nhóm ứng dụng công nghệ AI liên môn.
  + 12.C3.4: Đánh giá chiến lược phát triển AI dài hạn trong bối cảnh chuyển đổi số quốc gia.
  + 12.C3.5: Thuyết trình và bảo vệ giải pháp AI sáng tạo trước hội đồng chuyên môn.
`;

const QUICK_COMMANDS = [
  { cmd: "/menu", label: "/menu", desc: "Hướng dẫn lệnh" },
  { cmd: "/nhiệm vụ 1", label: "/nhiệm vụ 1", desc: "KHBD 12 tiết AI" },
  { cmd: "/nhiệm vụ 2", label: "/nhiệm vụ 2", desc: "Phối hợp GV Tin" },
  { cmd: "/nhiệm vụ 3", label: "/nhiệm vụ 3", desc: "Kế hoạch Tổ CM" },
  { cmd: "/nhiệm vụ 4", label: "/nhiệm vụ 4", desc: "KHBD Lồng ghép" },
  { cmd: "/nhiệm vụ 5", label: "/nhiệm vụ 5", desc: "KH Nhà trường" },
  { cmd: "/kiểm tra", label: "/kiểm tra", desc: "Soát lỗi 7 tiêu chí" },
  { cmd: "/khai báo", label: "/khai báo", desc: "Khai báo sử dụng AI" },
];

export function EduAiAssistantWorkspace() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_init",
      role: "assistant",
      content: `Kính chào thầy/cô! Tôi là Trợ lí Chuyên gia Giáo dục AI THPT (Quyết định 2422/QĐ-BGDĐT & Công văn 5588/BGDĐT-GDPT).\n\nTôi sẵn sàng hỗ trợ thầy/cô xây dựng hoặc điều chỉnh Kế hoạch bài dạy 12 tiết cốt lõi, phương án phối hợp giáo viên Tin học, kế hoạch tổ chuyên môn, bài dạy lồng ghép và kế hoạch nhà trường.\n\nDưới đây là danh sách các lệnh nhanh thầy/cô có thể sử dụng (gõ hoặc bấm vào các nút lệnh phía trên):\n- **/menu**: Liệt kê chi tiết các lệnh.\n- **/nhiệm vụ 1**: Soạn/điều chỉnh KHBD chuyên đề AI 12 tiết.\n- **/nhiệm vụ 2**: Phương án phối hợp với GV Tin học.\n- **/nhiệm vụ 3**: Kế hoạch dạy học 12 tiết của tổ CM.\n- **/nhiệm vụ 4**: KHBD môn học lồng ghép AI.\n- **/nhiệm vụ 5**: Kế hoạch giáo dục AI của nhà trường.\n- **/kiểm tra**: Soát lỗi theo 7 tiêu chí chuẩn.\n- **/khai báo**: Bản khai báo sử dụng AI.\n\nThầy/cô cần tôi hỗ trợ nhiệm vụ nào trước ạ?`
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; content?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const extractUploadedFileText = async (file: File): Promise<string> => {
    const lowerName = file.name.toLowerCase();
    const MAX_CHARS_PER_FILE = 18000;
    let extracted = "";

    try {
      if (lowerName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammothMod: any = await import('mammoth');
        const mammoth = mammothMod?.default || mammothMod;
        const arrayBuffer = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer });
        extracted = (res?.value || '').trim();
      } else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        const [pdfjsLib, workerMod] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ]);
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            workerMod?.default || `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;
        }
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const maxPages = Math.min(pdf.numPages, 40);
        const pageTexts: string[] = [];
        for (let p = 1; p <= maxPages; p++) {
          const page = await pdf.getPage(p);
          const textContent = await page.getTextContent();
          const pageStr = (textContent.items || [])
            .map((item: any) => item?.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (pageStr) pageTexts.push(`[Trang ${p}] ${pageStr}`);
          if (pageTexts.join('\n').length >= MAX_CHARS_PER_FILE) break;
        }
        extracted = pageTexts.join('\n').trim();
        if (!extracted) {
          extracted = `(Tệp PDF dạng ảnh scan "${file.name}" - ${pdf.numPages} trang, không có lớp văn bản chọn được)`;
        }
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv') || lowerName.endsWith('.json')) {
        extracted = (await file.text()).trim();
      } else {
        const rawText = await file.text();
        extracted = rawText.replace(/[^\x20-\x7E\u00A0-\uFFFF\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      }
    } catch (err) {
      console.warn(`Không thể đọc nội dung tệp ${file.name}:`, err);
      extracted = `(Không thể trích xuất văn bản tự động từ tệp "${file.name}")`;
    }

    if (extracted.length > MAX_CHARS_PER_FILE) {
      extracted = extracted.slice(0, MAX_CHARS_PER_FILE) + `\n... [Đã rút gọn nội dung tệp "${file.name}" để đảm bảo tốc độ xử lý]`;
    }
    return extracted;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = "";

    showToast(`Đang đọc ${fileList.length} tệp tài liệu...`);
    for (const file of fileList) {
      const content = await extractUploadedFileText(file);
      setAttachedFiles(prev => [...prev, { name: file.name, size: file.size, content }]);
    }
    showToast(`Đã đính kèm và trích xuất xong ${fileList.length} tệp tài liệu.`);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!text && attachedFiles.length === 0) return;

    const userMsgContent = text + (attachedFiles.length > 0 ? `\n[Đã đính kèm ${attachedFiles.length} tệp tài liệu nguồn]` : '');
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMsgContent,
      files: attachedFiles.map(f => ({ name: f.name, size: f.size }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInputVal("");
    setIsLoading(true);

    try {
      // Build conversation history for API (exclude previous error messages)
      const historyForApi = messages
        .filter(m => !m.id.startsWith('err_'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
      historyForApi.push({ role: 'user', parts: [{ text: userMsgContent }] });

      let contextInfo = "";
      if (attachedFiles.length > 0) {
        const MAX_TOTAL_ATTACHED_CHARS = 90000;
        const perFileBudget = Math.max(4000, Math.floor(MAX_TOTAL_ATTACHED_CHARS / attachedFiles.length));
        contextInfo = "\n\nTài liệu nguồn đính kèm từ người dùng:\n" + attachedFiles.map(f => {
          const safeContent = (f.content || '(Tệp trống)').slice(0, perFileBudget);
          return `--- Tệp: ${f.name} ---\n${safeContent}`;
        }).join('\n\n');
      }

      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsgContent + contextInfo,
          messages: historyForApi,
          context: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        })
      });

      const data = await res.json();
      const replyText = data.text || data.error || "Xin lỗi, đã xảy ra lỗi khi phản hồi.";

      const assistantMessage: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: replyText
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Lỗi kết nối tới Trợ lí AI: ${err?.message || 'Vui lòng thử lại sau ít phút.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDocx = (content: string, title: string = "SanPham_GiaoDuc_AI_THPT", mode: 'omml' | 'mathtype' = 'omml') => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `<div style="font-family:'Times New Roman', Times, serif; font-size:13pt; line-height:1.5;">${content.replace(/\n/g, '<br/>')}</div>`;
    document.body.appendChild(tempDiv);
    const suffix = mode === 'mathtype' ? '_MathType' : '';
    exportHtmlToWord(tempDiv, `${title}_${Date.now()}${suffix}.docx`, mode);
    document.body.removeChild(tempDiv);
    showToast(`Đã tải xuống tệp Word (${mode === 'mathtype' ? 'MathType' : 'Equation'}) thành công!`);
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast("Đã sao chép nội dung vào bộ nhớ tạm!");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Bot className="w-6 h-6" />
              </span>
              <h1 className="text-lg font-bold text-slate-900">
                Trợ lí AI – Giáo dục AI THPT (QĐ 2422 & CV 5588)
              </h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                12 tiết cốt lõi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hỗ trợ soạn KHBD 12 tiết cốt lõi, phương án phối hợp, kế hoạch tổ chuyên môn, bài dạy lồng ghép và kế hoạch nhà trường.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([{
                id: `msg_init_${Date.now()}`,
                role: "assistant",
                content: "Đã làm mới phiên hội thoại. Thầy/cô cần tôi hỗ trợ nhiệm vụ nào ạ?"
              }])}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Làm mới cuộc trò chuyện"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Slash-Commands Bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Terminal className="w-3.5 h-3.5 text-emerald-600" /> Lệnh nhanh:
          </span>
          {QUICK_COMMANDS.map((cmdItem, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(cmdItem.cmd)}
              className="px-3 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-full text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title={cmdItem.desc}
            >
              <span className="font-bold text-emerald-600">{cmdItem.label}</span>
              <span className="text-[10px] text-slate-400">({cmdItem.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Source Document Upload Area */}
      <div className="bg-emerald-50/50 border-b border-emerald-100 px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Paperclip className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">Tài liệu nguồn tham chiếu:</span>
          {attachedFiles.length === 0 ? (
            <span className="text-slate-400 italic">Chưa có tệp đính kèm (hỗ trợ .docx, .pdf, .txt)</span>
          ) : (
            <div className="flex items-center gap-2">
              {attachedFiles.map((f, i) => (
                <span key={i} className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-medium text-emerald-800 flex items-center gap-1">
                  {f.name}
                  <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 font-bold ml-1">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept=".docx,.pdf,.txt,.doc" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Đính kèm tệp</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-5xl mx-auto w-full">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex items-start gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {msg.role === 'user' ? <span className="font-bold text-xs">GV</span> : <Bot className="w-5 h-5" />}
            </div>

            <div className={`max-w-3xl rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-xs ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-tr-xs' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
            }`}>
              {msg.files && msg.files.length > 0 && (
                <div className="mb-3 p-2 bg-slate-800/80 rounded-lg text-xs text-slate-300">
                  <span className="font-semibold text-white">Tệp đính kèm:</span> {msg.files.map(f => f.name).join(', ')}
                </div>
              )}

              <div className="markdown-body">
                <MarkdownRenderer content={msg.content} />
              </div>

              {msg.role === 'assistant' && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleCopyText(msg.content)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép nội dung</span>
                  </button>
                  <button
                    onClick={() => handleExportDocx(msg.content, "SanPham_GiaoDuc_AI_THPT", "omml")}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Xuất file Word (.docx) công thức chuẩn Word Equation (OMML)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Word (Equation)</span>
                  </button>
                  <button
                    onClick={() => handleExportDocx(msg.content, "SanPham_GiaoDuc_AI_THPT", "mathtype")}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Xuất file Word (.docx) công thức chuẩn Word MathType"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Word (MathType)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-5 py-4 text-xs text-slate-500 shadow-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Chuyên gia Trợ lí AI đang phân tích và soạn thảo văn bản sư phạm chuẩn QĐ 2422...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Nhập yêu cầu hoặc gõ lệnh (ví dụ: /nhiệm vụ 1, /menu, /kiểm tra)..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-slate-800 font-medium"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || (!inputVal.trim() && attachedFiles.length === 0)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi lệnh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
