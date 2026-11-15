export type IsomorphicPresetId =
  | "periodic_7991"
  | "grade10_entrance"
  | "thpt_graduation"
  | "gifted_student";

export interface BlueprintMetadata {
  exam_title: string;
  grade: string;
  subject: string;
  duration: string;
  total_points: number;
  exam_format: string;
  preset_id?: string;
  preset_name?: string;
}

export interface BlueprintSection {
  section_id: string;
  title: string;
  format_type: string;
  question_count: number;
  total_points: number;
  description: string;
}

export interface BlueprintCognitiveRatio {
  nhan_biet_percent: number;
  thong_hieu_percent: number;
  van_dung_percent: number;
  van_dung_cao_percent: number;
  nhan_biet_points: number;
  thong_hieu_points: number;
  van_dung_points: number;
  van_dung_cao_points: number;
}

export interface BlueprintItem {
  id: string;
  section: string;
  question_type: string;
  points: number;
  topic: string;
  subtopic?: string;
  cognitive_level: "Nhận biết" | "Thông hiểu" | "Vận dụng" | "Vận dụng cao" | string;
  original_summary?: string;
  core_technique: string;
  real_world_context: string;
  visual_description: string;
  requires_svg?: boolean;
  requires_table?: boolean;
}

export interface ExamBlueprint {
  metadata: BlueprintMetadata;
  sections: BlueprintSection[];
  cognitive_ratio: BlueprintCognitiveRatio;
  items: BlueprintItem[];
}

export interface IsomorphicPresetConfig {
  id: IsomorphicPresetId;
  shortTitle: string;
  fullTitle: string;
  badge: string;
  description: string;
  standardsNote: string;
  defaultDuration: string;
  defaultTotalPoints: number;
  defaultSchoolName: string;
  defaultSchoolSubName: string;
  defaultExamCode: string;
  sampleSourceExamText: string;
  sampleBlueprint: ExamBlueprint;
  sampleMatrixMarkdown: string;
}

export function buildMatrixMarkdownFromBlueprint(bp: ExamBlueprint): string {
  const meta = bp.metadata;
  const cog = bp.cognitive_ratio;
  const sectionRows = (bp.sections || [])
    .map(
      (sec) =>
        `| **${sec.section_id}** | ${sec.title} | ${sec.question_count} | $${sec.total_points}$ điểm | ${sec.description} |`
    )
    .join("\n");

  const itemRows = (bp.items || [])
    .map((it) => {
      const ctxOrVis = [it.real_world_context, it.visual_description]
        .filter(Boolean)
        .join("; ");
      return `| **${it.id}** | ${it.topic}${it.subtopic ? ` (*${it.subtopic}*)` : ""} | *${it.cognitive_level}* | ${it.core_technique} | ${ctxOrVis || "—"} | $${it.points}$ |`;
    })
    .join("\n");

  return `## I. BẢNG MA TRẬN & ĐẶC TẢ ĐỀ THI TRÍCH XUẤT TỪ ĐỀ GỐC (GIAI ĐOẠN 1)

### 1. Thông tin chung & Tỷ lệ mức độ nhận thức
- **Kỳ thi / Đề gốc:** ${meta.exam_title}
- **Môn học / Khối lớp:** ${meta.subject} — ${meta.grade}
- **Thời gian làm bài:** ${meta.duration} | **Tổng điểm:** $${meta.total_points}$ điểm
- **Cấu trúc hình thức:** ${meta.exam_format}
- **Phân bố 4 mức độ nhận thức:**
  + **Nhận biết (NB):** $${cog?.nhan_biet_points ?? 0}$ điểm ($${cog?.nhan_biet_percent ?? 0}\\%$)
  + **Thông hiểu (TH):** $${cog?.thong_hieu_points ?? 0}$ điểm ($${cog?.thong_hieu_percent ?? 0}\\%$)
  + **Vận dụng (VD):** $${cog?.van_dung_points ?? 0}$ điểm ($${cog?.van_dung_percent ?? 0}\\%$)
  + **Vận dụng cao (VDC):** $${cog?.van_dung_cao_points ?? 0}$ điểm ($${cog?.van_dung_cao_percent ?? 0}\\%$)

### 2. Tổng hợp cấu trúc các phần thi
| Phần | Tên phần thi | Số câu / ý | Tổng điểm | Mô tả quy tắc chấm điểm |
| :---: | :--- | :---: | :---: | :--- |
${sectionRows}

### 3. Bản đặc tả chi tiết từng câu / ý trích xuất từ đề gốc
| Câu / Ý | Chuyên đề / Kiến thức | Mức độ | Kỹ thuật giải & Bẫy tư duy cốt lõi | Bối cảnh / Trực quan | Điểm |
| :---: | :--- | :---: | :--- | :--- | :---: |
${itemRows}`;
}

