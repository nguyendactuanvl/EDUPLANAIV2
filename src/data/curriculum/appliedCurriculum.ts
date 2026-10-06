import { SemesterData } from '../knttCurriculum';

export const EXPERIENTIAL_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "hdtn12_s1_c1",
          name: "Chủ đề 1: Xây dựng văn hóa học đường & Hoàn thiện bản thân",
          lessons: [
            { id: "hdtn12_s1_c1_l1", name: "Bài 1: Thể hiện trách nhiệm của học sinh cuối cấp với trường, lớp và cộng đồng" },
            { id: "hdtn12_s1_c1_l2", name: "Bài 2: Rèn luyện tính tự chủ, kiên định và vượt qua áp lực tâm lí thi cử" },
            { id: "hdtn12_s1_c1_l3", name: "Bài 3: Xây dựng và duy trì các mối quan hệ tốt đẹp trong gia đình và xã hội" }
          ]
        },
        {
          id: "hdtn12_s1_c2",
          name: "Chủ đề 2: Kế hoạch tài chính & Phát triển cộng đồng",
          lessons: [
            { id: "hdtn12_s1_c2_l4", name: "Bài 4: Quản lí tài chính cá nhân và lập kế hoạch chi tiêu đại học/nghề nghiệp" },
            { id: "hdtn12_s1_c2_l5", name: "Bài 5: Tham gia các hoạt động tình nguyện và dự án phát triển cộng đồng" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "hdtn12_s2_c3",
          name: "Chủ đề 3: Khám phá thế giới nghề nghiệp & Định hướng tương lai",
          lessons: [
            { id: "hdtn12_s2_c3_l6", name: "Bài 6: Khám phá xu hướng thị trường lao động trong kỉ nguyên số" },
            { id: "hdtn12_s2_c3_l7", name: "Bài 7: Tìm hiểu hệ thống các trường đại học, cao đẳng và giáo dục nghề nghiệp" },
            { id: "hdtn12_s2_c3_l8", name: "Bài 8: Đánh giá sự phù hợp của bản thân với nhóm ngành nghề lựa chọn" }
          ]
        },
        {
          id: "hdtn12_s2_c4",
          name: "Chủ đề 4: Ra quyết định chọn nghề & Kế hoạch chuyển tiếp",
          lessons: [
            { id: "hdtn12_s2_c4_l9", name: "Bài 9: Xây dựng kế hoạch học tập, chọn ngành, chọn trường thi phù hợp" },
            { id: "hdtn12_s2_c4_l10", name: "Bài 10: Chuẩn bị tâm lí và kĩ năng sẵn sàng hòa nhập môi trường mới" }
          ]
        }
      ]
    }
  },
  10: {
    semester_1: {
      chapters: [
        {
          id: "hdtn10_s1_c1",
          name: "Chủ đề 1: Phát huy truyền thống nhà trường & Xây dựng nề nếp lớp học",
          lessons: [
            { id: "hdtn10_s1_c1_l1", name: "Bài 1: Phát huy truyền thống nhà trường và xây dựng nề nếp lớp học" },
            { id: "hdtn10_s1_c1_l2", name: "Bài 2: Khám phá bản thân và nhận diện hứng thú nghề nghiệp" },
            { id: "hdtn10_s1_c1_l3", name: "Bài 3: Quản lí cảm xúc và ứng xử tích cực trong các mối quan hệ" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "hdtn10_s2_c2",
          name: "Chủ đề 2: Tìm hiểu nghề nghiệp & Lập kế hoạch tài chính cá nhân",
          lessons: [
            { id: "hdtn10_s2_c2_l4", name: "Bài 4: Tìm hiểu các nhóm nghề truyền thống và hiện đại tại địa phương" },
            { id: "hdtn10_s2_c2_l5", name: "Bài 5: Lập kế hoạch rèn luyện phẩm chất và năng lực nghề nghiệp" },
            { id: "hdtn10_s2_c2_l6", name: "Bài 6: Xây dựng kế hoạch tài chính cá nhân và tiết kiệm" }
          ]
        }
      ]
    }
  }
};

export const DEFENSE_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "gdqp12_s1_c1",
          name: "Chủ đề 1: Một số nội dung cơ bản về an ninh quốc gia & Bảo vệ Tổ quốc",
          lessons: [
            { id: "gdqp12_s1_c1_l1", name: "Bài 1: Bảo vệ an ninh quốc gia và giữ gìn trật tự an toàn xã hội" },
            { id: "gdqp12_s1_c1_l2", name: "Bài 2: Phòng chống tội phạm và tệ nạn xã hội trong học đường" },
            { id: "gdqp12_s1_c1_l3", name: "Bài 3: Xây dựng nền quốc phòng toàn dân và an ninh nhân dân vững mạnh" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "gdqp12_s2_c2",
          name: "Chủ đề 2: Kĩ thuật bắn súng, chiến thuật & Quân binh chủng",
          lessons: [
            { id: "gdqp12_s2_c2_l4", name: "Bài 4: Kĩ thuật bắn súng tiểu liên AK và súng trường CKC" },
            { id: "gdqp12_s2_c2_l5", name: "Bài 5: Hiểu biết chung về các quân binh chủng Quân đội nhân dân Việt Nam" },
            { id: "gdqp12_s2_c2_l6", name: "Bài 6: Chiến thuật từng người trong chiến đấu tiến công và phòng ngự" },
            { id: "gdqp12_s2_c2_l7", name: "Bài 7: Kĩ thuật cấp cứu và vận chuyển thương binh trên chiến trường" }
          ]
        }
      ]
    }
  },
  10: {
    semester_1: {
      chapters: [
        {
          id: "gdqp10_s1_c1",
          name: "Chủ đề 1: Lịch sử nghệ thuật quân sự & Điều lệnh",
          lessons: [
            { id: "gdqp10_s1_c1_l1", name: "Bài 1: Lịch sử nghệ thuật quân sự Việt Nam qua các thời kì" },
            { id: "gdqp10_s1_c1_l2", name: "Bài 2: Điều lệnh đội ngũ từng người không có súng và có súng" },
            { id: "gdqp10_s1_c1_l3", name: "Bài 3: Đội ngũ đơn vị cơ bản" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "gdqp10_s2_c2",
          name: "Chủ đề 2: Phòng thủ dân sự & Sơ cấp cứu",
          lessons: [
            { id: "gdqp10_s2_c2_l4", name: "Bài 4: Phòng chống thiên tai, dịch bệnh và phòng thủ dân sự" },
            { id: "gdqp10_s2_c2_l5", name: "Bài 5: Kĩ thuật băng bó và sơ cứu vết thương ban đầu" },
            { id: "gdqp10_s2_c2_l6", name: "Bài 6: Tác hại của ma túy và trách nhiệm phòng chống ma túy trong học đường" }
          ]
        }
      ]
    }
  }
};

export const ENGLISH_KNTT: Record<number, Record<'semester_1' | 'semester_2', SemesterData>> = {
  12: {
    semester_1: {
      chapters: [
        {
          id: "eng12_s1_c1",
          name: "Term 1: Global Success Units 1 - 5",
          lessons: [
            { id: "eng12_s1_c1_l1", name: "Unit 1: Life stories we admire" },
            { id: "eng12_s1_c1_l2", name: "Unit 2: A diversity of cultures" },
            { id: "eng12_s1_c1_l3", name: "Unit 3: Green living and environmental sustainability" },
            { id: "eng12_s1_c1_l4", name: "Unit 4: Urbanisation and modern cities" },
            { id: "eng12_s1_c1_l5", name: "Unit 5: The world of work and career choices" }
          ]
        }
      ]
    },
    semester_2: {
      chapters: [
        {
          id: "eng12_s2_c2",
          name: "Term 2: Global Success Units 6 - 10",
          lessons: [
            { id: "eng12_s2_c2_l6", name: "Unit 6: Artificial intelligence in daily life" },
            { id: "eng12_s2_c2_l7", name: "Unit 7: The world of higher education" },
            { id: "eng12_s2_c2_l8", name: "Unit 8: Lifelong learning and skill development" },
            { id: "eng12_s2_c2_l9", name: "Unit 9: Travelling the world and ecotourism" },
            { id: "eng12_s2_c2_l10", name: "Unit 10: Career paths and professional development" }
          ]
        }
      ]
    }
  }
};
