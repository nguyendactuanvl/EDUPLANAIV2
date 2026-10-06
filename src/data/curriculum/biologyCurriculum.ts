import { SemesterData } from '../knttCurriculum';

export const BIOLOGY_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "bio12_s1_c1",
          name: "Chương I: Di truyền phân tử và di truyền nhiễm sắc thể",
          lessons: [
            { id: "bio12_s1_c1_l1", name: "Bài 1: Gene, hệ gene và quá trình truyền đạt thông tin di truyền" },
            { id: "bio12_s1_c1_l2", name: "Bài 2: Đột biến gene" },
            { id: "bio12_s1_c1_l3", name: "Bài 3: Nhiễm sắc thể và đột biến cấu trúc nhiễm sắc thể" },
            { id: "bio12_s1_c1_l4", name: "Bài 4: Đột biến số lượng nhiễm sắc thể" },
            { id: "bio12_s1_c1_l5", name: "Bài 5: Học thuyết di truyền của Mendel" },
            { id: "bio12_s1_c1_l6", name: "Bài 6: Tương tác gene và tác động đa hiệu của gene" },
            { id: "bio12_s1_c1_l7", name: "Bài 7: Di truyền liên kết và hoán vị gene" },
            { id: "bio12_s1_c1_l8", name: "Bài 8: Di truyền liên kết giới tính và di truyền ngoài nhân" },
            { id: "bio12_s1_c1_l9", name: "Bài 9: Mối quan hệ giữa kiểu gene, môi trường và kiểu hình" },
            { id: "bio12_s1_c1_l10", name: "Bài 10: Thực hành: Quan sát tiêu bản nhiễm sắc thể và đột biến nhiễm sắc thể" }
          ]
        },
        {
          id: "bio12_s1_c2",
          name: "Chương II: Di truyền quần thể và di truyền học người",
          lessons: [
            { id: "bio12_s1_c2_l11", name: "Bài 11: Di truyền quần thể (Cấu trúc di truyền và định luật Hardy - Weinberg)" },
            { id: "bio12_s1_c2_l12", name: "Bài 12: Di truyền học người (Bệnh, tật di truyền và di truyền ung thư)" },
            { id: "bio12_s1_c2_l13", name: "Bài 13: Ứng dụng công nghệ gene và di truyền học trong chọn giống" }
          ]
        },
        {
          id: "bio12_s1_c3",
          name: "Chương III: Bằng chứng và cơ chế tiến hóa",
          lessons: [
            { id: "bio12_s1_c3_l14", name: "Bài 14: Các bằng chứng tiến hóa (Giải phẫu, phôi sinh, địa lí sinh học, phân tử)" },
            { id: "bio12_s1_c3_l15", name: "Bài 15: Học thuyết tiến hóa cổ điển của Lamark và Darwin" },
            { id: "bio12_s1_c3_l16", name: "Bài 16: Học thuyết tiến hóa tổng hợp hiện đại và các nhân tố tiến hóa" },
            { id: "bio12_s1_c3_l17", name: "Bài 17: Loài và các cơ chế cách li hình thành loài mới" },
            { id: "bio12_s1_c3_l18", name: "Bài 18: Sự phát sinh và phát triển sự sống trên Trái Đất qua các đại địa chất" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "bio12_s2_c4",
          name: "Chương IV: Sinh thái học cá thể và quần thể sinh vật",
          lessons: [
            { id: "bio12_s2_c4_l19", name: "Bài 19: Môi trường sống và các nhân tố sinh thái" },
            { id: "bio12_s2_c4_l20", name: "Bài 20: Sinh thái học quần thể sinh vật (Khái niệm, các đặc trưng cơ bản)" },
            { id: "bio12_s2_c4_l21", name: "Bài 21: Tăng trưởng của quần thể và các yếu tố giới hạn" },
            { id: "bio12_s2_c4_l22", name: "Bài 22: Biến động số lượng cá thể trong quần thể sinh vật" }
          ]
        },
        {
          id: "bio12_s2_c5",
          name: "Chương V: Quần xã sinh vật và hệ sinh thái",
          lessons: [
            { id: "bio12_s2_c5_l23", name: "Bài 23: Quần xã sinh vật và các đặc trưng cơ bản của quần xã" },
            { id: "bio12_s2_c5_l24", name: "Bài 24: Quan hệ giữa các loài trong quần xã và diễn thế sinh thái" },
            { id: "bio12_s2_c5_l25", name: "Bài 25: Hệ sinh thái, chuỗi thức ăn, lưới thức ăn và bậc dinh dưỡng" },
            { id: "bio12_s2_c5_l26", name: "Bài 26: Chu trình sinh địa hóa và chu trình carbon, nitrogen, nước" },
            { id: "bio12_s2_c5_l27", name: "Bài 27: Trao đổi vật chất và chuyển hóa năng lượng trong hệ sinh thái (Tháp sinh thái)" },
            { id: "bio12_s2_c5_l28", name: "Bài 28: Sinh quyển, đa dạng sinh học và phát triển bền vững" },
            { id: "bio12_s2_c5_l29", name: "Bài 29: Thực hành: Tìm hiểu hệ sinh thái địa phương và bảo vệ môi trường" }
          ]
        }
      ]
    }
  },
  11: {
    semester_1: {
      chapters: [
        {
          id: "bio11_s1_c1",
          name: "Chương I: Trao đổi chất và chuyển hóa năng lượng ở sinh vật",
          lessons: [
            { id: "bio11_s1_c1_l1", name: "Bài 1: Khái quát về trao đổi chất và chuyển hóa năng lượng" },
            { id: "bio11_s1_c1_l2", name: "Bài 2: Trao đổi nước và khoáng ở thực vật" },
            { id: "bio11_s1_c1_l3", name: "Bài 3: Thực hành: Trao đổi nước và khoáng ở thực vật" },
            { id: "bio11_s1_c1_l4", name: "Bài 4: Quang hợp ở thực vật (Pha sáng, pha tối C3, C4, CAM)" },
            { id: "bio11_s1_c1_l5", name: "Bài 5: Hô hấp ở thực vật" },
            { id: "bio11_s1_c1_l6", name: "Bài 6: Dinh dưỡng và tiêu hóa ở động vật" },
            { id: "bio11_s1_c1_l7", name: "Bài 7: Hô hấp ở động vật" },
            { id: "bio11_s1_c1_l8", name: "Bài 8: Hệ tuần hoàn ở động vật và huyết áp" },
            { id: "bio11_s1_c1_l9", name: "Bài 9: Miễn dịch ở người và động vật" },
            { id: "bio11_s1_c1_l10", name: "Bài 10: Bài tiết và cân bằng nội môi" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "bio11_s2_c2",
          name: "Chương II: Cảm ứng ở sinh vật",
          lessons: [
            { id: "bio11_s2_c2_l11", name: "Bài 11: Khái quát về cảm ứng ở sinh vật" },
            { id: "bio11_s2_c2_l12", name: "Bài 12: Cảm ứng ở thực vật (Hướng động và ứng động)" },
            { id: "bio11_s2_c2_l13", name: "Bài 13: Cảm ứng ở động vật và hệ thần kinh" },
            { id: "bio11_s2_c2_l14", name: "Bài 14: Tập tính ở động vật và ứng dụng" }
          ]
        },
        {
          id: "bio11_s2_c3",
          name: "Chương III: Sinh trưởng, phát triển và sinh sản ở sinh vật",
          lessons: [
            { id: "bio11_s2_c3_l15", name: "Bài 15: Sinh trưởng và phát triển ở thực vật (Hormone thực vật)" },
            { id: "bio11_s2_c3_l16", name: "Bài 16: Sinh trưởng và phát triển ở động vật" },
            { id: "bio11_s2_c3_l17", name: "Bài 17: Sinh sản vô tính ở thực vật" },
            { id: "bio11_s2_c3_l18", name: "Bài 18: Sinh sản hữu tính ở thực vật" },
            { id: "bio11_s2_c3_l19", name: "Bài 19: Sinh sản ở động vật và điều hòa sinh sản" }
          ]
        }
      ]
    }
  },
  10: {
    semester_1: {
      chapters: [
        {
          id: "bio10_s1_c1",
          name: "Chương I: Mở đầu & Sinh học tế bào",
          lessons: [
            { id: "bio10_s1_c1_l1", name: "Bài 1: Giới thiệu khái quát môn Sinh học" },
            { id: "bio10_s1_c1_l2", name: "Bài 2: Phương pháp nghiên cứu và học tập môn Sinh học" },
            { id: "bio10_s1_c1_l3", name: "Bài 3: Các cấp độ tổ chức của thế giới sống" },
            { id: "bio10_s1_c1_l4", name: "Bài 4: Các nguyên tố hóa học và nước trong tế bào" },
            { id: "bio10_s1_c1_l5", name: "Bài 5: Các phân tử sinh học (Carbohydrate, Lipid, Protein, Nucleic acid)" },
            { id: "bio10_s1_c1_l6", name: "Bài 6: Cấu trúc tế bào nhân sơ" },
            { id: "bio10_s1_c1_l7", name: "Bài 7: Cấu trúc tế bào nhân thực (Nhân, ribosome, màng sinh chất, bào quan)" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "bio10_s2_c2",
          name: "Chương II: Trao đổi chất qua màng tế bào & Chuyển hóa năng lượng",
          lessons: [
            { id: "bio10_s2_c2_l8", name: "Bài 8: Vận chuyển các chất qua màng sinh chất" },
            { id: "bio10_s2_c2_l9", name: "Bài 9: Sự chuyển hóa năng lượng và enzyme" },
            { id: "bio10_s2_c2_l10", name: "Bài 10: Tổng hợp và phân giải các chất trong tế bào" }
          ]
        },
        {
          id: "bio10_s2_c3",
          name: "Chương III: Chu kì tế bào, phân bào & Vi sinh vật, virus",
          lessons: [
            { id: "bio10_s2_c3_l11", name: "Bài 11: Chu kì tế bào và nguyên phân" },
            { id: "bio10_s2_c3_l12", name: "Bài 12: Giảm phân và thụ tinh" },
            { id: "bio10_s2_c3_l13", name: "Bài 13: Khái quát về vi sinh vật và dinh dưỡng vi sinh vật" },
            { id: "bio10_s2_c3_l14", name: "Bài 14: Sinh trưởng và sinh sản của vi sinh vật" },
            { id: "bio10_s2_c3_l15", name: "Bài 15: Cấu trúc và chu trình nhân lên của virus" }
          ]
        }
      ]
    }
  }
};
