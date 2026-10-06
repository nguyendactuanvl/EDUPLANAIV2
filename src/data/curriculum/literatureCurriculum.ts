import { SemesterData } from '../knttCurriculum';

export const LITERATURE_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "lit12_s1_c1",
          name: "Tập 1: Những chân trời văn học & Nghệ thuật lập luận",
          lessons: [
            { id: "lit12_s1_c1_l1", name: "Bài 1: Khát vọng tự do và công lí (Văn học hiện thực và lãng mạn)" },
            { id: "lit12_s1_c1_l2", name: "Bài 2: Vẻ đẹp của tâm hồn và tình yêu quê hương (Thơ hiện đại)" },
            { id: "lit12_s1_c1_l3", name: "Bài 3: Nghệ thuật lập luận trong văn nghị luận xã hội" },
            { id: "lit12_s1_c1_l4", name: "Bài 4: Tiếng cười trào phúng và phê phán xã hội" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "lit12_s2_c2",
          name: "Tập 2: Văn học hiện đại và chân trời tri thức",
          lessons: [
            { id: "lit12_s2_c2_l5", name: "Bài 5: Văn học và cuộc sống hiện đại (Kí sự, phóng sự)" },
            { id: "lit12_s2_c2_l6", name: "Bài 6: Những chân trời kí ức (Kí, tùy bút)" },
            { id: "lit12_s2_c2_l7", name: "Bài 7: Tiếng nói của tri thức và sáng tạo (Văn bản thông tin)" },
            { id: "lit12_s2_c2_l8", name: "Bài 8: Ôn tập và tổng kết văn học Việt Nam qua các thời kì" }
          ]
        }
      ]
    }
  },
  11: {
    semester_1: {
      chapters: [
        {
          id: "lit11_s1_c1",
          name: "Tập 1: Câu chuyện, cấu tứ và văn bản nghị luận",
          lessons: [
            { id: "lit11_s1_c1_l1", name: "Bài 1: Câu chuyện và người kể chuyện (Truyện ngắn hiện đại)" },
            { id: "lit11_s1_c1_l2", name: "Bài 2: Cấu tứ và hình ảnh trong thơ trữ tình" },
            { id: "lit11_s1_c1_l3", name: "Bài 3: Cấu trúc của văn bản nghị luận" },
            { id: "lit11_s1_c1_l4", name: "Bài 4: Hình tượng con người trong văn học" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "lit11_s2_c2",
          name: "Tập 2: Vẻ đẹp ngôn từ và tự sự",
          lessons: [
            { id: "lit11_s2_c2_l5", name: "Bài 5: Khám phá vẻ đẹp ngôn từ trong thơ trung đại" },
            { id: "lit11_s2_c2_l6", name: "Bài 6: Tự sự và hư cấu (Tiểu thuyết chương hồi)" },
            { id: "lit11_s2_c2_l7", name: "Bài 7: Thông điệp từ văn bản thông tin" },
            { id: "lit11_s2_c2_l8", name: "Bài 8: Bi kịch và tiếng cười sân khấu (Kịch bản văn học)" }
          ]
        }
      ]
    }
  },
  10: {
    semester_1: {
      chapters: [
        {
          id: "lit10_s1_c1",
          name: "Tập 1: Sức hấp dẫn của truyện kể & Vẻ đẹp thơ ca",
          lessons: [
            { id: "lit10_s1_c1_l1", name: "Bài 1: Sức hấp dẫn của truyện kể (Thần thoại và sử thi)" },
            { id: "lit10_s1_c1_l2", name: "Bài 2: Vẻ đẹp của thơ ca (Thơ trữ tình dân gian và trung đại)" },
            { id: "lit10_s1_c1_l3", name: "Bài 3: Nghệ thuật thuyết phục trong văn nghị luận" },
            { id: "lit10_s1_c1_l4", name: "Bài 4: Sức sống của sử thi và bi kịch cổ đại" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "lit10_s2_c2",
          name: "Tập 2: Sân khấu dân gian & Tác gia văn học",
          lessons: [
            { id: "lit10_s2_c2_l5", name: "Bài 5: Tích trò sân khấu dân gian (Chèo, Tuồng)" },
            { id: "lit10_s2_c2_l6", name: "Bài 6: Nguyễn Trãi - Dành còn để trợ dân này" },
            { id: "lit10_s2_c2_l7", name: "Bài 7: Quyền năng của người kể chuyện (Truyện truyền kì và truyện ngắn)" },
            { id: "lit10_s2_c2_l8", name: "Bài 8: Thế giới đa dạng của văn bản thông tin" }
          ]
        }
      ]
    }
  }
};
