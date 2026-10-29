// ============================================================================
// DATA TYPES
// ============================================================================

export interface MatrixRowItem {
  id: string;
  topic: string; // Chủ đề / Chương (kèm số tiết, ví dụ: "Hàm số lượng giác và phương trình lượng giác (10t)")
  unit: string;  // Nội dung / Đơn vị kiến thức (kèm số tiết, ví dụ: "Giá trị lượng giác của góc lượng giác (3t)")
  
  // Khung ma trận chuẩn THPT EDUPLAN AI (19 cột chuẩn GDPT 2018)
  nlc?: { biet: string; hieu: string; vd: string; };   // Nhiều lựa chọn (I.1, I.2...)
  ds?: { biet: string; hieu: string; vd: string; };    // Đúng - Sai (II.1a, II.1b...)
  tln?: { biet: string; hieu: string; vd: string; };   // Trả lời ngắn (III.1...)
  tl?: { biet: string; hieu: string; vd: string; };    // Tự luận (IV.1 (0,5đ)...)
  tong?: { biet: number; hieu: number; vd: number; };  // Tổng số lệnh hỏi
  tiLe?: string;                                       // Tỉ lệ % điểm (ví dụ: '15%')

  // Năng lực 1 (Toán: GQVĐ; KHTN: Nhận thức; Ngoại ngữ: Ngôn ngữ; Ngữ văn: Đọc hiểu)
  gqvd?: {
    biet: string;
    hieu: string;
    vd: string;
  };
  // Năng lực 2 (Toán: Tư duy; KHTN: Tìm hiểu; Ngoại ngữ: Đọc hiểu; Ngữ văn: Viết NLXH)
  tuduy?: {
    biet: string;
    hieu: string;
    vd: string;
  };
  // Năng lực 3 (Toán: Mô hình hoá; KHTN: Vận dụng; Ngoại ngữ: Giao tiếp/Viết; Ngữ văn: Viết NLVH)
  mohinh?: {
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

// ============================================================================
// DỮ LIỆU MA TRẬN & BẢN ĐẶC TẢ CHUẨN MẪU THPT VINH LỘC (GDPT 2018)
// Khung chuẩn 19 cột (4 dạng thức: NLC 12 câu, ĐS 2 câu 8 ý, TLN 4 câu, TL 4 ý)
// ============================================================================

// 1. TOÁN 11 - CHUẨN 100% THEO FILE ĐÍNH KÈM THPT VINH LỘC (2026 - 2027)
export const VINHLOC_MATRIX_11: MatrixRowItem[] = [
  {
    id: 'vl11-1',
    topic: 'Hàm số lượng giác và phương trình lượng giác (10t)',
    unit: 'Giá trị lượng giác của góc lượng giác (3t)',
    nlc: { biet: 'I.1, I.2', hieu: '', vd: '' },
    ds: { biet: 'II.1a', hieu: 'II.1b', vd: '' },
    tln: { biet: 'III.1', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 2, vd: 0 },
    tiLe: '15%'
  },
  {
    id: 'vl11-2',
    topic: 'Hàm số lượng giác và phương trình lượng giác (10t)',
    unit: 'Công thức lượng giác (2t)',
    nlc: { biet: 'I.3', hieu: '', vd: '' },
    ds: { biet: 'II.1c', hieu: '', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: 'IV.1 (0,5đ)', vd: '' },
    tong: { biet: 2, hieu: 1, vd: 0 },
    tiLe: '10%'
  },
  {
    id: 'vl11-3',
    topic: 'Hàm số lượng giác và phương trình lượng giác (10t)',
    unit: 'Hàm số lượng giác (2t)',
    nlc: { biet: 'I.4, I.5, I.6', hieu: '', vd: '' },
    ds: { biet: 'II.1d', hieu: '', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 1, vd: 0 },
    tiLe: '10%'
  },
  {
    id: 'vl11-4',
    topic: 'Hàm số lượng giác và phương trình lượng giác (10t)',
    unit: 'Phương trình lượng giác cơ bản (2t)',
    nlc: { biet: '', hieu: '', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: 'III.2', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.2 (1đ)' },
    tong: { biet: 0, hieu: 0, vd: 2 },
    tiLe: '15%'
  },
  {
    id: 'vl11-5',
    topic: 'Dãy số, cấp số cộng và cấp số nhân (7t)',
    unit: 'Dãy số (2t)',
    nlc: { biet: 'I.7, I.8', hieu: '', vd: '' },
    ds: { biet: 'II.2a', hieu: 'II.2b', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 1, vd: 0 },
    tiLe: '10%'
  },
  {
    id: 'vl11-6',
    topic: 'Dãy số, cấp số cộng và cấp số nhân (7t)',
    unit: 'Cấp số cộng (2t)',
    nlc: { biet: 'I.9', hieu: '', vd: '' },
    ds: { biet: 'II.2c', hieu: 'II.2d', vd: '' },
    tln: { biet: '', hieu: '', vd: 'III.3' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 2, hieu: 1, vd: 1 },
    tiLe: '12,5%'
  },
  {
    id: 'vl11-7',
    topic: 'Dãy số, cấp số cộng và cấp số nhân (7t)',
    unit: 'Cấp số nhân (2t)',
    nlc: { biet: 'I.10', hieu: '', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.3 (1đ)' },
    tong: { biet: 1, hieu: 0, vd: 1 },
    tiLe: '12,5%'
  },
  {
    id: 'vl11-8',
    topic: 'Các số đặc trưng của mẫu số liệu không ghép nhóm (4t)',
    unit: 'Mẫu số liệu ghép nhóm (1t)',
    nlc: { biet: '', hieu: 'I.11', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 0, hieu: 1, vd: 0 },
    tiLe: '2,5%'
  },
  {
    id: 'vl11-9',
    topic: 'Các số đặc trưng của mẫu số liệu không ghép nhóm (4t)',
    unit: 'Các số đặc trưng đo xu thế trung tâm (2t)',
    nlc: { biet: 'I.12', hieu: '', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: 'III.4', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.4 (0,5đ)' },
    tong: { biet: 1, hieu: 0, vd: 2 },
    tiLe: '12,5%'
  }
];

export const VINHLOC_SPEC_11: SpecUnitItem[] = [
  {
    id: 'vls-11-1',
    topic: 'HÀM SỐ LƯỢNG GIÁC VÀ PHƯƠNG TRÌNH LƯỢNG GIÁC',
    unit: '1.1. Giá trị lượng giác của góc lượng giác',
    bietSpec: '- Nhận biết các khái niệm cơ bản về góc lượng giác.\n- Nhận biết khái niệm giá trị lượng giác của một góc lượng giác.\n- Nhận biết dấu của các giá trị lượng giác trong từng góc phần tư.',
    hieuSpec: '- Mô tả bảng giá trị lượng giác của một số góc lượng giác thường gặp; hệ thức cơ bản giữa các giá trị lượng giác của một góc lượng giác; quan hệ giữa các giá trị lượng giác có liên quan đặc biệt: bù nhau, phụ nhau, đối nhau, hơn kém nhau $\\pi$.\n- Sử dụng máy tính cầm tay để tính giá trị lượng giác của một góc lượng giác khi biết số đo của góc đó.',
    vdSpec: '- Vận dụng giá trị lượng giác giải bài toán thực tế đơn giản.',
    assignedQuestions: { part1: 'I.1, I.2', part2: 'II.1a, II.1b', part3: 'III.1', essay: '' },
    points: 1.5
  },
  {
    id: 'vls-11-2',
    topic: 'HÀM SỐ LƯỢNG GIÁC VÀ PHƯƠNG TRÌNH LƯỢNG GIÁC',
    unit: '1.2. Công thức lượng giác',
    bietSpec: '- Nhận biết các công thức biến đổi lượng giác cơ bản: $\\sin^2 x + \\cos^2 x = 1$, $1 + \\tan^2 x = \\frac{1}{\\cos^2 x}$, công thức cộng, công thức góc nhân đôi.',
    hieuSpec: '- Mô tả các phép biến đổi lượng giác cơ bản: công thức cộng; công thức góc nhân đôi; công thức biến đổi tích thành tổng và công thức biến đổi tổng thành tích.',
    vdSpec: '- Vận dụng rút gọn biểu thức và tính giá trị biểu thức lượng giác nhiều góc.',
    assignedQuestions: { part1: 'I.3', part2: 'II.1c', part3: '', essay: 'IV.1 (0,5đ)' },
    points: 1.0
  },
  {
    id: 'vls-11-3',
    topic: 'HÀM SỐ LƯỢNG GIÁC VÀ PHƯƠNG TRÌNH LƯỢNG GIÁC',
    unit: '1.3. Hàm số lượng giác',
    bietSpec: '- Nhận biết các khái niệm về hàm số chẵn, hàm số lẻ, hàm số tuần hoàn.\n- Nhận biết các đặc trưng hình học của đồ thị hàm số chẵn, lẻ, tuần hoàn.\n- Nhận biết các hàm số lượng giác thông qua đường tròn lượng giác. Mô tả bảng giá trị của bốn hàm số lượng giác trên một chu kì.',
    hieuSpec: '- Mô tả bảng giá trị của bốn hàm số lượng giác đó trên một chu kì.\n- Mô tả được các đồ thị hàm số.\n- Giải thích tập xác định; tập giá trị; tính chất chẵn, lẻ; tính tuần hoàn; chu kì; khoảng đồng biến, nghịch biến của các hàm số lượng giác dựa vào đồ thị.',
    vdSpec: '- Giải quyết bài toán thực tế có tính chất tuần hoàn (dao động của con lắc, thủy triều, nhiệt độ trung bình trong năm, âm thanh) bằng hàm số lượng giác.',
    assignedQuestions: { part1: 'I.4, I.5, I.6', part2: 'II.1d', part3: '', essay: '' },
    points: 1.0
  },
  {
    id: 'vls-11-4',
    topic: 'HÀM SỐ LƯỢNG GIÁC VÀ PHƯƠNG TRÌNH LƯỢNG GIÁC',
    unit: '1.4. Phương trình lượng giác cơ bản',
    bietSpec: '- Nhận biết công thức nghiệm của phương trình lượng giác cơ bản bằng cách vận dụng đồ thị hàm số lượng giác tương ứng: $\\sin x = m, \\cos x = m, \\tan x = m, \\cot x = m$.\n- Nhận biết khái niệm phương trình tương đương.',
    hieuSpec: '- Giải một số phương trình lượng giác cơ bản và tính nghiệm gần đúng của phương trình lượng giác cơ bản (có sử dụng máy tính cầm tay).\n- Tìm số nghiệm của phương trình lượng giác trên một khoảng, đoạn cho trước.',
    vdSpec: '- Giải phương trình lượng giác ở dạng vận dụng trực tiếp phương trình lượng giác cơ bản.\n- Giải quyết một số vấn đề gắn với phương trình lượng giác (chu kì sóng, góc quay, dao động cơ học).',
    assignedQuestions: { part1: '', part2: '', part3: 'III.2', essay: 'IV.2 (1đ)' },
    points: 1.5
  },
  {
    id: 'vls-11-5',
    topic: 'DÃY SỐ, CẤP SỐ CỘNG VÀ CẤP SỐ NHÂN',
    unit: '2.1. Dãy số',
    bietSpec: '- Nhận biết khái niệm dãy số hữu hạn, dãy số vô hạn.\n- Nhận biết tính chất tăng, giảm, bị chặn của dãy số trong những trường hợp đơn giản.',
    hieuSpec: '- Xác định số hạng thứ $n$ của dãy số cho bởi công thức tổng quát hoặc hệ thức truy hồi đơn giản.',
    vdSpec: '- Vận dụng kiến thức về dãy số để mô tả và giải quyết một số bài toán thực tiễn (mô hình tăng trưởng số lượng tế bào, tính tiền tích lũy).',
    assignedQuestions: { part1: 'I.7, I.8', part2: 'II.2a, II.2b', part3: '', essay: '' },
    points: 1.0
  },
  {
    id: 'vls-11-6',
    topic: 'DÃY SỐ, CẤP SỐ CỘNG VÀ CẤP SỐ NHÂN',
    unit: '2.2. Cấp số cộng',
    bietSpec: '- Nhận biết một dãy số là cấp số cộng, số hạng đầu $u_1$ và công sai $d$.\n- Nhận biết công thức tính số hạng tổng quát $u_n = u_1 + (n-1)d$.',
    hieuSpec: '- Giải thích công thức xác định số hạng tổng quát của cấp số cộng.\n- Tính tổng của $n$ số hạng đầu $S_n = \\frac{n(u_1 + u_n)}{2}$ của cấp số cộng.',
    vdSpec: '- Giải quyết một số vấn đề gắn với cấp số cộng (tiết kiệm tích lũy định kì, xếp hàng ghế khán đài, tính khấu hao tài sản).',
    assignedQuestions: { part1: 'I.9', part2: 'II.2c, II.2d', part3: 'III.3', essay: '' },
    points: 1.25
  },
  {
    id: 'vls-11-7',
    topic: 'DÃY SỐ, CẤP SỐ CỘNG VÀ CẤP SỐ NHÂN',
    unit: '2.3. Cấp số nhân',
    bietSpec: '- Nhận biết một dãy số là cấp số nhân, số hạng đầu $u_1$ và công bội $q$.\n- Nhận biết công thức tính số hạng tổng quát $u_n = u_1 \\cdot q^{n-1}$.',
    hieuSpec: '- Giải thích công thức xác định số hạng tổng quát của cấp số nhân.\n- Tính tổng của $n$ số hạng đầu $S_n = \\frac{u_1(1-q^n)}{1-q}$ ($q \\neq 1$).',
    vdSpec: '- Giải quyết một số vấn đề thực tiễn gắn với cấp số nhân (lãi kép ngân hàng, tăng trưởng dân số, phân rã phóng xạ).',
    assignedQuestions: { part1: 'I.10', part2: '', part3: '', essay: 'IV.3 (1đ)' },
    points: 1.25
  },
  {
    id: 'vls-11-8',
    topic: 'CÁC SỐ ĐẶC TRƯNG CỦA MẪU SỐ LIỆU KHÔNG GHÉP NHÓM',
    unit: '3.1. Mẫu số liệu ghép nhóm',
    bietSpec: '- Đọc và giải thích mẫu số liệu ghép nhóm từ bảng tần số hoặc biểu đồ.',
    hieuSpec: '- Xác định độ dài nhóm, giá trị đại diện của từng nhóm số liệu.',
    vdSpec: '- Thu thập và phân nhóm số liệu thực tế.',
    assignedQuestions: { part1: 'I.11', part2: '', part3: '', essay: '' },
    points: 0.25
  },
  {
    id: 'vls-11-9',
    topic: 'CÁC SỐ ĐẶC TRƯNG CỦA MẪU SỐ LIỆU KHÔNG GHÉP NHÓM',
    unit: '3.2. Các số đặc trưng đo xu thế trung tâm',
    bietSpec: '- Nhận biết được công thức tính các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm: số trung bình, trung vị, tứ phân vị, mốt.',
    hieuSpec: '- Tính các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm từ bảng tần số.',
    vdSpec: '- Tính được các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm: số trung bình cộng (hay số trung bình), trung vị (median), tứ phân vị (quartiles), mốt (mode) và đưa ra nhận xét thực tế.',
    assignedQuestions: { part1: 'I.12', part2: '', part3: 'III.4', essay: 'IV.4 (0,5đ)' },
    points: 1.25
  }
];

// 2. TOÁN 10 - THEO ĐÚNG KHUNG MA TRẬN 19 CỘT MẪU THPT VINH LỘC
export const VINHLOC_MATRIX_10: MatrixRowItem[] = [
  {
    id: 'vl10-1',
    topic: 'Mệnh đề và tập hợp (8t)',
    unit: 'Mệnh đề toán học, mệnh đề phủ định, kéo theo (3t)',
    nlc: { biet: 'I.1, I.2', hieu: '', vd: '' },
    ds: { biet: 'II.1a', hieu: 'II.1b', vd: '' },
    tln: { biet: 'III.1', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 2, vd: 0 },
    tiLe: '15%'
  },
  {
    id: 'vl10-2',
    topic: 'Mệnh đề và tập hợp (8t)',
    unit: 'Tập hợp và các phép toán trên tập hợp (5t)',
    nlc: { biet: 'I.3', hieu: 'I.4', vd: '' },
    ds: { biet: 'II.1c', hieu: 'II.1d', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: 'IV.1 (0,5đ)', vd: '' },
    tong: { biet: 2, hieu: 2, vd: 0 },
    tiLe: '12,5%'
  },
  {
    id: 'vl10-3',
    topic: 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn (6t)',
    unit: 'Bất phương trình bậc nhất hai ẩn và miền nghiệm (3t)',
    nlc: { biet: 'I.5, I.6', hieu: '', vd: '' },
    ds: { biet: 'II.2a', hieu: 'II.2b', vd: '' },
    tln: { biet: '', hieu: 'III.2', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 2, vd: 0 },
    tiLe: '12,5%'
  },
  {
    id: 'vl10-4',
    topic: 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn (6t)',
    unit: 'Hệ bất phương trình bậc nhất hai ẩn và bài toán quy hoạch (3t)',
    nlc: { biet: 'I.7', hieu: 'I.8', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.2 (1đ)' },
    tong: { biet: 1, hieu: 1, vd: 1 },
    tiLe: '15%'
  },
  {
    id: 'vl10-5',
    topic: 'Hệ thức lượng trong tam giác (8t)',
    unit: 'Giá trị lượng giác của một góc từ $0^\\circ$ đến $180^\\circ$ (3t)',
    nlc: { biet: 'I.9, I.10', hieu: '', vd: '' },
    ds: { biet: 'II.2c', hieu: 'II.2d', vd: '' },
    tln: { biet: 'III.3', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 1, vd: 0 },
    tiLe: '15%'
  },
  {
    id: 'vl10-6',
    topic: 'Hệ thức lượng trong tam giác (8t)',
    unit: 'Định lí côsin, định lí sin và công thức diện tích tam giác (5t)',
    nlc: { biet: 'I.11', hieu: 'I.12', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: 'III.4', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.3 (1đ), IV.4 (0,5đ)' },
    tong: { biet: 1, hieu: 2, vd: 2 },
    tiLe: '30%'
  }
];

export const VINHLOC_SPEC_10: SpecUnitItem[] = [
  {
    id: 'vls-10-1',
    topic: 'MỆNH ĐỀ VÀ TẬP HỢP',
    unit: '1.1. Mệnh đề toán học',
    bietSpec: '- Nhận biết khái niệm mệnh đề, mệnh đề phủ định, mệnh đề kéo theo, mệnh đề tương đương.\n- Nhận biết các kí hiệu $\\forall, \\exists$.',
    hieuSpec: '- Xác định tính đúng sai của mệnh đề trong trường hợp đơn giản.',
    vdSpec: '- Vận dụng quy tắc logic để phản biện và chứng minh mệnh đề đơn giản.',
    assignedQuestions: { part1: 'I.1, I.2', part2: 'II.1a, II.1b', part3: 'III.1', essay: '' },
    points: 1.5
  },
  {
    id: 'vls-10-2',
    topic: 'MỆNH ĐỀ VÀ TẬP HỢP',
    unit: '1.2. Tập hợp và các phép toán trên tập hợp',
    bietSpec: '- Nhận biết khái niệm tập hợp, tập hợp con, hai tập hợp bằng nhau.\n- Nhận biết các tập hợp số tự nhiên, nguyên, hữu tỉ, thực và các tập con của $\\mathbb{R}$.',
    hieuSpec: '- Thực hiện các phép toán giao $A \\cap B$, hợp $A \\cup B$, hiệu $A \\setminus B$, phần bù $C_{\\mathbb{R}}A$.',
    vdSpec: '- Sử dụng biểu đồ Ven và các phép toán tập hợp giải bài toán thực tế.',
    assignedQuestions: { part1: 'I.3, I.4', part2: 'II.1c, II.1d', part3: '', essay: 'IV.1 (0,5đ)' },
    points: 1.25
  },
  {
    id: 'vls-10-3',
    topic: 'BẤT PHƯƠNG TRÌNH VÀ HỆ BẤT PHƯƠNG TRÌNH BẬC NHẤT HAI ẨN',
    unit: '2.1. Bất phương trình bậc nhất hai ẩn',
    bietSpec: '- Nhận biết bất phương trình bậc nhất hai ẩn $ax + by \\le c$.\n- Nhận biết nghiệm và miền nghiệm của bất phương trình bậc nhất hai ẩn.',
    hieuSpec: '- Biểu diễn miền nghiệm của bất phương trình bậc nhất hai ẩn trên mặt phẳng tọa độ.',
    vdSpec: '- Vận dụng biểu diễn miền nghiệm để giải bài toán đời sống.',
    assignedQuestions: { part1: 'I.5, I.6', part2: 'II.2a, II.2b', part3: 'III.2', essay: '' },
    points: 1.25
  },
  {
    id: 'vls-10-4',
    topic: 'BẤT PHƯƠNG TRÌNH VÀ HỆ BẤT PHƯƠNG TRÌNH BẬC NHẤT HAI ẨN',
    unit: '2.2. Hệ bất phương trình bậc nhất hai ẩn và bài toán tối ưu',
    bietSpec: '- Nhận biết hệ bất phương trình bậc nhất hai ẩn.\n- Nhận biết nghiệm của hệ bất phương trình.',
    hieuSpec: '- Biểu diễn miền nghiệm của hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng tọa độ (miền đa giác).',
    vdSpec: '- Giải bài toán tối ưu kinh tế thực tế (tìm $F(x, y) = ax + by$ lớn nhất, nhỏ nhất trên miền đa giác).',
    assignedQuestions: { part1: 'I.7, I.8', part2: '', part3: '', essay: 'IV.2 (1đ)' },
    points: 1.5
  },
  {
    id: 'vls-10-5',
    topic: 'HỆ THỨC LƯỢNG TRONG TAM GIÁC',
    unit: '3.1. Giá trị lượng giác của một góc từ $0^\\circ$ đến $180^\\circ$',
    bietSpec: '- Nhận biết giá trị lượng giác của một góc từ $0^\\circ$ đến $180^\\circ$ trên nửa đường tròn đơn vị.\n- Nhận biết mối quan hệ bù nhau: $\\sin(180^\\circ - \\alpha) = \\sin\\alpha$, $\\cos(180^\\circ - \\alpha) = -\\cos\\alpha$.',
    hieuSpec: '- Tính giá trị lượng giác của các góc đặc biệt bằng máy tính cầm tay hoặc biến đổi.',
    vdSpec: '- Vận dụng tính góc và độ dài trong bài toán thực tế.',
    assignedQuestions: { part1: 'I.9, I.10', part2: 'II.2c, II.2d', part3: 'III.3', essay: '' },
    points: 1.5
  },
  {
    id: 'vls-10-6',
    topic: 'HỆ THỨC LƯỢNG TRONG TAM GIÁC',
    unit: '3.2. Định lí côsin, định lí sin và các công thức diện tích tam giác',
    bietSpec: '- Nhận biết định lí côsin $a^2 = b^2 + c^2 - 2bc\\cos A$, định lí sin $\\frac{a}{\\sin A} = 2R$.\n- Nhận biết các công thức tính diện tích tam giác: $S = \\frac{1}{2}ab\\sin C = \\frac{abc}{4R} = pr = \\sqrt{p(p-a)(p-b)(p-c)}$.',
    hieuSpec: '- Giải tam giác: tính cạnh, tính góc, bán kính $R, r$ và diện tích tam giác trong các trường hợp cơ bản.',
    vdSpec: '- Giải bài toán đo đạc khoảng cách, chiều cao thực tế không đo trực tiếp được (ngọn hải đăng, đỉnh núi).',
    assignedQuestions: { part1: 'I.11, I.12', part2: '', part3: 'III.4', essay: 'IV.3 (1đ), IV.4 (0,5đ)' },
    points: 3.0
  }
];

// 3. TOÁN 12 - THEO ĐÚNG KHUNG MA TRẬN 19 CỘT MẪU THPT VINH LỘC
export const VINHLOC_MATRIX_12: MatrixRowItem[] = [
  {
    id: 'vl12-1',
    topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số (14t)',
    unit: 'Tính đơn điệu và cực trị của hàm số (4t)',
    nlc: { biet: 'I.1, I.2, I.3', hieu: '', vd: '' },
    ds: { biet: 'II.1a', hieu: 'II.1b', vd: '' },
    tln: { biet: 'III.1', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 4, hieu: 2, vd: 0 },
    tiLe: '17,5%'
  },
  {
    id: 'vl12-2',
    topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số (14t)',
    unit: 'Giá trị lớn nhất và nhỏ nhất của hàm số (3t)',
    nlc: { biet: 'I.4, I.5', hieu: '', vd: '' },
    ds: { biet: 'II.1c', hieu: 'II.1d', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: 'IV.1 (0,5đ)', vd: '' },
    tong: { biet: 3, hieu: 2, vd: 0 },
    tiLe: '15%'
  },
  {
    id: 'vl12-3',
    topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số (14t)',
    unit: 'Đường tiệm cận của đồ thị hàm số (3t)',
    nlc: { biet: 'I.6, I.7', hieu: '', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: 'III.2', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 2, hieu: 1, vd: 0 },
    tiLe: '10%'
  },
  {
    id: 'vl12-4',
    topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số (14t)',
    unit: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số (4t)',
    nlc: { biet: 'I.8', hieu: 'I.9', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.2 (1đ)' },
    tong: { biet: 1, hieu: 1, vd: 1 },
    tiLe: '15%'
  },
  {
    id: 'vl12-5',
    topic: 'Tọa độ của vectơ trong không gian (8t)',
    unit: 'Vectơ và các phép toán vectơ trong không gian (4t)',
    nlc: { biet: 'I.10, I.11', hieu: '', vd: '' },
    ds: { biet: 'II.2a', hieu: 'II.2b', vd: '' },
    tln: { biet: 'III.3', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: '' },
    tong: { biet: 3, hieu: 1, vd: 0 },
    tiLe: '15%'
  },
  {
    id: 'vl12-6',
    topic: 'Tọa độ của vectơ trong không gian (8t)',
    unit: 'Hệ trục tọa độ, tọa độ của điểm và vectơ (4t)',
    nlc: { biet: 'I.12', hieu: '', vd: '' },
    ds: { biet: 'II.2c', hieu: 'II.2d', vd: '' },
    tln: { biet: '', hieu: '', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.3 (1đ)' },
    tong: { biet: 2, hieu: 1, vd: 1 },
    tiLe: '15%'
  },
  {
    id: 'vl12-7',
    topic: 'Các số đặc trưng đo độ phân tán mẫu số liệu ghép nhóm (6t)',
    unit: 'Khoảng biến thiên, tứ phân vị, phương sai và độ lệch chuẩn (6t)',
    nlc: { biet: '', hieu: '', vd: '' },
    ds: { biet: '', hieu: '', vd: '' },
    tln: { biet: '', hieu: 'III.4', vd: '' },
    tl: { biet: '', hieu: '', vd: 'IV.4 (0,5đ)' },
    tong: { biet: 0, hieu: 1, vd: 1 },
    tiLe: '12,5%'
  }
];

export const VINHLOC_SPEC_12: SpecUnitItem[] = [
  {
    id: 'vls-12-1',
    topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT VÀ VẼ ĐỒ THỊ HÀM SỐ',
    unit: '1.1. Tính đơn điệu và cực trị của hàm số',
    bietSpec: '- Nhận biết tính đồng biến, nghịch biến và điểm cực trị của hàm số từ bảng biến thiên hoặc đồ thị.\n- Nhận biết điều kiện đủ để hàm số có cực trị.',
    hieuSpec: '- Tìm các khoảng đơn điệu và điểm cực trị của các hàm đa thức bậc ba, trùng phương, phân thức bậc nhất/bậc nhất bằng cách xét dấu đạo hàm.',
    vdSpec: '- Vận dụng tính đơn điệu và cực trị để biện luận số nghiệm của phương trình hoặc giải bài toán chứa tham số $m$.',
    assignedQuestions: { part1: 'I.1, I.2, I.3', part2: 'II.1a, II.1b', part3: 'III.1', essay: '' },
    points: 1.75
  },
  {
    id: 'vls-12-2',
    topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT VÀ VẼ ĐỒ THỊ HÀM SỐ',
    unit: '1.2. Giá trị lớn nhất và nhỏ nhất của hàm số',
    bietSpec: '- Nhận biết GTLN, GTNN của hàm số trên một đoạn từ bảng biến thiên hoặc đồ thị cho trước.',
    hieuSpec: '- Tìm GTLN, GTNN của hàm số trên một đoạn $[a; b]$ bằng đạo hàm.',
    vdSpec: '- Giải quyết bài toán tối ưu thực tiễn đời sống (chi phí tối thiểu, doanh thu tối đa, thể tích lớn nhất).',
    assignedQuestions: { part1: 'I.4, I.5', part2: 'II.1c, II.1d', part3: '', essay: 'IV.1 (0,5đ)' },
    points: 1.5
  },
  {
    id: 'vls-12-3',
    topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT VÀ VẼ ĐỒ THỊ HÀM SỐ',
    unit: '1.3. Đường tiệm cận của đồ thị hàm số',
    bietSpec: '- Nhận biết khái niệm đường tiệm cận đứng, tiệm cận ngang, tiệm cận xiên của đồ thị hàm số.',
    hieuSpec: '- Tìm các đường tiệm cận đứng, ngang, xiên của đồ thị hàm số phân thức hữu tỉ bằng định nghĩa giới hạn.',
    vdSpec: '- Vận dụng tiệm cận để tìm tham số $m$ hoặc vẽ đồ thị hàm số.',
    assignedQuestions: { part1: 'I.6, I.7', part2: '', part3: 'III.2', essay: '' },
    points: 1.0
  },
  {
    id: 'vls-12-4',
    topic: 'ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT VÀ VẼ ĐỒ THỊ HÀM SỐ',
    unit: '1.4. Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    bietSpec: '- Nhận dạng đồ thị hàm số bậc ba, phân thức bậc nhất/bậc nhất, phân thức bậc hai/bậc nhất.',
    hieuSpec: '- Xác định dấu các hệ số $a, b, c, d$, giao điểm với các trục tọa độ, tâm đối xứng của đồ thị.',
    vdSpec: '- Dùng đồ thị hàm số giải bài toán tương giao thực tế và bài toán chứa tham số $m$.',
    assignedQuestions: { part1: 'I.8, I.9', part2: '', part3: '', essay: 'IV.2 (1đ)' },
    points: 1.5
  },
  {
    id: 'vls-12-5',
    topic: 'TỌA ĐỘ CỦA VECTƠ TRONG KHÔNG GIAN',
    unit: '2.1. Vectơ và các phép toán trong không gian',
    bietSpec: '- Nhận biết vectơ, các phép toán cộng, trừ vectơ, nhân vectơ với một số trong không gian.',
    hieuSpec: '- Tính tích vô hướng của hai vectơ, góc giữa hai vectơ trong không gian.',
    vdSpec: '- Vận dụng vectơ giải quyết bài toán hình học không gian và lực trong vật lí.',
    assignedQuestions: { part1: 'I.10, I.11', part2: 'II.2a, II.2b', part3: 'III.3', essay: '' },
    points: 1.5
  },
  {
    id: 'vls-12-6',
    topic: 'TỌA ĐỘ CỦA VECTƠ TRONG KHÔNG GIAN',
    unit: '2.2. Hệ trục tọa độ và tọa độ của điểm, vectơ',
    bietSpec: '- Nhận biết hệ tọa độ $Oxyz$, tọa độ của một điểm và tọa độ của một vectơ.',
    hieuSpec: '- Tính độ dài vectơ, khoảng cách giữa hai điểm, tọa độ trung điểm, trọng tâm tam giác.',
    vdSpec: '- Thiết lập hệ trục tọa độ $Oxyz$ để giải bài toán định vị không gian 3 chiều thực tế.',
    assignedQuestions: { part1: 'I.12', part2: 'II.2c, II.2d', part3: '', essay: 'IV.3 (1đ)' },
    points: 1.5
  },
  {
    id: 'vls-12-7',
    topic: 'CÁC SỐ ĐẶC TRƯNG ĐO ĐỘ PHÂN TÁN CỦA MẪU SỐ LIỆU GHÉP NHÓM',
    unit: '3.1. Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn',
    bietSpec: '- Nhận biết công thức tính khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.',
    hieuSpec: '- Tính toán các số đặc trưng đo độ phân tán từ bảng tần số ghép nhóm.',
    vdSpec: '- Đánh giá mức độ đồng đều và rủi ro của dữ liệu trong các bài toán thực tiễn.',
    assignedQuestions: { part1: '', part2: '', part3: 'III.4', essay: 'IV.4 (0,5đ)' },
    points: 1.25
  }
];

// Khả năng tương thích ngược
export const SAMPLE_COMPETENCY_MATRIX_11: MatrixRowItem[] = VINHLOC_MATRIX_11;
export const SAMPLE_SPEC_LIST_11: SpecUnitItem[] = VINHLOC_SPEC_11;

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

// 1. MÔN TOÁN 11 - GIỮA KÌ I (MẪU CHUẨN THPT EDUPLAN AI 2026-2027)
export const TEMPLATE_TOAN_11_GK1: ExamMatrixTemplate = {
  id: 'matrix_toan_11_gk1',
  subjectId: 'toan',
  subjectName: 'Toán học',
  grade: '11',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Toán - Khối 11 (Chuẩn GDPT 2018 - THPT EDUPLAN AI)',
  badge: 'Khung ma trận 19 cột THPT EDUPLAN AI 2026-2027',
  description: 'Mẫu ma trận 19 cột và bản đặc tả chi tiết 28 lệnh hỏi (Nhiều lựa chọn 12 câu, Đúng-Sai 2 câu 8 ý, Trả lời ngắn 4 câu, Tự luận 4 câu; Tỉ lệ 40% - 30% - 30%).',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Biết',
    c2: 'Hiểu',
    c3: 'Vận dụng'
  },
  qCounts: { mc: 12, tf: 2, sa: 4, essay: 4 },
  matrixRows: VINHLOC_MATRIX_11,
  specUnits: VINHLOC_SPEC_11,
  topicsList: [
    'Hàm số lượng giác và phương trình lượng giác',
    'Dãy số. Cấp số cộng và cấp số nhân',
    'Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm',
    'Quan hệ song song trong không gian'
  ]
};

// 2. MÔN TOÁN 10 - GIỮA KÌ I (MẪU KHUNG 19 CỘT THPT EDUPLAN AI)
export const TEMPLATE_TOAN_10_GK1: ExamMatrixTemplate = {
  id: 'matrix_toan_10_gk1',
  subjectId: 'toan',
  subjectName: 'Toán học',
  grade: '10',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Toán - Khối 10 (Chuẩn GDPT 2018 - THPT EDUPLAN AI)',
  badge: 'Khung ma trận 19 cột THPT EDUPLAN AI 2026-2027',
  description: 'Mẫu ma trận 19 cột và bản đặc tả chuẩn GDPT 2018 theo định dạng THPT EDUPLAN AI (Mệnh đề - Tập hợp, Bất phương trình bậc nhất hai ẩn, Hệ thức lượng trong tam giác; Tỉ lệ 40% - 30% - 30%).',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Biết',
    c2: 'Hiểu',
    c3: 'Vận dụng'
  },
  qCounts: { mc: 12, tf: 2, sa: 4, essay: 4 },
  matrixRows: VINHLOC_MATRIX_10,
  specUnits: VINHLOC_SPEC_10,
  topicsList: [
    'Mệnh đề và tập hợp',
    'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
    'Hệ thức lượng trong tam giác'
  ]
};

// 3. MÔN TOÁN 12 - GIỮA KÌ I (MẪU KHUNG 19 CỘT THPT EDUPLAN AI)
export const TEMPLATE_TOAN_12_GK1: ExamMatrixTemplate = {
  id: 'matrix_toan_12_gk1',
  subjectId: 'toan',
  subjectName: 'Toán học',
  grade: '12',
  semester: 'Giữa kì I',
  title: 'Đề kiểm tra Giữa học kì I Môn Toán - Khối 12 (Chuẩn GDPT 2018 - THPT EDUPLAN AI)',
  badge: 'Khung ma trận 19 cột THPT EDUPLAN AI 2026-2027',
  description: 'Mẫu ma trận 19 cột và bản đặc tả chuẩn GDPT 2018 theo định dạng THPT EDUPLAN AI (Ứng dụng đạo hàm khảo sát hàm số, Vectơ và Hệ trục tọa độ Oxyz; Tỉ lệ 40% - 30% - 30%).',
  durationMinutes: 90,
  totalPoints: 10,
  competencyHeaders: {
    c1: 'Biết',
    c2: 'Hiểu',
    c3: 'Vận dụng'
  },
  qCounts: { mc: 12, tf: 2, sa: 4, essay: 4 },
  matrixRows: VINHLOC_MATRIX_12,
  specUnits: VINHLOC_SPEC_12,
  topicsList: [
    'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
    'Tọa độ của vectơ trong không gian'
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
