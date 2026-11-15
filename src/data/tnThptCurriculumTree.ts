export type MaterialTypeId =
  | "chuyen_de"
  | "giao_an_5512"
  | "de_luyen_tap";

export type DifficultyLevelId = "co_ban_6_7" | "kha_8_plus" | "vdc_9_10";

export interface CurriculumFormItem {
  id: string;
  label: string;
  levelTag: "NB-TH" | "TH-VD" | "VD" | "VD-VDC" | "VDC";
  description: string;
}

export interface CurriculumTopicNode {
  id: string;
  code: string;
  title: string;
  forms: CurriculumFormItem[];
}

export interface CurriculumGradeBlock {
  id: "grade_10" | "grade_11" | "grade_12";
  title: string;
  weightLabel: string;
  subtitle: string;
  topics: CurriculumTopicNode[];
}

export const DIFFICULTY_LEVELS: Array<{
  id: DifficultyLevelId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "co_ban_6_7",
    label: "Cơ bản 6–7 điểm",
    shortLabel: "6–7 điểm",
    description:
      "Tập trung nhận biết – thông hiểu nền tảng, nhận diện nhanh công thức, đồ thị, bảng biến thiên và các bài toán tính toán trực tiếp.",
  },
  {
    id: "kha_8_plus",
    label: "Khá 8+ điểm",
    shortLabel: "8+ điểm",
    description:
      "Cân bằng thông hiểu và vận dụng, bổ sung tham số $m$, bài toán thực tế chuẩn GDPT 2018 và câu Đúng/Sai phân hóa vừa sức.",
  },
  {
    id: "vdc_9_10",
    label: "Vận dụng cao 9–10 điểm",
    shortLabel: "9–10 điểm",
    description:
      "Chuyên sâu bài toán mô hình hóa thực tế (kinh tế, kỹ thuật, y tế, viễn thông, vật lý), cực trị không gian $Oxyz$, xác suất Bayes và quy hoạch tuyến tính nâng cao.",
  },
];

export const MATERIAL_TYPES: Array<{
  id: MaterialTypeId;
  title: string;
  subtitle: string;
  defaultCounts: { part1: number; part2: number; part3: number };
}> = [
  {
    id: "chuyen_de",
    title: "Tài liệu Chuyên đề Ôn tập",
    subtitle: "Lý thuyết trọng tâm · Mẹo CASIO · Ví dụ & Bài tập tự luyện",
    defaultCounts: { part1: 8, part2: 2, part3: 4 },
  },
  {
    id: "giao_an_5512",
    title: "Kế hoạch bài dạy Ôn thi (CV 5512)",
    subtitle: "4 hoạt động chuẩn Công văn 5512 · Phiếu học tập & Đáp án",
    defaultCounts: { part1: 6, part2: 2, part3: 3 },
  },
  {
    id: "de_luyen_tap",
    title: "Đề luyện tập theo Dạng bài (3 phần)",
    subtitle: "Phần I (ABCD) · Phần II (Đúng/Sai 4 ý) · Phần III (Trả lời ngắn)",
    defaultCounts: { part1: 12, part2: 4, part3: 6 },
  },
];

