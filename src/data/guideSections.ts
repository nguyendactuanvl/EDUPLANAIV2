export interface GuideStep {
  title: string;
  detail: string;
}

export interface GuideSection {
  id: string;
  title: string;
  category: 'Cấu hình' | 'Chuyên môn Toán' | 'Kiểm tra & Thi' | 'Công tác GV';
  badge: string;
  iconName: string;
  shortDesc: string;
  description: string;
  steps: GuideStep[];
  tips?: string[];
  /**
   * Đường dẫn video YouTube hướng dẫn.
   * Để trống "" nếu chưa có video (hệ thống sẽ hiện nhãn "Video sắp ra mắt").
   * DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY (hỗ trợ dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)
   */
  youtubeUrl: string;
}

/**
 * ==================================================================================
 * DANH SÁCH CÁC BÀI HƯỚNG DẪN SỬ DỤNG VÀ LINK VIDEO YOUTUBE CỦA APP EDUPLAN AI
 * Thầy/Cô chỉ cần dán link YouTube tương ứng vào trường `youtubeUrl` của từng mục.
 * ==================================================================================
 */
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "api_key_setup",
    title: "Mục 1: Cấu hình ban đầu & Nhập API Key cá nhân",
    category: "Cấu hình",
    badge: "Bắt buộc ban đầu",
    iconName: "Key",
    shortDesc: "Hướng dẫn lấy mã Google Gemini API Key miễn phí và kích hoạt EduPlan AI",
    description: "Để sử dụng toàn bộ tính năng AI nâng cao (soạn giáo án, tạo bảng biến thiên, giải toán, quét đề PDF...), thầy cô cần cấu hình mã khóa cá nhân Google Gemini API Key một lần duy nhất.",
    steps: [
      {
        title: "Bước 1: Mở giao diện cài đặt",
        detail: "Nhấp vào dòng chữ 'Nhập mã API key của bạn ở đây' ở góc dưới cùng bên trái Sidebar."
      },
      {
        title: "Bước 2: Lấy API Key miễn phí",
        detail: "Truy cập Google AI Studio (aistudio.google.com), đăng nhập bằng tài khoản Gmail cá nhân và chọn 'Get API key' -> 'Create API key'."
      },
      {
        title: "Bước 3: Dán và lưu trữ an toàn",
        detail: "Dán mã API Key vào ô nhập trong EduPlan AI và nhấn 'Lưu khóa'. Mã được lưu trữ bảo mật trực tiếp trên trình duyệt của thầy cô."
      }
    ],
    tips: [
      "API Key của Google là hoàn toàn miễn phí với dung lượng lớn dành cho giáo viên.",
      "Thầy cô có thể đổi hoặc kiểm tra trạng thái API Key bất kỳ lúc nào."
    ],
    youtubeUrl: "https://youtu.be/r9fZgy-Eyys?si=SAuC5tn3WUbXPqM1" 
  },
  {
    id: "math_ocr",
    title: "Mục 2: Math OCR & Quét công thức LaTeX sang Word",
    category: "Chuyên môn Toán",
    badge: "Nhận diện AI 1-Click",
    iconName: "ScanLine",
    shortDesc: "Quét ảnh câu hỏi/đề toán thành công thức LaTeX và xuất sang Word OMML",
    description: "Nhận diện AI công thức toán học từ ảnh chụp sách vở, màn hình hoặc file PDF scan, tự động chuyển thành định dạng LaTeX và công thức Word (Alt + =).",
    steps: [
      {
        title: "Bước 1: Tải ảnh hoặc Dán ảnh (Ctrl + V)",
        detail: "Tải file ảnh đề toán, kéo thả hoặc bấm Ctrl + V trực tiếp từ bộ nhớ tạm clipboard."
      },
      {
        title: "Bước 2: Cắt vùng công thức cần nhận diện",
        detail: "Sử dụng công cụ cắt ảnh (Crop) để chọn chính xác câu hỏi hoặc công thức cần chuyển đổi."
      },
      {
        title: "Bước 3: Xem kết quả & Sao chép sang Word",
        detail: "AI tự động trích xuất công thức LaTeX chuẩn. Nhấn 'Sao chép mã LaTeX' hoặc 'Chép công thức Word' để dán thẳng vào giáo án."
      }
    ],
    tips: [
      "Tính năng dán ảnh trực tiếp Ctrl + V giúp thao tác nhanh gấp 3 lần khi soạn giáo án.",
      "Công thức xuất ra ở dạng OMML MathType tương thích chuẩn Word 2016 trở lên."
    ],
    youtubeUrl: ""
  },
  {
    id: "ink",
    title: "Mục 3: EduPlan AI Ink - Bảng vẽ tương tác 3D & Xoay khối 3D",
    category: "Chuyên môn Toán",
    badge: "Tương tác 3D cảm ứng",
    iconName: "PenTool",
    shortDesc: "Bảng giảng dạy trực tiếp, vẽ hình học phẳng/không gian 3D, xoay khối 3D và thước ảo",
    description: "Bảng đen/xanh điện tử chuyên dụng cho lớp học thông minh: Hỗ trợ viết vẽ mượt mà với bút Stylus, tự động nắn chỉnh hình phẳng (Line, Rect, Circle) và Thư viện mô hình 3D tương tác (Chóp tứ giác, Chóp cụt, Lăng trụ, Nón, Trụ, Cầu) xoay 360° trực quan.",
    steps: [
      {
        title: "Bước 1: Chọn màu bút, loại bảng & thước kẻ ảo",
        detail: "Chọn màu phấn/mực, độ dày nét vẽ, bật thước kẻ đo khoảng cách hoặc đổi nền bảng Xanh/Đen/Trắng/Ô ly."
      },
      {
        title: "Bước 2: Mở Thư viện khối 3D & Chèn mô hình",
        detail: "Bấm biểu tượng 'Khối 3D' trên thanh công cụ -> Chọn mô hình 3D (ví dụ: Hình chóp cụt ABCD.A'B'C'D', Hình lập phương) và nhấn Chèn vào bảng."
      },
      {
        title: "Bước 3: Xoay khối 3D 360° trực tiếp",
        detail: "Dùng ngón tay/bút vuốt trực tiếp trên khối 3D để xoay mọi góc nhìn, bật/ẩn tên đỉnh (A, B, C...) hoặc điều chỉnh độ phóng to."
      }
    ],
    tips: [
      "Tính năng Palm Rejection (Từ chối lòng bàn tay) giúp đặt tay lên màn hình vẽ tự nhiên như bảng thật.",
      "Có thể xuất toàn bộ trang bảng ra ảnh PNG hoặc file tài liệu PDF bài giảng cho học sinh."
    ],
    youtubeUrl: ""
  },
  {
    id: "kshs_graphing",
    title: "Mục 4: Bộ công cụ KSHS & Vẽ đồ thị hàm số (Bậc 3, Phân thức, Parabol...)",
    category: "Chuyên môn Toán",
    badge: "Toán 10, 11, 12",
    iconName: "TrendingUp",
    shortDesc: "Khảo sát sự biến thiên và vẽ đồ thị các dạng hàm số chuẩn SGK GDPT 2018",
    description: "Bộ công cụ tự động khảo sát chi tiết các hàm số: Bậc ba, Phân thức bậc nhất/bậc nhất, Phân thức bậc hai/bậc nhất (Toán 12 mới), Trùng phương và Parabol bậc hai.",
    steps: [
      {
        title: "Bước 1: Chọn dạng hàm số",
        detail: "Vào mục 'Công cụ Toán học' -> Chọn tab hàm số cần khảo sát (Hàm bậc ba, Phân thức 1/1, Phân thức 2/1, Parabol...)."
      },
      {
        title: "Bước 2: Nhập hệ số a, b, c, d hoặc chọn đề bài mẫu",
        detail: "Thay đổi các hệ số trực tiếp hoặc nhấp vào các nút đề bài mẫu chuẩn SGK có sẵn để xem ngay kết quả."
      },
      {
        title: "Bước 3: Tương tác trên đồ thị tọa độ",
        detail: "Hệ thống tự động vẽ đồ thị tương tác, hiển thị tâm đối xứng (điểm uốn), các điểm cực đại/cực tiểu và đường tiệm cận với tỷ lệ tọa độ chuẩn."
      }
    ],
    tips: [
      "Có thể thu phóng (Zoom), kéo thả hệ trục tọa độ để quan sát đồ thị rõ ràng.",
      "Toàn bộ tọa độ điểm uốn và cực trị được tính toán chính xác tuyệt đối."
    ],
    youtubeUrl: "https://youtu.be/r9fZgy-Eyys?si=SAuC5tn3WUbXPqM1"
  },
  {
    id: "bbt_ai_export",
    title: "Mục 5: Bảng biến thiên AI & Xuất ảnh đồ thị PNG / Chép lời giải vào Word",
    category: "Chuyên môn Toán",
    badge: "Chuẩn SGK & Word",
    iconName: "BarChart3",
    shortDesc: "Tạo Bảng biến thiên đồ họa SVG sắc nét, tải ảnh 300 DPI và chép công thức sang Word",
    description: "Giúp giáo viên xuất ngay Bảng biến thiên vector SVG chuẩn SGK, tải ảnh đồ thị độ phân giải cao hoặc nhấn 'Chép lời giải' để dán thẳng vào giáo án Word mà không lo lỗi font.",
    steps: [
      {
        title: "Bước 1: Xem Bảng biến thiên & Sơ đồ KSHS",
        detail: "Bảng biến thiên được vẽ đồ họa với mũi tên chiều biến thiên uốn lượn và dấu đạo hàm chính xác theo chương trình GDPT 2018."
      },
      {
        title: "Bước 2: Xuất ảnh đồ thị PNG độ nét cao",
        detail: "Nhấn nút 'Tải PNG' hoặc 'Sao chép ảnh' ở góc trên bên phải đồ thị để dán trực tiếp vào PowerPoint / Word."
      },
      {
        title: "Bước 3: Chép toàn bộ lời giải KSHS",
        detail: "Nhấn nút 'Chép lời giải' để sao chép toàn bộ các bước (TXD, Đạo hàm, Cực trị, Giới hạn, Điểm đặc biệt) sang dạng văn bản chuẩn MathType/OMML."
      }
    ],
    tips: [
      "Bảng biến thiên xuất ra là định dạng vector SVG chuẩn mực, in ấn sắc nét không vỡ hạt.",
      "Hỗ trợ xuất Word OMML (Alt + =) tương thích Word 2016 trở lên."
    ],
    youtubeUrl: ""
  },
  {
    id: "geogebra_casio",
    title: "Mục 6: Công cụ Vẽ hình GeoGebra (Flat & 3D) và Giả lập Casio fx-580VN X",
    category: "Chuyên môn Toán",
    badge: "Trực quan & Máy tính",
    iconName: "Calculator",
    shortDesc: "Tích hợp bảng vẽ hình học phẳng/không gian GeoGebra và máy tính khoa học Casio",
    description: "Bộ đôi trợ giảng đắc lực trong tiết học trực tiếp: Vẽ hình học phẳng, hình không gian 3D trực quan và máy tính giả lập thao tác bấm phím máy tính Casio fx-580VN X cho học sinh.",
    steps: [
      {
        title: "Bước 1: Mở GeoGebra / Casio",
        detail: "Trên thanh công cụ phụ, nhấp nút 'Vẽ hình GeoGebra (Flat & 3D)' hoặc nút 'Máy tính Casio fx-580VN X'."
      },
      {
        title: "Bước 2: Thao tác vẽ hình & đo đạc",
        detail: "Dùng các công cụ điểm, đoạn thẳng, đường tròn, mặt phẳng và khối đa diện không gian trong cửa sổ GeoGebra chuyên dụng."
      },
      {
        title: "Bước 3: Hướng dẫn bấm máy tính",
        detail: "Mở máy tính Casio nổi để chiếu lên màn hình máy chiếu, hướng dẫn học sinh bấm máy tính tìm nghiệm, ma trận, vector, thống kê..."
      }
    ],
    tips: [
      "Cửa sổ máy tính và GeoGebra có thể di chuyển, phóng to, thu nhỏ linh hoạt trên màn hình.",
      "Hình vẽ GeoGebra có thể xuất ảnh dán ngay vào câu hỏi đề thi."
    ],
    youtubeUrl: ""
  },
  {
    id: "statistics_grouped",
    title: "Mục 7: Xử lý Thống kê mẫu số liệu ghép nhóm (Toán 10, 11, 12)",
    category: "Chuyên môn Toán",
    badge: "Toán thống kê mới",
    iconName: "BarChart2",
    shortDesc: "Tính tự động Trung bình, Trung vị, Tứ phân vị, Mốt, Phương sai, Độ lệch chuẩn mẫu ghép nhóm",
    description: "Tính toán tự động và đầy đủ tất cả các số đặc trưng đo xu thế trung tâm và độ phân tán của mẫu số liệu ghép nhóm theo đúng quy định SGK Toán THPT mới.",
    steps: [
      {
        title: "Bước 1: Chọn tab '4. Công cụ Thống kê'",
        detail: "Chuyển sang công cụ Thống kê lớp 10, 11 hoặc 12 tương ứng."
      },
      {
        title: "Bước 2: Nhập bảng nhóm [a; b) và tần số n_i",
        detail: "Nhập các khoảng ghép nhóm và số lượng tương ứng, hoặc dùng bảng số liệu ví dụ có sẵn."
      },
      {
        title: "Bước 3: Nhận ngay bảng phân tích chi tiết",
        detail: "Hệ thống hiển thị giá trị đại diện $c_i$, tần số tích lũy $cf_i$, công thức chi tiết từng bước tìm Trung vị $M_e$, Tứ phân vị $Q_1, Q_2, Q_3$, Mốt $M_o$ và Độ lệch chuẩn $s$."
      }
    ],
    tips: [
      "Hỗ trợ vẽ biểu đồ cột tần số và tần số tích lũy trực quan.",
      "Có nút 'Xuất báo cáo Word' để in ấn hoặc đưa vào đề bài kiểm tra."
    ],
    youtubeUrl: ""
  },
  {
    id: "pdf_exam_converter",
    title: "Mục 8: Đề thi Online từ PDF của GV",
    category: "Kiểm tra & Thi",
    badge: "Phòng thi Online & QR",
    iconName: "FileCheck",
    shortDesc: "Tạo phòng thi online tức thì từ file PDF đề của giáo viên và trích xuất sang Word",
    description: "Biến bất kỳ file đề thi PDF có sẵn của thầy cô thành phòng thi trực tuyến cho học sinh làm bài trên điện thoại/máy tính có chấm điểm, hoặc chuyển đổi PDF scan sang file Word giữ nguyên công thức.",
    steps: [
      {
        title: "Bước 1: Tải file đề PDF lên",
        detail: "Vào mục 'Đề online từ file PDF của GV' -> Chọn tải lên file đề thi PDF từ máy tính."
      },
      {
        title: "Bước 2: AI tự động phân tích và tạo mã phòng",
        detail: "Hệ thống tự động cắt khung câu hỏi, nhận diện đáp án và tạo đường link phòng thi / mã PIN cho học sinh."
      },
      {
        title: "Bước 3: Xuất đề Word hoặc chia sẻ",
        detail: "Chia sẻ mã đề cho học sinh quét mã QR làm bài, hoặc xuất file Word đã trích xuất sạch đẹp."
      }
    ],
    tips: [
      "Học sinh không cần cài đặt app, mở link trực tiếp trên mọi trình duyệt điện thoại.",
      "Giáo viên có thể xuất bảng điểm thống kê lớp học ra file Excel sau khi nộp bài."
    ],
    youtubeUrl: ""
  },
  {
    id: "khgd",
    title: "Mục 9: Kế hoạch giáo dục (KHGD / Phân phối chương trình)",
    category: "Cấu hình",
    badge: "Phân phối chuẩn",
    iconName: "Calendar",
    shortDesc: "Tạo KHGD môn học, phân bổ số tiết các bài học chuẩn Khung chương trình BGDĐT",
    description: "Hỗ trợ Giáo viên lập Kế hoạch Giáo dục môn học theo từng khối lớp (10, 11, 12), tự động tính số tiết lý thuyết, luyện tập, kiểm tra định kỳ.",
    steps: [
      {
        title: "Bước 1: Chọn Khối lớp & Bộ sách SGK",
        detail: "Chọn Khối lớp (10, 11, 12) và bộ sách SGK đang dạy (Kết nối tri thức, Cánh diều, Chân trời sáng tạo...)."
      },
      {
        title: "Bước 2: Tùy chỉnh số tiết & khung thời gian",
        detail: "Điều chỉnh số tiết từng bài học, số tuần dạy học và chèn tiết kiểm tra giữa kỳ, cuối kỳ."
      },
      {
        title: "Bước 3: Xuất file Word KHGD",
        detail: "Nhấn 'Xuất file Word KHGD' để tải bản KHGD trình BGH duyệt."
      }
    ],
    tips: [
      "Số tiết được gợi ý chuẩn khung phân phối chương trình của Bộ GDĐT.",
      "Có thể chỉnh sửa tên bài học và ghi chú thiết bị dạy học trực tiếp."
    ],
    youtubeUrl: ""
  },
  {
    id: "khdh",
    title: "Mục 10: Kế hoạch dạy học (Soạn Giáo án 5512 AI)",
    category: "Cấu hình",
    badge: "Công văn 5512",
    iconName: "BookOpen",
    shortDesc: "Tự động soạn Kế hoạch dạy học / Bài giảng theo mẫu Công văn 5512 bằng AI",
    description: "Soạn thảo bài giảng chi tiết gồm đầy đủ 4 hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng) theo Công văn 5512 của Bộ GDĐT.",
    steps: [
      {
        title: "Bước 1: Chọn Tên bài học & Thiết lập yêu cầu cần đạt",
        detail: "Chọn bài học trong danh mục SGK GDPT 2018 hoặc tự nhập tên bài học chuyên đề."
      },
      {
        title: "Bước 2: Nhấn 'Soạn Giáo án AI'",
        detail: "Trợ lý Gemini AI tự động thiết kế chuỗi hoạt động dạy học, câu hỏi thảo luận, phương án đánh giá và phiếu bài tập."
      },
      {
        title: "Bước 3: Chỉnh sửa & Xuất Word .docx",
        detail: "Chỉnh sửa trực tiếp nội dung trên màn hình và bấm 'Xuất file Word' chuẩn định dạng giáo án 5512."
      }
    ],
    tips: [
      "Hệ thống tự động chèn công thức toán LaTeX / OMML không bị lỗi font.",
      "Có thể tùy chọn độ chi tiết bài giảng cho lớp mồi / lớp chuyên."
    ],
    youtubeUrl: ""
  },
  {
    id: "worksheet_generator",
    title: "Mục 11: Tạo Phiếu học tập thông minh GDPT 2018",
    category: "Chuyên môn Toán",
    badge: "Chuẩn GDPT 2018 & Xuất Word",
    iconName: "BookOpen",
    shortDesc: "Tạo phiếu bài tập, tóm tắt lý thuyết, trắc nghiệm 4 lựa chọn, đúng/sai, tự luận và xuất file Word .docx",
    description: "Bộ công cụ tự động hóa toàn diện quy trình thiết kế Phiếu học tập cho giáo viên: Tự động phân chia 4 phần bài tập theo chuẩn cấu trúc đề thi GDPT 2018 (Trắc nghiệm nhiều lựa chọn, Trắc nghiệm Đúng/Sai, Trả lời ngắn và Tự luận), tích hợp vẽ Bảng biến thiên SVG, Đồ thị hàm số, Hình không gian 3D và xuất file Word .docx chuẩn Equation OMML / Bản in A4 sắc nét.",
    steps: [
      {
        title: "Bước 1: Chọn Khối lớp, Môn học và Bài học",
        detail: "Chọn Khối 10, 11 hoặc 12, chọn chương và bài học theo chương trình SGK mới (Kết nối tri thức) hoặc tự nhập tên chủ đề mong muốn."
      },
      {
        title: "Bước 2: Cấu hình số lượng câu hỏi và phong cách trình bày",
        detail: "Tùy chỉnh số câu hỏi cho từng phần (Phần I Trắc nghiệm, Phần II Đúng/Sai, Phần III Điền số, Phần IV Tự luận), tỷ lệ câu hỏi thực tế và chọn phong cách hiển thị (A4 Chuẩn in ấn hoặc Phiếu 2 cột màu sắc sinh động)."
      },
      {
        title: "Bước 3: Nhấn 'Tạo bản Word/In' và tùy chỉnh câu hỏi",
        detail: "Hệ thống AI tự động sinh trọn vẹn phiếu học tập. Thầy cô có thể chuyển sang tab 'Chi tiết từng câu' để dùng công cụ '+ BBT', '+ Đồ thị', '+ Hình 3D' chèn trực tiếp hình ảnh vào đề bài."
      },
      {
        title: "Bước 4: Xuất file Word (.docx) hoặc In ấn",
        detail: "Nhấn nút 'Xuất Word' để tải file Word chuẩn công thức toán học MathType / Equation, hoặc 'Bản in phiếu học tập (A4)' để in trực tiếp cho học sinh làm bài."
      }
    ],
    tips: [
      "Có thể bật/tắt tùy chọn 'Kèm theo lời giải chi tiết' khi in hoặc xuất Word cho Giáo viên hoặc Học sinh.",
      "Tính năng '⚡ Sửa lỗi Toán 1-Click' tự động chuẩn hóa mọi công thức LaTeX và tách chữ tiếng Việt ra khỏi dấu $.",
      "Thông tin tiêu đề trường, tổ chuyên môn, họ tên giáo viên và năm học được tùy chỉnh dễ dàng qua nút ✏️ Chỉnh sửa."
    ],
    youtubeUrl: ""
  },
  {
    id: "exercise_solver",
    title: "Mục 12: Giải bài tập Toán học & Sửa lỗi công thức",
    category: "Chuyên môn Toán",
    badge: "Lời giải AI chi tiết",
    iconName: "Sparkles",
    shortDesc: "Giải chi tiết mọi câu hỏi toán học, trình bày từng bước và chuẩn hóa LaTeX",
    description: "Nhập đề bài toán dạng văn bản hoặc ảnh chụp, trợ lý AI sẽ phân tích lời giải từng bước khoa học, vẽ sơ đồ hình minh họa và tự động sửa các lỗi khoảng trắng/dấu LaTeX.",
    steps: [
      {
        title: "Bước 1: Nhập đề bài hoặc Dán đề toán",
        detail: "Gõ câu hỏi toán học vào ô nhập hoặc dán ảnh đề bài từ bộ nhớ tạm."
      },
      {
        title: "Bước 2: Bấm 'Giải chi tiết bằng AI'",
        detail: "Hệ thống phân tích bài toán, viết lời giải step-by-step kèm nhận xét phương pháp giải."
      },
      {
        title: "Bước 3: Sao chép lời giải sang Word",
        detail: "Nhấn 'Copy Lời giải' để dán vào file Word giáo án hoặc đáp án kiểm tra."
      }
    ],
    tips: [
      "Sử dụng công cụ '⚡ Sửa lỗi Toán 1-Click' để tự động fix lỗi khoảng trắng trong công thức LaTeX.",
      "Lời giải được định dạng theo cấu trúc tự luận hoặc trắc nghiệm giải nhanh."
    ],
    youtubeUrl: ""
  },
  {
    id: "pdf2word",
    title: "Mục 13: Chuyển file PDF sang Word giữ nguyên công thức",
    category: "Kiểm tra & Thi",
    badge: "Giữ nguyên LaTeX/OMML",
    iconName: "FileEdit",
    shortDesc: "Biến file đề PDF scan/văn bản thành file Word có thể chỉnh sửa công thức toán",
    description: "Chuyển đổi tài liệu PDF đề thi sang file Word docx, trích xuất chính ảnh hình vẽ và giữ nguyên định dạng công thức toán học không vỡ font.",
    steps: [
      {
        title: "Bước 1: Chọn file PDF từ máy tính",
        detail: "Tải file PDF đề thi hoặc tài liệu bài giảng vào ô chuyển đổi."
      },
      {
        title: "Bước 2: AI tự động phân tích trang & nhận diện",
        detail: "Hệ thống bóc tách các trang, nhận diện cấu trúc văn bản, hình vẽ và công thức toán."
      },
      {
        title: "Bước 3: Tải file Word (.docx)",
        detail: "Nhấn 'Tải file Word' để nhận bản Word hoàn chỉnh sẵn sàng chỉnh sửa."
      }
    ],
    tips: [
      "Tối ưu nhất đối với file PDF xuất từ Word hoặc file PDF scan sắc nét.",
      "Các hình vẽ trong PDF được bóc tách dưới dạng ảnh sắc nét."
    ],
    youtubeUrl: ""
  },
  {
    id: "exam_generator",
    title: "Mục 14: Tạo & Trộn đề thi GDPT 2018 (4 Phần chuẩn)",
    category: "Kiểm tra & Thi",
    badge: "Trộn đề & Đáp án Ma trận",
    iconName: "FileCheck",
    shortDesc: "Tạo đề kiểm tra, trộn mã đề tự động theo ma trận ma đề GDPT 2018",
    description: "Soạn đề thi và trộn mã đề thông minh theo cấu trúc 4 phần mới: Trắc nghiệm 4 phương án, Trắc nghiệm Đúng/Sai, Trả lời ngắn và Tự luận. Tự động xuất ma trận đáp án và file Word.",
    steps: [
      {
        title: "Bước 1: Chọn Ma trận & Mức độ nhận thức",
        detail: "Thiết lập số lượng câu Nhận biết, Thông hiểu, Vận dụng cho từng chương kiến thức."
      },
      {
        title: "Bước 2: Tạo câu hỏi AI hoặc Nhập ngân hàng câu hỏi",
        detail: "AI tự động sinh đề thi chuẩn hoặc giáo viên tải file Word đề gốc lên."
      },
      {
        title: "Bước 3: Trộn mã đề & Xuất Word",
        detail: "Nhấn 'Trộn đề' để sinh các mã đề (101, 102, 103...) kèm bảng đáp án soi chiếu chuẩn."
      }
    ],
    tips: [
      "Hỗ trợ xuất bảng đáp án tô phiếu trắc nghiệm tự động.",
      "Toàn bộ câu hỏi được phân loại Ma trận chuẩn Công văn chỉ đạo của Bộ."
    ],
    youtubeUrl: ""
  },
  {
    id: "ai_studio",
    title: "Mục 15: AI Studio Suite & Sáng tạo nội dung",
    category: "Cấu hình",
    badge: "Sáng tạo AI đa năng",
    iconName: "Sparkles",
    shortDesc: "Trợ lý AI sáng tạo đề xuất hoạt động học tập, câu hỏi thực tế và bài viết chuyên môn",
    description: "Bộ công cụ sáng tạo mở rộng: Gợi ý bài toán ứng dụng thực tế, tạo câu hỏi vận dụng cao, viết lời dẫn bài giảng lôi cuốn và tạo ảnh minh họa AI.",
    steps: [
      {
        title: "Bước 1: Chọn loại nhiệm vụ sáng tạo",
        detail: "Chọn chủ đề sáng tạo (Sáng tác bài toán thực tế, Tạo tình huống STEM, Viết bài viết...)."
      },
      {
        title: "Bước 2: Nhập từ khóa hoặc yêu cầu",
        detail: "Nhập nội dung ngắn về chủ đề dạy học."
      },
      {
        title: "Bước 3: Nhận kết quả & Tùy biến",
        detail: "Sao chép ý tưởng độc đáo do AI gợi ý để đưa vào bài giảng."
      }
    ],
    tips: [
      "Các bài toán thực tế liên môn giúp tiết học sinh động và gần gũi hơn.",
      "Có thể yêu cầu AI viết theo phong cách hóm hỉnh hoặc chuyên sâu."
    ],
    youtubeUrl: ""
  },
  {
    id: "homeroom",
    title: "Mục 16: Sổ chủ nhiệm & Quản lý học sinh",
    category: "Công tác GV",
    badge: "Sổ tay Chủ nhiệm",
    iconName: "ShieldCheck",
    shortDesc: "Quản lý danh sách lớp, sơ yếu lý lịch học sinh, nhận xét và theo dõi nề nếp",
    description: "Công cụ số hóa cho Giáo viên Chủ nhiệm: Lưu trữ thông tin phụ huynh, theo dõi học lực, rèn luyện, ghi chú nề nếp và xuất sổ chủ nhiệm.",
    steps: [
      {
        title: "Bước 1: Nhập danh sách học sinh",
        detail: "Nhập từ file Excel danh sách lớp hoặc thêm mới từng học sinh."
      },
      {
        title: "Bước 2: Cập nhật thông tin nề nếp & Học tập",
        detail: "Ghi nhận vi phạm, khen thưởng, ngày nghỉ học và liên lạc phụ huynh."
      },
      {
        title: "Bước 3: Xuất báo cáo Tổng kết",
        detail: "Xuất báo cáo chủ nhiệm tuần/tháng và sơ yếu lý lịch lớp."
      }
    ],
    tips: [
      "Lưu trữ dữ liệu an toàn trên trình duyệt cá nhân.",
      "Giúp tiết kiệm thời gian lập sổ sách báo cáo hàng tuần."
    ],
    youtubeUrl: ""
  },
  {
    id: "classmap_gamification",
    title: "Mục 17: Sơ đồ lớp, Thi đua & Vòng quay gọi tên học sinh",
    category: "Công tác GV",
    badge: "Quản lý & Hoạt náo",
    iconName: "Users",
    shortDesc: "Tạo sơ đồ bàn học thông minh, chấm điểm thi đua tổ nhóm và quay số ngẫu nhiên",
    description: "Bộ công cụ hỗ trợ công tác chủ nhiệm và dạy học tích cực: Sắp xếp chỗ ngồi theo sơ đồ bàn học, tích điểm khen thưởng thi đua và vòng quay may mắn gọi học sinh lên bảng phát biểu.",
    steps: [
      {
        title: "Bước 1: Nhập danh sách lớp hoặc sơ đồ",
        detail: "Vào mục 'Sơ đồ lớp' -> Tạo số dãy, số bàn và gán tên học sinh vào từng vị trí."
      },
      {
        title: "Bước 2: Đánh giá & Cộng điểm thi đua",
        detail: "Vào mục 'Thi đua & Gọi tên' -> Cộng/trừ điểm phát biểu, làm bài tập cho từng tổ hoặc từng cá nhân học sinh."
      },
      {
        title: "Bước 3: Sử dụng Vòng quay ngẫu nhiên",
        detail: "Bật vòng quay may mắn trong giờ học để tạo không khí hào hứng khi gọi học sinh trả lời câu hỏi."
      }
    ],
    tips: [
      "Dữ liệu sơ đồ và điểm thi đua được tự động lưu lại trong bộ nhớ máy tính của thầy cô.",
      "Có âm thanh và hiệu ứng pháo hoa sôi động tạo hứng thú học tập cho học sinh."
    ],
    youtubeUrl: ""
  },
  {
    id: "timetable",
    title: "Mục 18: Thời khóa biểu & Quản lý công việc",
    category: "Công tác GV",
    badge: "Lịch tuần & Nhắc việc",
    iconName: "CalendarDays",
    shortDesc: "Quản lý thời khóa biểu giảng dạy tuần, danh sách công việc cần làm và báo giảng",
    description: "Sắp xếp thời khóa biểu cá nhân, tự động tính số tiết dạy tuần và nhắc nhở nhiệm vụ công tác chuyên môn.",
    steps: [
      {
        title: "Bước 1: Nhập TKB tuần",
        detail: "Điền môn dạy, lớp dạy theo từng tiết Sáng/Chiều."
      },
      {
        title: "Bước 2: Thêm ghi chú công việc (To-do list)",
        detail: "Thêm các việc cần làm (Chấm bài, nộp giáo án, họp tổ...)."
      },
      {
        title: "Bước 3: Báo giảng tự động",
        detail: "Khởi tạo lịch báo giảng tuần phục vụ công tác chuyên môn."
      }
    ],
    tips: [
      "Xem nhanh lịch dạy ngay khi mở ứng dụng.",
      "Dễ dàng in thời khóa biểu dán tại bàn làm việc."
    ],
    youtubeUrl: ""
  },
  {
    id: "circulars",
    title: "Mục 19: Tài liệu & Thông tư Quy định GDPT 2018",
    category: "Cấu hình",
    badge: "Tra cứu Văn bản",
    iconName: "FileText",
    shortDesc: "Tra cứu nhanh các thông tư, công văn chỉ đạo (Công văn 5512, Thông tư 22, Thông tư 32...)",
    description: "Kho tra cứu văn bản quy phạm pháp luật giáo dục đầy đủ: Công văn 5512 (soạn giáo án), Thông tư 22 (đánh giá học sinh THCS/THPT), Thông tư 27...",
    steps: [
      {
        title: "Bước 1: Chọn Văn bản cần tra cứu",
        detail: "Bấm chọn tên Thông tư hoặc gõ từ khóa tìm kiếm."
      },
      {
        title: "Bước 2: Đọc tóm tắt các điểm mới chính",
        detail: "Xem tóm tắt các điều khoản quy định quan trọng nhất về đánh giá và dạy học."
      },
      {
        title: "Bước 3: Tải file PDF văn bản gốc",
        detail: "Bấm 'Tải PDF gốc' để lưu tài liệu quy định về máy tính."
      }
    ],
    tips: [
      "Luôn cập nhật quy định mới nhất từ Bộ GDĐT.",
      "Giúp giáo viên thực hiện đúng quy chế chuyên môn."
    ],
    youtubeUrl: ""
  },
  {
    id: "history",
    title: "Mục 20: Lịch sử đã tạo & Lưu trữ dữ liệu",
    category: "Cấu hình",
    badge: "Lưu trữ cá nhân",
    iconName: "Clock",
    shortDesc: "Quản lý lại toàn bộ giáo án, đề thi, phiếu học tập đã sinh bằng EduPlan AI",
    description: "Nơi lưu trữ tập trung lịch sử tạo tài liệu của giáo viên, giúp xem lại, tải lại file Word hoặc tiếp tục chỉnh sửa bất kỳ lúc nào.",
    steps: [
      {
        title: "Bước 1: Vào mục 'Lịch sử đã tạo'",
        detail: "Xem danh sách các tài liệu đã tạo sắp xếp theo thời gian."
      },
      {
        title: "Bước 2: Tìm kiếm theo Tên hoặc Loại tài liệu",
        detail: "Lọc theo Phiếu học tập, Giáo án, Lời giải bài tập..."
      },
      {
        title: "Bước 3: Tải lại hoặc Xóa lưu trữ",
        detail: "Tải file Word tương ứng hoặc quản lý bộ nhớ."
      }
    ],
    tips: [
      "Dữ liệu lưu an toàn trên máy tính của thầy cô.",
      "Không lo bị mất tài liệu khi tắt trình duyệt."
    ],
    youtubeUrl: ""
  }
];

/**
 * Trích xuất YouTube Video ID từ link thông thường hoặc rút gọn
 */
export function getYoutubeVideoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Tạo URL embed an toàn cho iframe
 */
export function getYoutubeEmbedUrl(url?: string): string | null {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}
