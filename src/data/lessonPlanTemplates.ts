export type LessonPlanTemplateCategory = 'stem' | 'digital' | 'standard';

export interface LessonPlanTemplateStage {
  step: string;
  title: string;
  focus: string;
}

export interface LessonPlanTemplate {
  id: string;
  name: string;
  shortName: string;
  category: LessonPlanTemplateCategory;
  categoryLabel: string;
  standardRef: string;
  recommendedPeriods: number;
  periodsLabel: string;
  summary: string;
  suitableFor: string;
  digitalCompetencies: string[];
  stemElements: string[];
  aiIntegration: string;
  stages: LessonPlanTemplateStage[];
  defaultDigitalComp: string;
  defaultAiComp: string;
  defaultStem: string;
  promptDirective: string;
}

export const LESSON_PLAN_TEMPLATE_CATEGORIES: {
  id: 'all' | LessonPlanTemplateCategory;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả mẫu' },
  { id: 'stem', label: 'STEM / STEAM' },
  { id: 'digital', label: 'Năng lực số & AI' },
  { id: 'standard', label: 'Chuẩn CV 5512' },
];

export const LESSON_PLAN_TEMPLATES: LessonPlanTemplate[] = [
  {
    id: 'stem-cv3089-5step',
    name: 'Bài học STEM 5 bước — Quy trình thiết kế kỹ thuật',
    shortName: 'STEM 5 bước (CV 3089)',
    category: 'stem',
    categoryLabel: 'STEM / STEAM',
    standardRef: 'Công văn 3089/BGDĐT-GDTrH & CV 5512',
    recommendedPeriods: 3,
    periodsLabel: '2–3 tiết',
    summary:
      'Khung giáo án bài học STEM chuẩn Bộ GD&ĐT tổ chức theo 5 hoạt động thiết kế kỹ thuật, gắn kiến thức nền với chế tạo sản phẩm thử nghiệm và tiêu chí đánh giá Rubric.',
    suitableFor: 'Bài học ứng dụng thực tiễn môn Toán, Vật lí, Hóa học, Sinh học, Công nghệ, Tin học.',
    digitalCompetencies: [
      '1.1 Tìm kiếm và lọc dữ liệu khoa học kỹ thuật phục vụ thiết kế',
      '3.1 Thiết kế bản vẽ kỹ thuật / mô phỏng số (GeoGebra, PhET, Tinkercad)',
      '5.2 Phân tích số liệu thực nghiệm bằng bảng tính số',
    ],
    stemElements: [
      'S (Science): Kiến thức nền tảng khoa học và quy luật tự nhiên',
      'T (Technology): Phần mềm mô phỏng, đo đạc, cảm biến hoặc công cụ số',
      'E (Engineering): Quy trình thiết kế kỹ thuật, bản vẽ, chế tạo & thử nghiệm',
      'M (Mathematics): Mô hình hóa, tính toán thông số, tối ưu kích thước và sai số',
    ],
    aiIntegration:
      'Học sinh dùng AI gợi ý phương án cải tiến vật liệu, kiểm tra giả thuyết tính toán và đối chiếu với định luật SGK.',
    stages: [
      {
        step: 'Hoạt động 1',
        title: 'Xác định vấn đề / Nhiệm vụ thiết kế',
        focus: 'Đặt tình huống thực tiễn, công bố yêu cầu sản phẩm và bộ tiêu chí đánh giá (Rubric).',
      },
      {
        step: 'Hoạt động 2',
        title: 'Nghiên cứu kiến thức nền và đề xuất giải pháp',
        focus: 'Chiếm lĩnh kiến thức trọng tâm SGK, phác thảo bản vẽ kỹ thuật và tính toán thông số.',
      },
      {
        step: 'Hoạt động 3',
        title: 'Trình bày và thảo luận phương án thiết kế',
        focus: 'Các nhóm bảo vệ bản thiết kế dựa trên lập luận khoa học/toán học; góp ý điều chỉnh.',
      },
      {
        step: 'Hoạt động 4',
        title: 'Chế tạo mẫu, thử nghiệm và đánh giá',
        focus: 'Thi công sản phẩm mẫu theo bản vẽ, ghi nhận số liệu đo đạc, đối chiếu với tiêu chí.',
      },
      {
        step: 'Hoạt động 5',
        title: 'Chia sẻ, thảo luận và điều chỉnh sản phẩm',
        focus: 'Báo cáo kết quả, rút kinh nghiệm cải tiến thiết kế và chốt kiến thức bài học.',
      },
    ],
    defaultDigitalComp:
      'Sử dụng phần mềm mô phỏng/vẽ kỹ thuật (GeoGebra, PhET, Tinkercad) và bảng tính số để thiết kế, kiểm chứng thông số sản phẩm STEM',
    defaultAiComp:
      'Sử dụng AI gợi ý phương án vật liệu thay thế, kiểm tra tính hợp lý của thông số thiết kế và phản biện kết quả AI so với định luật SGK',
    defaultStem:
      'Bài học STEM chuẩn Công văn 3089 theo quy trình thiết kế kỹ thuật 5 hoạt động kèm tiêu chí Rubric đánh giá sản phẩm thực tế',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN BÀI HỌC STEM 5 BƯỚC CHUẨN CÔNG VĂN 3089/BGDĐT-GDTrH KẾT HỢP CV 5512:
1. Mục I (Mục tiêu) phải bổ sung tiểu mục "Tích hợp các thành tố STEM (S - T - E - M)" chỉ rõ từng thành tố Science, Technology, Engineering, Mathematics trong bài.
2. Mục II (Thiết bị dạy học) phải tách rõ: Học liệu số/mô phỏng + Nguyên vật liệu chế tạo sản phẩm STEM (kèm định mức an toàn, dễ kiếm).
3. Mục III (Tiến trình dạy học) phân bổ đủ số tiết theo đúng 5 HOẠT ĐỘNG BÀI HỌC STEM:
   - Hoạt động 1: Xác định vấn đề (Kèm Bảng tiêu chí đánh giá sản phẩm STEM có thang điểm rõ ràng).
   - Hoạt động 2: Nghiên cứu kiến thức nền và đề xuất giải pháp (Kiến thức SGK + tính toán mô hình hóa).
   - Hoạt động 3: Lựa chọn và bảo vệ phương án thiết kế (Bản thiết kế có kích thước, công thức chứng minh).
   - Hoạt động 4: Chế tạo mẫu, thử nghiệm và đánh giá (Bảng ghi nhận kết quả thử nghiệm và sai số).
   - Hoạt động 5: Chia sẻ, thảo luận và điều chỉnh sản phẩm.
4. Mỗi hoạt động vẫn giữ đủ 4 mục chuẩn CV 5512: a) Mục tiêu, b) Nội dung, c) Sản phẩm (có lời giải/bản thiết kế/bảng số liệu chi tiết), d) Tổ chức thực hiện (4 bước).
5. Cuối bài bổ sung Phụ lục: Phiếu đánh giá sản phẩm STEM theo Rubric (4 mức độ) và Phiếu ghi chép thực nghiệm.`,
  },
  {
    id: 'steam-5e-creative',
    name: 'Giáo án STEAM 5E kết hợp Nghệ thuật & Thiết kế sáng tạo',
    shortName: 'STEAM 5E + Nghệ thuật',
    category: 'stem',
    categoryLabel: 'STEM / STEAM',
    standardRef: 'Mô hình 5E (BSCS) & CV 5512 GDPT 2018',
    recommendedPeriods: 2,
    periodsLabel: '2 tiết',
    summary:
      'Tổ chức tiến trình dạy học theo chu trình khám phá 5E (Gắn kết – Khám phá – Giải thích – Mở rộng – Đánh giá), nổi bật yếu tố A (Art) về thẩm mỹ, trực quan hóa và thiết kế sản phẩm truyền thông khoa học.',
    suitableFor: 'Bài học hình thành khái niệm mới, hình học trực quan, đồ thị, thiết kế mô hình thẩm mỹ và truyền thông khoa học.',
    digitalCompetencies: [
      '3.1 Sáng tạo nội dung đa phương tiện (Canva, Infographic, mô hình 3D)',
      '2.2 Hợp tác trực tuyến xây dựng bảng ý tưởng trên Padlet / Miro',
      '4.2 Ghi nguồn tài nguyên hình ảnh và bản quyền số hợp lệ',
    ],
    stemElements: [
      'S (Science): Khám phá bản chất khoa học qua thí nghiệm / quan sát',
      'T (Technology): Công cụ trực quan hóa số và trình chiếu tương tác',
      'E (Engineering): Tư duy thiết kế cấu trúc bền vững và hợp lý',
      'A (Arts): Bố cục thị giác, tỷ lệ thẩm mỹ, kể chuyện khoa học (Science Storytelling)',
      'M (Mathematics): Đo lường, tỷ lệ, đối xứng, phương trình và hình học ứng dụng',
    ],
    aiIntegration:
      'Học sinh dùng AI phác thảo ý tưởng bố cục, kiểm tra độ chính xác của chú thích khoa học trước khi hoàn thiện sản phẩm STEAM.',
    stages: [
      {
        step: 'Pha 1 · Engage',
        title: 'Gắn kết (Khởi động)',
        focus: 'Kích thích tò mò bằng hiện tượng thực tiễn / tác phẩm nghệ thuật chứa quy luật khoa học – toán học.',
      },
      {
        step: 'Pha 2 · Explore',
        title: 'Khám phá (Trải nghiệm)',
        focus: 'Học sinh thao tác trực quan, thử nghiệm trên mô phỏng số hoặc vật liệu thật để rút ra quy luật.',
      },
      {
        step: 'Pha 3 · Explain',
        title: 'Giải thích (Hình thành kiến thức)',
        focus: 'Hệ thống hóa khái niệm, định lý, công thức chuẩn SGK từ dữ liệu khám phá.',
      },
      {
        step: 'Pha 4 · Elaborate',
        title: 'Mở rộng sáng tạo (STEAM Design)',
        focus: 'Vận dụng kiến thức thiết kế sản phẩm có tính thẩm mỹ (Poster, mô hình, tác phẩm nghệ thuật số).',
      },
      {
        step: 'Pha 5 · Evaluate',
        title: 'Đánh giá & Phản hồi',
        focus: 'Triển lãm phòng tranh (Gallery Walk), đánh giá theo tiêu chí Khoa học + Thẩm mỹ + Kỹ thuật.',
      },
    ],
    defaultDigitalComp:
      'Sử dụng công cụ thiết kế trực quan (Canva, GeoGebra, Padlet) để tạo sản phẩm truyền thông khoa học và chia sẻ phản hồi trực tuyến',
    defaultAiComp:
      'Sử dụng AI hỗ trợ lên ý tưởng trình bày, soát lỗi thuật ngữ khoa học trên sản phẩm STEAM và ghi chú minh bạch phần hỗ trợ của AI',
    defaultStem:
      'Giáo án STEAM theo mô hình 5E (Engage - Explore - Explain - Elaborate - Evaluate) nhấn mạnh yếu tố Nghệ thuật (Art) và thiết kế trực quan',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN STEAM THEO MÔ HÌNH 5E (ENGAGE - EXPLORE - EXPLAIN - ELABORATE - EVALUATE) CHUẨN CV 5512:
1. Mục I (Mục tiêu) phải phân tích đầy đủ 5 thành tố S - T - E - A - M, đặc biệt làm rõ yếu tố A (Art - Nghệ thuật, thẩm mỹ, bố cục, biểu đạt sáng tạo).
2. Mục III (Tiến trình dạy học) tổ chức theo đúng 5 pha 5E tương ứng với các hoạt động CV 5512:
   - Hoạt động 1 (Engage - Gắn kết): Tình huống trực quan/nghệ thuật khơi gợi vấn đề.
   - Hoạt động 2 (Explore - Khám phá): Thí nghiệm/thao tác trên học liệu số để học sinh tự phát hiện quy luật.
   - Hoạt động 3 (Explain - Giải thích): Học sinh diễn đạt lại bằng ngôn ngữ khoa học, GV chuẩn hóa kiến thức SGK.
   - Hoạt động 4 (Elaborate - Mở rộng sáng tạo STEAM): Thiết kế sản phẩm kết hợp kiến thức môn học với thẩm mỹ/nghệ thuật (Poster Infographic, mô hình đối xứng, sản phẩm thiết kế).
   - Hoạt động 5 (Evaluate - Đánh giá): Triển lãm Gallery Walk, tự đánh giá và đánh giá đồng đẳng theo Rubric (Khoa học – Kỹ thuật – Thẩm mỹ – Năng lực số).
3. Mỗi hoạt động trình bày đủ a) Mục tiêu, b) Nội dung, c) Sản phẩm (kèm lời giải/mô tả sản phẩm chi tiết), d) Tổ chức thực hiện (4 bước).`,
  },
  {
    id: 'stem-pbl-interdisciplinary',
    name: 'Dự án STEM liên môn gắn thực tiễn (Project-Based Learning)',
    shortName: 'Dự án STEM liên môn',
    category: 'stem',
    categoryLabel: 'STEM / STEAM',
    standardRef: 'Dạy học dự án (PBL) & CV 3089 / CV 5512',
    recommendedPeriods: 4,
    periodsLabel: '3–4 tiết',
    summary:
      'Khung giáo án chuyên đề/dự án dài hơi giúp học sinh giải quyết một bài toán thực tiễn địa phương qua thu thập số liệu thực tế, mô hình hóa liên môn, chế tạo và bảo vệ dự án.',
    suitableFor: 'Chuyên đề học tập GDPT 2018, hoạt động thực hành trải nghiệm, bài tổng ôn chương có ứng dụng thực tiễn.',
    digitalCompetencies: [
      '1.2 Thu thập, quản lý và trực quan hóa dữ liệu khảo sát (Google Forms / Sheets)',
      '2.4 Phân công và theo dõi tiến độ nhóm trên nền tảng cộng tác số',
      '3.2 Biên tập báo cáo số và trình chiếu minh họa dữ liệu',
    ],
    stemElements: [
      'S (Science): Vấn đề môi trường, năng lượng, sức khỏe hoặc tự nhiên địa phương',
      'T (Technology): Thu thập số liệu số, biểu mẫu khảo sát, phân tích bảng tính',
      'E (Engineering): Lập kế hoạch dự án, nguyên mẫu giải pháp và tối ưu chi phí',
      'M (Mathematics): Thống kê, hồi quy, tối ưu hóa chi phí và dự báo định lượng',
    ],
    aiIntegration:
      'Học sinh dùng AI phân tích xu hướng số liệu sơ bộ, lập dàn ý phản biện câu hỏi hội đồng và kiểm chứng lại bằng tính toán độc lập.',
    stages: [
      {
        step: 'Giai đoạn 1',
        title: 'Khởi động dự án & Giao bộ câu hỏi định hướng',
        focus: 'Giới thiệu vấn đề thực tiễn, thành lập nhóm chuyên môn, ký kết kế hoạch và tiêu chí chấm điểm.',
      },
      {
        step: 'Giai đoạn 2',
        title: 'Khảo sát thực địa & Nghiên cứu kiến thức liên môn',
        focus: 'Thu thập số liệu thực tế, xây dựng mô hình toán học/khoa học để phân tích nguyên nhân.',
      },
      {
        step: 'Giai đoạn 3',
        title: 'Thiết kế giải pháp & Hoàn thiện sản phẩm dự án',
        focus: 'Xây dựng nguyên mẫu hoặc bản kế hoạch khả thi, thử nghiệm và tối ưu hóa.',
      },
      {
        step: 'Giai đoạn 4',
        title: 'Báo cáo hội đồng, phản biện & Đánh giá đồng đẳng',
        focus: 'Các nhóm thuyết trình bảo vệ dự án, chất vấn chéo, tổng kết kiến thức và chấm điểm theo Rubric.',
      },
    ],
    defaultDigitalComp:
      'Thu thập và xử lý dữ liệu khảo sát trên Google Forms/Sheets, quản lý tiến độ nhóm trực tuyến và xây dựng báo cáo thuyết trình số',
    defaultAiComp:
      'Sử dụng AI hỗ trợ tổng hợp tài liệu tham khảo và đặt câu hỏi phản biện giả định trước khi bảo vệ dự án trước lớp',
    defaultStem:
      'Dự án STEM liên môn theo mô hình Học tập dựa trên dự án (PBL) gắn với bài toán thực tiễn địa phương',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN DỰ ÁN STEM LIÊN MÔN (PROJECT-BASED LEARNING) CHUẨN GDPT 2018:
1. Xác định rõ: Tên dự án hấp dẫn, Câu hỏi định hướng (Câu hỏi khái quát, Câu hỏi bài học, Câu hỏi nội dung) và Bảng phân công vai trò trong nhóm học sinh (Nhóm trưởng, Thư ký số liệu, Kỹ sư thiết kế, Truyền thông).
2. Phân bổ tiến trình dạy học chi tiết theo từng tiết học gắn với 4 giai đoạn Dự án (Khởi động & Lập kế hoạch → Nghiên cứu & Thu thập dữ liệu thực tế → Thiết kế sản phẩm/giải pháp → Báo cáo, phản biện & Đánh giá).
3. Trong mỗi hoạt động trình bày đủ 4 mục CV 5512 (Mục tiêu, Nội dung, Sản phẩm có ví dụ số liệu/tính toán cụ thể, 4 bước Tổ chức thực hiện).
4. Kèm theo Phụ lục: Bảng kế hoạch tiến độ nhóm và Phiếu đánh giá đồng đẳng (Peer Assessment) + Rubric đánh giá dự án STEM.`,
  },
  {
    id: 'digital-tt02-2025',
    name: 'Giáo án CV 5512 tích hợp Khung Năng lực số (TT 02/2025)',
    shortName: 'Tích hợp NLS (TT 02/2025)',
    category: 'digital',
    categoryLabel: 'Năng lực số & AI',
    standardRef: 'Thông tư 02/2025/TT-BGDĐT & CV 5512',
    recommendedPeriods: 2,
    periodsLabel: '2 tiết',
    summary:
      'Gắn trực tiếp mã chỉ báo Khung Năng lực số cho người học (Thông tư 02/2025/TT-BGDĐT) vào Mục tiêu và từng hoạt động dạy học, đi kèm công cụ số cụ thể, sản phẩm số đầu ra và tiêu chí đánh giá NLS.',
    suitableFor: 'Mọi bài dạy thuộc tất cả các môn học cần minh chứng rõ ràng chỉ báo Năng lực số trong hồ sơ chuyên môn.',
    digitalCompetencies: [
      '1.1 – 1.3 Khai thác dữ liệu, tìm kiếm và đánh giá độ tin cậy thông tin số',
      '2.1 – 2.4 Giao tiếp, chia sẻ và hợp tác trong môi trường số',
      '3.1 – 3.4 Sáng tạo nội dung số, trình bày sản phẩm và tuân thủ bản quyền',
      '4.1 – 4.3 Bảo vệ thiết bị, dữ liệu cá nhân và an toàn sức khỏe số',
      '5.1 – 5.3 Giải quyết vấn đề kỹ thuật và ứng dụng công cụ số trong học tập',
      '6.1 – 6.3 Ứng dụng trí tuệ nhân tạo có đạo đức và kiểm chứng',
    ],
    stemElements: [
      'Ứng dụng phần mềm chuyên môn (GeoGebra, Desmos, PhET, bảng tính) giải quyết nhiệm vụ học tập',
    ],
    aiIntegration:
      'Tích hợp Miền năng lực 6 (Ứng dụng AI) theo đúng bậc năng lực của cấp học, yêu cầu HS kiểm chứng đầu ra của AI.',
    stages: [
      {
        step: 'Hoạt động 1',
        title: 'Khởi động tương tác số (Chẩn đoán nhanh)',
        focus: 'Tổ chức trắc nghiệm nhanh qua QR / Quizizz / Mentimeter; kích hoạt chỉ báo NLS miền 1 & 2.',
      },
      {
        step: 'Hoạt động 2',
        title: 'Hình thành kiến thức với học liệu số trực quan',
        focus: 'HS thao tác mô phỏng/khai thác học liệu số, tổng hợp bảng kiến thức cộng tác; gắn mã chỉ báo NLS miền 3 & 5.',
      },
      {
        step: 'Hoạt động 3',
        title: 'Luyện tập phản hồi tức thì & Soát lỗi bằng công cụ số',
        focus: 'Giải bài tập có kiểm chứng bằng phần mềm hoặc đối chiếu gợi ý AI; gắn mã chỉ báo NLS miền 5 & 6.',
      },
      {
        step: 'Hoạt động 4',
        title: 'Vận dụng tạo sản phẩm số & Nộp hồ sơ học tập',
        focus: 'Nộp sản phẩm số (Infographic/Video ngắn/File tương tác) lên LMS kèm ghi nguồn an toàn số (miền 3 & 4).',
      },
    ],
    defaultDigitalComp:
      'Tích hợp đầy đủ các mã chỉ báo Khung Năng lực số theo Thông tư 02/2025/TT-BGDĐT (Miền 1: Dữ liệu, Miền 2: Hợp tác số, Miền 3: Sáng tạo nội dung số, Miền 4: An toàn số, Miền 5: Giải quyết vấn đề, Miền 6: Ứng dụng AI)',
    defaultAiComp:
      'Vận dụng Miền 6 (Thông tư 02/2025/TT-BGDĐT): viết prompt học tập có cấu trúc, kiểm chứng độ chính xác và tuân thủ đạo đức học thuật khi dùng AI',
    defaultStem:
      'Sử dụng phần mềm mô phỏng và công cụ tính toán số để giải quyết tình huống thực tiễn gắn với bài học',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN CV 5512 TÍCH HỢP CHỈ BÁO NĂNG LỰC SỐ THEO THÔNG TƯ 02/2025/TT-BGDĐT:
1. Trong Phần I (Mục tiêu -> Năng lực số): BẮT BUỘC lập bảng ánh xạ rõ ràng gồm 3 cột: | Mã chỉ báo NLS (TT 02/2025) | Biểu hiện cụ thể trong bài học | Công cụ & Hoạt động thể hiện | (chọn 3–5 chỉ báo thực chất thuộc các miền 1 đến 6 phù hợp bậc học).
2. Trong Phần III (Tiến trình dạy học): Ở MỖI hoạt động, ghi rõ trong mục a) Mục tiêu mã chỉ báo NLS được phát triển, trong mục b) Nội dung & d) Tổ chức thực hiện nêu rõ thao tác số từng bước của GV và HS (công cụ cụ thể: GeoGebra, Desmos, Quizizz, Google Forms, Padlet, Canva, LMS...), và nêu rõ phương án dự phòng khi mất mạng hoặc thiết bị hạn chế (chế độ làm việc nhóm dùng chung 1 thiết bị / phiếu giấy tương đương).
3. Cuối giáo án bổ sung Bảng kiểm (Checklist) đánh giá Năng lực số của học sinh sau tiết học.`,
  },
  {
    id: 'digital-flipped-lms',
    name: 'Giáo án Lớp học Đảo ngược kết hợp LMS & Học liệu số',
    shortName: 'Lớp học Đảo ngược (LMS)',
    category: 'digital',
    categoryLabel: 'Năng lực số & AI',
    standardRef: 'Flipped Classroom & CV 5512 GDPT 2018',
    recommendedPeriods: 2,
    periodsLabel: '2 tiết',
    summary:
      'Chuyển khâu tiếp cận lý thuyết cơ bản sang nhiệm vụ tự học số trước giờ học (Video ngắn + Quiz chẩn đoán trên LMS), dành tối đa thời gian trên lớp cho thảo luận sâu, giải quyết điểm nghẽn và luyện tập phân hóa.',
    suitableFor: 'Bài học nhiều kiến thức nền cần tăng thời gian thực hành, luyện giải bài tập và chữa lỗi sai trên lớp.',
    digitalCompetencies: [
      '1.1 Tự học qua video bài giảng tương tác và ghi chú số (Edpuzzle / YouTube / LMS)',
      '2.1 Đặt câu hỏi và phản hồi trên diễn đàn lớp học trực tuyến',
      '5.3 Tự đánh giá mức độ hiểu bài qua bài kiểm tra chẩn đoán tự động',
    ],
    stemElements: [
      'Dành thời lượng trên lớp để giải bài toán thực tiễn và mô hình hóa chuyên sâu',
    ],
    aiIntegration:
      'AI tổng hợp các câu hỏi sai nhiều nhất từ Quiz trước giờ học giúp GV thiết kế trọng tâm giảng dạy cá nhân hóa.',
    stages: [
      {
        step: 'Trước giờ học',
        title: 'Tự học qua học liệu số & Quiz chẩn đoán trên LMS',
        focus: 'HS xem video 5–7 phút, hoàn thành phiếu ghi chú Cornell số và trả lời 5 câu trắc nghiệm chẩn đoán.',
      },
      {
        step: 'Hoạt động 1',
        title: 'Phân tích dữ liệu LMS & Gỡ điểm nghẽn (Trên lớp)',
        focus: 'GV chiếu thống kê câu sai phổ biến từ LMS, giải đáp nhanh những hiểu nhầm cốt lõi.',
      },
      {
        step: 'Hoạt động 2',
        title: 'Hệ thống hóa & Đào sâu kiến thức trọng tâm',
        focus: 'Học sinh thảo luận nhóm đối chiếu phiếu tự học, hoàn thiện sơ đồ tư duy kiến thức.',
      },
      {
        step: 'Hoạt động 3',
        title: 'Luyện tập phân hóa theo 3 mức độ năng lực',
        focus: 'Chia nhóm luyện tập theo dữ liệu Quiz đầu vào (Củng cố – Thành thạo – Vận dụng nâng cao).',
      },
      {
        step: 'Hoạt động 4',
        title: 'Vận dụng thực tiễn & Phản tư trên LMS',
        focus: 'Giải tình huống thực tế và nộp phiếu tự phản tư học tập (Exit Ticket số).',
      },
    ],
    defaultDigitalComp:
      'Tổ chức tự học trên hệ thống LMS (Azota/Google Classroom/Olm), video tương tác và thu thập dữ liệu đánh giá chẩn đoán qua Google Forms/Quizizz',
    defaultAiComp:
      'Phân tích lỗi sai phổ biến từ bài làm trước giờ học và gợi ý lộ trình bài tập phân hóa phù hợp từng nhóm học sinh',
    defaultStem:
      'Tối ưu thời gian trên lớp để giải quyết các bài toán mô hình hóa và vận dụng thực tiễn chuyên sâu',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN LỚP HỌC ĐẢO NGƯỢC (FLIPPED CLASSROOM) CHUẨN CV 5512:
1. Mở đầu Phần III (Tiến trình dạy học) BẮT BUỘC có mục riêng: "GIAI ĐOẠN TRƯỚC GIỜ HỌC (TỰ HỌC QUA HỌC LIỆU SỐ TRÊN LMS)" nêu rõ:
   - Kịch bản học liệu số giao trước (Video/Slide/SGK số dài 5–7 phút).
   - Phiếu hướng dẫn tự học và 5 câu hỏi trắc nghiệm chẩn đoán nhanh (kèm đáp án).
   - Cách GV thu thập và đọc dữ liệu phản hồi trước khi lên lớp.
2. Phần "TRÊN LỚP" tổ chức đầy đủ 4 hoạt động CV 5512 cho từng tiết:
   - Hoạt động 1: Khởi động & Chữa điểm nghẽn từ dữ liệu LMS.
   - Hoạt động 2: Thảo luận nhóm, chốt kiến thức trọng tâm và xử lý các tình huống mở rộng (không giảng lại đơn điệu toàn bộ lý thuyết cơ bản).
   - Hoạt động 3: Luyện tập phân hóa 3 mức độ (Cơ bản – Trung bình – Nâng cao) có lời giải chi tiết ở mục Sản phẩm.
   - Hoạt động 4: Vận dụng thực tiễn & Vé ra cửa số (Digital Exit Ticket).`,
  },
  {
    id: 'digital-ai-critical-2422',
    name: 'Giáo án tích hợp AI & Tư duy phản biện (QĐ 2422)',
    shortName: 'Tích hợp AI (QĐ 2422)',
    category: 'digital',
    categoryLabel: 'Năng lực số & AI',
    standardRef: 'Quyết định 2422/QĐ-BGDĐT & CV 5512',
    recommendedPeriods: 2,
    periodsLabel: '2 tiết',
    summary:
      'Lồng ghép năng lực sử dụng AI có trách nhiệm vào bài dạy môn học: học sinh thiết kế câu lệnh prompt chuẩn cấu trúc, phát hiện "ảo giác" hoặc bước giải thiếu điều kiện của AI, và tự kiểm chứng bằng kiến thức SGK.',
    suitableFor: 'Bài học cần rèn tư duy phản biện, kiểm tra lời giải, phân tích đa chiều và năng lực ứng dụng AI an toàn.',
    digitalCompetencies: [
      '6.1 Thiết kế câu lệnh (Prompt Engineering) rõ ngữ cảnh, mục tiêu và ràng buộc',
      '6.2 Kiểm chứng độ chính xác, phát hiện lỗi sai / thiên kiến của AI',
      '6.3 Sử dụng AI minh bạch, trung thực và khai báo học thuật đúng quy định',
    ],
    stemElements: [
      'Sử dụng AI như trợ lý mô phỏng ý tưởng, kiểm chứng chéo với công thức và dữ liệu thực nghiệm',
    ],
    aiIntegration:
      'Xây dựng kịch bản "Thử thách phản biện AI": HS đối chiếu lời giải của AI với chuẩn SGK, chỉ ra lỗ hổng logic và chỉnh sửa hoàn chỉnh.',
    stages: [
      {
        step: 'Hoạt động 1',
        title: 'Khởi động — Đặt câu hỏi & Dự đoán',
        focus: 'Đưa ra tình huống mở hoặc một nhận định do AI tạo ra có lỗi tinh vi để HS tranh luận.',
      },
      {
        step: 'Hoạt động 2',
        title: 'Hình thành kiến thức nền tảng (Không phụ thuộc AI)',
        focus: 'HS tự xây dựng định nghĩa, tính chất, quy tắc chuẩn từ SGK làm "thước đo" kiểm chứng.',
      },
      {
        step: 'Hoạt động 3',
        title: 'Luyện tập — Thực hành Prompt & Phản biện AI',
        focus: 'HS tự giải trước, sau đó dùng prompt mẫu hỏi AI, đối chiếu từng bước và tìm lỗi sai (nếu có).',
      },
      {
        step: 'Hoạt động 4',
        title: 'Vận dụng sáng tạo & Khai báo sử dụng AI',
        focus: 'Hoàn thiện sản phẩm vận dụng kèm Phiếu khai báo minh bạch mức độ sử dụng AI.',
      },
    ],
    defaultDigitalComp:
      'Khai thác công cụ AI tạo sinh có kiểm soát, kiểm chứng thông tin bằng tài liệu chính thống và lưu trữ lịch sử câu lệnh học tập',
    defaultAiComp:
      'Thiết kế câu lệnh prompt có cấu trúc (Vai trò - Nhiệm vụ - Ràng buộc), phát hiện sai sót logic của AI và thực hành khai báo minh bạch theo QĐ 2422/QĐ-BGDĐT',
    defaultStem:
      'Kết hợp kiểm chứng công thức khoa học/toán học với trợ lý AI để giải quyết tình huống thực tiễn',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN LỒNG GHÉP AI & TƯ DUY PHẢN BIỆN THEO QUYẾT ĐỊNH 2422/QĐ-BGDĐT VÀ CV 5512:
1. Phần I (Mục tiêu): Nêu rõ mục tiêu Năng lực AI (thiết kế prompt, kiểm chứng phản biện, đạo đức và an toàn khi dùng AI).
2. Phần III (Tiến trình dạy học): Đảm bảo nguyên tắc "Tư duy con người trước — AI hỗ trợ sau":
   - Học sinh luôn tự suy nghĩ/giải nháp trước khi đối chiếu với AI.
   - Cung cấp ít nhất 2 CÂU LỆNH PROMPT MẪU cụ thể viết rõ ràng để HS thực hành trong giờ học.
   - Thiết kế 1 tình huống "Bắt lỗi AI" (đưa ra 1 đoạn lời giải/nhận định mẫu có chứa lỗ hổng kiến thức tinh vi để HS phân tích, chỉ rõ chỗ sai và sửa lại đúng chuẩn SGK trong mục Sản phẩm).
3. Cuối giáo án đính kèm mẫu "Phiếu khai báo sử dụng AI trong học tập" ngắn gọn (3–4 dòng) cho học sinh.`,
  },
  {
    id: 'standard-cv5512-core',
    name: 'Giáo án chuẩn Công văn 5512/BGDĐT-GDTrH (Đầy đủ 4 hoạt động)',
    shortName: 'Chuẩn CV 5512',
    category: 'standard',
    categoryLabel: 'Chuẩn CV 5512',
    standardRef: 'Công văn 5512/BGDĐT-GDTrH',
    recommendedPeriods: 2,
    periodsLabel: '1–3 tiết',
    summary:
      'Khung Kế hoạch bài dạy mẫu mực theo Phụ lục IV Công văn 5512: đầy đủ Mục tiêu, Thiết bị, Tiến trình 4 hoạt động (Khởi động – Hình thành kiến thức – Luyện tập – Vận dụng) với lời giải chi tiết và 4 bước tổ chức.',
    suitableFor: 'Giáo án giảng dạy hằng ngày, thao giảng, thi Giáo viên dạy giỏi các cấp.',
    digitalCompetencies: [
      'Sử dụng trình chiếu tương tác, phần mềm trực quan hóa và phiếu học tập số ở mức độ vừa phải, thiết thực',
    ],
    stemElements: [
      'Lồng ghép 1–2 bài toán thực tiễn ở Hoạt động Khởi động và Hoạt động Vận dụng',
    ],
    aiIntegration:
      'Gợi ý 1 hoạt động hỗ trợ tự học hoặc kiểm tra nhanh bằng AI ở khâu giao việc về nhà.',
    stages: [
      {
        step: 'Hoạt động 1',
        title: 'Xác định vấn đề / Mở đầu (Khởi động)',
        focus: 'Tạo tâm thế hứng thú, kết nối kiến thức cũ với bài mới bằng tình huống gọn, trực quan.',
      },
      {
        step: 'Hoạt động 2',
        title: 'Hình thành kiến thức mới',
        focus: 'Tổ chức hoạt động khám phá, hình thành khái niệm/định lý/quy tắc và ví dụ minh họa có lời giải.',
      },
      {
        step: 'Hoạt động 3',
        title: 'Luyện tập',
        focus: 'Hệ thống bài tập từ cơ bản đến nâng cao kèm đáp án, lời giải từng bước và lưu ý sai lầm thường gặp.',
      },
      {
        step: 'Hoạt động 4',
        title: 'Vận dụng & Hướng dẫn tự học',
        focus: 'Bài toán ứng dụng thực tiễn và hướng dẫn chuẩn bị bài học tiếp theo.',
      },
    ],
    defaultDigitalComp:
      'Sử dụng bài giảng điện tử, phần mềm trực quan môn học (GeoGebra/Desmos/PhET) và phiếu học tập số (Google Forms/Quizizz)',
    defaultAiComp:
      'Hướng dẫn học sinh tra cứu gợi ý giải thích khái niệm và tự kiểm tra bài tập về nhà bằng công cụ AI có kiểm chứng',
    defaultStem:
      'Liên hệ bài toán thực tiễn ở Hoạt động Khởi động và Hoạt động Vận dụng cuối bài',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN MẪU MỰC PHỤ LỤC IV CÔNG VĂN 5512/BGDĐT-GDTrH:
1. Trình bày trang trọng, chặt chẽ, chuẩn văn phong sư phạm dùng cho hồ sơ chuyên môn và thao giảng.
2. Phân bổ thời lượng dự kiến (tính bằng phút) rõ ràng cho từng hoạt động sao cho tổng thời gian mỗi tiết đúng 45 phút.
3. Mục c) Sản phẩm viết đầy đủ bảng chốt kiến thức và lời giải từng bước chi tiết cho mọi ví dụ, câu hỏi và bài tập.
4. Mục d) Tổ chức thực hiện luôn đủ 4 bước (Chuyển giao nhiệm vụ – Thực hiện nhiệm vụ – Báo cáo, thảo luận – Kết luận, nhận định) kèm lời thoại sư phạm và dự kiến sai lầm học sinh.`,
  },
  {
    id: 'standard-station-differentiated',
    name: 'Giáo án Dạy học Phân hóa & Trạm học tập (Station Rotation)',
    shortName: 'Trạm học tập phân hóa',
    category: 'standard',
    categoryLabel: 'Chuẩn CV 5512',
    standardRef: 'Dạy học phân hóa GDPT 2018 & CV 5512',
    recommendedPeriods: 2,
    periodsLabel: '2 tiết',
    summary:
      'Tổ chức lớp học theo 3–4 trạm luân phiên (Trạm Khám phá số, Trạm Luyện tập cốt lõi, Trạm Thử thách vận dụng, Trạm GV hướng dẫn sâu) giúp mọi đối tượng học sinh cùng tiến bộ.',
    suitableFor: 'Tiết luyện tập, ôn tập chương, bài học có sự phân hóa rõ rệt về năng lực học sinh trong lớp.',
    digitalCompetencies: [
      '1.1 Tự tra cứu thẻ gợi ý QR và học liệu tương tác tại Trạm Khám phá số',
      '5.3 Tự chấm điểm và nhận phản hồi tức thì qua bài tập số',
    ],
    stemElements: [
      'Trạm Thử thách thiết kế 1 bài toán ứng dụng thực tiễn hoặc mô hình hóa liên môn',
    ],
    aiIntegration:
      'Thiết kế thẻ gợi ý phân tầng (Scaffolded Hints) và phản hồi tự động cho nhóm hoàn thành sớm.',
    stages: [
      {
        step: 'Hoạt động 1',
        title: 'Khởi động & Phân nhóm theo trạm (5–7 phút)',
        focus: 'Kiểm tra nhanh kiến thức nền, phổ biến sơ đồ di chuyển và nội quy luân chuyển giữa các trạm.',
      },
      {
        step: 'Hoạt động 2',
        title: 'Thực hành luân phiên qua 3–4 Trạm học tập (25–30 phút)',
        focus: 'Trạm 1: Cốt lõi SGK · Trạm 2: Thực hành công cụ số · Trạm 3: Vận dụng thực tiễn · Trạm 4: GV hỗ trợ trực tiếp.',
      },
      {
        step: 'Hoạt động 3',
        title: 'Tổng hợp sản phẩm các trạm & Chữa lỗi điển hình',
        focus: 'Đại diện nhóm báo cáo các câu hỏi khó ở từng trạm; GV chốt phương pháp giải chuẩn.',
      },
      {
        step: 'Hoạt động 4',
        title: 'Đánh giá cá nhân & Giao nhiệm vụ phân hóa về nhà',
        focus: 'Kiểm tra nhanh 5 phút cuối giờ và giao bài tập về nhà theo 2 mức: Củng cố và Mở rộng.',
      },
    ],
    defaultDigitalComp:
      'Sử dụng mã QR truy cập phiếu nhiệm vụ tại Trạm Khám phá số và công cụ tự kiểm tra đáp án trực tuyến',
    defaultAiComp:
      'Tạo hệ thống gợi ý từng nấc (từ gợi ý nhỏ đến lời giải mẫu) hỗ trợ học sinh tự học phân hóa theo tốc độ riêng',
    defaultStem:
      'Thiết kế Trạm Vận dụng với tình huống tính toán/thiết kế gắn thực tế đời sống',
    promptDirective: `BẮT BUỘC ÁP DỤNG KHUNG GIÁO ÁN DẠY HỌC PHÂN HÓA THEO TRẠM HỌC TẬP (STATION ROTATION) CHUẨN CV 5512:
