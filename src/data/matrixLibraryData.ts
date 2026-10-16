// ============================================================================
// DATA TYPES
// ============================================================================

export interface MatrixRowItem {
  id: string;
  topic: string; // Chủ đề
  unit: string;  // Nội dung / Đơn vị kiến thức
  // Năng lực 1 (Toán: GQVĐ; KHTN: Nhận thức; Ngoại ngữ: Ngôn ngữ; Ngữ văn: Đọc hiểu)
  gqvd: {
    biet: string;
    hieu: string;
    vd: string;
  };
  // Năng lực 2 (Toán: Tư duy; KHTN: Tìm hiểu; Ngoại ngữ: Đọc hiểu; Ngữ văn: Viết NLXH)
  tuduy: {
    biet: string;
    hieu: string;
    vd: string;
  };
  // Năng lực 3 (Toán: Mô hình hoá; KHTN: Vận dụng; Ngoại ngữ: Giao tiếp/Viết; Ngữ văn: Viết NLVH)
  mohinh: {
    biet: string;
    hieu: string;
    vd: string;
  };
}

export interface SpecUnitItem {
  id: string;
  topic: string;
  unit: string;
  bietSpec: string;
  hieuSpec: string;
  vdSpec: string;
  vdcSpec?: string;
  assignedQuestions: {
    part1: string; // TN 4 lựa chọn (I.1...)
    part2: string; // Đúng/Sai (II.1ab...)
    part3: string; // Trả lời ngắn (III.1...)
    essay: string; // Tự luận (TL1...)
  };
  points: number;
}

