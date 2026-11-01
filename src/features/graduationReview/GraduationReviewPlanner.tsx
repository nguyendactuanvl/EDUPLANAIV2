import React, { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  Download,
  Copy,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Key,
  Eye,
  FileCode,
  RotateCw,
  Target,
  FileCheck,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  BookOpenText,
  Landmark,
  Globe,
  Scale,
  Terminal,
  Languages,
  RefreshCw,
  Check,
  FileText,
  Upload,
  Search,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { MarkdownRenderer, typesetMathJax } from "../../components/MarkdownRenderer";
import { exportHtmlToWord } from "../../lib/exportUtils";
import { printElement } from "../../lib/print";
import { apiFetch, API_KEY_STORAGE } from "../../lib/apiFetch";
import {
  GRADUATION_SUBJECTS,
  DEFAULT_AI_MODELS,
  SubjectConfig,
  AiModelItem,
  MATH_105_PERIOD_TOPICS,
  TopicItem,
  getSubjectCategory
} from "./graduationSubjects";
import { getSampleLessonPlan, SAMPLE_MATH_PLAN } from "./sampleLessonPlans";

export const STUDENT_LEVELS = [
  {
    id: "intermediate",
    label: "Lớp đại trà: Mục tiêu 6.5 - 8.0 (Xét TN & ĐH khối chính)",
    tag: "Nhận biết - Thông hiểu - Vận dụng vừa sức",
    color: "blue",
    desc: "Bám sát kiến thức cốt lõi, nhận diện nhanh dạng đồ thị và bảng biến thiên; thành thạo xử lý câu hỏi Đúng/Sai và trả lời ngắn mức độ cơ bản - thông hiểu.",
  },
  {
    id: "advanced",
    label: "Nhóm lớp phân hóa nâng cao 12A1, 12A2, 12A3: Mục tiêu 8.0+ (Tham số m, VDC)",
    tag: "Vận dụng cao - Phân hóa sâu",
    color: "purple",
    desc: "Chuyên sâu các bài toán chứa tham số m, bài toán cực trị/đơn điệu nâng cao, mô hình hóa thực tế tối ưu phức hợp và rèn luyện tư duy chinh phục điểm 8+ đến 10.",
  },
  {
    id: "basic",
    label: "Mục tiêu 5.0 - 6.5 (Cơ bản / Chống trượt tốt nghiệp)",
    tag: "Nhận biết - Thông hiểu căn bản",
    color: "emerald",
    desc: "Củng cố kiến thức nền tảng, công thức then chốt, đọc hiểu bảng biến thiên cơ bản và phương pháp tránh bẫy trắc nghiệm.",
  },
];

export const PERIOD_OPTIONS = [
  { value: 1, label: "1 tiết (45 phút - Ôn trọng điểm nhanh)" },
  { value: 2, label: "2 tiết (90 phút - Ôn tập tiêu chuẩn)" },
  { value: 3, label: "3 tiết (135 phút - Mặc định PPCT 105 tiết)" },
  { value: 4, label: "4 tiết (180 phút - Chuyên đề nâng cao mở rộng)" },
  { value: 5, label: "5 tiết (225 phút - Chuyên đề lớn / Tích phân)" },
];

// Kế hoạch bài dạy mẫu chuẩn Công văn 5512/BGDĐT cho các môn
export const SAMPLE_LESSON_PLAN = SAMPLE_MATH_PLAN;
const _INLINE_PLAN = String.raw`# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 – 2027
**Môn học:** Toán 12 | **Bộ sách:** Kết nối tri thức với cuộc sống  
**Chủ đề:** **BÀI 1. TÍNH ĐƠN ĐIỆU VÀ CỰC TRỊ CỦA HÀM SỐ**  
**Thời lượng:** $3$ tiết ($135$ phút) | **Tiết PPCT:** $1 - 3$  
**Đối tượng áp dụng:** Học sinh lớp 12 (kết hợp phân hóa mục tiêu $6.5 - 8.0$ và nhóm lớp định hướng $8.0+$ như $12A_1, 12A_2, 12A_3$)

---

## I. MỤC TIÊU

### 1. Về kiến thức
- Hệ thống hóa định lý về mối liên hệ giữa dấu của đạo hàm cấp một và tính đơn điệu của hàm số trên các khoảng xác định.
- Nắm vững định nghĩa, điều kiện cần và điều kiện đủ (dấu hiệu $1$ và dấu hiệu $2$) để hàm số đạt cực trị; phân biệt rõ điểm cực trị của hàm số, điểm cực trị của đồ thị hàm số và giá trị cực trị.
- Đọc, phân tích và khai thác chính xác bảng biến thiên, đồ thị của hàm số $y = f(x)$ cũng như đồ thị hàm số đạo hàm $y = f'(x)$.
- Vận dụng thành thạo phương pháp cô lập tham số $m$ và định lý dấu tam thức bậc hai để giải quyết các bài toán chứa tham số $m$ về tính đơn điệu, cực trị (mục tiêu nâng cao dành cho học sinh khá, giỏi và các lớp $12A_1, 12A_2, 12A_3$).

### 2. Về năng lực
- **Năng lực tư duy và lập luận toán học:** Khả năng suy luận logic từ bảng xét dấu đạo hàm, phân tích các mệnh đề toán học Đúng/Sai, biện luận tham số $m$ theo điều kiện bài toán.
- **Năng lực mô hình hóa toán học:** Chuyển hóa bài toán thực tế hoặc đồ thị mô phỏng sang các điều kiện giải tích về cực trị và đơn điệu.
- **Năng lực giải quyết vấn đề toán học:** Nhận diện nhanh dạng toán, lựa chọn công cụ phù hợp (đạo hàm, bảng biến thiên, máy tính Casio fx-580VN X).
- **Năng lực sử dụng công cụ, phương tiện học toán:** Khai thác tính năng TABLE ($[Menu] [8]$), giải phương trình ($[Menu] [9] [2] [2]$), tính đạo hàm tại điểm ($[SHIFT] [\int]$) để kiểm tra kết quả nhanh và chính xác.

### 3. Về phẩm chất
- **Chăm chỉ, trách nhiệm:** Tích cực hợp tác trong thảo luận nhóm, hoàn thành các nhiệm vụ trên phiếu học tập đúng thời gian.
- **Cẩn thận, chính xác:** Khắc phục triệt để các sai lầm kinh điển như nhầm lẫn giữa "đồng biến trên $\mathbb{R} \setminus \{x_0\}$" và "đồng biến trên từng khoảng xác định", nhầm lẫn giữa điểm cực trị $x_0$ và giá trị cực trị $y_0$.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU

### 1. Giáo viên
- Kế hoạch bài dạy chi tiết chuẩn Công văn 5512/BGDĐT.
- Slide trình chiếu tóm tắt sơ đồ tư duy, bảng biến thiên và đồ thị minh họa trực quan.
- **Phiếu học tập số 1:** Khung lý thuyết trọng tâm và $4$ ví dụ mẫu kinh điển.
- **Phiếu học tập số 2:** Bộ câu hỏi rèn luyện chuẩn cấu trúc $3$ phần của Bộ GD&ĐT (Phần I: $6$ câu Trắc nghiệm nhiều lựa chọn; Phần II: $2$ câu Trắc nghiệm Đúng/Sai; Phần III: $3$ câu Trắc nghiệm Trả lời ngắn).

### 2. Học sinh
- Sách giáo khoa Toán 12 (Kết nối tri thức), vở ghi lý thuyết và bài tập ôn thi.
- Máy tính cầm tay Casio fx-580VN X (hoặc tương đương).
- Ôn lại các kiến thức cơ bản về quy tắc tính đạo hàm và dấu của tam thức bậc hai đã học ở lớp 10, 11.

---

## III. TIẾN TRÌNH DẠY HỌC

### TIẾT 1: HỆ THỐNG HÓA KIẾN THỨC VÀ CÁC DẠNG TOÁN CƠ BẢN (Nhận biết – Thông hiểu)

#### Hoạt động 1: Khởi động & Hệ thống hóa kiến thức trọng tâm (20 phút)
**a) Mục tiêu:** Tái hiện nhanh các định lý trọng tâm về tính đơn điệu và cực trị của hàm số; phân biệt các khái niệm then chốt tránh bẫy câu chữ trong đề thi tốt nghiệp.  
**b) Nội dung:** Học sinh hoàn thành Bảng tra cứu nhanh trên Phiếu học tập số 1; giáo viên chuẩn hóa kiến thức qua sơ đồ so sánh trực quan.  
**c) Sản phẩm:** Bảng tổng hợp kiến thức đã điền đầy đủ:
- *Tính đơn điệu trên khoảng $K$:* $f'(x) \ge 0, \forall x \in K$ (đẳng thức tại hữu hạn điểm) $\Rightarrow$ đồng biến; $f'(x) \le 0, \forall x \in K$ $\Rightarrow$ nghịch biến. Không dùng dấu $\cup$ hoặc chấm phẩy (;).
- *Hàm phân thức $y = \frac{ax + b}{cx + d}$:* $y' = \frac{ad - bc}{(cx + d)^2}$. Luôn luôn $ad - bc \ne 0$ (tuyệt đối không lấy dấu $=$).
- *Cực trị (Dấu hiệu 1):* $f'(x)$ đổi dấu khi $x$ đi qua $x_0$: $+ \to -$ (cực đại); $- \to +$ (cực tiểu). $f'(x_0)$ có thể bằng $0$ hoặc không xác định, chỉ cần hàm số liên tục tại $x_0$.  
**d) Tổ chức thực hiện:**  
- Bước 1: Giáo viên chiếu câu hỏi phản chứng về các khẳng định sai lầm thường gặp.  
- Bước 2: Học sinh trao đổi cặp đôi 5 phút.  
- Bước 3: Đại diện cặp đôi phát biểu, các bạn phản biện.  
- Bước 4: Giáo viên chốt các từ khóa then chốt: liên tục, hữu hạn điểm, đổi dấu, từng khoảng.

---

#### Hoạt động 2: Phân loại dạng toán & Phân tích ví dụ mẫu (25 phút)

##### Dạng 1: Đọc bảng biến thiên hoặc đồ thị của hàm số $y = f(x)$
- **Phương pháp nhận diện:** Đồng biến ứng với đạo hàm mang dấu $+$ hoặc đồ thị đi lên từ trái sang phải; nghịch biến ứng với dấu $-$ hoặc đồ thị đi xuống; cực trị tại điểm đạo hàm đổi dấu.
- **Ví dụ mẫu 1:** Cho hàm số $y = f(x)$ xác định trên $\mathbb{R} \setminus \{-1\}$, liên tục trên từng khoảng xác định và có bảng biến thiên:
$$\begin{array}{c|ccccccccc}
x & -\infty & & -2 & & -1 & & 1 & & +\infty \\
\hline
f'(x) & & + & 0 & - & \vline\vline & - & 0 & + & \\
\hline
& & & 3 & & \vline\vline & & & & +\infty \\
f(x) & & \nearrow & & \searrow & \vline\vline & & \nearrow & & \\
& -\infty & & & & \vline\vline & -\infty & & -1 &
\end{array}$$
Khẳng định nào sau đây là **đúng**?  
A. Hàm số đồng biến trên khoảng $(-\infty; 1)$.  
B. Điểm cực đại của hàm số là $x = -2$.  
C. Giá trị cực tiểu của hàm số là $y = 1$.  
D. Đồ thị hàm số có điểm cực tiểu là $M(1; 1)$.  
*Lời giải chi tiết:*  
Tại $x = -2$, $f'(x)$ đổi dấu từ $+$ sang $-$, hàm số đạt cực đại tại $x = -2$, giá trị cực đại $y = 3$. Vậy B đúng. Khẳng định A sai vì gián đoạn tại $x = -1$. Khẳng định C sai vì giá trị cực tiểu là $y = -1$. Khẳng định D sai vì điểm cực tiểu là $(1; -1)$. **Chọn B.**

---

##### Dạng 2: Khai thác đồ thị hoặc bảng xét dấu của đạo hàm $y = f'(x)$
- **Phương pháp nhận diện:** Khoảng hàm số $f(x)$ đồng biến khi đồ thị $y = f'(x)$ nằm phía trên trục hoành ($f'(x) > 0$). Điểm cực trị là nghiệm bội lẻ của $f'(x) = 0$ (cắt xuyên qua trục hoành).
- **Ví dụ mẫu 2:** Cho hàm số $y = f(x)$ liên tục trên $\mathbb{R}$ và đồ thị đạo hàm $y = f'(x)$ là parabol cắt trục hoành tại $x = -1$ và $x = 3$, bề lõm hướng xuống dưới (tức $f'(x) > 0 \Leftrightarrow x \in (-1; 3)$). Hàm số $g(x) = f(1 - 2x)$ đồng biến trên khoảng nào dưới đây?  
A. $(-1; 1)$.  
B. $(1; 2)$.  
C. $(-1; 0)$.  
D. $(2; +\infty)$.  
*Lời giải chi tiết:*  
Ta có $g'(x) = [f(1 - 2x)]' = -2 \cdot f'(1 - 2x)$.  
Hàm số $g(x)$ đồng biến $\Leftrightarrow g'(x) \ge 0 \Leftrightarrow -2 \cdot f'(1 - 2x) \ge 0 \Leftrightarrow f'(1 - 2x) \le 0$.  
Từ đồ thị, $f'(u) \le 0 \Leftrightarrow u \le -1$ hoặc $u \ge 3$.  
Thay $u = 1 - 2x$:  
- $1 - 2x \le -1 \Leftrightarrow x \ge 1$.  
- $1 - 2x \ge 3 \Leftrightarrow x \le -1$.  
Vậy $g(x)$ đồng biến trên $(-\infty; -1)$ và $(1; +\infty)$. Do $(1; 2) \subset (1; +\infty)$ nên hàm số đồng biến trên $(1; 2)$. **Chọn B.**

---

### TIẾT 2: BÀI TOÁN CHỨA THAM SỐ $m$ VÀ PHÂN HÓA NÂNG CAO (Vận dụng – Vận dụng cao)

#### Hoạt động 2 (tiếp theo): Bài toán tham số $m$ (45 phút)

##### Dạng 3: Tìm tham số $m$ để hàm số đơn điệu trên từng khoảng xác định hoặc trên $\mathbb{R}$
- **Ví dụ mẫu 3:** Cho hàm số $y = \frac{x - m + 2}{x + 2m}$ ($m$ là tham số thực). Có bao nhiêu giá trị nguyên của $m$ thuộc $[-5; 5]$ để hàm số đã cho đồng biến trên từng khoảng xác định của nó?  
A. $4$.  
B. $5$.  
C. $6$.  
D. $7$.  
*Lời giải chi tiết:*  
Tập xác định $D = \mathbb{R} \setminus \{-2m\}$. Đạo hàm $y' = \frac{1 \cdot (2m) - 1 \cdot (-m + 2)}{(x + 2m)^2} = \frac{3m - 2}{(x + 2m)^2}$.  
Hàm số đồng biến trên từng khoảng xác định $\Leftrightarrow y' > 0, \forall x \ne -2m \Leftrightarrow 3m - 2 > 0 \Leftrightarrow m > \frac{2}{3}$.  
Vì $m \in [-5; 5]$ và $m \in \mathbb{Z} \Rightarrow m \in \{1; 2; 3; 4; 5\}$. Có $5$ giá trị nguyên thỏa mãn. **Chọn B.**

---

##### Dạng 4: Bài toán tham số $m$ đơn điệu trên khoảng (Dành cho lớp $12A_1, 12A_2, 12A_3$)
- **Phương pháp cô lập tham số:** Đưa về dạng $m \ge g(x), \forall x \in (a; b) \Leftrightarrow m \ge \max_{[a; b]} g(x)$ (hoặc $m \le g(x) \Leftrightarrow m \le \min_{[a; b]} g(x)$).
- **Ví dụ mẫu 4:** Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = x^3 - 3x^2 + (m - 1)x + 2026$ đồng biến trên khoảng $(2; +\infty)$.  
A. $m \ge 4$.  
B. $m > 4$.  
C. $m \le 4$.  
D. $m \ge 1$.  
*Lời giải chi tiết:*  
Ta có $y' = 3x^2 - 6x + m - 1$.  
Hàm số đồng biến trên $(2; +\infty) \Leftrightarrow y' \ge 0, \forall x \in (2; +\infty) \Leftrightarrow 3x^2 - 6x + m - 1 \ge 0, \forall x \in (2; +\infty)$.  
Cô lập $m$: $m \ge -3x^2 + 6x + 1 = g(x), \forall x \in (2; +\infty)$.  
Khảo sát $g(x) = -3x^2 + 6x + 1$ trên $(2; +\infty)$: $g'(x) = -6x + 6 = -6(x - 1) < 0, \forall x > 2$.  
Hàm số $g(x)$ nghịch biến trên $(2; +\infty)$, suy ra $g(x) < g(2) = -3(4) + 12 + 1 = 1$.  
Vậy để $m \ge g(x), \forall x > 2$ thì $m \ge 1$. **Chọn D.**

---

### TIẾT 3: LUYỆN TẬP ĐỊNH DẠNG MỚI, THỦ THUẬT CASIO VÀ TỔNG KẾT (45 phút)

#### Hoạt động 3: Luyện tập theo hệ thống câu hỏi định dạng đề thi mới (20 phút)
**a) Mục tiêu:** Rèn luyện phản xạ giải đề thi TN THPT theo đúng 3 phần: Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai, Trả lời ngắn.  
**b) Nội dung:** Học sinh chia nhóm làm việc trên Phiếu học tập số 2 (Phần II và III).  
**c) Sản phẩm:** Bảng nhóm ghi lời giải chi tiết và đáp số.  
**d) Tổ chức thực hiện:**  
- Bước 1: Giao nhiệm vụ cho 4 nhóm (nhóm 1, 2 giải câu Đúng/Sai; nhóm 3, 4 giải câu Trả lời ngắn).  
- Bước 2: Học sinh thảo luận nhóm, giải thích vì sao từng ý Đúng hay Sai.  
- Bước 3: Đại diện 2 nhóm lên bảng thuyết trình.  
- Bước 4: Giáo viên chuẩn hóa đáp án và biểu điểm chi tiết.

---

#### Hoạt động 4: Kỹ năng máy tính cầm tay (Casio fx-580VN X) và Nhận diện bẫy đề thi (15 phút)
**a) Kỹ năng Casio:**
1. *Dò bảng TABLE kiểm tra tính đơn điệu:* Bấm $[Menu] [8]$, nhập $f(x)$, thiết lập $Start, End, Step = \frac{End - Start}{29}$. Nếu giá trị cột $f(x)$ tăng liên tục $\Rightarrow$ đồng biến; giảm liên tục $\Rightarrow$ nghịch biến.
2. *Kiểm tra điểm cực trị:* Bấm $[SHIFT] [\int]$, nhập hàm số, tính đạo hàm tại $x_0 \Rightarrow$ kết quả xấp xỉ $0$. Sau đó tính tại $x_0 \pm 0.001$ để kiểm tra đổi dấu.
**b) Nhận diện bẫy thường gặp:**
- Không kết luận đồng biến trên $\mathbb{R} \setminus \{x_0\}$ hay dùng dấu $\cup$.
- Nhầm lẫn giữa đồ thị hàm số $y = f(x)$ và đồ thị đạo hàm $y = f'(x)$.
- Điểm cực trị là nghiệm bội lẻ của $f'(x) = 0$; nghiệm bội chẵn thì không đổi dấu nên không sinh ra cực trị.

---

#### Hoạt động 5: Vận dụng và Hướng dẫn tự học ở nhà (10 phút)
- Hoàn thành đầy đủ các bài tập còn lại trong Phiếu học tập số 2 vào vở tự học.
- Đọc trước nội dung **Bài 2. Giá trị lớn nhất và giá trị nhỏ nhất của hàm số** (Tiết 4 – 5).

---

## IV. PHỤ LỤC: HỆ THỐNG PHIẾU HỌC TẬP VÀ ĐÁP ÁN CHI TIẾT

### 1. NỘI DUNG PHIẾU HỌC TẬP SỐ 2 (RÈN LUYỆN ĐỊNH DẠNG MỚI)

#### PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Thí sinh trả lời từ câu 1 đến câu 6)

**Câu 1 (NB):** Cho hàm số $y = f(x)$ có bảng biến thiên:
$$\begin{array}{c|ccccccc}
x & -\infty & & -1 & & 2 & & +\infty \\
\hline
f'(x) & & - & 0 & + & 0 & - & \\
\hline
& +\infty & & & & 3 & & \\
f(x) & & \searrow & & \nearrow & & \searrow & \\
& & & -2 & & & & -\infty
\end{array}$$
Mệnh đề nào dưới đây đúng?  
A. Hàm số đồng biến trên khoảng $(-\infty; 3)$.  
B. Hàm số nghịch biến trên khoảng $(-1; 2)$.  
C. Hàm số đồng biến trên khoảng $(-1; 2)$.  
D. Hàm số nghịch biến trên khoảng $(-2; 3)$.

**Câu 2 (NB):** Cho hàm số $y = f(x)$ có đạo hàm $f'(x) = x(x - 1)(x + 2)^3$ với mọi $x \in \mathbb{R}$. Số điểm cực trị của hàm số đã cho là:  
A. $1$.  
B. $2$.  
C. $3$.  
D. $5$.

**Câu 3 (TH):** Cho hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ có đồ thị uốn lượn đạt cực đại tại $(-1; 3)$ và cực tiểu tại $(1; -1)$. Điểm cực tiểu của đồ thị hàm số đã cho có tọa độ là:  
A. $(1; -1)$.  
B. $(-1; 3)$.  
C. $x = 1$.  
D. $y = -1$.

**Câu 4 (TH):** Cho hàm số $y = \frac{x - 3}{x + 1}$. Khẳng định nào sau đây là đúng?  
A. Hàm số đồng biến trên khoảng $(-\infty; -1)$.  
B. Hàm số nghịch biến trên khoảng $(-\infty; +\infty)$.  
C. Hàm số đồng biến trên $\mathbb{R} \setminus \{-1\}$.  
D. Hàm số nghịch biến trên $(-1; 3)$.

**Câu 5 (VD):** Tìm tất cả các giá trị của tham số thực $m$ để hàm số $y = \frac{1}{3}x^3 - mx^2 + (m^2 - 4)x + 3$ đạt cực đại tại điểm $x = 1$.  
A. $m = 1$.  
B. $m = 3$.  
C. $m = -1$.  
D. Không tồn tại $m$.

**Câu 6 (VD - Dành cho lớp $12A_1, 12A_2, 12A_3$):** Có bao nhiêu giá trị nguyên của tham số $m$ thuộc đoạn $[-5; 5]$ để hàm số $y = \frac{mx - 4}{x - m}$ đồng biến trên khoảng $(1; +\infty)$?  
A. $2$.  
B. $3$.  
C. $4$.  
D. $5$.

---

#### PHẦN II. Câu trắc nghiệm đúng sai (Thí sinh trả lời từ câu 1 đến câu 2. Trong mỗi ý a, b, c, d ở mỗi câu, thí sinh chọn đúng hoặc sai)

**Câu 1:** Cho hàm số bậc ba $y = f(x) = x^3 - 3x^2 + 2$ có đồ thị là $(C)$.
- a) Hàm số có đạo hàm là $f'(x) = 3x^2 - 6x$.
- b) Hàm số đã cho nghịch biến trên khoảng $(0; 2)$.
- c) Điểm cực đại của đồ thị hàm số $(C)$ là điểm $A(0; 2)$.
- d) Đường thẳng đi qua hai điểm cực trị của đồ thị hàm số $(C)$ có phương trình là $2x + y - 2 = 0$.

**Câu 2:** Cho hàm số $y = f(x)$ xác định và liên tục trên $\mathbb{R}$. Đạo hàm $f'(x)$ có đồ thị là đường cong cắt trục hoành tại ba điểm phân biệt $x = -2$, $x = 1$, $x = 3$. Ngoài ra $f'(x) < 0$ trên các khoảng $(-\infty; -2)$ và $(1; 3)$, $f'(x) > 0$ trên $(-2; 1)$ và $(3; +\infty)$.
- a) Hàm số $y = f(x)$ nghịch biến trên khoảng $(1; 3)$.
- b) Hàm số $y = f(x)$ đạt cực tiểu tại điểm $x = 1$.
- c) Hàm số $y = f(x)$ có tất cả $3$ điểm cực trị.
- d) Hàm số $g(x) = f(x^2 - 2)$ nghịch biến trên khoảng $(0; 1)$.

---

#### PHẦN III. Câu trắc nghiệm trả lời ngắn (Thí sinh trả lời từ câu 1 đến câu 3)

**Câu 1 (TH):** Cho hàm số $y = f(x) = \frac{x^2 - 3x + 6}{x - 1}$. Khoảng cách giữa hai điểm cực trị của đồ thị hàm số đã cho bằng bao nhiêu? *(Làm tròn kết quả đến hàng phần mười).*

**Câu 2 (VD):** Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ ($a \ne 0$) có hai điểm cực trị là $x_1 = -1$ và $x_2 = 3$. Biết rằng $f(-1) = 4$ và $f(3) = -4$. Tính giá trị của biểu thức $T = f(1) + 2f'(2)$.

**Câu 3 (VDC - Dành cho lớp $12A_1, 12A_2, 12A_3$):** Có tất cả bao nhiêu giá trị nguyên của tham số $m \in [-20; 20]$ để hàm số $y = \left| x^3 - 3x^2 + m \right|$ có đúng $5$ điểm cực trị?

---

### 2. BẢNG ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT PHIẾU HỌC TẬP SỐ 2

#### PHẦN I: ĐÁP ÁN TRẮC NGHIỆM 4 LỰA CHỌN
- **Câu 1: C.** Trên khoảng $(-1; 2)$ thì $f'(x) > 0 \Rightarrow$ đồng biến.
- **Câu 2: C.** $f'(x) = 0$ có 3 nghiệm bội lẻ $x = 0, x = 1, x = -2 \Rightarrow 3$ cực trị.
- **Câu 3: A.** Tọa độ điểm cực tiểu của đồ thị là $(1; -1)$.
- **Câu 4: A.** $y' = \frac{4}{(x + 1)^2} > 0, \forall x \ne -1 \Rightarrow$ đồng biến trên $(-\infty; -1)$.
- **Câu 5: B.** $y'(1) = m^2 - 2m - 3 = 0 \Leftrightarrow m = -1$ hoặc $m = 3$. Vì đạt cực đại nên $y''(1) = 2 - 2m < 0 \Leftrightarrow m > 1 \Rightarrow m = 3$.
- **Câu 6: B.** $y' = \frac{-m^2 + 4}{(x - m)^2} > 0 \Leftrightarrow -2 < m < 2$. Điều kiện không thuộc khoảng: $m \le 1$. Kết hợp: $m \in \{-1; 0; 1\} \Rightarrow 3$ giá trị nguyên.

#### PHẦN II: ĐÁP ÁN TRẮC NGHIỆM ĐÚNG SAI
- **Câu 1:** a) **ĐÚNG** | b) **ĐÚNG** | c) **ĐÚNG** | d) **ĐÚNG**  
  *Giải thích ý d:* Hai điểm cực trị là $A(0; 2)$ và $B(2; -2)$. Phương trình đường thẳng đi qua $A, B$ là $y = -2x + 2 \Leftrightarrow 2x + y - 2 = 0$.
- **Câu 2:** a) **ĐÚNG** | b) **SAI** | c) **ĐÚNG** | d) **SAI**  
  *Giải thích ý b:* Tại $x = 1$, $f'(x)$ đổi dấu từ $+$ sang $-$ nên $x = 1$ là điểm cực đại.  
  *Giải thích ý d:* $g'(x) = 2x \cdot f'(x^2 - 2)$. Khi $x \in (0; 1) \Rightarrow 2x > 0$ và $x^2 - 2 \in (-2; -1) \subset (-2; 1) \Rightarrow f'(x^2 - 2) > 0 \Rightarrow g'(x) > 0 \Rightarrow$ hàm số đồng biến trên $(0; 1)$.

#### PHẦN III: ĐÁP ÁN TRẮC NGHIỆM TRẢ LỜI NGẮN
- **Câu 1:** **8.9**  
  *Lời giải:* $y' = \frac{x^2 - 2x - 3}{(x - 1)^2} = 0 \Leftrightarrow x = -1 \Rightarrow y = -5; x = 3 \Rightarrow y = 3$. Khoảng cách $AB = \sqrt{(3 - (-1))^2 + (3 - (-5))^2} = \sqrt{16 + 64} = \sqrt{80} \approx 8.9$.
- **Câu 2:** **-4.5**  
  *Lời giải:* Điểm uốn $I(1; 0) \Rightarrow f(1) = 0$. Từ $f(-1) - f(3) = 8 \Rightarrow \int_{-1}^3 f'(x)dx = -8 \Rightarrow a = \frac{1}{4}$. Khi đó $f'(2) = -\frac{9}{4} \Rightarrow T = 0 + 2\left(-\frac{9}{4}\right) = -4.5$.
- **Câu 3:** **3**  
  *Lời giải:* Đặt $h(x) = x^3 - 3x^2 + m$. Cực trị của $h(x)$ là $y_1 = m$ và $y_2 = m - 4$. Hàm số $y = |h(x)|$ có $5$ cực trị khi $y_1 \cdot y_2 < 0 \Leftrightarrow m(m - 4) < 0 \Leftrightarrow 0 < m < 4 \Rightarrow m \in \{1; 2; 3\}$ ($3$ giá trị).

---

### PHÊ DUYỆT CỦA TỔ CHUYÊN MÔN
*Ngày ...... tháng ...... năm 202...*  
**TỔ TRƯỞNG CHUYÊN MÔN**  
*(Ký và ghi rõ họ tên)*`;


// Icon Helper Component
const SubjectIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className = "w-4 h-4" }) => {
  switch (iconName) {
    case "Calculator":
      return <Calculator className={className} />;
    case "Atom":
      return <Atom className={className} />;
    case "FlaskConical":
      return <FlaskConical className={className} />;
    case "Dna":
      return <Dna className={className} />;
    case "BookOpenText":
      return <BookOpenText className={className} />;
    case "Landmark":
      return <Landmark className={className} />;
    case "Globe":
      return <Globe className={className} />;
    case "Scale":
      return <Scale className={className} />;
    case "Terminal":
      return <Terminal className={className} />;
    case "Languages":
      return <Languages className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};

export function GraduationReviewPlannerModule() {
  // Subject Control (Defaults to 'toan' as requested)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("toan");
  const currentSubject: SubjectConfig =
    GRADUATION_SUBJECTS.find((s) => s.id === selectedSubjectId) || GRADUATION_SUBJECTS[0];

  // Cơ chế tiếp nhận thông tin đầu vào từ giáo viên (3 trường hợp linh hoạt):
  // 'ppct105': Trường hợp 1: Chọn bài từ Khung PPCT 105 tiết mặc định (2026-2027)
  // 'file_ppct': Trường hợp 2: Tệp PPCT đính kèm / Tải lên (Đọc cấu trúc file PDF 105 tiết)
  // 'custom': Trường hợp 3: Giáo viên tự gõ chủ đề / nội dung ôn tập bất kỳ
  const [inputMode, setInputMode] = useState<"ppct105" | "file_ppct" | "custom">("ppct105");

  // Selected topic from default 105-period syllabus (or subject topics)
  const [selectedMathTopicId, setSelectedMathTopicId] = useState<string>("bai_1");
  const [topicSearchKeyword, setTopicSearchKeyword] = useState<string>("");

  // Custom Topic inputs (Trường hợp 3)
  const [customTopicTitle, setCustomTopicTitle] = useState<string>("");
  const [customPeriodRange, setCustomPeriodRange] = useState<string>("Tiết bổ trợ ôn thi buổi chiều");
  const [customFocusGoals, setCustomFocusGoals] = useState<string>("");

  // File PPCT inputs (Trường hợp 2)
  const attachedPdfPath = "/assets/aistudio/PPCT__n_TN_12_n_m_26-27_105_ti_t_824c6e08.pdf";
  const [attachedFileName, setAttachedFileName] = useState<string>("PPCT__n_TN_12_n_m_26-27_105_ti_t_824c6e08.pdf");
  const [uploadedFileStatus, setUploadedFileStatus] = useState<string>("Tệp PPCT ôn TN THPT 105 tiết (2026-2027) đã sẵn sàng.");

  // General controls
  const [periods, setPeriods] = useState<number>(3); // Default 3 periods for Lesson 1
  const [studentTarget, setStudentTarget] = useState<string>("intermediate");
  const [includeExamFormats, setIncludeExamFormats] = useState<boolean>(true);

  // AI Model Controls & User Account Live Fetching
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      localStorage.getItem(API_KEY_STORAGE) ||
      localStorage.getItem("gemini_api_key") ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ""
    );
  });
  const [geminiModel, setGeminiModel] = useState<string>("gemini-2.5-flash");
  const [availableModels, setAvailableModels] = useState<AiModelItem[]>(DEFAULT_AI_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [modelsFetchedFromAccount, setModelsFetchedFromAccount] = useState<boolean>(false);

  // Output and Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [resultPlan, setResultPlan] = useState<string>(SAMPLE_LESSON_PLAN);
  const [activeTab, setActiveTab] = useState<"preview" | "markdown">("preview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Current active topic item
  const currentMathTopic: TopicItem =
    currentSubject.topics.find((t) => t.id === selectedMathTopicId) || currentSubject.topics[0];

  // Auto-set duration when choosing a topic from curriculum
  const handleSelectTopicItem = (topic: TopicItem) => {
    setSelectedMathTopicId(topic.id);
    if (topic.defaultPeriods) {
      setPeriods(topic.defaultPeriods);
    }
  };

  // Automatically trigger MathJax rendering whenever preview tab is active or result changes
  useEffect(() => {
    if (activeTab === "preview" && previewContainerRef.current) {
      typesetMathJax(previewContainerRef.current);
      const timer = setTimeout(() => {
        if (previewContainerRef.current) {
          typesetMathJax(previewContainerRef.current);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, resultPlan]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Dynamic Query: Fetch live models supported by user's Gemini API Key via Server Proxy
  const fetchAvailableModels = async (keyToUse?: string, notifyUser: boolean = false) => {
    const activeKey = (keyToUse !== undefined ? keyToUse : apiKey).trim();
    if (!activeKey) {
      if (notifyUser) showToast("Vui lòng nhập API Key trước khi làm mới danh sách mô hình.");
      return;
    }

    setIsFetchingModels(true);
    try {
      localStorage.setItem(API_KEY_STORAGE, activeKey);
      const res = await apiFetch("/api/list-gemini-models");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể truy vấn danh sách mô hình.`);
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const filtered = data.models
          .filter((m: any) => {
            const rawName = (m.name || "").replace("models/", "");
            const methods = m.supportedGenerationMethods || [];
            const canGenContent = methods.includes("generateContent");
            const isDeprecated =
              rawName.startsWith("gemini-1.5") ||
              rawName.startsWith("gemini-1.0") ||
              rawName.startsWith("gemini-2.0") ||
              rawName === "gemini-pro";
            const isSpecialized =
              rawName.includes("embedding") ||
              rawName.includes("imagen") ||
              rawName.includes("aqa") ||
              rawName.includes("whisper") ||
              rawName.includes("tts") ||
              rawName.includes("transcribe");
            return canGenContent && !isDeprecated && !isSpecialized;
          })
          .map((m: any) => {
            const id = m.name.replace("models/", "");
            return {
              id,
              name: m.displayName || id,
              desc: m.description ? m.description.slice(0, 70) + "..." : "Mô hình khả dụng trong tài khoản của bạn",
              fromAccount: true,
            };
          });

        if (filtered.length > 0) {
          setAvailableModels(filtered);
          setModelsFetchedFromAccount(true);
          const exists = filtered.some((m: any) => m.id === geminiModel);
          if (!exists) {
            const preferred =
              filtered.find((m: any) => m.id === "gemini-2.5-flash") ||
              filtered.find((m: any) => m.id.includes("flash")) ||
              filtered[0];
            setGeminiModel(preferred.id);
          }
          if (notifyUser) {
            showToast(`Đã đồng bộ ${filtered.length} mô hình AI khả dụng từ tài khoản của bạn!`);
          }
        }
      }
    } catch (err: any) {
      if (notifyUser) {
        showToast("Không thể tải danh sách từ API Key. Đang sử dụng danh sách mô hình chuẩn.");
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Sync API Key to localStorage & trigger model fetch
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim()) {
      localStorage.setItem(API_KEY_STORAGE, val.trim());
      fetchAvailableModels(val, false);
    }
  };

  // Initial fetch if API Key exists
  useEffect(() => {
    if (apiKey.trim()) {
      fetchAvailableModels(apiKey, false);
    }
  }, []);

  // Handle switching subjects
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const sub = GRADUATION_SUBJECTS.find((s) => s.id === subjectId) || GRADUATION_SUBJECTS[0];
    if (sub.topics && sub.topics.length > 0) {
      setSelectedMathTopicId(sub.topics[0].id);
      if (sub.topics[0].defaultPeriods) {
        setPeriods(sub.topics[0].defaultPeriods);
      }
    }
    // Load corresponding CV 5512 sample plan for the selected subject
    const sample = getSampleLessonPlan(subjectId);
    setResultPlan(sample);
    showToast(`Đã chuyển sang môn ${sub.name}! Đã tải giáo án mẫu chuẩn CV 5512.`);
  };

  // Calculate effective lesson parameters based on current input mode
  let effectiveTopicTitle = "";
  let effectivePeriodRange = "";
  let effectiveYccd = "";
  let effectiveDiffNotes = "";

  if (inputMode === "custom") {
    effectiveTopicTitle = customTopicTitle.trim() || `Chuyên đề ôn tập nâng cao môn ${currentSubject.name}`;
    effectivePeriodRange = customPeriodRange.trim() || `Tiết bổ trợ ôn thi`;
    effectiveYccd = customFocusGoals.trim() || `Hệ thống hóa kiến thức trọng tâm, rèn luyện kỹ năng giải đề và phòng chống bẫy đề thi tốt nghiệp môn ${currentSubject.name}.`;
    effectiveDiffNotes = studentTarget === "advanced" ? "Tập trung các dạng bài vận dụng cao phân hóa sâu cho mục tiêu 8.0+." : "Mức độ nhận biết, thông hiểu và vận dụng vừa sức dành cho lớp đại trà mục tiêu 6.5 - 7.5.";
  } else {
    effectiveTopicTitle = currentMathTopic.title;
    effectivePeriodRange = currentMathTopic.periodRange || `Tiết 1 – ${periods}`;
    effectiveYccd = currentMathTopic.learningOutcomes || currentMathTopic.desc;
    effectiveDiffNotes = currentMathTopic.differentiatedNotes || "";
  }

  const effectiveTopicName = effectiveTopicTitle;

  // Build pedagogical prompt tailored to CV 5512 and new exam format for ALL subjects
  const buildSystemPrompt = () => {
    const studentInfo =
      STUDENT_LEVELS.find((l) => l.id === studentTarget) || STUDENT_LEVELS[0];

    const category = getSubjectCategory(currentSubject.id);
    const isMath = currentSubject.id === "toan";
    const isKhtn = category === "khtn";
    const isKhxh = category === "khxh";
    const isEnglish = category === "tieng_anh";
    const isLiterature = category === "ngu_van";
    const isTinHoc = category === "tin_hoc";

    let subjectFormatInstructions = "";

    if (isMath) {
      subjectFormatInstructions = `QUY CHUẨN ĐỊNH DẠNG ĐỀ THI MÔN TOÁN HỌC:
- Phiếu học tập số 2 ở Phần IV (Phụ lục) BẮT BUỘC gồm 3 phần:
  + Phần I: Trắc nghiệm 4 lựa chọn (Từ 4 - 6 câu có 4 phương án A, B, C, D).
  + Phần II: Trắc nghiệm Đúng/Sai (Từ 2 - 3 câu; mỗi câu gồm ngữ cảnh/giả thiết chung và 4 lệnh hỏi độc lập a, b, c, d có tính phân hóa).
  + Phần III: Trắc nghiệm Trả lời ngắn (Từ 2 - 4 câu điền kết quả số thực/nguyên/thập phân).
- Bảng đáp án và LỜI GIẢI CHI TIẾT TOÀN BỘ các câu trong Phiếu học tập (giải thích rõ ràng vì sao từng ý Đúng hay Sai).
- Hoạt động 4: Hướng dẫn kỹ năng máy tính cầm tay (Casio fx-580VN X: Table, đạo hàm tại điểm, giải phương trình/hệ phương trình) và Nhận diện các bẫy thường gặp trong đề thi.`;
    } else if (isKhtn) {
      subjectFormatInstructions = `QUY CHUẨN CẤU TRÚC ĐỀ THI VÀ PHIẾU HỌC TẬP MÔN ${currentSubject.name.toUpperCase()} (KHOA HỌC TỰ NHIÊN):
- Phiếu học tập ở Phần IV (Phụ lục) BẮT BUỘC gồm 2 phần theo đúng định dạng đề thi mới của Bộ GD&ĐT:
  + Phần I: Trắc nghiệm 4 lựa chọn (Từ 6 - 8 câu nhận biết, thông hiểu có 4 phương án A, B, C, D).
  + Phần II: Trắc nghiệm Đúng/Sai (Từ 2 - 3 câu; mỗi câu gắn với đồ thị, sơ đồ thí nghiệm, hiện tượng hoặc bài toán thực tế, gồm 4 ý a, b, c, d độc lập có tính phân hóa).
- Bảng đáp án và LỜI GIẢI CHI TIẾT TOÀN BỘ các câu trong Phiếu học tập (phân tích hiện tượng, cơ chế, phương trình phản ứng / công thức và giải thích tường tận vì sao từng ý Đúng hay Sai).
- Hoạt động 4: Hướng dẫn kỹ năng làm bài, phân tích đồ thị, xử lý số liệu thí nghiệm và nhận diện các bẫy đề thi hay gặp.`;
    } else if (isKhxh) {
      subjectFormatInstructions = `QUY CHUẨN CẤU TRÚC ĐỀ THI VÀ PHIẾU HỌC TẬP MÔN ${currentSubject.name.toUpperCase()} (KHOA HỌC XÃ HỘI):
- Phiếu học tập ở Phần IV (Phụ lục) BẮT BUỘC gồm 2 phần theo đúng định dạng đề thi mới của Bộ GD&ĐT:
  + Phần I: Trắc nghiệm 4 lựa chọn (Từ 6 - 8 câu nhận biết, thông hiểu có 4 phương án A, B, C, D).
  + Phần II: Trắc nghiệm Đúng/Sai (Từ 2 - 3 câu; khai thác tư liệu lịch sử gốc, bảng số liệu biểu đồ địa lý hoặc tình huống pháp luật/kinh tế thực tế, gồm 4 ý a, b, c, d độc lập).
- Bảng đáp án và LỜI GIẢI CHI TIẾT TOÀN BỘ các câu trong Phiếu học tập (chỉ rõ căn cứ từ văn kiện/tư liệu, số liệu Atlat, điều khoản luật pháp và giải thích rõ từng mệnh đề a, b, c, d Đúng hay Sai).
- Hoạt động 4: Kỹ năng đọc hiểu văn bản tư liệu gốc / khai thác Atlat, bảng biểu / phân tích tình huống thực tế và bẫy ngôn từ đánh lừa.`;
    } else if (isEnglish) {
      subjectFormatInstructions = `QUY CHUẨN CẤU TRÚC ĐỀ THI VÀ PHIẾU HỌC TẬP MÔN TIẾNG ANH:
- Phiếu học tập ở Phần IV (Phụ lục) BẮT BUỘC 100% trắc nghiệm 4 lựa chọn phân bố theo các chuyên đề chuẩn đề thi tốt nghiệp mới:
  + Ngữ âm/Trọng âm (Phonetics & Stress): Từ 2 - 4 câu.
  + Từ vựng - Ngữ pháp (Grammar & Vocabulary): Từ 4 - 6 câu.
  + Đọc điền từ (Cloze text / Guided gap fill): 1 bài văn ngắn kèm 3 - 5 chỗ trống.
  + Đọc hiểu văn bản (Reading Comprehension): 1 bài đọc ngắn có 4 - 5 câu hỏi (Main idea, Detail, Vocab in context, Reference).
  + Tìm lỗi sai / Chức năng giao tiếp (Error identification / Communication): Từ 2 - 4 câu.
- Bảng đáp án và LỜI GIẢI CHI TIẾT BẰNG TIẾNG VIỆT (dịch nghĩa văn cảnh, chỉ rõ cấu trúc ngữ pháp và giải thích cặn kẽ tại sao chọn phương án đúng).
- Hoạt động 4: Mẹo nhận diện dạng câu, bẫy từ loại, bẫy thì và chiến thuật Skimming/Scanning đọc hiểu nhanh.`;
    } else if (isLiterature) {
      subjectFormatInstructions = `QUY CHUẨN CẤU TRÚC ĐỀ THI VÀ PHIẾU HỌC TẬP MÔN NGỮ VĂN (TUYỆT ĐỐI KHÔNG RA ĐỀ TRẮC NGHIỆM):
- Phiếu học tập ở Phần IV (Phụ lục) BẮT BUỘC 100% TỰ LUẬN gồm 2 phần theo ma trận cấu trúc đề thi mới nhất của Bộ GD&ĐT:
  + Phần I. ĐỌC HIỂU (4.0 điểm): Trích dẫn một ngữ liệu là văn bản mới (ngoài SGK - đoạn trích thơ hiện đại, tản văn, truyện ngắn hoặc văn bản nghị luận xã hội) kèm hệ thống 4 - 5 câu hỏi phân tích từ nhận biết, thông hiểu đến vận dụng.
  + Phần II. VIẾT (6.0 điểm):
    * Câu 1 (2.0 điểm): Viết đoạn văn nghị luận xã hội (khoảng 200 chữ) bàn về một khía cạnh/thông điệp rút ra từ phần Đọc hiểu.
    * Câu 2 (4.0 điểm): Viết bài văn nghị luận văn học phân tích, so sánh hoặc đánh giá về ngữ liệu đã cho.
- HƯỚNG DẪN CHẤM VÀ RUBRIC BAREM ĐIỂM CHI TIẾT:
  + Phần Đọc hiểu: Hướng dẫn chấm chi tiết từng câu hỏi (chấp nhận các cách diễn đạt tương đương nhưng đúng bản chất).
  + Phần Viết: Barem điểm cụ thể: Yêu cầu về hình thức (đúng đoạn văn 200 chữ / bài văn), Đúng vấn đề nghị luận, Triển khai luận điểm và lí lẽ dẫn chứng, Chính tả ngữ pháp, Tính sáng tạo và chiều sâu cảm xúc.
- Hoạt động 4: Kỹ năng nhận diện từ khóa đề bài, phân bố dung lượng viết đoạn văn 200 chữ tránh viết lan man, cách lấy dẫn chứng thực tế thuyết phục.`;
    } else if (isTinHoc) {
      subjectFormatInstructions = `QUY CHUẨN CẤU TRÚC ĐỀ THI VÀ PHIẾU HỌC TẬP MÔN TIN HỌC:
- Phiếu học tập ở Phần IV (Phụ lục) BẮT BUỘC gồm 3 phần:
  + Phần I: Trắc nghiệm 4 lựa chọn (Từ 6 - 8 câu nhận biết, thông hiểu có 4 phương án A, B, C, D).
  + Phần II: Trắc nghiệm Đúng/Sai (Từ 2 - 3 câu; mỗi câu gắn với thuật toán Python, cấu trúc CSDL hoặc an toàn mạng, gồm 4 ý a, b, c, d độc lập).
  + Phần III: Trắc nghiệm Trả lời ngắn (Từ 2 câu điền kết quả code in ra màn hình hoặc kết quả truy vấn SQL).
- Bảng đáp án và LỜI GIẢI CHI TIẾT TOÀN BỘ các câu trong Phiếu học tập (giải thích từng dòng lệnh, vết thực thi thuật toán hoặc giải thích mệnh đề Đúng/Sai).
- Hoạt động 4: Kỹ năng chạy tay thuật toán (Dry run), bẫy chỉ số mảng 0-index, lỗi cú pháp và phạm vi biến.`;
    }

    return `Bạn là chuyên gia thẩm định chương trình giáo dục phổ thông kiêm giáo viên dạy giỏi cốt cán cấp Tỉnh/Thành phố môn ${currentSubject.name}.
Nhiệm vụ của bạn là đóng vai một GIÁO VIÊN CỐT CÁN DẠY GIỎI môn ${currentSubject.name} 12 cấp THPT để soạn một KẾ HOẠCH BÀI DẠY (GIÁO ÁN) ÔN TẬP TĂNG CƯỜNG BUỔI CHIỀU hoàn chỉnh, sâu sắc, chuẩn mực theo Công văn 5512/BGDĐT, bám sát Chương trình GDPT 2018 (sách Kết nối tri thức với cuộc sống và SGK mới) và đúng cấu trúc định dạng đề thi Tốt nghiệp THPT mới nhất của Bộ GD&ĐT để in nộp duyệt tổ chuyên môn.

=========================================
THÔNG TIN ĐẦU VÀO KẾ HOẠCH BÀI DẠY:
- Môn học: ${currentSubject.name} - Lớp 12
- Bộ sách tham chiếu: Kết nối tri thức với cuộc sống (Chương trình GDPT 2018)
- Tên chủ đề/Bài học ôn tập: ${effectiveTopicTitle}
- Tiết PPCT: ${effectivePeriodRange}
- Thời lượng thực dạy: ${periods} tiết (${periods * 45} phút)
- Yêu cầu cần đạt trọng tâm: ${effectiveYccd}
- Ghi chú phân hóa đối tượng: ${effectiveDiffNotes}
- Đối tượng học sinh: ${studentInfo.label} (${studentInfo.desc})
- Cấu trúc đề thi tham chiếu: ${currentSubject.examNote}

=========================================
NGUYÊN TẮC THIẾT KẾ BẮT BUỘC THEO CÔNG VĂN 5512/BGDĐT:
1. Chuẩn thể thức Công văn 5512/BGDĐT: Đủ 3 phần lớn (I. Mục tiêu; II. Thiết bị dạy học và học liệu; III. Tiến trình dạy học) và Phần IV. Phụ lục: Hệ thống phiếu học tập & Đáp án chi tiết / Rubric barem điểm.
   Trong TỪNG HOẠT ĐỘNG của Tiến trình dạy học BẮT BUỘC có đủ 4 mục rõ ràng:
   a) Mục tiêu
   b) Nội dung (Phải chi tiết bảng biểu, công thức, đề bài, dẫn chứng, KHÔNG được tóm tắt sơ sài)
   c) Sản phẩm (Bảng tóm tắt, lời giải chi tiết của học sinh)
   d) Tổ chức thực hiện (Rõ ràng 4 bước: Bước 1: Chuyển giao nhiệm vụ -> Bước 2: Thực hiện nhiệm vụ -> Bước 3: Báo cáo, thảo luận -> Bước 4: Kết luận, nhận định).

2. ĐỦ 5 HOẠT ĐỘNG TRỌNG TÂM CHO BUỔI CHIỀU TĂNG CƯỜNG:
   - Hoạt động 1: Khởi động / Hệ thống hóa kiến thức cốt lõi (Sơ đồ tư duy, bảng so sánh hoặc câu hỏi định hướng, bảng tra nhanh định lý/quy tắc/khái niệm then chốt).
   - Hoạt động 2: Phân loại các dạng kiến thức / dạng bài trọng tâm:
     + Mẹo nhớ, phương pháp nhận diện nhanh từng dạng.
     + MỖI DẠNG BẮT BUỘC CÓ: Ví dụ mẫu có phân tích chi tiết, lời giải từng bước hoàn chỉnh.
     + ${studentTarget === "advanced" ? "TÍCH HỢP BẮT BUỘC các câu hỏi vận dụng cao, phân tích đa chiều, chuyên sâu phân hóa cho nhóm học sinh khá giỏi mục tiêu 8+ đến 10." : "Tập trung các câu hỏi nhận biết, thông hiểu và vận dụng vừa sức cho nhóm học sinh mục tiêu 6.5 - 7.5."}
   - Hoạt động 3: Luyện tập theo Phiếu học tập định dạng đề thi mới (Tổ chức 4 bước CV 5512 cho HS làm việc nhóm xử lý Phiếu học tập rèn luyện).
   - Hoạt động 4: Hướng dẫn kỹ năng làm bài, nhận diện bẫy đề thi và lỗi sai học sinh hay mắc.
   - Hoạt động 5: Vận dụng và Hướng dẫn tự học ở nhà.

=========================================
${subjectFormatInstructions}

=========================================
QUY TẮC HIỂN THỊ CÔNG THỨC TOÁN & KHOA HỌC (NGHIÊM NGẶT):
1. TẤT CẢ công thức, ký hiệu toán học, vật lý, hóa học, biến số đơn lẻ (x, y, z, m, a, b, v, t, F, Δ, π...) BẮT BUỘC đặt trong cặp dấu đô la: $công_thức$ (nội dòng) hoặc $$công_thức$$ (khối riêng).
2. Dùng cú pháp LaTeX chuẩn: \\frac{a}{b}, \\sqrt{...}, \\pi, \\Leftrightarrow, \\ge, \\le, \\in. Luôn dùng \\frac thay vì \\dfrac.
3. Không viết tắt hay dùng text thường cho công thức (ví dụ: không viết "sin x = 0", phải viết "$\\sin x = 0$").
4. Giữ nguyên vẹn font tiếng Việt UTF-8 chuẩn.
5. Cuối kế hoạch bài dạy BẮT BUỘC có khối phê duyệt: Tổ trưởng chuyên môn duyệt và Giáo viên soạn ký tên.

TUYỆT ĐỐI KHÔNG TÓM TẮT, KHÔNG ĐƯỢC GHI '...tương tự giáo viên hướng dẫn'. Bắt buộc viết chi tiết từng lời giải ví dụ mẫu và giải thích toàn bộ các ý a, b, c, d của câu hỏi trắc nghiệm Đúng/Sai.`;
  };

  // Generate Lesson Plan
  const handleGeneratePlan = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    setProgressPercent(10);
    setProgressStage(`Khởi tạo cấu trúc Công văn 5512 môn ${currentSubject.name}...`);

    try {
      const cleanKey = apiKey.trim();
      if (cleanKey) {
        localStorage.setItem(API_KEY_STORAGE, cleanKey);
      }
      const prompt = buildSystemPrompt();

      const t1 = setTimeout(() => {
        setProgressPercent(30);
        setProgressStage(`Đang hệ thống hóa kiến thức cốt lõi môn ${currentSubject.name}...`);
      }, 1200);

      const t2 = setTimeout(() => {
        setProgressPercent(60);
        setProgressStage(`Đang biên soạn câu hỏi ôn thi TN THPT định dạng mới 2025...`);
      }, 3500);

      const t3 = setTimeout(() => {
        setProgressPercent(85);
        setProgressStage("Đang hoàn thiện sản phẩm học tập & phân tích phương án...");
      }, 7000);

      // Call server proxy endpoint to prevent PROXY_GENERATION_DISABLED in client iframe
      const response = await apiFetch("/api/generate-graduation-review-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          model: geminiModel,
          subject: currentSubject.name,
          topic: effectiveTopicName,
          periods: periods,
        }),
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (!response.ok) {
        let errMsg = "Không thể tạo kế hoạch bài dạy ôn tập từ máy chủ AI.";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          errMsg = `Lỗi máy chủ (${response.status}): Vui lòng kiểm tra API Key hoặc thử lại.`;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      const generatedMarkdown = data.result || data.text || "";
      if (!generatedMarkdown) {
        throw new Error("Phản hồi từ AI không có nội dung văn bản hợp lệ.");
      }

      setProgressPercent(100);
      setProgressStage("Đã tạo kế hoạch bài dạy thành công!");
      setResultPlan(generatedMarkdown);
      setActiveTab("preview");
      showToast(`Đã tạo xong kế hoạch ôn tập môn ${currentSubject.name} chuẩn CV 5512!`);
    } catch (err: any) {
      console.error("Lỗi khi sinh KHDH:", err);
      setErrorMsg(
        err?.message || "Đã xảy ra lỗi không xác định khi liên hệ với dịch vụ AI."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(resultPlan);
      showToast("Đã sao chép nội dung Markdown vào bộ nhớ tạm!");
    } catch (err) {
      showToast("Lỗi khi sao chép. Vui lòng chọn văn bản thủ công.");
    }
  };

  // Export to Word (.docx)
  const handleExportWord = async () => {
    if (!previewContainerRef.current) return;
    setIsExportingWord(true);
    try {
      const fileName = `KHDH_OnThi_TN_THPT_${currentSubject.shortName}_${effectiveTopicName
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_")
        .slice(0, 35)}.docx`;
      await exportHtmlToWord(previewContainerRef.current, fileName, "omml");
      showToast("Đã xuất file Word (.docx) với công thức Equation (OMML) thành công!");
    } catch (e: any) {
      console.error("Lỗi xuất file Word:", e);
      showToast("Lỗi khi xuất file Word: " + (e?.message || "Vui lòng thử lại"));
    } finally {
      setIsExportingWord(false);
    }
  };

  // Print or Save as PDF
  const handlePrintPdf = async () => {
    if (!previewContainerRef.current) return;
    try {
      const docTitle = `KHDH_OnThi_TN_THPT_${currentSubject.shortName}_${effectiveTopicName
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_")
        .slice(0, 35)}`;
      await printElement(previewContainerRef.current, docTitle);
    } catch (e) {
      showToast("Không thể mở cửa sổ in/PDF. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 lg:p-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-indigo-700/50 p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <FileCheck className="w-3.5 h-3.5" /> Chuẩn CV 5512/BGDĐT
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <Layers className="w-3.5 h-3.5" /> CT 2018 - Kết nối tri thức
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Target className="w-3.5 h-3.5" /> Đề thi TN THPT 2026-2027
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-indigo-400" />
                Ôn Thi Tốt Nghiệp THPT 12 - Chuẩn CV 5512
              </h1>
              <p className="text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
                Biên soạn Kế hoạch bài dạy ôn tập tăng cường buổi chiều chuẩn Công văn 5512/BGDĐT, bám sát Khung PPCT 105 tiết Toán 12 (2026-2027), tích hợp đề thi định dạng mới (3 phần) và công thức MathJax chuẩn mực.
              </p>
            </div>

            {/* Quick action: Load sample */}
            <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const sample = getSampleLessonPlan(selectedSubjectId);
                  setResultPlan(sample);
                  setActiveTab("preview");
                  showToast(`Đã nạp Kế hoạch bài dạy mẫu môn ${currentSubject.name} chuẩn CV 5512!`);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Xem giáo án mẫu môn {currentSubject.shortName} (CV 5512)
              </button>
            </div>
          </div>
        </div>

        {/* Configuration & Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Thiết lập thông số giáo án ôn tập
              </h2>

              {/* 1. Subject Selector: All 10 graduation exam subjects */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    1. Môn thi Tốt nghiệp THPT
                  </label>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    Mặc định: {currentSubject.name}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {GRADUATION_SUBJECTS.map((sub) => {
                    const isSelected = sub.id === selectedSubjectId;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubjectChange(sub.id)}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-300"
                            : "bg-slate-900/70 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                        title={sub.name}
                      >
                        <SubjectIcon iconName={sub.iconName} className="w-4 h-4" />
                        <span className="text-[11px] font-semibold truncate max-w-full">
                          {sub.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-indigo-400 font-bold shrink-0">Cấu trúc đề thi:</span>
                  <span>{currentSubject.examNote}</span>
                </div>
              </div>

              {/* 2. Mode Selection: 3 flexible input mechanisms */}
              <div className="space-y-3 pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    2. Cơ chế nạp Kế hoạch ôn tập
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {currentSubject.topics.length} bài PPCT
                  </span>
                </div>

                {/* 3 Mode buttons */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInputMode("ppct105")}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      inputMode === "ppct105"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{currentSubject.id === "toan" ? "Khung PPCT 105 tiết" : "PPCT chuẩn SGK"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("file_ppct")}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      inputMode === "file_ppct"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Tệp PPCT tải lên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("custom")}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      inputMode === "custom"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Tự nhập chủ đề</span>
                  </button>
                </div>

                {/* Mode 1: Chọn bài từ Khung PPCT 105 tiết */}
                {inputMode === "ppct105" && (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">Danh mục bài học ({currentSubject.topics.length} bài):</span>
                      <span className="text-[11px] text-indigo-400">{currentSubject.curriculum}</span>
                    </div>

                    {/* Filter / Search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={topicSearchKeyword}
                        onChange={(e) => setTopicSearchKeyword(e.target.value)}
                        placeholder="Tìm bài học (VD: đơn điệu, tích phân, toạ độ, tối ưu...)"
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>

                    {/* Select Dropdown */}
                    <select
                      value={selectedMathTopicId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const found = currentSubject.topics.find((t) => t.id === targetId);
                        if (found) handleSelectTopicItem(found);
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {currentSubject.topics
                        .filter(
                          (t) =>
                            !topicSearchKeyword.trim() ||
                            t.title.toLowerCase().includes(topicSearchKeyword.toLowerCase()) ||
                            t.desc.toLowerCase().includes(topicSearchKeyword.toLowerCase()) ||
                            (t.periodRange && t.periodRange.includes(topicSearchKeyword))
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.order ? `[Bài ${t.order}] ` : ""}{t.title} {t.periodRange ? `(Tiết ${t.periodRange})` : ""}
                          </option>
                        ))}
                    </select>

                    {/* Rich card for active topic */}
                    <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-indigo-300">{currentMathTopic.title}</span>
                        {currentMathTopic.periodRange && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 shrink-0">
                            Tiết PPCT: {currentMathTopic.periodRange}
                          </span>
                        )}
                      </div>
                      {currentMathTopic.learningOutcomes && (
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <span className="text-emerald-400 font-semibold">Yêu cầu cần đạt: </span>
                          {currentMathTopic.learningOutcomes}
                        </p>
                      )}
                      {currentMathTopic.differentiatedNotes && (
                        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/30 text-[11px] text-amber-200/90 leading-tight">
                          <span className="font-semibold text-amber-300">Ghi chú phân hóa: </span>
                          {currentMathTopic.differentiatedNotes}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 2: Tệp PPCT đính kèm / Tải lên */}
                {inputMode === "file_ppct" && (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-700/80 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white">{attachedFileName}</div>
                          <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã nạp bảng 35 bài ôn thi TN 105 tiết (2026-2027)
                          </div>
                        </div>
                      </div>
                      <a
                        href={attachedPdfPath}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" /> Xem PDF
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-300">Chọn nhanh bài học từ tệp kế hoạch PDF:</div>
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5">
                        {currentSubject.topics.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelectTopicItem(t)}
                            className={`w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-2 ${
                              selectedMathTopicId === t.id
                                ? "bg-indigo-600/30 border-indigo-500 text-white font-medium"
                                : "bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="truncate">{t.title}</span>
                            <span className="text-[10px] text-indigo-400 shrink-0 font-mono">
                              Tiết {t.periodRange || t.defaultPeriods}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 3: Tự nhập chủ đề ôn tập bất kỳ */}
                {inputMode === "custom" && (
                  <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Tên chuyên đề / bài học ôn tập:
                      </label>
                      <input
                        type="text"
                        value={customTopicTitle}
                        onChange={(e) => setCustomTopicTitle(e.target.value)}
                        placeholder="VD: Kỹ thuật xử lý bài toán tối ưu thực tế và min-max hình học không gian"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Tiết theo PPCT:</label>
                        <input
                          type="text"
                          value={customPeriodRange}
                          onChange={(e) => setCustomPeriodRange(e.target.value)}
                          placeholder="VD: Tiết 12 – 14 hoặc Tiết bổ trợ"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Số tiết thực dạy:</label>
                        <select
                          value={periods}
                          onChange={(e) => setPeriods(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {PERIOD_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.value} tiết ({p.value * 45} phút)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Yêu cầu cần đạt trọng tâm:</label>
                      <textarea
                        rows={2}
                        value={customFocusGoals}
                        onChange={(e) => setCustomFocusGoals(e.target.value)}
                        placeholder="VD: Nắm vững quy trình thiết lập hàm mục tiêu và giải quyết bài toán tối ưu thực tiễn..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Duration Selector (Allows custom override of periods) */}
              <div className="space-y-2 pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    3. Số tiết thực dạy (Tùy chỉnh)
                  </label>
                  <span className="text-[11px] text-indigo-400">
                    PPCT: {currentMathTopic.defaultPeriods || 3} tiết
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPeriods(opt.value)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        periods === opt.value
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold"
                          : "bg-slate-900/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.value}T</div>
                      <div className="text-[9px] text-slate-400">{opt.value * 45}p</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Target Level */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  4. Đối tượng học sinh & Mức độ yêu cầu
                </label>
                <div className="space-y-2">
                  {STUDENT_LEVELS.map((level) => (
                    <label
                      key={level.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        studentTarget === level.id
                          ? "bg-slate-900 border-indigo-500/80 ring-1 ring-indigo-500/40"
                          : "bg-slate-900/50 border-slate-700/70 hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="studentLevel"
                        value={level.id}
                        checked={studentTarget === level.id}
                        onChange={() => setStudentTarget(level.id)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                      />
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-slate-200">{level.label}</div>
                        <div className="text-slate-400 text-[11px] leading-relaxed">
                          {level.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Checkbox: New exam question formats */}
              <div className="pt-2 border-t border-slate-700">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExamFormats}
                    onChange={(e) => setIncludeExamFormats(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold text-indigo-200 block">
                      Kèm phiếu bài tập theo định dạng Đề thi TN THPT mới (2025)
                    </span>
                    <span className="text-slate-400 text-[11px] block leading-relaxed">
                      Áp dụng đúng thể thức của Bộ GD&ĐT cho môn {currentSubject.name}: {currentSubject.examNote}.
                    </span>
                  </div>
                </label>
              </div>

              {/* API Key & AI Model Configuration */}
              <div className="pt-2 border-t border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Google Gemini API Key
                  </label>
                  <span className="text-[11px] text-slate-400">Tự động lưu trình duyệt</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Dán mã AI Studio API Key (AIzaSy...)"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                </div>

                {/* AI Model Selector with dynamic account refresh */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <span>Mô hình AI:</span>
                      {modelsFetchedFromAccount && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-[10px]">
                          <Check className="w-2.5 h-2.5" /> Từ tài khoản Google của bạn
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchAvailableModels(apiKey, true)}
                      disabled={isFetchingModels || !apiKey.trim()}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-40 transition-colors"
                      title="Làm mới danh sách mô hình từ API Key"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingModels ? "animate-spin" : ""}`} />
                      <span>{isFetchingModels ? "Đang đồng bộ..." : "Làm mới mô hình"}</span>
                    </button>
                  </div>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.desc ? `— ${m.desc}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    * Đã cập nhật các mô hình AI mới nhất (Gemini 2.5, 3.8, 3.1) và loại bỏ hoàn toàn các mô hình cũ đã hết hỗ trợ.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGeneratePlan}
                className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all ${
                  isLoading
                    ? "bg-indigo-700/60 cursor-not-allowed text-indigo-200"
                    : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.99]"
                }`}
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Đang biên soạn KHDH môn {currentSubject.shortName}... ({progressPercent}%)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Tạo kế hoạch bài dạy ôn thi ({currentSubject.shortName})</span>
                  </>
                )}
              </button>

              {/* Progress Bar when loading */}
              {isLoading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-indigo-300">
                    <span>{progressStage}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Result Preview Panel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[600px]">
              {/* Preview Header & Tab Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === "preview"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Bản hiển thị công thức (MathJax)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("markdown")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeTab === "markdown"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Mã nguồn Markdown
                  </button>
                </div>

                {/* Export & Copy Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    title="Sao chép toàn bộ mã Markdown"
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sao chép</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWord}
                    disabled={isExportingWord}
                    title="Xuất kế hoạch bài dạy sang file Word (.docx)"
                    className="p-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                  >
                    {isExportingWord ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Xuất Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    title="In hoặc Lưu thành PDF"
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">In / PDF</span>
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              <div className="flex-1 mt-4 overflow-y-auto max-h-[750px] pr-2 custom-scrollbar">
                {activeTab === "preview" ? (
                  <div
                    ref={previewContainerRef}
                    className="bg-white text-slate-900 p-6 md:p-8 rounded-xl shadow-inner font-serif leading-relaxed text-sm md:text-base border border-slate-200"
                    style={{ fontFamily: "'Times New Roman', serif" }}
                  >
                    <MarkdownRenderer content={resultPlan} />
                  </div>
                ) : (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed select-all">
                      {resultPlan}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom Quick Footnote */}
              <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Chuẩn 4 bước Công văn 5512: Chuyển giao → Thực hiện → Báo cáo → Kết luận.
                </span>
                <span className="text-[11px] text-slate-500">
                  Hiển thị công thức Toán bằng MathJax 3 ($...$ và $$...$$), tương thích Word MathType & OMML.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraduationReviewPlannerModule;