1. Thiết kế chi tiết BỘ PHIẾU NHIỆM VỤ CHO 3–4 TRẠM HỌC TẬP rõ ràng (mỗi trạm ghi rõ thời lượng 8–10 phút, mục tiêu, bộ câu hỏi/nhiệm vụ cụ thể và đáp án chi tiết):
   - Trạm 1 (Trạm Cốt lõi): Củng cố kiến thức nền và kỹ năng cơ bản (mức Nhận biết – Thông hiểu).
   - Trạm 2 (Trạm Công nghệ & Học liệu số): Thực hành trực quan trên phần mềm / bài tập tương tác số.
   - Trạm 3 (Trạm Vận dụng STEM): Bài toán thực tiễn hoặc thử thách sáng tạo (mức Vận dụng).
   - Trạm 4 (Trạm Hỗ trợ cùng GV — nếu phù hợp): Gỡ vướng cho nhóm HS cần kèm cặp hoặc mở rộng chuyên sâu.
2. Ghi rõ sơ đồ luân chuyển trạm, cách quản lý thời gian và phiếu tự đánh giá sau khi hoàn thành vòng trạm.
3. Giữ đầy đủ 4 mục CV 5512 (Mục tiêu, Nội dung, Sản phẩm có lời giải chi tiết cho mọi trạm, 4 bước Tổ chức thực hiện).`,
  },
];

export function getLessonPlanTemplateById(id?: string | null): LessonPlanTemplate | null {
  if (!id) return null;
  return LESSON_PLAN_TEMPLATES.find((t) => t.id === id) || null;
}

export function buildLessonPlanTemplateSkeleton(
  template: LessonPlanTemplate,
  ctx: {
    lesson: string;
    subject: string;
    grade: number;
    periods: number;
    textbook: string;
    requirement?: string;
  }
): string {
  const lessonTitle = (ctx.lesson || 'Tên bài dạy (Thầy/Cô nhập tên bài)').trim();
  const periods = Math.max(1, Number(ctx.periods) || template.recommendedPeriods || 2);
  const requirementText =
    ctx.requirement?.trim() ||
    `Trình bày và vận dụng được các kiến thức trọng tâm của bài "${lessonTitle}" theo Chương trình GDPT 2018 môn ${ctx.subject} lớp $${ctx.grade}$.`;

  const digitalRows = template.digitalCompetencies
    .map(
      (item, idx) =>
        `| NLS-${idx + 1} | ${item} | Hoạt động ${Math.min(idx + 1, template.stages.length)} |`
    )
    .join('\n');

  const stemBullets = template.stemElements.map((item) => `- **${item.split(':')[0]}:**${item.includes(':') ? item.slice(item.indexOf(':') + 1) : ''}`).join('\n');

  const activitiesMarkdown = template.stages
    .map(
      (stage, idx) => `#### ${stage.step}: ${stage.title}
