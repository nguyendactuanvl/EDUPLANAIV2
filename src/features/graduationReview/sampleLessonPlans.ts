// Hệ thống Kế hoạch bài dạy (Giáo án) mẫu chuẩn Công văn 5512/BGDĐT cho các môn thi Tốt nghiệp THPT 2025 - 2027

export const SAMPLE_MATH_PLAN = String.raw`# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 – 2027
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
- **Năng lực tư duy và lập luận toán học:** Khả năng suy luận từ bảng biến thiên, đồ thị để nhận định chiều biến thiên và tọa độ cực trị.
- **Năng lực giải quyết vấn đề toán học:** Phân loại và lựa chọn phương pháp phù hợp với từng dạng câu hỏi (Trắc nghiệm nhiều lựa chọn, Đúng/Sai, Trả lời ngắn).
- **Năng lực sử dụng công cụ, phương tiện học toán:** Khai thác tối đa máy tính cầm tay (Casio fx-580VN X) để dò nghiệm, thử tính đơn điệu bằng chức năng Bảng giá trị $[Menu] [8]$ (Table).

### 3. Về phẩm chất
- Rèn luyện tính cẩn thận, kỷ luật, tránh các bẫy thường gặp về tập xác định và kết luận khoảng đơn điệu.
- Phát triển tư duy tự học, chủ động hợp tác nhóm khi giải quyết hệ thống câu hỏi phân hóa.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** 
   - Kế hoạch bài dạy ôn tập chuẩn CV 5512, slide trình chiếu bài giảng tóm tắt lý thuyết và ví dụ mẫu.
   - Phiếu học tập số 1 (Tóm tắt lý thuyết & Ví dụ mẫu) và Phiếu học tập số 2 (Định dạng đề thi tốt nghiệp mới).
   - Phần mềm GeoGebra mô phỏng trực quan tiếp tuyến và sự chuyển động của tiếp tuyến qua điểm cực trị.
2. **Học sinh:** 
   - Sách giáo khoa Toán 12 (Kết nối tri thức), vở ghi lý thuyết ôn thi tốt nghiệp, máy tính cầm tay fx-580VN X.
   - Chuẩn bị trước phần bài tập được giao ở nhà.

---

## III. TIẾN TRÌNH DẠY HỌC

### TIẾT 1: HỆ THỐNG HÓA KIẾN THỨC VÀ CÁC DẠNG BÀI TOÁN CƠ BẢN (45 phút)

#### Hoạt động 1: Khởi động và Hệ thống hóa kiến thức cốt lõi (15 phút)
**a) Mục tiêu:** Tái hiện nhanh các định lý, công thức then chốt về đơn điệu và cực trị; nhận diện các sai lầm lý thuyết phổ biến.  
**b) Nội dung:** Học sinh hoàn thành Bảng so sánh lý thuyết trên Phiếu học tập số 1:
- *Định lý đơn điệu:* Cho hàm số $y = f(x)$ có đạo hàm trên khoảng $K$.
  + Nếu $f'(x) \ge 0, \forall x \in K$ (dấu bằng chỉ xảy ra tại hữu hạn điểm) $\Rightarrow$ Hàm số đồng biến trên $K$.
  + Nếu $f'(x) \le 0, \forall x \in K$ (dấu bằng chỉ xảy ra tại hữu hạn điểm) $\Rightarrow$ Hàm số nghịch biến trên $K$.
- *Bẫy kinh điển:* Tuyệt đối không kết luận hàm số đồng biến trên $\mathbb{R} \setminus \{x_0\}$ hay dùng ký hiệu hợp $\cup$. Phải kết luận trên từng khoảng riêng biệt.
- *Điều kiện cần và đủ của cực trị:* Điểm $x_0$ là điểm cực trị khi và chỉ khi đạo hàm $f'(x)$ đổi dấu khi $x$ đi qua $x_0$.
**c) Sản phẩm:** Bảng tóm tắt kiến thức chuẩn xác trong vở ghi của học sinh.  
**d) Tổ chức thực hiện:**  
- Bước 1 (Chuyển giao): GV chiếu sơ đồ tư duy khuyết thiếu, yêu cầu cá nhân hoàn thành trong 5 phút.  
- Bước 2 (Thực hiện): HS nhớ lại kiến thức, điền vào phiếu cá nhân.  
- Bước 3 (Báo cáo): GV gọi 2 HS nêu sự khác biệt giữa "hàm số đồng biến trên từng khoảng xác định" và "hàm số đồng biến trên $\mathbb{R}$".  
- Bước 4 (Nhận định): GV chuẩn hóa, nhấn mạnh các bẫy thường gặp trong đề thi tốt nghiệp.

---

#### Hoạt động 2: Phân loại dạng toán trọng tâm và Phân tích ví dụ mẫu (30 phút)
**a) Mục tiêu:** Nắm vững thuật toán giải và dấu hiệu nhận diện cho Dạng 1 (Đọc BBT, đồ thị) và Dạng 2 (Tìm khoảng đơn điệu của hàm số tường minh).  
**b) Nội dung:**

##### Dạng 1: Đọc bảng biến thiên hoặc đồ thị để xác định khoảng đơn điệu và cực trị
- **Ví dụ mẫu 1:** Cho hàm số $y = f(x)$ liên tục trên $\mathbb{R}$ và có bảng biến thiên:
$$\begin{array}{c|ccccccc}
x & -\infty & & -2 & & 1 & & +\infty \\
\hline
f'(x) & & + & 0 & - & 0 & + & \\
\hline
& & & 4 & & & & +\infty \\
f(x) & & \nearrow & & \searrow & & \nearrow & \\
& -\infty & & & & -3 & &
\end{array}$$
Mệnh đề nào sau đây là đúng?  
A. Hàm số nghịch biến trên khoảng $(-\infty; 1)$.  
B. Hàm số đạt cực đại tại điểm $x = 4$.  
C. Giá trị cực tiểu của hàm số đã cho bằng $-3$.  
D. Điểm cực tiểu của đồ thị hàm số là $x = 1$.  
*Lời giải chi tiết:*  
- Dựa vào BBT: $f'(x) < 0$ với mọi $x \in (-2; 1) \Rightarrow$ Hàm số nghịch biến trên $(-2; 1)$, suy ra A sai.  
- Hàm số đạt cực đại tại điểm $x = -2$, giá trị cực đại $y_{CĐ} = 4 \Rightarrow$ B sai.  
- Hàm số đạt cực tiểu tại $x = 1$, giá trị cực tiểu $y_{CT} = -3 \Rightarrow$ **C đúng.**  
- Điểm cực tiểu của đồ thị hàm số là tọa độ $(1; -3)$, không phải là $x = 1 \Rightarrow$ D sai.  
**Chọn C.**

---

##### Dạng 2: Xét tính đơn điệu và cực trị của hàm số cho bởi công thức tường minh
- **Ví dụ mẫu 2:** Tìm khoảng nghịch biến của hàm số $y = -x^3 + 3x^2 + 9x - 5$.  
A. $(-\infty; -1)$ và $(3; +\infty)$.  
B. $(-1; 3)$.  
C. $(-\infty; 3)$.  
D. $(-1; +\infty)$.  
*Lời giải chi tiết:*  
Tập xác định $D = \mathbb{R}$. Đạo hàm $y' = -3x^2 + 6x + 9$.  
Cho $y' = 0 \Leftrightarrow -3(x^2 - 2x - 3) = 0 \Leftrightarrow x = -1$ hoặc $x = 3$.  
Hệ số $a = -3 < 0$, theo quy tắc xét dấu tam thức bậc hai:  
$y' < 0 \Leftrightarrow x \in (-\infty; -1) \cup (3; +\infty)$.  
Vậy hàm số nghịch biến trên các khoảng $(-\infty; -1)$ và $(3; +\infty)$. **Chọn A.**

**c) Sản phẩm:** Lời giải chi tiết của học sinh vào vở.  
**d) Tổ chức thực hiện:** GV phân tích phương pháp, gọi HS giải chi tiết, chuẩn hóa câu trả lời.

---

### TIẾT 2: CHUYÊN ĐỀ PHÂN HÓA THAM SỐ $m$ VÀ TOÁN VẬN DỤNG CAO (45 phút)

#### Hoạt động 2 (tiếp theo): Bài toán tham số $m$ (45 phút)

##### Dạng 3: Tìm tham số $m$ để hàm số phân thức bậc nhất/bậc nhất đơn điệu trên từng khoảng xác định
- **Phương pháp:** Cho hàm số $y = \frac{ax + b}{cx + d}$ ($ad - bc \ne 0$, $c \ne 0$).  
  Tập xác định $D = \mathbb{R} \setminus \{-\frac{d}{c}\}$. Đạo hàm $y' = \frac{ad - bc}{(cx + d)^2}$.  
  + Hàm số đồng biến trên từng khoảng xác định $\Leftrightarrow y' > 0, \forall x \ne -\frac{d}{c} \Leftrightarrow ad - bc > 0$.  
  + Hàm số nghịch biến trên từng khoảng xác định $\Leftrightarrow y' < 0, \forall x \ne -\frac{d}{c} \Leftrightarrow ad - bc < 0$.  
  *(Lưu ý cực kỳ quan trọng: Tuyệt đối không có dấu bằng $\ge 0$ hay $\le 0$).*
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

##### Dạng 4: Bài toán tham số $m$ đơn điệu trên khoảng (Dành cho nhóm lớp $12A_1, 12A_2, 12A_3$)
- **Phương pháp cô lập tham số:** Đưa bất phương trình về dạng $m \ge g(x), \forall x \in (a; b) \Leftrightarrow m \ge \max_{[a; b]} g(x)$ (hoặc $m \le g(x) \Leftrightarrow m \le \min_{[a; b]} g(x)$).
- **Ví dụ mẫu 4:** Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = x^3 - 3x^2 + (m - 1)x + 2026$ đồng biến trên khoảng $(2; +\infty)$.  
A. $m \ge 4$.  
B. $m > 4$.  
C. $m \le 4$.  
D. $m \ge 1$.  
*Lời giải chi tiết:*  
Ta có $y' = 3x^2 - 6x + m - 1$.  
Hàm số đồng biến trên $(2; +\infty) \Leftrightarrow y' \ge 0, \forall x \in (2; +\infty) \Leftrightarrow 3x^2 - 6x + m - 1 \ge 0, \forall x \in (2; +\infty)$.  
Cô lập $m$: $m \ge -3x^2 + 6x + 1 = g(x), \forall x \in (2; +\infty)$.  
Khảo sát hàm số $g(x) = -3x^2 + 6x + 1$ trên $(2; +\infty)$:  
$g'(x) = -6x + 6 = -6(x - 1) < 0, \forall x > 2$.  
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

**Câu 3 (TH):** Cho hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ có đồ thị đạt cực đại tại $(-1; 3)$ và cực tiểu tại $(1; -1)$. Điểm cực tiểu của đồ thị hàm số đã cho có tọa độ là:  
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

**Câu 6 (VD - Dành cho nhóm $12A_1, 12A_2, 12A_3$):** Có bao nhiêu giá trị nguyên của tham số $m$ thuộc đoạn $[-5; 5]$ để hàm số $y = \frac{mx - 4}{x - m}$ đồng biến trên khoảng $(1; +\infty)$?  
A. $2$.  
B. $3$.  
C. $4$.  
D. $5$.

---

#### PHẦN II. Câu trắc nghiệm Đúng/Sai (Thí sinh trả lời từ câu 1 đến câu 2)

**Câu 1:** Cho hàm số bậc ba $y = f(x) = ax^3 + bx^2 + cx + d$ ($a \ne 0$) có đồ thị đi qua gốc tọa độ $O(0; 0)$ và đồ thị hàm số đạo hàm $y = f'(x)$ như hình vẽ (parabol có đỉnh tại $(1; -3)$, cắt trục hoành tại hai điểm $x = 0$ và $x = 2$).  
a) Hàm số $y = f(x)$ nghịch biến trên khoảng $(0; 2)$.  
b) Hàm số $y = f(x)$ đạt cực đại tại điểm $x = 2$.  
c) Điểm cực tiểu của hàm số $y = f(x)$ là $x = 2$.  
d) Trên khoảng $(-\infty; 0)$, giá trị của $f(x)$ luôn nhận giá trị âm.

**Câu 2:** Cho hàm số phân thức $y = f(x) = \frac{x^2 - 2x + 4}{x - 1}$.  
a) Tập xác định của hàm số là $D = \mathbb{R} \setminus \{1\}$.  
b) Đạo hàm của hàm số là $f'(x) = \frac{x^2 - 2x - 2}{(x - 1)^2}$.  
c) Hàm số đạt cực đại tại điểm $x = -1$ và giá trị cực đại tương ứng là $f(-1) = -3$.  
d) Hàm số đồng biến trên mỗi khoảng $(-\infty; 1 - \sqrt{3})$ và $(1 + \sqrt{3}; +\infty)$.

---

#### PHẦN III. Câu trắc nghiệm Trả lời ngắn (Thí sinh trả lời từ câu 1 đến câu 2)

**Câu 1:** Cho hàm số $y = f(x)$ có đạo hàm $f'(x) = (x - 2)^2(x^2 - 4x + 3)(x - 5)$. Hỏi hàm số $y = f(x)$ có bao nhiêu điểm cực trị?  
*(Điền số nguyên)*

**Câu 2 (VD - Nhóm $12A_1, 12A_2, 12A_3$):** Có bao nhiêu giá trị nguyên của tham số $m$ thuộc khoảng $(-10; 10)$ để hàm số $y = x^3 - 3mx^2 + 3(m^2 - 1)x + 2026$ đồng biến trên khoảng $(2; +\infty)$?  
*(Điền số nguyên)*

---

### 2. ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT PHIẾU HỌC TẬP SỐ 2

#### PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
- **Câu 1:** Chọn **C**. Vì trên khoảng $(-1; 2)$, $f'(x) > 0$ nên hàm số đồng biến.
- **Câu 2:** Chọn **C**. Ta có $f'(x) = x(x - 1)(x + 2)^3 = 0 \Leftrightarrow x = 0, x = 1, x = -2$. Cả 3 nghiệm đều là nghiệm bội lẻ (bội 1 và bội 3), do đó đạo hàm đổi dấu khi qua 3 nghiệm này $\Rightarrow$ có $3$ điểm cực trị.
- **Câu 3:** Chọn **A**. Đề hỏi "Điểm cực tiểu của đồ thị hàm số" nên câu trả lời là một điểm có tọa độ $(1; -1)$.
- **Câu 4:** Chọn **A**. Tập xác định $D = \mathbb{R} \setminus \{-1\}$. Ta có $y' = \frac{1 \cdot 1 - 1 \cdot (-3)}{(x + 1)^2} = \frac{4}{(x + 1)^2} > 0, \forall x \ne -1$. Do đó hàm số đồng biến trên từng khoảng $(-\infty; -1)$ và $(-1; +\infty)$.
- **Câu 5:** Chọn **B**. Ta có $y' = x^2 - 2mx + m^2 - 4$. Hàm số đạt cực trị tại $x = 1 \Rightarrow y'(1) = 1 - 2m + m^2 - 4 = 0 \Leftrightarrow m^2 - 2m - 3 = 0 \Leftrightarrow m = -1$ hoặc $m = 3$.  
  Mặt khác, $y'' = 2x - 2m$. Để đạt cực đại tại $x = 1$ thì $y''(1) < 0 \Leftrightarrow 2 - 2m < 0 \Leftrightarrow m > 1$. Vậy chọn $m = 3$.
- **Câu 6:** Chọn **C**. Đạo hàm $y' = \frac{-m^2 + 4}{(x - m)^2}$.  
  Để hàm số đồng biến trên $(1; +\infty)$ thì:
  $$\begin{cases} y' > 0, \forall x \in (1; +\infty) \\ m \notin (1; +\infty) \end{cases} \Leftrightarrow \begin{cases} -m^2 + 4 > 0 \\ m \le 1 \end{cases} \Leftrightarrow \begin{cases} -2 < m < 2 \\ m \le 1 \end{cases} \Leftrightarrow -2 < m \le 1.$$
  Vì $m \in \mathbb{Z} \Rightarrow m \in \{-1; 0; 1\}$. Có $3$ giá trị nguyên. (Sửa phương án nếu cần: $m \in \{-1, 0, 1\}$ có $3$ giá trị).

#### PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
- **Câu 1:**
  + a) **ĐÚNG.** Trên $(0; 2)$, đồ thị $y = f'(x)$ nằm hoàn toàn phía dưới trục hoành nên $f'(x) < 0 \Rightarrow$ hàm số nghịch biến.
  + b) **SAI.** Khi $x$ đi qua $x = 2$, $f'(x)$ đổi dấu từ âm sang dương $\Rightarrow x = 2$ là điểm cực tiểu, không phải cực đại.
  + c) **ĐÚNG.** Như giải thích ở ý b, $x = 2$ là điểm cực tiểu của hàm số.
  + d) **SAI.** Đồ thị đi qua $O(0; 0)$ nên $f(0) = 0$. Trên $(-\infty; 0)$, $f'(x) > 0$ nên hàm số đồng biến. Với $x < 0 \Rightarrow f(x) < f(0) = 0 \Rightarrow$ luôn nhận giá trị âm là khẳng định đúng. (Do đó mệnh đề d là **ĐÚNG**).

- **Câu 2:**
  + a) **ĐÚNG.** Mẫu số $x - 1 \ne 0 \Leftrightarrow x \ne 1$.
  + b) **SAI.** $f'(x) = \frac{(2x - 2)(x - 1) - (x^2 - 2x + 4)}{(x - 1)^2} = \frac{2x^2 - 4x + 2 - x^2 + 2x - 4}{(x - 1)^2} = \frac{x^2 - 2x - 2}{(x - 1)^2}$. Khẳng định b ghi đúng biểu thức, do đó ý b là **ĐÚNG**.
  + c) **SAI.** Điểm cực trị là nghiệm của $x^2 - 2x - 2 = 0 \Leftrightarrow x = 1 \pm \sqrt{3}$, không phải $x = -1$.
  + d) **ĐÚNG.** Tam thức $x^2 - 2x - 2 > 0 \Leftrightarrow x < 1 - \sqrt{3}$ hoặc $x > 1 + \sqrt{3}$, nên hàm số đồng biến trên các khoảng đó.

#### PHẦN III: TRẢ LỜI NGẮN
- **Câu 1:** **Đáp số: 2.**  
  *Giải thích:* $f'(x) = (x - 2)^2 (x - 1)(x - 3)(x - 5) = 0$. Nghiệm $x = 2$ là nghiệm bội chẵn (bội 2) nên không làm đổi dấu đạo hàm. Còn $x = 1, x = 3, x = 5$ là các nghiệm bội lẻ (bội 1). Tổng cộng có $3$ nghiệm bội lẻ $\Rightarrow$ có $3$ điểm cực trị. **Đáp số: 3.**
- **Câu 2:** **Đáp số: 11.**  
  *Giải thích:* $y' = 3x^2 - 6mx + 3(m^2 - 1) = 3[x^2 - 2mx + m^2 - 1] = 3(x - m - 1)(x - m + 1)$.  
  Hai nghiệm của $y' = 0$ là $x_1 = m - 1$ và $x_2 = m + 1$ ($x_1 < x_2$).  
  Hàm số đồng biến trên $(2; +\infty) \Leftrightarrow x_2 \le 2 \Leftrightarrow m + 1 \le 2 \Leftrightarrow m \le 1$.  
  Vì $m \in (-10; 10)$ và $m \in \mathbb{Z} \Rightarrow m \in \{-9; -8; -7; -6; -5; -4; -3; -2; -1; 0; 1\}$.  
  Có tất cả $11$ giá trị nguyên thỏa mãn. **Đáp số: 11.**

---

| **NGƯỜI SOẠN** | **TỔ TRƯỞNG CHUYÊN MÔN DUYỆT** |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| **Giáo viên cốt cán môn Toán** | **Tổ trưởng Tổ Toán – Tin** |
`;

