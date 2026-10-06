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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY (Ví dụ: "https://www.youtube.com/watch?v=xxxxxx")
    youtubeUrl: "https://youtu.be/r9fZgy-Eyys?si=SAuC5tn3WUbXPqM1" 
  },
  {
    id: "kshs_graphing",
    title: "Mục 2: Bộ công cụ KSHS & Vẽ đồ thị hàm số (Bậc 3, Phân thức, Parabol...)",
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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY
    youtubeUrl: "https://youtu.be/r9fZgy-Eyys?si=SAuC5tn3WUbXPqM1"
  },
  {
    id: "bbt_ai_export",
    title: "Mục 3: Bảng biến thiên AI & Xuất ảnh đồ thị PNG / Chép lời giải vào Word",
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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY
    youtubeUrl: ""
  },
  {
    id: "geogebra_casio",
    title: "Mục 4: Công cụ Vẽ hình GeoGebra (Flat & 3D) và Giả lập Casio fx-580VN X",
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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY
    youtubeUrl: ""
  },
  {
    id: "statistics_grouped",
    title: "Mục 5: Xử lý Thống kê mẫu số liệu ghép nhóm (Toán 10, 11, 12)",
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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY
    youtubeUrl: ""
  },
  {
    id: "pdf_exam_converter",
    title: "Mục 6: Đề thi Online từ PDF và Công cụ Chuyển PDF sang Word",
    category: "Kiểm tra & Thi",
    badge: "Trộn đề & Chuyển đổi",
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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY
    youtubeUrl: ""
  },
  {
    id: "classmap_gamification",
    title: "Mục 7: Sơ đồ lớp, Thi đua & Vòng quay gọi tên học sinh",
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
    // DÁN LINK YOUTUBE CỦA BẠN VÀO ĐÂY
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