**a) Mục tiêu:**
- Hoàn thành nhiệm vụ trọng tâm: ${stage.focus}
- Phát triển năng lực đặc thù môn ${ctx.subject} kết hợp chỉ báo Năng lực số và tư duy phản biện.

**b) Nội dung:**
- Nhiệm vụ học tập cụ thể dành cho học sinh (Thầy/Cô điền câu hỏi, bài tập mẫu hoặc phiếu học tập số tại đây).

**c) Sản phẩm:**
- Bảng tổng kết kiến thức / lời giải chi tiết từng bước / sản phẩm số hoặc bản thiết kế dự kiến của học sinh.

**d) Tổ chức thực hiện:**
- **Bước 1: Chuyển giao nhiệm vụ:** Giáo viên nêu tình huống, chiếu phiếu học tập (hoặc mã QR học liệu số) và hướng dẫn thao tác công cụ cụ thể.
- **Bước 2: Thực hiện nhiệm vụ:** Học sinh làm việc cá nhân ($3$–$5$ phút), sau đó thảo luận nhóm ($5$–$7$ phút); giáo viên quan sát, dự kiến sai lầm phổ biến và gợi mở kịp thời.
- **Bước 3: Báo cáo, thảo luận:** Đại diện $1$–$2$ nhóm trình bày sản phẩm; các nhóm khác nhận xét, chất vấn và đối chiếu kết quả kiểm chứng.
- **Bước 4: Kết luận, nhận định:** Giáo viên nhận xét quá trình làm việc, chuẩn hóa kiến thức trọng tâm để học sinh ghi vào vở.`
    )
    .join('\n\n---\n\n');

  const rubricSection =
    template.category === 'stem'
      ? `