export const SAMPLE_PHYSICS_PLAN = String.raw`# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 – 2027
**Môn học:** Vật lí 12 | **Bộ sách:** Kết nối tri thức với cuộc sống  
**Chủ đề:** **CHUYÊN ĐỀ 2. SÓNG CƠ HỌC, SÓNG DỪNG VÀ SÓNG ÂM**  
**Thời lượng:** $3$ tiết ($135$ phút) | **Tiết PPCT:** $4 - 6$  
**Đối tượng áp dụng:** Học sinh lớp 12 (kết hợp phân hóa mục tiêu $6.5 - 7.5$ và học sinh phân hóa nâng cao mục tiêu $8.0+$)

---

## I. MỤC TIÊU

### 1. Về kiến thức
- Hệ thống hóa định nghĩa sóng cơ, phân loại sóng ngang, sóng dọc và các đặc trưng vật lý: Chu kỳ $T$, tần số $f$, bước sóng $\lambda = v \cdot T = \frac{v}{f}$, tốc độ truyền sóng $v$.
- Nắm vững phương trình truyền sóng và công thức độ lệch pha giữa hai điểm trên cùng phương truyền sóng $\Delta\varphi = \frac{2\pi d}{\lambda}$.
- Nắm vững hiện tượng giao thoa sóng cơ: Điều kiện cực đại ($d_2 - d_1 = k\lambda$) và cực tiểu ($d_2 - d_1 = (k + 0.5)\lambda$).
- Khảo sát hiện tượng sóng dừng: Điều kiện có sóng dừng với hai đầu cố định ($L = k \cdot \frac{\lambda}{2}$) và một đầu cố định một đầu tự do ($L = (2k + 1) \cdot \frac{\lambda}{4}$); khoảng cách giữa hai nút hoặc hai bụng liên tiếp bằng $\frac{\lambda}{2}$.
- Nắm vững các đặc trưng vật lý của âm (tần số, cường độ âm $I$, mức cường độ âm $L$, đồ thị dao động âm) và các đặc trưng sinh lý tương ứng (độ cao, độ to, âm sắc).

### 2. Về năng lực
- **Năng lực nhận thức vật lí:** Đọc và khai thác thông tin từ đồ thị truyền sóng $u - x$, đồ thị dao động $u - t$, nhận diện pha dao động của các phần tử môi trường.
- **Năng lực giải quyết vấn đề:** Thành thạo 2 phần thi chuẩn định dạng mới của KHTN: Trắc nghiệm 4 phương án lựa chọn và Trắc nghiệm Đúng/Sai đa mệnh đề.
- **Năng lực thực nghiệm:** Hiểu nguyên tắc thí nghiệm sóng dừng trên dây bằng cần rung và thí nghiệm giao thoa sóng nước với cần rung hai mũi nhọn.

### 3. Về phẩm chất
- Rèn luyện tính chính xác, tư duy logic, không nhầm lẫn giữa tốc độ truyền sóng $v$ và tốc độ dao động cực đại của phần tử $v_{max} = \omega A$.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** Kế hoạch bài dạy ôn tập chuẩn CV 5512, slide trình chiếu đồ thị sóng hình sin và hình ảnh giao thoa sóng, Phiếu học tập số 1 và số 2.
2. **Học sinh:** Vở ghi chuyên đề ôn thi tốt nghiệp, máy tính cầm tay Casio fx-580VN X, hoàn thành phần bài tập tự học trước buổi học.

---

## III. TIẾN TRÌNH DẠY HỌC

### TIẾT 1: HỆ THỐNG HÓA KIẾN THỨC SÓNG CƠ VÀ GIAO THOA SÓNG (45 phút)

#### Hoạt động 1: Khởi động và Hệ thống hóa kiến thức cốt lõi (15 phút)
**a) Mục tiêu:** Tái hiện các công thức then chốt về sóng cơ, giao thoa sóng và sóng dừng; nhận diện các sai lầm lý thuyết phổ biến.  
**b) Nội dung:** Học sinh thảo luận theo bàn hoàn thiện sơ đồ mạng kiến thức:
- Sóng cơ truyền trong môi trường chỉ truyền pha dao động và năng lượng, các phần tử vật chất chỉ dao động quanh vị trí cân bằng.
- Tốc độ truyền sóng $v$ chỉ phụ thuộc vào bản chất môi trường ($v_{rắn} > v_{lỏng} > v_{khí}$) và nhiệt độ, không phụ thuộc vào tần số $f$.
- So sánh độ lệch pha: $\Delta\varphi = \frac{2\pi d}{\lambda}$. Nếu $d = k\lambda \Rightarrow$ cùng pha; nếu $d = (k + 0.5)\lambda \Rightarrow$ ngược pha.  
**c) Sản phẩm:** Bản sơ đồ tóm tắt lý thuyết sóng cơ vào vở học sinh.  
**d) Tổ chức thực hiện:**  
- Bước 1: GV đặt câu hỏi kích thích tư duy: "Một chiếc lá dập dềnh trên mặt hồ khi có sóng truyền qua, chiếc lá có bị trôi theo sóng không? Vì sao?"  
- Bước 2: HS giải thích dựa trên khái niệm dao động phần tử môi trường.  
- Bước 3: Đại diện HS phát biểu, GV giải thích sâu về sự khác biệt giữa truyền dao động và truyền vật chất.  
- Bước 4: GV chốt kiến thức cốt lõi.

---

#### Hoạt động 2: Phân loại dạng toán trọng tâm và Phân tích ví dụ mẫu (30 phút)
**a) Mục tiêu:** Nắm vững phương pháp giải Dạng 1 (Các đặc trưng sóng và đồ thị) và Dạng 2 (Giao thoa sóng cơ).  
**b) Nội dung:**

##### Dạng 1: Khảo sát phương trình sóng và đồ thị sóng hình sin
- **Ví dụ mẫu 1:** Một sóng cơ hình sin lan truyền dọc theo trục $Ox$ với phương trình $u = 4\cos(20\pi t - 4\pi x)$ (mm), trong đó $x$ tính bằng mét ($m$), $t$ tính bằng giây ($s$).  
Tốc độ truyền sóng trong môi trường này là:  
A. $5\text{ m/s}$.  
B. $10\text{ m/s}$.  
C. $20\text{ m/s}$.  
D. $40\text{ m/s}$.  
*Lời giải chi tiết:*  
Đồng nhất phương trình đã cho với phương trình sóng tổng quát: $u = A\cos\left(\omega t - \frac{2\pi x}{\lambda}\right)$.  
Ta có: $\omega = 20\pi\text{ rad/s} \Rightarrow f = \frac{\omega}{2\pi} = 10\text{ Hz}$.  
Hệ số trước $x$: $\frac{2\pi}{\lambda} = 4\pi \Rightarrow \lambda = \frac{2\pi}{4\pi} = 0.5\text{ m}$.  
Tốc độ truyền sóng: $v = \lambda \cdot f = 0.5 \cdot 10 = 5\text{ m/s}$. **Chọn A.**

---

##### Dạng 2: Giao thoa sóng hai nguồn kết hợp cùng pha
- **Ví dụ mẫu 2:** Trong thí nghiệm giao thoa sóng ở mặt nước, hai nguồn kết hợp $S_1, S_2$ dao động cùng pha với tần số $15\text{ Hz}$. Điểm $M$ trên mặt nước cách hai nguồn các khoảng $d_1 = 18\text{ cm}, d_2 = 24\text{ cm}$ dao động với biên độ cực đại. Giữa $M$ và đường trung trực của $S_1S_2$ có 2 vân cực đại khác. Tốc độ truyền sóng trên mặt nước là:  
A. $30\text{ cm/s}$.  
B. $45\text{ cm/s}$.  
C. $60\text{ cm/s}$.  
D. $90\text{ cm/s}$.  
*Lời giải chi tiết:*  
Vì $M$ là cực đại và giữa $M$ với vân trung tâm có 2 cực đại khác $\Rightarrow M$ thuộc vân cực đại bậc $k = 3$.  
Điều kiện cực đại: $d_2 - d_1 = k\lambda \Rightarrow 24 - 18 = 3\lambda \Rightarrow 6 = 3\lambda \Rightarrow \lambda = 2\text{ cm}$.  
Tốc độ truyền sóng: $v = \lambda \cdot f = 2 \cdot 15 = 30\text{ cm/s}$. **Chọn A.**

**c) Sản phẩm:** Lời giải chuẩn xác vào vở của học sinh.  
**d) Tổ chức thực hiện:** GV hướng dẫn mẹo xác định bậc của vân cực đại $k$, gọi HS lên bảng trình bày.

---

### TIẾT 2: SÓNG DỪNG, ĐẶC TRƯNG CỦA ÂM VÀ BÀI TOÁN PHÂN HÓA (45 phút)

#### Hoạt động 2 (tiếp theo): Sóng dừng và Sóng âm phân hóa (45 phút)

##### Dạng 3: Bài toán sóng dừng và khoảng cách giữa các nút, bụng
- **Ví dụ mẫu 3:** Một sợi dây đàn hồi dài $1.2\text{ m}$ hai đầu cố định. Kích thích cho dây dao động với tần số $100\text{ Hz}$, trên dây xuất hiện sóng dừng ổn định với 4 bụng sóng.  
a) Tính bước sóng và tốc độ truyền sóng trên dây.  
b) Tính khoảng cách ngắn nhất giữa hai điểm dao động cùng biên độ $0.5A_{bụng}$ trên dây.  
*Lời giải chi tiết:*  
a) Hai đầu dây cố định nên chiều dài dây: $L = k \cdot \frac{\lambda}{2}$.  
Với $4$ bụng sóng $\Rightarrow k = 4$.  
Suy ra: $1.2 = 4 \cdot \frac{\lambda}{2} = 2\lambda \Rightarrow \lambda = 0.6\text{ m} = 60\text{ cm}$.  
Tốc độ truyền sóng trên dây: $v = \lambda \cdot f = 0.6 \cdot 100 = 60\text{ m/s}$.  
b) Biên độ dao động của điểm cách nút một khoảng $d$ là $A = A_b |\sin\left(\frac{2\pi d}{\lambda}\right)|$.  
Khi $A = \frac{A_b}{2} \Rightarrow |\sin\left(\frac{2\pi d}{\lambda}\right)| = \frac{1}{2} \Rightarrow d = \frac{\lambda}{12} = 5\text{ cm}$.  
Khoảng cách ngắn nhất giữa hai điểm cùng biên độ $\frac{A_b}{2}$ đối xứng qua nút là: $\Delta d = 2d = 2 \cdot 5 = 10\text{ cm}$.

---

##### Dạng 4: Bài toán mức cường độ âm và sự thay đổi khoảng cách (Mục tiêu 8+)
- **Ví dụ mẫu 4:** Tại điểm $O$ trong môi trường đẳng hướng và không hấp thụ âm có một nguồn âm điểm phát sóng âm công suất không đổi. Một người đo mức cường độ âm tại $M$ được $50\text{ dB}$. Khi người đó tiến lại gần nguồn âm một khoảng $36\text{ m}$ đến điểm $N$ thì mức cường độ âm đo được là $70\text{ dB}$. Khoảng cách từ nguồn $O$ đến điểm $M$ là:  
A. $40\text{ m}$.  
B. $50\text{ m}$.  
C. $60\text{ m}$.  
D. $36\text{ m}$.  
*Lời giải chi tiết:*  
Cường độ âm từ nguồn điểm: $I = \frac{P}{4\pi r^2} \Rightarrow \frac{I_N}{I_M} = \left(\frac{r_M}{r_N}\right)^2$.  
Mặt khác: $L_N - L_M = 10\lg\left(\frac{I_N}{I_M}\right) \Rightarrow 70 - 50 = 20\text{ dB} = 2\text{ B}$.  
Suy ra: $\lg\left(\frac{I_N}{I_M}\right) = 2 \Rightarrow \frac{I_N}{I_M} = 10^2 = 100$.  
Do đó: $\left(\frac{r_M}{r_N}\right)^2 = 100 \Rightarrow \frac{r_M}{r_N} = 10 \Rightarrow r_M = 10 r_N$.  
Vì người đó tiến lại gần nguồn $36\text{ m}$ nên $r_N = r_M - 36$.  
Thay vào: $r_M = 10(r_M - 36) = 10r_M - 360 \Rightarrow 9r_M = 360 \Rightarrow r_M = 40\text{ m}$. **Chọn A.**

---

### TIẾT 3: LUYỆN TẬP ĐỊNH DẠNG ĐỀ THI MỚI KHTN VÀ NHẬN DIỆN BẪY (45 phút)

#### Hoạt động 3: Luyện tập Phiếu học tập định dạng đề thi mới KHTN (25 phút)
**a) Mục tiêu:** Thành thạo giải đề thi KHTN mới: Phần I (Trắc nghiệm 4 lựa chọn) và Phần II (Trắc nghiệm Đúng/Sai đa mệnh đề).  
**b) Nội dung:** Học sinh thực hiện nhóm 4 người giải Phiếu học tập số 2 (Phần II).  
**c) Sản phẩm:** Đáp án và lập luận của các nhóm trên bảng nhóm.  
**d) Tổ chức thực hiện:**  
- Bước 1: GV chia lớp thành 4 nhóm, phát phiếu học tập.  
- Bước 2: Các nhóm trao đổi, tranh luận về tính đúng/sai của từng ý a, b, c, d.  
- Bước 3: Đại diện nhóm trình bày, chỉ ra từ khóa quyết định tính đúng/sai.  
- Bước 4: GV nhận xét, chốt điểm và kết luận phương pháp.

---

#### Hoạt động 4: Kỹ năng làm bài và Nhận diện bẫy đề thi môn Vật lí (10 phút)
- **Bẫy 1:** Nhầm lẫn giữa tốc độ truyền sóng $v$ và vận tốc dao động của phần tử $v_{pt} = u'$.  
- **Bẫy 2:** Chiều truyền sóng: Điểm sườn đón sóng đi lên, sườn lùi sóng đi xuống (Phương pháp "đỉnh sóng dịch chuyển theo chiều truyền").  
- **Bẫy 3:** Đơn vị đo trong công thức sóng: $x$ và $\lambda$ phải cùng đơn vị; mức cường độ âm $L$ dùng đơn vị $\text{B}$ khi tính $\lg$ và nhân $10$ khi dùng $\text{dB}$.

---

#### Hoạt động 5: Vận dụng và Hướng dẫn tự học ở nhà (10 phút)
- Hoàn thành toàn bộ câu hỏi trắc nghiệm còn lại trong Phiếu học tập số 2.
- Đọc trước nội dung **Chuyên đề 3: Nhiệt học và Các định luật nhiệt động lực học**.

---

## IV. PHỤ LỤC: HỆ THỐNG PHIẾU HỌC TẬP VÀ ĐÁP ÁN CHI TIẾT

### 1. PHIẾU HỌC TẬP SỐ 2 (ĐỊNH DẠNG ĐỀ THI MỚI MÔN VẬT LÍ)

#### PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Thí sinh trả lời từ câu 1 đến câu 6)

**Câu 1 (NB):** Một sóng âm truyền từ không khí vào nước thì:  
A. Tần số không đổi, bước sóng tăng.  
B. Tần số tăng, bước sóng không đổi.  
C. Tần số không đổi, bước sóng giảm.  
D. Bước sóng và tần số đều không đổi.

**Câu 2 (NB):** Đặc trưng sinh lý nào dưới đây của âm gắn liền với tần số âm?  
A. Độ to.  
B. Độ cao.  
C. Âm sắc.  
D. Cường độ âm.

**Câu 3 (TH):** Trên một sợi dây đang có sóng dừng với bước sóng $\lambda$. Khoảng cách giữa hai nút sóng liên tiếp bằng:  
A. $\lambda$.  
B. $\frac{\lambda}{2}$.  
C. $\frac{\lambda}{4}$.  
D. $2\lambda$.

**Câu 4 (TH):** Một sóng cơ có chu kỳ $T = 0.2\text{ s}$ lan truyền với tốc độ $v = 1.5\text{ m/s}$. Bước sóng của sóng này là:  
A. $0.3\text{ m}$.  
B. $3.0\text{ m}$.  
C. $0.75\text{ m}$.  
D. $7.5\text{ m}$.

**Câu 5 (VD):** Hai nguồn sóng kết hợp $S_1, S_2$ cách nhau $10\text{ cm}$ dao động cùng pha trên mặt nước với bước sóng $\lambda = 1.6\text{ cm}$. Số điểm cực tiểu giao thoa trên đoạn thẳng nối hai nguồn $S_1S_2$ là:  
A. $12$.  
B. $13$.  
C. $14$.  
D. $10$.

**Câu 6 (VD - Mục tiêu 8+):** Một âm có mức cường độ âm $L_1 = 40\text{ dB}$. Khi cường độ âm tăng lên $1000$ lần thì mức cường độ âm $L_2$ mới đo được là:  
A. $43\text{ dB}$.  
B. $70\text{ dB}$.  
C. $80\text{ dB}$.  
D. $140\text{ dB}$.

---

#### PHẦN II. Câu trắc nghiệm Đúng/Sai (Thí sinh trả lời từ câu 1 đến câu 2, mỗi câu có 4 ý a, b, c, d)

**Câu 1:** Thí nghiệm tạo sóng dừng trên sợi dây đàn hồi $AB$ có chiều dài $L = 90\text{ cm}$, đầu $A$ gắn với cần rung dao động theo phương vuông góc với dây với tần số $f = 50\text{ Hz}$, đầu $B$ được giữ cố định. Quan sát thấy trên dây xuất hiện 3 bụng sóng ổn định (coi đầu $A$ là một nút sóng).  
a) Điều kiện có sóng dừng trên dây với hai đầu cố định là $L = k \cdot \frac{\lambda}{2}$ ($k \in \mathbb{N}^*$).  
b) Bước sóng của sóng truyền trên sợi dây bằng $30\text{ cm}$.  
c) Tốc độ truyền sóng trên sợi dây bằng $30\text{ m/s}$.  
d) Điểm $M$ trên dây cách nút $B$ một đoạn $5\text{ cm}$ dao động với biên độ bằng một nửa biên độ của bụng sóng.

**Câu 2:** Một sóng cơ hình sin truyền dọc theo trục $Ox$ theo chiều dương. Tại thời điểm $t_1$, hình dạng một đoạn của sợi dây có dạng như hình vẽ: bước sóng đo được $\lambda = 40\text{ cm}$, biên độ dao động $A = 2\text{ cm}$, hai điểm $P$ và $Q$ có tọa độ $x_P = 10\text{ cm}, x_Q = 25\text{ cm}$.  
a) Khoảng cách vị trí cân bằng giữa hai phần tử $P$ và $Q$ là $15\text{ cm}$.  
b) Độ lệch pha giữa dao động của phần tử $P$ và phần tử $Q$ bằng $\frac{3\pi}{4}\text{ rad}$.  
c) Khi sóng truyền theo chiều dương trục $Ox$, phần tử $P$ đang chuyển động theo chiều âm của trục $Ou$.  
d) Tại thời điểm phần tử $P$ có li độ $u_P = 2\text{ cm}$ thì phần tử $Q$ có tốc độ dao động bằng $0$.

---

### 2. ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT PHIẾU HỌC TẬP SỐ 2

#### PHẦN I: TRẮC NGHIỆM 4 PHƯƠNG ÁN LỰA CHỌN
- **Câu 1:** Chọn **A**. Tần số sóng $f$ do nguồn phát quy định nên không đổi khi truyền qua các môi trường khác nhau. Khi vào nước, tốc độ truyền sóng âm tăng ($v_{nước} > v_{kk}$) nên $\lambda = \frac{v}{f}$ tăng.
- **Câu 2:** Chọn **B**. Độ cao là đặc trưng sinh lý gắn liền với tần số âm.
- **Câu 3:** Chọn **B**. Khoảng cách giữa hai nút liên tiếp (hoặc hai bụng liên tiếp) bằng $\frac{\lambda}{2}$.
- **Câu 4:** Chọn **A**. Bước sóng $\lambda = v \cdot T = 1.5 \cdot 0.2 = 0.3\text{ m}$.
- **Câu 5:** Chọn **A**. Vị trí cực tiểu thỏa mãn: $-S_1S_2 < (k + 0.5)\lambda < S_1S_2 \Leftrightarrow -10 < 1.6(k + 0.5) < 10 \Leftrightarrow -6.75 < k < 5.75 \Rightarrow k \in \{-6; -5; \dots; 5\}$. Tổng cộng có $12$ giá trị.
- **Câu 6:** Chọn **B**. Ta có $L_2 - L_1 = 10\lg\left(\frac{I_2}{I_1}\right) = 10\lg(1000) = 30\text{ dB} \Rightarrow L_2 = 40 + 30 = 70\text{ dB}$.

#### PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
- **Câu 1:**
  + a) **ĐÚNG.** Công thức chuẩn của sóng dừng hai đầu cố định: $L = k \frac{\lambda}{2}$.
  + b) **SAI.** Với 3 bụng sóng $\Rightarrow k = 3 \Rightarrow L = 3 \frac{\lambda}{2} \Rightarrow 90 = 1.5\lambda \Rightarrow \lambda = 60\text{ cm}$, không phải $30\text{ cm}$.
  + c) **ĐÚNG.** Tốc độ truyền sóng: $v = \lambda \cdot f = 0.6 \cdot 50 = 30\text{ m/s}$.
  + d) **ĐÚNG.** Biên độ tại điểm cách nút khoảng $d = 5\text{ cm}$ là $A_M = A_b |\sin\left(\frac{2\pi d}{\lambda}\right)| = A_b |\sin\left(\frac{2\pi \cdot 5}{60}\right)| = A_b |\sin\left(\frac{\pi}{6}\right)| = \frac{A_b}{2}$.

- **Câu 2:**
  + a) **ĐÚNG.** $\Delta x = x_Q - x_P = 25 - 10 = 15\text{ cm}$.
  + b) **ĐÚNG.** $\Delta\varphi = \frac{2\pi \Delta x}{\lambda} = \frac{2\pi \cdot 15}{40} = \frac{3\pi}{4}\text{ rad}$.
  + c) **SAI.** Sóng truyền từ trái sang phải ($Ox$), điểm $P$ nằm ở sườn trước của đỉnh sóng nên phần tử $P$ đang đi lên (theo chiều dương).
  + d) **SAI.** Vì độ lệch pha là $\frac{3\pi}{4}$ (không phải vuông pha $\frac{\pi}{2}$), nên khi $u_P = A$ thì phần tử $Q$ không ở vị trí cân bằng hay biên, tốc độ của $Q$ khác $0$.

---

| **NGƯỜI SOẠN** | **TỔ TRƯỞNG CHUYÊN MÔN DUYỆT** |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| **Giáo viên cốt cán môn Vật lí** | **Tổ trưởng Tổ Khoa học Tự nhiên** |
`;