// ============================================================================
// 1. BLUEPRINT MẪU: ĐỀ GIỮA KỲ I TOÁN 11 - THPT NGUYỄN HUỆ HUẾ (2026-2027)
// ============================================================================
const PERIODIC_7991_BLUEPRINT: ExamBlueprint = {
  metadata: {
    exam_title: "KIỂM TRA GIỮA KỲ I - NĂM HỌC 2026 - 2027 (TRƯỜNG THPT NGUYỄN HUỆ)",
    grade: "Lớp 11",
    subject: "Toán học",
    duration: "90 phút",
    total_points: 10,
    exam_format: "Kết hợp Trắc nghiệm 3 phần (7,0 điểm) + Tự luận (3,0 điểm)",
    preset_id: "periodic_7991",
    preset_name: "Đề Kiểm tra định kỳ (15p / Giữa kỳ / Cuối kỳ) - Chuẩn Công văn 7991/BGDĐT"
  },
  sections: [
    {
      section_id: "PHẦN I",
      title: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn",
      format_type: "multiple_choice",
      question_count: 12,
      total_points: 3.0,
      description: "12 câu trắc nghiệm 4 phương án A, B, C, D (0,25 điểm/câu)"
    },
    {
      section_id: "PHẦN II",
      title: "PHẦN II. Câu trắc nghiệm đúng sai",
      format_type: "true_false",
      question_count: 2,
      total_points: 2.0,
      description: "2 câu đúng/sai, mỗi câu có 4 ý a, b, c, d (1,0 điểm/câu)"
    },
    {
      section_id: "PHẦN III",
      title: "PHẦN III. Câu trắc nghiệm trả lời ngắn",
      format_type: "short_answer",
      question_count: 4,
      total_points: 2.0,
      description: "4 câu trả lời ngắn điền kết quả số (0,5 điểm/câu)"
    },
    {
      section_id: "PHẦN IV",
      title: "PHẦN IV. Tự luận",
      format_type: "essay",
      question_count: 3,
      total_points: 3.0,
      description: "3 bài tự luận (Bài 1, Bài 2, Bài 3 gồm 2 ý a, b), mỗi bài 1,0 điểm"
    }
  ],
  cognitive_ratio: {
    nhan_biet_percent: 40,
    thong_hieu_percent: 30,
    van_dung_percent: 20,
    van_dung_cao_percent: 10,
    nhan_biet_points: 4.0,
    thong_hieu_points: 3.0,
    van_dung_points: 2.0,
    van_dung_cao_points: 1.0
  },
  items: [
    {
      id: "Phần I - Câu 1",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Tập xác định hàm số lượng giác",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm tập xác định của hàm số $y = \\tan x$.",
      core_technique: "Điều kiện $\\cos x \\ne 0 \\Leftrightarrow x \\ne \\frac{\\pi}{2} + k\\pi$ ($k \\in \\mathbb{Z}$); bẫy nhầm điều kiện $\\sin x \\ne 0$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 2",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Số hạng của dãy số cho bởi công thức tổng quát",
      cognitive_level: "Nhận biết",
      original_summary: "Cho dãy số $(u_n)$ với $u_n = 3n + 2$, tìm $u_5$.",
      core_technique: "Thay trực tiếp chỉ số $n = 5$ vào công thức $u_n$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 3",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Giá trị lượng giác của góc lượng giác",
      cognitive_level: "Nhận biết",
      original_summary: "Tính giá trị $\\sin \\frac{5\\pi}{6}$.",
      core_technique: "Dùng góc bù $\\sin(\\pi - \\alpha) = \\sin \\alpha$ và bảng giá trị lượng giác đặc biệt; bẫy dấu âm.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 4",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Số hạng tổng quát cấp số cộng",
      cognitive_level: "Nhận biết",
      original_summary: "Cho cấp số cộng $(u_n)$ có $u_1 = 4, d = 3$. Tính $u_8$.",
      core_technique: "Áp dụng $u_n = u_1 + (n - 1)d$; bẫy dùng $u_1 + nd$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 5",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Phương trình lượng giác cơ bản",
      cognitive_level: "Thông hiểu",
      original_summary: "Tìm nghiệm của phương trình $\\sin x = -\\frac{\\sqrt{3}}{2}$.",
      core_technique: "Biến đổi về $\\sin x = \\sin\\left(-\\frac{\\pi}{3}\\right)$ và viết đúng 2 họ nghiệm $x = -\\frac{\\pi}{3} + k2\\pi$ và $x = -\\frac{2\\pi}{3} + k2\\pi$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 6",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Số hạng tổng quát cấp số nhân",
      cognitive_level: "Nhận biết",
      original_summary: "Cho cấp số nhân $(u_n)$ có $u_1 = 2, q = -2$. Tính $u_4$.",
      core_technique: "Áp dụng $u_n = u_1 \\cdot q^{n-1}$, chú ý lũy thừa bậc lẻ của cơ số âm.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 7",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Chu kì hàm số lượng giác",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm chu kì của hàm số $y = \\sin 2x$.",
      core_technique: "Chu kì hàm $y = \\sin(\\omega x)$ là $T = \\frac{2\\pi}{|\\omega|}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 8",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Ứng dụng cấp số nhân thực tế sinh học",
      cognitive_level: "Thông hiểu",
      original_summary: "Vi khuẩn E. coli cứ 20 phút phân đôi 1 lần, ban đầu 100 cá thể. Sau 2 giờ có bao nhiêu cá thể?",
      core_technique: "Đổi 2 giờ = 120 phút, xác định số lần phân đôi $k = \\frac{120}{20} = 6$ và tính $N = N_0 \\cdot 2^k$.",
      real_world_context: "Nuôi cấy vi khuẩn phân đôi theo chu kỳ thời gian.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 9",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Đổi đơn vị đo góc radian sang độ",
      cognitive_level: "Nhận biết",
      original_summary: "Đổi góc $\\frac{5\\pi}{6}$ radian sang độ.",
      core_technique: "Nhân số đo radian với $\\frac{180^\\circ}{\\pi}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 10",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Công thức cộng lượng giác",
      cognitive_level: "Nhận biết",
      original_summary: "Chọn công thức đúng cho $\\cos(a + b)$.",
      core_technique: "Nhận diện $\\cos(a + b) = \\cos a \\cos b - \\sin a \\sin b$; bẫy nhầm dấu cộng/trừ.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 11",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm",
      subtopic: "Số trung bình mẫu số liệu ghép nhóm",
      cognitive_level: "Thông hiểu",
      original_summary: "Tính số trung bình của bảng tần số ghép nhóm thời gian tự học 10 học sinh.",
      core_technique: "Tính giá trị đại diện $c_i = \\frac{a_i + b_i}{2}$ mỗi nhóm rồi tính $\\bar{x} = \\frac{\\sum n_i c_i}{n}$.",
      real_world_context: "Khảo sát thời gian tự học mỗi ngày của học sinh.",
      visual_description: "Bảng tần số ghép nhóm 3 cột khoảng thời gian $[0;10), [10;20), [20;30)$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "Phần I - Câu 12",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm",
      subtopic: "Giá trị đại diện của nhóm số liệu",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm giá trị đại diện của nhóm $[20; 30)$.",
      core_technique: "Trung bình cộng hai đầu mút $\\frac{a + b}{2}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần II - Câu 1 (a, b, c, d)",
      section: "PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Tìm $u_1, d$, công thức tổng quát và tổng $S_n$ cấp số cộng",
      cognitive_level: "Thông hiểu",
      original_summary: "Cho CSC $(u_n)$ thỏa $\\begin{cases} u_2 - u_5 = 6 \\\\ u_3 + u_6 = -8 \\end{cases}$. Xét $d, u_1, u_n, S_{90}$.",
      core_technique: "Biểu diễn theo $u_1, d$, giải hệ 2 ẩn tìm $u_1, d$, viết $u_n = u_1 + (n-1)d$ và tính $S_n = \\frac{n(u_1 + u_n)}{2}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần II - Câu 2 (a, b, c, d)",
      section: "PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Tính chất hàm số lượng giác $f(x) = \\frac{1}{2}\\sin 2x$",
      cognitive_level: "Thông hiểu",
      original_summary: "Xét TXĐ, tính chẵn/lẻ (đối xứng trục $Oy$), tập giá trị và tính đơn điệu trên $(0; \\pi)$ của $f(x) = \\frac{1}{2}\\sin 2x$.",
      core_technique: "Kiểm tra $f(-x) = -f(x)$ (hàm lẻ đối xứng gốc $O$), đánh giá $-1 \\le \\sin 2x \\le 1$ và thử hai điểm phân biệt để bác bỏ tính đồng biến.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần III - Câu 1",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Nghiệm phương trình lượng giác trên đoạn $[0; 2\\pi]$",
      cognitive_level: "Vận dụng",
      original_summary: "Tổng các nghiệm của $2\\sin\\left(x - \\frac{\\pi}{4}\\right) + \\sqrt{3} = 0$ trên $[0; 2\\pi]$ dạng $\\frac{a\\pi}{b}$, tính $P = 2a + 3b$.",
      core_technique: "Giải 2 họ nghiệm lượng giác, kẹp điều kiện $0 \\le x \\le 2\\pi$ tìm $k \\in \\mathbb{Z}$, cộng các nghiệm và rút gọn phân số tối giản $\\frac{a}{b}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần III - Câu 2",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Độ dài cung tròn",
      cognitive_level: "Nhận biết",
      original_summary: "Tính độ dài cung tròn bán kính $R = 3\\text{ cm}$, số đo $\\frac{3\\pi}{4}$ (làm tròn hàng phần trăm).",
      core_technique: "Áp dụng công thức $l = R\\alpha$ với $\\alpha$ tính bằng radian.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần III - Câu 3",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm",
      subtopic: "Tứ phân vị thứ nhất $Q_1$ của mẫu ghép nhóm",
      cognitive_level: "Vận dụng",
      original_summary: "Tìm tứ phân vị thứ nhất $Q_1$ của bảng chiều cao 41 học sinh lớp 11 (5 nhóm).",
      core_technique: "Tính $\\frac{n}{4}$, xác định nhóm chứa $Q_1$ theo tần số tích lũy và áp dụng công thức nội suy $Q_1 = u_m + \\frac{\\frac{n}{4} - C}{n_m}(u_{m+1} - u_m)$.",
      real_world_context: "Thống kê chiều cao học sinh lớp 11.",
      visual_description: "Bảng tần số ghép nhóm 5 nhóm chiều cao từ $[150;155)$ đến $[170;175)$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "Phần III - Câu 4",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Bài toán thực tế tài chính kết hợp CSC và CSN",
      cognitive_level: "Vận dụng cao",
      original_summary: "So sánh chênh lệch tổng thu nhập 3 năm (12 quý) giữa Phương án 1 (CSC + thưởng $10\\%$) và Phương án 2 (CSN tăng $5\\%$ mỗi quý + thưởng cố định).",
      core_technique: "Quy đổi năm sang quý ($12$ quý, mỗi quý $3$ tháng), tính tổng 3 năm theo cấp số cộng và cấp số nhân $S_{12}$ nhân $3$ tháng cộng thưởng.",
      real_world_context: "So sánh 2 phương án trả lương và thưởng 3 năm cho công nhân nhà máy.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần IV - Bài 1",
      section: "PHẦN IV",
      question_type: "essay",
      points: 1.0,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Giải phương trình lượng giác cơ bản",
      cognitive_level: "Thông hiểu",
      original_summary: "Giải phương trình lượng giác $\\cos\\left(x + \\frac{\\pi}{3}\\right) = \\frac{\\sqrt{3}}{2}$.",
      core_technique: "Đưa về $\\cos\\left(x + \\frac{\\pi}{3}\\right) = \\cos\\frac{\\pi}{6}$ và giải hai họ nghiệm $\\pm \\frac{\\pi}{6} + k2\\pi$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần IV - Bài 2",
      section: "PHẦN IV",
      question_type: "essay",
      points: 1.0,
      topic: "Hàm số lượng giác và phương trình lượng giác",
      subtopic: "Tính giá trị lượng giác dùng hệ thức cơ bản và công thức cộng",
      cognitive_level: "Vận dụng",
      original_summary: "Cho $\\pi < \\alpha < \\frac{3\\pi}{2}$ và $\\cos\\alpha = -\\frac{12}{13}$. Tính $\\cos\\left(\\alpha - \\frac{\\pi}{6}\\right)$.",
      core_technique: "Dùng $\\sin^2\\alpha + \\cos^2\\alpha = 1$ và xét dấu $\\sin\\alpha$ theo góc phần tư, sau đó khai triển $\\cos(\\alpha - \\frac{\\pi}{6})$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần IV - Bài 3a",
      section: "PHẦN IV",
      question_type: "essay",
      points: 0.5,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Số hạng thứ $n$ trong bài toán tăng trưởng theo CSN",
      cognitive_level: "Vận dụng",
      original_summary: "Tháng đầu bán $128$ sản phẩm, mỗi tháng sau bằng $150\\%$ tháng liền trước. Tính số sản phẩm bán được trong tháng thứ 8.",
      core_technique: "Nhận diện cấp số nhân $u_1 = 128, q = \\frac{3}{2}$, tính $u_8 = u_1 q^7$.",
      real_world_context: "Doanh số bán hàng đồ dùng học tập tăng trưởng theo tỷ lệ phần trăm mỗi tháng.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần IV - Bài 3b",
      section: "PHẦN IV",
      question_type: "essay",
      points: 0.5,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Tổng $n$ số hạng đầu cấp số nhân và đối chiếu mục tiêu",
      cognitive_level: "Vận dụng cao",
      original_summary: "Tính tổng số sản phẩm bán được trong 8 tháng đầu và kiểm tra xem có đạt mục tiêu $7000$ sản phẩm không.",
      core_technique: "Áp dụng $S_8 = \\frac{u_1(q^8 - 1)}{q - 1}$ và so sánh kết quả với $7000$.",
      real_world_context: "Đánh giá mục tiêu kinh doanh của cửa hàng sau 8 tháng.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    }
  ]
};

const PERIODIC_7991_MATRIX_MD = buildMatrixMarkdownFromBlueprint(PERIODIC_7991_BLUEPRINT);

// ============================================================================
// 2. BLUEPRINT MẪU: ĐỀ TUYỂN SINH LỚP 10 - SỞ GD&ĐT TP HUẾ (2026-2027)
// ============================================================================
const GRADE10_ENTRANCE_BLUEPRINT: ExamBlueprint = {
  metadata: {
    exam_title: "KỲ THI TUYỂN SINH LỚP 10 THPT NĂM HỌC 2026-2027 (SỞ GD&ĐT THÀNH PHỐ HUẾ)",
    grade: "Lớp 9 (Tuyển sinh vào lớp 10)",
    subject: "Toán học",
    duration: "90 phút",
    total_points: 10,
    exam_format: "100% Tự luận (7 câu lớn gồm 14 ý, thang điểm 10,0)",
    preset_id: "grade10_entrance",
    preset_name: "Đề Thi Tuyển sinh vào lớp 10 THPT - Chuẩn GDPT 2018 (Thang điểm 10)"
  },
  sections: [
    {
      section_id: "PHẦN TỰ LUẬN",
      title: "ĐỀ THI TỰ LUẬN TUYỂN SINH VÀO LỚP 10 (7 CÂU)",
      format_type: "essay",
      question_count: 7,
      total_points: 10.0,
      description: "7 câu tự luận chấm điểm chi tiết từng bước 0,25 điểm chuẩn Sở GD&ĐT"
    }
  ],
  cognitive_ratio: {
    nhan_biet_percent: 30,
    thong_hieu_percent: 35,
    van_dung_percent: 25,
    van_dung_cao_percent: 10,
    nhan_biet_points: 3.0,
    thong_hieu_points: 3.5,
    van_dung_points: 2.5,
    van_dung_cao_points: 1.0
  },
  items: [
    {
      id: "Câu 1a",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Căn thức và Biểu thức đại số",
      subtopic: "Tính giá trị biểu thức tại giá trị cho trước",
      cognitive_level: "Nhận biết",
      original_summary: "Tính giá trị biểu thức $A = x - 9$ khi $x = 10$.",
      core_technique: "Thay giá trị $x$ vào biểu thức và tính toán chính xác.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 1b",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Căn thức và Biểu thức đại số",
      subtopic: "Điều kiện xác định của phân thức / căn thức",
      cognitive_level: "Nhận biết",
      original_summary: "Viết điều kiện xác định của phân thức $B = \\frac{2x + 7}{x - 4}$.",
      core_technique: "Đặt điều kiện mẫu thức khác $0$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 1c",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Căn thức và Biểu thức đại số",
      subtopic: "Rút gọn biểu thức chứa căn bậc hai",
      cognitive_level: "Thông hiểu",
      original_summary: "Rút gọn $C = \\left(\\frac{1}{\\sqrt{x}-3} + \\frac{1}{\\sqrt{x}+3}\\right)\\cdot\\frac{\\sqrt{x}+3}{\\sqrt{x}}$ với $x > 0, x \\ne 9$.",
      core_technique: "Quy đồng mẫu thức $(\\sqrt{x}-a)(\\sqrt{x}+a)$, rút gọn tử thức và triệt tiêu nhân tử chung.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 2a",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Phương trình và Hệ phương trình",
      subtopic: "Giải phương trình bậc nhất một ẩn",
      cognitive_level: "Nhận biết",
      original_summary: "Không dùng máy tính cầm tay, giải phương trình $2x - 8 = x + 3$.",
      core_technique: "Chuyển vế đổi dấu đưa về dạng $ax = b$ và kết luận nghiệm.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 2b",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Phương trình bậc hai và Định lý Vi-ét",
      subtopic: "Tính giá trị biểu thức nghiệm không đối xứng bằng Vi-ét",
      cognitive_level: "Vận dụng",
      original_summary: "Phương trình $x^2 - 6x + 2 = 0$ có 2 nghiệm dương phân biệt $x_1, x_2$. Tính $P = \\sqrt{12x_1 + 7} + x_2$.",
      core_technique: "Hạ bậc $6x_1 = x_1^2 + 2$ từ phương trình gốc để biến biểu thức dưới căn thành bình phương đúng $(x_1 + k)^2$, kết hợp $x_1 + x_2 = -\\frac{b}{a}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 3a",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Thống kê và Xác suất",
      subtopic: "Đọc bảng tần số ghép nhóm",
      cognitive_level: "Nhận biết",
      original_summary: "Bảng tần số ghép nhóm quãng đường đi bộ 50 người; tìm số người đi từ $2\\text{ km}$ đến dưới $4\\text{ km}$.",
      core_technique: "Cộng tần số của hai nhóm liên tiếp $[2;3)$ và $[3;4)$.",
      real_world_context: "Thống kê quãng đường đi bộ tập thể dục buổi sáng.",
      visual_description: "Bảng tần số ghép nhóm 5 nhóm từ $[2;3)$ đến $[6;7)$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "Câu 3b",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Thống kê và Xác suất",
      subtopic: "Tính xác suất biến cố cổ điển qua phép thử 2 bước",
      cognitive_level: "Thông hiểu",
      original_summary: "Lấy ngẫu nhiên 1 thẻ từ hộp $A = \\{1;2;3;4\\}$ và 1 thẻ từ hộp $B = \\{3;4;5;6\\}$. Tính xác suất số hộp $B$ chia hết cho số hộp $A$.",
      core_technique: "Liệt kê không gian mẫu $\\Omega$ gồm $n(\\Omega) = 16$ cặp có thứ tự, đếm tập kết quả thuận lợi và tính $P(M) = \\frac{n(M)}{n(\\Omega)}$.",
      real_world_context: "Trò chơi rút thẻ đánh số từ hai hộp.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 4a",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Hàm số bậc nhất và Mô hình thực tế",
      subtopic: "Tính toán chi phí thực tế theo phân bậc giá",
      cognitive_level: "Nhận biết",
      original_summary: "Tính tiền vé tham quan cho đoàn khách phân theo 3 nhóm tuổi.",
      core_technique: "Nhân số lượng từng nhóm tuổi với đơn giá tương ứng và cộng tổng.",
      real_world_context: "Tính tiền vé khu du lịch theo lứa tuổi.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 4b",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 0.5,
      topic: "Hàm số bậc nhất và Mô hình thực tế",
      subtopic: "Thiết lập hàm số bậc nhất $y = ax + b$ từ bài toán giảm giá",
      cognitive_level: "Thông hiểu",
      original_summary: "Giảm $50\\%$ giá vé cho $x$ người địa phương trong gia đình $10$ người, viết công thức $y$ theo $x$.",
      core_technique: "Biểu diễn số vé nguyên giá $(10 - x)$ và số vé giảm giá $x$ để rút gọn thành hàm bậc nhất $y$ theo $x$.",
      real_world_context: "Chính sách ưu đãi vé tham quan cho người dân địa phương.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 5",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Phương trình và Hệ phương trình",
      subtopic: "Giải bài toán bằng cách lập phương trình năng suất",
      cognitive_level: "Thông hiểu",
      original_summary: "Kế hoạch gói $900$ phần quà; thực tế mỗi ngày gói thêm $15$ phần nên xong sớm $3$ ngày. Tìm năng suất dự định.",
      core_technique: "Đặt ẩn năng suất dự định $x > 0$, lập phương trình chênh lệch thời gian $\\frac{A}{x} - \\frac{A}{x+d} = t$, đưa về PT bậc hai và đối chiếu điều kiện.",
      real_world_context: "Hoạt động gói quà thiện nguyện nhân ngày Quốc tế thiếu nhi 1/6.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 6a",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học phẳng và Đường tròn",
      subtopic: "Vẽ hình và chứng minh 4 điểm cùng thuộc một đường tròn",
      cognitive_level: "Thông hiểu",
      original_summary: "$\triangle ABC$ nhọn ($AB<AC$), đường cao $AD, BE$ cắt tại $H$, $K$ trung điểm $AH$, $KM \\perp BK$ ($M \\in AC$). Chứng minh $B, K, E, M$ cùng thuộc một đường tròn.",
      core_technique: "Chứng minh hai tam giác vuông $\\triangle BKM$ và $\\triangle BEM$ cùng nhận cạnh huyền $BM$ làm đường kính (góc nội tiếp $90^\\circ$).",
      real_world_context: "",
      visual_description: "Hình vẽ $\\triangle ABC$ nhọn nội tiếp $(O)$, các đường cao $AD, BE$, trung điểm $K$ của $AH$, điểm $M \\in AC$, đường kính $BN$.",
      requires_svg: true,
      requires_table: false
    },
    {
      id: "Câu 6b",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học phẳng và Đường tròn",
      subtopic: "Chứng minh hai góc bằng nhau qua tứ giác nội tiếp và tính chất trung tuyến",
      cognitive_level: "Vận dụng",
      original_summary: "Chứng minh $\\widehat{KMB} = \\widehat{ACB}$.",
      core_technique: "Dùng tính chất góc nội tiếp cùng chắn cung $BK$ ($\\widehat{KMB} = \\widehat{KEB}$), trung tuyến ứng cạnh huyền $KE = KA$ trong $\\triangle AEH$ vuông và quan hệ phụ góc.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 6c",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học phẳng và Đường tròn",
      subtopic: "Tam giác đồng dạng và tính chất đường trung trực",
      cognitive_level: "Vận dụng cao",
      original_summary: "Kẻ đường kính $BN$ của $(O)$. Chứng minh $\\triangle BKM \\backsim \\triangle BAN$ và $OM$ đi qua trung điểm của $NC$.",
      core_technique: "Suy ra đồng dạng từ góc-góc, lập cặp tam giác đồng dạng phụ $\\triangle ABK \\backsim \\triangle NBM$ để chứng minh $\\triangle MNC$ cân tại $M$ ($MN = MC$).",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Câu 7",
      section: "PHẦN TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học trực quan (Trụ, Nón, Cầu)",
      subtopic: "Thể tích hình nón và bài toán bảo toàn thể tích chất lỏng",
      cognitive_level: "Vận dụng",
      original_summary: "Hai ly hình nón giống nhau ($R=4\\text{ cm}, h=10\\text{ cm}$), đổ nước từ ly 1 đầy sang ly 2 sao cho chiều cao nước ly 1 còn $\\frac{3}{4}$ ban đầu; tính chiều cao nước ly 2.",
      core_technique: "Dùng tỷ số đồng dạng $r = \\frac{R}{H}h$ và định luật bảo toàn thể tích $V_2 = V_{\\text{nón}} - V_1$ để giải phương trình bậc ba tìm $h$.",
      real_world_context: "Đổ nước giữa hai ly thủy tinh hình nón bằng nhau.",
      visual_description: "Hình minh họa hai chiếc ly thủy tinh hình nón đặt cạnh nhau (ly 1 chứa nước, ly 2 rỗng).",
      requires_svg: true,
      requires_table: false
    }
  ]
};

const GRADE10_ENTRANCE_MATRIX_MD = buildMatrixMarkdownFromBlueprint(GRADE10_ENTRANCE_BLUEPRINT);

// ============================================================================
// 3. BLUEPRINT MẪU: ĐỀ TỐT NGHIỆP THPT CHÍNH THỨC 2026 - BỘ GD&ĐT (MÃ 0101)
// ============================================================================
const THPT_GRADUATION_BLUEPRINT: ExamBlueprint = {
  metadata: {
    exam_title: "KỲ THI TỐT NGHIỆP THPT NĂM 2026 - ĐỀ CHÍNH THỨC BỘ GD&ĐT (MÃ 0101)",
    grade: "Lớp 12",
    subject: "Toán học",
    duration: "90 phút",
    total_points: 10,
    exam_format: "100% Trắc nghiệm 3 phần chuẩn Bộ GD&ĐT (12 câu ABCD + 4 câu Đúng/Sai + 6 câu Trả lời ngắn)",
    preset_id: "thpt_graduation",
    preset_name: "Đề Thi Tốt nghiệp THPT - Chuẩn cấu trúc 3 phần mới của Bộ GD&ĐT"
  },
  sections: [
    {
      section_id: "PHẦN I",
      title: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn",
      format_type: "multiple_choice",
      question_count: 12,
      total_points: 3.0,
      description: "12 câu (0,25 điểm/câu)"
    },
    {
      section_id: "PHẦN II",
      title: "PHẦN II. Câu trắc nghiệm đúng sai",
      format_type: "true_false",
      question_count: 4,
      total_points: 4.0,
      description: "4 câu, mỗi câu gồm 4 mệnh đề a, b, c, d (tối đa 1,0 điểm/câu)"
    },
    {
      section_id: "PHẦN III",
      title: "PHẦN III. Câu trắc nghiệm trả lời ngắn",
      format_type: "short_answer",
      question_count: 6,
      total_points: 3.0,
      description: "6 câu điền số nguyên hoặc số thập phân tối đa 4 ký tự (0,5 điểm/câu)"
    }
  ],
  cognitive_ratio: {
    nhan_biet_percent: 30,
    thong_hieu_percent: 40,
    van_dung_percent: 20,
    van_dung_cao_percent: 10,
    nhan_biet_points: 3.0,
    thong_hieu_points: 4.0,
    van_dung_points: 2.0,
    van_dung_cao_points: 1.0
  },
  items: [
    {
      id: "Phần I - Câu 1",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Số hạng cấp số cộng",
      cognitive_level: "Nhận biết",
      original_summary: "Cho CSC $(u_n)$ có $u_1 = 5, d = -1$, tính $u_2$.",
      core_technique: "Áp dụng $u_2 = u_1 + d$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 2",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Đạo hàm",
      subtopic: "Đạo hàm của tổng hai hàm số",
      cognitive_level: "Nhận biết",
      original_summary: "Cho $f'(x) = x, g'(x) = x^2$, tính đạo hàm của $y = f(x) + g(x)$.",
      core_technique: "Quy tắc $(f + g)' = f' + g'$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 3",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Nguyên hàm - Tích phân",
      subtopic: "Tính chất tuyến tính của nguyên hàm",
      cognitive_level: "Nhận biết",
      original_summary: "Biết $\\int f(x)\\,dx = \\sin x + C$, tìm $\\int [3 + f(x)]\\,dx$.",
      core_technique: "Tách $\\int [k + f(x)]\\,dx = kx + \\int f(x)\\,dx$; bẫy dấu nguyên hàm lượng giác.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 4",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hàm số mũ và Lôgarit",
      subtopic: "Phương trình lôgarit cơ bản",
      cognitive_level: "Nhận biết",
      original_summary: "Giải phương trình $\\log_3(x - 1) = 1$.",
      core_technique: "Điều kiện xác định và biến đổi $\\log_a u = b \\Leftrightarrow u = a^b$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 5",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Phương pháp tọa độ trong không gian $Oxyz$",
      subtopic: "Tọa độ vectơ $\\overrightarrow{AB}$",
      cognitive_level: "Nhận biết",
      original_summary: "Cho $A(1;5;1), B(3;3;1)$, tìm tọa độ $\\overrightarrow{AB}$.",
      core_technique: "Lấy tọa độ điểm cuối trừ tọa độ điểm đầu $(x_B - x_A; y_B - y_A; z_B - z_A)$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 6",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Xác suất",
      subtopic: "Quy tắc nhân xác suất hai biến cố độc lập",
      cognitive_level: "Nhận biết",
      original_summary: "Hai biến cố độc lập $A, B$ có $P(A) = 0,5; P(B) = 0,4$. Tính $P(AB)$.",
      core_technique: "Áp dụng $P(AB) = P(A)\\cdot P(B)$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 7",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Vectơ trong không gian",
      subtopic: "Hai vectơ bằng nhau trên hình lập phương",
      cognitive_level: "Nhận biết",
      original_summary: "Cho hình lập phương $ABCD.A'B'C'D'$, tìm vectơ bằng $\\overrightarrow{AB}$.",
      core_technique: "Quan sát hình lập phương tìm vectơ cùng hướng và cùng độ dài.",
      real_world_context: "",
      visual_description: "Hình vẽ không gian hình lập phương $ABCD.A'B'C'D'$.",
      requires_svg: true,
      requires_table: false
    },
    {
      id: "Phần I - Câu 8",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Hệ bất phương trình bậc nhất hai ẩn",
      subtopic: "Kiểm tra nghiệm của hệ BPT hai ẩn",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm cặp số là nghiệm của hệ $\\begin{cases} x + y - 3 < 0 \\\\ x - y + 1 > 0 \\end{cases}$.",
      core_technique: "Thay tọa độ từng phương án vào kiểm tra đồng thời hai bất phương trình.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 9",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Nguyên hàm - Tích phân",
      subtopic: "Định nghĩa nguyên hàm $F'(x) = f(x)$",
      cognitive_level: "Nhận biết",
      original_summary: "$F(x) = 4x^3$ là nguyên hàm của hàm số nào?",
      core_technique: "Tính đạo hàm $f(x) = F'(x)$; bẫy tính nhầm nguyên hàm của $F(x)$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 10",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Ứng dụng đạo hàm khảo sát hàm số",
      subtopic: "Đọc đường tiệm cận ngang từ Bảng biến thiên",
      cognitive_level: "Nhận biết",
      original_summary: "Từ BBT hàm phân thức hữu tỉ bậc 1/bậc 1, tìm phương trình đường tiệm cận ngang.",
      core_technique: "Đọc giới hạn $\\lim_{x \\to \\pm\\infty} y = y_0$ để kết luận $y = y_0$.",
      real_world_context: "",
      visual_description: "Bảng biến thiên hàm phân thức có tiệm cận đứng $x = 1$ và giới hạn tại vô cực là $-2$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "Phần I - Câu 11",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số cộng - Cấp số nhân",
      subtopic: "Công thức số hạng thứ 4 cấp số nhân",
      cognitive_level: "Nhận biết",
      original_summary: "Cho CSN $(u_n)$ công bội $q$, viết biểu thức $u_4$ theo $u_1, q$.",
      core_technique: "Công thức $u_n = u_1 q^{n-1}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần I - Câu 12",
      section: "PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Các số đặc trưng của mẫu số liệu ghép nhóm",
      subtopic: "Nhóm chứa trung vị mẫu số liệu ghép nhóm",
      cognitive_level: "Thông hiểu",
      original_summary: "Tìm nhóm chứa trung vị của mẫu thời gian học trực tuyến của 42 học sinh (6 nhóm).",
      core_technique: "Tính tần số tích lũy đến khi vượt quá $\\frac{n}{2}$ để xác định nhóm chứa trung vị.",
      real_world_context: "Khảo sát thời gian học trực tuyến mỗi ngày của học sinh.",
      visual_description: "Bảng tần số ghép nhóm 6 cột từ $[10;20)$ đến $[60;70)$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "Phần II - Câu 1 (a, b, c, d)",
      section: "PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Xác suất có điều kiện",
      subtopic: "Xác suất toàn phần và Công thức Bayes trong xét nghiệm",
      cognitive_level: "Thông hiểu",
      original_summary: "Ứng dụng AI sàng lọc bệnh trên $10000$ hồ sơ y tế: tính $P(\\overline{W})$, $P(\\overline{D}|\\overline{W})$, $P(\\overline{D})$, $P(\\overline{W}|\\overline{D})$.",
      core_technique: "Lập bảng tần số $2\\times 2$ từ dữ liệu phần chia nhánh, tính xác suất có điều kiện $P(A|B) = \\frac{n(AB)}{n(B)}$.",
      real_world_context: "Ứng dụng AI tầm soát nguy cơ mắc bệnh từ hồ sơ y tế.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần II - Câu 2 (a, b, c, d)",
      section: "PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Ứng dụng đạo hàm khảo sát hàm số",
      subtopic: "Khảo sát tính đơn điệu và cực trị hàm bậc ba",
      cognitive_level: "Thông hiểu",
      original_summary: "Cho $f(x) = \\frac{1}{3}x^3 - 5x^2 + 9x + 8$, xét đạo hàm, nghiệm $f'(x)=0$, khoảng nghịch biến và giá trị cực tiểu.",
      core_technique: "Tính $f'(x)$, lập bảng xét dấu, phân biệt cực đại với cực tiểu (bẫy lấy nhầm giá trị cực đại làm cực tiểu).",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần II - Câu 3 (a, b, c, d)",
      section: "PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Nguyên hàm - Tích phân",
      subtopic: "Ứng dụng tích phân tính sản lượng tích lũy theo tốc độ biến thiên",
      cognitive_level: "Vận dụng",
      original_summary: "Tốc độ lưu trữ điện mặt trời $f(t) = -0,3t^2 + 3,6t$ ($0\\le t\\le 12$), $F(0)=0$. Xét nguyên hàm $F(t)$, công thức tích phân và năng lượng trên các đoạn thời gian.",
      core_technique: "Tìm nguyên hàm với điều kiện đầu $F(0)=0$ và tính $\\Delta F = \\int_a^b f(t)\\,dt$.",
      real_world_context: "Lưu trữ điện năng từ hệ thống pin năng lượng mặt trời trong ngày.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần II - Câu 4 (a, b, c, d)",
      section: "PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Phương pháp tọa độ trong không gian $Oxyz$",
      subtopic: "Phương trình đường thẳng và cực trị khoảng cách tới đường tròn $(Oxy)$",
      cognitive_level: "Vận dụng",
      original_summary: "Máy bay bay từ $M(5;10;4)$ đến $N(14;-2;4)$, vành đai bảo vệ tròn tâm $O$ bán kính $R=7$ trên $(Oxy)$. Xét vectơ chỉ phương, phương trình tham số, $d_{\\min}$ và tọa độ cực trị.",
      core_technique: "Viết phương trình tham số $MN$ giữ đúng cao độ $z=4$, chiếu vuông góc xuống $(Oxy)$, dùng định lý Pytago $d = \\sqrt{(OQ' - R)^2 + z^2}$.",
      real_world_context: "Giám sát khoảng cách an toàn của máy bay không người lái với vành đai bảo vệ.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần III - Câu 1",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Phương pháp tọa độ trong không gian $Oxyz$",
      subtopic: "Khoảng cách từ điểm đến mặt phẳng trong hình lập phương",
      cognitive_level: "Thông hiểu",
      original_summary: "Hình lập phương $ABCD.MNPQ$ cạnh $6$, $E$ trung điểm $AB$. Tính $d(P, (MED))$.",
      core_technique: "Gắn hệ trục tọa độ $Oxyz$ tại $D(0;0;0)$, lập phương trình mặt phẳng $(MED)$ qua tích có hướng và tính khoảng cách.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "Phần III - Câu 2",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Tổ hợp và Số học đồng dư",
      subtopic: "Đếm cách điền bảng bậc thang theo lớp đồng dư modulo",
      cognitive_level: "Vận dụng cao",
      original_summary: "Điền 15 số tập hợp đã cho vào bảng bậc thang $5\\times 5$ sao cho hiệu hai ô cùng hàng hoặc cùng cột không chia hết cho $5$; tính $\\frac{H}{30}$.",
      core_technique: "Phân hoạch 15 số theo số dư mod $5$ (cỡ $5,4,3,2,1$ khớp đúng kích thước 5 hàng/5 cột), tính $H = 5!\\cdot 4!\\cdot 3!\\cdot 2!\\cdot 1!$.",
      real_world_context: "Thử thách trò chơi điền bảng số.",
      visual_description: "Hình vẽ bảng ô vuông bậc thang 15 ô gồm Hàng 1 (5 ô) giảm dần đến Hàng 5 (1 ô).",
      requires_svg: true,
      requires_table: false
    },
    {
      id: "Phần III - Câu 3",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Ứng dụng tích phân tính thể tích",
      subtopic: "Thể tích khối tròn xoay giới hạn bởi elip khoét lõi trụ",
      cognitive_level: "Vận dụng",
      original_summary: "Quay nửa trên elip $\\frac{x^2}{1,5^2} + \\frac{y^2}{1^2} = 1$ quanh $Ox$ rồi khoan lỗ trụ bán kính $r = 0,2\\text{ cm}$. Tính thể tích hạt cườm.",
      core_technique: "Tìm hoành độ giao điểm của elip với $y = r$, tính $V = \\pi \\int_{-a}^{a} (y_{\\text{elip}}^2 - r^2)\\,dx$.",
      real_world_context: "Chế tác hạt cườm dạng elipxoít có lỗ xỏ dây hình trụ.",
      visual_description: "Hình vẽ mặt cắt elip quay quanh $Ox$ và đường ống khoan trụ bán kính $0,2\\text{ cm}$.",
      requires_svg: true,
      requires_table: false
    },
    {
      id: "Phần III - Câu 4",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Xác suất cổ điển kết hợp Tổ hợp hình học",
      subtopic: "Xác suất xếp 4 đèn đỏ và 8 đèn xanh trên đa giác đều 12 đỉnh",
      cognitive_level: "Vận dụng cao",
      original_summary: "Xếp ngẫu nhiên 4 bóng đỏ và 8 bóng xanh vào 12 đỉnh đa giác đều sao cho cả 3 hình vuông nội tiếp đều có ít nhất 1 bóng đỏ. Tính $3190P$.",
      core_technique: "Chia 12 đỉnh thành 3 hình vuông rời nhau (mỗi hình 4 đỉnh); theo Dirichlet số bóng đỏ ở 3 hình vuông là hoán vị của $(2,1,1)$.",
      real_world_context: "Trang trí khung đèn trần nhà hình đa giác đều 12 cạnh.",
      visual_description: "Hình vẽ đa giác đều 12 đỉnh $A_1 A_2 \\dots A_{12}$ nội tiếp đường tròn.",
      requires_svg: true,
      requires_table: false
    },
    {
      id: "Phần III - Câu 5",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Hệ phương trình bậc nhất ba ẩn",
      subtopic: "Mô hình lập hệ 3 ẩn từ bảng số liệu kinh doanh",
      cognitive_level: "Thông hiểu",
      original_summary: "Từ bảng số lượng 3 loại rau củ và doanh thu 3 ngày Thứ Tư, Thứ Năm, Thứ Sáu, tính tổng tiền ngày Thứ Bảy.",
      core_technique: "Lập hệ phương trình tuyến tính 3 ẩn $(x, y, z)$ giải đơn giá từng mặt hàng, rồi tính tổ hợp tuyến tính ngày Thứ Bảy.",
      real_world_context: "Nông trại cung cấp rau quả cho siêu thị.",
      visual_description: "Bảng số liệu bán hàng 4 ngày (Thứ Tư -> Thứ Bảy) của 3 loại rau quả và tổng tiền.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "Phần III - Câu 6",
      section: "PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Ứng dụng đạo hàm giải bài toán tối ưu",
      subtopic: "Cực đại hóa hàm lợi nhuận $P(x) = R(x) - C(x)$ trên đoạn",
      cognitive_level: "Vận dụng",
      original_summary: "Chi phí $C(x) = 0,001x^3 + 30x + 10$ và doanh thu $R(x) = 60x$ ($1\\le x\\le 200$). Tìm lợi nhuận lớn nhất.",
      core_technique: "Lập $P(x) = R(x) - C(x)$, giải $P'(x) = 0$ trong miền ràng buộc và so sánh giá trị tại điểm tới hạn với hai đầu mút.",
      real_world_context: "Tối ưu hóa lợi nhuận chế biến nông sản theo công suất nhà máy.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    }
  ]
};

const THPT_GRADUATION_MATRIX_MD = buildMatrixMarkdownFromBlueprint(THPT_GRADUATION_BLUEPRINT);

// ============================================================================
// 4. BLUEPRINT MẪU: ĐỀ CHỌN HSG THPT THÀNH PHỐ HUẾ (2026-2027 - MÃ 1252)
// ============================================================================
const GIFTED_STUDENT_BLUEPRINT: ExamBlueprint = {
  metadata: {
    exam_title: "KỲ THI CHỌN HỌC SINH GIỎI THPT CẤP THÀNH PHỐ NĂM HỌC 2026-2027 (SỞ GD&ĐT TP HUẾ)",
    grade: "Lớp 12 (HSG THPT)",
    subject: "Toán học",
    duration: "150 phút",
    total_points: 20,
    exam_format: "Kết hợp A. Trắc nghiệm khách quan 3 phần (10,0 điểm) + B. Tự luận 5 bài (10,0 điểm)",
    preset_id: "gifted_student",
    preset_name: "Đề Thi Học sinh giỏi Cấp Tỉnh/Thành phố (THCS / THPT) - Thang điểm 20"
  },
  sections: [
    {
      section_id: "A - PHẦN I",
      title: "A. TRẮC NGHIỆM KHÁCH QUAN - PHẦN I. Nhiều phương án lựa chọn",
      format_type: "multiple_choice",
      question_count: 12,
      total_points: 3.0,
      description: "12 câu ABCD (0,25 điểm/câu)"
    },
    {
      section_id: "A - PHẦN II",
      title: "A. TRẮC NGHIỆM KHÁCH QUAN - PHẦN II. Đúng / Sai",
      format_type: "true_false",
      question_count: 4,
      total_points: 4.0,
      description: "4 câu Đúng/Sai chuyên sâu (tối đa 1,0 điểm/câu)"
    },
    {
      section_id: "A - PHẦN III",
      title: "A. TRẮC NGHIỆM KHÁCH QUAN - PHẦN III. Trả lời ngắn",
      format_type: "short_answer",
      question_count: 6,
      total_points: 3.0,
      description: "6 câu Trả lời ngắn phân hóa cao (0,5 điểm/câu)"
    },
    {
      section_id: "B - TỰ LUẬN",
      title: "B. TỰ LUẬN",
      format_type: "essay",
      question_count: 5,
      total_points: 10.0,
      description: "5 câu tự luận chứng minh & tối ưu chuyên sâu (2,0 điểm/câu)"
    }
  ],
  cognitive_ratio: {
    nhan_biet_percent: 15,
    thong_hieu_percent: 25,
    van_dung_percent: 35,
    van_dung_cao_percent: 25,
    nhan_biet_points: 3.0,
    thong_hieu_points: 5.0,
    van_dung_points: 7.0,
    van_dung_cao_points: 5.0
  },
  items: [
    {
      id: "A.I - Câu 1",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Giới hạn hàm số",
      subtopic: "Khử dạng vô định $0/0$",
      cognitive_level: "Nhận biết",
      original_summary: "Tính $\\lim_{x\\to 3} \\frac{x^2 - 9}{x^2 - 4x + 3}$.",
      core_technique: "Phân tích tử và mẫu thành nhân tử $(x - x_0)$ để khử dạng $0/0$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 2",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Thể tích khối đa diện",
      subtopic: "Thể tích khối chóp có cạnh bên vuông góc đáy",
      cognitive_level: "Nhận biết",
      original_summary: "Chóp $S.ABC$ đáy vuông tại $B$, $AB=a, BC=a\\sqrt{3}, SA\\perp(ABC), SA=2a$. Tính thể tích.",
      core_technique: "Áp dụng $V = \\frac{1}{3} S_{\\text{đáy}} \\cdot h$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 3",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Đạo hàm hàm hợp",
      subtopic: "Đạo hàm hàm lôgarit tự nhiên",
      cognitive_level: "Nhận biết",
      original_summary: "Tính đạo hàm $y = \\ln(x^2 + 1)$.",
      core_technique: "Công thức $(\\ln u)' = \\frac{u'}{u}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 4",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Tọa độ trong mặt phẳng $Oxy$",
      subtopic: "Tọa độ trung điểm đoạn thẳng",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm tọa độ trung điểm $I$ của $AB$ với $A(1;2), B(3;0)$.",
      core_technique: "Trung bình cộng hoành độ và tung độ.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 5",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Mũ và Lôgarit",
      subtopic: "Bất phương trình lôgarit cơ số nhỏ hơn 1",
      cognitive_level: "Thông hiểu",
      original_summary: "Giải bất phương trình $\\log_{0,5}(2x - 1) \\ge -1$.",
      core_technique: "Đặt điều kiện $2x - 1 > 0$ và đảo chiều bất đẳng thức khi $0 < a < 1$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 6",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Khảo sát hàm số",
      subtopic: "Tiệm cận ngang hàm phân thức",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm tiệm cận ngang của $y = \\frac{2x - 5}{3 - x}$.",
      core_technique: "Lấy tỷ số hệ số bậc nhất của $x$ ở tử và mẫu (chú ý đảo thứ tự mẫu $3 - x$).",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 7",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Phương trình lượng giác",
      subtopic: "Đếm số nghiệm trên khoảng cho trước",
      cognitive_level: "Thông hiểu",
      original_summary: "Đếm số nghiệm của $\\sin 2x = \\frac{\\sqrt{3}}{2}$ trên $(0; \\pi)$.",
      core_technique: "Giải họ nghiệm hoặc đổi biến $t = 2x \\in (0; 2\\pi)$ đếm giao điểm đường tròn lượng giác.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 8",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Khảo sát hàm số",
      subtopic: "Số điểm cực trị hàm đa thức",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm số điểm cực trị của $y = x^3 + 3$.",
      core_technique: "Kiểm tra số lần đổi dấu của $y' = 3x^2 \\ge 0$ (chú ý nghiệm kép $x = 0$ không phải cực trị).",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 9",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Dãy số - Cấp số nhân",
      subtopic: "Công thức số hạng tổng quát cấp số nhân",
      cognitive_level: "Nhận biết",
      original_summary: "CSN $u_1 = 3, q = -2$, viết $u_n$.",
      core_technique: "Áp dụng $u_n = u_1 \\cdot q^{n-1}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 10",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Tổ hợp và Xác suất",
      subtopic: "Xác suất dùng biến cố đối",
      cognitive_level: "Thông hiểu",
      original_summary: "Chọn 3 học sinh từ 5 nam, 4 nữ; tính xác suất có ít nhất 1 nữ.",
      core_technique: "Dùng phần bù $1 - \\frac{C_5^3}{C_9^3}$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 11",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Khảo sát hàm số",
      subtopic: "GTLN trên đoạn của hàm bậc 3",
      cognitive_level: "Nhận biết",
      original_summary: "Tìm GTLN của $f(x) = x^3 - 3x + 5$ trên $[0; 2]$.",
      core_technique: "Tính $f'(x) = 0$ tìm điểm tới hạn trong $(0;2)$ và so sánh các giá trị.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.I - Câu 12",
      section: "A - PHẦN I",
      question_type: "multiple_choice",
      points: 0.25,
      topic: "Thống kê ghép nhóm",
      subtopic: "Số trung bình mẫu số liệu ghép nhóm",
      cognitive_level: "Thông hiểu",
      original_summary: "Tính trung bình thời gian tập thể dục của 40 học sinh khối 12 (5 nhóm).",
      core_technique: "Tính tổng tích giá trị đại diện nhân tần số rồi chia cỡ mẫu $n$.",
      real_world_context: "Khảo sát thời gian tập thể dục của học sinh khối 12.",
      visual_description: "Bảng tần số ghép nhóm 5 nhóm từ $[0;20)$ đến $[80;100)$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "A.II - Câu 1 (a, b, c, d)",
      section: "A - PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Ứng dụng đạo hàm vào bài toán kinh tế",
      subtopic: "Tối ưu lợi nhuận xuất khẩu và thuế trên đơn vị sản phẩm",
      cognitive_level: "Vận dụng",
      original_summary: "Doanh nghiệp sản xuất $R(x)=x-500$, bán trong nước $Q(x)=5500-x$, xuất khẩu phần còn lại với giá $5000$, thuế $y$ sao cho lãi bằng $4y$. Xét hàm $E(x), y(x)$, chi phí tối ưu và lợi nhuận cực đại.",
      core_technique: "Lập hàm số lượng xuất khẩu $E(x) = R(x) - Q(x)$, giải phương trình lợi nhuận $5000 - x - y = 4y$, khảo sát hàm bậc hai $L(x) = E(x)\\cdot 4y(x)$.",
      real_world_context: "Mô hình tối ưu lợi nhuận xuất khẩu và chính sách thuế doanh nghiệp.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.II - Câu 2 (a, b, c, d)",
      section: "A - PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Khảo sát hàm số phân thức hữu tỉ",
      subtopic: "Khôi phục hàm $f(x) = \\frac{ax+b}{cx+d}$ từ đồ thị $y = f'(x)$",
      cognitive_level: "Vận dụng cao",
      original_summary: "Cho GTLN trên $[0;2]$ bằng $1$, đồ thị đạo hàm $y=f'(x)$ có tiệm cận đứng $x=-1$ và cắt $Oy$ tại $(0;3)$. Xét tính đơn điệu, $f(0)$, tiệm cận ngang và số điểm tọa độ nguyên.",
      core_technique: "Từ $f'(x) = \\frac{ad-bc}{(cx+d)^2} > 0$ suy ra đồng biến, dùng tiệm cận đứng $x=-1$ và $f'(0)=3$ kết hợp $\\max_{[0;2]} f(x) = f(2) = 1$ để khôi phục công thức $f(x)$ và đếm ước nguyên.",
      real_world_context: "",
      visual_description: "Đồ thị hàm số đạo hàm $y = f'(x)$ hai nhánh nằm phía trên $Ox$, tiệm cận đứng $x = -1$, cắt $Oy$ tại $3$.",
      requires_svg: true,
      requires_table: false
    },
    {
      id: "A.II - Câu 3 (a, b, c, d)",
      section: "A - PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Hình học không gian cổ điển",
      subtopic: "Diện tích, góc đường thẳng và góc nhị diện trong chóp $S.ABCD$",
      cognitive_level: "Vận dụng",
      original_summary: "Chóp $S.ABCD$ đáy hình thoi cạnh $2$, $AC=2$, $SA=1$, $SA\\perp(ABCD)$, $M$ trung điểm $SD$. Xét $S_{ABCD}$, góc $(SO, BD)$, $S_{\\triangle MAC}$ và góc nhị diện $[M,AC,D]$.",
      core_technique: "Dùng tính chất tam giác đều đáy hình thoi, quan hệ vuông góc $BD\\perp(SAC)$, trung bình đường cao và góc phẳng nhị diện tại giao tuyến $AC$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.II - Câu 4 (a, b, c, d)",
      section: "A - PHẦN II",
      question_type: "true_false",
      points: 1.0,
      topic: "Xác suất - Xích Markov hữu hạn",
      subtopic: "Xác suất chuyển trạng thái của rô bốt qua từng bước $t = 1..5$",
      cognitive_level: "Vận dụng cao",
      original_summary: "Rô bốt di chuyển giữa 3 vị trí $A, B, C$ theo ma trận xác suất chuyển sau mỗi phút, xuất phát tại $A$. Xét $p_1, p_2$, vị trí khả dĩ nhất lúc $t=3$ và xác suất quay lại $A$ lần đầu lúc $t=5$.",
      core_technique: "Dùng sơ đồ cây xác suất / công thức xác suất toàn phần qua từng bước và đếm đường đi khép kín tránh quay lại $A$ ở các bước trung gian.",
      real_world_context: "Mô phỏng chuyển động ngẫu nhiên của rô bốt hút bụi thông minh.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.III - Câu 1",
      section: "A - PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Tổ hợp và Xác suất phân hoạch tập hợp",
      subtopic: "Xếp 9 học sinh vào 3 toa tàu có điều kiện ràng buộc",
      cognitive_level: "Vận dụng",
      original_summary: "Chia ngẫu nhiên 9 học sinh (gồm Trí và Lan) lên 3 toa, mỗi toa ít nhất 1 người. Tính $42p$ với $p$ là xác suất Toa 1 có đúng 2 người là Trí và Lan.",
      core_technique: "Dùng nguyên lý bù trừ (hoặc số Stirling loại 2) đếm số cách chia vào các toa phân biệt sao cho không có toa trống.",
      real_world_context: "Phân bổ nhóm bạn chơi tàu lượn siêu tốc gồm 3 toa nối tiếp.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.III - Câu 2",
      section: "A - PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Phương trình lượng giác kết hợp Mũ - Lôgarit",
      subtopic: "Giải phương trình cực trị bất đẳng thức Cauchy trên chỉ số kết hợp",
      cognitive_level: "Vận dụng cao",
      original_summary: "Cho $f(x) = 1+\\sin^2 x$, $g(x) = 1+\\cos^2 x$, $H(x) = \\log_4 f(x)\\cdot\\log_4 g(x)$. Tìm tổng $S$ các nghiệm $x \\in [0; 8\\pi]$ sao cho $\\sqrt{H(x)} = \\log_4 \\frac{3}{2}$, tính $\\frac{20S}{\\pi}$.",
      core_technique: "Áp dụng BĐT AM-GM cho $\\log_4(1+\\sin^2 x) + \\log_4(1+\\cos^2 x) = \\log_4(2 + \\frac{1}{4}\\sin^2 2x) \\le \\log_4 \\frac{9}{4} = 2\\log_4 \\frac{3}{2}$, tìm dấu bằng xảy ra khi $\\sin^2 x = \\cos^2 x$.",
      real_world_context: "Đánh giá mức độ phối hợp hai thuật toán AI camera nhận diện vật thể.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.III - Câu 3",
      section: "A - PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Số học và Chia hết",
      subtopic: "Đếm số có $n$ chữ số thỏa tính chất tăng chữ số",
      cognitive_level: "Vận dụng cao",
      original_summary: "Số 12 chữ số (chữ số $<9$) gọi là thú vị nếu khi tăng mỗi chữ số thêm $0$ hoặc $1$ thu được số mới chia hết cho số ban đầu. Đếm số lượng số thú vị.",
      core_technique: "Đánh giá tỷ số $\\frac{N'}{N} \\in (1; 2]$ suy ra thương chỉ có thể là $2$, từ chữ số đầu suy ra quy luật gấp đôi từng chữ số hoặc nhớ ở hàng thấp.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.III - Câu 4",
      section: "A - PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Hình học không gian",
      subtopic: "Khoảng cách từ điểm đến mặt phẳng trong lăng trụ đứng đáy thang cân",
      cognitive_level: "Vận dụng",
      original_summary: "Lăng trụ đứng đáy hình thang cân $AB=BC=CD=7\\sqrt{6}, AD=14\\sqrt{6}$, góc $((A'CD), (ABCD)) = 45^\\circ$. Tính $d(B, (A'CD))$.",
      core_technique: "Dùng tính chất nửa lục giác đều nội tiếp đường tròn để thấy $AC \\perp CD$, dựng góc $45^\\circ$ và quy đổi khoảng cách từ $B$ về $A$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "A.III - Câu 5",
      section: "A - PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Khảo sát hàm số",
      subtopic: "Định lý Vi-ét cho phương trình bậc ba từ Bảng biến thiên",
      cognitive_level: "Vận dụng",
      original_summary: "Từ BBT hàm bậc 3 $y = ax^3+bx^2+cx+d$ biết cực đại $(-1; 10)$ và cực tiểu $(4; -22)$, tính $S = \\frac{x_1+x_2+x_3}{2}$.",
      core_technique: "Từ hai điểm cực trị tìm công thức $y' = 3a(x+1)(x-4)$ suy ra hệ số $a, b$ rồi dùng định lý Vi-ét $x_1+x_2+x_3 = -\\frac{b}{a}$.",
      real_world_context: "",
      visual_description: "Bảng biến thiên hàm bậc ba có cực đại $10$ tại $x = -1$ và cực tiểu $-22$ tại $x = 4$.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "A.III - Câu 6",
      section: "A - PHẦN III",
      question_type: "short_answer",
      points: 0.5,
      topic: "Cấp số cộng hai chiều",
      subtopic: "Tính chất tuyến tính trên bảng vuông $5\\times 5$",
      cognitive_level: "Vận dụng",
      original_summary: "Bảng vuông $5\\times 5$ mà mỗi hàng và mỗi cột là cấp số cộng, cho 4 ô $(1;2)=15, (2;5)=30, (3;3)=14, (5;1)=0$. Tính $10x^2$ với $x$ ở ô $(5;5)$.",
      core_technique: "Biểu diễn số ở ô $(i;j)$ dưới dạng hàm song tuyến tính $a_{ij} = A + Bi + Cj + Dij$, lập hệ 4 phương trình tìm $a_{55}$.",
      real_world_context: "",
      visual_description: "Bảng lưới vuông $5\\times 5$ có ghi các số $15, 30, 14, 0$ và ẩn $x$ ở góc dưới phải.",
      requires_svg: false,
      requires_table: true
    },
    {
      id: "B - Câu 1",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 2.0,
      topic: "Ứng dụng đạo hàm tối ưu hóa",
      subtopic: "Khảo sát GTLN hàm sản lượng thực tế theo thời gian $t$",
      cognitive_level: "Vận dụng",
      original_summary: "Khối lượng cá $w(t) = \\frac{4 + t - 0,02t^2}{100}$, số lượng $P(t) = \\frac{5000}{t + 10}$ ($0\\le t\\le 15$). Tìm $t$ để tổng sản lượng $y(t) = w(t)P(t)$ lớn nhất.",
      core_technique: "Lập hàm phân thức $y(t)$, tính đạo hàm $y'(t) = 0$ quy về phương trình bậc hai trên $[0; 15]$ và lập bảng biến thiên.",
      real_world_context: "Tối ưu hóa thời điểm thu hoạch cá nuôi trong ao theo tốc độ tăng trưởng và tỷ lệ hao hụt.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 2a",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hàm số mũ - lôgarit",
      subtopic: "Tìm tọa độ điểm trên đồ thị lôgarit qua tính chất trung điểm",
      cognitive_level: "Vận dụng",
      original_summary: "$A, B \\in (C): y = 1 + \\log_3(x-1)$ sao cho $A$ là trung điểm $OB$. Tính $AB$.",
      core_technique: "Tham số hóa $x_B = 2x_A$ và $y_B = 2y_A$, đưa về phương trình mũ/lôgarit theo $x_A$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 2b",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hệ phương trình mũ - lôgarit",
      subtopic: "Giải hệ phương trình lôgarit 3 ẩn bằng hàm đặc trưng",
      cognitive_level: "Vận dụng cao",
      original_summary: "Tìm $a,b,c > 0, a\\ne 1$ thỏa $b + \\log_2 a = 0$, $\\log_a b = \\frac{1}{c}$, $\\log_2\\left(\\frac{b}{c}\\right) = c - b$.",
      core_technique: "Biểu diễn $\\log_2 a = -b$ và tính chất đổi cơ số, tách phương trình thứ ba thành $f(c) = f(b)$ với hàm đơn điệu $f(t) = \\log_2 t - t$ (hoặc biến đổi tương đương).",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 3",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 2.0,
      topic: "Số học chia hết kết hợp Xác suất",
      subtopic: "Đếm số có 5 chữ số chia hết cho 17 có chữ số tận cùng bằng 3",
      cognitive_level: "Vận dụng",
      original_summary: "Chọn ngẫu nhiên số có 5 chữ số, tính xác suất số đó chia hết cho $17$ và tận cùng là $3$.",
      core_technique: "Biểu diễn $N = 10k + 3 \\equiv 0 \\pmod{17} \\Leftrightarrow k \\equiv 15 \\pmod{17}$, chặn khoảng $1000 \\le k \\le 9999$ để đếm số giá trị $k$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 4a",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Khảo sát hàm số và Khoảng cách hai điểm trên 2 đường cong",
      subtopic: "Tìm điểm cực tiểu khoảng cách giữa hai nhánh hypebol",
      cognitive_level: "Vận dụng",
      original_summary: "Cho $A(1;1) \\in (C_1): y = \\frac{1}{x}$ và $B \\in (C_2): y = \\frac{4}{x}$. Tìm $B$ để $AB$ nhỏ nhất.",
      core_technique: "Viết $AB^2 = (x - 1)^2 + (\\frac{4}{x} - 1)^2$ hoặc dùng bất đẳng thức / đạo hàm tìm $B(2; 2)$.",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 4b",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học giải tích kết hợp Bất đẳng thức",
      subtopic: "Chứng minh $\\min MN < \\min AB$ khi $a > 1$ trên hai đường cong",
      cognitive_level: "Vận dụng cao",
      original_summary: "Với $M\\left(a; \\frac{1}{a}\\right)$ ($a > 1$) và $N \\in (C_2)$ sao cho $MN$ nhỏ nhất, chứng minh $MN < AB$.",
      core_technique: "Chọn điểm thử $N_0$ phù hợp trên $(C_2)$ (hoặc tính thẳng khoảng cách theo phép đối xứng trục $y=x$ và đánh giá với $\\sqrt{2}$).",
      real_world_context: "",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 5a",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học không gian cổ điển",
      subtopic: "Tính độ dài cạnh hình chóp vuông góc đáy",
      cognitive_level: "Thông hiểu",
      original_summary: "Chóp $S.ABCD$ đáy chữ nhật, $(SAB)$ vuông cân cạnh huyền $2a$ và $\\perp(ABCD)$, $\\triangle SCD$ đều. Tính $AD$ theo $a$.",
      core_technique: "Dùng đường cao $SH = a$ của tam giác vuông cân, định lý ba đường vuông góc cho $\\triangle SHM$ vuông tại $H$ với $SM = a\\sqrt{3}$.",
      real_world_context: "Mô hình khối gỗ hình chóp.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    },
    {
      id: "B - Câu 5b",
      section: "B - TỰ LUẬN",
      question_type: "essay",
      points: 1.0,
      topic: "Hình học không gian - Trải phẳng đa diện",
      subtopic: "Đường đi ngắn nhất trên bề mặt hình chóp nối hai trọng tâm",
      cognitive_level: "Vận dụng cao",
      original_summary: "Tính độ dài ngắn nhất sợi dây nằm trên bề mặt khối gỗ từ trọng tâm $\\triangle SAB$ đến trọng tâm $\\triangle SCD$.",
      core_technique: "Trải phẳng các mặt bên liên tiếp ra cùng một mặt phẳng (xét cả hai phương án đi qua cạnh $SC/SD$ hoặc qua mặt đáy $ABCD$), dùng định lý côsin tính đoạn nối thẳng.",
      real_world_context: "Căng sợi dây ngắn nhất trên bề mặt khối gỗ hình chóp.",
      visual_description: "",
      requires_svg: false,
      requires_table: false
    }
  ]
};

const GIFTED_STUDENT_MATRIX_MD = buildMatrixMarkdownFromBlueprint(GIFTED_STUDENT_BLUEPRINT);

// ============================================================================
// DANH SÁCH 4 CHẾ ĐỘ PRESET CHÍNH THỨC KÈM ĐỀ MẪU CHUẨN 100% TỪ FILE GỐC
// ============================================================================
export const ISOMORPHIC_PRESETS: IsomorphicPresetConfig[] = [
  {
    id: "periodic_7991",
    shortTitle: "1. Đề Kiểm tra định kỳ (15p / Giữa kỳ / Cuối kỳ)",
    fullTitle: "Đề Kiểm tra định kỳ (15p / Giữa kỳ / Cuối kỳ) - Chuẩn Công văn 7991/BGDĐT",
    badge: "CV 7991/BGDĐT",
    description:
      "Chuẩn ma trận & bản đặc tả Công văn 7991/BGDĐT (Mẫu Giữa kỳ 1 Toán 11 THPT Nguyễn Huệ Huế 2026-2027: 12 câu ABCD + 2 câu Đúng/Sai + 4 câu Trả lời ngắn + 3 bài Tự luận).",
    standardsNote: "40% NB - 30% TH - 20% VD - 10% VDC | 12+2+4 TN & 3 TL",
    defaultDuration: "90 phút",
    defaultTotalPoints: 10,
    defaultSchoolName: "TRƯỜNG THPT NGUYỄN HUỆ",
    defaultSchoolSubName: "TỔ TOÁN - ĐỀ CHÍNH THỨC",
    defaultExamCode: "1001",
    sampleBlueprint: PERIODIC_7991_BLUEPRINT,
    sampleMatrixMarkdown: PERIODIC_7991_MATRIX_MD,
    sampleSourceExamText: `TRƯỜNG THPT NGUYỄN HUỆ — TỔ TOÁN
KIỂM TRA GIỮA KỲ I - NĂM HỌC 2026 - 2027
Môn: TOÁN, Lớp 11 | Thời gian: 90 phút (Không kể thời gian phát đề)
Mã đề: 1001

PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (3,0 điểm). Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
Câu 1. Tập xác định của hàm số $y = \\tan x$ là
A. $\\mathbb{R} \\setminus \\{k\\pi \\mid k \\in \\mathbb{Z}\\}$.
B. $\\mathbb{R} \\setminus \\{\\frac{\\pi}{2} + k\\pi \\mid k \\in \\mathbb{Z}\\}$.
C. $\\mathbb{R}$.
D. $\\mathbb{R} \\setminus \\{2k\\pi \\mid k \\in \\mathbb{Z}\\}$.
Câu 2. Cho dãy số $(u_n)$ xác định bởi $u_n = 3n + 2$, với $n \\ge 1$. Giá trị của $u_5$ bằng
A. $17$.   B. $20$.   C. $15$.   D. $18$.
Câu 3. Giá trị của $\\sin\\frac{5\\pi}{6}$ bằng
A. $-\\frac{\\sqrt{3}}{2}$.   B. $\\frac{\\sqrt{3}}{2}$.   C. $-\\frac{1}{2}$.   D. $\\frac{1}{2}$.
Câu 4. Cho cấp số cộng $(u_n)$ có $u_1 = 4$ và công sai $d = 3$. Số hạng $u_8$ bằng
A. $25$.   B. $21$.   C. $28$.   D. $24$.
Câu 5. Nghiệm của phương trình $\\sin x = -\\frac{\\sqrt{3}}{2}$ là
A. $x = \\frac{2\\pi}{3} + k2\\pi$ ($k \\in \\mathbb{Z}$).
B. $x = \\frac{\\pi}{6} + k2\\pi$ ($k \\in \\mathbb{Z}$).
C. $\\left[\\begin{array}{l} x = \\frac{\\pi}{3} + k2\\pi \\\\ x = \\frac{2\\pi}{3} + k2\\pi \\end{array}\\right.$ ($k \\in \\mathbb{Z}$).
D. $\\left[\\begin{array}{l} x = -\\frac{\\pi}{3} + k2\\pi \\\\ x = -\\frac{2\\pi}{3} + k2\\pi \\end{array}\\right.$ ($k \\in \\mathbb{Z}$).
Câu 6. Cho cấp số nhân $(u_n)$ có $u_1 = 2$ và công bội $q = -2$. Giá trị của $u_4$ là
A. $-16$.   B. $16$.   C. $-8$.   D. $8$.
Câu 7. Chu kì của hàm số $y = \\sin 2x$ là
A. $\\frac{\\pi}{2}$.   B. $4\\pi$.   C. $\\pi$.   D. $2\\pi$.
Câu 8. Trong điều kiện nuôi cấy lý tưởng, một tế bào E. coli cứ $20$ phút lại phân đôi một lần. Giả sử ban đầu có $100$ cá thể vi khuẩn được cấy vào ống nghiệm. Hỏi sau $2$ giờ, quần thể vi khuẩn này đạt số lượng là bao nhiêu?
A. $6400$.   B. $3200$.   C. $12800$.   D. $1200$.
Câu 9. Góc có số đo $\\frac{5\\pi}{6}$ radian tương ứng với số đo bao nhiêu độ?
A. $150^\\circ$.   B. $210^\\circ$.   C. $135^\\circ$.   D. $120^\\circ$.
Câu 10. Công thức nào sau đây đúng với mọi số thực $a, b$?
A. $\\cos(a + b) = \\sin a\\sin b - \\cos a\\cos b$.
B. $\\cos(a + b) = \\cos a\\cos b + \\sin a\\sin b$.
C. $\\cos(a + b) = \\cos a\\cos b - \\sin a\\sin b$.
D. $\\cos(a + b) = \\sin a\\cos b - \\cos a\\sin b$.
Câu 11. Bảng sau cho biết kết quả khảo sát của $10$ học sinh về thời gian tự học mỗi ngày:
| Thời gian (phút) | $[0; 10)$ | $[10; 20)$ | $[20; 30)$ |
| :--- | :---: | :---: | :---: |
| Số học sinh | $2$ | $3$ | $5$ |
Số trung bình của mẫu số liệu ghép nhóm trên bằng
A. $18$.   B. $19$.   C. $20$.   D. $17$.
Câu 12. Cho một mẫu số liệu ghép nhóm, trong đó có nhóm $[20; 30)$. Giá trị đại diện của nhóm này là
A. $10$.   B. $20$.   C. $25$.   D. $30$.

PHẦN II. Câu trắc nghiệm đúng sai (2,0 điểm). Thí sinh trả lời từ câu 1 đến câu 2. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
Câu 1. Cho cấp số cộng $(u_n)$ thỏa mãn: $\\begin{cases} u_2 - u_5 = 6 \\\\ u_3 + u_6 = -8 \\end{cases}$. Khi đó:
a) $d = 2$ là công sai của cấp số.
b) $u_1 = 3$ là số hạng đầu của dãy số.
c) Công thức tổng quát của cấp số cộng là $u_n = 2n + 1$.
d) Tổng $S = u_1 + u_2 + u_3 + \\dots + u_{90} = -7830$.
Câu 2. Cho hàm số $f(x) = \\frac{1}{2}\\sin 2x$. Khi đó:
a) Tập xác định của hàm số: $D = \\mathbb{R}$.
b) Đồ thị hàm số nhận trục tung làm trục đối xứng.
c) Tập giá trị của hàm số là $\\left[-\\frac{1}{2}; \\frac{1}{2}\\right]$.
d) Hàm số đồng biến trên khoảng $(0; \\pi)$.

PHẦN III. Câu trắc nghiệm trả lời ngắn (2,0 điểm). Thí sinh trả lời từ câu 1 đến câu 4.
Câu 1. Biết tổng các nghiệm của phương trình $2\\sin\\left(x - \\frac{\\pi}{4}\\right) + \\sqrt{3} = 0$ trên đoạn $[0; 2\\pi]$ có dạng $\\frac{a\\pi}{b}$ (với $\\frac{a}{b}$ là phân số tối giản và $a \\in \\mathbb{N}, b \\in \\mathbb{N}^*$). Tính $P = 2a + 3b$.
Câu 2. Cho đường tròn bán kính $3\\text{ cm}$. Tính độ dài cung tròn có số đo $\\frac{3\\pi}{4}$ của đường tròn đó (làm tròn kết quả đến hàng phần trăm).
Câu 3. Bảng số liệu ghép nhóm sau cho biết chiều cao (cm) các học sinh của một lớp 11:
| Khoảng chiều cao (cm) | $[150; 155)$ | $[155; 160)$ | $[160; 165)$ | $[165; 170)$ | $[170; 175)$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Số học sinh | $6$ | $11$ | $10$ | $8$ | $6$ |
Tứ phân vị thứ nhất của mẫu số liệu này là bao nhiêu (làm tròn kết quả đến hàng đơn vị)?
Câu 4. Một nhà máy tuyển thêm công nhân vào làm việc trong thời hạn ba năm và đưa ra hai phương án lựa chọn về lương và thưởng như sau:
+ Phương án 1: Lương tháng khởi điểm là $6$ triệu đồng và sau mỗi quý, lương tháng của quý tiếp theo sẽ tăng thêm $500$ nghìn đồng so với quý trước đó. Ngoài ra, cuối mỗi năm làm việc, công nhân được thưởng thêm một khoản bằng $10\\%$ tổng số tiền lương thực tế đã nhận trong năm đó.
+ Phương án 2: Lương tháng khởi điểm là $6$ triệu đồng và sau mỗi quý, lương tháng của quý tiếp theo sẽ tăng thêm $5\\%$ so với quý trước đó. Ngoài ra, cuối mỗi năm làm việc, công nhân được thưởng thêm một khoản cố định là $7,5$ triệu đồng.
Tổng thu nhập sau $3$ năm làm việc của hai phương án chênh lệch nhau bao nhiêu triệu đồng (không làm tròn kết quả các phép tính trung gian, chỉ làm tròn kết quả cuối cùng đến hàng phần mười)?

PHẦN IV. Tự luận (3,0 điểm).
Bài 1. Giải phương trình lượng giác: $\\cos\\left(x + \\frac{\\pi}{3}\\right) = \\frac{\\sqrt{3}}{2}$.
Bài 2. Cho góc $\\alpha$ thỏa mãn $\\pi < \\alpha < \\frac{3\\pi}{2}$ và $\\cos\\alpha = -\\frac{12}{13}$. Tính $\\cos\\left(\\alpha - \\frac{\\pi}{6}\\right)$.
Bài 3. Một cửa hàng kinh doanh đồ dùng học tập mới khai trương. Trong tháng đầu tiên, cửa hàng bán được $128$ sản phẩm. Nhờ hoạt động quảng bá và mở rộng khách hàng, số sản phẩm bán được mỗi tháng sau bằng $150\\%$ số sản phẩm bán được của tháng liền trước. Giả sử quy luật tăng trưởng này được duy trì trong $8$ tháng đầu tiên.
a) Tính số sản phẩm cửa hàng bán được trong tháng thứ $8$.
b) Chủ cửa hàng đặt mục tiêu bán được tổng cộng $7000$ sản phẩm trong $8$ tháng đầu tiên. Hỏi cửa hàng có đạt được mục tiêu này không? Giải thích.`
  },
  {
    id: "grade10_entrance",
    shortTitle: "2. Đề Tuyển sinh lớp 10",
    fullTitle: "Đề Thi Tuyển sinh vào lớp 10 THPT - Sở GD&ĐT TP Huế (Thang điểm 10)",
    badge: "Tuyển sinh 10",
    description:
      "Chuẩn kiến thức THCS - GDPT 2018 (Mẫu đề Sở GD&ĐT TP Huế 2026-2027: 90 phút, 7 câu tự luận gồm Căn thức, Vi-ét, Bảng tần số & Xác suất, Hàm bậc nhất thực tế, Lập PT, Hình tròn, Hình nón), chấm chi tiết từng 0,25đ.",
    standardsNote: "Thang 10,0 | 7 Câu Tự luận (0,25đ/bước) | Hình tròn & Hình nón",
    defaultDuration: "90 phút",
    defaultTotalPoints: 10,
    defaultSchoolName: "SỞ GIÁO DỤC VÀ ĐÀO TẠO",
    defaultSchoolSubName: "THÀNH PHỐ HUẾ - ĐỀ CHÍNH THỨC",
    defaultExamCode: "TS10",
    sampleBlueprint: GRADE10_ENTRANCE_BLUEPRINT,
    sampleMatrixMarkdown: GRADE10_ENTRANCE_MATRIX_MD,
    sampleSourceExamText: `SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HUẾ
KỲ THI TUYỂN SINH LỚP 10 THPT NĂM HỌC 2026-2027
Môn thi: TOÁN | Thời gian làm bài: 90 phút, không kể thời gian phát đề
ĐỀ THI CHÍNH THỨC (100% Tự luận - Thang điểm 10,0)

Câu 1 (1,5 điểm)
a) Tính giá trị của biểu thức $A = x - 9$ khi $x = 10$.
b) Viết điều kiện xác định của phân thức $B = \\frac{2x + 7}{x - 4}$.
c) Rút gọn biểu thức $C = \\left(\\frac{1}{\\sqrt{x} - 3} + \\frac{1}{\\sqrt{x} + 3}\\right)\\cdot\\frac{\\sqrt{x} + 3}{\\sqrt{x}}$ với $x > 0$ và $x \\ne 9$.

Câu 2 (1,0 điểm)
a) Không dùng máy tính cầm tay, giải phương trình $2x - 8 = x + 3$.
b) Cho phương trình $x^2 - 6x + 2 = 0$. Biết rằng phương trình luôn có hai nghiệm dương phân biệt $x_1, x_2$. Không giải phương trình, hãy tính giá trị của biểu thức $P = \\sqrt{12x_1 + 7} + x_2$.

Câu 3 (1,5 điểm)
a) Kết quả thống kê quãng đường đi bộ (đơn vị: kilômét) của $50$ người tập thể dục vào một buổi sáng được cho trong bảng tần số ghép nhóm sau:
| Nhóm | $[2; 3)$ | $[3; 4)$ | $[4; 5)$ | $[5; 6)$ | $[6; 7)$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Tần số | $9$ | $15$ | $16$ | $7$ | $3$ |
Dựa vào bảng trên, hãy cho biết có bao nhiêu người đi bộ từ $2\\text{ km}$ đến dưới $4\\text{ km}$?
b) Bạn An có hai chiếc hộp đựng các tấm thẻ có kích thước và khối lượng như nhau. Hộp $A$ đựng $4$ tấm thẻ được đánh số $1; 2; 3; 4$. Hộp $B$ đựng $4$ tấm thẻ được đánh số $3; 4; 5; 6$. Bạn An lấy ngẫu nhiên một tấm thẻ từ hộp $A$, sau đó lấy ngẫu nhiên một tấm thẻ từ hộp $B$. Tính xác suất của biến cố $M$: "Số đánh trên tấm thẻ lấy ra từ hộp $B$ chia hết cho số đánh trên tấm thẻ lấy ra từ hộp $A$".

Câu 4 (1,0 điểm)
Giá vé tham quan trong ngày của một địa điểm du lịch đối với khách tham quan từ $18$ tuổi trở lên là $200$ nghìn đồng/người, từ $6$ tuổi đến dưới $18$ tuổi là $40$ nghìn đồng/người, dưới $6$ tuổi là miễn phí.
a) Hỏi một đoàn khách gồm $11$ người trên $18$ tuổi, $7$ người từ $6$ tuổi đến $10$ tuổi và $2$ người dưới $6$ tuổi đến tham quan địa điểm du lịch trên thì phải trả bao nhiêu tiền vé?
b) Đối với người dân có hộ khẩu tại địa phương, giá vé tham quan được giảm $50\\%$. Một gia đình gồm $10$ người trên $18$ tuổi đến tham quan địa điểm du lịch trên. Gọi $x$ là số người có hộ khẩu tại địa phương của gia đình đó (với $x \\in \\mathbb{N}, x \\le 10$) và $y$ (nghìn đồng) là số tiền vé gia đình đó phải trả. Hãy viết công thức biểu thị $y$ theo $x$.

Câu 5 (1,0 điểm)
Nhân ngày Quốc tế thiếu nhi $1/6$, một nhóm tình nguyện viên có kế hoạch gói $900$ phần quà để tặng cho trẻ em có hoàn cảnh khó khăn. Vì mỗi ngày nhóm đã gói thêm $15$ phần quà so với dự định nên nhóm đã gói xong $900$ phần quà sớm hơn $3$ ngày so với kế hoạch. Tính số phần quà mà nhóm tình nguyện viên dự định gói mỗi ngày (biết rằng số phần quà được gói mỗi ngày là như nhau).

Câu 6 (3,0 điểm)
Cho tam giác $ABC$ nhọn ($AB < AC$) có các đường cao $AD, BE$ cắt nhau tại $H$. Gọi $K$ là trung điểm của đoạn $AH$. Qua điểm $K$ vẽ đường thẳng vuông góc với $BK$, đường thẳng này cắt $AC$ tại điểm $M$.
a) Chứng minh $4$ điểm $B, K, E, M$ cùng thuộc một đường tròn.
b) Chứng minh $\\widehat{KMB} = \\widehat{ACB}$.
c) Vẽ đường tròn tâm $O$ ngoại tiếp tam giác $ABC$, kẻ đường kính $BN$ của đường tròn $(O)$. Chứng minh tam giác $BKM$ đồng dạng với tam giác $BAN$ và đường thẳng $OM$ đi qua trung điểm của đoạn $NC$.

Câu 7 (1,0 điểm)
Bạn Bình có hai ly thủy tinh. Biết rằng phần chứa nước của hai ly có dạng hình nón với bán kính đáy cùng bằng $4\\text{ cm}$ và chiều cao cùng bằng $10\\text{ cm}$. Ban đầu, ly thứ nhất chứa đầy nước và ly thứ hai không chứa nước (có hình vẽ minh họa hai ly thủy tinh hình nón đặt cạnh nhau). Bạn Bình đổ bớt nước từ ly thứ nhất sang ly thứ hai sao cho chiều cao của lượng nước trong ly thứ nhất chỉ còn $\\frac{3}{4}$ so với chiều cao của lượng nước trong ly lúc ban đầu. Khi đó, tính chiều cao của lượng nước có trong ly thứ hai (xem bề dày thành ly không đáng kể và nước không bị đổ ra ngoài).`
  },
  {
    id: "thpt_graduation",
    shortTitle: "3. Đề Tốt nghiệp THPT",
    fullTitle: "Đề Thi Tốt nghiệp THPT 2026 - Đề Chính thức Bộ GD&ĐT (Mã 0101)",
    badge: "TN THPT 2026",
    description:
      "Chuẩn cấu trúc 3 phần Trắc nghiệm mới của Bộ GD&ĐT (Mẫu Đề chính thức Kỳ thi TN THPT 2026 Mã đề 0101): Phần I (12 câu ABCD - 3,0đ), Phần II (4 câu Đúng/Sai - 4,0đ), Phần III (6 câu Trả lời ngắn - 3,0đ).",
    standardsNote: "12 ABCD + 4 Đúng/Sai + 6 Trả lời ngắn | BBT, Hình 3D/Oxyz & Tích phân",
    defaultDuration: "90 phút",
    defaultTotalPoints: 10,
    defaultSchoolName: "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
    defaultSchoolSubName: "KỲ THI TỐT NGHIỆP THPT NĂM 2026",
    defaultExamCode: "0101",
    sampleBlueprint: THPT_GRADUATION_BLUEPRINT,
    sampleMatrixMarkdown: THPT_GRADUATION_MATRIX_MD,
    sampleSourceExamText: `BỘ GIÁO DỤC VÀ ĐÀO TẠO — ĐỀ THI CHÍNH THỨC
KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM 2026
Môn thi: TOÁN | Thời gian làm bài: 90 phút, không kể thời gian phát đề | Mã đề: 0101

PHẦN I (3,0 điểm): Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
Câu 1. Cho cấp số cộng $(u_n)$ có $u_1 = 5$ và công sai $d = -1$. Giá trị của $u_2$ bằng
A. $4$.   B. $-5$.   C. $5$.   D. $-4$.
Câu 2. Cho các hàm số $y = f(x)$ và $y = g(x)$ có đạo hàm trên tập số thực $\\mathbb{R}$ thỏa mãn $f'(x) = x$ và $g'(x) = x^2$. Đạo hàm của hàm số $y = f(x) + g(x)$ là
A. $3x$.   B. $1 + x^2$.   C. $x + x^2$.   D. $1 + 2x$.
Câu 3. Cho $\\int f(x)\\,dx = \\sin x + C$. Phát biểu nào sau đây là đúng?
A. $\\int [3 + f(x)]\\,dx = 3x + \\cos x + C$.
B. $\\int [3 + f(x)]\\,dx = 3x + \\sin x + C$.
C. $\\int [3 + f(x)]\\,dx = 3x - \\cos x + C$.
D. $\\int [3 + f(x)]\\,dx = 3x - \\sin x + C$.
Câu 4. Nghiệm của phương trình $\\log_3(x - 1) = 1$ là
A. $x = 2$.   B. $x = 3$.   C. $x = 5$.   D. $x = 4$.
Câu 5. Trong không gian với hệ tọa độ $Oxyz$, cho hai điểm $A(1; 5; 1)$ và $B(3; 3; 1)$. Vectơ $\\overrightarrow{AB}$ có tọa độ là
A. $(2; -2; 0)$.   B. $(-2; 2; 0)$.   C. $(4; 8; 2)$.   D. $(2; 4; 1)$.
Câu 6. Cho hai biến cố độc lập $A$ và $B$ có xác suất thỏa mãn $P(A) = 0,5$ và $P(B) = 0,4$. Giá trị của $P(AB)$ bằng
A. $0,8$.   B. $0,1$.   C. $0,9$.   D. $0,2$.
Câu 7. Cho hình lập phương $ABCD.A'B'C'D'$ (có hình vẽ minh họa hình lập phương). Vectơ nào sau đây bằng vectơ $\\overrightarrow{AB}$?
A. $\\overrightarrow{AA'}$.   B. $\\overrightarrow{D'C'}$.   C. $\\overrightarrow{CD}$.   D. $\\overrightarrow{AD}$.
Câu 8. Cặp số nào sau đây là nghiệm của hệ bất phương trình $\\begin{cases} x + y - 3 < 0 \\\\ x - y + 1 > 0 \\end{cases}$?
A. $(1; 0)$.   B. $(0; 2)$.   C. $(-1; 1)$.   D. $(1; 2)$.
Câu 9. Hàm số $F(x) = 4x^3$ là một nguyên hàm của hàm số nào sau đây?
A. $f_2(x) = 3x^2$.   B. $f_3(x) = 12x^2$.   C. $f_1(x) = x^4$.   D. $f_4(x) = 4x^4$.
Câu 10. Cho hàm số $y = \\frac{ax + b}{cx + d}$ ($c \\ne 0, ad - bc \\ne 0$) có bảng biến thiên như sau:
| $x$ | $-\\infty$ | | $1$ | | $+\\infty$ |
| :---: | :---: | :---: | :---: | :---: | :---: |
| $y'$ | | $+$ | $\\parallel$ | $+$ | |
| $y$ | $-2$ | $\\nearrow$ | $+\\infty \\parallel -\\infty$ | $\\nearrow$ | $-2$ |
Đường tiệm cận ngang của đồ thị hàm số đã cho có phương trình là
A. $y = -2$.   B. $x = -2$.   C. $x = 1$.   D. $y = 1$.
Câu 11. Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1$ và công bội $q$ với $u_1 \\ne 0, q > 1$. Số hạng $u_4$ là
A. $u_4 = u_1 \\cdot q^3$.   B. $u_4 = u_1 \\cdot q^4$.   C. $u_4 = u_1 + 3q$.   D. $u_4 = u_1 + 4q$.
Câu 12. Khảo sát thời gian (đơn vị: phút) học trực tuyến trong một ngày của $42$ học sinh, người ta thu được mẫu số liệu ghép nhóm như sau:
| Thời gian học trực tuyến | $[10; 20)$ | $[20; 30)$ | $[30; 40)$ | $[40; 50)$ | $[50; 60)$ | $[60; 70)$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Số học sinh | $4$ | $8$ | $14$ | $7$ | $4$ | $5$ |
Trung vị của mẫu số liệu trên thuộc nhóm nào sau đây?
A. $[30; 40)$.   B. $[40; 50)$.   C. $[60; 70)$.   D. $[50; 60)$.

PHẦN II (4,0 điểm): Thí sinh trả lời từ câu 1 đến câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
Câu 1. Nhằm đưa ra cảnh báo sớm về tình trạng sức khỏe của cư dân, người ta sử dụng một ứng dụng trí tuệ nhân tạo để sàng lọc nguy cơ mắc bệnh dựa trên hồ sơ y tế được lưu trữ. Khi phát hiện nguy cơ mắc bệnh, ứng dụng này sẽ gửi cảnh báo để giúp người dân đi khám bệnh kịp thời. Người ta dùng ứng dụng này để tầm soát nguy cơ mắc một loại bệnh. Kết quả thu được khi quét thử nghiệm hồ sơ y tế của $10000$ người như sau: Có $1000$ người nhận được cảnh báo và $9000$ người còn lại không nhận được cảnh báo từ ứng dụng. Trong số $1000$ người nhận được cảnh báo thì có $700$ người có bệnh và $300$ người không có bệnh. Trong số $9000$ người không nhận được cảnh báo thì có $100$ người có bệnh và $8900$ người không có bệnh. Chọn ngẫu nhiên một người trong số $10000$ người nói trên.
a) Xác suất để người đó không nhận được cảnh báo từ ứng dụng bằng $0,9$.
b) Xác suất để người đó không có bệnh, biết rằng người đó không nhận được cảnh báo từ ứng dụng, lớn hơn $0,98$.
c) Xác suất để người đó không có bệnh bằng $0,9$.
d) Xác suất để người đó không nhận được cảnh báo từ ứng dụng, biết rằng người đó không có bệnh, nhỏ hơn $0,95$.

Câu 2. Cho hàm số $f(x) = \\frac{1}{3}x^3 - 5x^2 + 9x + 8$.
a) Hàm số đã cho có đạo hàm là $f'(x) = x^2 - 10x + 9$.
b) Phương trình $f'(x) = 0$ có tập nghiệm là $S = \\{1; 9\\}$.
c) Hàm số đã cho nghịch biến trên khoảng $(1; 9)$.
d) Giá trị cực tiểu của hàm số đã cho bằng $\\frac{37}{3}$.

Câu 3. Một hệ thống pin năng lượng mặt trời gồm các tấm pin được kết nối với một bộ lưu trữ điện. Trong thời gian mặt trời chiếu sáng của một ngày, năng lượng điện thu được từ các tấm pin được lưu trong bộ lưu trữ điện. Gọi $F(t)$ là năng lượng điện ($\\text{kWh}$) lưu trữ được kể từ thời điểm hệ thống bắt đầu hoạt động đến thời điểm $t$, trong đó $t$ là thời gian tính theo giờ ($0 \\le t \\le 12$) và thời điểm hệ thống bắt đầu hoạt động ứng với $t = 0$. Biết rằng $F(0) = 0$. Tốc độ lưu trữ năng lượng điện ($\\text{kW}$) của hệ thống này là hàm số $f(t) = F'(t)$ với $0 \\le t \\le 12$. Số liệu ghi nhận được ở một ngày cụ thể trong năm cho thấy $f(t) = -0,3t^2 + 3,6t$ với $0 \\le t \\le 12$.
a) $F(t) = -0,1t^3 + 1,8t^2$ với $0 \\le t \\le 12$.
b) Năng lượng điện ($\\text{kWh}$) lưu trữ được kể từ thời điểm $t = a$ đến thời điểm $t = b$ ($0 \\le a < b \\le 12$) là $\\int_a^b f(t)\\,dt$.
c) Năng lượng điện lưu trữ được kể từ thời điểm $t = 1$ đến thời điểm $t = 4$ nhỏ hơn $20,6\\text{ kWh}$.
d) Năng lượng điện lưu trữ được kể từ thời điểm $t = 1$ đến thời điểm $t = 7$ gấp hai lần năng lượng điện lưu trữ được kể từ thời điểm $t = 1$ đến thời điểm $t = 4$.

Câu 4. Trong không gian xét hệ tọa độ $Oxyz$ có một đơn vị dài trên các trục tương ứng với $10$ mét trên thực tế. Một mục tiêu cần được bảo vệ có vị trí ở gốc tọa độ $O$. Người ta thiết lập một vành đai bảo vệ quanh mục tiêu theo một đường tròn tâm $O$ có bán kính bằng $7$ đơn vị (tương ứng $70$ mét trên thực tế) nằm trong mặt phẳng $(Oxy)$. Một máy bay không người lái (được coi như một hạt) bay theo một đường thẳng từ vị trí $M(5; 10; 4)$ đến vị trí $N(14; -2; 4)$. Tại mỗi vị trí của máy bay, khoảng cách từ máy bay đến vành đai bảo vệ là độ dài ngắn nhất của các đoạn thẳng nối từ vị trí đó đến một điểm bất kì trên vành đai.
a) $\\overrightarrow{MN} = (9; -12; 0)$.
b) Phương trình tham số của đường thẳng $MN$ là $\\begin{cases} x = 5 + 3t \\\\ y = 10 - 4t \\\\ z = 0 \\end{cases}$ với $t \\in \\mathbb{R}$.
c) Trong quá trình bay từ $M$ đến $N$, khoảng cách ngắn nhất từ máy bay đến vành đai bảo vệ là $50$ mét.
d) Trong quá trình bay từ $M$ đến $N$, khoảng cách từ máy bay đến vành đai bảo vệ là ngắn nhất khi máy bay ở vị trí có tọa độ là $(8; 6; 4)$.

PHẦN III (3,0 điểm): Thí sinh trả lời từ câu 1 đến câu 6.
Câu 1. Cho hình lập phương $ABCD.MNPQ$ có cạnh bằng $6$. Gọi $E$ là trung điểm của đoạn thẳng $AB$. Khoảng cách từ điểm $P$ đến mặt phẳng $(MED)$ bằng bao nhiêu *(không làm tròn kết quả các phép tính trung gian, chỉ làm tròn kết quả cuối cùng đến hàng phần trăm)*?
Câu 2. Trong một trò chơi bạn Bình cần vượt qua một thử thách. Theo yêu cầu của thử thách, Bình cần điền tất cả $15$ số thuộc tập hợp $\\{0; 1; 2; 3; 4; 5; 6; 7; 8; 10; 11; 12; 15; 16; 20\\}$ vào $15$ ô vuông trong bảng hình bậc thang (5 hàng, 5 cột: Hàng 1 có 5 ô, Hàng 2 có 4 ô, ..., Hàng 5 có 1 ô) thỏa mãn đồng thời ba điều kiện sau:
- Mỗi ô điền đúng một số và mỗi số chỉ được sử dụng một lần;
- Hiệu hai số ở hai ô bất kì khác nhau trên cùng một hàng không chia hết cho $5$;
- Hiệu hai số ở hai ô bất kì khác nhau trên cùng một cột không chia hết cho $5$.
Hai cách điền gọi là giống nhau nếu số điền ở mỗi ô tương ứng trong $15$ ô là giống nhau (không tính đến thứ tự điền các số vào $15$ ô vuông). Gọi $H$ là số cách điền khác nhau để bạn Bình vượt qua được thử thách. Giá trị của $\\frac{H}{30}$ bằng bao nhiêu?
Câu 3. Để chế tác một hạt cườm, người ta lấy một khối vật thể có dạng một khối tròn xoay được tạo thành khi quay hình phẳng giới hạn bởi trục $Ox$ và nửa trên của elip $\\frac{x^2}{1,5^2} + \\frac{y^2}{1^2} = 1$ (một đơn vị dài trên mỗi trục tọa độ tương ứng với một xăng-ti-mét trong thực tế) quanh trục $Ox$; sau đó khoan dọc theo trục xoay (như hình vẽ minh họa elip và mũi khoan trụ bán kính $0,2\\text{ cm}$ dọc trục $Ox$). Lỗ khoan có dạng hình trụ với bán kính $0,2\\text{ cm}$ và có trục nằm trên trục xoay. Phần còn lại sau khi khoan là hạt cườm, có dạng một khối tròn xoay. Thể tích của hạt cườm đó bằng bao nhiêu xăng-ti-mét khối *(không làm tròn kết quả các phép tính trung gian, chỉ làm tròn kết quả cuối cùng đến hàng phần trăm)*?
Câu 4. Một khung hình trang trí có dạng một đa giác đều $12$ cạnh $A_1 A_2 \\dots A_{12}$ (có hình vẽ minh họa đa giác đều 12 đỉnh) được gắn cố định trên một trần nhà. Bạn Dũng có $12$ bóng đèn gồm bốn bóng màu đỏ và tám bóng màu xanh, có công suất đôi một khác nhau. Bạn Dũng lắp ngẫu nhiên $12$ bóng đèn trên vào $12$ đỉnh $A_1, A_2, \\dots, A_{12}$ sao cho mỗi đỉnh có đúng một bóng đèn. Gọi $P$ là xác suất để mỗi hình vuông (có bốn đỉnh là các đỉnh của đa giác đã cho) đều có ít nhất một bóng đèn màu đỏ. Giá trị của $3190P$ bằng bao nhiêu?
Câu 5. Một nông trại cung cấp rau quả cho siêu thị $A$ với số liệu bán hàng của bốn ngày trong tuần được ghi lại trong bảng sau:
| Ngày | Rau muống (kg) | Bí xanh (kg) | Cà chua (kg) | Tổng số tiền (nghìn đồng) |
| :--- | :---: | :---: | :---: | :---: |
| Thứ Tư | $19$ | $14$ | $10$ | $600$ |
| Thứ Năm | $20$ | $12$ | $8$ | $540$ |
| Thứ Sáu | $25$ | $12$ | $7$ | $570$ |
| Thứ Bảy | $50$ | $25$ | $20$ | $?$ |
Biết rằng đơn giá theo ki-lô-gam của mỗi loại rau quả trong bảng trên là không đổi. Tổng số tiền nông trại thu được ở ngày thứ Bảy từ ba loại rau quả trên khi cung cấp cho siêu thị $A$ là bao nhiêu nghìn đồng?
Câu 6. Một công ty nông sản có công suất chế biến không quá $200$ tấn nguyên liệu một tháng. Nếu công ty chế biến $x$ tấn nguyên liệu trong một tháng ($1 \\le x \\le 200$) thì chi phí sản xuất và doanh thu lần lượt là $C(x) = 0,001x^3 + 30x + 10$ (triệu đồng) và $R(x) = 60x$ (triệu đồng). Lợi nhuận lớn nhất mà công ty đạt được trong một tháng là bao nhiêu triệu đồng?`
  },
  {
    id: "gifted_student",
    shortTitle: "4. Đề Học sinh giỏi (THCS / THPT)",
    fullTitle: "Đề Thi Chọn Học sinh giỏi THPT Cấp Thành phố - Sở GD&ĐT TP Huế (Thang 20đ)",
    badge: "Đề HSG 20đ",
    description:
      "Mẫu Đề chính thức Kỳ thi chọn HSG THPT TP Huế 2026-2027 (150 phút, thang 20,0 điểm): A. Trắc nghiệm khách quan (10,0đ: 12 ABCD + 4 Đúng/Sai + 6 Trả lời ngắn phân hóa cao) + B. Tự luận (10,0đ: 5 câu chứng minh & tối ưu chuyên sâu).",
    standardsNote: "150 phút | Thang 20,0 | TN 10đ (12+4+6) + TL 10đ (5 câu)",
    defaultDuration: "150 phút",
    defaultTotalPoints: 20,
    defaultSchoolName: "SỞ GIÁO DỤC VÀ ĐÀO TẠO",
    defaultSchoolSubName: "THÀNH PHỐ HUẾ - THI CHỌN HSG THPT",
    defaultExamCode: "1252",
    sampleBlueprint: GIFTED_STUDENT_BLUEPRINT,
    sampleMatrixMarkdown: GIFTED_STUDENT_MATRIX_MD,
    sampleSourceExamText: `SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HUẾ
KỲ THI CHỌN HỌC SINH GIỎI THPT CẤP THÀNH PHỐ NĂM HỌC 2026-2027
MÔN: TOÁN (PHỔ THÔNG) | Thời gian: 150 phút (không kể thời gian giao đề) | Mã đề thi: 1252
Thang điểm: 20,0 điểm (A. Trắc nghiệm khách quan 10,0 điểm + B. Tự luận 10,0 điểm)

A. TRẮC NGHIỆM KHÁCH QUAN (10,0 điểm)
PHẦN I (3,0 điểm). Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu 12.
Câu 1. Tính giới hạn $L = \\lim_{x \\to 3} \\frac{x^2 - 9}{x^2 - 4x + 3}$.
A. $L = 0$.   B. $L = 1$.   C. $L = 3$.   D. $L = 6$.
Câu 2. Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$, $AB = a$, $BC = a\\sqrt{3}$. Cạnh bên $SA \\perp (ABC)$ và $SA = 2a$. Thể tích khối chóp $S.ABC$ bằng:
A. $\\frac{a^3\\sqrt{3}}{3}$.   B. $\\frac{a^3\\sqrt{3}}{6}$.   C. $a^3\\sqrt{3}$.   D. $\\frac{2a^3\\sqrt{3}}{3}$.
Câu 3. Đạo hàm của hàm số $y = \\ln(x^2 + 1)$ là:
A. $y' = \\frac{x}{x^2 + 1}$.   B. $y' = \\frac{1}{x^2 + 1}$.   C. $y' = \\frac{2x\\cdot\\ln(x^2 + 1)}{x^2 + 1}$.   D. $y' = \\frac{2x}{x^2 + 1}$.
Câu 4. Trong không gian $Oxy$, cho hai điểm $A(1; 2)$ và $B(3; 0)$. Tọa độ trung điểm $I$ của đoạn thẳng $AB$ là:
A. $(2; 2)$.   B. $(2; 1)$.   C. $(4; 2)$.   D. $(1; -1)$.
Câu 5. Tập nghiệm $S$ của bất phương trình $\\log_{0,5}(2x - 1) \\ge -1$ là:
A. $S = \\left(\\frac{1}{2}; +\\infty\\right)$.   B. $S = \\left[\\frac{3}{2}; +\\infty\\right)$.   C. $S = \\left(\\frac{1}{2}; \\frac{3}{2}\\right]$.   D. $S = \\left(-\\infty; \\frac{3}{2}\\right]$.
Câu 6. Tiệm cận ngang của đồ thị hàm số $y = \\frac{2x - 5}{3 - x}$ là đường thẳng có phương trình:
A. $y = -2$.   B. $y = -\\frac{5}{3}$.   C. $x = 3$.   D. $y = 2$.
Câu 7. Số nghiệm của phương trình $\\sin 2x = \\frac{\\sqrt{3}}{2}$ thuộc khoảng $(0; \\pi)$ là:
A. $3$.   B. $4$.   C. $2$.   D. $1$.
Câu 8. Số điểm cực trị của đồ thị hàm số $y = x^3 + 3$ là:
A. $0$.   B. $1$.   C. $3$.   D. $2$.
Câu 9. Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1 = 3$ và công bội $q = -2$. Số hạng tổng quát $u_n$ ($n \\in \\mathbb{N}^*$) được tính bởi công thức nào sau đây?
A. $u_n = 3\\cdot(-2)^{n-1}$.   B. $u_n = -6^n$.   C. $u_n = 3 - 2n$.   D. $u_n = 3\\cdot 2^{n-1}$.
Câu 10. Chọn ngẫu nhiên $3$ học sinh từ một nhóm gồm $5$ học sinh nam và $4$ học sinh nữ. Tính xác suất để chọn được ít nhất $1$ học sinh nữ.
A. $\\frac{5}{42}$.   B. $\\frac{37}{42}$.   C. $\\frac{10}{21}$.   D. $\\frac{1}{2}$.
Câu 11. Giá trị lớn nhất của hàm số $f(x) = x^3 - 3x + 5$ trên đoạn $[0; 2]$ bằng.
A. $3$.   B. $7$.   C. $8$.   D. $5$.
Câu 12. Khảo sát thời gian tập thể dục của một số học sinh khối 12 thu được mẫu số liệu ghép nhóm sau:
| Thời gian (phút) | $[0; 20)$ | $[20; 40)$ | $[40; 60)$ | $[60; 80)$ | $[80; 100)$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Số học sinh | $5$ | $8$ | $11$ | $10$ | $6$ |
Trung bình mỗi học sinh tập bao nhiêu phút mỗi ngày?
A. $75$.   B. $57$.   C. $52$.   D. $60$.

PHẦN II (4,0 điểm). Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 1 đến câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
Câu 1. Một doanh nghiệp kinh doanh một loại sản phẩm $T$ được sản xuất trong nước. Qua nghiên cứu cho thấy rằng nếu chi phí sản xuất mỗi sản phẩm $T$ là $x$ (nghìn đồng) ($3000 < x < 5000$) thì số sản phẩm mà doanh nghiệp sản xuất sẽ là $R(x) = x - 500$ và số sản phẩm mà doanh nghiệp bán trên thị trường trong nước sẽ là $Q(x) = 5500 - x$. Số sản phẩm còn lại, doanh nghiệp xuất khẩu ra thị trường quốc tế với giá bán mỗi sản phẩm ổn định trên thị trường quốc tế là $x_0 = 5000$ (nghìn đồng). Nhà nước đánh thuế trên mỗi sản phẩm xuất khẩu là $y$ (nghìn đồng) sao cho trên mỗi đơn vị sản phẩm xuất khẩu, tiền lãi luôn gấp $4$ lần tiền thuế của nhà nước.
a) Số sản phẩm xuất khẩu tính theo $x$ là $E(x) = 2x - 6000$ (sản phẩm).
b) Thuế của mỗi sản phẩm xuất khẩu tính theo $x$ là $y = \\frac{5000 - x}{5}$ (nghìn đồng).
c) Khi doanh nghiệp thu được lãi từ xuất khẩu lớn nhất thì chi phí sản xuất mỗi sản phẩm $T$ là $x = 3500$ (nghìn đồng).
d) Lãi mà doanh nghiệp thu được từ xuất khẩu lớn nhất là $1\\,600\\,000$ (nghìn đồng).

Câu 2. Cho hàm số $f(x) = \\frac{ax + b}{cx + d}$ với $a, b, c, d \\in \\mathbb{R}$. Biết giá trị lớn nhất của hàm số $y = f(x)$ trên đoạn $[0; 2]$ bằng $1$. Đồ thị hàm số $y = f'(x)$ (như hình vẽ đồ thị hai nhánh nằm phía trên $Ox$, tiệm cận đứng $x = -1$ và đi qua điểm $(0; 3)$).
a) Hàm số $y = f(x)$ đồng biến trên khoảng $(-1; +\\infty)$.
b) $f(0) = 1$.
c) Đồ thị hàm số $y = f(x)$ có tiệm cận ngang là đường thẳng $y = 2$.
d) Số điểm có tọa độ nguyên thuộc đồ thị hàm số $y = f(x)$ là $6$.

Câu 3. Cho hình chóp $S.ABCD$ có $SA \\perp (ABCD)$ và đáy $ABCD$ là hình thoi tâm $O$, cạnh $AB = 2$, $AC = 2$, $SA = 1$. Gọi $M$ là trung điểm của $SD$.
a) Diện tích hình thoi $ABCD$ bằng $2\\sqrt{3}$.
b) Góc giữa hai đường thẳng $SO$ và $BD$ bằng $90^\\circ$.
c) Diện tích tam giác $MAC$ bằng $\\frac{3}{4}$.
d) Góc nhị diện $[M, AC, D]$ bằng $60^\\circ$.

Câu 4. Một con rô bốt hút bụi thông minh tự động di chuyển giữa $3$ vị trí được đánh số $A, B, C$ trong một phòng trưng bày, nếu đang ở vị trí này thì sau đúng $1$ phút, nó sẽ ở vị trí khác, theo quy tắc xác suất sau:
- Nếu đang ở vị trí $A$, rô bốt sẽ sang vị trí $B$ hoặc vị trí $C$ với xác suất đều bằng $0,5$.
- Nếu đang ở vị trí $B$, xác suất sang vị trí $A$ là $0,6$ và sang vị trí $C$ là $0,4$.
- Nếu đang ở vị trí $C$, xác suất sang vị trí $A$ là $0,8$ và sang vị trí $B$ là $0,2$.
Ban đầu, tại thời điểm ban đầu $t = 0$ (phút), rô bốt đang ở vị trí $A$.
a) Xác suất để rô bốt ở vị trí $A$ tại thời điểm $t = 1$ (phút) là $p_1 = 0$.
b) Xác suất để rô bốt ở vị trí $A$ tại thời điểm $t = 2$ (phút) là $p_2 = 0,7$.
c) Tại thời điểm $t = 3$ (phút), trong các vị trí $A, B, C$ thì xác suất rô bốt ở vị trí $A$ là lớn nhất.
d) Xác suất để rô bốt trở lại vị trí $A$ lần đầu tiên tại thời điểm $t = 5$ (phút) là $p_5 = 0,0176$.

PHẦN III (3,0 điểm). Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 1 đến câu 6.
Câu 1. Một nhóm gồm $9$ bạn học sinh, trong đó có Trí và Lan. Các bạn cùng chơi trò chơi tàu lượn siêu tốc gồm $3$ toa nối tiếp nhau: Toa 1, Toa 2 và Toa 3. Biết mỗi toa phải có ít nhất $1$ người, gọi $p$ là xác suất để Toa 1 chỉ có đúng $2$ người là Trí và Lan, tính giá trị $42p$.
Câu 2. Trong một hệ thống trí tuệ nhân tạo (AI) dùng camera để nhận diện vật thể, camera được gắn trên một mô-tơ có thể quay liên tục. Khi camera quay quanh vật thể, góc nhìn thay đổi, làm cho chất lượng các đặc trưng hình ảnh mà hệ thống thu nhận cũng thay đổi. Hệ thống sử dụng hai thuật toán nhận diện độc lập. Với mỗi góc quay $x$ (đơn vị radian), $0 \\le x \\le 8\\pi$, mỗi thuật toán đưa ra một chỉ số tin cậy cho kết quả nhận diện. Qua quá trình thử nghiệm, các kỹ sư mô hình hóa hai chỉ số tin cậy này lần lượt bởi các hàm số $f(x) = 1 + \\sin^2 x$ và $g(x) = 1 + \\cos^2 x$. Để đánh giá mức độ phối hợp của hai thuật toán, hệ thống sử dụng một chỉ số kết hợp là $H(x) = \\log_4 f(x)\\cdot\\log_4 g(x)$. Gọi $H_0 = \\log_4 \\frac{3}{2}$ và hệ thống đạt trạng thái phối hợp tối ưu khi $\\sqrt{H(x)} = H_0$. Gọi $S$ tổng tất cả các góc quay $x \\in [0; 8\\pi]$ tại đó hệ thống đạt trạng thái phối hợp tối ưu, tính $\\frac{20S}{\\pi}$.
Câu 3. Một số có $12$ chữ số được gọi là số thú vị nếu các chữ số của nó bé hơn $9$ và khi tăng mỗi chữ số lên tối đa một đơn vị (mỗi chữ số có thể không tăng hoặc tăng thêm một đơn vị) thì ta được một số mới khác số ban đầu và chia hết cho số ban đầu. Hỏi có bao nhiêu số thú vị?
Câu 4. Cho hình lăng trụ đứng $ABCD.A'B'C'D'$ có đáy $ABCD$ là hình thang cân, $AD$ song song $BC$, $AB = BC = CD = 7\\sqrt{6}$, $AD = 14\\sqrt{6}$. Góc giữa mặt phẳng $(A'CD)$ và $(ABCD)$ bằng $45^\\circ$. Tính khoảng cách từ $B$ đến mặt phẳng $(A'CD)$.
Câu 5. Biết hàm số bậc $y = ax^3 + bx^2 + cx + d$ có bảng biến thiên như sau:
| $x$ | $-\\infty$ | | $-1$ | | $4$ | | $+\\infty$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ | |
| $y$ | $-\\infty$ | $\\nearrow$ | $10$ | $\\searrow$ | $-22$ | $\\nearrow$ | $+\\infty$ |
Biết rằng đồ thị hàm số trên cắt trục hoành tại ba điểm phân biệt có hoành độ lần lượt là $x_1, x_2, x_3$. Tính giá trị của $S = \\frac{x_1 + x_2 + x_3}{2}$.
Câu 6. Cho bảng vuông gồm $5 \\times 5$ ô vuông con, mỗi ô được điền một số sao cho trên mỗi hàng tính từ trái qua các số theo thứ tự là các số hạng liên tiếp của một cấp số cộng, các số trên mỗi cột tính từ trên xuống theo thứ tự cũng là các số hạng liên tiếp của một cấp số cộng. Do sơ suất nên trên bảng vuông chỉ còn xuất hiện một số số như bảng sau (ô $(1;2)=15$, ô $(2;5)=30$, ô $(3;3)=14$, ô $(5;1)=0$, ô $(5;5)=x$):
| | Cột 1 | Cột 2 | Cột 3 | Cột 4 | Cột 5 |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Hàng 1** | | $15$ | | | |
| **Hàng 2** | | | | | $30$ |
| **Hàng 3** | | | $14$ | | |
| **Hàng 4** | | | | | |
| **Hàng 5** | $0$ | | | | $x$ |
Gọi $x$ là số được điền vào ô $(5;5)$ của bảng, tính giá trị của $10x^2$.

B. TỰ LUẬN (10,0 điểm)
Câu 1 (2,0 điểm). Sau $t$ tuần kể từ khi thả $5000$ con cá giống vào ao, khối lượng trung bình mỗi con cá được cho bởi công thức: $w(t) = \\frac{4 + t - 0,02t^2}{100}$ (kg), ($0 \\le t \\le 15$). Do tỉ lệ hao hụt tự nhiên, số lượng cá còn sống trong ao sau $t$ tuần là: $P(t) = \\frac{5000}{t + 10}$ (con), ($0 \\le t \\le 15$). Sản lượng cá $y(t)$ thu được sau $t$ tuần là tổng khối lượng cá còn sống trong ao. Hỏi sau bao nhiêu tuần thì sản lượng cá thu hoạch được đạt giá trị lớn nhất?
Câu 2 (2,0 điểm).
a) Trong mặt phẳng tọa độ $Oxy$, gọi $A, B$ là hai điểm phân biệt thuộc đồ thị của hàm số $y = 1 + \\log_3(x - 1)$ sao cho $A$ là trung điểm $OB$. Tính độ dài đoạn thẳng $AB$.
b) Tìm các số thực dương $a, b, c$ sao cho $a \\ne 1$ và thỏa mãn đồng thời các đẳng thức sau:
$$b + \\log_2 a = 0, \\qquad \\log_a b = \\frac{1}{c}, \\qquad \\log_2\\left(\\frac{b}{c}\\right) = c - b.$$
Câu 3 (2,0 điểm). Gọi $A$ là tập hợp tất cả các số tự nhiên có $5$ chữ số. Chọn ngẫu nhiên một số từ tập $A$, tính xác suất để chọn được một số chia hết cho $17$ và có chữ số hàng đơn vị bằng $3$.
Câu 4 (2,0 điểm). Cho hàm số $y = \\frac{1}{x}$ có đồ thị là $(C_1)$ và hàm số $y = \\frac{4}{x}$ có đồ thị là $(C_2)$.
a) Gọi $A$ là điểm thuộc đồ thị $(C_1)$ có hoành độ bằng $1$. Xác định tọa độ điểm $B$ thuộc đồ thị hàm số $(C_2)$ sao cho $AB$ đạt giá trị nhỏ nhất.
b) Lấy $M$ là điểm bất kỳ thuộc đồ thị $(C_1)$ có hoành độ là $a$ ($a > 1$), gọi $N$ thuộc đồ thị hàm số $(C_2)$ sao cho $MN$ đạt giá trị nhỏ nhất. Chứng minh rằng $MN < AB$.
Câu 5 (2,0 điểm). Một khối gỗ đặc có dạng hình chóp $S.ABCD$ với đáy $ABCD$ là hình chữ nhật, mặt bên $SAB$ là tam giác vuông cân có cạnh huyền bằng $2a$ và nằm trong mặt phẳng vuông góc với mặt đáy, đồng thời tam giác $SCD$ là tam giác đều.
a) Tính độ dài cạnh $AD$ theo $a$.
b) Người ta muốn nối một sợi dây nằm trên bề mặt của khối gỗ từ trọng tâm tam giác $SAB$ đến trọng tâm tam giác $SCD$. Tính độ dài ngắn nhất của sợi dây theo $a$.`
  }
];

export const DEFAULT_ISOMORPHIC_BLUEPRINT: ExamBlueprint = PERIODIC_7991_BLUEPRINT;

export const DEFAULT_ISOMORPHIC_MATRIX_MARKDOWN: string = PERIODIC_7991_MATRIX_MD;

export const DEFAULT_ISOMORPHIC_EXAM_MARKDOWN = `**TRƯỜNG THPT NGUYỄN HUỆ** | **KIỂM TRA GIỮA KỲ I (ĐỀ ĐẲNG CẤU)**
:---: | :---:
**TỔ TOÁN** | **Môn: TOÁN – Lớp 11**
*(Đề thi có $04$ phần)* | *Thời gian làm bài: $90$ phút (không kể thời gian phát đề)*
**Mã đề: 1002** | **Họ và tên thí sinh:** ....................................... **SBD:** ............

*Gợi ý: Bạn đang xem bản xem trước Đề đẳng cấu mẫu của chế độ "1. Đề Kiểm tra định kỳ (CV 7991)". Hãy bấm nút **"Chạy Trọn Bộ 2 Giai Đoạn"** hoặc **"Chạy GĐ 2 từ Blueprint hiện tại"** để AI sinh đề đẳng cấu mới 100% từ đề gốc đang chọn (hoặc tải file PDF/Word/Ảnh đề thi của bạn lên để AI bám sát 100% đề gốc & yêu cầu).*

### PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN ($3,0$ điểm)
*Thí sinh trả lời từ Câu 1 đến Câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án.*

**Câu 1.** Tập xác định của hàm số $y = \\cot x$ là
A. $\\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + k\\pi \\mid k \\in \\mathbb{Z}\\right\\}$.
B. $\\mathbb{R} \\setminus \\{k\\pi \\mid k \\in \\mathbb{Z}\\}$.
C. $\\mathbb{R}$.
D. $\\mathbb{R} \\setminus \\{2k\\pi \\mid k \\in \\mathbb{Z}\\}$.

**Câu 2.** Cho dãy số $(u_n)$ xác định bởi $u_n = 4n - 3$, với $n \\ge 1$. Giá trị của $u_6$ bằng
A. $21$.   B. $25$.   C. $19$.   D. $24$.

**Câu 3.** Giá trị của $\\cos\\frac{2\\pi}{3}$ bằng
A. $\\frac{1}{2}$.   B. $\\frac{\\sqrt{3}}{2}$.   C. $-\\frac{1}{2}$.   D. $-\\frac{\\sqrt{3}}{2}$.

**Câu 4.** Cho cấp số cộng $(u_n)$ có $u_1 = 5$ và công sai $d = 4$. Số hạng $u_9$ bằng
A. $41$.   B. $37$.   C. $33$.   D. $36$.

**Câu 5.** Nghiệm của phương trình $\\cos x = -\\frac{\\sqrt{2}}{2}$ là
A. $x = \\pm\\frac{3\\pi}{4} + k2\\pi$ ($k \\in \\mathbb{Z}$).
B. $x = \\pm\\frac{\\pi}{4} + k2\\pi$ ($k \\in \\mathbb{Z}$).
C. $x = \\frac{3\\pi}{4} + k\\pi$ ($k \\in \\mathbb{Z}$).
D. $x = \\pm\\frac{3\\pi}{4} + k\\pi$ ($k \\in \\mathbb{Z}$).

**Câu 6.** Cho cấp số nhân $(u_n)$ có $u_1 = 3$ và công bội $q = -2$. Giá trị của $u_5$ là
A. $-48$.   B. $48$.   C. $24$.   D. $-24$.

**Câu 7.** Chu kì của hàm số $y = \\cos 4x$ là
A. $\\frac{\\pi}{2}$.   B. $2\\pi$.   C. $\\pi$.   D. $\\frac{\\pi}{4}$.

**Câu 8.** Trong điều kiện nuôi cấy tiêu chuẩn, một tế bào vi khuẩn cứ $30$ phút lại phân đôi một lần. Giả sử ban đầu có $50$ tế bào được cấy vào môi trường. Hỏi sau $3$ giờ, quần thể vi khuẩn đạt số lượng là bao nhiêu?
A. $1600$.   B. $3200$.   C. $6400$.   D. $800$.

**Câu 9.** Góc có số đo $\\frac{7\\pi}{6}$ radian tương ứng với số đo bao nhiêu độ?
A. $150^\\circ$.   B. $210^\\circ$.   C. $240^\\circ$.   D. $120^\\circ$.

**Câu 10.** Công thức nào sau đây đúng với mọi số thực $a, b$?
A. $\\sin(a - b) = \\sin a\\cos b - \\cos a\\sin b$.
B. $\\sin(a - b) = \\sin a\\cos b + \\cos a\\sin b$.
C. $\\sin(a - b) = \\cos a\\cos b - \\sin a\\sin b$.
D. $\\sin(a - b) = \\cos a\\cos b + \\sin a\\sin b$.

**Câu 11.** Bảng sau cho biết kết quả khảo sát của $20$ học sinh về thời gian đọc sách mỗi ngày:
| Thời gian (phút) | $[0; 20)$ | $[20; 40)$ | $[40; 60)$ |
| :--- | :---: | :---: | :---: |
| Số học sinh | $4$ | $10$ | $6$ |
Số trung bình của mẫu số liệu ghép nhóm trên bằng
A. $30$.   B. $32$.   C. $28$.   D. $34$.

**Câu 12.** Cho một mẫu số liệu ghép nhóm, trong đó có nhóm $[40; 60)$. Giá trị đại diện của nhóm này là
A. $40$.   B. $60$.   C. $50$.   D. $20$.

### PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG / SAI ($2,0$ điểm)
*Thí sinh trả lời Câu 1 và Câu 2. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai.*

**Câu 1.** Cho cấp số cộng $(u_n)$ thỏa mãn $\\begin{cases} u_3 - u_7 = 12 \\\\ u_2 + u_5 = 1 \\end{cases}$. Khi đó:
a) $d = -3$ là công sai của cấp số cộng.
b) $u_1 = 8$ là số hạng đầu của dãy số.
c) Công thức tổng quát của cấp số cộng là $u_n = 11 - 3n$.
d) Tổng $S = u_1 + u_2 + \\dots + u_{50} = -3275$.

**Câu 2.** Cho hàm số $f(x) = \\frac{1}{3}\\cos 2x$. Khi đó:
a) Tập xác định của hàm số là $D = \\mathbb{R}$.
b) Đồ thị hàm số nhận trục tung làm trục đối xứng.
c) Tập giá trị của hàm số là $\\left[-\\frac{1}{3}; \\frac{1}{3}\\right]$.
d) Hàm số nghịch biến trên khoảng $(0; \\pi)$.

### PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN ($2,0$ điểm)
*Thí sinh trả lời từ Câu 1 đến Câu 4.*

**Câu 1.** Biết tổng các nghiệm của phương trình $2\\cos\\left(x - \\frac{\\pi}{6}\\right) - \\sqrt{3} = 0$ trên đoạn $[0; 2\\pi]$ có dạng $\\frac{a\\pi}{b}$ (với $\\frac{a}{b}$ tối giản, $a, b \\in \\mathbb{N}^*$). Tính $P = a + 2b$.
**Câu 2.** Cho đường tròn bán kính $R = 4\\text{ cm}$. Tính độ dài cung tròn có số đo $\\frac{5\\pi}{6}$ của đường tròn đó *(làm tròn kết quả đến hàng phần trăm)*.
**Câu 3.** Bảng số liệu ghép nhóm sau cho biết cân nặng (kg) của $40$ học sinh lớp 11A:
| Cân nặng (kg) | $[40; 45)$ | $[45; 50)$ | $[50; 55)$ | $[55; 60)$ | $[60; 65)$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Số học sinh | $5$ | $10$ | $13$ | $8$ | $4$ |
Tứ phân vị thứ nhất của mẫu số liệu này là bao nhiêu *(làm tròn kết quả đến hàng phần mười)*?
**Câu 4.** Một công ty tuyển kỹ sư làm việc trong $3$ năm với hai phương án lương thưởng như sau:
- Phương án 1: Lương tháng khởi điểm $8$ triệu đồng và sau mỗi quý, lương tháng của quý tiếp theo tăng thêm $600$ nghìn đồng so với quý trước đó; cuối mỗi năm thưởng thêm $10\\%$ tổng tiền lương đã nhận trong năm đó.
- Phương án 2: Lương tháng khởi điểm $8$ triệu đồng và sau mỗi quý, lương tháng tăng thêm $6\\%$ so với quý trước đó; cuối mỗi năm thưởng cố định $10$ triệu đồng.
Tổng thu nhập sau $3$ năm làm việc của hai phương án chênh lệch nhau bao nhiêu triệu đồng *(làm tròn kết quả cuối cùng đến hàng phần mười)*?

### PHẦN IV. TỰ LUẬN ($3,0$ điểm)
**Bài 1 ($1,0$ điểm).** Giải phương trình lượng giác: $\\sin\\left(x - \\frac{\\pi}{6}\\right) = \\frac{1}{2}$.
**Bài 2 ($1,0$ điểm).** Cho góc $\\alpha$ thỏa mãn $\\frac{\\pi}{2} < \\alpha < \\pi$ và $\\sin\\alpha = \\frac{5}{13}$. Tính $\\sin\\left(\\alpha + \\frac{\\pi}{3}\\right)$.
**Bài 3 ($1,0$ điểm).** Một trang trại trồng cây ăn quả mới áp dụng mô hình tưới tiêu thông minh. Tháng đầu tiên trang trại thu hoạch được $256\\text{ kg}$ quả. Nhờ cải tiến kỹ thuật, sản lượng mỗi tháng sau tăng lên bằng $125\\%$ sản lượng của tháng liền trước trong suốt $6$ tháng đầu.
a) Tính sản lượng thu hoạch được trong tháng thứ $6$.
b) Chủ trang trại đặt mục tiêu tổng sản lượng trong $6$ tháng đầu đạt $3500\\text{ kg}$. Hỏi trang trại có đạt mục tiêu đề ra không? Giải thích.

--- HẾT ---`;

export const DEFAULT_ISOMORPHIC_GRADING_MARKDOWN = `## ĐÁP ÁN – HƯỚNG DẪN CHẤM – THANG ĐIỂM CHI TIẾT (MÃ ĐỀ 1002)

### 1. Bảng đáp án nhanh phần Trắc nghiệm ($7,0$ điểm)

| Phần thi | Đáp án chuẩn | Thang điểm |
| :--- | :--- | :--- |
| **Phần I (Nhiều lựa chọn)** | **C1:** B \\| **C2:** A \\| **C3:** C \\| **C4:** B \\| **C5:** A \\| **C6:** B \\| **C7:** A \\| **C8:** B \\| **C9:** B \\| **C10:** A \\| **C11:** B \\| **C12:** C | $3,0$ điểm ($0,25$đ/câu) |
| **Phần II (Đúng / Sai)** | • **Câu 1:** a) **Đúng** \\| b) **Đúng** \\| c) **Đúng** \\| d) **Đúng**<br/>• **Câu 2:** a) **Đúng** \\| b) **Đúng** \\| c) **Đúng** \\| d) **Sai** | $2,0$ điểm ($1,0$đ/câu) |
| **Phần III (Trả lời ngắn)** | **Câu 1:** $13$ \\| **Câu 2:** $10,47$ \\| **Câu 3:** $47,5$ \\| **Câu 4:** $12,7$ | $2,0$ điểm ($0,5$đ/câu) |

### 2. Giải thích chi tiết phần Trắc nghiệm
- **Phần I:** C1 (B: $\\sin x \\ne 0$); C2 (A: $u_6 = 4\\cdot 6 - 3 = 21$); C3 (C: $\\cos\\frac{2\\pi}{3} = -\\frac{1}{2}$); C4 (B: $u_9 = 5 + 8\\cdot 4 = 37$); C5 (A: $\\pm\\frac{3\\pi}{4} + k2\\pi$); C6 (B: $u_5 = 3\\cdot(-2)^4 = 48$); C7 (A: $T = \\frac{2\\pi}{4} = \\frac{\\pi}{2}$); C8 (B: $50\\cdot 2^6 = 3200$); C9 (B: $210^\\circ$); C10 (A); C11 (B: $\\bar{x} = \\frac{4\\cdot 10 + 10\\cdot 30 + 6\\cdot 50}{20} = 32$); C12 (C: $\\frac{40+60}{2} = 50$).
- **Phần II:**
  + **Câu 1:** Giải hệ $\\begin{cases} -4d = 12 \\\\ 2u_1 + 5d = 1 \\end{cases} \\Leftrightarrow \\begin{cases} d = -3 \\\\ u_1 = 8 \\end{cases}$. Do đó $u_n = 11 - 3n$ và $S_{50} = 25(16 + 49\\cdot(-3)) = -3275$ (cả 4 ý đều **Đúng**).
  + **Câu 2:** a) TXĐ $D = \\mathbb{R}$ (**Đúng**); b) $f(-x) = f(x)$ nên đồ thị nhận $Oy$ làm trục đối xứng (**Đúng**); c) $-1 \\le \\cos 2x \\le 1 \\Rightarrow f(x) \\in [-\\frac{1}{3}; \\frac{1}{3}]$ (**Đúng**); d) $f(\\frac{\\pi}{2}) = -\\frac{1}{3} < f(\\pi) = \\frac{1}{3}$ nên không nghịch biến trên $(0; \\pi)$ (**Sai**).
- **Phần III:**
  + **Câu 1:** $x = \\frac{\\pi}{3}$ và $x = 2\\pi \\Rightarrow \\sum x = \\frac{7\\pi}{3} \\Rightarrow P = 7 + 2\\cdot 3 = 13$ (chú ý tổng nghiệm $\\frac{7\\pi}{3}$).
  + **Câu 2:** $l = R\\alpha = 4\\cdot\\frac{5\\pi}{6} = \\frac{10\\pi}{3} \\approx 10,47\\text{ cm}$.
  + **Câu 3:** $\\frac{n}{4} = 10$, nhóm chứa $Q_1$ là $[45; 50)$ nên $Q_1 = 45 + \\frac{10 - 5}{10}\\cdot 5 = 47,5$.
  + **Câu 4:** Phương án 1: $3(8 + 8,6 + 9,2 + 9,8)\\cdot 1,1 + 3(10,4 + 11 + 11,6 + 12,2)\\cdot 1,1 + 3(12,8 + 13,4 + 14 + 14,6)\\cdot 1,1 = 447,48$ triệu đồng. Phương án 2: $3\\cdot 8\\cdot\\frac{1,06^{12} - 1}{0,06} + 30 = 434,80$ triệu đồng (Phương án 1 nhiều hơn khoảng $12,7$ triệu đồng).

### 3. Hướng dẫn chấm chi tiết phần Tự luận ($3,0$ điểm - Chuẩn bảng 3 cột)

| Câu / Ý | Nội dung lời giải chi tiết từng bước | Điểm |
| :---: | :--- | :---: |
| **Bài 1**<br/>*($1,0$ điểm)* | $\\sin\\left(x - \\frac{\\pi}{6}\\right) = \\frac{1}{2} \\Leftrightarrow \\sin\\left(x - \\frac{\\pi}{6}\\right) = \\sin\\frac{\\pi}{6}$ | $0,25$ |
| **Bài 1 (tiếp)** | $\\Leftrightarrow \\begin{cases} x - \\frac{\\pi}{6} = \\frac{\\pi}{6} + k2\\pi \\\\ x - \\frac{\\pi}{6} = \\pi - \\frac{\\pi}{6} + k2\\pi \\end{cases}$ ($k \\in \\mathbb{Z}$) | $0,50$ |
| **Bài 1 (tiếp)** | $\\Leftrightarrow x = \\frac{\\pi}{3} + k2\\pi$ hoặc $x = \\pi + k2\\pi$ ($k \\in \\mathbb{Z}$). | $0,25$ |
| **Bài 2**<br/>*($1,0$ điểm)* | Ta có $\\cos^2\\alpha = 1 - \\sin^2\\alpha = 1 - \\frac{25}{169} = \\frac{144}{169}$.<br/>Vì $\\frac{\\pi}{2} < \\alpha < \\pi$ nên $\\cos\\alpha < 0 \\Rightarrow \\cos\\alpha = -\\frac{12}{13}$. | $0,50$ |
| **Bài 2 (tiếp)** | $\\sin\\left(\\alpha + \\frac{\\pi}{3}\\right) = \\sin\\alpha\\cos\\frac{\\pi}{3} + \\cos\\alpha\\sin\\frac{\\pi}{3} = \\frac{5}{13}\\cdot\\frac{1}{2} - \\frac{12}{13}\\cdot\\frac{\\sqrt{3}}{2} = \\frac{5 - 12\\sqrt{3}}{26}$. | $0,50$ |
| **Bài 3a**<br/>*($0,5$ điểm)* | Sản lượng mỗi tháng lập thành cấp số nhân với $u_1 = 256, q = 1,25 = \\frac{5}{4}$.<br/>Tháng thứ $6$: $u_6 = u_1 q^5 = 256\\cdot\\left(\\frac{5}{4}\\right)^5 = 256\\cdot\\frac{3125}{1024} = \\frac{3125}{4} = 781,25\\text{ kg}$. | $0,50$ |
| **Bài 3b**<br/>*($0,5$ điểm)* | Tổng sản lượng $6$ tháng đầu: $S_6 = \\frac{256(1,25^6 - 1)}{1,25 - 1} = 1024\\left(\\frac{15625}{4096} - 1\\right) = 2882,25\\text{ kg}$.<br/>Vì $2882,25 < 3500$ nên trang trại chưa đạt mục tiêu. | $0,50$ |`;
