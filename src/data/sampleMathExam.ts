export interface SampleQuestion {
  id: number;
  type: "mc" | "tf" | "sa" | "essay";
  level: string;
  isRealWorld?: boolean;
  topic?: string;
  subtopic?: string;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  explanation?: string;
  solution?: string;
}

export const SAMPLE_MATH_EXAM_NAME = "ĐỀ KIỂM TRA ĐỊNH KỲ TOÁN HỌC - KHUNG CHUẨN 2025";
export const SAMPLE_MATH_DURATION = 90;

// ==================== KHỐI 12 SAMPLE QUESTIONS ====================
export const SAMPLE_MATH_QUESTIONS: SampleQuestion[] = [
  // PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN (12 CÂU)
  {
    id: 1,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số và Đồ thị",
    subtopic: "Đồng biến và nghịch biến",
    content: "Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm như sau:\n\n| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |\n|---|---|---|---|---|---|---|---|\n| $f'(x)$ | | $+$ | $0$ | $-$ | $0$ | $+$ | |\n\nHàm số đã cho đồng biến trên khoảng nào dưới đây?",
    options: [
      "$(-\\infty; -1)$",
      "$(-1; 2)$",
      "$(-\\infty; 2)$",
      "$(-1; +\\infty)$"
    ],
    correctOptionIndex: 0,
    explanation: "Dựa vào bảng xét dấu, $f'(x) > 0$ trên các khoảng $(-\\infty; -1)$ và $(2; +\\infty)$. Do đó hàm số đồng biến trên khoảng $(-\\infty; -1)$."
  },
  {
    id: 2,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số và Đồ thị",
    subtopic: "Cực trị hàm số",
    content: "Điểm cực tiểu của đồ thị hàm số $y = x^3 - 3x + 2$ là điểm nào dưới đây?",
    options: [
      "$(1; 0)$",
      "$(-1; 4)$",
      "$x = 1$",
      "$y = 0$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Vì $y''(1) = 6 > 0$ nên $x = 1$ là điểm cực tiểu của hàm số, khi đó $y(1) = 1 - 3 + 2 = 0$. Vậy điểm cực tiểu của đồ thị là $(1; 0)$."
  },
  {
    id: 3,
    type: "mc",
    level: "Thông hiểu",
    topic: "Hàm số và Đồ thị",
    subtopic: "Tiệm cận đồ thị hàm số",
    content: "Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{2x - 1}{x + 1}$ có phương trình là:",
    options: [
      "$x = -1$",
      "$x = 2$",
      "$y = 2$",
      "$y = -1$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\lim_{x \\to (-1)^+} \\frac{2x - 1}{x + 1} = -\\infty$ nên đường thẳng $x = -1$ là tiệm cận đứng của đồ thị hàm số."
  },
  {
    id: 4,
    type: "mc",
    level: "Thông hiểu",
    topic: "Mũ và Logarit",
    subtopic: "Nghiệm phương trình mũ",
    content: "Tập nghiệm của phương trình $2^{2x - 1} = 8$ là:",
    options: [
      "$\\{2\\}$",
      "$\\{1\\}$",
      "$\\{\\frac{7}{2}\\}$",
      "$\\{4\\}$"
    ],
    correctOptionIndex: 0,
    explanation: "Phương trình tương đương với $2^{2x - 1} = 2^3 \\Leftrightarrow 2x - 1 = 3 \\Leftrightarrow 2x = 4 \\Leftrightarrow x = 2$."
  },
  {
    id: 5,
    type: "mc",
    level: "Thông hiểu",
    topic: "Mũ và Logarit",
    subtopic: "Tập xác định logarit",
    content: "Tập xác định của hàm số $y = \\log_3 (x - 2)$ là:",
    options: [
      "$(2; +\\infty)$",
      "$[2; +\\infty)$",
      "$(-\\infty; 2)$",
      "$\\mathbb{R} \\setminus \\{2\\}$"
    ],
    correctOptionIndex: 0,
    explanation: "Điều kiện xác định của hàm số: $x - 2 > 0 \\Leftrightarrow x > 2$. Vậy tập xác định là $D = (2; +\\infty)$."
  },
  {
    id: 6,
    type: "mc",
    level: "Nhận biết",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Công thức nguyên hàm",
    content: "Họ tất cả các nguyên hàm của hàm số $f(x) = \\cos x + 2x$ là:",
    options: [
      "$\\sin x + x^2 + C$",
      "$-\\sin x + x^2 + C$",
      "$\\sin x + 2 + C$",
      "$-\\sin x + 2 + C$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\int (\\cos x + 2x) dx = \\sin x + x^2 + C$."
  },
  {
    id: 7,
    type: "mc",
    level: "Thông hiểu",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Tính chất tích phân",
    content: "Biết $\\int_1^2 f(x) dx = 3$ và $\\int_1^2 g(x) dx = -2$. Khi đó $\\int_1^2 [2f(x) + g(x)] dx$ bằng:",
    options: [
      "$4$",
      "$1$",
      "$8$",
      "$-1$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\int_1^2 [2f(x) + g(x)] dx = 2 \\int_1^2 f(x) dx + \\int_1^2 g(x) dx = 2 \\cdot 3 + (-2) = 4$."
  },
  {
    id: 8,
    type: "mc",
    level: "Nhận biết",
    topic: "Hình học Oxyz",
    subtopic: "Tọa độ vectơ",
    content: "Trong không gian $Oxyz$, cho hai điểm $A(1; 2; -1)$ và $B(2; 0; 1)$. Tọa độ của vectơ $\\vec{AB}$ là:",
    options: [
      "$(1; -2; 2)$",
      "$(3; 2; 0)$",
      "$(-1; 2; -2)$",
      "$(\\frac{3}{2}; 1; 0)$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A) = (2 - 1; 0 - 2; 1 - (-1)) = (1; -2; 2)$."
  },
  {
    id: 9,
    type: "mc",
    level: "Nhận biết",
    topic: "Hình học Oxyz",
    subtopic: "Phương trình mặt cầu",
    content: "Trong không gian $Oxyz$, mặt cầu $(S): (x - 1)^2 + (y + 2)^2 + z^2 = 9$ có tâm $I$ và bán kính $R$ lần lượt là:",
    options: [
      "$I(1; -2; 0)$, $R = 3$",
      "$I(-1; 2; 0)$, $R = 3$",
      "$I(1; -2; 0)$, $R = 9$",
      "$I(-1; 2; 0)$, $R = 9$"
    ],
    correctOptionIndex: 0,
    explanation: "Từ phương trình chuẩn $(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2$, ta có tâm $I(1; -2; 0)$ và bán kính $R = \\sqrt{9} = 3$."
  },
  {
    id: 10,
    type: "mc",
    level: "Thông hiểu",
    topic: "Hình học Oxyz",
    subtopic: "Vectơ pháp tuyến mặt phẳng",
    content: "Trong không gian $Oxyz$, vectơ nào sau đây là một vectơ pháp tuyến của mặt phẳng $(\\alpha): 2x - y + 3z - 1 = 0$?",
    options: [
      "$\\vec{n} = (2; -1; 3)$",
      "$\\vec{n} = (2; 1; 3)$",
      "$\\vec{n} = (2; -1; -1)$",
      "$\\vec{n} = (-2; -1; 3)$"
    ],
    correctOptionIndex: 0,
    explanation: "Mặt phẳng có phương trình $Ax + By + Cz + D = 0$ có một VTPT là $\\vec{n} = (A; B; C) = (2; -1; 3)$."
  },
  {
    id: 11,
    type: "mc",
    level: "Thông hiểu",
    topic: "Thống kê & Xác suất",
    subtopic: "Quy tắc nhân xác suất",
    content: "Gieo một con xúc xắc cân đối và đồng chất hai lần. Xác suất để tổng số chấm xuất hiện trong hai lần gieo bằng $7$ là:",
    options: [
      "$\\frac{1}{6}$",
      "$\\frac{5}{36}$",
      "$\\frac{7}{36}$",
      "$\\frac{1}{12}$"
    ],
    correctOptionIndex: 0,
    explanation: "Số phần tử không gian mẫu $n(\\Omega) = 6 \\times 6 = 36$. Các cặp có tổng bằng $7$ là $(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)$ gồm $6$ biến cố thuận lợi. Do đó $P = \\frac{6}{36} = \\frac{1}{6}$."
  },
  {
    id: 12,
    type: "mc",
    level: "Vận dụng",
    topic: "Hàm số và Đồ thị",
    subtopic: "Giá trị lớn nhất và nhỏ nhất",
    content: "Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:",
    options: [
      "$11$",
      "$3$",
      "$2$",
      "$9$"
    ],
    correctOptionIndex: 0,
    explanation: "Ta có $f'(x) = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\Leftrightarrow x = 0, x = 1, x = -1$. Trên $[0; 2]$, ta xét $x = 0, x = 1, x = 2$. Ta có: $f(0) = 3$, $f(1) = 2$, $f(2) = 16 - 8 + 3 = 11$. Vậy $\\max_{[0; 2]} f(x) = 11$ tại $x = 2$."
  },
  {
    id: 13,
    type: "tf",
    level: "Thông hiểu",
    topic: "Hàm số và Đồ thị",
    subtopic: "Khảo sát hàm phân thức hữu tỉ",
    content: "Cho hàm số $y = f(x) = \\frac{x + 2}{x - 1}$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{1\\}$.", correct: true },
      { statement: "Đạo hàm của hàm số là $y' = \\frac{-3}{(x - 1)^2}$ với mọi $x \\ne 1$.", correct: true },
      { statement: "Hàm số đồng biến trên từng khoảng xác định $(-\\infty; 1)$ và $(1; +\\infty)$.", correct: false },
      { statement: "Giao điểm của hai đường tiệm cận của đồ thị hàm số là điểm $I(1; 1)$.", correct: true }
    ],
    explanation: "a) Đúng vì mẫu thức $x - 1 \\ne 0 \\Leftrightarrow x \\ne 1$.\nb) Đúng vì $y' = \\frac{1 \\cdot (-1) - 2 \\cdot 1}{(x - 1)^2} = \\frac{-3}{(x - 1)^2} < 0$.\nc) Sai vì $y' < 0$ nên hàm số nghịch biến trên từng khoảng xác định.\nd) Đúng vì tiệm cận đứng là $x = 1$, tiệm cận ngang là $y = 1$, giao điểm là $I(1; 1)$."
  },
  {
    id: 14,
    type: "tf",
    level: "Vận dụng",
    topic: "Hình học Oxyz",
    subtopic: "Đường thẳng và mặt phẳng",
    content: "Trong không gian $Oxyz$, cho ba điểm $A(1; 0; 0)$, $B(0; 2; 0)$, $C(0; 0; 3)$ và mặt phẳng $(P): x + 2y + 3z - 6 = 0$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Phương trình mặt phẳng $(ABC)$ theo đoạn chắn là $\\frac{x}{1} + \\frac{y}{2} + \\frac{z}{3} = 1$.", correct: true },
      { statement: "Mặt phẳng $(ABC)$ song song với mặt phẳng $(P)$.", correct: false },
      { statement: "Khoảng cách từ gốc tọa độ $O$ đến mặt phẳng $(ABC)$ bằng $\\frac{6}{7}$.", correct: true },
      { statement: "Điểm $M(1; 1; 1)$ thuộc cả hai mặt phẳng $(ABC)$ và $(P)$.", correct: false }
    ],
    explanation: "a) Đúng: Mặt phẳng đi qua các điểm trên các trục tọa độ có dạng đoạn chắn $\\frac{x}{1} + \\frac{y}{2} + \\frac{z}{3} = 1 \\Leftrightarrow 6x + 3y + 2z - 6 = 0$.\nb) Sai: VTPT của $(ABC)$ là $\\vec{n}_1 = (6; 3; 2)$, còn VTPT của $(P)$ là $\\vec{n}_2 = (1; 2; 3)$ không cùng phương.\nc) Đúng: $d(O, (ABC)) = \\frac{|-6|}{\\sqrt{6^2 + 3^2 + 2^2}} = \\frac{6}{\\sqrt{49}} = \\frac{6}{7}$.\nd) Sai: Thay $M(1;1;1)$ vào $(ABC)$: $6(1)+3(1)+2(1)-6 = 5 \\ne 0$, nên $M \\notin (ABC)$."
  },
  {
    id: 15,
    type: "sa",
    level: "Thông hiểu",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Tính tích phân xác định",
    content: "Tính giá trị của tích phân $I = \\int_0^1 (3x^2 + 2x) dx$.",
    correctAnswer: "2",
    explanation: "Ta có nguyên hàm $F(x) = x^3 + x^2$. Khi đó $I = F(1) - F(0) = (1^3 + 1^2) - 0 = 2$."
  },
  {
    id: 16,
    type: "sa",
    level: "Vận dụng",
    topic: "Hình học Oxyz",
    subtopic: "Khoảng cách từ điểm đến mặt phẳng",
    content: "Trong không gian $Oxyz$, tính khoảng cách từ điểm $M(1; 2; 3)$ đến mặt phẳng $(P): 2x - 2y + z + 5 = 0$.",
    correctAnswer: "2",
    explanation: "Áp dụng công thức khoảng cách:\n$$d(M, (P)) = \\frac{|2(1) - 2(2) + 1(3) + 5|}{\\sqrt{2^2 + (-2)^2 + 1^2}} = \\frac{|2 - 4 + 3 + 5|}{\\sqrt{9}} = \\frac{6}{3} = 2.$$"
  },
  {
    id: 17,
    type: "sa",
    level: "Vận dụng",
    topic: "Hàm số và Đồ thị",
    subtopic: "Giá trị nhỏ nhất",
    content: "Tìm giá trị nhỏ nhất của hàm số $y = x + \\frac{4}{x}$ trên khoảng $(0; +\\infty)$.",
    correctAnswer: "4",
    explanation: "Áp dụng bất đẳng thức Cauchy cho hai số dương $x$ và $\\frac{4}{x}$:\n$$x + \\frac{4}{x} \\ge 2 \\sqrt{x \\cdot \\frac{4}{x}} = 2 \\cdot 2 = 4.$$\nDấu đẳng thức xảy ra khi $x = \\frac{4}{x} \\Leftrightarrow x^2 = 4 \\Leftrightarrow x = 2$ (thỏa mãn $x > 0$). Vậy giá trị nhỏ nhất bằng $4$."
  },
  {
    id: 18,
    type: "sa",
    level: "Vận dụng cao",
    isRealWorld: true,
    topic: "Thống kê & Xác suất",
    subtopic: "Biến cố độc lập",
    content: "Một xạ thủ bắn độc lập $3$ viên đạn vào một bia. Xác suất bắn trúng ở mỗi lần bắn là $p = 0{,}8$. Tính xác suất để có đúng $2$ viên đạn trúng bia.",
    correctAnswer: "0.384",
    explanation: "Xác suất bắn trúng mỗi lần là $p = 0{,}8$, xác suất bắn trượt là $q = 1 - 0{,}8 = 0{,}2$. Xác suất để có đúng $2$ viên trúng bia trong $3$ lần bắn độc lập là:\n$$P = C_3^2 \\cdot (0{,}8)^2 \\cdot (0{,}2)^1 = 3 \\cdot 0{,}64 \\cdot 0{,}2 = 0{,}384.$$"
  },
  {
    id: 19,
    type: "essay",
    level: "Vận dụng",
    topic: "Nguyên hàm - Tích phân",
    subtopic: "Ứng dụng hình học của tích phân",
    content: "Tính diện tích hình phẳng giới hạn bởi đồ thị hàm số $y = -x^2 + 2x$ và trục hoành $Ox$.",
    correctAnswer: "Diện tích $S = \\frac{4}{3}$",
    explanation: "Phương trình hoành độ giao điểm của parabol và trục hoành:\n$$-x^2 + 2x = 0 \\Leftrightarrow x(-x + 2) = 0 \\Leftrightarrow x = 0 \\text{ hoặc } x = 2.$$\n\nVì trên đoạn $[0; 2]$, ta có $-x^2 + 2x \\ge 0$, nên diện tích hình phẳng là:\n$$S = \\int_0^2 (-x^2 + 2x) dx = \\left[ -\\frac{x^3}{3} + x^2 \\right]_0^2 = \\left( -\\frac{8}{3} + 4 \\right) - 0 = \\frac{4}{3} \\text{ (đvdt)}.$$"
  },
  {
    id: 20,
    type: "essay",
    level: "Vận dụng cao",
    isRealWorld: true,
    topic: "Hàm số và Đồ thị",
    subtopic: "Bài toán thực tế tối ưu hóa",
    content: "Một người làm vườn muốn rào một khu đất hình chữ nhật có diện tích $200\\text{ m}^2$ sát một bờ tường thẳng (bờ tường không cần rào). Ba cạnh còn lại được rào bằng lưới thép. Tìm chiều dài và chiều rộng của khu đất để tổng chiều dài hàng rào lưới thép là ngắn nhất. Tính chiều dài ngắn nhất đó.",
    correctAnswer: "Chiều rộng $x = 10\\text{ m}$, chiều dài $y = 20\\text{ m}$, chiều dài hàng rào ngắn nhất là $40\\text{ m}$.",
    explanation: "Gọi $x$ (m) là chiều rộng của khu đất (hai cạnh vuông góc với bờ tường), điều kiện $x > 0$.\nKhi đó chiều dài của khu đất (cạnh song song với bờ tường) là $y = \\frac{200}{x}$ (m).\n\nTổng chiều dài hàng rào lưới thép cần dùng là:\n$$L(x) = 2x + y = 2x + \\frac{200}{x} \\quad (x > 0).$$\n\nCách 1: Áp dụng bất đẳng thức Cauchy:\n$$L(x) = 2x + \\frac{200}{x} \\ge 2 \\sqrt{2x \\cdot \\frac{200}{x}} = 2 \\sqrt{400} = 40.$$\nDấu đẳng thức xảy ra khi:\n$$2x = \\frac{200}{x} \\Leftrightarrow 2x^2 = 200 \\Leftrightarrow x^2 = 100 \\Leftrightarrow x = 10 \\text{ (vì } x > 0\\text{)}.$$\nKhi đó $y = \\frac{200}{10} = 20\\text{ m}$.\n\nKết luận: Tổng chiều dài hàng rào ngắn nhất là $40\\text{ m}$ khi chiều rộng là $10\\text{ m}$ và chiều dài là $20\\text{ m}$."
  }
];

// ==================== KHỐI 10 SAMPLE QUESTIONS ====================
export const SAMPLE_MATH_QUESTIONS_10: SampleQuestion[] = [
  {
    id: 1,
    type: "mc",
    level: "Nhận biết",
    topic: "Mệnh đề và Tập hợp",
    subtopic: "Các phép toán tập hợp",
    content: "Cho hai tập hợp $A = \\{1; 2; 3; 4\\}$ và $B = \\{3; 4; 5; 6\\}$. Tập hợp $A \\cap B$ bằng:",
    options: ["$\\{3; 4\\}$", "$\\{1; 2; 3; 4; 5; 6\\}$", "$\\{1; 2\\}$", "$\\{5; 6\\}$"],
    correctOptionIndex: 0,
    explanation: "Giao của hai tập hợp là tập gồm các phần tử chung của cả hai tập hợp. Ta thấy $3, 4$ thuộc cả $A$ và $B$. Vậy $A \\cap B = \\{3; 4\\}$."
  },
  {
    id: 2,
    type: "mc",
    level: "Nhận biết",
    topic: "Mệnh đề và Tập hợp",
    subtopic: "Các phép toán tập hợp trên trục số",
    content: "Cho hai tập hợp $A = [-2; 3]$ và $B = (1; 5)$. Tập hợp $A \\cap B$ là khoảng nào?",
    options: ["$(1; 3]$", "$[-2; 5)$", "$[-2; 1)$", "$(3; 5)$"],
    correctOptionIndex: 0,
    explanation: "Ta có $A \\cap B = [-2; 3] \\cap (1; 5) = (1; 3]$."
  },
  {
    id: 3,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số và Đồ thị bậc hai",
    subtopic: "Đỉnh parabol bậc hai",
    content: "Cho hàm số bậc hai $y = x^2 - 4x + 3$ có đồ thị là parabol $(P)$. Tọa độ đỉnh $I$ của $(P)$ là:",
    options: ["$I(2; -1)$", "$I(4; 3)$", "$I(-2; 15)$", "$I(2; 1)$"],
    correctOptionIndex: 0,
    explanation: "Tọa độ đỉnh $I(x_I; y_I)$ có $x_I = -\\frac{b}{2a} = -\\frac{-4}{2 \\cdot 1} = 2$. Thay vào phương trình hàm số: $y_I = 2^2 - 4 \\cdot 2 + 3 = -1$. Vậy $I(2; -1)$."
  },
  {
    id: 4,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số và Đồ thị bậc hai",
    subtopic: "Giải bất phương trình bậc hai",
    content: "Tập nghiệm của bất phương trình bậc hai $x^2 - 4x + 3 < 0$ là khoảng nào?",
    options: ["$(1; 3)$", "$(-\\infty; 1) \\cup (3; +\\infty)$", "$[1; 3]$", "$(-\\infty; 1]$"],
    correctOptionIndex: 0,
    explanation: "Tam thức bậc hai $x^2 - 4x + 3$ có hệ số $a = 1 > 0$ và hai nghiệm là $1$ và $3$. Tam thức trái dấu với hệ số $a$ (tức mang dấu âm) trong khoảng hai nghiệm. Vậy tập nghiệm là $(1; 3)$."
  },
  {
    id: 5,
    type: "mc",
    level: "Nhận biết",
    topic: "Vectơ và Hệ tọa độ",
    subtopic: "Tọa độ trung điểm",
    content: "Trong mặt phẳng tọa độ $Oxy$, cho $A(1; 3)$ và $B(3; -1)$. Tọa độ trung điểm $I$ của đoạn thẳng $AB$ là:",
    options: ["$I(2; 1)$", "$I(4; 2)$", "$I(2; 2)$", "$I(1; -2)$"],
    correctOptionIndex: 0,
    explanation: "Tọa độ trung điểm $I$ là: $x_I = \\frac{1 + 3}{2} = 2$ và $y_I = \\frac{3 + (-1)}{2} = 1$. Vậy $I(2; 1)$."
  },
  {
    id: 6,
    type: "mc",
    level: "Thông hiểu",
    topic: "Vectơ và Hệ tọa độ",
    subtopic: "Tích vô hướng hai vectơ",
    content: "Trong mặt phẳng tọa độ $Oxy$, cho hai vectơ $\\vec{a} = (1; 2)$ và $\\vec{b} = (4; 3)$. Tích vô hướng $\\vec{a} \\cdot \\vec{b}$ bằng:",
    options: ["$10$", "$11$", "$14$", "$5$"],
    correctOptionIndex: 0,
    explanation: "Tích vô hướng $\\vec{a} \\cdot \\vec{b} = a_1 b_1 + a_2 b_2 = 1 \\cdot 4 + 2 \\cdot 3 = 10$."
  },
  {
    id: 7,
    type: "mc",
    level: "Thông hiểu",
    topic: "Phương trình đường thẳng",
    subtopic: "Phương trình tổng quát đường thẳng",
    content: "Trong mặt phẳng tọa độ $Oxy$, đường thẳng đi qua điểm $A(1; 1)$ và nhận $\\vec{n} = (3; -4)$ làm vectơ pháp tuyến có phương trình là:",
    options: ["$3x - 4y + 1 = 0$", "$3x - 4y - 1 = 0$", "$4x + 3y - 7 = 0$", "$3x + 4y - 7 = 0$"],
    correctOptionIndex: 0,
    explanation: "Phương trình tổng quát: $3(x - 1) - 4(y - 1) = 0 \\Leftrightarrow 3x - 4y + 1 = 0$."
  },
  {
    id: 8,
    type: "mc",
    level: "Thông hiểu",
    topic: "Hệ thức lượng trong tam giác",
    subtopic: "Tính diện tích tam giác",
    content: "Cho tam giác $ABC$ có cạnh $AB = 6$, $AC = 8$ và góc $A = 60^\\circ$. Diện tích của tam giác $ABC$ bằng:",
    options: ["$12\\sqrt{3}$", "$24\\sqrt{3}$", "$24$", "$12$"],
    correctOptionIndex: 0,
    explanation: "Áp dụng công thức diện tích tam giác: $S = \\frac{1}{2} AB \\cdot AC \\cdot \\sin A = \\frac{1}{2} \\cdot 6 \\cdot 8 \\cdot \\sin 60^\\circ = 24 \\cdot \\frac{\\sqrt{3}}{2} = 12\\sqrt{3}$."
  },
  {
    id: 9,
    type: "mc",
    level: "Thông hiểu",
    topic: "Phương trình đường thẳng",
    subtopic: "Khoảng cách từ điểm đến đường thẳng",
    content: "Trong mặt phẳng tọa độ $Oxy$, tính khoảng cách từ điểm $M(2; -1)$ đến đường thẳng $\\Delta: 3x - 4y + 5 = 0$.",
    options: ["$3$", "$15$", "$15/25$", "$5$"],
    correctOptionIndex: 0,
    explanation: "Công thức khoảng cách: $d(M, \\Delta) = \\frac{|3 \\cdot 2 - 4 \\cdot (-1) + 5|}{\\sqrt{3^2 + (-4)^2}} = \\frac{|6 + 4 + 5|}{5} = \\frac{15}{5} = 3$."
  },
  {
    id: 10,
    type: "mc",
    level: "Nhận biết",
    topic: "Đại số tổ hợp",
    subtopic: "Tổ hợp và chỉnh hợp",
    content: "Có bao nhiêu cách chọn ra $3$ học sinh từ một nhóm gồm $10$ học sinh?",
    options: ["$120$", "$720$", "$30$", "$10$"],
    correctOptionIndex: 0,
    explanation: "Số cách chọn $3$ học sinh từ $10$ học sinh không phân biệt thứ tự là số tổ hợp chập $3$ của $10$: $C_{10}^3 = \\frac{10!}{3!(10-3)!} = 120$."
  },
  {
    id: 11,
    type: "mc",
    level: "Nhận biết",
    topic: "Thống kê",
    subtopic: "Số trung vị mẫu số liệu",
    content: "Điểm thi môn Toán của một nhóm $5$ học sinh lần lượt là: $7, 8, 9, 8, 10$. Số trung vị của mẫu số liệu trên là:",
    options: ["$8$", "$8.4$", "$9$", "$7$"],
    correctOptionIndex: 0,
    explanation: "Sắp xếp mẫu số liệu theo thứ tự không giảm: $7, 8, 8, 9, 10$. Vì cỡ mẫu $N = 5$ lẻ nên số trung vị là giá trị ở chính giữa (vị trí thứ 3), tức là số $8$."
  },
  {
    id: 12,
    type: "mc",
    level: "Thông hiểu",
    topic: "Xác suất",
    subtopic: "Tính xác suất cổ điển",
    content: "Gieo một đồng xu cân đối và đồng chất $2$ lần liên tiếp. Xác suất để xuất hiện ít nhất một lần mặt ngửa là:",
    options: ["$\\frac{3}{4}$", "$\\frac{1}{4}$", "$\\frac{1}{2}$", "$\\frac{2}{3}$"],
    correctOptionIndex: 0,
    explanation: "Không gian mẫu $\\Omega = \\{NN, NS, SN, SS\\}$ gồm $4$ phần tử. Biến cố có ít nhất một lần ngửa $A = \\{NN, NS, SN\\}$ gồm $3$ phần tử. Xác suất là $P(A) = \\frac{3}{4}$."
  },
  {
    id: 13,
    type: "tf",
    level: "Thông hiểu",
    topic: "Hàm số và Đồ thị bậc hai",
    subtopic: "Tính chất parabol bậc hai",
    content: "Cho hàm số bậc hai $y = x^2 - 4x + 3$ có đồ thị là parabol $(P)$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Tọa độ đỉnh của parabol $(P)$ là $I(2; -1)$.", correct: true },
      { statement: "Hàm số nghịch biến trên khoảng $(2; +\\infty)$.", correct: false },
      { statement: "Trục đối xứng của parabol $(P)$ là đường thẳng $x = 2$.", correct: true },
      { statement: "Parabol $(P)$ cắt trục hoành tại hai điểm phân biệt có hoành độ dương.", correct: true }
    ],
    explanation: "a) Đúng: Tọa độ đỉnh là $I(2; -1)$.\nb) Sai: Hệ số $a = 1 > 0$ nên hàm số đồng biến trên $(2; +\\infty)$.\nc) Đúng: Trục đối xứng là $x = 2$.\nd) Đúng: Phương trình $x^2 - 4x + 3 = 0$ có hai nghiệm phân biệt $x = 1, x = 3$ đều dương."
  },
  {
    id: 14,
    type: "tf",
    level: "Vận dụng",
    topic: "Phương trình đường thẳng",
    subtopic: "Vectơ pháp tuyến và chỉ phương",
    content: "Trong mặt phẳng tọa độ $Oxy$, cho đường thẳng $\\Delta: 3x - 4y + 1 = 0$ và điểm $A(1; 1)$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Vectơ pháp tuyến của đường thẳng $\\Delta$ là $\\vec{n} = (3; -4)$.", correct: true },
      { statement: "Vectơ chỉ phương của $\\Delta$ là $\\vec{u} = (4; 3)$.", correct: true },
      { statement: "Đường thẳng $\\Delta$ đi qua điểm $A(1; 1)$.", correct: true },
      { statement: "Khoảng cách từ gốc tọa độ $O(0;0)$ đến đường thẳng $\\Delta$ bằng $\\frac{1}{5}$.", correct: true }
    ],
    explanation: "a) Đúng: Hệ số đứng trước $x, y$ là $3$ và $-4$ nên $\\vec{n} = (3; -4)$ là VTPT.\nb) Đúng: $\\vec{u} = (4; 3)$ vuông góc với VTPT.\nc) Đúng: Thay tọa độ $A(1;1)$ vào thấy $3(1) - 4(1) + 1 = 0$.\nd) Đúng: Khoảng cách là $d(O, \\Delta) = \\frac{|1|}{\\sqrt{3^2 + 4^2}} = \\frac{1}{5}$."
  },
  {
    id: 15,
    type: "sa",
    level: "Thông hiểu",
    topic: "Mệnh đề và Tập hợp",
    subtopic: "Phép toán tập hợp số",
    content: "Cho hai tập hợp số $A = [-2; 3]$ và $B = (1; 5)$. Biết tập hợp $A \\cap B$ được viết dưới dạng khoảng $(a; b]$. Tính giá trị biểu thức $T = a + b$.",
    correctAnswer: "4",
    explanation: "Ta có $A \\cap B = [-2; 3] \\cap (1; 5) = (1; 3]$. Vậy $a = 1, b = 3$. Giá trị $T = a + b = 1 + 3 = 4$."
  },
  {
    id: 16,
    type: "sa",
    level: "Thông hiểu",
    topic: "Phương trình đường thẳng",
    subtopic: "Khoảng cách từ điểm đến đường thẳng",
    content: "Trong mặt phẳng tọa độ $Oxy$, tính khoảng cách từ điểm $M(2; -1)$ đến đường thẳng $\\Delta: 3x - 4y + 5 = 0$.",
    correctAnswer: "3",
    explanation: "Áp dụng công thức khoảng cách: $d(M, \\Delta) = \\frac{|3 \\cdot 2 - 4 \\cdot (-1) + 5|}{\\sqrt{3^2 + 4^2}} = \\frac{15}{5} = 3$."
  },
  {
    id: 17,
    type: "sa",
    level: "Vận dụng",
    topic: "Phương trình đường thẳng",
    subtopic: "Hệ thức tọa độ",
    content: "Cho tam giác $ABC$ có $A(1; 2)$, $B(3; 0)$, và trọng tâm $G(2; 1)$. Tìm hoành độ của đỉnh $C$ của tam giác $ABC$.",
    correctAnswer: "2",
    explanation: "Tọa độ trọng tâm: $x_G = \\frac{x_A + x_B + x_C}{3} \\Leftrightarrow 2 = \\frac{1 + 3 + x_C}{3} \\Leftrightarrow 6 = 4 + x_C \\Leftrightarrow x_C = 2$."
  },
  {
    id: 18,
    type: "sa",
    level: "Vận dụng",
    topic: "Đại số tổ hợp",
    subtopic: "Bài toán đếm số",
    content: "Có bao nhiêu số tự nhiên gồm 3 chữ số khác nhau được lập từ các chữ số $\\{1; 2; 3; 4; 5\\}$?",
    correctAnswer: "60",
    explanation: "Số các số tự nhiên gồm 3 chữ số khác nhau được thành lập chính là số chỉnh hợp chập 3 của 5 phần tử: $A_5^3 = 5 \\cdot 4 \\cdot 3 = 60$."
  },
  {
    id: 19,
    type: "essay",
    level: "Vận dụng",
    topic: "Hệ thức lượng trong tam giác",
    subtopic: "Định lý côsin và diện tích tam giác",
    content: "Cho tam giác $ABC$ có các cạnh $a = BC = 7$, $b = AC = 8$, và $c = AB = 5$. Tính góc $A$ và diện tích của tam giác $ABC$.",
    correctAnswer: "$A = 60^\\circ$ và $S = 10\\sqrt{3}$",
    explanation: "Áp dụng định lý Côsin tại đỉnh $A$:\n$$\\cos A = \\frac{b^2 + c^2 - a^2}{2bc} = \\frac{8^2 + 5^2 - 7^2}{2 \\cdot 8 \\cdot 5} = \\frac{64 + 25 - 49}{80} = \\frac{40}{80} = \\frac{1}{2}.$$\nDo đó $A = 60^\\circ$.\nDiện tích tam giác $ABC$ là:\n$$S = \\frac{1}{2} b c \\sin A = \\frac{1}{2} \\cdot 8 \\cdot 5 \\cdot \\sin 60^\\circ = 20 \\cdot \\frac{\\sqrt{3}}{2} = 10\\sqrt{3} \\text{ (đvdt)}.$$"
  },
  {
    id: 20,
    type: "essay",
    level: "Vận dụng cao",
    topic: "Hàm số và Đồ thị bậc hai",
    subtopic: "Ứng dụng parabol tối ưu hóa thực tế",
    content: "Một chiếc cổng hình parabol có phương trình dạng $y = ax^2 + bx + c$ có chiều rộng đáy cổng là $6\\text{ m}$ và chiều cao của cổng là $4\\text{ m}$. Một chiếc xe tải có chiều rộng $2{,}4\\text{ m}$ muốn đi qua cổng chính giữa. Hỏi xe tải phải có chiều cao tối đa bao nhiêu mét để có thể đi lọt qua cổng mà không chạm thành?",
    correctAnswer: "Chiều cao tối đa là $3{,}36\\text{ m}$.",
    explanation: "Chọn hệ trục tọa độ $Oxy$ với gốc tọa độ $O$ nằm ở chính giữa đáy cổng parabol. Khi đó parabol có dạng $y = ax^2 + h$ với $h = 4$ là chiều cao của cổng.\nVì cổng rộng $6\\text{ m}$ nên chân cổng nằm tại tọa độ $x = -3$ và $x = 3$. Tại chân cổng, $y = 0$, ta có:\n$$0 = a(3)^2 + 4 \\Leftrightarrow 9a = -4 \\Leftrightarrow a = -\\frac{4}{9}.$$\nDo đó parabol biểu diễn cổng là: $y = -\\frac{4}{9}x^2 + 4$.\n\nChiếc xe tải rộng $2{,}4\\text{ m}$ đi qua chính giữa cổng sẽ chiếm khoảng tọa độ $x$ từ $-1{,}2$ đến $1{,}2$.\nĐể xe đi qua lọt cổng thì chiều cao của xe tại vị trí mép xe ($x = 1{,}2$) không được vượt quá độ cao của cổng tại đó:\n$$y(1{,}2) = -\\frac{4}{9}(1{,}2)^2 + 4 = -\\frac{4}{9}(1{,}44) + 4 = -0{,}64 + 4 = 3{,}36\\text{ m}.$$\n\nVậy chiều cao tối đa của xe tải là $3{,}36\\text{ m}$."
  }
];