export const TN_THPT_CURRICULUM_TREE: CurriculumGradeBlock[] = [
  {
    id: "grade_10",
    title: "Khối Lớp 10",
    weightLabel: "~ 10%",
    subtitle: "Nền tảng, Quy hoạch tuyến tính & Tổ hợp – Xác suất cổ điển",
    topics: [
      {
        id: "cd_01",
        code: "Chuyên đề 01",
        title: "Hệ PT & Hệ BPT bậc nhất",
        forms: [
          {
            id: "cd01_d1",
            label: "Dạng 1: Nhận biết miền nghiệm Hệ BPT bậc nhất hai ẩn",
            levelTag: "NB-TH",
            description:
              "Xác định miền nghiệm trên mặt phẳng tọa độ $Oxy$, kiểm tra điểm thuộc miền nghiệm và đọc hệ BPT từ hình vẽ.",
          },
          {
            id: "cd01_d2",
            label: "Dạng 2: Bài toán tối ưu kinh tế - Quy hoạch tuyến tính",
            levelTag: "VDC",
            description:
              "Lập mô hình hàm mục tiêu $F(x; y) = ax + by$, tìm đỉnh đa giác miền nghiệm để tối đa hóa lợi nhuận hoặc tối thiểu hóa chi phí.",
          },
          {
            id: "cd01_d3",
            label: "Dạng 3: Ứng dụng Hệ PT bậc nhất ba ẩn vào thực tế",
            levelTag: "VD",
            description:
              "Thiết lập hệ 3 phương trình bậc nhất 3 ẩn $x, y, z$ cho bài toán phân bổ nguồn lực, pha chế, đầu tư tài chính.",
          },
        ],
      },
      {
        id: "cd_02",
        code: "Chuyên đề 02",
        title: "Đại số tổ hợp & Xác suất cổ điển",
        forms: [
          {
            id: "cd02_d1",
            label: "Dạng 1: Quy tắc đếm, Hoán vị - Chỉnh hợp - Tổ hợp cơ bản",
            levelTag: "NB-TH",
            description:
              "Phân biệt quy tắc cộng – nhân, tính $P_n, A_n^k, C_n^k$ và lập số tự nhiên, chọn đội hình.",
          },
          {
            id: "cd02_d2",
            label: "Dạng 2: Bài toán đếm trên lưới ô vuông (Tô màu, chia hết)",
            levelTag: "VDC",
            description:
              "Đếm hình chữ nhật, đường đi ngắn nhất, bài toán tô màu hàng/cột và chọn tập con thỏa điều kiện chia hết.",
          },
          {
            id: "cd02_d3",
            label: "Dạng 3: Xác suất cổ điển kết hợp đa giác / xếp quân cờ",
            levelTag: "VDC",
            description:
              "Tính xác suất $P(A) = \\frac{n(A)}{n(\\Omega)}$ gắn với tam giác, hình chữ nhật nội tiếp đa giác đều hoặc xếp vật thể trên bàn cờ.",
          },
        ],
      },
    ],
  },
  {
    id: "grade_11",
    title: "Khối Lớp 11",
    weightLabel: "~ 20%",
    subtitle: "Hàm số, Dãy số, Hình học không gian & Quy tắc xác suất",
    topics: [
      {
        id: "cd_03",
        code: "Chuyên đề 03",
        title: "Lượng giác, Mũ và Lôgarit",
        forms: [
          {
            id: "cd03_d1",
            label: "Dạng 1: Phương trình lượng giác cơ bản",
            levelTag: "NB-TH",
            description:
              "Giải phương trình $\\sin x = m$, $\\cos x = m$, $\\tan x = m$, $\\cot x = m$ và đếm nghiệm trên đoạn $[a; b]$.",
          },
          {
            id: "cd03_d2",
            label: "Dạng 2: Phương trình & Bất phương trình Mũ - Lôgarit cơ bản",
            levelTag: "NB-TH",
            description:
              "Đưa về cùng cơ số, đặt điều kiện xác định của lôgarit, ứng dụng bài toán lãi suất kép và phóng xạ.",
          },
        ],
      },
      {
        id: "cd_04",
        code: "Chuyên đề 04",
        title: "Dãy số, Cấp số cộng & Cấp số nhân",
        forms: [
          {
            id: "cd04_d1",
            label: "Dạng 1: Tìm số hạng, công sai, công bội & tổng $n$ số hạng",
            levelTag: "NB-TH",
            description:
              "Sử dụng công thức $u_n = u_1 + (n-1)d$, $u_n = u_1 q^{n-1}$ và tổng $S_n$ trong bài toán quy luật thực tế.",
          },
        ],
      },
      {
        id: "cd_05",
        code: "Chuyên đề 05",
        title: "Quan hệ vuông góc & Thể tích khối đa diện",
        forms: [
          {
            id: "cd05_d1",
            label: "Dạng 1: Chứng minh quan hệ vuông góc đường thẳng – mặt phẳng",
            levelTag: "NB-TH",
            description:
              "Xác định góc giữa đường thẳng và mặt phẳng, góc nhị diện $[P, d, Q]$ và chứng minh vuông góc.",
          },
          {
            id: "cd05_d2",
            label: "Dạng 2: Khoảng cách từ điểm đến mặt phẳng & 2 đường chéo nhau",
            levelTag: "TH-VD",
            description:
              "Dựng đoạn vuông góc chung, đổi điểm tính $d(M, (P))$ và tính khoảng cách hai đường thẳng chéo nhau.",
          },
          {
            id: "cd05_d3",
            label: "Dạng 3: Thể tích khối chóp, lăng trụ & Tứ diện gần đều",
            levelTag: "VD-VDC",
            description:
              "Tính thể tích $V = \\frac{1}{3}B \\cdot h$, tỉ số thể tích và thể tích tứ diện gần đều theo các cặp cạnh đối.",
          },
        ],
      },
      {
        id: "cd_06",
        code: "Chuyên đề 06",
        title: "Quy tắc tính xác suất",
        forms: [
          {
            id: "cd06_d1",
            label: "Dạng 1: Biến cố độc lập, biến cố hợp & Công thức nhân xác suất",
            levelTag: "NB-TH",
            description:
              "Vận dụng $P(A \\cup B) = P(A) + P(B) - P(AB)$ và $P(AB) = P(A)P(B)$ cho hai biến cố độc lập.",
          },
        ],
      },
    ],
  },
  {
    id: "grade_12",
    title: "Khối Lớp 12",
    weightLabel: "~ 70%",
    subtitle: "Giải tích 12, Hình học Oxyz, Thống kê & Xác suất có điều kiện",
    topics: [
      {
        id: "cd_07",
        code: "Chuyên đề 07",
        title: "Ứng dụng đạo hàm khảo sát hàm số",
        forms: [
          {
            id: "cd07_d1",
            label: "Dạng 1: Đơn điệu & Cực trị của hàm số",
            levelTag: "NB-TH",
            description:
              "Đọc khoảng đồng biến, nghịch biến và điểm cực đại/cực tiểu từ BBT, đồ thị $f(x)$ hoặc $f'(x)$.",
          },
          {
            id: "cd07_d2",
            label: "Dạng 2: Đường thẳng qua hai điểm cực trị hàm bậc 3",
            levelTag: "TH-VD",
            description:
              "Chia đa thức $y$ cho $y'$ tìm phương trình đường thẳng qua 2 cực trị và xử lý điều kiện tham số $m$.",
          },
          {
            id: "cd07_d3",
            label: "Dạng 3: Tiệm cận đứng, tiệm cận ngang & tiệm cận xiên",
            levelTag: "NB-TH",
            description:
              "Xác định tiệm cận hàm phân thức $\\frac{ax+b}{cx+d}$ và $\\frac{ax^2+bx+c}{mx+n}$, tâm đối xứng đồ thị.",
          },
          {
            id: "cd07_d4",
            label: "Dạng 4: Giá trị lớn nhất – Giá trị nhỏ nhất trên đoạn $[a; b]$",
            levelTag: "NB-TH",
            description:
              "Tìm $\\max_{[a;b]} f(x)$ và $\\min_{[a;b]} f(x)$ bằng đạo hàm và kiểm tra nhanh bằng Table CASIO.",
          },
          {
            id: "cd07_d5",
            label: "Dạng 5: Bài toán thực tế tối ưu doanh thu, chi phí, lợi nhuận",
            levelTag: "VD-VDC",
            description:
              "Mô hình hóa hàm mục tiêu 1 biến từ bối cảnh kinh tế, sản xuất, vận tải và tìm cực trị tối ưu.",
          },
        ],
      },
      {
        id: "cd_08",
        code: "Chuyên đề 08",
        title: "Nguyên hàm, Tích phân và Ứng dụng",
        forms: [
          {
            id: "cd08_d1",
            label: "Dạng 1: Bảng nguyên hàm & Tính chất tích phân",
            levelTag: "NB-TH",
            description:
              "Áp dụng công thức nguyên hàm cơ bản, tính chất cộng tính $\\int_a^c + \\int_c^b$ và kiểm tra tích phân.",
          },
          {
            id: "cd08_d2",
            label: "Dạng 2: Diện tích hình phẳng & Thể tích khối tròn xoay Elip/Đường tròn",
            levelTag: "VD-VDC",
            description:
              "Tính $S = \\int_a^b |f(x)-g(x)|dx$ và $V = \\pi \\int_a^b f^2(x)dx$ ứng dụng chế tạo vật thể elip, trống, bồn chứa.",
          },
          {
            id: "cd08_d3",
            label: "Dạng 3: Bài toán thực tế tích lũy năng lượng, lưu lượng nước, vận tốc",
            levelTag: "VD-VDC",
            description:
              "Tính quãng đường từ vận tốc $v(t)$, tổng lưu lượng nước, công suất tiêu thụ điện hoặc tốc độ tăng trưởng.",
          },
        ],
      },
      {
        id: "cd_09",
        code: "Chuyên đề 09",
        title: "Phương pháp tọa độ trong không gian Oxyz",
        forms: [
          {
            id: "cd09_d1",
            label: "Dạng 1: Vectơ & Tọa độ các phép toán trong không gian Oxyz",
            levelTag: "NB-TH",
            description:
              "Tính tổng, hiệu, tích vô hướng, tích có hướng $[\\vec{u}, \\vec{v}]$, góc và độ dài đoạn thẳng.",
          },
          {
            id: "cd09_d2",
            label: "Dạng 2: Phương trình mặt phẳng, đường thẳng & mặt cầu",
            levelTag: "NB-TH",
            description:
              "Xác định VTPT, VTCP, tâm – bán kính mặt cầu và vị trí tương đối giữa đường thẳng – mặt phẳng – mặt cầu.",
          },
          {
            id: "cd09_d3",
            label: "Dạng 3: Mô hình hóa Oxyz (phủ sóng, quỹ đạo chuyển động, cực trị)",
            levelTag: "VD-VDC",
            description:
              "Gắn hệ trục $Oxyz$ vào bài toán trạm phát sóng 5G, đường bay drone/máy bay, radar và cực trị khoảng cách.",
          },
        ],
      },
      {
        id: "cd_10",
        code: "Chuyên đề 10",
        title: "Thống kê mẫu số liệu ghép nhóm",
        forms: [
          {
            id: "cd10_d1",
            label: "Dạng 1: Số trung bình, Trung vị & Tứ phân vị $Q_1, Q_2, Q_3$",
            levelTag: "NB-TH",
            description:
              "Đọc bảng tần số ghép nhóm, tính số trung bình $\\bar{x}$ và công thức nội suy tứ phân vị $Q_k$.",
          },
          {
            id: "cd10_d2",
            label: "Dạng 2: Khoảng biến thiên, Khoảng tứ phân vị & Độ lệch chuẩn",
            levelTag: "TH-VD",
            description:
              "Tính $R$, $\\Delta_Q = Q_3 - Q_1$, phương sai $s^2$ và độ lệch chuẩn $s$ để đánh giá độ phân tán.",
          },
        ],
      },
      {
        id: "cd_11",
        code: "Chuyên đề 11",
        title: "Xác suất có điều kiện & Công thức Bayes",
        forms: [
          {
            id: "cd11_d1",
            label: "Dạng 1: Xác suất có điều kiện qua bảng tần số 2 chiều & sơ đồ cây",
            levelTag: "TH-VD",
            description:
              "Tính $P(A \\mid B) = \\frac{P(AB)}{P(B)}$ từ bảng thống kê hai chiều hoặc không gian mẫu thu gọn.",
          },
          {
            id: "cd11_d2",
            label: "Dạng 2: Công thức xác suất toàn phần & Công thức Bayes",
            levelTag: "VD-VDC",
            description:
              "Giải bài toán xét nghiệm y khoa, kiểm định sản phẩm lỗi nhà máy và phân loại thư rác bằng công thức Bayes.",
          },
        ],
      },
    ],
  },
];