---

## IV. PHỤ LỤC: RUBRIC ĐÁNH GIÁ SẢN PHẨM ${template.id.includes('steam') ? 'STEAM' : 'STEM'}

| Tiêu chí đánh giá | Mức 1 (Chưa đạt) | Mức 2 (Đạt) | Mức 3 (Khá) | Mức 4 (Tốt) | Trọng số |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Kiến thức nền (S & M)** | Chưa giải thích được nguyên lý | Nêu được nguyên lý cơ bản | Giải thích đúng, có tính toán minh họa | Vận dụng chính xác, tối ưu thông số | $30\%$ |
| **2. Thiết kế & Chế tạo (E)** | Chưa hoàn thiện sản phẩm | Hoàn thiện nhưng chưa ổn định | Đúng bản vẽ, hoạt động ổn định | Sáng tạo, chắc chắn, tối ưu vật liệu | $30\%$ |
| **3. Ứng dụng Công nghệ / Thẩm mỹ (T / A)** | Chưa ứng dụng công cụ số | Có minh họa số cơ bản | Trình bày trực quan, khoa học | Kết hợp mô phỏng số & thẩm mỹ nổi bật | $20\%$ |
| **4. Hợp tác & Thuyết trình** | Chưa rõ vai trò nhóm | Trình bày đủ ý chính | Trả lời phản biện tốt | Thuyết phục, phối hợp nhóm xuất sắc | $20\%$ |
`
      : `