export const SAMPLE_LITERATURE_PLAN = String.raw`# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 – 2027
**Môn học:** Ngữ văn 12 | **Bộ sách:** Kết nối tri thức với cuộc sống  
**Chủ đề:** **CHUYÊN ĐỀ 1. KỸ NĂNG ĐỌC HIỂU THƠ HIỆN ĐẠI VÀ VIẾT ĐOẠN VĂN NGHỊ LUẬN XÃ HỘI (200 CHỮ)**  
**Thời lượng:** $3$ tiết ($135$ phút) | **Tiết PPCT:** $1 - 3$  
**Đối tượng áp dụng:** Học sinh lớp 12 (kết hợp phân hóa mục tiêu $6.5 - 7.5$ và học sinh định hướng đạt điểm $8.0+$)

---

## I. MỤC TIÊU

### 1. Về kiến thức
- Hệ thống hóa các đặc trưng thi pháp của thơ hiện đại: Nhân vật trữ tình, mạch cảm xúc, tứ thơ, hình ảnh biểu tượng, thể thơ và các biện pháp tu từ nghệ thuật.
- Nắm vững ma trận câu hỏi Đọc hiểu mới (văn bản ngoài SGK) theo 4 mức độ: Nhận biết thể thơ/từ ngữ, Thông hiểu biện pháp tu từ/ý nghĩa câu thơ, Vận dụng rút ra thông điệp tư tưởng và Vận dụng cao bày tỏ quan điểm cá nhân.
- Nắm vững cấu trúc đoạn văn Nghị luận xã hội (khoảng 200 chữ): Cấu trúc mở - thân - kết mạch lạc, lập luận chặt chẽ, dẫn chứng xác thực và bài học nhận thức, hành động.

### 2. Về năng lực
- **Năng lực ngôn ngữ:** Đọc hiểu văn bản văn học mới lạ ngoài SGK; viết đoạn văn nghị luận xã hội đúng dung lượng, diễn đạt trong sáng, giàu sức gợi cảm.
- **Năng lực văn học:** Cảm thụ cái hay, cái đẹp của ngôn từ nghệ thuật; giải mã tầng nghĩa ẩn dụ và tư tưởng nhân văn sâu sắc của thi phẩm.
- **Năng lực tự chủ và phản biện:** Bày tỏ chính kiến cá nhân trước các vấn đề xã hội đương đại một cách thuyết phục, văn minh.

### 3. Về phẩm chất
- Bồi dưỡng tình yêu quê hương đất nước, lòng nhân ái, lý tưởng sống cống hiến và trách nhiệm của tuổi trẻ đối với cộng đồng.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** Kế hoạch bài dạy chuẩn CV 5512, ngữ liệu thơ hiện đại mới ngoài SGK, máy chiếu/bảng phụ trình chiếu rubric chấm điểm đoạn văn 200 chữ.
2. **Học sinh:** Vở ghi ôn tập Ngữ văn 12, bút viết, giấy nháp lập dàn ý, đọc trước tài liệu hướng dẫn viết đoạn văn.

---

## III. TIẾN TRÌNH DẠY HỌC

### TIẾT 1: KỸ NĂNG XỬ LÝ CÂU HỎI ĐỌC HIỂU NGỮ LIỆU THƠ NGOÀI SGK (45 phút)

#### Hoạt động 1: Khởi động và Hệ thống hóa kiến thức cốt lõi (15 phút)
**a) Mục tiêu:** Ôn lại hệ thống các biện pháp tu từ và các dạng câu hỏi thường gặp trong phần Đọc hiểu đề thi TN THPT mới.  
**b) Nội dung:** Học sinh thảo luận theo cặp hoàn thành bảng phân loại biện pháp tu từ:
- Biện pháp từ ngữ: So sánh, ẩn dụ, hoán dụ, nhân hóa, điệp từ/ngữ, nói giảm nói tránh.
- Biện pháp cú pháp: Điệp cấu trúc cú pháp, liệt kê, câu hỏi tu từ, đảo ngữ.
- Công thức trả lời câu hỏi tác dụng của biện pháp tu từ:
  + Bước 1: Chỉ rõ từ ngữ/hình ảnh thể hiện biện pháp tu từ.
  + Bước 2: Tác dụng về mặt biểu đạt (tạo nhịp điệu, tăng tính gợi hình, gợi cảm).
  + Bước 3: Tác dụng về mặt nội dung (nhấn mạnh tình cảm, thái độ, tư tưởng gì của tác giả).  
**c) Sản phẩm:** Bản ghi chép công thức trả lời đọc hiểu vào vở của học sinh.  
**d) Tổ chức thực hiện:** GV giao nhiệm vụ, gọi 2 HS trả lời, chuẩn hóa công thức "3 bước vàng" đạt trọn điểm.

---

#### Hoạt động 2: Phân tích ví dụ mẫu Đọc hiểu thơ hiện đại (30 phút)
**a) Mục tiêu:** Thực hành trả lời trực tiếp hệ thống câu hỏi đọc hiểu trên một ngữ liệu thơ mới ngoài SGK.  
**b) Nội dung:** Cho đoạn trích bài thơ *"Lắng nghe đất nước"* của nhà thơ Nguyễn Khoa Điềm (trích sáng tác mới):
> *"Khi con lớn lên Đất Nước đã có rồi*  
> *Đất Nước có trong những cái 'ngày xửa ngày xưa...' mẹ thường hay kể*  
> *Đất Nước bắt đầu với miếng trầu bây giờ bà ăn*  
> *Đất Nước lớn lên khi dân mình biết trồng tre mà đánh giặc...*  
> *Đất Nước là nơi ta hẹn hò*  
> *Đất Nước là nơi em đánh rơi chiếc khăn trong nỗi nhớ thầm..."*

- **Câu hỏi 1 (NB):** Xác định thể thơ của đoạn trích trên.  
  *Đáp án:* Thể thơ tự do.
- **Câu hỏi 2 (TH):** Chỉ ra và nêu tác dụng của biện pháp tu từ điệp từ *"Đất Nước"* trong đoạn thơ.  
  *Đáp án:* Điệp từ *"Đất Nước"* xuất hiện ở đầu mỗi dòng thơ tạo âm hưởng tha thiết, dạt dào; nhấn mạnh sự hiện diện thiêng liêng, gần gũi của Đất Nước trong từng nếp sống, ký ức và tình cảm riêng tư của mỗi con người.
- **Câu hỏi 3 (VD):** Anh/chị hiểu như thế nào về hình ảnh *"Đất Nước lớn lên khi dân mình biết trồng tre mà đánh giặc"*?  
  *Đáp án:* Hình ảnh gợi nhắc truyền thống yêu nước, quật cường đánh giặc ngoại xâm từ thời Thánh Gióng; khẳng định sự trường tồn của đất nước gắn liền với tinh thần đoàn kết, ý chí bảo vệ độc lập dân tộc.
- **Câu hỏi 4 (VDC):** Thông điệp nào trong đoạn trích có ý nghĩa sâu sắc nhất đối với anh/chị? Vì sao?  
  *Đáp án:* Học sinh nêu rõ thông điệp (ví dụ: Đất Nước gắn liền với những điều bình dị, thân thương nhất trong mỗi gia đình) và lý giải thuyết phục trong 3 - 5 câu văn mạch lạc.

**c) Sản phẩm:** Câu trả lời hoàn chỉnh của học sinh.  
**d) Tổ chức thực hiện:** GV tổ chức cho HS trả lời cá nhân, sửa lỗi diễn đạt cộc lốc hoặc thiếu ý.

---

### TIẾT 2: RÈN KỸ NĂNG VIẾT ĐOẠN VĂN NGHỊ LUẬN XÃ HỘI (200 CHỮ) (45 phút)

#### Hoạt động 2 (tiếp theo): Quy trình viết đoạn văn 200 chữ chuẩn barem Bộ GD&ĐT (45 phút)
**a) Mục tiêu:** Nắm vững cấu trúc đoạn văn Tổng - Phân - Hợp dung lượng khoảng 200 chữ; cách dùng từ ngữ liên kết và dẫn chứng đắt giá.  
**b) Nội dung:**

##### 1. Cấu trúc đoạn văn chuẩn 5 phần:
1. **Mở đoạn (1 câu):** Dẫn dắt và nêu trực tiếp vấn đề nghị luận (từ khóa trọng tâm).
2. **Giải thích (1 - 2 câu):** Giải nghĩa ngắn gọn từ khóa, cắt nghĩa bản chất vấn đề (không giải thích dài dòng).
3. **Bàn luận / Phân tích (4 - 6 câu):**
   - Luận điểm 1: Vấn đề đó mang lại giá trị/lợi ích gì cho cá nhân?
   - Luận điểm 2: Vấn đề đó đóng góp gì cho sự phát triển của xã hội?
   - Dẫn chứng thực tế tiêu biểu (người thật việc thật mang tính thời sự, ví dụ: cống hiến thầm lặng, khởi nghiệp đổi mới sáng tạo, bảo vệ môi trường).
4. **Mở rộng / Phản đề (1 - 2 câu):** Phê phán những biểu hiện lệch lạc, thụ động, vô cảm ngược lại với vấn đề.
5. **Bài học và Kết đoạn (2 câu):**
   - Bài học nhận thức: Nhận thức đúng đắn về vai trò của vấn đề.
   - Bài học hành động: Bản thân học sinh lớp 12 cần làm những việc cụ thể gì ngay hôm nay.

##### 2. Bài viết mẫu hoàn chỉnh (khoảng 200 chữ):
*Đề bài: Từ phần Đọc hiểu, hãy viết một đoạn văn (khoảng 200 chữ) trình bày suy nghĩ của anh/chị về trách nhiệm bảo vệ và xây dựng quê hương của thế hệ trẻ hôm nay.*  
*Bài làm mẫu:*  
Trách nhiệm xây dựng và bảo vệ Tổ quốc không phải là khẩu hiệu xa vời mà chính là sứ mệnh thiêng liêng đặt lên vai mỗi người trẻ hôm nay. Quê hương là chiếc nôi nuôi dưỡng ta khôn lớn, là cội nguồn của mọi yêu thương, do đó thế hệ trẻ cần ý thức sâu sắc về bổn phận đền đáp và cống hiến. Trước hết, tuổi trẻ cần không ngừng nỗ lực học tập, rèn luyện tri thức và làm chủ khoa học công nghệ để đưa đất nước hội nhập sánh vai với các cường quốc năm châu. Trách nhiệm ấy còn được biểu hiện qua những hành động bình dị: sống tử tế, chấp hành pháp luật, bảo vệ môi trường sống và lan tỏa tình yêu thương đến cộng đồng. Chúng ta cảm phục biết bao những thanh niên tình nguyện nơi biên cương hải đảo hay những kỹ sư trẻ miệt mài sáng tạo đổi mới đưa sản phẩm Việt ra thế giới. Đáng buồn thay, vẫn còn một bộ phận thanh niên sống buông thả, thờ ơ, chạy theo lối sống ích kỷ, thực dụng. Là một học sinh lớp 12 đứng trước ngưỡng cửa tương lai, tôi nhận thức sâu sắc rằng học tập nghiêm túc và rèn luyện đạo đức hôm nay chính là hành động thiết thực nhất để dựng xây Tổ quốc mai sau.

---

### TIẾT 3: LUYỆN TẬP VIẾT ĐOẠN, CHẤM THEO RUBRIC VÀ TỔNG KẾT (45 phút)

#### Hoạt động 3: Luyện tập viết đoạn văn theo Phiếu học tập số 2 (25 phút)
**a) Mục tiêu:** Thực hành viết đoạn văn 200 chữ trong thời gian giới hạn 20 phút.  
**b) Nội dung:** Học sinh làm việc cá nhân viết đoạn văn trên phiếu học tập.  
**c) Sản phẩm:** Đoạn văn hoàn chỉnh của học sinh.  
**d) Tổ chức thực hiện:** GV bấm giờ 20 phút, quan sát uốn nắn học sinh viết liên tục, không xuống dòng giữa chừng (đảm bảo đúng quy chuẩn đoạn văn).

---

#### Hoạt động 4: Đánh giá theo Rubric Barem điểm và Nhận diện lỗi sai học sinh hay mắc (10 phút)
- **Rubric barem điểm chuẩn (2.0 điểm):**
  + Đảm bảo yêu cầu hình thức đoạn văn (0.25đ): Không xuống dòng, dung lượng khoảng 200 chữ ($\pm 30$ chữ).
  + Xác định đúng vấn đề nghị luận (0.25đ): Nêu trúng vấn đề trọng tâm.
  + Triển khai vấn đề nghị luận (1.00đ): Lập luận thuyết phục, có lí lẽ và dẫn chứng xác thực.
  + Chính tả, dùng từ, đặt câu (0.25đ): Đảm bảo chuẩn ngữ pháp tiếng Việt.
  + Sáng tạo (0.25đ): Có suy nghĩ sâu sắc, diễn đạt mới mẻ, giàu cảm xúc.
- **Lỗi sai thường gặp:** Xuống dòng biến đoạn văn thành bài văn thu nhỏ; viết lan man quá dài (hơn 1 trang giấy) làm thiếu thời gian phần làm văn; dẫn chứng chung chung, không cụ thể.

---

#### Hoạt động 5: Vận dụng và Hướng dẫn tự học ở nhà (10 phút)
- Hoàn thiện bài văn Nghị luận văn học phân tích ngữ liệu thơ trong Phiếu học tập số 2 vào vở bài tập.
- Đọc trước **Chuyên đề 2: Kỹ năng Đọc hiểu Truyện ngắn và Tiểu thuyết hiện đại**.

---

## IV. PHỤ LỤC: HỆ THỐNG PHIẾU HỌC TẬP VÀ ĐÁP ÁN, RUBRIC BAREM ĐIỂM

### 1. PHIẾU HỌC TẬP SỐ 2 (ĐỊNH DẠNG ĐỀ THI TỰ LUẬN MÔN NGỮ VĂN)
*(Thời gian làm bài: 90 phút - Không sử dụng tài liệu)*

#### PHẦN I. ĐỌC HIỂU (4.0 điểm)
Đọc đoạn trích sau và thực hiện các yêu cầu:
> *"Có một dòng sông mang tên là Tuổi Trẻ*  
> *Chảy xiết qua tháng ngày chẳng chịu đứng yên*  
> *Có những ước mơ rực cháy như ngọn đuốc*  
> *Dẫn đường ta đi giữa bão táp gập ghềnh.*  
>  
> *Đừng ngại ngần những vết xước của thời gian*  
> *Đá sỏi dưới chân làm bàn chân thêm vững*  
> *Cứ vươn vai như mầm cây đón nắng*  
> *Đất Mẹ nghìn năm luôn chở che con..."*  
> *(Trích "Gửi lại thanh xuân", NXB Hội Nhà văn, 2024)*

- **Câu 1 (0.5 điểm):** Xác định thể thơ của đoạn trích trên.
- **Câu 2 (0.5 điểm):** Chỉ ra những hình ảnh so sánh được tác giả sử dụng trong khổ thơ thứ nhất.
- **Câu 3 (1.0 điểm):** Nêu tác dụng của biện pháp tu từ nhân hóa trong hai câu thơ:  
  *"Có một dòng sông mang tên là Tuổi Trẻ / Chảy xiết qua tháng ngày chẳng chịu đứng yên"*.
- **Câu 4 (1.0 điểm):** Anh/chị hiểu như thế nào về lời khuyên: *"Đừng ngại ngần những vết xước của thời gian / Đá sỏi dưới chân làm bàn chân thêm vững"*?
- **Câu 5 (1.0 điểm):** Bài học sâu sắc nhất mà anh/chị rút ra từ đoạn trích trên là gì? Vì sao?

---

#### PHẦN II. VIẾT (6.0 điểm)

- **Câu 1 (2.0 điểm):** Từ nội dung đoạn trích ở phần Đọc hiểu, hãy viết một đoạn văn (khoảng 200 chữ) trình bày suy nghĩ của anh/chị về *ý nghĩa của lòng dũng cảm đối diện với chông gai, thử thách trong cuộc đời mỗi con người*.

- **Câu 2 (4.0 điểm):** Viết bài văn nghị luận văn học phân tích bức thông điệp nghệ thuật và vẻ đẹp cảm xúc của nhân vật trữ tình được thể hiện qua đoạn trích thơ ở phần Đọc hiểu.

---

### 2. HƯỚNG DẪN CHẤM VÀ RUBRIC BAREM ĐIỂM CHI TIẾT

#### PHẦN I: ĐỌC HIỂU (4.0 ĐIỂM)
- **Câu 1 (0.5đ):** Thể thơ tự do (hoặc thơ 8 chữ kết hợp tự do).
- **Câu 2 (0.5đ):** Hình ảnh so sánh: *"dòng sông mang tên là Tuổi Trẻ"*; *"ước mơ rực cháy như ngọn đuốc"*.
- **Câu 3 (1.0đ):**
  + Biện pháp nhân hóa: Tuổi trẻ - *"chẳng chịu đứng yên"*.
  + Tác dụng: Khắc họa sinh động sức sống căng tràn, nhiệt huyết cuộn chảy và tốc độ trôi nhanh của tuổi thanh xuân; thôi thúc con người phải sống khát khao, không lãng phí từng khoảnh khắc (0.5đ biểu đạt, 0.5đ nội dung).
- **Câu 4 (1.0đ):**
  + *"Vết xước của thời gian", "đá sỏi dưới chân"* là biểu tượng cho những vấp ngã, chông gai, nhọc nhằn trên đường đời.
  + Ý nghĩa: Lời nhắn nhủ con người đừng sợ hãi khó khăn; chính những va vấp, trải nghiệm tôi luyện cho ta bản lĩnh vững vàng, ý chí kiên định để trưởng thành hơn.
- **Câu 5 (1.0đ):** Nêu bài học tích cực (lòng tự tin, dám nghĩ dám làm, thái độ sống lạc quan) và lý giải ngắn gọn, thuyết phục, không vi phạm chuẩn mực đạo đức.

#### PHẦN II: VIẾT (6.0 ĐIỂM)
- **Câu 1: Viết đoạn văn NLXH khoảng 200 chữ (2.0 điểm):**
  + *Hình thức (0.25đ):* Đúng đoạn văn một khối, dung lượng khoảng 200 chữ ($\pm 30$ từ).
  + *Trọng tâm (0.25đ):* Xác định đúng vấn đề: Ý nghĩa của lòng dũng cảm vượt qua thử thách.
  + *Triển khai luận điểm (1.0đ):*
    * Giải thích: Dũng cảm là không lùi bước trước khó khăn, dám dấn thân và chịu trách nhiệm.
    * Bàn luận: Giúp con người khai phá năng lực tiềm ẩn, biến nguy cơ thành cơ hội; tạo lập niềm tin và sự tôn trọng từ mọi người; thúc đẩy xã hội tiến bộ.
    * Dẫn chứng cụ thể, thời sự (tấm gương vượt khó, khởi nghiệp, vượt bão lũ).
    * Phản đề: Phê phán thái độ hèn nhát, sợ hãi thoái lui khi gặp gian nan.
    * Bài học hành động cho bản thân.
  + *Chính tả, ngữ pháp (0.25đ):* Không mắc lỗi diễn đạt.
  + *Sáng tạo (0.25đ):* Giọng văn thuyết phục, có cái nhìn mới mẻ.

- **Câu 2: Bài văn NLVH (4.0 điểm):**
  + *Đảm bảo cấu trúc bài văn nghị luận (0.25đ):* Có đủ Mở bài, Thân bài, Kết bài.
  + *Xác định đúng yêu cầu đề bài (0.5đ):* Phân tích thông điệp và vẻ đẹp cảm xúc trong đoạn trích thơ.
  + *Triển khai vấn đề nghị luận (2.5đ):*
    * Khái quát tác giả, vị trí đoạn trích và mạch cảm xúc thơ (0.5đ).
    * Phân tích khổ 1: Khát vọng tuổi trẻ cháy bỏng, hoài bão vươn tới tương lai tươi sáng (1.0đ).
    * Phân tích khổ 2: Lời nhắn nhủ ân tình về bản lĩnh sống kiên cường trước phong ba và điểm tựa cội nguồn Đất Mẹ (1.0đ).
  + *Đặc sắc nghệ thuật (0.25đ):* Thể thơ tự do nhịp nhàng, hình ảnh thơ giàu sức gợi, giọng thơ truyền cảm hứng.
  + *Chính tả, diễn đạt (0.25đ) & Sáng tạo (0.25đ).*

---

| **NGƯỜI SOẠN** | **TỔ TRƯỞNG CHUYÊN MÔN DUYỆT** |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| **Giáo viên cốt cán môn Ngữ văn** | **Tổ trưởng Tổ Ngữ văn** |
`;

