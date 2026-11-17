export interface Lesson {
  id: string;
  name: string;
}

export interface Chapter {
  id: string;
  name: string;
  lessons: Lesson[];
}

export interface SemesterData {
  chapters: Chapter[];
}

export interface GradeData {
  [semester: string]: SemesterData;
}

export interface CurriculumData {
  [grade: string]: GradeData;
}

export const KNTT_CURRICULUM: CurriculumData = {
  grade_1: {
    semester_1: {
      chapters: [
        {
          id: "g1_s1_c1",
          name: "Chương I: Các số từ 0 đến 10",
          lessons: [
            { id: "g1_s1_c1_l1", name: "Bài 1: Nhận biết các số từ 1 đến 5" },
            { id: "g1_s1_c1_l2", name: "Bài 2: Nhận biết số 0 và các số từ 6 đến 10" },
            { id: "g1_s1_c1_l3", name: "Bài 3: So sánh các số trong phạm vi 10" }
          ]
        },
        {
          id: "g1_s1_c2",
          name: "Chương II: Phép cộng, phép trừ trong phạm vi 10",
          lessons: [
            { id: "g1_s1_c2_l1", name: "Bài 4: Phép cộng trong phạm vi 10" },
            { id: "g1_s1_c2_l2", name: "Bài 5: Phép trừ trong phạm vi 10" },
            { id: "g1_s1_c2_l3", name: "Bài 6: Luyện tập phép cộng và phép trừ" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g1_s2_c3",
          name: "Chương III: Các số trong phạm vi 100",
          lessons: [
            { id: "g1_s2_c3_l1", name: "Bài 7: Các số đến 20 và so sánh" },
            { id: "g1_s2_c3_l2", name: "Bài 8: Các số tròn chục và số có hai chữ số" },
            { id: "g1_s2_c3_l3", name: "Bài 9: Độ dài và đo độ dài cơ bản" }
          ]
        },
        {
          id: "g1_s2_c4",
          name: "Chương IV: Phép cộng, phép trừ trong phạm vi 100",
          lessons: [
            { id: "g1_s2_c4_l1", name: "Bài 10: Phép cộng không nhớ trong phạm vi 100" },
            { id: "g1_s2_c4_l2", name: "Bài 11: Phép trừ không nhớ trong phạm vi 100" },
            { id: "g1_s2_c4_l3", name: "Bài 12: Xem đồng hồ và lịch học sinh" }
          ]
        }
      ]
    }
  },
  grade_2: {
    semester_1: {
      chapters: [
        {
          id: "g2_s1_c1",
          name: "Chương I: Ôn tập và bổ sung",
          lessons: [
            { id: "g2_s1_c1_l1", name: "Bài 1: Ôn tập các số trong phạm vi 100" },
            { id: "g2_s1_c1_l2", name: "Bài 2: Tia số và số liền trước, số liền sau" },
            { id: "g2_s1_c1_l3", name: "Bài 3: Phép cộng, phép trừ có nhớ trong phạm vi 20" }
          ]
        },
        {
          id: "g2_s1_c2",
          name: "Chương II: Phép cộng, phép trừ trong phạm vi 100",
          lessons: [
            { id: "g2_s1_c2_l1", name: "Bài 4: Phép cộng có nhớ trong phạm vi 100" },
            { id: "g2_s1_c2_l2", name: "Bài 5: Phép trừ có nhớ trong phạm vi 100" },
            { id: "g2_s1_c2_l3", name: "Bài 6: Đề-xi-mét, Mét và Ki-lô-gam" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g2_s2_c3",
          name: "Chương III: Phép nhân và phép chia",
          lessons: [
            { id: "g2_s2_c3_l1", name: "Bài 7: Phép nhân và bảng nhân 2, nhân 5" },
            { id: "g2_s2_c3_l2", name: "Bài 8: Phép chia và bảng chia 2, chia 5" },
            { id: "g2_s2_c3_l3", name: "Bài 9: Giờ, phút và xem lịch" }
          ]
        },
        {
          id: "g2_s2_c4",
          name: "Chương IV: Các số đến 1000",
          lessons: [
            { id: "g2_s2_c4_l1", name: "Bài 10: Đơn vị, chục, trăm, nghìn" },
            { id: "g2_s2_c4_l2", name: "Bài 11: So sánh các số trong phạm vi 1000" },
            { id: "g2_s2_c4_l3", name: "Bài 12: Phép cộng, phép trừ không nhớ trong phạm vi 1000" }
          ]
        }
      ]
    }
  },
  grade_3: {
    semester_1: {
      chapters: [
        {
          id: "g3_s1_c1",
          name: "Chương I: Ôn tập và bổ sung",
          lessons: [
            { id: "g3_s1_c1_l1", name: "Bài 1: Ôn tập phép cộng, trừ trong phạm vi 1000" },
            { id: "g3_s1_c1_l2", name: "Bài 2: Ôn tập bảng nhân 2, 5 và bảng chia 2, 5" },
            { id: "g3_s1_c1_l3", name: "Bài 3: Tìm thành phần chưa biết của phép tính" }
          ]
        },
        {
          id: "g3_s1_c2",
          name: "Chương II: Phép nhân, phép chia trong phạm vi 1000",
          lessons: [
            { id: "g3_s1_c2_l1", name: "Bài 4: Bảng nhân 3, 4, 6, 7, 8, 9" },
            { id: "g3_s1_c2_l2", name: "Bài 5: Bảng chia 3, 4, 6, 7, 8, 9" },
            { id: "g3_s1_c2_l3", name: "Bài 6: Gấp một số lên nhiều lần, giảm đi nhiều lần" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g3_s2_c3",
          name: "Chương III: Các số trong phạm vi 100 000",
          lessons: [
            { id: "g3_s2_c3_l1", name: "Bài 7: Các số có bốn chữ số, năm chữ số" },
            { id: "g3_s2_c3_l2", name: "Bài 8: Làm tròn số và số La Mã" },
            { id: "g3_s2_c3_l3", name: "Bài 9: Phép cộng, phép trừ trong phạm vi 100 000" }
          ]
        },
        {
          id: "g3_s2_c4",
          name: "Chương IV: Hình học và đo lường",
          lessons: [
            { id: "g3_s2_c4_l1", name: "Bài 10: Điểm ở giữa, trung điểm của đoạn thẳng" },
            { id: "g3_s2_c4_l2", name: "Bài 11: Hình tròn, tâm, đường kính, bán kính" },
            { id: "g3_s2_c4_l3", name: "Bài 12: Chu vi hình tam giác, tứ giác, hình vuông, chữ nhật" }
          ]
        }
      ]
    }
  },
  grade_4: {
    semester_1: {
      chapters: [
        {
          id: "g4_s1_c1",
          name: "Chương I: Số tự nhiên và các số đặc trưng",
          lessons: [
            { id: "g4_s1_c1_l1", name: "Bài 1: Ôn tập các số đến 100 000" },
            { id: "g4_s1_c1_l2", name: "Bài 2: Triệu và lớp triệu" },
            { id: "g4_s1_c1_l3", name: "Bài 3: Viết số tự nhiên trong hệ thập phân" }
          ]
        },
        {
          id: "g4_s1_c2",
          name: "Chương II: Phép cộng và phép trừ số tự nhiên",
          lessons: [
            { id: "g4_s1_c2_l1", name: "Bài 4: Phép cộng số tự nhiên" },
            { id: "g4_s1_c2_l2", name: "Bài 5: Phép trừ số tự nhiên" },
            { id: "g4_s1_c2_l3", name: "Bài 6: Góc nhọn, góc tù, góc bẹt và hai đường thẳng vuông góc" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g4_s2_c3",
          name: "Chương III: Phép nhân và phép chia",
          lessons: [
            { id: "g4_s2_c3_l1", name: "Bài 7: Nhân với số có hai chữ số, ba chữ số" },
            { id: "g4_s2_c3_l2", name: "Bài 8: Chia cho số có hai chữ số" },
            { id: "g4_s2_c3_l3", name: "Bài 9: Biểu thức chứa chữ và tính chất của phép toán" }
          ]
        },
        {
          id: "g4_s2_c4",
          name: "Chương IV: Phân số học sinh",
          lessons: [
            { id: "g4_s2_c4_l1", name: "Bài 10: Khái niệm phân số và tính chất cơ bản" },
            { id: "g4_s2_c4_l2", name: "Bài 11: So sánh hai phân số" },
            { id: "g4_s2_c4_l3", name: "Bài 12: Phép cộng, phép trừ, nhân, chia phân số" }
          ]
        }
      ]
    }
  },
  grade_5: {
    semester_1: {
      chapters: [
        {
          id: "g5_s1_c1",
          name: "Chương I: Ôn tập về phân số và số thập phân",
          lessons: [
            { id: "g5_s1_c1_l1", name: "Bài 1: Ôn tập khái niệm và tính chất phân số" },
            { id: "g5_s1_c1_l2", name: "Bài 2: Hỗn số và phân số thập phân" },
            { id: "g5_s1_c1_l3", name: "Bài 3: Khái niệm số thập phân và so sánh số thập phân" }
          ]
        },
        {
          id: "g5_s1_c2",
          name: "Chương II: Các phép tính với số thập phân",
          lessons: [
            { id: "g5_s1_c2_l1", name: "Bài 4: Phép cộng, phép trừ số thập phân" },
            { id: "g5_s1_c2_l2", name: "Bài 5: Phép nhân số thập phân" },
            { id: "g5_s1_c2_l3", name: "Bài 6: Phép chia số thập phân" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g5_s2_c3",
          name: "Chương III: Hình học nâng cao",
          lessons: [
            { id: "g5_s2_c3_l1", name: "Bài 7: Diện tích hình tam giác, hình thang" },
            { id: "g5_s2_c3_l2", name: "Bài 8: Hình tròn, chu vi và diện tích hình tròn" },
            { id: "g5_s2_c3_l3", name: "Bài 9: Hình hộp chữ nhật và hình lập phương" }
          ]
        },
        {
          id: "g5_s2_c4",
          name: "Chương IV: Số đo thời gian & Chuyển động đều",
          lessons: [
            { id: "g5_s2_c4_l1", name: "Bài 10: Vận tốc, quãng đường, thời gian" },
            { id: "g5_s2_c4_l2", name: "Bài 11: Bài toán chuyển động cùng chiều, ngược chiều" },
            { id: "g5_s2_c4_l3", name: "Bài 12: Biểu đồ hình quạt tròn và thống kê" }
          ]
        }
      ]
    }
  },
  grade_6: {
    semester_1: {
      chapters: [
        {
          id: "g6_s1_c1",
          name: "Chương I: Tập hợp các số tự nhiên",
          lessons: [
            { id: "g6_s1_c1_l1", name: "Bài 1: Tập hợp. Phần tử của tập hợp" },
            { id: "g6_s1_c1_l2", name: "Bài 2: Các phép tính cộng, trừ, nhân, chia số tự nhiên" },
            { id: "g6_s1_c1_l3", name: "Bài 3: Lũy thừa với số mũ tự nhiên" },
            { id: "g6_s1_c1_l4", name: "Bài 4: Thứ tự thực hiện các phép tính" }
          ]
        },
        {
          id: "g6_s1_c2",
          name: "Chương II: Tính chất chia hết trong tập hợp các số tự nhiên",
          lessons: [
            { id: "g6_s1_c2_l1", name: "Bài 5: Phép chia hết và phép chia có dư" },
            { id: "g6_s1_c2_l2", name: "Bài 6: Tính chất chia hết của một tổng" },
            { id: "g6_s1_c2_l3", name: "Bài 7: Dấu hiệu chia hết cho 2, 5, 3, 9" },
            { id: "g6_s1_c2_l4", name: "Bài 8: Số nguyên tố. Hợp số" },
            { id: "g6_s1_c2_l5", name: "Bài 9: Ước chung lớn nhất (ƯCLN) và Bội chung nhỏ nhất (BCNN)" }
          ]
        },
        {
          id: "g6_s1_c3",
          name: "Chương III: Số nguyên",
          lessons: [
            { id: "g6_s1_c3_l1", name: "Bài 10: Số nguyên âm và tập hợp số nguyên" },
            { id: "g6_s1_c3_l2", name: "Bài 11: Thứ tự trong tập hợp số nguyên" },
            { id: "g6_s1_c3_l3", name: "Bài 12: Phép cộng và phép trừ hai số nguyên" },
            { id: "g6_s1_c3_l4", name: "Bài 13: Phép nhân và phép chia hai số nguyên" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g6_s2_c4",
          name: "Chương IV: Một số hình phẳng trong thực tiễn",
          lessons: [
            { id: "g6_s2_c4_l1", name: "Bài 14: Tam giác đều, hình vuông, lục giác đều" },
            { id: "g6_s2_c4_l2", name: "Bài 15: Hình chữ nhật, hình thoi, hình bình hành, hình thang cân" },
            { id: "g6_s2_c4_l3", name: "Bài 16: Chu vi và diện tích của một số hình phẳng" }
          ]
        },
        {
          id: "g6_s2_c5",
          name: "Chương V: Phân số",
          lessons: [
            { id: "g6_s2_c5_l1", name: "Bài 17: Khái niệm phân số và hai phân số bằng nhau" },
            { id: "g6_s2_c5_l2", name: "Bài 18: So sánh phân số. Hỗn số dương" },
            { id: "g6_s2_c5_l3", name: "Bài 19: Các phép tính cộng, trừ, nhân, chia phân số" }
          ]
        },
        {
          id: "g6_s2_c6",
          name: "Chương VI: Số thập phân",
          lessons: [
            { id: "g6_s2_c6_l1", name: "Bài 20: Khái niệm số thập phân" },
            { id: "g6_s2_c6_l2", name: "Bài 21: Các phép tính với số thập phân" },
            { id: "g6_s2_c6_l3", name: "Bài 22: Bài toán thực tế về phân số và số thập phân" }
          ]
        }
      ]
    }
  },
  grade_7: {
    semester_1: {
      chapters: [
        {
          id: "g7_s1_c1",
          name: "Chương I: Số hữu tỉ",
          lessons: [
            { id: "g7_s1_c1_l1", name: "Bài 1: Tập hợp các số hữu tỉ" },
            { id: "g7_s1_c1_l2", name: "Bài 2: Cộng, trừ, nhân, chia số hữu tỉ" },
            { id: "g7_s1_c1_l3", name: "Bài 3: Lũy thừa của một số hữu tỉ" },
            { id: "g7_s1_c1_l4", name: "Bài 4: Thứ tự thực hiện phép tính và quy tắc dấu ngoặc" }
          ]
        },
        {
          id: "g7_s1_c2",
          name: "Chương II: Số thực",
          lessons: [
            { id: "g7_s1_c2_l1", name: "Bài 5: Số thập phân vô hạn tuần hoàn" },
            { id: "g7_s1_c2_l2", name: "Bài 6: Số vô tỉ. Căn bậc hai số học" },
            { id: "g7_s1_c2_l3", name: "Bài 7: Tập hợp các số thực và làm tròn số" }
          ]
        },
        {
          id: "g7_s1_c3",
          name: "Chương III: Góc và đường thẳng song song",
          lessons: [
            { id: "g7_s1_c3_l1", name: "Bài 8: Các góc ở vị trí đặc biệt. Tia phân giác" },
            { id: "g7_s1_c3_l2", name: "Bài 9: Hai đường thẳng song song và dấu hiệu nhận biết" },
            { id: "g7_s1_c3_l3", name: "Bài 10: Định lí và chứng minh một định lí" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g7_s2_c4",
          name: "Chương IV: Tam giác bằng nhau",
          lessons: [
            { id: "g7_s2_c4_l1", name: "Bài 11: Tổng các góc trong một tam giác" },
            { id: "g7_s2_c4_l2", name: "Bài 12: Hai tam giác bằng nhau. Trường hợp C-C-C" },
            { id: "g7_s2_c4_l3", name: "Bài 13: Trường hợp bằng nhau C-G-C và G-C-G" },
            { id: "g7_s2_c4_l4", name: "Bài 14: Tam giác cân và đường trung trực" }
          ]
        },
        {
          id: "g7_s2_c5",
          name: "Chương V: Đa thức một biến",
          lessons: [
            { id: "g7_s2_c5_l1", name: "Bài 15: Biểu thức đại số" },
            { id: "g7_s2_c5_l2", name: "Bài 16: Đa thức một biến và nghiệm của đa thức một biến" },
            { id: "g7_s2_c5_l3", name: "Bài 17: Phép cộng, trừ, nhân, chia đa thức một biến" }
          ]
        }
      ]
    }
  },
  grade_8: {
    semester_1: {
      chapters: [
        {
          id: "g8_s1_c1",
          name: "Chương I: Đa thức",
          lessons: [
            { id: "g8_s1_c1_l1", name: "Bài 1: Đơn thức nhiều biến" },
            { id: "g8_s1_c1_l2", name: "Bài 2: Đa thức nhiều biến" },
            { id: "g8_s1_c1_l3", name: "Bài 3: Phép cộng và phép trừ đa thức" },
            { id: "g8_s1_c1_l4", name: "Bài 4: Phép nhân, chia đa thức" }
          ]
        },
        {
          id: "g8_s1_c2",
          name: "Chương II: Hằng đẳng thức đáng nhớ và ứng dụng",
          lessons: [
            { id: "g8_s1_c2_l1", name: "Bài 5: Hiệu hai bình phương. Bình phương một tổng/hiệu" },
            { id: "g8_s1_c2_l2", name: "Bài 6: Lập phương một tổng/hiệu. Tổng/hiệu hai lập phương" },
            { id: "g8_s1_c2_l3", name: "Bài 7: Phân tích đa thức thành nhân tử" }
          ]
        },
        {
          id: "g8_s1_c3",
          name: "Chương III: Tứ giác",
          lessons: [
            { id: "g8_s1_c3_l1", name: "Bài 8: Tứ giác. Hình thang cân" },
            { id: "g8_s1_c3_l2", name: "Bài 9: Hình bình hành. Hình chữ nhật" },
            { id: "g8_s1_c3_l3", name: "Bài 10: Hình thoi. Hình vuông" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g8_s2_c4",
          name: "Chương IV: Định lý Thales",
          lessons: [
            { id: "g8_s2_c4_l1", name: "Bài 11: Định lý Thales trong tam giác" },
            { id: "g8_s2_c4_l2", name: "Bài 12: Đường trung bình của tam giác" },
            { id: "g8_s2_c4_l3", name: "Bài 13: Tính chất đường phân giác trong tam giác" }
          ]
        },
        {
          id: "g8_s2_c5",
          name: "Chương V: Phương trình bậc nhất một ẩn",
          lessons: [
            { id: "g8_s2_c5_l1", name: "Bài 14: Phương trình bậc nhất một ẩn" },
            { id: "g8_s2_c5_l2", name: "Bài 15: Giải bài toán bằng cách lập phương trình" },
            { id: "g8_s2_c5_l3", name: "Bài 16: Hàm số bậc nhất và đồ thị" }
          ]
        }
      ]
    }
  },
  grade_9: {
    semester_1: {
      chapters: [
        {
          id: "g9_s1_c1",
          name: "Chương I: Phương trình và hệ phương trình",
          lessons: [
            { id: "g9_s1_c1_l1", name: "Bài 1: Khái niệm phương trình bậc nhất hai ẩn" },
            { id: "g9_s1_c1_l2", name: "Bài 2: Hệ hai phương trình bậc nhất hai ẩn" },
            { id: "g9_s1_c1_l3", name: "Bài 3: Giải toán bằng cách lập hệ phương trình" }
          ]
        },
        {
          id: "g9_s1_c2",
          name: "Chương II: Phương trình bậc hai một ẩn",
          lessons: [
            { id: "g9_s1_c2_l1", name: "Bài 4: Hàm số $y = ax^2$ ($a \\neq 0$)" },
            { id: "g9_s1_c2_l2", name: "Bài 5: Phương trình bậc hai một ẩn số" },
            { id: "g9_s1_c2_l3", name: "Bài 6: Định lý Viète và ứng dụng" }
          ]
        },
        {
          id: "g9_s1_c3",
          name: "Chương III: Căn thức bậc hai và căn bậc ba",
          lessons: [
            { id: "g9_s1_c3_l1", name: "Bài 7: Căn thức bậc hai và tính chất" },
            { id: "g9_s1_c3_l2", name: "Bài 8: Khai căn và biến đổi căn thức bậc hai" },
            { id: "g9_s1_c3_l3", name: "Bài 9: Căn bậc ba" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g9_s2_c4",
          name: "Chương IV: Hệ thức lượng trong tam giác vuông",
          lessons: [
            { id: "g9_s2_c4_l1", name: "Bài 10: Tỉ số lượng giác của góc nhọn" },
            { id: "g9_s2_c4_l2", name: "Bài 11: Một số hệ thức lượng trong tam giác vuông" }
          ]
        },
        {
          id: "g9_s2_c5",
          name: "Chương V: Đường tròn",
          lessons: [
            { id: "g9_s2_c5_l1", name: "Bài 12: Khái niệm đường tròn và vị trí tương đối" },
            { id: "g9_s2_c5_l2", name: "Bài 13: Góc ở tâm, góc nội tiếp và số đo cung" },
            { id: "g9_s2_c5_l3", name: "Bài 14: Tiếp tuyến của đường tròn" }
          ]
        },
        {
          id: "g9_s2_c6",
          name: "Chương VI: Hình trụ, hình nón và hình cầu",
          lessons: [
            { id: "g9_s2_c6_l1", name: "Bài 15: Hình trụ - Diện tích xung quanh và thể tích" },
            { id: "g9_s2_c6_l2", name: "Bài 16: Hình nón, hình cầu" }
          ]
        }
      ]
    }
  },
  grade_10: {
    semester_1: {
      chapters: [
        {
          id: "g10_s1_c1",
          name: "Chương I. Mệnh đề và tập hợp",
          lessons: [
            { id: "g10_s1_c1_l1", name: "Bài 1. Mệnh đề" },
            { id: "g10_s1_c1_l2", name: "Bài 2. Tập hợp và các phép toán trên tập hợp" },
            { id: "g10_s1_c1_l3", name: "Bài tập cuối chương I" }
          ]
        },
        {
          id: "g10_s1_c2",
          name: "Chương II. Bất phương trình và hệ bất phương trình bậc nhất hai ẩn",
          lessons: [
            { id: "g10_s1_c2_l1", name: "Bài 3. Bất phương trình bậc nhất hai ẩn" },
            { id: "g10_s1_c2_l2", name: "Bài 4. Hệ bất phương trình bậc nhất hai ẩn" },
            { id: "g10_s1_c2_l3", name: "Bài tập cuối chương II" }
          ]
        },
        {
          id: "g10_s1_c3",
          name: "Chương III. Hệ thức lượng trong tam giác",
          lessons: [
            { id: "g10_s1_c3_l1", name: "Bài 5. Giá trị lượng giác của một góc từ 0° đến 180°" },
            { id: "g10_s1_c3_l2", name: "Bài 6. Hệ thức lượng trong tam giác" },
            { id: "g10_s1_c3_l3", name: "Bài tập cuối chương III" }
          ]
        },
        {
          id: "g10_s1_c4",
          name: "Chương IV. Vectơ",
          lessons: [
            { id: "g10_s1_c4_l1", name: "Bài 7. Các khái niệm mở đầu" },
            { id: "g10_s1_c4_l2", name: "Bài 8. Tổng và hiệu của hai vectơ" },
            { id: "g10_s1_c4_l3", name: "Bài 9. Tích của một vectơ với một số" },
            { id: "g10_s1_c4_l4", name: "Bài 10. Vectơ trong mặt phẳng toạ độ" },
            { id: "g10_s1_c4_l5", name: "Bài 11. Tích vô hướng của hai vectơ" },
            { id: "g10_s1_c4_l6", name: "Bài tập cuối chương IV" }
          ]
        },
        {
          id: "g10_s1_c5",
          name: "Chương V. Các số đặc trưng của mẫu số liệu. Không ghép nhóm",
          lessons: [
            { id: "g10_s1_c5_l1", name: "Bài 12. Số gần đúng và sai số" },
            { id: "g10_s1_c5_l2", name: "Bài 13. Các số đặc trưng đo xu thế trung tâm" },
            { id: "g10_s1_c5_l3", name: "Bài 14. Các số đặc trưng đo độ phân tán" },
            { id: "g10_s1_c5_l4", name: "Bài tập cuối chương V" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g10_s2_c6",
          name: "Chương VI. Hàm số, đồ thị và ứng dụng",
          lessons: [
            { id: "g10_s2_c6_l1", name: "Bài 15. Hàm số" },
            { id: "g10_s2_c6_l2", name: "Bài 16. Hàm số bậc hai" },
            { id: "g10_s2_c6_l3", name: "Bài 17. Dấu của tam thức bậc hai" },
            { id: "g10_s2_c6_l4", name: "Bài 18. Phương trình quy về phương trình bậc hai" },
            { id: "g10_s2_c6_l5", name: "Bài tập cuối chương VI" }
          ]
        },
        {
          id: "g10_s2_c7",
          name: "Chương VII. Phương pháp toạ độ trong mặt phẳng",
          lessons: [
            { id: "g10_s2_c7_l1", name: "Bài 19. Phương trình đường thẳng" },
            { id: "g10_s2_c7_l2", name: "Bài 20. Đường thẳng trong mặt phẳng toạ độ" },
            { id: "g10_s2_c7_l3", name: "Bài 21. Đường tròn trong mặt phẳng toạ độ" },
            { id: "g10_s2_c7_l4", name: "Bài 22. Ba đường conic" },
            { id: "g10_s2_c7_l5", name: "Bài tập cuối chương VII" }
          ]
        },
        {
          id: "g10_s2_c8",
          name: "Chương VIII. Đại số tổ hợp",
          lessons: [
            { id: "g10_s2_c8_l1", name: "Bài 23. Quy tắc đếm" },
            { id: "g10_s2_c8_l2", name: "Bài 24. Hoán vị, chỉnh hợp và tổ hợp" },
            { id: "g10_s2_c8_l3", name: "Bài 25. Nhị thức Newton" },
            { id: "g10_s2_c8_l4", name: "Bài tập cuối chương VIII" }
          ]
        },
        {
          id: "g10_s2_c9",
          name: "Chương IX. Tính xác suất theo định nghĩa cổ điển",
          lessons: [
            { id: "g10_s2_c9_l1", name: "Bài 26. Biến cố và định nghĩa cổ điển của xác suất" },
            { id: "g10_s2_c9_l2", name: "Bài 27. Thực hành tính xác suất theo định nghĩa cổ điển" },
            { id: "g10_s2_c9_l3", name: "Bài tập cuối chương IX" }
          ]
        }
      ]
    },
    special_topic: {
      chapters: [
        {
          id: "g10_st_c1",
          name: "Chuyên đề 1. Hệ phương trình bậc nhất ba ẩn",
          lessons: [
            { id: "g10_st_c1_l1", name: "Bài 1. Hệ phương trình bậc nhất ba ẩn" },
            { id: "g10_st_c1_l2", name: "Bài 2. Ứng dụng của hệ phương trình bậc nhất ba ẩn" },
            { id: "g10_st_c1_l3", name: "Bài tập cuối chuyên đề 1" }
          ]
        },
        {
          id: "g10_st_c2",
          name: "Chuyên đề 2. Phương pháp quy nạp toán học, nhị thức Newton",
          lessons: [
            { id: "g10_st_c2_l1", name: "Bài 3. Phương pháp quy nạp toán học" },
            { id: "g10_st_c2_l2", name: "Bài 4. Nhị thức Newton" },
            { id: "g10_st_c2_l3", name: "Bài tập cuối chuyên đề 2" }
          ]
        },
        {
          id: "g10_st_c3",
          name: "Chuyên đề 3. Ba đường conic và ứng dụng",
          lessons: [
            { id: "g10_st_c3_l1", name: "Bài 5. Elip" },
            { id: "g10_st_c3_l2", name: "Bài 6. Hypebol" },
            { id: "g10_st_c3_l3", name: "Bài 7. Parabol" },
            { id: "g10_st_c3_l4", name: "Bài 8. Sự thống nhất giữa ba đường conic" },
            { id: "g10_st_c3_l5", name: "Bài tập cuối chuyên đề 3" }
          ]
        }
      ]
    }
  },
  grade_11: {
    semester_1: {
      chapters: [
        {
          id: "g11_s1_c1",
          name: "Chương I. Hàm số lượng giác và phương trình lượng giác",
          lessons: [
            { id: "g11_s1_c1_l1", name: "Bài 1. Giá trị lượng giác của góc lượng giác" },
            { id: "g11_s1_c1_l2", name: "Bài 2. Công thức lượng giác" },
            { id: "g11_s1_c1_l3", name: "Bài 3. Hàm số lượng giác" },
            { id: "g11_s1_c1_l4", name: "Bài 4. Phương trình lượng giác cơ bản" },
            { id: "g11_s1_c1_l5", name: "Bài tập cuối chương I" }
          ]
        },
        {
          id: "g11_s1_c2",
          name: "Chương II. Dãy số. Cấp số cộng và cấp số nhân",
          lessons: [
            { id: "g11_s1_c2_l1", name: "Bài 5. Dãy số" },
            { id: "g11_s1_c2_l2", name: "Bài 6. Cấp số cộng" },
            { id: "g11_s1_c2_l3", name: "Bài 7. Cấp số nhân" },
            { id: "g11_s1_c2_l4", name: "Bài tập cuối chương II" }
          ]
        },
        {
          id: "g11_s1_c3",
          name: "Chương III. Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm",
          lessons: [
            { id: "g11_s1_c3_l1", name: "Bài 8. Mẫu số liệu ghép nhóm" },
            { id: "g11_s1_c3_l2", name: "Bài 9. Các số đặc trưng đo xu thế trung tâm" },
            { id: "g11_s1_c3_l3", name: "Bài tập cuối chương III" }
          ]
        },
        {
          id: "g11_s1_c4",
          name: "Chương IV. Quan hệ song song trong không gian",
          lessons: [
            { id: "g11_s1_c4_l1", name: "Bài 10. Đường thẳng và mặt phẳng trong không gian" },
            { id: "g11_s1_c4_l2", name: "Bài 11. Hai đường thẳng song song" },
            { id: "g11_s1_c4_l3", name: "Bài 12. Đường thẳng và mặt phẳng song song" },
            { id: "g11_s1_c4_l4", name: "Bài 13. Hai mặt phẳng song song" },
            { id: "g11_s1_c4_l5", name: "Bài 14. Phép chiếu song song" },
            { id: "g11_s1_c4_l6", name: "Bài tập cuối chương IV" }
          ]
        },
        {
          id: "g11_s1_c5",
          name: "Chương V. Giới hạn. Hàm số liên tục",
          lessons: [
            { id: "g11_s1_c5_l1", name: "Bài 15. Giới hạn của dãy số" },
            { id: "g11_s1_c5_l2", name: "Bài 16. Giới hạn của hàm số" },
            { id: "g11_s1_c5_l3", name: "Bài 17. Hàm số liên tục" },
            { id: "g11_s1_c5_l4", name: "Bài tập cuối chương V" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g11_s2_c6",
          name: "Chương VI. Hàm số mũ và hàm số lôgarit",
          lessons: [
            { id: "g11_s2_c6_l1", name: "Bài 18. Luỹ thừa với số mũ thực" },
            { id: "g11_s2_c6_l2", name: "Bài 19. Lôgarit" },
            { id: "g11_s2_c6_l3", name: "Bài 20. Hàm số mũ và hàm số lôgarit" },
            { id: "g11_s2_c6_l4", name: "Bài 21. Phương trình, bất phương trình mũ và lôgarit" },
            { id: "g11_s2_c6_l5", name: "Bài tập cuối chương VI" }
          ]
        },
        {
          id: "g11_s2_c7",
          name: "Chương VII. Quan hệ vuông góc trong không gian",
          lessons: [
            { id: "g11_s2_c7_l1", name: "Bài 22. Hai đường thẳng vuông góc" },
            { id: "g11_s2_c7_l2", name: "Bài 23. Đường thẳng vuông góc với mặt phẳng" },
            { id: "g11_s2_c7_l3", name: "Bài 24. Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng" },
            { id: "g11_s2_c7_l4", name: "Bài 25. Hai mặt phẳng vuông góc" },
            { id: "g11_s2_c7_l5", name: "Bài 26. Khoảng cách" },
            { id: "g11_s2_c7_l6", name: "Bài 27. Thể tích" },
            { id: "g11_s2_c7_l7", name: "Bài tập cuối chương VII" }
          ]
        },
        {
          id: "g11_s2_c8",
          name: "Chương VIII. Các quy tắc tính xác suất",
          lessons: [
            { id: "g11_s2_c8_l1", name: "Bài 28. Biến cố hợp, biến cố giao, biến cố độc lập" },
            { id: "g11_s2_c8_l2", name: "Bài 29. Công thức cộng xác suất" },
            { id: "g11_s2_c8_l3", name: "Bài 30. Công thức nhân xác suất cho hai biến cố độc lập" },
            { id: "g11_s2_c8_l4", name: "Bài tập cuối chương VIII" }
          ]
        },
        {
          id: "g11_s2_c9",
          name: "Chương IX. Đạo hàm",
          lessons: [
            { id: "g11_s2_c9_l1", name: "Bài 31. Định nghĩa và ý nghĩa của đạo hàm" },
            { id: "g11_s2_c9_l2", name: "Bài 32. Các quy tắc tính đạo hàm" },
            { id: "g11_s2_c9_l3", name: "Bài 33. Đạo hàm cấp hai" },
            { id: "g11_s2_c9_l4", name: "Bài tập cuối chương IX" }
          ]
        },
        {
          id: "g11_s2_hdtn",
          name: "Hoạt động thực hành trải nghiệm",
          lessons: [
            { id: "g11_s2_hdtn_l1", name: "Một vài mô hình toán học sử dụng hàm số mũ và hàm số lôgarit" },
            { id: "g11_s2_hdtn_l2", name: "Hoạt động thực hành trải nghiệm Hình học" },
            { id: "g11_s2_hdtn_l3", name: "Bài tập ôn tập cuối năm" }
          ]
        }
      ]
    },
    special_topic: {
      chapters: [
        {
          id: "g11_st_c1",
          name: "Chuyên đề 1. Phép biến hình trong mặt phẳng",
          lessons: [
            { id: "g11_st_c1_l1", name: "Bài 1. Phép biến hình" },
            { id: "g11_st_c1_l2", name: "Bài 2. Phép tịnh tiến" },
            { id: "g11_st_c1_l3", name: "Bài 3. Phép đối xứng trục" },
            { id: "g11_st_c1_l4", name: "Bài 4. Phép quay và phép đối xứng tâm" },
            { id: "g11_st_c1_l5", name: "Bài 5. Phép dời hình" },
            { id: "g11_st_c1_l6", name: "Bài 6. Phép vị tự" },
            { id: "g11_st_c1_l7", name: "Bài 7. Phép đồng dạng" },
            { id: "g11_st_c1_l8", name: "Bài tập cuối chuyên đề 1" }
          ]
        },
        {
          id: "g11_st_c2",
          name: "Chuyên đề 2. Làm quen với một vài khái niệm của lí thuyết đồ thị",
          lessons: [
            { id: "g11_st_c2_l1", name: "Bài 8. Một số khái niệm cơ bản" },
            { id: "g11_st_c2_l2", name: "Bài 9. Đường đi Euler và đường đi Hamilton" },
            { id: "g11_st_c2_l3", name: "Bài 10. Bài toán tìm đường đi tối ưu trong một vài trường hợp đơn giản" },
            { id: "g11_st_c2_l4", name: "Bài tập cuối chuyên đề 2" }
          ]
        },
        {
          id: "g11_st_c3",
          name: "Chuyên đề 3. Một số yếu tố vẽ kĩ thuật",
          lessons: [
            { id: "g11_st_c3_l1", name: "Bài 11. Hình chiếu vuông góc và hình chiếu trục đo" },
            { id: "g11_st_c3_l2", name: "Bài 12. Bản vẽ kĩ thuật" },
            { id: "g11_st_c3_l3", name: "Bài tập cuối chuyên đề 3" }
          ]
        }
      ]
    }
  },
  grade_12: {
    semester_1: {
      chapters: [
        {
          id: "g12_s1_c1",
          name: "Chương I. Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
          lessons: [
            { id: "g12_s1_c1_l1", name: "Bài 1. Tính đơn điệu và cực trị của hàm số" },
            { id: "g12_s1_c1_l2", name: "Bài 2. Giá trị lớn nhất và giá trị nhỏ nhất của hàm số" },
            { id: "g12_s1_c1_l3", name: "Bài 3. Đường tiệm cận của đồ thị hàm số" },
            { id: "g12_s1_c1_l4", name: "Bài 4. Khảo sát sự biến thiên và vẽ đồ thị của hàm số" },
            { id: "g12_s1_c1_l5", name: "Bài 5. Ứng dụng đạo hàm để giải quyết một số vấn đề liên quan đến thực tiễn" },
            { id: "g12_s1_c1_l6", name: "Bài tập cuối chương I" }
          ]
        },
        {
          id: "g12_s1_c2",
          name: "Chương II. Vectơ và hệ trục toạ độ trong không gian",
          lessons: [
            { id: "g12_s1_c2_l1", name: "Bài 6. Vectơ trong không gian" },
            { id: "g12_s1_c2_l2", name: "Bài 7. Hệ trục toạ độ trong không gian" },
            { id: "g12_s1_c2_l3", name: "Bài 8. Biểu thức toạ độ của các phép toán vectơ" },
            { id: "g12_s1_c2_l4", name: "Bài tập cuối chương II" }
          ]
        },
        {
          id: "g12_s1_c3",
          name: "Chương III. Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm",
          lessons: [
            { id: "g12_s1_c3_l1", name: "Bài 9. Khoảng biến thiên và khoảng tứ phân vị" },
            { id: "g12_s1_c3_l2", name: "Bài 10. Phương sai và độ lệch chuẩn" },
            { id: "g12_s1_c3_l3", name: "Bài tập cuối chương III" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "g12_s2_c4",
          name: "Chương IV. Nguyên hàm và tích phân",
          lessons: [
            { id: "g12_s2_c4_l1", name: "Bài 11. Nguyên hàm" },
            { id: "g12_s2_c4_l2", name: "Bài 12. Tích phân" },
            { id: "g12_s2_c4_l3", name: "Bài 13. Ứng dụng hình học của tích phân" },
            { id: "g12_s2_c4_l4", name: "Bài tập cuối chương IV" }
          ]
        },
        {
          id: "g12_s2_c5",
          name: "Chương V. Phương pháp toạ độ trong không gian",
          lessons: [
            { id: "g12_s2_c5_l1", name: "Bài 14. Phương trình mặt phẳng" },
            { id: "g12_s2_c5_l2", name: "Bài 15. Phương trình đường thẳng trong không gian" },
            { id: "g12_s2_c5_l3", name: "Bài 16. Công thức tính góc trong không gian" },
            { id: "g12_s2_c5_l4", name: "Bài 17. Phương trình mặt cầu" },
            { id: "g12_s2_c5_l5", name: "Bài tập cuối chương V" }
          ]
        },
        {
          id: "g12_s2_c6",
          name: "Chương VI. Xác suất có điều kiện",
          lessons: [
            { id: "g12_s2_c6_l1", name: "Bài 18. Xác suất có điều kiện" },
            { id: "g12_s2_c6_l2", name: "Bài 19. Công thức xác suất toàn phần và công thức Bayes" },
            { id: "g12_s2_c6_l3", name: "Bài tập cuối chương VI" }
          ]
        },
        {
          id: "g12_s2_hdtn",
          name: "Hoạt động thực hành trải nghiệm",
          lessons: [
            { id: "g12_s2_hdtn_l1", name: "Tính nguyên hàm và tích phân với phần mềm GeoGebra" },
            { id: "g12_s2_hdtn_l2", name: "Tính gần đúng tích phân bằng phương pháp hình thang" },
            { id: "g12_s2_hdtn_l3", name: "Vẽ đồ hoạ 3D với phần mềm GeoGebra" },
            { id: "g12_s2_hdtn_l4", name: "Bài tập ôn tập cuối năm" }
          ]
        }
      ]
    },
    special_topic: {
      chapters: [
        {
          id: "g12_st_c1",
          name: "Chuyên đề 1. Biến ngẫu nhiên rời rạc. Các số đặc trưng của biến ngẫu nhiên rời rạc",
          lessons: [
            { id: "g12_st_c1_l1", name: "Bài 1. Biến ngẫu nhiên rời rạc và các số đặc trưng" },
            { id: "g12_st_c1_l2", name: "Bài 2. Biến ngẫu nhiên có phân bố nhị thức và áp dụng" },
            { id: "g12_st_c1_l3", name: "Bài tập cuối chuyên đề 1" }
          ]
        },
        {
          id: "g12_st_c2",
          name: "Chuyên đề 2. Ứng dụng toán học để giải quyết một số bài toán tối ưu",
          lessons: [
            { id: "g12_st_c2_l1", name: "Bài 3. Vận dụng hệ bất phương trình bậc nhất hai ẩn để giải quyết một số bài toán quy hoạch tuyến tính" },
            { id: "g12_st_c2_l2", name: "Bài 4. Vận dụng đạo hàm để giải quyết một số bài toán tối ưu" },
            { id: "g12_st_c2_l3", name: "Bài tập cuối chuyên đề 2" }
          ]
        },
        {
          id: "g12_st_c3",
          name: "Chuyên đề 3. Ứng dụng toán học trong một số vấn đề liên quan đến tài chính",
          lessons: [
            { id: "g12_st_c3_l1", name: "Bài 5. Tiền tệ. Lãi suất" },
            { id: "g12_st_c3_l2", name: "Bài 6. Tín dụng. Vay nợ" },
            { id: "g12_st_c3_l3", name: "Bài 7. Đầu tư tài chính. Lập kế hoạch tài chính cá nhân" },
            { id: "g12_st_c3_l4", name: "Bài tập cuối chuyên đề 3" }
          ]
        }
      ]
    }
  }
};

import { KNTT_SUBJECT_CURRICULUM } from './knttSubjectCurriculums';

/**
 * Normalizes subject string into canonical subject keys
 */
export function normalizeSubjectKey(subj?: string): string {
  const s = (subj || "").toLowerCase().trim();
  if (s.includes("sinh")) return "sinh_hoc";
  if (s.includes("vật lí") || s.includes("vật lý") || s.includes("lí") || s.includes("lý")) return "vat_li";
  if (s.includes("hóa") || s.includes("hoá")) return "hoa_hoc";
  if (s.includes("văn") || s.includes("tiếng việt")) return "ngu_van";
  if (s.includes("sử") || s.includes("lịch sử")) return "lich_su";
  if (s.includes("địa") || s.includes("địa lí") || s.includes("địa lý")) return "dia_li";
  if (s.includes("trải nghiệm") || s.includes("hướng nghiệp") || s.includes("hdtn") || s.includes("hđtn")) return "hdtn_hn";
  if (s.includes("quốc phòng") || s.includes("an ninh") || s.includes("gdqp")) return "gdqp_an";
  if (s.includes("thể chất") || s.includes("thể dục") || s.includes("gdtc")) return "gdtc";
  if (s.includes("kinh tế") || s.includes("pháp luật") || s.includes("công dân") || s.includes("gdcd") || s.includes("gdkt")) return "gdcd_gdktpl";
  if (s.includes("địa phương") || s.includes("gddp")) return "gd_dia_phuong";
  if (s.includes("tin học") || s.includes("tin")) return "tin_hoc";
  if (s.includes("công nghệ")) return "cong_nghe";
  if (s.includes("tiếng anh") || s.includes("anh")) return "tieng_anh";
  if (s.includes("toán")) return "toan";
  return "other";
}

/**
 * Retrieves exact KNTT chapters and lessons for any subject, grade, and semester.
 */
export function getKnttCurriculum(
  subject: string,
  grade: number = 12,
  semester: "semester_1" | "semester_2" | "special_topic" = "semester_1"
): SemesterData {
  const key = normalizeSubjectKey(subject);

  // If Math or requested grade exists in Math curriculum
  if (key === "toan" || subject.toLowerCase().includes("toán")) {
    const gradeKey = `grade_${grade}`;
    if (KNTT_CURRICULUM[gradeKey]?.[semester]) {
      return KNTT_CURRICULUM[gradeKey][semester];
    }
    if (semester === "special_topic" && KNTT_CURRICULUM[gradeKey]?.semester_1) {
      return KNTT_CURRICULUM[gradeKey].semester_1;
    }
  }

  // Check subject-specific curriculum database
  const subjectData = KNTT_SUBJECT_CURRICULUM[key];
  if (subjectData) {
    if (subjectData[grade]?.[semester]) {
      return subjectData[grade][semester];
    }
    // Fallback to nearest grade in same subject (e.g., Grade 12 or 10)
    const availableGrades = Object.keys(subjectData).map(Number);
    if (availableGrades.length > 0) {
      const fallbackGrade = availableGrades.includes(grade) ? grade : availableGrades[0];
      if (subjectData[fallbackGrade]?.[semester]) {
        return subjectData[fallbackGrade][semester];
      }
    }
  }

  // Dynamic pedagogical outline for any other subject or grade (never mistakenly show Math)
  const cleanSubj = subject || "Môn học";
  const semText = semester === "semester_1" ? "Học kỳ 1" : semester === "semester_2" ? "Học kỳ 2" : "Chuyên đề học tập";
  const semNum = semester === "semester_1" ? 1 : 2;

  return {
    chapters: [
      {
        id: `dyn_${key}_g${grade}_s${semNum}_c1`,
        name: `Chương I: Kiến thức nền tảng & Chủ đề trọng tâm (${cleanSubj} ${grade} - ${semText})`,
        lessons: [
          { id: `dyn_${key}_g${grade}_s${semNum}_c1_l1`, name: `Bài 1: Khái quát và nội dung lý thuyết cơ bản môn ${cleanSubj}` },
          { id: `dyn_${key}_g${grade}_s${semNum}_c1_l2`, name: `Bài 2: Phương pháp nghiên cứu và thực hành chuyên đề` },
          { id: `dyn_${key}_g${grade}_s${semNum}_c1_l3`, name: `Bài 3: Vận dụng kiến thức vào thực tiễn đời sống` }
        ]
      },
      {
        id: `dyn_${key}_g${grade}_s${semNum}_c2`,
        name: `Chương II: Chuyên đề nâng cao & Đánh giá (${cleanSubj} ${grade} - ${semText})`,
        lessons: [
          { id: `dyn_${key}_g${grade}_s${semNum}_c2_l4`, name: `Bài 4: Phân tích các tình huống và bài tập vận dụng cao` },
          { id: `dyn_${key}_g${grade}_s${semNum}_c2_l5`, name: `Bài 5: Ôn tập chương và đánh giá định kỳ` }
        ]
      }
    ]
  };
}