---

## IV. PHỤ LỤC: BẢNG KIỂM ĐÁNH GIÁ NĂNG LỰC SỐ & AI

| Tiêu chí quan sát | Mức độ đạt được (Chưa đạt / Đạt / Tốt) | Minh chứng sản phẩm |
| :--- | :---: | :--- |
| Khai thác, kiểm chứng thông tin và học liệu số đúng nguồn | ☐ Chưa đạt · ☐ Đạt · ☐ Tốt | Phiếu ghi chú / Link tài liệu |
| Hợp tác và chia sẻ sản phẩm trên không gian số an toàn | ☐ Chưa đạt · ☐ Đạt · ☐ Tốt | Sản phẩm nhóm trên Padlet / LMS |
| Ứng dụng công cụ số / AI có phản biện và trung thực học thuật | ☐ Chưa đạt · ☐ Đạt · ☐ Tốt | Lịch sử câu lệnh & bản tự soát lỗi |
`;

  return `# KẾ HOẠCH BÀI DẠY: ${lessonTitle.toUpperCase()}

**Khung mẫu áp dụng:** ${template.name} (${template.standardRef})  
**Môn học:** ${ctx.subject} | **Lớp:** $${ctx.grade}$ | **Thời lượng:** $${periods}$ tiết  
**Bộ sách giáo khoa:** ${ctx.textbook}