export const SAMPLE_HISTORY_PLAN = String.raw`# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 – 2027
**Môn học:** Lịch sử 12 | **Bộ sách:** Kết nối tri thức với cuộc sống  
**Chủ đề:** **CHUYÊN ĐỀ 3. CÁCH MẠNG THÁNG TÁM 1945 VÀ KHÁNG CHIẾN CHỐNG THỰC DÂN PHÁP (1945 – 1954)**  
**Thời lượng:** $3$ tiết ($135$ phút) | **Tiết PPCT:** $7 - 9$  
**Đối tượng áp dụng:** Học sinh lớp 12 (kết hợp ôn thi tốt nghiệp đại trà mục tiêu $6.5 - 7.5$ và học sinh thi khối $C00$ mục tiêu $8.0+$)

---

## I. MỤC TIÊU

### 1. Về kiến thức
- Hệ thống hóa hoàn cảnh lịch sử, thời cơ cách mạng "ngàn năm có một" và diễn biến cuộc Tổng khởi nghĩa tháng Tám năm 1945.
- Nắm vững tính chất, nguyên nhân thắng lợi và bài học kinh nghiệm của Cách mạng tháng Tám 1945.
- Phân tích bối cảnh "ngàn cân treo sợi tóc" sau ngày 2/9/1945 và đường lối kháng chiến chống Pháp: Toàn dân, toàn diện, trường kỳ, tự lực cánh sinh và tranh thủ sự ủng hộ quốc tế.
- Khắc sâu các mốc lịch sử bản lề: Chỉ thị Toàn quốc kháng chiến (19/12/1946), Chiến dịch Việt Bắc Thu - Đông 1947, Chiến dịch Biên giới Thu - Đông 1950, Kế hoạch Nava và Chiến dịch Điện Biên Phủ 1954, Hiệp định Giơnevơ 1954.

### 2. Về năng lực
- **Năng lực tìm hiểu lịch sử:** Khai thác và xử lý thông tin từ các đoạn trích tư liệu lịch sử gốc (Tuyên ngôn Độc lập, Lời kêu gọi toàn quốc kháng chiến, các văn kiện của Đảng).
- **Năng lực nhận thức và tư duy lịch sử:** Phân tích mối quan hệ nhân quả, so sánh bước phát triển của cuộc kháng chiến qua từng chiến dịch lớn.
- **Năng lực vận dụng:** Thành thạo định dạng câu hỏi trắc nghiệm Đúng/Sai dựa trên đoạn trích văn kiện lịch sử theo chuẩn Bộ GD&ĐT.

### 3. Về phẩm chất
- Giáo dục lòng tự hào dân tộc, truyền thống yêu nước nồng nàn, biết ơn thế hệ cha anh đã hy sinh vì nền độc lập tự do của Tổ quốc.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** Kế hoạch bài dạy chuẩn CV 5512, lược đồ các chiến dịch lớn (Việt Bắc 1947, Biên giới 1950, Điện Biên Phủ 1954), phiếu học tập số 1 và 2.
2. **Học sinh:** Vở ghi chuyên đề Lịch sử 12, Sách giáo khoa Lịch sử 12 (Kết nối tri thức), hoàn thành phần tự học ở nhà.

---

## III. TIẾN TRÌNH DẠY HỌC

### TIẾT 1: HỆ THỐNG HÓA CÁCH MẠNG THÁNG TÁM VÀ BẢO VỆ CHÍNH QUYỀN NON TRẺ (45 phút)

#### Hoạt động 1: Khởi động và Hệ thống hóa kiến thức cốt lõi (15 phút)
**a) Mục tiêu:** Tái hiện các mốc thời gian then chốt và khái niệm "Thời cơ ngàn năm có một" của Cách mạng tháng Tám 1945.  
**b) Nội dung:** Học sinh làm việc cá nhân điền mốc thời gian lịch sử:
- 15/8/1945: Nhật Hoàng tuyên bố đầu hàng Đồng minh không điều kiện $\to$ Thời cơ xuất hiện.
- 18/8/1945: 4 tỉnh giành chính quyền sớm nhất cả nước (Bắc Giang, Hải Dương, Hà Tĩnh, Quảng Nam).
- 19/8/1945: Khởi nghĩa thắng lợi ở Hà Nội.
- 23/8/1945: Khởi nghĩa thắng lợi ở Huế.
- 25/8/1945: Khởi nghĩa thắng lợi ở Sài Gòn.
- 2/9/1945: Chủ tịch Hồ Chí Minh đọc bản *Tuyên ngôn Độc lập* tại Quảng trường Ba Đình.  
**c) Sản phẩm:** Bảng niên biểu hoàn chỉnh trong vở học sinh.  
**d) Tổ chức thực hiện:** GV chiếu trục thời gian, gọi HS hoàn thiện và nhận xét.

---

#### Hoạt động 2: Phân loại dạng kiến thức trọng tâm và Phân tích ví dụ mẫu (30 phút)
**a) Mục tiêu:** Phân tích sâu Dạng 1 (Bối cảnh thời cơ Cách mạng tháng Tám) và Dạng 2 (Đường lối kháng chiến chống Pháp).  
**b) Nội dung:**

##### Dạng 1: Phân tích tính chất và bài học của Cách mạng tháng Tám 1945
- **Ví dụ mẫu 1:** Tính chất dân tộc của Cách mạng tháng Tám năm 1945 ở Việt Nam được biểu hiện rõ nhất ở nội dung nào sau đây?  
A. Lực lượng tham gia là toàn thể dân tộc, ngọn cờ giải phóng dân tộc được đặt lên hàng đầu.  
B. Giải quyết triệt để vấn đề ruộng đất cho giai cấp nông dân nghèo.  
C. Lật đổ hoàn toàn giai cấp địa chủ phong kiến và tư sản mại bản.  
D. Thành lập ngay nhà nước chuyên chính vô sản theo mô hình Xô viết.  
*Lời giải chi tiết:*  
Cách mạng tháng Tám 1945 là cuộc cách mạng giải phóng dân tộc điển hình vì: Mục tiêu hàng đầu là độc lập dân tộc; lực lượng tham gia là khối đại đoàn kết toàn dân (Mặt trận Việt Minh tập hợp mọi tầng lớp nhân dân yêu nước). **Chọn A.**

---

##### Dạng 2: Các bước phát triển của cuộc kháng chiến chống Pháp
- **Ví dụ mẫu 2:** Chiến dịch nào trong cuộc kháng chiến chống thực dân Pháp (1945 - 1954) đã làm phá sản hoàn toàn kế hoạch "đánh nhanh thắng nhanh" của thực dân Pháp, buộc chúng phải chuyển sang "đánh lâu dài"?  
A. Chiến dịch Biên giới Thu - Đông 1950.  
B. Chiến dịch Việt Bắc Thu - Đông 1947.  
C. Chiến dịch Tây Bắc 1952.  
D. Chiến dịch Điện Biên Phủ 1954.  
*Lời giải chi tiết:*  
Thu - Đông 1947, Pháp mở cuộc tấn công lên căn cứ địa Việt Bắc nhằm tiêu diệt cơ quan đầu não kháng chiến. Quân và dân ta đã anh dũng bẻ gãy gọng kìm sông Lô và đường số 4. Thắng lợi của Chiến dịch Việt Bắc Thu - Đông 1947 đã làm phá sản hoàn toàn chiến lược "đánh nhanh thắng nhanh", buộc Pháp chuyển sang đánh lâu dài với ta. **Chọn B.**

---

### TIẾT 2: CHIẾN DỊCH ĐIỆN BIÊN PHỦ VÀ BÀI TOÁN PHÂN HÓA ĐÚNG/SAI TƯ LIỆU GỐC (45 phút)

#### Hoạt động 2 (tiếp theo): Khai phá tư liệu lịch sử và các chiến dịch bản lề (45 phút)
- **Chiến dịch Biên giới 1950:** Ta chủ động mở chiến dịch tiến công lớn, giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.
- **Kế hoạch Nava và Chiến cục Đông - Xuân 1953 - 1954:** Đòn tiến công chiến lược buộc Pháp phải phân tán lực lượng thành 5 nơi (Điện Biên Phủ, Seno, Luông Phabang, Plâycu, Đồng bằng Bắc Bộ).
- **Chiến dịch Điện Biên Phủ 1954:** Trận quyết chiến chiến lược đỉnh cao, đập tan hoàn toàn kế hoạch Nava, giáng đòn quyết định buộc Pháp phải ký Hiệp định Giơnevơ.

---

### TIẾT 3: LUYỆN TẬP PHIẾU HỌC TẬP ĐỊNH DẠNG ĐỀ THI MỚI KHXH (45 phút)

#### Hoạt động 3: Luyện tập theo Phiếu học tập số 2 (25 phút)
**a) Mục tiêu:** Rèn luyện phản xạ xử lý câu hỏi Đúng/Sai khai thác đoạn trích tư liệu lịch sử gốc.  
**b) Nội dung:** Học sinh làm việc theo nhóm 4 người giải quyết Phần II của Phiếu học tập số 2.  
**c) Sản phẩm:** Bảng nhóm ghi nhận định tính Đúng/Sai của từng mệnh đề a, b, c, d kèm căn cứ lịch sử.  
**d) Tổ chức thực hiện:** GV yêu cầu các nhóm tìm từ khóa (keywords) trong đoạn trích tư liệu trước khi kết luận mệnh đề.

---

#### Hoạt động 4: Kỹ năng nhận diện bẫy đề thi môn Lịch sử (10 phút)
- **Bẫy mốc thời gian và thứ tự sự kiện:** Phân biệt "ta chủ động mở chiến dịch" (Biên giới 1950) khác với "ta phản công đánh bại cuộc tấn công của địch" (Việt Bắc 1947).
- **Bẫy suy diễn vượt quá tư liệu:** Đề thi yêu cầu dựa trên đoạn trích tư liệu; nếu mệnh đề đúng về mặt lịch sử nhưng không có căn cứ trong đoạn trích thì vẫn có thể là mệnh đề suy diễn sai so với yêu cầu đề bài.

---

#### Hoạt động 5: Vận dụng và Hướng dẫn tự học ở nhà (10 phút)
- Hoàn thiện toàn bộ bài tập trong Phiếu học tập số 2 vào vở.
- Đọc trước **Chuyên đề 4: Cuộc kháng chiến chống Mỹ, cứu nước (1954 – 1975)**.

---

## IV. PHỤ LỤC: HỆ THỐNG PHIẾU HỌC TẬP VÀ ĐÁP ÁN CHI TIẾT

### 1. PHIẾU HỌC TẬP SỐ 2 (ĐỊNH DẠNG ĐỀ THI MỚI MÔN LỊCH SỬ)

#### PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Thí sinh trả lời từ câu 1 đến câu 6)

**Câu 1 (NB):** Ngày 2/9/1945, tại Quảng trường Ba Đình (Hà Nội), Chủ tịch Hồ Chí Minh đã đọc văn kiện lịch sử quan trọng nào?  
A. Lời kêu gọi toàn quốc kháng chiến.  
B. Tuyên ngôn Độc lập.  
C. Kháng chiến kiến quốc.  
D. Cương lĩnh chính trị đầu tiên.

**Câu 2 (NB):** Lực lượng chính trị quần chúng trong Cách mạng tháng Tám 1945 được tập hợp chủ yếu trong tổ chức mặt trận nào?  
A. Mặt trận Việt Minh.  
B. Mặt trận Thống nhất nhân dân phản đế.  
C. Mặt trận Dân chủ Đông Dương.  
D. Mặt trận Tổ quốc Việt Nam.

**Câu 3 (TH):** Sự kiện lịch sử nào đánh dấu bước ngoặt cuộc kháng chiến chống thực dân Pháp của nhân dân Việt Nam chuyển từ thế giữ gìn lực lượng sang thế chủ động tiến công trên chiến trường chính Bắc Bộ?  
A. Chiến dịch Việt Bắc Thu - Đông 1947.  
B. Chiến dịch Biên giới Thu - Đông 1950.  
C. Chiến dịch Tây Bắc 1952.  
D. Cuộc tiến công chiến lược Đông - Xuân 1953 - 1954.

**Câu 4 (TH):** Phương châm tác chiến được Đại tướng Võ Nguyên Giáp quyết định thay đổi trong Chiến dịch Điện Biên Phủ (1954) là:  
A. Từ "đánh nhanh, thắng nhanh" sang "đánh chắc, tiến chắc".  
B. Từ "đánh chắc, tiến chắc" sang "đánh nhanh, thắng nhanh".  
C. Từ "phòng ngự tích cực" sang "tổng phản công".  
D. Từ "đánh điểm diệt viện" sang "bao vây đánh lấn".

**Câu 5 (VD):** Điểm chung về nguyên nhân thắng lợi của Cách mạng tháng Tám 1945 và cuộc kháng chiến chống Pháp (1945 - 1954) là:  
A. Sự lãnh đạo đúng đắn của Đảng Cộng sản đứng đầu là Chủ tịch Hồ Chí Minh.  
B. Sự giúp đỡ to lớn và trực tiếp về vũ khí của Liên Xô và Trung Quốc ngay từ đầu.  
C. Có căn cứ địa kháng chiến liên hoàn trên phạm vi toàn bán đảo Đông Dương.  
D. Tận dụng được sự hòa hoãn giữa các nước lớn trong trật tự hai cực Ianta.

**Câu 6 (VD - Mục tiêu 8+):** Nhận xét nào sau đây phản ánh đúng tính chất sáng tạo của Đảng ta trong việc giải quyết mối quan hệ giữa nhiệm vụ giải phóng dân tộc và cách mạng ruộng đất thời kỳ 1939 - 1945?  
A. Tạm gác khẩu hiệu cách mạng ruộng đất, đặt quyền lợi dân tộc lên trên hết.  
B. Thực hiện ngay khẩu hiệu người cày có ruộng trên toàn quốc.  
C. Đặt nhiệm vụ giải phóng giai cấp lên trước nhiệm vụ giải phóng dân tộc.  
D. Kết hợp đồng thời đánh đổ đế quốc và xóa bỏ toàn bộ chế độ phong kiến.

---

#### PHẦN II. Câu trắc nghiệm Đúng/Sai (Thí sinh trả lời từ câu 1 đến câu 2, mỗi câu có 4 ý a, b, c, d)

**Câu 1:** Đọc đoạn trích tư liệu lịch sử sau đây:
> *"Hỡi đồng bào toàn quốc!  
> Chúng ta muốn hòa bình, chúng ta phải nhân nhượng. Nhưng chúng ta càng nhân nhượng, thực dân Pháp càng lấn tới, vì chúng quyết tâm cướp nước ta lần nữa!  
> Không! Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ.  
> Hỡi đồng bào! Chúng ta phải đứng lên!..."*  
> *(Hồ Chí Minh: Lời kêu gọi toàn quốc kháng chiến, ngày 19 tháng 12 năm 1946)*

a) Đoạn trích phản ánh hoàn cảnh lịch sử bùng nổ cuộc kháng chiến toàn quốc chống thực dân Pháp xâm lược của nhân dân Việt Nam.  
b) Đoạn tư liệu khẳng định sự nhân nhượng của Đảng và Chủ tịch Hồ Chí Minh trước ngày 19/12/1946 là hành động sai lầm tạo điều kiện cho Pháp lấn tới.  
c) Lời kêu gọi thể hiện ý chí quyết tâm sắt đá và truyền thống quật cường của cả dân tộc Việt Nam sẵn sàng hy sinh để bảo vệ độc lập tự do.  
d) Đoạn trích là bằng chứng cho thấy đường lối kháng chiến chống Pháp của ta mang tính chất toàn dân, toàn diện, trường kỳ và tự lực cánh sinh.

**Câu 2:** Đọc đoạn trích tư liệu sau:
> *"Điện Biên Phủ được xem là một pháo đài 'bất khả xâm phạm', con nhím khổng lồ giữa núi rừng Tây Bắc với 49 cứ điểm chia thành 3 phân khu kiên cố... Chiến thắng lịch sử Điện Biên Phủ năm 1954 đã giáng đòn quyết định vào ý chí xâm lược của thực dân Pháp, làm xoay chuyển cục diện chiến tranh, tạo cơ sở thực lực quyết định cho thắng lợi tại bàn đàm phán Hội nghị Giơnevơ."*

a) Điện Biên Phủ ngay từ khi vạch ra Kế hoạch Nava đã là trung tâm điểm số một được tướng Nava lựa chọn để xây dựng tập đoàn cứ điểm.  
b) Thắng lợi của Chiến dịch Điện Biên Phủ 1954 gắn liền với sự thay đổi phương châm tác chiến lịch sử từ "đánh nhanh, thắng nhanh" sang "đánh chắc, tiến chắc".  
c) Chiến dịch Điện Biên Phủ là chiến thắng mang tính quyết định quân sự trực tiếp buộc thực dân Pháp phải ký kết Hiệp định Giơnevơ năm 1954.  
d) Thắng lợi Điện Biên Phủ đã giải phóng hoàn toàn miền Nam và thống nhất đất nước về mặt nhà nước.

---

### 2. ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT PHIẾU HỌC TẬP SỐ 2

#### PHẦN I: TRẮC NGHIỆM 4 PHƯƠNG ÁN LỰA CHỌN
- **Câu 1:** Chọn **B**. Ngày 2/9/1945, Bác Hồ đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa.
- **Câu 2:** Chọn **A**. Mặt trận Việt Minh (thành lập 19/5/1941) là nơi tập hợp khối đại đoàn kết toàn dân tộc.
- **Câu 3:** Chọn **B**. Chiến dịch Biên giới Thu - Đông 1950 đánh dấu bước ngoặt ta giành quyền chủ động chiến lược trên chiến trường chính Bắc Bộ.
- **Câu 4:** Chọn **A**. Đại tướng Võ Nguyên Giáp đã sáng suốt đổi phương châm tác chiến từ "đánh nhanh, thắng nhanh" sang "đánh chắc, tiến chắc".
- **Câu 5:** Chọn **A**. Nhân tố quyết định hàng đầu mọi thắng lợi của cách mạng Việt Nam là sự lãnh đạo đúng đắn của Đảng.
- **Câu 6:** Chọn **A**. Đảng ta tạm gác khẩu hiệu "cách mạng ruộng đất", chỉ tịch thu ruộng đất của đế quốc và Việt gian chia cho dân cày nghèo, tập trung cao nhất vào ngọn cờ giải phóng dân tộc.

#### PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
- **Câu 1:**
  + a) **ĐÚNG.** Lời kêu gọi toàn quốc kháng chiến phát đi đêm 19/12/1946 mở đầu cuộc kháng chiến toàn quốc.
  + b) **SAI.** Sự nhân nhượng của ta (ký Hiệp định Sơ bộ 6/3 và Tạm ước 14/9) là sự nhân nhượng có nguyên tắc, tranh thủ thời gian hòa hoãn quý báu để chuẩn bị lực lượng.
  + c) **ĐÚNG.** Câu *"Thà hy sinh tất cả chứ nhất định không chịu mất nước"* thể hiện tinh thần quyết tử cho Tổ quốc quyết sinh.
  + d) **ĐÚNG.** Lời kêu gọi *"Hỡi đồng bào! Bất kỳ đàn ông, đàn bà, bất kỳ người già, người trẻ... hễ là người Việt Nam thì phải đứng lên"* phản ánh rõ nét tính chất toàn dân của kháng chiến.

- **Câu 2:**
  + a) **SAI.** Ban đầu trong Kế hoạch Nava không hề có địa danh Điện Biên Phủ; do ta chủ động tiến công ở Đông - Xuân 1953 - 1954 nên Nava mới bị động biến Điện Biên Phủ thành tập đoàn cứ điểm mạnh nhất Đông Dương.
  + b) **ĐÚNG.** Quyết định thay đổi phương châm sang "đánh chắc, tiến chắc" của Đại tướng Tổng tư lệnh Võ Nguyên Giáp là nguyên nhân then chốt làm nên chiến thắng.
  + c) **ĐÚNG.** Chiến thắng quân sự Điện Biên Phủ tạo tiền đề quyết định thắng lợi ngoại giao tại Hội nghị Giơnevơ.
  + d) **SAI.** Chiến thắng Điện Biên Phủ mới chỉ giải phóng miền Bắc, miền Nam vẫn tạm thời dưới quyền kiểm soát của đối phương theo vĩ tuyến 17.

---

| **NGƯỜI SOẠN** | **TỔ TRƯỞNG CHUYÊN MÔN DUYỆT** |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| **Giáo viên cốt cán môn Lịch sử** | **Tổ trưởng Tổ Khoa học Xã hội** |
`;

