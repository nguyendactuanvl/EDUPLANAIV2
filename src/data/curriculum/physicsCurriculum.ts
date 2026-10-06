import { SemesterData } from '../knttCurriculum';

export const PHYSICS_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "phy12_s1_c1",
          name: "Chương I: Vật lí nhiệt",
          lessons: [
            { id: "phy12_s1_c1_l1", name: "Bài 1: Cấu trúc của chất. Sự chuyển thể" },
            { id: "phy12_s1_c1_l2", name: "Bài 2: Nội năng. Định luật I của nhiệt động lực học" },
            { id: "phy12_s1_c1_l3", name: "Bài 3: Nhiệt độ. Thang nhiệt độ – Nhiệt kế" },
            { id: "phy12_s1_c1_l4", name: "Bài 4: Nhiệt dung riêng, nhiệt nóng chảy riêng, nhiệt hóa hơi riêng" },
            { id: "phy12_s1_c1_l5", name: "Bài 5: Thực hành: Đo nhiệt dung riêng của nước" },
            { id: "phy12_s1_c1_l6", name: "Bài 6: Thực hành: Đo nhiệt nóng chảy riêng của nước đá" },
            { id: "phy12_s1_c1_l7", name: "Bài 7: Thực hành: Đo nhiệt hóa hơi riêng của nước" }
          ]
        },
        {
          id: "phy12_s1_c2",
          name: "Chương II: Khí lí tưởng",
          lessons: [
            { id: "phy12_s1_c2_l8", name: "Bài 8: Mô hình động học phân tử chất khí" },
            { id: "phy12_s1_c2_l9", name: "Bài 9: Định luật Boyle" },
            { id: "phy12_s1_c2_l10", name: "Bài 10: Định luật Charles" },
            { id: "phy12_s1_c2_l11", name: "Bài 11: Phương trình trạng thái của khí lí tưởng" },
            { id: "phy12_s1_c2_l12", name: "Bài 12: Áp suất khí theo mô hình động học phân tử chất khí" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "phy12_s2_c3",
          name: "Chương III: Từ trường & Cảm ứng điện từ",
          lessons: [
            { id: "phy12_s2_c3_l13", name: "Bài 13: Từ trường. Cảm ứng từ" },
            { id: "phy12_s2_c3_l14", name: "Bài 14: Lực từ tác dụng lên đoạn dây dẫn mang dòng điện" },
            { id: "phy12_s2_c3_l15", name: "Bài 15: Cảm ứng điện từ. Từ thông. Định luật Faraday" },
            { id: "phy12_s2_c3_l16", name: "Bài 16: Tự cảm. Hiện tượng tự cảm" },
            { id: "phy12_s2_c3_l17", name: "Bài 17: Đại cương về dòng điện xoay chiều và máy biến áp" }
          ]
        },
        {
          id: "phy12_s2_c4",
          name: "Chương IV: Vật lí hạt nhân",
          lessons: [
            { id: "phy12_s2_c4_l18", name: "Bài 18: Cấu trúc hạt nhân. Độ hụt khối và năng lượng liên kết" },
            { id: "phy12_s2_c4_l19", name: "Bài 19: Phóng xạ và định luật phóng xạ" },
            { id: "phy12_s2_c4_l20", name: "Bài 20: Phản ứng phân hạch và phản ứng nhiệt hạch" },
            { id: "phy12_s2_c4_l21", name: "Bài 21: Ứng dụng của năng lượng hạt nhân và an toàn phóng xạ" }
          ]
        }
      ]
    }
  },
  11: {
    semester_1: {
      chapters: [
        {
          id: "phy11_s1_c1",
          name: "Chương I: Dao động",
          lessons: [
            { id: "phy11_s1_c1_l1", name: "Bài 1: Dao động điều hòa" },
            { id: "phy11_s1_c1_l2", name: "Bài 2: Mô tả dao động điều hòa (Li độ, vận tốc, gia tốc)" },
            { id: "phy11_s1_c1_l3", name: "Bài 3: Vận tốc, gia tốc trong dao động điều hòa" },
            { id: "phy11_s1_c1_l4", name: "Bài 4: Năng lượng trong dao động điều hòa (Động năng, thế năng, cơ năng)" },
            { id: "phy11_s1_c1_l5", name: "Bài 5: Dao động tắt dần, dao động cưỡng bức và hiện tượng cộng hưởng" }
          ]
        },
        {
          id: "phy11_s1_c2",
          name: "Chương II: Sóng",
          lessons: [
            { id: "phy11_s1_c2_l6", name: "Bài 6: Sóng và sự truyền sóng" },
            { id: "phy11_s1_c2_l7", name: "Bài 7: Sóng điện từ và sóng ánh sáng" },
            { id: "phy11_s1_c2_l8", name: "Bài 8: Giao thoa sóng và sóng dừng" },
            { id: "phy11_s1_c2_l9", name: "Bài 9: Sóng dừng trên dây và trong ống khí" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "phy11_s2_c3",
          name: "Chương III: Điện trường",
          lessons: [
            { id: "phy11_s2_c3_l10", name: "Bài 10: Lực tương tác tĩnh điện (Định luật Coulomb)" },
            { id: "phy11_s2_c3_l11", name: "Bài 11: Điện trường và cường độ điện trường" },
            { id: "phy11_s2_c3_l12", name: "Bài 12: Điện thế và hiệu điện thế" },
            { id: "phy11_s2_c3_l13", name: "Bài 13: Tụ điện và năng lượng điện trường" }
          ]
        },
        {
          id: "phy11_s2_c4",
          name: "Chương IV: Dòng điện không đổi & Mạch điện",
          lessons: [
            { id: "phy11_s2_c4_l14", name: "Bài 14: Cường độ dòng điện và điện trở" },
            { id: "phy11_s2_c4_l15", name: "Bài 15: Nguồn điện, suất điện động và điện trở trong" },
            { id: "phy11_s2_c4_l16", name: "Bài 16: Định luật Ohm cho toàn mạch" },
            { id: "phy11_s2_c4_l17", name: "Bài 17: Năng lượng điện và công suất điện" }
          ]
        }
      ]
    }
  },
  10: {
    semester_1: {
      chapters: [
        {
          id: "phy10_s1_c1",
          name: "Chương I: Mở đầu",
          lessons: [
            { id: "phy10_s1_c1_l1", name: "Bài 1: Làm quen với Vật lí" },
            { id: "phy10_s1_c1_l2", name: "Bài 2: Các quy tắc an toàn trong phòng thực hành Vật lí" },
            { id: "phy10_s1_c1_l3", name: "Bài 3: Thực hành tính sai số trong phép đo và xử lí số liệu" }
          ]
        },
        {
          id: "phy10_s1_c2",
          name: "Chương II: Động học",
          lessons: [
            { id: "phy10_s1_c2_l4", name: "Bài 4: Độ dịch chuyển và quãng đường đi được" },
            { id: "phy10_s1_c2_l5", name: "Bài 5: Tốc độ và vận tốc" },
            { id: "phy10_s1_c2_l6", name: "Bài 6: Chuyển động thẳng biến đổi đều" },
            { id: "phy10_s1_c2_l7", name: "Bài 7: Đồ thị độ dịch chuyển – thời gian và vận tốc – thời gian" },
            { id: "phy10_s1_c2_l8", name: "Bài 8: Rơi tự do và chuyển động ném" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "phy10_s2_c3",
          name: "Chương III: Động lực học (Các lực trong tự nhiên & Định luật Newton)",
          lessons: [
            { id: "phy10_s2_c3_l9", name: "Bài 9: Tổng hợp và phân tích lực" },
            { id: "phy10_s2_c3_l10", name: "Bài 10: Ba định luật Newton về chuyển động" },
            { id: "phy10_s2_c3_l11", name: "Bài 11: Trọng lực, lực căng dây và lực ma sát" },
            { id: "phy10_s2_c3_l12", name: "Bài 12: Lực cản của chất lưu và lực đẩy Archimedes" }
          ]
        },
        {
          id: "phy10_s2_c4",
          name: "Chương IV: Năng lượng, công và công suất & Chuyển động tròn",
          lessons: [
            { id: "phy10_s2_c4_l13", name: "Bài 13: Công cơ học và công suất" },
            { id: "phy10_s2_c4_l14", name: "Bài 14: Động năng, thế năng và bảo toàn cơ năng" },
            { id: "phy10_s2_c4_l15", name: "Bài 15: Hiệu suất" },
            { id: "phy10_s2_c4_l16", name: "Bài 16: Động lượng và định luật bảo toàn động lượng" },
            { id: "phy10_s2_c4_l17", name: "Bài 17: Động học và động lực học của chuyển động tròn đều" }
          ]
        }
      ]
    }
  }
};