// ==================== KHỐI 11 SAMPLE QUESTIONS ====================
export const SAMPLE_MATH_QUESTIONS_11: SampleQuestion[] = [
  {
    id: 1,
    type: "mc",
    level: "Nhận biết",
    topic: "Hàm số lượng giác",
    subtopic: "Phương trình lượng giác cơ bản",
    content: "Tập nghiệm của phương trình lượng giác $\\sin x = 0$ là:",
    options: ["$x = k\\pi, k \\in \\mathbb{Z}$", "$x = \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}$", "$x = k2\\pi, k \\in \\mathbb{Z}$", "$x = \\frac{\\pi}{2} + k2\\pi, k \\in \\mathbb{Z}$"],
    correctOptionIndex: 0,
    explanation: "Phương trình lượng giác cơ bản $\\sin x = 0$ có nghiệm là $x = k\\pi, k \\in \\mathbb{Z}$."
  },
  {
    id: 2,
    type: "mc",
    level: "Thông hiểu",
    topic: "Hàm số lượng giác",
    subtopic: "Hệ thức lượng giác",
    content: "Cho góc $\\alpha$ thỏa mãn $\\frac{\\pi}{2} < \\alpha < \\pi$ và $\\sin \\alpha = \\frac{3}{5}$. Giá trị của $\\cos \\alpha$ là:",
    options: ["$-\\frac{4}{5}$", "$\\frac{4}{5}$", "$\\frac{16}{25}$", "$-\\frac{16}{25}$"],
    correctOptionIndex: 0,
    explanation: "Vì $\\sin^2 \\alpha + \\cos^2 \\alpha = 1$ nên $\\cos^2 \\alpha = 1 - \\sin^2 \\alpha = 1 - \\frac{9}{25} = \\frac{16}{25}$. Vì $\\frac{\\pi}{2} < \\alpha < \\pi$ nên $\\cos \\alpha < 0$. Do đó $\\cos \\alpha = -\\frac{4}{5}$."
  },
  {
    id: 3,
    type: "mc",
    level: "Nhận biết",
    topic: "Dãy số, Cấp số cộng, Cấp số nhân",
    subtopic: "Số hạng cấp số cộng",
    content: "Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = 3$ và công sai $d = 2$. Số hạng $u_5$ bằng:",
    options: ["$11$", "$13$", "$9$", "$15$"],
    correctOptionIndex: 0,
    explanation: "Công thức số hạng tổng quát của cấp số cộng: $u_n = u_1 + (n-1)d$. Thay $n = 5$ ta có $u_5 = 3 + (5-1) \\cdot 2 = 3 + 8 = 11$."
  },
  {
    id: 4,
    type: "mc",
    level: "Nhận biết",
    topic: "Dãy số, Cấp số cộng, Cấp số nhân",
    subtopic: "Số hạng cấp số nhân",
    content: "Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1 = 2$ và công bội $q = 3$. Số hạng $u_3$ bằng:",
    options: ["$18$", "$12$", "$6$", "$54$"],
    correctOptionIndex: 0,
    explanation: "Công thức số hạng tổng quát của cấp số nhân: $u_n = u_1 \\cdot q^{n-1}$. Thay $n = 3$ ta có $u_3 = 2 \\cdot 3^2 = 18$."
  },
  {
    id: 5,
    type: "mc",
    level: "Thông hiểu",
    topic: "Giới hạn và Liên tục",
    subtopic: "Giới hạn dãy số",
    content: "Tính giới hạn của dãy số $L = \\lim \\frac{2n + 1}{n + 3}$.",
    options: ["$2$", "$1/3$", "$+\\infty$", "$0$"],
    correctOptionIndex: 0,
    explanation: "Chia cả tử và mẫu cho $n$, ta có $\\lim \\frac{2 + \\frac{1}{n}}{1 + \\frac{3}{n}} = \\frac{2+0}{1+0} = 2$."
  },
  {
    id: 6,
    type: "mc",
    level: "Thông hiểu",
    topic: "Giới hạn và Liên tục",
    subtopic: "Giới hạn hàm số",
    content: "Tính giới hạn của hàm số $L = \\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}$.",
    options: ["$4$", "$2$", "$0$", "Giới hạn không tồn tại"],
    correctOptionIndex: 0,
    explanation: "Ta có $\\frac{x^2-4}{x-2} = \\frac{(x-2)(x+2)}{x-2} = x + 2$ khi $x \\ne 2$. Do đó $\\lim_{x \\to 2} (x + 2) = 4$."
  },
  {
    id: 7,
    type: "mc",
    level: "Nhận biết",
    topic: "Đạo hàm",
    subtopic: "Đạo hàm đa thức",
    content: "Tính đạo hàm của hàm số $y = x^3 - 2x$ trên $\\mathbb{R}$.",
    options: ["$y' = 3x^2 - 2$", "$y' = 3x^2 - 2x$", "$y' = 3x - 2$", "$y' = x^2 - 2$"],
    correctOptionIndex: 0,
    explanation: "Áp dụng công thức đạo hàm cơ bản: $(x^n)' = n x^{n-1}$. Ta có $y' = (x^3)' - (2x)' = 3x^2 - 2$."
  },
  {
    id: 8,
    type: "mc",
    level: "Thông hiểu",
    topic: "Đạo hàm",
    subtopic: "Phương trình tiếp tuyến",
    content: "Phương trình tiếp tuyến của đồ thị hàm số $y = x^2$ tại điểm $M(1; 1)$ có hệ số góc bằng bao nhiêu?",
    options: ["$2$", "$1$", "$0$", "$3$"],
    correctOptionIndex: 0,
    explanation: "Ta có đạo hàm $y' = 2x$. Hệ số góc của tiếp tuyến tại $M(1; 1)$ là $k = y'(1) = 2 \\cdot 1 = 2$."
  },
  {
    id: 9,
    type: "mc",
    level: "Thông hiểu",
    topic: "Quan hệ song song",
    subtopic: "Đường thẳng và mặt phẳng song song",
    content: "Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành. Đường thẳng $AB$ song song với mặt phẳng nào dưới đây?",
    options: ["$(SCD)$", "$(SAD)$", "$(SBC)$", "$(SAB)$"],
    correctOptionIndex: 0,
    explanation: "Ta có $AB \\parallel CD$ (do $ABCD$ là hình bình hành) và $CD \\subset (SCD)$ nên đường thẳng $AB$ song song với mặt phẳng $(SCD)$."
  },
  {
    id: 10,
    type: "mc",
    level: "Thông hiểu",
    topic: "Quan hệ vuông góc",
    subtopic: "Đường thẳng vuông góc với mặt phẳng",
    content: "Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông tại $B$ và $SA \\perp (ABC)$. Đường thẳng $BC$ vuông góc với mặt phẳng nào?",
    options: ["$(SAB)$", "$(SAC)$", "$(SBC)$", "$(ABC)$"],
    correctOptionIndex: 0,
    explanation: "Ta có $BC \\perp AB$ (do tam giác $ABC$ vuông tại $B$) và $BC \\perp SA$ (do $SA \\perp (ABC)$). Vì $AB$ và $SA$ giao nhau trong mặt phẳng $(SAB)$ nên $BC \\perp (SAB)$."
  },
  {
    id: 11,
    type: "mc",
    level: "Nhận biết",
    topic: "Số mũ và Lũy thừa",
    subtopic: "Tính lũy thừa căn",
    content: "Giá trị của biểu thức lũy thừa $A = 27^{1/3}$ là:",
    options: ["$3$", "$9$", "$27$", "$1$"],
    correctOptionIndex: 0,
    explanation: "Ta có $27 = 3^3$, do đó $27^{1/3} = (3^3)^{1/3} = 3^1 = 3$."
  },
  {
    id: 12,
    type: "mc",
    level: "Nhận biết",
    topic: "Logarit",
    subtopic: "Định nghĩa logarit",
    content: "Cho số thực $a > 0$ và $a \\neq 1$. Giá trị của biểu thức $\\log_a a^3$ bằng:",
    options: ["$3$", "$a$", "$1$", "$\\frac{1}{3}$"],
    correctOptionIndex: 0,
    explanation: "Dựa trên tính chất logarit cơ bản: $\\log_a a^r = r$. Vậy $\\log_a a^3 = 3$."
  },
  {
    id: 13,
    type: "tf",
    level: "Thông hiểu",
    topic: "Hàm số lượng giác",
    subtopic: "Tính chất hàm số cosin",
    content: "Cho hàm số $f(x) = \\cos x$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Hàm số $y = \\cos x$ là hàm số chẵn.", correct: true },
      { statement: "Chu kỳ tuần hoàn của hàm số $y = \\cos x$ là $T = 2\\pi$.", correct: true },
      { statement: "Tập giá trị của hàm số $y = \\cos x$ là $[-1; 1]$.", correct: true },
      { statement: "Đạo hàm của hàm số là $f'(x) = \\sin x$.", correct: false }
    ],
    explanation: "a) Đúng: Vì $\\cos(-x) = \\cos x$.\nb) Đúng: Hàm số có chu kỳ $T = 2\\pi$.\nc) Đúng: Ta có $-1 \\le \\cos x \\le 1$ với mọi $x$.\nd) Sai: Đạo hàm của hàm số cosin là $(\\cos x)' = -\\sin x$."
  },
  {
    id: 14,
    type: "tf",
    level: "Thông hiểu",
    topic: "Quan hệ vuông góc",
    subtopic: "Tính chất vuông góc hình học không gian",
    content: "Cho hình chóp $S.ABC$ có $SA \\perp (ABC)$ và đáy $ABC$ là tam giác vuông tại $B$. Xét tính đúng/sai của các khẳng định sau:",
    tfStatements: [
      { statement: "Đường thẳng $SA$ vuông góc với đường thẳng $BC$.", correct: true },
      { statement: "Đường thẳng $AB$ vuông góc với đường thẳng $BC$.", correct: true },
      { statement: "Đường thẳng $BC$ vuông góc với mặt phẳng $(SAB)$.", correct: true },
      { statement: "Mặt phẳng $(SBC)$ vuông góc với mặt phẳng $(SAB)$.", correct: true }
    ],
    explanation: "a) Đúng: Vì $SA \\perp (ABC) \\Rightarrow SA \\perp BC$.\nb) Đúng: Vì tam giác $ABC$ vuông tại $B$.\nc) Đúng: Vì $BC \\perp AB$ và $BC \\perp SA \\Rightarrow BC \\perp (SAB)$.\nd) Đúng: Vì mặt phẳng $(SBC)$ chứa đường thẳng $BC \\perp (SAB)$."
  },
  {
    id: 15,
    type: "sa",
    level: "Thông hiểu",
    topic: "Dãy số, Cấp số cộng, Cấp số nhân",
    subtopic: "Cấp số cộng số hạng tổng quát",
    content: "Cho cấp số cộng $(u_n)$ có $u_1 = 3$ và công sai $d = 4$. Tính số hạng thứ $10$ ($u_{10}$) của cấp số cộng đó.",
    correctAnswer: "39",
    explanation: "Ta có $u_{10} = u_1 + 9d = 3 + 9 \\cdot 4 = 3 + 36 = 39$."
  },
  {
    id: 16,
    type: "sa",
    level: "Thông hiểu",
    topic: "Dãy số, Cấp số cộng, Cấp số nhân",
    subtopic: "Tổng cấp số nhân",
    content: "Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1 = 2$ và công bội $q = 3$. Tính tổng $4$ số hạng đầu tiên ($S_4$) của cấp số nhân đó.",
    correctAnswer: "80",
    explanation: "Áp dụng công thức tính tổng $n$ số hạng đầu: $S_n = u_1 \\frac{q^n - 1}{q - 1}$.\n$$S_4 = 2 \\cdot \\frac{3^4 - 1}{3 - 1} = 2 \\cdot \\frac{81 - 1}{2} = 80.$$"
  },
  {
    id: 17,
    type: "sa",
    level: "Thông hiểu",
    topic: "Đạo hàm",
    subtopic: "Đạo hàm tại một điểm",
    content: "Cho hàm số $y = x^3 - 3x + 2$. Tính giá trị đạo hàm của hàm số tại điểm $x = 2$ (tức tính $y'(2)$).",
    correctAnswer: "9",
    explanation: "Đạo hàm là $y' = 3x^2 - 3$. Thay $x = 2$ vào ta được: $y'(2) = 3 \\cdot 2^2 - 3 = 12 - 3 = 9$."
  },
  {
    id: 18,
    type: "sa",
    level: "Thông hiểu",
    topic: "Giới hạn và Liên tục",
    subtopic: "Giới hạn hàm số phân thức",
    content: "Tính giới hạn của hàm số dạng vô định sau: $L = \\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}$.",
    correctAnswer: "6",
    explanation: "Ta có $\\frac{x^2 - 9}{x - 3} = \\frac{(x-3)(x+3)}{x-3} = x + 3$ khi $x \\ne 3$.\nKhi đó: $L = \\lim_{x \\to 3} (x + 3) = 3 + 3 = 6$."
  },
  {
    id: 19,
    type: "essay",
    level: "Vận dụng",
    topic: "Hàm số lượng giác",
    subtopic: "Giải phương trình lượng giác",
    content: "Giải phương trình lượng giác sau: $\\cos 2x - 3\\cos x + 2 = 0$.",
    correctAnswer: "$x = k2\\pi, k \\in \\mathbb{Z}$",
    explanation: "Sử dụng công thức nhân đôi $\\cos 2x = 2\\cos^2 x - 1$, phương trình tương đương với:\n$$(2\\cos^2 x - 1) - 3\\cos x + 2 = 0 \\Leftrightarrow 2\\cos^2 x - 3\\cos x + 1 = 0.$$\nĐặt $t = \\cos x$ (điều kiện $-1 \\le t \\le 1$), phương trình bậc hai trở thành:\n$$2t^2 - 3t + 1 = 0 \\Leftrightarrow t = 1 \\text{ hoặc } t = \\frac{1}{2}.$$\n\nTH1: $t = 1 \\Leftrightarrow \\cos x = 1 \\Leftrightarrow x = k2\\pi, k \\in \\mathbb{Z}$.\nTH2: $t = \\frac{1}{2} \\Leftrightarrow \\cos x = \\cos \\frac{\\pi}{3} \\Leftrightarrow x = \\pm \\frac{\\pi}{3} + k2\\pi, k \\in \\mathbb{Z}$.\n\nTập nghiệm của phương trình là $S = \\{k2\\pi; \\pm \\frac{\\pi}{3} + k2\\pi, k \\in \\mathbb{Z}\\}$."
  },
  {
    id: 20,
    type: "essay",
    level: "Vận dụng cao",
    topic: "Quan hệ vuông góc",
    subtopic: "Tính góc giữa đường thẳng và mặt phẳng",
    content: "Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông cạnh $a$, cạnh bên $SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$. Tính góc giữa đường thẳng $SC$ và mặt phẳng đáy $(ABCD)$.",
    correctAnswer: "Góc bằng $45^\\circ$",
    explanation: "Vì $SA \\perp (ABCD)$ nên $AC$ là hình chiếu vuông góc của đường thẳng $SC$ lên mặt phẳng đáy $(ABCD)$.\nDo đó, góc giữa đường thẳng $SC$ và mặt phẳng đáy $(ABCD)$ chính là góc giữa $SC$ và $AC$, tức là góc $\\widehat{SCA}$.\n\nXét đáy $ABCD$ là hình vuông cạnh $a$, đường chéo $AC$ bằng:\n$$AC = a\\sqrt{2}.$$\nXét tam giác $SAC$ vuông tại $A$ (vì $SA \\perp (ABCD) \\Rightarrow SA \\perp AC$):\n$$\\tan \\widehat{SCA} = \\frac{SA}{AC} = \\frac{a\\sqrt{2}}{a\\sqrt{2}} = 1.$$\n\nVì $\\tan \\widehat{SCA} = 1$ nên $\\widehat{SCA} = 45^\\circ$.\nVậy góc giữa đường thẳng $SC$ và mặt phẳng đáy là $45^\\circ$."
  }
];
