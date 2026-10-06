import { SemesterData } from '../knttCurriculum';

export const CHEMISTRY_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "chem12_s1_c1",
          name: "Chương I: Ester – Lipid. Xà phòng và chất giặt rửa",
          lessons: [
            { id: "chem12_s1_c1_l1", name: "Bài 1: Ester và Lipid" },
            { id: "chem12_s1_c1_l2", name: "Bài 2: Xà phòng và chất giặt rửa tổng hợp" },
            { id: "chem12_s1_c1_l3", name: "Bài 3: Ôn tập chương I" }
          ]
        },
        {
          id: "chem12_s1_c2",
          name: "Chương II: Carbohydrate",
          lessons: [
            { id: "chem12_s1_c2_l4", name: "Bài 4: Glucose và Fructose" },
            { id: "chem12_s1_c2_l5", name: "Bài 5: Saccharose và Maltose" },
            { id: "chem12_s1_c2_l6", name: "Bài 6: Tinh bột và Cellulose" },
            { id: "chem12_s1_c2_l7", name: "Bài 7: Ôn tập chương II" }
          ]
        },
        {
          id: "chem12_s1_c3",
          name: "Chương III: Hợp chất chứa Nitrogen",
          lessons: [
            { id: "chem12_s1_c3_l8", name: "Bài 8: Amine" },
            { id: "chem12_s1_c3_l9", name: "Bài 9: Amino acid và Peptide" },
            { id: "chem12_s1_c3_l10", name: "Bài 10: Protein và Enzyme" },
            { id: "chem12_s1_c3_l11", name: "Bài 11: Ôn tập chương III" }
          ]
        },
        {
          id: "chem12_s1_c4",
          name: "Chương IV: Polymer",
          lessons: [
            { id: "chem12_s1_c4_l12", name: "Bài 12: Đại cương về Polymer" },
            { id: "chem12_s1_c4_l13", name: "Bài 13: Vật liệu Polymer (Chất dẻo, tơ, cao su, keo dán)" },
            { id: "chem12_s1_c4_l14", name: "Bài 14: Ôn tập chương IV" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "chem12_s2_c5",
          name: "Chương V: Pin điện và điện phân",
          lessons: [
            { id: "chem12_s2_c5_l15", name: "Bài 15: Thế điện cực và nguồn điện hóa học" },
            { id: "chem12_s2_c5_l16", name: "Bài 16: Điện phân (Điện phân nóng chảy và dung dịch)" },
            { id: "chem12_s2_c5_l17", name: "Bài 17: Ôn tập chương V" }
          ]
        },
        {
          id: "chem12_s2_c6",
          name: "Chương VI: Đại cương về kim loại",
          lessons: [
            { id: "chem12_s2_c6_l18", name: "Bài 18: Cấu tạo và tính chất vật lí, hóa học của kim loại" },
            { id: "chem12_s2_c6_l19", name: "Bài 19: Hợp kim và sự ăn mòn kim loại" },
            { id: "chem12_s2_c6_l20", name: "Bài 20: Tách kim loại và phương pháp tái chế kim loại" },
            { id: "chem12_s2_c6_l21", name: "Bài 21: Ôn tập chương VI" }
          ]
        },
        {
          id: "chem12_s2_c7",
          name: "Chương VII: Kim loại nhóm IA, IIA và Kim loại chuyển tiếp",
          lessons: [
            { id: "chem12_s2_c7_l22", name: "Bài 22: Nguyên tố nhóm IA (Kim loại kiềm)" },
            { id: "chem12_s2_c7_l23", name: "Bài 23: Nguyên tố nhóm IIA (Kim loại kiềm thổ)" },
            { id: "chem12_s2_c7_l24", name: "Bài 24: Đại cương về kim loại chuyển tiếp dãy thứ nhất và phức chất" },
            { id: "chem12_s2_c7_l25", name: "Bài 25: Ôn tập chương VII và tổng kết hóa học phổ thông" }
          ]
        }
      ]
    }
  },
  11: {
    semester_1: {
      chapters: [
        {
          id: "chem11_s1_c1",
          name: "Chương I: Cân bằng hóa học",
          lessons: [
            { id: "chem11_s1_c1_l1", name: "Bài 1: Khái niệm về cân bằng hóa học" },
            { id: "chem11_s1_c1_l2", name: "Bài 2: Cân bằng trong dung dịch nước (Thuyết Brønsted – Lowry, pH, chuẩn độ)" },
            { id: "chem11_s1_c1_l3", name: "Bài 3: Ôn tập chương I" }
          ]
        },
        {
          id: "chem11_s1_c2",
          name: "Chương II: Nitrogen và Sulfur",
          lessons: [
            { id: "chem11_s1_c2_l4", name: "Bài 4: Đơn chất Nitrogen" },
            { id: "chem11_s1_c2_l5", name: "Bài 5: Ammonia và một số hợp chất ammonium" },
            { id: "chem11_s1_c2_l6", name: "Bài 6: Một số hợp chất của nitrogen với oxygen (Nitric acid, hiện tượng mưa acid)" },
            { id: "chem11_s1_c2_l7", name: "Bài 7: Sulfur và sulfur dioxide" },
            { id: "chem11_s1_c2_l8", name: "Bài 8: Sulfuric acid và muối sulfate" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "chem11_s2_c3",
          name: "Chương III: Đại cương về hóa học hữu cơ & Hydrocarbon",
          lessons: [
            { id: "chem11_s2_c3_l9", name: "Bài 9: Hợp chất hữu cơ và hóa học hữu cơ" },
            { id: "chem11_s2_c3_l10", name: "Bài 10: Công thức phân tử hợp chất hữu cơ" },
            { id: "chem11_s2_c3_l11", name: "Bài 11: Alkane" },
            { id: "chem11_s2_c3_l12", name: "Bài 12: Alkene và Alkyne" },
            { id: "chem11_s2_c3_l13", name: "Bài 13: Arene (Hydrocarbon thơm)" }
          ]
        },
        {
          id: "chem11_s2_c4",
          name: "Chương IV: Dẫn xuất halogen – Alcohol – Phenol & Hợp chất carbonyl",
          lessons: [
            { id: "chem11_s2_c4_l14", name: "Bài 14: Dẫn xuất halogen" },
            { id: "chem11_s2_c4_l15", name: "Bài 15: Alcohol" },
            { id: "chem11_s2_c4_l16", name: "Bài 16: Phenol" },
            { id: "chem11_s2_c4_l17", name: "Bài 17: Hợp chất carbonyl (Aldehyde và Ketone)" },
            { id: "chem11_s2_c4_l18", name: "Bài 18: Carboxylic acid" }
          ]
        }
      ]
    }
  },
  10: {
    semester_1: {
      chapters: [
        {
          id: "chem10_s1_c1",
          name: "Chương I: Cấu tạo nguyên tử",
          lessons: [
            { id: "chem10_s1_c1_l1", name: "Bài 1: Thành phần của nguyên tử" },
            { id: "chem10_s1_c1_l2", name: "Bài 2: Hạt nhân nguyên tử, nguyên tố hóa học và đồng vị" },
            { id: "chem10_s1_c1_l3", name: "Bài 3: Cấu trúc lớp vỏ electron nguyên tử" }
          ]
        },
        {
          id: "chem10_s1_c2",
          name: "Chương II: Bảng tuần hoàn các nguyên tố hóa học",
          lessons: [
            { id: "chem10_s1_c2_l4", name: "Bài 4: Cấu tạo bảng tuần hoàn các nguyên tố hóa học" },
            { id: "chem10_s1_c2_l5", name: "Bài 5: Xu hướng biến đổi tính chất kim loại, phi kim, bán kính và độ âm điện" },
            { id: "chem10_s1_c2_l6", name: "Bài 6: Định luật tuần hoàn và ý nghĩa của bảng tuần hoàn" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "chem10_s2_c3",
          name: "Chương III: Liên kết hóa học & Phản ứng oxi hóa – khử",
          lessons: [
            { id: "chem10_s2_c3_l7", name: "Bài 7: Liên kết ion" },
            { id: "chem10_s2_c3_l8", name: "Bài 8: Liên kết cộng hóa trị" },
            { id: "chem10_s2_c3_l9", name: "Bài 9: Liên kết hydrogen và tương tác van der Waals" },
            { id: "chem10_s2_c3_l10", name: "Bài 10: Phản ứng oxi hóa – khử và số oxi hóa" }
          ]
        },
        {
          id: "chem10_s2_c4",
          name: "Chương IV: Năng lượng hóa học, tốc độ phản ứng & Nhóm Halogen",
          lessons: [
            { id: "chem10_s2_c4_l11", name: "Bài 11: Phản ứng tỏa nhiệt, thu nhiệt và biến thiên enthalpy" },
            { id: "chem10_s2_c4_l12", name: "Bài 12: Tốc độ phản ứng hóa học và các yếu tố ảnh hưởng" },
            { id: "chem10_s2_c4_l13", name: "Bài 13: Đơn chất nhóm VIIA (Halogen)" },
            { id: "chem10_s2_c4_l14", name: "Bài 14: Hydrogen halide và một số phản ứng của ion halide" }
          ]
        }
      ]
    }
  }
};