export const ALL_FORM_ITEMS: Array<
  CurriculumFormItem & { gradeId: string; gradeTitle: string; topicId: string; topicTitle: string }
> = TN_THPT_CURRICULUM_TREE.flatMap((grade) =>
  grade.topics.flatMap((topic) =>
    topic.forms.map((form) => ({
      ...form,
      gradeId: grade.id,
      gradeTitle: grade.title,
      topicId: topic.id,
      topicTitle: `${topic.code}: ${topic.title}`,
    }))
  )
);

export const DEFAULT_SELECTED_FORM_IDS = [
  "cd07_d1",
  "cd07_d5",
  "cd09_d2",
  "cd09_d3",
];

export function getSamplePreviewMarkdown(materialType: MaterialTypeId): string {
  if (materialType === "giao_an_5512") {
    return `# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT (CÔNG VĂN 5512)

**Môn học:** Toán học 12 | **Chủ đề:** Ứng dụng đạo hàm & Không gian $Oxyz$ | **Mức độ:** Khá 8+ điểm

## I. MỤC TIÊU BÀI HỌC

1. **Kiến thức:** Hệ thống hóa điều kiện đơn điệu, cực trị của hàm số $y = f(x)$ và phương pháp mô hình hóa bài toán tối ưu lợi nhuận cũng như tọa độ không gian $Oxyz$.
2. **Năng lực:** Biết chuyển đổi ngữ cảnh thực tế sang hàm mục tiêu một biến hoặc hệ trục tọa độ $Oxyz$; sử dụng thành thạo CASIO fx-580VN X / fx-880BTG để kiểm tra cực trị và tích có hướng vectơ.
3. **Phẩm chất:** Rèn luyện tính cẩn thận trong làm tròn số ở câu hỏi trả lời ngắn và tư duy phản biện khi đánh giá các mệnh đề Đúng/Sai.

## II. TIẾN TRÌNH DẠY HỌC (4 HOẠT ĐỘNG CHUẨN CV 5512)

### Hoạt động 1: Khởi động (5 phút)
* **Mục tiêu:** Kích hoạt lại kỹ năng đọc bảng biến thiên và xác định nhanh vectơ pháp tuyến của mặt phẳng.
* **Nội dung:** Giáo viên trình chiếu bài toán mở đầu về doanh thu theo mức giá bán $p$ và yêu cầu học sinh thiết lập biểu thức $R(p)$.
* **Sản phẩm:** Công thức hàm bậc hai/bậc ba mô tả doanh thu kèm tập xác định thực tế.

### Hoạt động 2: Hình thành & Hệ thống hóa kiến thức trọng tâm (15 phút)
* **Mục tiêu:** Chốt nhanh quy trình 3 bước giải bài toán tối ưu hóa bằng đạo hàm và 2 công thức $Oxyz$ hay dùng.
* **Tóm tắt công thức:**
  - Nếu $f'(x)$ đổi dấu từ $+$ sang $-$ khi qua $x_0$ thì $x_0$ là điểm cực đại của hàm số.
  - Khoảng cách từ điểm $M(x_0; y_0; z_0)$ đến mặt phẳng $(P): Ax + By + Cz + D = 0$ là:
    $$d(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}$$

### Hoạt động 3: Luyện tập phân hóa theo cấu trúc đề thi 2025–2026 (18 phút)
* Học sinh hoàn thành **Phiếu học tập** bên dưới theo nhóm đôi, đối chiếu nhanh kết quả bằng CASIO (**MENU 9** / **MODE 8**).

### Hoạt động 4: Vận dụng thực tế & Giao nhiệm vụ về nhà (7 phút)
* Xây dựng mô hình $Oxyz$ cho vị trí trạm thu phát sóng 5G phủ kín khu vực dân cư bán kính $R = 5\\text{ km}$.

---

## PHIẾU HỌC TẬP CUỐI BÀI

**Câu 1 (Trắc nghiệm 4 lựa chọn):** Cho hàm số $y = f(x)$ có bảng biến thiên như sau:

| $x$ | $-\\infty$ | | $-1$ | | $1$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $0$ | $+$ | |
| $y$ | $-\\infty$ | $\\nearrow$ | $4$ | $\\searrow$ | $0$ | $\\nearrow$ | $+\\infty$ |

Hàm số $y = f(x)$ nghịch biến trên khoảng nào dưới đây?
A. $(-\\infty; -1)$
B. $(-1; 1)$
C. $(1; +\\infty)$
D. $(-1; +\\infty)$

**Câu 2 (Trả lời ngắn - Thực tế kinh tế):** Một xưởng sản xuất nhận thấy chi phí (triệu đồng) để sản xuất $x$ sản phẩm ($10 \\le x \\le 100$) là $C(x) = x^2 - 40x + 2500$. Tìm số lượng sản phẩm $x$ để chi phí trung bình $\\bar{C}(x) = \\frac{C(x)}{x}$ đạt giá trị nhỏ nhất.

**Đáp án nhanh:** Câu 1 chọn **B**; Câu 2 đáp số: **$50$** (vì $\\bar{C}(x) = x - 40 + \\frac{2500}{x} \\ge 2\\sqrt{2500} - 40 = 60$ tại $x = 50$).`;
  }

  if (materialType === "de_luyen_tap") {
    return `# ĐỀ LUYỆN TẬP ÔN THI TỐT NGHIỆP THPT — MÔN TOÁN

**Mục tiêu:** Khá 8+ điểm | **Cấu trúc mẫu:** Chuẩn 3 phần Bộ GD&ĐT (GDPT 2018)

---

## PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN

**Câu 1.** Cho hàm số $y = \\frac{2x - 1}{x + 1}$. Tiệm cận đứng của đồ thị hàm số đã cho là đường thẳng có phương trình:
A. $x = -1$
B. $x = 2$
C. $y = 2$
D. $y = -1$

**Câu 2.** Trong không gian $Oxyz$, mặt cầu $(S): (x - 2)^2 + (y + 1)^2 + z^2 = 9$ có tọa độ tâm $I$ và bán kính $R$ là:
A. $I(-2; 1; 0), R = 3$
B. $I(2; -1; 0), R = 3$
C. $I(2; -1; 0), R = 9$
D. $I(-2; 1; 0), R = 9$

---

## PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI

**Câu 1.** Một máy bay không người lái (drone) cứu hộ bay theo đường thẳng trong không gian $Oxyz$ (đơn vị mỗi trục là ki-lô-mét, mặt phẳng $(Oxy)$ trùng với mặt đất). Tại thời điểm $t = 0$, drone xuất phát từ trạm $A(1; 2; 3)$ và chuyển động đều với vectơ vận tốc $\\vec{v} = (2; -1; 1)$ (km/phút).
a) Phương trình tham số đường bay của drone là $\\begin{cases} x = 1 + 2t \\\\ y = 2 - t \\\\ z = 3 + t \\end{cases}$ ($t \\ge 0$).
b) Sau $2$ phút, drone ở vị trí $B(5; 0; 5)$.
c) Khoảng cách từ trạm xuất phát $A$ đến điểm $B$ sau $2$ phút nhỏ hơn $4,5\\text{ km}$.
d) Tại thời điểm $t = 2$ phút, khoảng cách từ drone đến mặt đất là $5\\text{ km}$.

---

## PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN

**Câu 1.** Một doanh nghiệp bán một loại thiết bị y tế với giá $p(x) = 120 - 0,5x$ (triệu đồng/bộ), trong đó $x$ là số lượng bộ bán ra trong tháng ($0 < x \\le 200$). Tổng chi phí sản xuất là $C(x) = 20x + 400$ (triệu đồng). Để lợi nhuận thu được lớn nhất, doanh nghiệp cần bán bao nhiêu bộ thiết bị mỗi tháng?

---

## ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT

| Câu | Phần I - Câu 1 | Phần I - Câu 2 | Phần III - Câu 1 |
|---|---|---|---|
| **Đáp án** | **A** | **B** | **$100$** |

* **Phần II – Câu 1:**
  - **a) Đúng:** Đường thẳng qua $A(1; 2; 3)$ có VTCP $\\vec{v} = (2; -1; 1)$ cho phương trình tham số đúng như trên.
  - **b) Đúng:** Thay $t = 2$ thu được $B(1 + 4; 2 - 2; 3 + 2) = (5; 0; 5)$.
  - **c) Sai:** $AB = \\sqrt{(5-1)^2 + (0-2)^2 + (5-3)^2} = \\sqrt{16 + 4 + 4} = \\sqrt{24} \\approx 4,90\\text{ km} > 4,5\\text{ km}$.
  - **d) Đúng:** Mặt đất là $(Oxy): z = 0$ nên $d(B, (Oxy)) = |z_B| = 5\\text{ km}$.
* **Phần III – Câu 1:** Lợi nhuận $L(x) = x(120 - 0,5x) - (20x + 400) = -0,5x^2 + 100x - 400$. Ta có $L'(x) = -x + 100 = 0 \\Leftrightarrow x = 100$. Đáp số: **$100$**.`;
  }

  return `# TÀI LIỆU CHUYÊN ĐỀ ÔN THI TỐT NGHIỆP THPT (GDPT 2018)

**Chuyên đề trọng tâm:** Ứng dụng đạo hàm khảo sát hàm số & Không gian $Oxyz$

---

## I. LÝ THUYẾT TRỌNG TÂM

1. **Tính đơn điệu và Cực trị hàm số:**
   - Cho hàm số $y = f(x)$ có đạo hàm trên khoảng $K$. Nếu $f'(x) > 0, \\forall x \\in K$ thì hàm số đồng biến trên $K$.
   - Với hàm bậc ba $y = ax^3 + bx^2 + cx + d$ ($a \\neq 0$), hàm số có hai điểm cực trị khi và chỉ khi phương trình $y' = 0$ có hai nghiệm phân biệt, tức là $\\Delta_{y'} = b^2 - 3ac > 0$.
2. **Đường thẳng đi qua hai điểm cực trị hàm bậc ba:**
   - Thực hiện phép chia đa thức $f(x)$ cho $f'(x)$: $f(x) = f'(x) \\cdot Q(x) + (mx + n)$. Khi đó đường thẳng qua hai điểm cực trị là $y = mx + n$.
3. **Mô hình hóa không gian $Oxyz$:**
   - Phương trình mặt cầu tâm $I(a; b; c)$, bán kính $R$: $(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2$.
   - Khoảng cách từ điểm $M(x_0; y_0; z_0)$ đến mặt phẳng $(P): Ax + By + Cz + D = 0$:
     $$d(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}$$

---

## II. PHƯƠNG PHÁP GIẢI & MẸO CASIO fx-580VN X / fx-880BTG

* **Mẹo tìm nhanh cực trị hàm bậc 3 & GTLN/GTNN:**
  - Nhấn **MENU** $\\to$ **9** (Equation) $\\to$ **2** (Polynomial) $\\to$ **3** (Bậc 3). Máy tính tự động hiển thị trực tiếp tọa độ $(x_{CĐ}; y_{CĐ})$ và $(x_{CT}; y_{CT})$.
  - Tìm $\\max/\\min$ trên đoạn $[a; b]$: Dùng **MENU** $\\to$ **8** (Table), nhập $f(x)$, chọn **Start** $= a$, **End** $= b$, **Step** $= \\frac{b - a}{29}$ để dò giá trị cực trị.
* **Mẹo tính nhanh tích có hướng & khoảng cách trong $Oxyz$:**
  - Nhấn **MENU** $\\to$ **5** (Vector) $\\to$ tạo **VctA** và **VctB** 3 chiều $\\to$ nhấn **OPTN** để tính $\\text{VctA} \\times \\text{VctB}$ hoặc dùng **Angle** để tìm góc giữa hai vectơ.

---

## III. VÍ DỤ MINH HỌA SÁT ĐỀ THI TN THPT

**Ví dụ 1 (Bài toán thực tế tối ưu lợi nhuận):** Một nhà máy sản xuất linh kiện điện tử dự kiến bán mỗi sản phẩm với giá $p = 500$ nghìn đồng. Nếu mỗi tháng sản xuất $x$ nghìn sản phẩm ($x > 0$) thì tổng chi phí là $C(x) = x^3 - 6x^2 + 392x + 200$ (triệu đồng). Cần sản xuất bao nhiêu nghìn sản phẩm mỗi tháng để lợi nhuận đạt cực đại?

**Lời giải:**
* Doanh thu theo đơn vị triệu đồng khi bán $x$ nghìn sản phẩm với giá $0,5$ triệu/sản phẩm là $R(x) = 500x$ (triệu đồng).
* Hàm lợi nhuận: $L(x) = R(x) - C(x) = 500x - (x^3 - 6x^2 + 392x + 200) = -x^3 + 6x^2 + 108x - 200$ ($x > 0$).
* Đạo hàm: $L'(x) = -3x^2 + 12x + 108$. Giải $L'(x) = 0 \\Leftrightarrow x = 6$ (nhận) hoặc $x = -2$ (loại).
* Lập bảng biến thiên trên $(0; +\\infty)$, $L(x)$ đạt cực đại tại $x = 6$. Vậy cần sản xuất **$6$** nghìn sản phẩm mỗi tháng.

---

## IV. BÀI TẬP TỰ LUYỆN PHÂN HÓA

> Bấm nút **✨ Tạo tài liệu bằng Gemini AI** ở thanh công cụ phía trên để sinh bộ chuyên đề / giáo án / đề luyện tập mới hoàn toàn theo đúng các dạng bài bạn đã tích chọn ở cây thư mục bên trái!`;
}