// Dữ liệu mẫu chuẩn 100% khớp theo hình ảnh giáo viên cung cấp (Toán 11 - Giữa Kì I)
export const SAMPLE_COMPETENCY_MATRIX_11: MatrixRowItem[] = [
  {
    id: 'row-1',
    topic: 'HÀM SỐ LƯỢNG GIÁC - PT LƯỢNG GIÁC',
    unit: '1. Giá trị lượng giác',
    gqvd: { biet: 'I.1', hieu: '', vd: '' },
    tuduy: { biet: '', hieu: '', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-2',
    topic: 'HÀM SỐ LƯỢNG GIÁC - PT LƯỢNG GIÁC',
    unit: '2. Công thức lượng giác',
    gqvd: { biet: 'I.2, II.1ab', hieu: '', vd: '' },
    tuduy: { biet: 'I.3', hieu: 'II.1cd', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-3',
    topic: 'HÀM SỐ LƯỢNG GIÁC - PT LƯỢNG GIÁC',
    unit: '3. Hàm số lượng giác',
    gqvd: { biet: 'I.4', hieu: 'I.5', vd: '' },
    tuduy: { biet: '', hieu: 'III.1', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-4',
    topic: 'HÀM SỐ LƯỢNG GIÁC - PT LƯỢNG GIÁC',
    unit: '4. Phương trình lượng giác cơ bản',
    gqvd: { biet: 'I.7', hieu: '', vd: 'TL1' },
    tuduy: { biet: 'I.6', hieu: '', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-5',
    topic: 'DÃY SỐ - CẤP SỐ CỘNG - CẤP SỐ NHÂN',
    unit: '1. Dãy số',
    gqvd: { biet: 'I.8', hieu: '', vd: '' },
    tuduy: { biet: 'I.9', hieu: '', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-6',
    topic: 'DÃY SỐ - CẤP SỐ CỘNG - CẤP SỐ NHÂN',
    unit: '2. Cấp số cộng',
    gqvd: { biet: '', hieu: '', vd: '' },
    tuduy: { biet: 'I.10', hieu: '', vd: '' },
    mohinh: { biet: '', hieu: '', vd: 'TL2' }
  },
  {
    id: 'row-7',
    topic: 'DÃY SỐ - CẤP SỐ CỘNG - CẤP SỐ NHÂN',
    unit: '3. Cấp số nhân',
    gqvd: { biet: '', hieu: 'I.11', vd: '' },
    tuduy: { biet: '', hieu: 'I.12', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-8',
    topic: 'QUAN HỆ SONG SONG TRONG KHÔNG GIAN',
    unit: '1. Đường thẳng và mặt phẳng trong không gian',
    gqvd: { biet: 'II.2b', hieu: 'II.2c', vd: '' },
    tuduy: { biet: '', hieu: '', vd: '' },
    mohinh: { biet: 'I.13', hieu: 'I.14', vd: '' }
  },
  {
    id: 'row-9',
    topic: 'QUAN HỆ SONG SONG TRONG KHÔNG GIAN',
    unit: '2. Hai đường thẳng song song',
    gqvd: { biet: 'II.2a', hieu: 'II.2d', vd: '' },
    tuduy: { biet: 'I.15', hieu: 'III.2', vd: '' },
    mohinh: { biet: '', hieu: '', vd: '' }
  },
  {
    id: 'row-10',
    topic: 'QUAN HỆ SONG SONG TRONG KHÔNG GIAN',
    unit: '3. Đường thẳng và mặt phẳng song song',
    gqvd: { biet: '', hieu: '', vd: '' },
    tuduy: { biet: '', hieu: '', vd: 'TL3' },
    mohinh: { biet: 'I.16', hieu: '', vd: '' }
  }
];

export const SAMPLE_SPEC_LIST_11: SpecUnitItem[] = [
  {
    id: 'spec-1',
    topic: 'Hàm số lượng giác và phương trình lượng giác',
    unit: '1. Giá trị lượng giác của góc lượng giác',
    bietSpec: '- Nhận biết các khái niệm về góc lượng giác, đường tròn lượng giác, giá trị lượng giác của một góc lượng giác.\n- Nhận biết dấu của các giá trị lượng giác trong từng góc phần tư.',
    hieuSpec: '- Tính giá trị lượng giác của các góc đặc biệt và các góc có liên quan đặc biệt (bù nhau, phụ nhau, hơn kém nhau $\\pi$).',
    vdSpec: '- Vận dụng mối quan hệ giữa các giá trị lượng giác để chứng minh đẳng thức lượng giác đơn giản hoặc giải quyết bài toán thực tế góc quay.',
    assignedQuestions: { part1: 'I.1', part2: '', part3: '', essay: '' },
    points: 0.25
  },
  {
    id: 'spec-2',
    topic: 'Hàm số lượng giác và phương trình lượng giác',
    unit: '2. Các công thức lượng giác cơ bản',
    bietSpec: '- Nhận biết các công thức lượng giác cơ bản: $\\sin^2 x + \\cos^2 x = 1$, $1 + \\tan^2 x = \\frac{1}{\\cos^2 x}$, công thức cộng, công thức nhân đôi.',
    hieuSpec: '- Vận dụng công thức cộng, công thức nhân đôi, công thức biến đổi tích thành tổng và tổng thành tích để rút gọn biểu thức lượng giác.',
    vdSpec: '- Vận dụng biến đổi lượng giác tìm giá trị lớn nhất, nhỏ nhất của biểu thức chứa tham số hoặc tính giá trị biểu thức lượng giác nhiều góc.',
    assignedQuestions: { part1: 'I.2, I.3', part2: 'II.1 (ý a, b, c, d)', part3: '', essay: '' },
    points: 1.5
  },
  {
    id: 'spec-3',
    topic: 'Hàm số lượng giác và phương trình lượng giác',
    unit: '3. Hàm số lượng giác và đồ thị',
    bietSpec: '- Nhận biết tập xác định, tập giá trị, tính tuần hoàn, chu kì và tính chẵn lẻ của 4 hàm số lượng giác cơ bản: $y = \\sin x$, $y = \\cos x$, $y = \\tan x$, $y = \\cot x$.',
    hieuSpec: '- Xác định được khoảng đồng biến, nghịch biến và hình dạng đồ thị của hàm số lượng giác cơ bản.\n- Tìm tập xác định của các hàm số lượng giác mở rộng $y = \\tan(2x - \\frac{\\pi}{3})$...',
    vdSpec: '- Giải quyết bài toán thực tế có tính chất tuần hoàn (dao động của con lắc, thủy triều, nhiệt độ trung bình trong năm, âm thanh) bằng hàm số lượng giác.',
    assignedQuestions: { part1: 'I.4, I.5', part2: '', part3: 'III.1', essay: '' },
    points: 1.0
  },
  {
    id: 'spec-4',
    topic: 'Hàm số lượng giác và phương trình lượng giác',
    unit: '4. Phương trình lượng giác cơ bản',
    bietSpec: '- Nhận biết công thức nghiệm của các phương trình lượng giác cơ bản: $\\sin x = m$, $\\cos x = m$, $\\tan x = m$, $\\cot x = m$.',
    hieuSpec: '- Giải được phương trình lượng giác cơ bản và các phương trình quy về phương trình lượng giác cơ bản.\n- Tìm số nghiệm của phương trình lượng giác trên một khoảng, đoạn cho trước.',
    vdSpec: '- Vận dụng phương trình lượng giác cơ bản để giải quyết bài toán thực tế (góc bắn của vật, chu kì dao động điện từ) và bài toán chứa tham số thực $m$.',
    assignedQuestions: { part1: 'I.6, I.7', part2: '', part3: '', essay: 'TL1' },
    points: 1.5
  },
  {
    id: 'spec-5',
    topic: 'Dãy số. Cấp số cộng và cấp số nhân',
    unit: '5. Dãy số và số hạng tổng quát',
    bietSpec: '- Nhận biết khái niệm dãy số hữu hạn, dãy số vô hạn.\n- Nhận biết các cách cho một dãy số (bằng công thức số hạng tổng quát, bằng hệ thức truy hồi, bằng mô tả).',
    hieuSpec: '- Xác định được tính tăng, giảm và tính bị chặn của một dãy số đơn giản.\n- Tìm số hạng thứ $n$ của dãy số cho bởi công thức truy hồi cơ bản.',
    vdSpec: '- Vận dụng kiến thức về dãy số để mô tả và giải quyết một số bài toán thực tiễn (mô hình tăng trưởng số lượng tế bào, tính tiền tích lũy).',
    assignedQuestions: { part1: 'I.8, I.9', part2: '', part3: '', essay: '' },
    points: 0.5
  },
  {
    id: 'spec-6',
    topic: 'Dãy số. Cấp số cộng và cấp số nhân',
    unit: '6. Cấp số cộng',
    bietSpec: '- Nhận biết khái niệm cấp số cộng, số hạng đầu $u_1$ và công sai $d$.\n- Nhận biết công thức tính số hạng tổng quát: $u_n = u_1 + (n-1)d$.',
    hieuSpec: '- Thiết lập và tính toán được công sai $d$, số hạng bất kỳ $u_k$, và tổng $n$ số hạng đầu $S_n = \\frac{n(u_1 + u_n)}{2}$ của cấp số cộng.',
    vdSpec: '- Vận dụng công thức cấp số cộng để giải bài toán mô hình hoá thực tế (tiết kiệm tích lũy định kì, xếp hàng ghế khán đài, tính khấu hao tài sản).',
    assignedQuestions: { part1: 'I.10', part2: '', part3: '', essay: 'TL2' },
    points: 1.25
  },
  {
    id: 'spec-7',
    topic: 'Dãy số. Cấp số cộng và cấp số nhân',
    unit: '7. Cấp số nhân',
    bietSpec: '- Nhận biết khái niệm cấp số nhân, số hạng đầu $u_1$ và công bội $q$.\n- Nhận biết công thức tính số hạng tổng quát $u_n = u_1 \\cdot q^{n-1}$.',
    hieuSpec: '- Tính toán các yếu tố của cấp số nhân: công bội $q$, số hạng tổng quát $u_n$, tổng $n$ số hạng đầu $S_n = \\frac{u_1(1-q^n)}{1-q}$ ($q \\neq 1$).',
    vdSpec: '- Giải quyết bài toán thực tiễn gắn với cấp số nhân: lãi kép ngân hàng, tăng trưởng dân số, chu kì bán rã phóng xạ.',
    assignedQuestions: { part1: 'I.11, I.12', part2: '', part3: '', essay: '' },
    points: 0.5
  },
  {
    id: 'spec-8',
    topic: 'Quan hệ song song trong không gian',
    unit: '8. Đường thẳng và mặt phẳng trong không gian',
    bietSpec: '- Nhận biết các tính chất thừa nhận của hình học không gian.\n- Nhận biết các cách xác định một mặt phẳng (qua 3 điểm không thẳng hàng, qua 1 điểm và 1 đường thẳng, qua 2 đường thẳng cắt nhau).',
    hieuSpec: '- Tìm giao tuyến của hai mặt phẳng phân biệt; tìm giao điểm của đường thẳng và mặt phẳng trong các hình chóp tứ giác, hình chóp tam giác.',
    vdSpec: '- Xác định thiết diện của hình chóp, hình lăng trụ cắt bởi một mặt phẳng trong trường hợp đơn giản.',
    assignedQuestions: { part1: 'I.13, I.14', part2: 'II.2 (ý b, c)', part3: '', essay: '' },
    points: 1.0
  },
  {
    id: 'spec-9',
    topic: 'Quan hệ song song trong không gian',
    unit: '9. Hai đường thẳng song song trong không gian',
    bietSpec: '- Nhận biết vị trí tương đối của hai đường thẳng trong không gian: trùng nhau, song song, cắt nhau, chéo nhau.',
    hieuSpec: '- Chứng minh hai đường thẳng song song trong không gian dựa vào định lí về giao tuyến của ba mặt phẳng hoặc đường trung bình.',
    vdSpec: '- Vận dụng vị trí tương đối và tính chất song song để giải quyết bài toán thực tế (mô hình khung giàn giáo, kết cấu dầm cầu, đường dây điện).',
    assignedQuestions: { part1: 'I.15', part2: 'II.2 (ý a, d)', part3: 'III.2', essay: '' },
    points: 1.25
  },
  {
    id: 'spec-10',
    topic: 'Quan hệ song song trong không gian',
    unit: '10. Đường thẳng và mặt phẳng song song',
    bietSpec: '- Nhận biết định nghĩa và điều kiện để một đường thẳng song song với một mặt phẳng ($d \\not\\subset (P)$ và $d \\parallel a \\subset (P)$).',
    hieuSpec: '- Chứng minh đường thẳng song song với mặt phẳng; tìm giao tuyến của hai mặt phẳng dựa vào tính chất đường thẳng song song mặt phẳng.',
    vdSpec: '- Xác định và tính toán diện tích thiết diện của hình đa diện cắt bởi mặt phẳng song song với một hoặc hai đường thẳng cho trước.',
    assignedQuestions: { part1: 'I.16', part2: '', part3: '', essay: 'TL3' },
    points: 1.25
  }
];

export interface ExamMatrixTemplate {
  id: string;
  subjectId: 'toan' | 'vat_li' | 'hoa_hoc' | 'sinh_hoc' | 'tin_hoc' | 'tieng_anh' | 'ngu_van' | 'lich_su' | 'dia_li';
  subjectName: string;
  grade: '10' | '11' | '12';
  semester: 'Giữa kì I' | 'Cuối kì I' | 'Giữa kì II' | 'Cuối kì II' | 'Tốt nghiệp THPT / ĐGNL';
  title: string;
  badge: string;
  description: string;
  durationMinutes: number;
  totalPoints: number;
  competencyHeaders: {
    c1: string;
    c2: string;
    c3: string;
  };
  qCounts: {
    mc: number;     // Phần 1: Trắc nghiệm 4 lựa chọn
    tf: number;     // Phần 2: Đúng / Sai
    sa: number;     // Phần 3: Trả lời ngắn
    essay: number;  // Phần 4: Tự luận
  };
  matrixRows: MatrixRowItem[];
  specUnits: SpecUnitItem[];
  topicsList: string[];
}

// 1. MÔN TOÁN 11 - GIỮA KÌ I (MẪU CHUẨN BỘ GD&ĐT 2025-2026 KHỚP 100% ẢNH CỦA GV)
export const TEMPLATE_TOAN_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_toan_11_gk1',
  subjectId: 'toan',
  subjectName: 'Toán học',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Toán - Khối 11 (Chuẩn GDPT 2018)',
  badge: 'Chuẩn GDPT 2018 • Mẫu Bộ GD&ĐT',
  description: 'Đánh giá 3 mạch kiến thức: Lượng giác, Dãy số - Cấp số, Quan hệ song song trong không gian theo 3 năng lực Toán học (GQVĐ, Tư duy, Mô hình hóa).',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Giải quyết vấn đề',
    c2: 'Tư duy toán học',
    c3: 'Mô hình hoá'
  },
  qCounts: { mc: 16, tf: 2, sa: 2, essay: 3 },
  matrixRows: SAMPLE_COMPETENCY_MATRIX_11,
  specUnits: SAMPLE_SPEC_LIST_11,
  topicsList: [
    'Hàm số lượng giác và phương trình lượng giác',
    'Dãy số. Cấp số cộng và cấp số nhân',
    'Quan hệ song song trong không gian'
  ]
};

// 2. MÔN TOÁN 10 - GIỮA KÌ I
export const TEMPLATE_TOAN_10_GK1: ExamMatrixTemplate = {
  id: 'matrix_toan_10_gk1',
  subjectId: 'toan',
  subjectName: 'Toán học',
  grade: '10',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Toán - Khối 10 (Chuẩn GDPT 2018)',
  badge: 'Toán 10 • Kết nối tri thức',
  description: 'Mệnh đề toán học, Tập hợp và các phép toán tập hợp, Bất phương trình và hệ bất phương trình bậc nhất hai ẩn, Hệ thức lượng trong tam giác.',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Giải quyết vấn đề',
    c2: 'Tư duy toán học',
    c3: 'Mô hình hoá'
  },
  qCounts: { mc: 16, tf: 2, sa: 2, essay: 3 },
  matrixRows: [
    {
      id: 't10-row-1',
      topic: 'MỆNH ĐỀ VÀ TẬP HỢP',
      unit: '1. Mệnh đề toán học, mệnh đề phủ định, mệnh đề kéo theo',
      gqvd: { biet: 'I.1', hieu: '', vd: '' },
      tuduy: { biet: 'I.2', hieu: 'II.1ab', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 't10-row-2',
      topic: 'MỆNH ĐỀ VÀ TẬP HỢP',
      unit: '2. Tập hợp và các phép toán trên tập hợp ($A \\cap B$, $A \\cup B$, $A \\setminus B$)',
      gqvd: { biet: 'I.3, I.4', hieu: 'I.5', vd: '' },
      tuduy: { biet: '', hieu: 'II.1cd', vd: '' },
      mohinh: { biet: '', hieu: '', vd: 'TL1' }
    },
    {
      id: 't10-row-3',
      topic: 'BẤT PHƯƠNG TRÌNH BẬC NHẤT HAI ẨN',
      unit: '1. Bất phương trình bậc nhất hai ẩn và miền nghiệm',
      gqvd: { biet: 'I.6', hieu: 'I.7', vd: '' },
      tuduy: { biet: '', hieu: 'III.1', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 't10-row-4',
      topic: 'BẤT PHƯƠNG TRÌNH BẬC NHẤT HAI ẨN',
      unit: '2. Hệ bất phương trình bậc nhất hai ẩn và bài toán quy hoạch tuyến tính',
      gqvd: { biet: 'I.8', hieu: '', vd: '' },
      tuduy: { biet: '', hieu: 'I.9', vd: '' },
      mohinh: { biet: '', hieu: 'II.2ab', vd: 'TL2' }
    },
    {
      id: 't10-row-5',
      topic: 'HỆ THỨC LƯỢNG TRONG TAM GIÁC',
      unit: '1. Giá trị lượng giác của một góc từ $0^\\circ$ đến $180^\\circ$',
      gqvd: { biet: 'I.10', hieu: 'I.11', vd: '' },
      tuduy: { biet: 'I.12', hieu: '', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 't10-row-6',
      topic: 'HỆ THỨC LƯỢNG TRONG TAM GIÁC',
      unit: '2. Định lí côsin, định lí sin và các công thức tính diện tích tam giác',
      gqvd: { biet: 'I.13', hieu: 'I.14', vd: '' },
      tuduy: { biet: 'I.15', hieu: 'II.2cd', vd: '' },
      mohinh: { biet: 'I.16', hieu: 'III.2', vd: 'TL3' }
    }
  ],
  specUnits: [
    {
      id: 't10-spec-1',
      topic: 'Mệnh đề và tập hợp',
      unit: '1. Mệnh đề toán học và mệnh đề kéo theo',
      bietSpec: '- Nhận biết thế nào là một mệnh đề toán học, mệnh đề phủ định, mệnh đề chứa biến.\n- Nhận biết kí hiệu với mọi $\\forall$ và tồn tại $\\exists$.',
      hieuSpec: '- Xác định được tính đúng sai của mệnh đề kéo theo $P \\Rightarrow Q$ và mệnh đề tương đương $P \\Leftrightarrow Q$.',
      vdSpec: '- Vận dụng mệnh đề và phản chứng để chứng minh tính chất chia hết hoặc bất đẳng thức số học đơn giản.',
      assignedQuestions: { part1: 'I.1, I.2', part2: 'II.1 (ý a, b)', part3: '', essay: '' },
      points: 1.0
    },
    {
      id: 't10-spec-2',
      topic: 'Mệnh đề và tập hợp',
      unit: '2. Tập hợp và các phép toán trên tập hợp',
      bietSpec: '- Nhận biết kí hiệu phần tử thuộc tập hợp, tập hợp con, tập hợp rỗng, tập hợp số thực (khoảng, đoạn, nửa khoảng).',
      hieuSpec: '- Thực hiện thành thạo các phép toán giao $A \\cap B$, hợp $A \\cup B$, hiệu $A \\setminus B$ và phần bù $C_{\\mathbb{R}}A$ trên trục số thực.',
      vdSpec: '- Giải bài toán thực tế sử dụng biểu đồ Ven (thống kê số lượng học sinh tham gia các câu lạc bộ ngoại khóa).',
      assignedQuestions: { part1: 'I.3, I.4, I.5', part2: 'II.1 (ý c, d)', part3: '', essay: 'TL1' },
      points: 2.0
    },
    {
      id: 't10-spec-3',
      topic: 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
      unit: '3. Miền nghiệm của bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
      bietSpec: '- Nhận biết bất phương trình bậc nhất hai ẩn $ax + by \\le c$.\n- Kiểm tra một cặp số $(x_0; y_0)$ có phải là nghiệm hay không.',
      hieuSpec: '- Biểu diễn miền nghiệm của bất phương trình và hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng tọa độ $Oxy$.',
      vdSpec: '- Vận dụng bài toán tìm giá trị lớn nhất, nhỏ nhất của biểu thức $F(x, y) = ax + by$ trên miền đa giác nghiệm để tối ưu hóa lợi nhuận kinh doanh.',
      assignedQuestions: { part1: 'I.6, I.7, I.8, I.9', part2: 'II.2 (ý a, b)', part3: 'III.1', essay: 'TL2' },
      points: 3.0
    },
    {
      id: 't10-spec-4',
      topic: 'Hệ thức lượng trong tam giác',
      unit: '4. Định lí sin, định lí côsin và giải tam giác thực tế',
      bietSpec: '- Nhận biết công thức định lí côsin: $a^2 = b^2 + c^2 - 2bc \\cos A$, định lí sin: $\\frac{a}{\\sin A} = 2R$, và các công thức diện tích $S = \\frac{1}{2}bc \\sin A = \\frac{abc}{4R} = pr$.',
      hieuSpec: '- Tính các cạnh, góc, bán kính đường tròn ngoại tiếp $R$, nội tiếp $r$ và diện tích của một tam giác bất kì.',
      vdSpec: '- Giải bài toán đo đạc thực tế: tính khoảng cách giữa hai vị trí không thể đến trực tiếp, tính chiều cao của tháp hoặc ngọn hải đăng.',
      assignedQuestions: { part1: 'I.10..I.16', part2: 'II.2 (ý c, d)', part3: 'III.2', essay: 'TL3' },
      points: 4.0
    }
  ],
  topicsList: [
    'Mệnh đề và tập hợp',
    'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
    'Hệ thức lượng trong tam giác'
  ]
};

// 3. MÔN TOÁN 12 - GIỮA KÌ I
export const TEMPLATE_TOAN_12_GK1: ExamMatrixTemplate = {
  id: 'matrix_toan_12_gk1',
  subjectId: 'toan',
  subjectName: 'Toán học',
  grade: '12',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Toán - Khối 12 (Chuẩn GDPT 2018)',
  badge: 'Toán 12 • Ứng dụng Đạo hàm & Oxyz',
  description: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số, cực trị, giá trị lớn nhất - nhỏ nhất, tiệm cận, vectơ và hệ trục tọa độ Oxyz trong không gian.',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Giải quyết vấn đề',
    c2: 'Tư duy toán học',
    c3: 'Mô hình hoá'
  },
  qCounts: { mc: 12, tf: 4, sa: 6, essay: 0 },
  matrixRows: [
    {
      id: 't12-row-1',
      topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT HÀM SỐ',
      unit: '1. Tính đơn điệu và Cực trị của hàm số',
      gqvd: { biet: 'I.1, I.2', hieu: 'I.3', vd: '' },
      tuduy: { biet: '', hieu: 'II.1ab', vd: 'III.1' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 't12-row-2',
      topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT HÀM SỐ',
      unit: '2. Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
      gqvd: { biet: 'I.4', hieu: 'I.5', vd: '' },
      tuduy: { biet: '', hieu: 'II.1cd', vd: '' },
      mohinh: { biet: '', hieu: 'III.2', vd: 'III.3' }
    },
    {
      id: 't12-row-3',
      topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT HÀM SỐ',
      unit: '3. Đường tiệm cận của đồ thị hàm số (đứng, ngang, xiên)',
      gqvd: { biet: 'I.6', hieu: 'I.7', vd: '' },
      tuduy: { biet: 'I.8', hieu: 'II.2ab', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 't12-row-4',
      topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT HÀM SỐ',
      unit: '4. Khảo sát sự biến thiên và đồ thị của các hàm số bậc ba, nhất biến, hữu tỉ',
      gqvd: { biet: 'I.9', hieu: '', vd: '' },
      tuduy: { biet: 'I.10', hieu: 'II.2cd', vd: '' },
      mohinh: { biet: '', hieu: '', vd: 'III.4' }
    },
    {
      id: 't12-row-5',
      topic: 'VECTƠ VÀ HỆ TỌA ĐỘ TRONG KHÔNG GIAN',
      unit: '1. Vectơ và các phép toán vectơ trong không gian',
      gqvd: { biet: 'I.11', hieu: '', vd: '' },
      tuduy: { biet: '', hieu: 'II.3ab', vd: '' },
      mohinh: { biet: '', hieu: '', vd: 'III.5' }
    },
    {
      id: 't12-row-6',
      topic: 'VECTƠ VÀ HỆ TỌA ĐỘ TRONG KHÔNG GIAN',
      unit: '2. Hệ tọa độ trong không gian $Oxyz$ và tọa độ điểm, vectơ',
      gqvd: { biet: 'I.12', hieu: 'II.3cd', vd: '' },
      tuduy: { biet: '', hieu: 'II.4abcd', vd: '' },
      mohinh: { biet: '', hieu: '', vd: 'III.6' }
    }
  ],
  specUnits: [
    {
      id: 't12-spec-1',
      topic: 'Ứng dụng đạo hàm để khảo sát hàm số',
      unit: '1. Đơn điệu, cực trị và tiệm cận',
      bietSpec: '- Nhận biết dấu của $y\'$ và tính đồng biến, nghịch biến.\n- Nhận biết điểm cực trị của hàm số từ bảng biến thiên và đồ thị.\n- Nhận dạng tiệm cận đứng, ngang, xiên.',
      hieuSpec: '- Tìm các khoảng đơn điệu, cực trị của hàm số phân thức hữu tỉ.\n- Xác định phương trình đường tiệm cận xiên $y = ax + b$ bằng giới hạn.',
      vdSpec: '- Tìm giá trị tham số $m$ để hàm số đơn điệu hoặc đạt cực trị tại một điểm cho trước.',
      assignedQuestions: { part1: 'I.1..I.8', part2: 'II.1, II.2 (ý a, b)', part3: 'III.1', essay: '' },
      points: 4.5
    },
    {
      id: 't12-spec-2',
      topic: 'Ứng dụng đạo hàm để khảo sát hàm số',
      unit: '2. Bài toán tối ưu hóa thực tế (Max - Min)',
      bietSpec: '- Nhận biết quy tắc tìm giá trị lớn nhất, nhỏ nhất trên một đoạn $[a; b]$.',
      hieuSpec: '- Tìm giá trị lớn nhất, nhỏ nhất của hàm số trên khoảng mở $(a; b)$ thông qua bảng biến thiên.',
      vdSpec: '- Vận dụng đạo hàm giải quyết bài toán thực tế: Cắt gấp hộp đựng tối đa thể tích, chi phí xây dựng kênh dẫn nước nhỏ nhất, tối ưu doanh thu bán hàng.',
      assignedQuestions: { part1: 'I.9, I.10', part2: 'II.2 (ý c, d)', part3: 'III.2, III.3, III.4', essay: '' },
      points: 3.0
    },
    {
      id: 't12-spec-3',
      topic: 'Vectơ và hệ tọa độ trong không gian',
      unit: '3. Tọa độ điểm, vectơ và ứng dụng trong không gian Oxyz',
      bietSpec: '- Nhận biết tọa độ điểm, tọa độ vectơ, độ dài vectơ trong hệ tọa độ $Oxyz$.\n- Nhận biết tích vô hướng của hai vectơ: $\\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2 + z_1 z_2$.',
      hieuSpec: '- Tính góc giữa hai vectơ, khoảng cách giữa hai điểm, tọa độ trọng tâm tam giác, tọa độ trung điểm đoạn thẳng.',
      vdSpec: '- Gắn hệ trục tọa độ $Oxyz$ vào mô hình công trình kiến trúc (mái vòm, chân tháp, giàn không gian) để giải bài toán định vị không gian.',
      assignedQuestions: { part1: 'I.11, I.12', part2: 'II.3, II.4', part3: 'III.5, III.6', essay: '' },
      points: 2.5
    }
  ],
  topicsList: [
    'Ứng dụng đạo hàm để khảo sát hàm số',
    'Vectơ và hệ tọa độ trong không gian'
  ]
};

// 4. MÔN VẬT LÍ 11 - GIỮA KÌ I
export const TEMPLATE_VAT_LI_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_vat_li_11_gk1',
  subjectId: 'vat_li',
  subjectName: 'Vật lí',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Vật lí - Khối 11 (Chuẩn GDPT 2018)',
  badge: 'Vật lí 11 • Dao động & Sóng cơ',
  description: 'Dao động điều hòa, các đại lượng đặc trưng (li độ, vận tốc, gia tốc), năng lượng trong dao động điều hòa, dao động tắt dần và dao động cưỡng bức.',
  durationMinutes: 45,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Nhận thức Vật lí',
    c2: 'Tìm hiểu tự nhiên',
    c3: 'Vận dụng kiến thức'
  },
  qCounts: { mc: 18, tf: 4, sa: 6, essay: 0 },
  matrixRows: [
    {
      id: 'vl11-row-1',
      topic: 'DAO ĐỘNG ĐIỀU HÒA',
      unit: '1. Mô tả dao động điều hòa và các phương trình $x(t)$, $v(t)$, $a(t)$',
      gqvd: { biet: 'I.1, I.2', hieu: 'I.3, I.4', vd: '' },
      tuduy: { biet: 'I.5', hieu: 'II.1ab', vd: 'III.1' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'vl11-row-2',
      topic: 'DAO ĐỘNG ĐIỀU HÒA',
      unit: '2. Chu kì, tần số và tần số góc của con lắc lò xo và con lắc đơn',
      gqvd: { biet: 'I.6, I.7', hieu: 'I.8', vd: '' },
      tuduy: { biet: '', hieu: 'II.1cd', vd: 'III.2' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'vl11-row-3',
      topic: 'NĂNG LƯỢNG TRONG DAO ĐỘNG',
      unit: '1. Động năng, thế năng và sự bảo toàn cơ năng của vật dao động điều hòa',
      gqvd: { biet: 'I.9, I.10', hieu: 'I.11', vd: '' },
      tuduy: { biet: 'I.12', hieu: 'II.2ab', vd: 'III.3' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'vl11-row-4',
      topic: 'DAO ĐỘNG TẮT DẦN - DAO ĐỘNG CƯỠNG BỨC',
      unit: '1. Hiện tượng cộng hưởng cơ học và ứng dụng thực tiễn',
      gqvd: { biet: 'I.13, I.14', hieu: 'I.15', vd: '' },
      tuduy: { biet: 'I.16', hieu: 'II.2cd', vd: '' },
      mohinh: { biet: 'I.17, I.18', hieu: 'II.3abcd', vd: 'III.4, III.5, III.6' }
    }
  ],
  specUnits: [
    {
      id: 'vl11-spec-1',
      topic: 'Dao động điều hòa',
      unit: '1. Phương trình dao động và mối liên hệ li độ - vận tốc - gia tốc',
      bietSpec: '- Nhận biết định nghĩa dao động điều hòa, biên độ $A$, tần số góc $\\omega$, pha ban đầu $\\varphi$.\n- Nhận biết các biểu thức $x = A\\cos(\\omega t + \\varphi)$, $v = -\\omega A\\sin(\\omega t + \\varphi)$, $a = -\\omega^2 x$.',
      hieuSpec: '- Hiểu được mối quan hệ về pha giữa li độ, vận tốc và gia tốc ($v$ sớm pha $\\frac{\\pi}{2}$ so với $x$; $a$ ngược pha so với $x$).\n- Khai thác thông tin từ đồ thị li độ - thời gian, vận tốc - thời gian.',
      vdSpec: '- Vận dụng hệ thức độc lập với thời gian: $x^2 + \\frac{v^2}{\\omega^2} = A^2$ để tính các đại lượng còn lại tại thời điểm bất kì.',
      assignedQuestions: { part1: 'I.1..I.8', part2: 'II.1', part3: 'III.1, III.2', essay: '' },
      points: 4.0
    },
    {
      id: 'vl11-spec-2',
      topic: 'Năng lượng dao động điều hòa',
      unit: '2. Động năng, thế năng và cơ năng',
      bietSpec: '- Nhận biết công thức động năng $W_d = \\frac{1}{2}mv^2$, thế năng $W_t = \\frac{1}{2}kx^2 = \\frac{1}{2}m\\omega^2 x^2$, cơ năng $W = \\frac{1}{2}kA^2$.',
      hieuSpec: '- Hiểu được sự chuyển hóa qua lại giữa động năng và thế năng trong một chu kì dao động.',
      vdSpec: '- Tính toán tỉ số giữa động năng và thế năng tại vị trí có li độ $x$, xác định thời điểm động năng bằng thế năng.',
      assignedQuestions: { part1: 'I.9..I.12', part2: 'II.2', part3: 'III.3', essay: '' },
      points: 3.0
    },
    {
      id: 'vl11-spec-3',
      topic: 'Cộng hưởng và dao động thực tế',
      unit: '3. Dao động tắt dần, dao động duy trì, hiện tượng cộng hưởng cơ',
      bietSpec: '- Nhận biết nguyên nhân gây ra dao động tắt dần (lực cản môi trường).\n- Nhận biết điều kiện xảy ra hiện tượng cộng hưởng ($f = f_0$).',
      hieuSpec: '- Giải thích được các ứng dụng có lợi và tác hại của hiện tượng cộng hưởng trong đời sống (cầu treo lắc lư, khung xe rung, con lắc địa chấn).',
      vdSpec: '- Đề xuất giải pháp kĩ thuật nhằm hạn chế hoặc tận dụng hiện tượng cộng hưởng trong công trình xây dựng và giao thông.',
      assignedQuestions: { part1: 'I.13..I.18', part2: 'II.3, II.4', part3: 'III.4, III.5, III.6', essay: '' },
      points: 3.0
    }
  ],
  topicsList: [
    'Dao động điều hòa và các phương trình trạng thái',
    'Năng lượng trong dao động điều hòa',
    'Dao động tắt dần, dao động cưỡng bức và hiện tượng cộng hưởng'
  ]
};

// 5. MÔN HÓA HỌC 11 - GIỮA KÌ I
export const TEMPLATE_HOA_HOC_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_hoa_hoc_11_gk1',
  subjectId: 'hoa_hoc',
  subjectName: 'Hóa học',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Hóa học - Khối 11 (Chuẩn GDPT 2018)',
  badge: 'Hóa học 11 • Cân bằng hóa học & Nitrogen',
  description: 'Khái niệm phản ứng thuận nghịch, hằng số cân bằng Kc, nguyên lí Le Chatelier, thuyết Brønsted-Lowry về acid - base, pH, đơn chất Nitrogen và hợp chất.',
  durationMinutes: 45,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Nhận thức Hóa học',
    c2: 'Tìm hiểu tự nhiên',
    c3: 'Vận dụng kiến thức'
  },
  qCounts: { mc: 18, tf: 4, sa: 6, essay: 0 },
  matrixRows: [
    {
      id: 'hh11-row-1',
      topic: 'CÂN BẰNG HÓA HỌC',
      unit: '1. Khái niệm phản ứng thuận nghịch và trạng thái cân bằng hóa học',
      gqvd: { biet: 'I.1, I.2', hieu: 'I.3', vd: '' },
      tuduy: { biet: 'I.4', hieu: 'II.1ab', vd: '' },
      mohinh: { biet: '', hieu: '', vd: 'III.1' }
    },
    {
      id: 'hh11-row-2',
      topic: 'CÂN BẰNG HÓA HỌC',
      unit: '2. Các yếu tố chuyển dịch cân bằng (nguyên lí Le Chatelier: nồng độ, áp suất, nhiệt độ)',
      gqvd: { biet: 'I.5, I.6', hieu: 'I.7', vd: '' },
      tuduy: { biet: '', hieu: 'II.1cd', vd: 'III.2' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'hh11-row-3',
      topic: 'CÂN BẰNG TRONG DUNG DỊCH NƯỚC',
      unit: '1. Sự điện li, thuyết acid - base của Brønsted-Lowry và tính toán pH',
      gqvd: { biet: 'I.8, I.9', hieu: 'I.10', vd: '' },
      tuduy: { biet: 'I.11', hieu: 'II.2abcd', vd: 'III.3' },
      mohinh: { biet: '', hieu: '', vd: 'III.4' }
    },
    {
      id: 'hh11-row-4',
      topic: 'NITROGEN VÀ HỢP CHẤT CỦA NITROGEN',
      unit: '1. Đơn chất Nitrogen, Ammonia và muối Ammonium, Ứng dụng trong nông nghiệp',
      gqvd: { biet: 'I.12, I.13', hieu: 'I.14, I.15', vd: '' },
      tuduy: { biet: 'I.16', hieu: 'II.3abcd', vd: 'III.5' },
      mohinh: { biet: 'I.17, I.18', hieu: 'II.4abcd', vd: 'III.6' }
    }
  ],
  specUnits: [
    {
      id: 'hh11-spec-1',
      topic: 'Cân bằng hóa học',
      unit: '1. Nguyên lí chuyển dịch cân bằng Le Chatelier và biểu thức Kc',
      bietSpec: '- Nhận biết khái niệm phản ứng một chiều, phản ứng thuận nghịch, cân bằng hóa học.\n- Viết được biểu thức hằng số cân bằng $K_c$ cho phản ứng đồng thể và dị thể.',
      hieuSpec: '- Dự đoán được chiều chuyển dịch của cân bằng hóa học khi thay đổi nồng độ, áp suất hoặc nhiệt độ của hệ phản ứng.',
      vdSpec: '- Vận dụng nguyên lí Le Chatelier để giải thích các điều kiện tối ưu (nhiệt độ, áp suất, chất xúc tác) trong công nghiệp tổng hợp ammonia (quy trình Haber-Bosch).',
      assignedQuestions: { part1: 'I.1..I.7', part2: 'II.1', part3: 'III.1, III.2', essay: '' },
      points: 3.5
    },
    {
      id: 'hh11-spec-2',
      topic: 'Cân bằng trong dung dịch nước',
      unit: '2. Thuyết Brønsted-Lowry, chất chỉ thị và thang pH',
      bietSpec: '- Nhận biết acid là chất nhường $H^+$, base là chất nhận $H^+$.\n- Nhận biết định nghĩa pH: $\\text{pH} = -\\lg[H^+]$. Môi trường acid, trung tính, base.',
      hieuSpec: '- Tính được pH của dung dịch acid mạnh và base mạnh đơn chức trong nước.',
      vdSpec: '- Tính toán nồng độ mol trong phép chuẩn độ acid - base sử dụng dung dịch chuẩn và chất chỉ thị phenolphthalein.',
      assignedQuestions: { part1: 'I.8..I.11', part2: 'II.2', part3: 'III.3, III.4', essay: '' },
      points: 3.5
    },
    {
      id: 'hh11-spec-3',
      topic: 'Nitrogen và hợp chất',
      unit: '3. Tính chất hóa học của đơn chất Nitrogen, Ammonia và Nitric acid',
      bietSpec: '- Nhận biết tính trơ của liên kết ba $N \\equiv N$ ở nhiệt độ thường.\n- Nhận biết tính base yếu và tính khử của ammonia ($NH_3$).',
      hieuSpec: '- Giải thích được tính acid mạnh và tính oxi hóa mạnh của nitric acid ($HNO_3$) tác dụng với kim loại.',
      vdSpec: '- Giải thích hiện tượng mưa acid do khí thải nitrogen oxides ($NO_x$) và tác động của phân đạm đối với môi trường nước (phú dưỡng hóa).',
      assignedQuestions: { part1: 'I.12..I.18', part2: 'II.3, II.4', part3: 'III.5, III.6', essay: '' },
      points: 3.0
    }
  ],
  topicsList: [
    'Cân bằng hóa học và nguyên lí Le Chatelier',
    'Cân bằng trong dung dịch nước và thang pH',
    'Nitrogen và hợp chất của Nitrogen'
  ]
};

// 6. MÔN SINH HỌC 11 - GIỮA KÌ I
export const TEMPLATE_SINH_HOC_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_sinh_hoc_11_gk1',
  subjectId: 'sinh_hoc',
  subjectName: 'Sinh học',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Sinh học - Khối 11 (Chuẩn GDPT 2018)',
  badge: 'Sinh học 11 • Chuyển hóa vật chất ở Thực vật',
  description: 'Trao đổi nước và khoáng ở thực vật, quang hợp ở thực vật (pha sáng, pha tối C3, C4, CAM), hô hấp ở thực vật và ứng dụng thực tiễn.',
  durationMinutes: 45,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Nhận thức Sinh học',
    c2: 'Tìm hiểu thế giới sống',
    c3: 'Vận dụng kiến thức'
  },
  qCounts: { mc: 18, tf: 4, sa: 6, essay: 0 },
  matrixRows: [
    {
      id: 'sh11-row-1',
      topic: 'TRAO ĐỔI NƯỚC VÀ KHOÁNG Ở THỰC VẬT',
      unit: '1. Quá trình hấp thụ nước và ion khoáng ở rễ, dòng mạch gỗ và mạch rây',
      gqvd: { biet: 'I.1, I.2', hieu: 'I.3, I.4', vd: '' },
      tuduy: { biet: 'I.5', hieu: 'II.1ab', vd: 'III.1' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'sh11-row-2',
      topic: 'TRAO ĐỔI NƯỚC VÀ KHOÁNG Ở THỰC VẬT',
      unit: '2. Thoát hơi nước ở lá qua khí khổng và vai trò của các nguyên tố khoáng thiết yếu',
      gqvd: { biet: 'I.6, I.7', hieu: 'I.8', vd: '' },
      tuduy: { biet: '', hieu: 'II.1cd', vd: 'III.2' },
      mohinh: { biet: '', hieu: '', vd: 'III.3' }
    },
    {
      id: 'sh11-row-3',
      topic: 'QUANG HỢP Ở THỰC VẬT',
      unit: '1. Khái niệm, vai trò, sắc tố quang hợp, pha sáng và pha tối (C3, C4, CAM)',
      gqvd: { biet: 'I.9, I.10', hieu: 'I.11, I.12', vd: '' },
      tuduy: { biet: 'I.13', hieu: 'II.2abcd', vd: 'III.4' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'sh11-row-4',
      topic: 'HÔ HẤP Ở THỰC VẬT',
      unit: '1. Các giai đoạn hô hấp (đường phân, chu trình Krebs, chuỗi chuyền electron) và ứng dụng bảo quản nông sản',
      gqvd: { biet: 'I.14, I.15', hieu: 'I.16', vd: '' },
      tuduy: { biet: 'I.17', hieu: 'II.3abcd', vd: 'III.5' },
      mohinh: { biet: 'I.18', hieu: 'II.4abcd', vd: 'III.6' }
    }
  ],
  specUnits: [
    {
      id: 'sh11-spec-1',
      topic: 'Trao đổi nước và khoáng',
      unit: '1. Con đường vận chuyển nước, cơ chế đóng mở khí khổng',
      bietSpec: '- Nhận biết cơ quan hấp thụ nước và muối khoáng (lông hút của rễ).\n- Nhận biết động lực của dòng mạch gỗ (áp suất rễ, lực hút do thoát hơi nước, lực liên kết).',
      hieuSpec: '- Phân biệt được con đường gian bào và con đường tế bào chất khi nước đi vào trụ bì.\n- Giải thích cơ chế trương nước và mất nước làm mở và đóng khí khổng.',
      vdSpec: '- Vận dụng kiến thức để giải thích hiện tượng bón quá nhiều phân làm cây bị héo (hiện tượng thẩm thấu ngược) và biện pháp tưới nước hợp lí cho cây trồng.',
      assignedQuestions: { part1: 'I.1..I.8', part2: 'II.1', part3: 'III.1..III.3', essay: '' },
      points: 4.0
    },
    {
      id: 'sh11-spec-2',
      topic: 'Quang hợp ở thực vật',
      unit: '2. Các con đường cố định CO2 ở thực vật C3, C4 và CAM',
      bietSpec: '- Nhận biết phương trình tổng quát của quang hợp.\n- Nhận biết các nhóm thực vật $C_3$, $C_4$, $\\text{CAM}$ tiêu biểu.',
      hieuSpec: '- So sánh được các đặc điểm thích nghi của thực vật $C_4$ và $\\text{CAM}$ trong điều kiện nhiệt độ cao, khô hạn (khí khổng mở vào ban đêm).',
      vdSpec: '- Đề xuất các biện pháp kĩ thuật nâng cao năng suất cây trồng (tăng diện tích lá, tăng hiệu suất quang hợp, điều khiển ánh sáng nhân tạo).',
      assignedQuestions: { part1: 'I.9..I.13', part2: 'II.2', part3: 'III.4', essay: '' },
      points: 3.5
    },
    {
      id: 'sh11-spec-3',
      topic: 'Hô hấp ở thực vật',
      unit: '3. Bản chất hô hấp và bảo quản nông sản sau thu hoạch',
      bietSpec: '- Nhận biết khái niệm hô hấp tế bào và các giai đoạn chính.\n- Nhận biết các yếu tố môi trường ảnh hưởng đến hô hấp (nhiệt độ, độ ẩm, nồng độ $O_2$, $CO_2$).',
      hieuSpec: '- Hiểu được mối quan hệ mật thiết hai chiều giữa quang hợp và hô hấp ở thực vật.',
      vdSpec: '- Giải thích nguyên lí khoa học của các phương pháp bảo quản hạt, củ, quả (bảo quản khô, bảo quản lạnh, bảo quản trong môi trường nồng độ $CO_2$ cao).',
      assignedQuestions: { part1: 'I.14..I.18', part2: 'II.3, II.4', part3: 'III.5, III.6', essay: '' },
      points: 2.5
    }
  ],
  topicsList: [
    'Trao đổi nước và khoáng ở thực vật',
    'Quang hợp ở thực vật (Pha sáng & Cố định CO2)',
    'Hô hấp ở thực vật và công nghệ bảo quản nông sản'
  ]
};

// 7. MÔN TIẾNG ANH 11 - GIỮA KÌ I
export const TEMPLATE_TIENG_ANH_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_tieng_anh_11_gk1',
  subjectId: 'tieng_anh',
  subjectName: 'Tiếng Anh',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Tiếng Anh - Khối 11 (Chuẩn GDPT 2018)',
  badge: 'Tiếng Anh 11 • Global Success',
  description: 'Unit 1: A Long and Healthy Life & Unit 2: The Generation Gap. Kiểm tra Ngữ âm (Pronunciation), Từ vựng (Vocabulary), Ngữ pháp (Grammar), Đọc hiểu (Reading) và Viết (Writing).',
  durationMinutes: 60,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Ngôn ngữ (Language)',
    c2: 'Đọc hiểu (Reading)',
    c3: 'Giao tiếp & Viết'
  },
  qCounts: { mc: 32, tf: 0, sa: 8, essay: 0 },
  matrixRows: [
    {
      id: 'ta11-row-1',
      topic: 'PRONUNCIATION (NGỮ ÂM)',
      unit: 'Strong and weak forms of auxiliary verbs; Contracted forms; Word stress in two-syllable words',
      gqvd: { biet: 'I.1, I.2', hieu: 'I.3, I.4', vd: '' },
      tuduy: { biet: '', hieu: '', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'ta11-row-2',
      topic: 'VOCABULARY & GRAMMAR (TỪ VỰNG - NGỮ PHÁP)',
      unit: 'Health, longevity, lifestyle; Family relationships; Past Simple vs. Present Perfect; Modal verbs (must, have to, should)',
      gqvd: { biet: 'I.5..I.10', hieu: 'I.11..I.16', vd: 'I.17, I.18' },
      tuduy: { biet: '', hieu: '', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'ta11-row-3',
      topic: 'READING COMPREHENSION (ĐỌC HIỂU)',
      unit: 'Cloze test (Điền từ vào đoạn văn 5 câu); Reading passage 1 (Chiến lược sống lâu và sức khỏe gia đình 5 câu)',
      gqvd: { biet: 'I.19..I.22', hieu: 'I.23..I.26', vd: 'I.27, I.28' },
      tuduy: { biet: '', hieu: '', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'ta11-row-4',
      topic: 'WRITING & COMMUNICATION (VIẾT & GIAO TIẾP)',
      unit: 'Sentence rearrangement; Error identification; Sentence transformation with unchanged meaning',
      gqvd: { biet: 'I.29, I.30', hieu: 'I.31, I.32', vd: 'III.1..III.8' },
      tuduy: { biet: '', hieu: '', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    }
  ],
  specUnits: [
    {
      id: 'ta11-spec-1',
      topic: 'Pronunciation',
      unit: '1. Phát âm và trọng âm từ 2 âm tiết',
      bietSpec: '- Nhận biết cách phát âm của các nguyên âm đơn và phụ âm phổ biến.\n- Nhận biết vị trí trọng âm rơi vào âm tiết thứ nhất hoặc thứ hai của danh từ/động từ hai âm tiết.',
      hieuSpec: '- Phân biệt dạng phát âm mạnh (strong form) và dạng phát âm yếu (weak form) của các trợ động từ trong ngữ cảnh giao tiếp.',
      vdSpec: '- Áp dụng vào ngữ điệu câu hỏi và câu cảm thán.',
      assignedQuestions: { part1: 'I.1..I.4', part2: '', part3: '', essay: '' },
      points: 1.0
    },
    {
      id: 'ta11-spec-2',
      topic: 'Vocabulary and Grammar',
      unit: '2. Từ vựng chủ đề Sức khỏe, Khoảng cách thế hệ & Các thì, Động từ khuyết thiếu',
      bietSpec: '- Nhận biết các từ vựng chủ đề sống khỏe, chế độ dinh dưỡng, xung đột thế hệ trong gia đình.\n- Nhận biết cấu trúc thì Hiện tại hoàn thành và Quá khứ đơn.',
      hieuSpec: '- Hiểu sự khác biệt giữa động từ khuyết thiếu chỉ sự bắt buộc (must vs. have to) và lời khuyên (should / ought to).\n- Sử dụng đúng liên từ và mạo từ trong câu.',
      vdSpec: '- Vận dụng cụm động từ (phrasal verbs) và thành ngữ (collocations) để hoàn thiện câu chính xác theo ngữ cảnh.',
      assignedQuestions: { part1: 'I.5..I.18', part2: '', part3: '', essay: '' },
      points: 3.5
    },
    {
      id: 'ta11-spec-3',
      topic: 'Reading Comprehension',
      unit: '3. Đọc điền từ và đọc hiểu chi tiết bài đọc văn bản',
      bietSpec: '- Tìm kiếm thông tin cụ thể (scanning), nhận biết từ vựng đồng nghĩa/trái nghĩa trong đoạn văn.',
      hieuSpec: '- Hiểu được ý chính (skimming) của từng đoạn văn bản, xác định từ quy chiếu (pronoun reference).',
      vdSpec: '- Suy luận hàm ý (inference), thái độ của tác giả đối với phong cách sống lành mạnh của người dân đảo Okinawa.',
      assignedQuestions: { part1: 'I.19..I.28', part2: '', part3: '', essay: '' },
      points: 3.0
    },
    {
      id: 'ta11-spec-4',
      topic: 'Writing Skills',
      unit: '4. Viết lại câu không đổi nghĩa và sắp xếp trật tự từ',
      bietSpec: '- Nhận biết lỗi ngữ pháp trong câu (thì động từ, sự hòa hợp chủ - vị).',
      hieuSpec: '- Viết lại câu chuyển đổi giữa thì Quá khứ đơn và Hiện tại hoàn thành (The last time... was... -> has not...).',
      vdSpec: '- Sử dụng cấu trúc câu chẻ (cleft sentences) hoặc mệnh đề quan hệ để nhấn mạnh thông điệp giao tiếp.',
      assignedQuestions: { part1: 'I.29..I.32', part2: '', part3: 'III.1..III.8', essay: '' },
      points: 2.5
    }
  ],
  topicsList: [
    'Unit 1: A Long and Healthy Life',
    'Unit 2: The Generation Gap',
    'Grammar: Past Simple vs. Present Perfect, Modal Verbs'
  ]
};

// 8. MÔN NGỮ VĂN 11 - GIỮA KÌ I
export const TEMPLATE_NGU_VAN_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_ngu_van_11_gk1',
  subjectId: 'ngu_van',
  subjectName: 'Ngữ văn',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Ngữ văn - Khối 11 (Chuẩn GDPT 2018)',
  badge: 'Ngữ văn 11 • Đọc hiểu & Viết NLXH/NLVH',
  description: 'Đánh giá năng lực Đọc hiểu văn bản văn học (truyện ngắn hiện đại ngoài SGK) và năng lực Viết (Viết đoạn văn NLXH 200 chữ và bài văn nghị luận phân tích nhân vật).',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Đọc hiểu văn bản',
    c2: 'Viết đoạn NLXH',
    c3: 'Viết bài NLVH'
  },
  qCounts: { mc: 5, tf: 0, sa: 3, essay: 2 },
  matrixRows: [
    {
      id: 'nv11-row-1',
      topic: 'PHẦN I: ĐỌC HIỂU (4.0 ĐIỂM)',
      unit: 'Ngữ liệu ngoài SGK: Văn bản truyện ngắn / tiểu thuyết hiện đại Việt Nam',
      gqvd: { biet: 'C1, C2', hieu: 'C3, C4', vd: 'C5' },
      tuduy: { biet: '', hieu: 'C6, C7', vd: 'C8' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'nv11-row-2',
      topic: 'PHẦN II: VIẾT (6.0 ĐIỂM)',
      unit: 'Câu 1: Viết đoạn văn nghị luận xã hội (khoảng 200 chữ) bàn về một vấn đề gợi ra từ phần Đọc hiểu',
      gqvd: { biet: '', hieu: 'Ý 1', vd: 'Ý 2, 3' },
      tuduy: { biet: '', hieu: '', vd: 'NLXH' },
      mohinh: { biet: '', hieu: '', vd: '' }
    },
    {
      id: 'nv11-row-3',
      topic: 'PHẦN II: VIẾT (6.0 ĐIỂM)',
      unit: 'Câu 2: Viết bài văn nghị luận văn học phân tích, đánh giá chủ đề và những nét đặc sắc về nghệ thuật kể chuyện',
      gqvd: { biet: '', hieu: 'MB, TB', vd: 'KB' },
      tuduy: { biet: '', hieu: '', vd: 'NLVH' },
      mohinh: { biet: '', hieu: '', vd: '' }
    }
  ],
  specUnits: [
    {
      id: 'nv11-spec-1',
      topic: 'Phần I: Đọc hiểu văn bản truyện',
      unit: '1. Nhận biết ngôi kể, cốt truyện, nhân vật, chi tiết nghệ thuật và thông điệp',
      bietSpec: '- Nhận biết ngôi kể (ngôi thứ nhất, ngôi thứ ba), điểm nhìn trần thuật.\n- Nhận biết không gian, thời gian và các chi tiết tiêu biểu trong tác phẩm.',
      hieuSpec: '- Hiểu được ý nghĩa biểu tượng của các hình ảnh, cử chỉ, lời nói của nhân vật.\n- Phân tích được tâm lí, diễn biến nội tâm và tính cách của nhân vật trong tình huống truyện.',
      vdSpec: '- Rút ra thông điệp, bài học cuộc sống sâu sắc nhất mà tác giả muốn gửi gắm qua văn bản và liên hệ với bản thân.',
      assignedQuestions: { part1: 'Câu 1..5 (TNKQ)', part2: '', part3: 'Câu 6..8 (Tự luận ngắn)', essay: '' },
      points: 4.0
    },
    {
      id: 'nv11-spec-2',
      topic: 'Phần II: Viết đoạn văn Nghị luận xã hội',
      unit: '2. Viết đoạn văn nghị luận xã hội khoảng 200 chữ',
      bietSpec: '- Đảm bảo đúng hình thức đoạn văn khoảng 200 chữ, có mở đoạn, thân đoạn, kết đoạn.',
      hieuSpec: '- Giải thích được vấn đề tư tưởng đạo lí hoặc hiện tượng đời sống đặt ra từ văn bản đọc hiểu.',
      vdSpec: '- Bàn luận sâu sắc, đưa ra dẫn chứng thực tế thuyết phục, phản biện vấn đề và liên hệ bài học nhận thức, hành động bản thân.',
      assignedQuestions: { part1: '', part2: '', part3: '', essay: 'Câu 1 Làm văn (2.0 điểm)' },
      points: 2.0
    },
    {
      id: 'nv11-spec-3',
      topic: 'Phần II: Viết bài văn Nghị luận văn học',
      unit: '3. Phân tích, đánh giá giá trị nội dung và nghệ thuật của tác phẩm truyện',
      bietSpec: '- Đảm bảo cấu trúc bài văn nghị luận gồm ba phần Mở bài, Thân bài, Kết bài; giới thiệu tác giả, tác phẩm.',
      hieuSpec: '- Phân tích hệ thống luận điểm rõ ràng: vẻ đẹp hình tượng nhân vật, tình huống truyện độc đáo, nghệ thuật miêu tả tâm lí và ngôn ngữ trần thuật.',
      vdSpec: '- Đánh giá phong cách nghệ thuật của tác giả, đóng góp của tác phẩm đối với nền văn học và cảm thụ thẩm mĩ cá nhân độc đáo, sáng tạo.',
      assignedQuestions: { part1: '', part2: '', part3: '', essay: 'Câu 2 Làm văn (4.0 điểm)' },
      points: 4.0
    }
  ],
  topicsList: [
    'Đọc hiểu truyện ngắn hiện đại (Ngữ liệu ngoài SGK)',
    'Nghị luận xã hội (Khoảng 200 chữ)',
    'Nghị luận văn học (Phân tích nhân vật & Nghệ thuật truyện)'
  ]
};

// DANH MỤC TẤT CẢ MẪU MA TRẬN TRONG THƯ VIỆN
export const ALL_MATRIX_TEMPLATES: ExamMatrixTemplate[] = [
  TEMPLATE_TOAN_11_GK1,
  TEMPLATE_TOAN_10_GK1,
  TEMPLATE_TOAN_12_GK1,
  TEMPLATE_VAT_LI_11_GK1,
  TEMPLATE_HOA_HOC_11_GK1,
  TEMPLATE_SINH_HOC_11_GK1,
  TEMPLATE_TIENG_ANH_11_GK1,
  TEMPLATE_NGU_VAN_11_GK1
];