---

## I. MỤC TIÊU

1. **Kiến thức:**
   - ${requirementText}
2. **Năng lực:**
   - **Năng lực chung:** Tự chủ và tự học; Giao tiếp và hợp tác; Giải quyết vấn đề và sáng tạo.
   - **Năng lực đặc thù (${ctx.subject}):** Hình thành và vận dụng kiến thức, phương pháp chuyên môn giải quyết bài toán thực tiễn.
   - **Tích hợp Năng lực số (Thông tư 02/2025/TT-BGDĐT):**

| Mã chỉ báo | Biểu hiện Năng lực số tích hợp trong bài | Hoạt động thể hiện |
| :--- | :--- | :--- |
${digitalRows}

   - **Năng lực AI:** ${template.aiIntegration}
   - **Định hướng STEM/STEAM:**
${stemBullets}
3. **Phẩm chất:** Chăm chỉ, trung thực (minh bạch học thuật khi sử dụng học liệu số & AI), trách nhiệm, nhân ái.

---

## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU

1. **Giáo viên:** Máy chiếu/ti vi tương tác, bài giảng điện tử, phiếu học tập số (**Google Forms / Quizizz / Padlet**), phần mềm mô phỏng chuyên môn (**GeoGebra / Desmos / PhET**), Rubric đánh giá.
2. **Học sinh:** SGK ${ctx.textbook}, vở ghi chép, thiết bị thông minh dùng theo nhóm (hoặc phiếu giấy dự phòng), dụng cụ thực hành/vật liệu chế tạo (nếu có).

---

## III. TIẾN TRÌNG DẠY HỌC (PHÂN BỔ $${periods}$ TIẾT)

> *Gợi ý cho Thầy/Cô: Đây là khung sườn chuẩn **${template.shortName}**. Thầy/Cô có thể bấm nút **Chỉnh sửa** để điền trực tiếp nội dung của mình, hoặc bấm **"Soạn Giáo án chuẩn công văn 5512"** ở cột bên trái để AI tự động triển khai chi tiết đầy đủ từng tiết theo đúng khung mẫu này.*

### TIẾT 1 – TIẾT $${periods}$: TRIỂN KHAI THEO KHUNG ${template.shortName.toUpperCase()}

${activitiesMarkdown}
${rubricSection}`;
}