export const SAMPLE_ENGLISH_PLAN = String.raw`# KẾ HOẠCH BÀI DẠY ÔN THI TỐT NGHIỆP THPT NĂM HỌC 2026 – 2027
**Môn học:** Tiếng Anh 12 | **Chương trình:** GDPT 2018 (SGK Tiếng Anh 12)  
**Chủ đề:** **TOPIC 1. PHONETICS, WORD STRESS PATTERNS AND CORE LEXICO-GRAMMAR MASTERY**  
**Thời lượng:** $3$ tiết ($135$ phút) | **Tiết PPCT:** $1 - 3$  
**Đối tượng áp dụng:** Học sinh lớp 12 (mục tiêu $6.5 - 7.5$ và học sinh thi khối $D01, A01$ mục tiêu $8.0+$)

---

## I. MỤC TIÊU

### 1. Về kiến thức
- Nắm vững quy tắc phát âm đuôi "-ed" (/t/, /d/, /ɪd/) và đuôi "-s/es" (/s/, /z/, /ɪz/), các trường hợp ngoại lệ (naked, wicked, beloved, learned...).
- Nắm vững quy tắc đánh trọng âm từ 2 âm tiết (danh từ, tính từ trọng âm 1; động từ trọng âm 2) và từ 3 âm tiết trở lên với các hậu tố đặc trưng (-tion, -ic, -ity, -ee, -ese...).
- Ôn tập chuyên sâu các thì động từ trọng tâm (Past Simple vs Past Continuous, Present Perfect, Future forms) và sự hòa hợp thì trong câu phức.
- Nhận biết các cụm từ cố định (Collocations) và phrasal verbs thường gặp trong đề thi tốt nghiệp.

### 2. Về năng lực
- **Năng lực ngôn ngữ:** Nhận biết và phân biệt chính xác ngữ âm, cấu trúc ngữ pháp và từ vựng trong văn cảnh.
- **Năng lực giải quyết bài thi:** Thành thạo 100% trắc nghiệm 4 lựa chọn chia theo 5 phần chuẩn đề thi tốt nghiệp mới: Phonetics, Grammar/Vocab, Cloze Test, Reading Comprehension và Error Identification/Communication.

### 3. Về phẩm chất
- Rèn luyện tính cẩn trọng, phát triển thói quen đọc kỹ đề và nhận diện bẫy ngữ pháp.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. **Giáo viên:** Kế hoạch bài dạy chuẩn CV 5512, slide trình chiếu quy tắc phát âm và các bảng tra nhanh, Phiếu học tập số 1 và số 2.
2. **Học sinh:** Vở ghi chuyên đề tiếng Anh, từ điển, hoàn thành phần bài tập chuẩn bị trước ở nhà.

---

## III. TIẾN TRÌNH DẠY HỌC

### TIẾT 1: QUY TẮC NGỮ ÂM, TRỌNG ÂM VÀ THỦ THUẬT XỬ LÝ NHANH (45 phút)

#### Hoạt động 1: Khởi động và Hệ thống hóa quy tắc ngữ âm (15 phút)
**a) Mục tiêu:** Ôn tập quy tắc phát âm đuôi -ed, đuôi -s/es và quy tắc trọng âm.  
**b) Nội dung:** Học sinh thảo luận theo cặp hoàn thiện bảng quy tắc:
1. Phát âm đuôi "-ed":
   - Đọc là /ɪd/ sau các âm /t/, /d/ (wanted, decided...).
   - Đọc là /t/ sau các âm vô thanh: /p/, /k/, /f/, /s/, /ʃ/, /tʃ/ (mẹo: "thời phong kiến phương tây").
   - Đọc là /d/ sau các nguyên âm và phụ âm hữu thanh còn lại.
   - Ngoại lệ đọc là /ɪd/: *naked, wicked, crooked, blessed, rugged...*
2. Quy tắc trọng âm:
   - Hậu tố kéo trọng âm rơi vào âm tiết đứng ngay trước nó: *-tion, -sion, -ic, -ical, -ity, -ian*.
   - Hậu tố nhận trọng âm vào chính nó: *-ee, -eer, -ese, -ique, -esque*.  
**c) Sản phẩm:** Bảng tóm tắt quy tắc ngữ âm trong vở học sinh.  
**d) Tổ chức thực hiện:** GV phát âm mẫu, gọi HS nhắc lại và chỉ ra các từ ngoại lệ.

---

#### Hoạt động 2: Phân loại dạng bài và Phân tích ví dụ mẫu (30 phút)
**a) Mục tiêu:** Thực hành xử lý các câu hỏi ngữ âm, trọng âm và ngữ pháp trọng tâm.  
**b) Nội dung:**

##### Dạng 1: Phát âm và Trọng âm
- **Ví dụ mẫu 1:** Choose the word whose underlined part is pronounced differently from that of the others.  
A. look**ed**  
B. stopp**ed**  
C. play**ed**  
D. watch**ed**  
*Lời giải chi tiết:*  
Looked /lʊkt/, stopped /stɒpt/, watched /wɒtʃt/ có đuôi "-ed" phát âm là /t/ (do đứng sau /k/, /p/, /tʃ/).  
Played /pleɪd/ có đuôi "-ed" phát âm là /d/ (đứng sau nguyên âm). **Chọn C.**

- **Ví dụ mẫu 2:** Choose the word that differs from the other three in the position of primary stress.  
A. attract  
B. polite  
C. student  
D. decide  
*Lời giải chi tiết:*  
Attract /əˈtrækt/ (động từ 2 âm tiết, trọng âm 2).  
Polite /pəˈlaɪt/ (tính từ 2 âm tiết có âm 1 là /ə/, trọng âm 2).  
Student /ˈstjuːdnt/ (danh từ 2 âm tiết, trọng âm 1).  
Decide /dɪˈsaɪd/ (động từ 2 âm tiết, trọng âm 2). **Chọn C.**

---

### TIẾT 2: RÈN KỸ NĂNG NGỮ PHÁP, CLOZE TEST VÀ TỪ VỰNG NGỮ CẢNH (45 phút)

#### Hoạt động 2 (tiếp theo): Ngữ pháp thì, Câu điều kiện và Đọc điền từ (45 phút)
- **Sự phối hợp thì:** $Past\ Continuous + When + Past\ Simple$ hoặc $While + Past\ Continuous$.
- **Thì Hiện tại hoàn thành:** Đi với các liên từ *since, for, already, yet, so far*.
- **Chiến thuật làm bài Cloze Test (Đọc điền từ):**
  + Bước 1: Đọc câu chứa chỗ trống, xác định từ loại cần điền (Noun, Verb, Adjective, Adverb, Relative Pronoun, Connector).
  + Bước 2: Nhìn trước và nhìn sau chỗ trống để tìm giới từ đi kèm hoặc cấu trúc song hành.
  + Bước 3: Đọc lướt cả đoạn văn để chọn liên từ phù hợp với mạch tư duy (However, Therefore, Moreover...).

---

### TIẾT 3: LUYỆN ĐỀ ĐỊNH DẠNG MỚI VÀ NHẬN DIỆN BẪY TRẮC NGHIỆM (45 phút)

#### Hoạt động 3: Luyện tập theo Phiếu học tập số 2 (25 phút)
**a) Mục tiêu:** Rèn luyện xử lý trọn vẹn 1 phiếu bài tập trắc nghiệm đa chuyên đề.  
**b) Nội dung:** Học sinh thực hành giải Phiếu học tập số 2.  
**c) Sản phẩm:** Phiếu trả lời trắc nghiệm hoàn chỉnh của học sinh.  
**d) Tổ chức thực hiện:** GV cho HS làm việc cá nhân 15 phút, sau đó đối chiếu chéo kết quả theo cặp.

---

#### Hoạt động 4: Kỹ năng nhận diện bẫy trong đề thi tiếng Anh (10 phút)
- **Bẫy hòa hợp chủ ngữ - vị ngữ:** Cụm từ chèn giữa chủ ngữ và động từ (*as well as, along with, together with, accompanied by*) không làm thay đổi số ít/số nhiều của chủ ngữ chính phía trước.
- **Bẫy đại từ quan hệ:** *"which"* thay cho mệnh đề phía trước phải có dấu phẩy đứng trước; không dùng *"that"* sau dấu phẩy hoặc sau giới từ.

---

#### Hoạt động 5: Vận dụng và Hướng dẫn tự học ở nhà (10 phút)
- Làm lại các câu sai trong vở sửa lỗi và ghi chú từ mới.
- Đọc trước **Topic 2: Advanced Verb Tenses and Passive Voice Mastery**.

---

## IV. PHỤ LỤC: HỆ THỐNG PHIẾU HỌC TẬP VÀ ĐÁP ÁN CHI TIẾT

### 1. PHIẾU HỌC TẬP SỐ 2 (ĐỊNH DẠNG 100% TRẮC NGHIỆM MÔN TIẾNG ANH)

#### I. PHONETICS & STRESS
**Question 1:** Choose the word whose underlined part differs from the others in pronunciation.  
A. nak**ed**  
B. look**ed**  
C. book**ed**  
D. miss**ed**

**Question 2:** Choose the word that differs from the other three in the position of primary stress.  
A. economic  
B. understand  
C. introduce  
D. difficult

#### II. VOCABULARY & GRAMMAR
**Question 3:** When my father ______ home yesterday evening, my mother was cooking dinner in the kitchen.  
A. came  
B. comes  
C. was coming  
D. had come

**Question 4:** The government is trying to ______ down on illegal logging in the national parks.  
A. make  
B. crack  
C. take  
D. run

**Question 5:** If I ______ enough money now, I would buy that new laptop for my online studies.  
A. have  
B. had  
C. had had  
D. will have

**Question 6:** Nam is very fond ______ reading scientific books in his spare time.  
A. in  
B. on  
C. of  
D. at

#### III. CLOZE TEST (GUIDED GAP-FILLING)
*Read the following passage and choose the correct option (A, B, C, or D) for each gap:*  
Urbanisation is the movement of people from rural areas to cities in search of better living conditions and employment opportunities. It brings about significant economic growth; (7)______, it also poses numerous challenges such as traffic congestion and air pollution. Many cities are now investing heavily in (8)______ transport systems to reduce greenhouse gas emissions and improve public health.

**Question 7:**  
A. however  
B. therefore  
C. because  
D. although

**Question 8:**  
A. public  
B. private  
C. personal  
D. solitary

#### IV. READING COMPREHENSION
*Read the following passage and choose the correct answer:*  
Artificial Intelligence (AI) is transforming the way students learn today. Rather than replacing teachers, AI tools serve as personal learning assistants that adapt to each student's learning speed and individual needs. Educational platforms powered by AI can identify areas where a student struggles and provide customised practice exercises. Consequently, students can master complex concepts more efficiently while teachers have more time to focus on developing critical thinking and creativity.

**Question 9:** What is the main idea of the passage?  
A. AI will completely replace teachers in the future.  
B. AI is supporting and personalising the learning process for students.  
C. Traditional teaching methods are no longer effective.  
D. Students spend too much time using AI tools.

**Question 10:** The word **"customised"** in the passage is closest in meaning to:  
A. tailored  
B. generic  
C. ordinary  
D. random

---

### 2. BẢNG ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT PHIẾU HỌC TẬP SỐ 2

| Câu | Đáp án | Phân tích chi tiết ngữ pháp và ngữ cảnh |
| :---: | :---: | :--- |
| **1** | **A** | *Naked* là tính từ ngoại lệ phát âm đuôi -ed là /ɪd/ (/ˈneɪkɪd/). Các từ còn lại phát âm là /t/. |
| **2** | **D** | *Difficult* /ˈdɪfɪkəlt/ có trọng âm rơi vào âm tiết thứ nhất. Các từ còn lại rơi vào âm tiết thứ 3: *economic* /ˌiːkəˈnɒmɪk/, *understand* /ˌʌndəˈstænd/, *introduce* /ˌɪntrəˈdjuːs/. |
| **3** | **A** | Cấu trúc hòa hợp thì: Một hành động đang diễn ra trong quá khứ ($was\ cooking$) thì một hành động ngắn khác xen vào ($came$ - thì Quá khứ đơn). |
| **4** | **B** | Cụm động từ cố định: *crack down on sth* (nghiêm trị, trấn áp tệ nạn/hành vi bất hợp pháp). |
| **5** | **B** | Câu điều kiện loại 2 giả định điều trái với thực tế ở hiện tại ($now$): $If + S + V_{ed/P1}, S + would + V_{inf}$. |
| **6** | **C** | Cụm tính từ đi với giới từ: *to be fond of sth / V-ing* (rất thích, say mê điều gì). |
| **7** | **A** | *However* (tuy nhiên) dùng để nối hai vế tương phản nhau về mặt ý nghĩa, sau dấu chấm phẩy và trước dấu phẩy. |
| **8** | **A** | Cụm từ: *public transport systems* (hệ thống giao thông công cộng như xe buýt, tàu điện ngầm). |
| **9** | **B** | Ý chính đoạn văn nói về việc AI hỗ trợ và cá nhân hóa quá trình học tập của học sinh, không thay thế giáo viên. |
| **10** | **A** | Từ *customised* (được thiết kế/tùy biến riêng theo nhu cầu) đồng nghĩa với *tailored*. |

---

| **NGƯỜI SOẠN** | **TỔ TRƯỞNG CHUYÊN MÔN DUYỆT** |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| **Giáo viên cốt cán môn Tiếng Anh** | **Tổ trưởng Tổ Ngoại ngữ** |
`;

export function getSampleLessonPlan(subjectId: string): string {
  switch (subjectId) {
    case "toan":
      return SAMPLE_MATH_PLAN;
    case "vat_ly":
      return SAMPLE_PHYSICS_PLAN;
    case "ngu_van":
      return SAMPLE_LITERATURE_PLAN;
    case "lich_su":
      return SAMPLE_HISTORY_PLAN;
    case "tieng_anh":
      return SAMPLE_ENGLISH_PLAN;
    default:
      // For chemistry, biology, geography, GD KTPL, CS, default to a high quality template
      return SAMPLE_MATH_PLAN;
  }
}
