import { SemesterData } from '../knttCurriculum';

export const HISTORY_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "his12_s1_c1",
          name: "Chủ đề 1: Thế giới trong và sau Chiến tranh lạnh",
          lessons: [
            { id: "his12_s1_c1_l1", name: "Bài 1: Trật tự thế giới hai cực I-an-ta và quan hệ quốc tế thời kì Chiến tranh lạnh" },
            { id: "his12_s1_c1_l2", name: "Bài 2: Trật tự thế giới sau Chiến tranh lạnh và xu thế đa cực" },
            { id: "his12_s1_c1_l3", name: "Bài 3: Sự hình thành, phát triển và vị thế quốc tế của Liên hợp quốc" }
          ]
        },
        {
          id: "his12_s1_c2",
          name: "Chủ đề 2: ASEAN: Những chặng đường lịch sử",
          lessons: [
            { id: "his12_s1_c2_l4", name: "Bài 4: Sự ra đời và phát triển của Hiệp hội các quốc gia Đông Nam Á (ASEAN)" },
            { id: "his12_s1_c2_l5", name: "Bài 5: Cộng đồng ASEAN: Từ ý tưởng đến hiện thực" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "his12_s2_c3",
          name: "Chủ đề 3: Cách mạng tháng Tám năm 1945 và cuộc kháng chiến bảo vệ Tổ quốc",
          lessons: [
            { id: "his12_s2_c3_l6", name: "Bài 6: Cách mạng tháng Tám năm 1945 và thành lập nước Việt Nam Dân chủ Cộng hòa" },
            { id: "his12_s2_c3_l7", name: "Bài 7: Cuộc kháng chiến chống thực dân Pháp (1945 - 1954)" },
            { id: "his12_s2_c3_l8", name: "Bài 8: Cuộc kháng chiến chống Mỹ, cứu nước (1954 - 1975)" }
          ]
        },
        {
          id: "his12_s2_c4",
          name: "Chủ đề 4: Công cuộc Đổi mới ở Việt Nam từ năm 1986 đến nay",
          lessons: [
            { id: "his12_s2_c4_l9", name: "Bài 9: Bối cảnh lịch sử và nội dung đường lối Đổi mới" },
            { id: "his12_s2_c4_l10", name: "Bài 10: Thành tựu và bài học kinh nghiệm của công cuộc Đổi mới" }
          ]
        }
      ]
    }
  }
};

export const GEOGRAPHY_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "geo12_s1_c1",
          name: "Chủ đề 1: Địa lí tự nhiên & Dân cư Việt Nam",
          lessons: [
            { id: "geo12_s1_c1_l1", name: "Bài 1: Vị trí địa lí và phạm vi lãnh thổ Việt Nam" },
            { id: "geo12_s1_c1_l2", name: "Bài 2: Thiên nhiên nhiệt đới ẩm gió mùa" },
            { id: "geo12_s1_c1_l3", name: "Bài 3: Sự phân hóa đa dạng của thiên nhiên Việt Nam" },
            { id: "geo12_s1_c1_l4", name: "Bài 4: Vấn đề sử dụng hợp lí tài nguyên thiên nhiên và bảo vệ môi trường" },
            { id: "geo12_s1_c1_l5", name: "Bài 5: Dân số, dân tộc và vấn đề phân bố dân cư ở Việt Nam" },
            { id: "geo12_s1_c1_l6", name: "Bài 6: Lao động, việc làm và đô thị hóa ở Việt Nam" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "geo12_s2_c2",
          name: "Chủ đề 2: Địa lí các ngành kinh tế & Các vùng kinh tế trọng điểm",
          lessons: [
            { id: "geo12_s2_c2_l7", name: "Bài 7: Chuyển dịch cơ cấu kinh tế ở Việt Nam" },
            { id: "geo12_s2_c2_l8", name: "Bài 8: Vấn đề phát triển nông nghiệp, lâm nghiệp và thủy sản" },
            { id: "geo12_s2_c2_l9", name: "Bài 9: Cơ cấu và sự phát triển của ngành công nghiệp" },
            { id: "geo12_s2_c2_l10", name: "Bài 10: Phát triển các ngành dịch vụ (Giao thông vận tải, bưu chính viễn thông, thương mại, du lịch)" },
            { id: "geo12_s2_c2_l11", name: "Bài 11: Vấn đề khai thác thế mạnh ở Trung du và miền núi Bắc Bộ, Đồng bằng sông Hồng" },
            { id: "geo12_s2_c2_l12", name: "Bài 12: Vấn đề phát triển kinh tế - xã hội ở Duyên hải Nam Trung Bộ, Tây Nguyên, Đông Nam Bộ, Đồng bằng sông Cửu Long" },
            { id: "geo12_s2_c2_l13", name: "Bài 13: Phát triển kinh tế biển đảo và củng cố quốc phòng an ninh" }
          ]
        }
      ]
    }
  }
};

export const LAW_ECON_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "law12_s1_c1",
          name: "Chủ đề 1: Tăng trưởng, phát triển kinh tế & Hội nhập kinh tế quốc tế",
          lessons: [
            { id: "law12_s1_c1_l1", name: "Bài 1: Tăng trưởng và phát triển kinh tế" },
            { id: "law12_s1_c1_l2", name: "Bài 2: Hội nhập kinh tế quốc tế" },
            { id: "law12_s1_c1_l3", name: "Bài 3: Bảo hiểm và an sinh xã hội" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "law12_s2_c2",
          name: "Chủ đề 2: Quyền và nghĩa vụ của công dân trước pháp luật",
          lessons: [
            { id: "law12_s2_c2_l4", name: "Bài 4: Quyền và nghĩa vụ của công dân về bảo vệ, chăm sóc sức khỏe và an sinh xã hội" },
            { id: "law12_s2_c2_l5", name: "Bài 5: Quyền và nghĩa vụ của công dân trong hôn nhân và gia đình" },
            { id: "law12_s2_c2_l6", name: "Bài 6: Quyền và nghĩa vụ của công dân trong bảo vệ môi trường và di sản văn hóa" },
            { id: "law12_s2_c2_l7", name: "Bài 7: Pháp luật quốc tế và pháp luật Việt Nam về quyền con người" }
          ]
        }
      ]
    }
  }
};
