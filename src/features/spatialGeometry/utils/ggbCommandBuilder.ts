import { GeometryPreset, ConstructionStep } from '../types/geometry.types';

export const GEOMETRY_PRESETS: GeometryPreset[] = [
  // =========================================================================
  // CẤP 2 (THCS): HÌNH HỌC TRỰC QUAN & BÓC VỎ NET 2D
  // =========================================================================
  {
    id: 'thcs_cube',
    name: '1. Hình lập phương ABCD.A\'B\'C\'D\'',
    gradeLevel: 'THCS',
    categoryName: 'Khối hộp & Lăng trụ',
    description: 'Hình lập phương 6 mặt đều bằng nhau. Hỗ trợ bóc vỏ (Unfold 2D) để tính $S_{xq}$ và $S_{tp}$.',
    unfoldAvailable: true,
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 4, z: 0 },
      'D': { name: 'D', x: 0, y: 4, z: 0 },
      'A\'': { name: 'A\'', x: 0, y: 0, z: 4 },
      'B\'': { name: 'B\'', x: 4, y: 0, z: 4 },
      'C\'': { name: 'C\'', x: 4, y: 4, z: 4 },
      'D\'': { name: 'D\'', x: 0, y: 4, z: 4 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 4, 0)',
      'D = (0, 4, 0)',
      'A\' = (0, 0, 4)',
      'B\' = (4, 0, 4)',
      'C\' = (4, 4, 4)',
      'D\' = (0, 4, 4)',
      'cube1 = Cube(A, B, C)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Dựng đáy ABCD',
        commentary: 'Đáy $ABCD$ là hình vuông cạnh $a = 4$. Trong góc nhìn phối cảnh 3D, đáy được vẽ thành hình bình hành.',
        ggbCommands: ['Polygon(A, B, C, D)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng các cạnh bên đứng',
        commentary: 'Dựng các cạnh bên vuông góc với đáy: $AA\', BB\', CC\', DD\'$ cùng có độ dài $h = 4$.',
        ggbCommands: ['Segment(A, A\')', 'Segment(B, B\')', 'Segment(C, C\')', 'Segment(D, D\')']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Hoàn thiện mặt trên A\'B\'C\'D\'',
        commentary: 'Nối các đỉnh $A\', B\', C\', D\'$ để tạo thành mặt đáy trên song song và bằng mặt đáy dưới.',
        ggbCommands: ['Polygon(A\', B\', C\', D\')']
      }
    ]
  },
  {
    id: 'thcs_rect_prism',
    name: '2. Hình hộp chữ nhật ABCD.A\'B\'C\'D\'',
    gradeLevel: 'THCS',
    categoryName: 'Khối hộp & Lăng trụ',
    description: 'Hình hộp chữ nhật kích thước $a = 5, b = 3, h = 4$.',
    unfoldAvailable: true,
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 5, y: 0, z: 0 },
      'C': { name: 'C', x: 5, y: 3, z: 0 },
      'D': { name: 'D', x: 0, y: 3, z: 0 },
      'A\'': { name: 'A\'', x: 0, y: 0, z: 4 },
      'B\'': { name: 'B\'', x: 5, y: 0, z: 4 },
      'C\'': { name: 'C\'', x: 5, y: 3, z: 4 },
      'D\'': { name: 'D\'', x: 0, y: 3, z: 4 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (5, 0, 0)',
      'C = (5, 3, 0)',
      'D = (0, 3, 0)',
      'A\' = (0, 0, 4)',
      'B\' = (5, 0, 4)',
      'C\' = (5, 3, 4)',
      'D\' = (0, 3, 4)',
      'Prism(A, B, C, D, A\')'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Khởi tạo mặt đáy ABCD',
        commentary: 'Mặt đáy $ABCD$ là hình chữ nhật với chiều dài $a = 5$ và chiều rộng $b = 3$.',
        ggbCommands: ['Polygon(A, B, C, D)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng chiều cao h = 4',
        commentary: 'Kéo dựng 4 đoạn thẳng đứng vuông góc đáy để định vị mặt trên $A\'B\'C\'D\'$.',
        ggbCommands: ['Prism(A, B, C, D, A\')']
      }
    ]
  },
  {
    id: 'thcs_tri_prism',
    name: '3. Lăng trụ đứng tam giác ABC.A\'B\'C\'',
    gradeLevel: 'THCS',
    categoryName: 'Khối hộp & Lăng trụ',
    description: 'Lăng trụ đứng tam giác có đáy $ABC$ vuông tại $A$ ($AB = 3, AC = 4$), chiều cao $h = 5$.',
    unfoldAvailable: true,
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 3, y: 0, z: 0 },
      'C': { name: 'C', x: 0, y: 4, z: 0 },
      'A\'': { name: 'A\'', x: 0, y: 0, z: 5 },
      'B\'': { name: 'B\'', x: 3, y: 0, z: 5 },
      'C\'': { name: 'C\'', x: 0, y: 4, z: 5 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (3, 0, 0)',
      'C = (0, 4, 0)',
      'A\' = (0, 0, 5)',
      'B\' = (3, 0, 5)',
      'C\' = (0, 4, 5)',
      'Prism(A, B, C, A\')'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Vẽ đáy tam giác vuông ABC',
        commentary: 'Đáy $ABC$ vuông tại $A$, $AB = 3, AC = 4$. Cạnh huyền $BC = \\sqrt{3^2 + 4^2} = 5$.',
        ggbCommands: ['Polygon(A, B, C)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng Lăng trụ đứng',
        commentary: 'Dựng các đường cao $AA\', BB\', CC\'$ vuông góc với mặt phẳng đáy $(ABC)$.',
        ggbCommands: ['Prism(A, B, C, A\')']
      }
    ]
  },

  // =========================================================================
  // CẤP 3 (LỚP 11 - GDPT 2018): TOÀN BỘ 10 CHỦ ĐỀ CHUẨN
  // =========================================================================
  {
    id: 'lop11_intersection_lines',
    name: '1. Giao tuyến hai mặt phẳng (SAC) ∩ (SBD) = SO',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 1: Giao tuyến & Giao điểm',
    description: 'Chóp $S.ABCD$ có $AC \cap BD = O$. Giao tuyến của hai mặt phẳng $(SAC)$ và $(SBD)$ là đường thẳng $SO$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -2, z: 0 },
      'B': { name: 'B', x: 2, y: -2, z: 0 },
      'C': { name: 'C', x: 2, y: 2, z: 0 },
      'D': { name: 'D', x: -2, y: 2, z: 0 },
      'O': { name: 'O', x: 0, y: 0, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 }
    },
    initialCommands: [
      'A = (-2, -2, 0)',
      'B = (2, -2, 0)',
      'C = (2, 2, 0)',
      'D = (-2, 2, 0)',
      'S = (0, 0, 5)',
      'pyr = Pyramid(A, B, C, D, S)',
      'O = Midpoint(A, C)',
      'Segment(S, O)',
      'Segment(A, C)',
      'Segment(B, D)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Tìm điểm chung thứ nhất S',
        commentary: 'Đỉnh $S$ thuộc cả hai mặt phẳng $(SAC)$ và $(SBD)$ nên $S$ là điểm chung thứ nhất.',
        ggbCommands: ['Pyramid(A, B, C, D, S)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Tìm giao điểm O = AC ∩ BD',
        commentary: 'Trong mặt phẳng đáy $(ABCD)$, hai đường chéo $AC$ và $BD$ cắt nhau tại $O$. Do $O \in AC \subset (SAC)$ và $O \in BD \subset (SBD)$ nên $O$ là điểm chung thứ hai.',
        ggbCommands: ['Segment(A, C)', 'Segment(B, D)', 'O = Midpoint(A, C)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Kết luận giao tuyến SO',
        commentary: 'Đường thẳng nối hai điểm chung $S$ và $O$ chính là giao tuyến $SO = (SAC) \cap (SBD)$.',
        ggbCommands: ['Segment(S, O)']
      }
    ]
  },
  {
    id: 'lop11_parallel_lines',
    name: '2. Hai đường thẳng song song: Giao tuyến (SAB) ∩ (SCD) // AB',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 2: Đường thẳng song song',
    description: 'Chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành. Giao tuyến $Sx$ của $(SAB)$ và $(SCD)$ đi qua $S$ và song song $AB, CD$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -1.5, z: 0 },
      'B': { name: 'B', x: 2, y: -1.5, z: 0 },
      'C': { name: 'C', x: 3.5, y: 1.5, z: 0 },
      'D': { name: 'D', x: -0.5, y: 1.5, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 }
    },
    initialCommands: [
      'A = (-2, -1.5, 0)',
      'B = (2, -1.5, 0)',
      'C = (3.5, 1.5, 0)',
      'D = (-0.5, 1.5, 0)',
      'S = (0, 0, 5)',
      'pyr = Pyramid(A, B, C, D, S)',
      'Line(S, Vector((1,0,0)))'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Xác định điểm chung S và cặp đường song song',
        commentary: 'Hai mặt phẳng $(SAB)$ và $(SCD)$ chứa điểm chung $S$, chứa lần lượt hai đường thẳng song song $AB // CD$.',
        ggbCommands: ['Pyramid(A, B, C, D, S)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng đường thẳng Sx // AB // CD',
        commentary: 'Theo định lý về giao tuyến song song: Giao tuyến $d$ đi qua $S$ và song song với $AB$ và $CD$.',
        ggbCommands: ['Line(S, Vector((1,0,0)))']
      }
    ]
  },
  {
    id: 'lop11_line_parallel_plane',
    name: '3. Đường thẳng song song mặt phẳng MN // (ABCD)',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 3: Đường song song mặt',
    description: 'Chóp $S.ABCD$, $M$ và $N$ lần lượt là trung điểm của $SA$ và $SB$. Chứng minh $MN // (ABCD)$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -2, z: 0 },
      'B': { name: 'B', x: 2, y: -2, z: 0 },
      'C': { name: 'C', x: 2, y: 2, z: 0 },
      'D': { name: 'D', x: -2, y: 2, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 },
      'M': { name: 'M', x: -1, y: -1, z: 2.5 },
      'N': { name: 'N', x: 1, y: -1, z: 2.5 }
    },
    initialCommands: [
      'A = (-2, -2, 0)',
      'B = (2, -2, 0)',
      'C = (2, 2, 0)',
      'D = (-2, 2, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'M = Midpoint(S, A)',
      'N = Midpoint(S, B)',
      'Segment(M, N)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Xác định đường trung bình MN',
        commentary: 'Trong tam giác $SAB$, $MN$ là đường trung bình nên $MN // AB$.',
        ggbCommands: ['M = Midpoint(S, A)', 'N = Midpoint(S, B)', 'Segment(M, N)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Kết luận MN // (ABCD)',
        commentary: 'Vì $MN // AB$, mà $AB \subset (ABCD)$ và $MN \not\subset (ABCD)$, suy ra $MN // (ABCD)$.',
        ggbCommands: ['Segment(A, B)']
      }
    ]
  },
  {
    id: 'lop11_parallel_planes',
    name: '4. Hai mặt phẳng song song (ABC) // (A\'B\'C\')',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 4: Hai mặt phẳng song song',
    description: 'Lăng trụ đứng $ABC.A\'B\'C\'$ có hai mặt phẳng đáy $(ABC) // (A\'B\'C\')$.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 1, y: 3, z: 0 },
      'A\'': { name: 'A\'', x: 0, y: 0, z: 5 },
      'B\'': { name: 'B\'', x: 4, y: 0, z: 5 },
      'C\'': { name: 'C\'', x: 1, y: 3, z: 5 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (1, 3, 0)',
      'A\' = (0, 0, 5)',
      'B\' = (4, 0, 5)',
      'C\' = (1, 3, 5)',
      'Prism(A, B, C, A\')'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Dựng đáy dưới (ABC) & đáy trên (A\'B\'C\')',
        commentary: 'Mặt phẳng đáy trên $(A\'B\'C\')$ chứa hai đường cắt nhau $A\'B\' // AB$ và $A\'C\' // AC$. Suy ra $(ABC) // (A\'B\'C\')$.',
        ggbCommands: ['Prism(A, B, C, A\')']
      }
    ]
  },
  {
    id: 'lop11_sa_perp_abcd',
    name: '5. Cạnh bên vuông góc đáy SA ⊥ (ABCD)',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 6: Đường thẳng ⊥ Mặt phẳng',
    description: 'Khối chóp $S.ABCD$ có $SA \perp (ABCD)$, đáy $ABCD$ là hình chữ nhật.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 3, z: 0 },
      'D': { name: 'D', x: 0, y: 3, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 3, 0)',
      'D = (0, 3, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'Segment(A, S)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Dựng đáy ABCD',
        commentary: 'Đáy $ABCD$ là hình chữ nhật ($AB = 4, AD = 3$). Cạnh bị khuất $AD$ được vẽ nét đứt.',
        ggbCommands: ['Polygon(A, B, C, D)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng SA ⊥ (ABCD)',
        commentary: 'Vì $SA \perp (ABCD)$ nên $SA \perp AB$ và $SA \perp AD$. $A$ chính là chân đường cao.',
        ggbCommands: ['Segment(A, S)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Dựng khối chóp',
        commentary: 'Nối $S$ tới $B, C, D$. Tất cả các mặt bên $SAB, SAD$ là các tam giác vuông tại $A$.',
        ggbCommands: ['Pyramid(A, B, C, D, S)']
      }
    ]
  },
  {
    id: 'lop11_sab_perp_abcd',
    name: '6. Mặt bên vuông góc đáy (SAB) ⊥ (ABCD)',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 7: Hai mặt phẳng ⊥',
    description: 'Chóp $S.ABCD$ có mặt bên $(SAB)$ là tam giác đều nằm trong mặt phẳng vuông góc với đáy $(ABCD)$. Đường cao $SH \perp AB \Rightarrow SH \perp (ABCD)$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -2, z: 0 },
      'B': { name: 'B', x: 2, y: -2, z: 0 },
      'C': { name: 'C', x: 2, y: 2, z: 0 },
      'D': { name: 'D', x: -2, y: 2, z: 0 },
      'H': { name: 'H', x: 0, y: -2, z: 0 },
      'S': { name: 'S', x: 0, y: -2, z: 3.46 }
    },
    initialCommands: [
      'A = (-2, -2, 0)',
      'B = (2, -2, 0)',
      'C = (2, 2, 0)',
      'D = (-2, 2, 0)',
      'H = (0, -2, 0)',
      'S = (0, -2, 3.46)',
      'Pyramid(A, B, C, D, S)',
      'Segment(S, H)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Xác định chân đường cao H trên AB',
        commentary: 'Vì $(SAB) \perp (ABCD)$ theo giao tuyến $AB$, nên đường cao $SH \perp AB$ trong tam giác $SAB$ cũng sẽ vuông góc với mặt phẳng đáy $(ABCD)$.',
        ggbCommands: ['H = Midpoint(A, B)', 'Segment(S, H)']
      }
    ]
  },
  {
    id: 'lop11_angle_line_plane',
    name: '7. Góc giữa đường thẳng và mặt phẳng góc(SD, (ABCD))',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 8: Góc trong không gian',
    description: 'Góc giữa cạnh bên $SD$ và mặt đáy $(ABCD)$ chính là góc giữa $SD$ và hình chiếu $AD$, tức góc $\\widehat{SDA}$.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 3, z: 0 },
      'D': { name: 'D', x: 0, y: 3, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 3, 0)',
      'D = (0, 3, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'Angle(S, D, A)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Tìm hình chiếu của S trên (ABCD)',
        commentary: 'Vì $SA \perp (ABCD)$ nên $A$ là hình chiếu vuông góc của $S$ trên $(ABCD)$.',
        ggbCommands: ['Segment(S, A)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Tìm hình chiếu của SD',
        commentary: 'Hình chiếu vuông góc của đoạn thẳng $SD$ trên mặt phẳng đáy $(ABCD)$ chính là đoạn thẳng $AD$.',
        ggbCommands: ['Segment(A, D)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Xác định góc SDA',
        commentary: 'Góc $(SD, (ABCD)) = (SD, AD) = \\widehat{SDA}$. Ta có $\\tan \\widehat{SDA} = \\frac{SA}{AD} = \\frac{5}{3} \\Rightarrow \\widehat{SDA} \\approx 59.0^\\circ$.',
        ggbCommands: ['Angle(S, D, A)']
      }
    ]
  },
  {
    id: 'lop11_distance_point_plane',
    name: '8. Khoảng cách từ điểm A đến mặt phẳng (SBC): d(A, (SBC)) = AH',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 9: Khoảng cách',
    description: 'Chóp $S.ABCD$ có $SA \perp (ABCD)$. Kẻ $AH \perp SB \Rightarrow AH \perp (SBC) \Rightarrow d(A, (SBC)) = AH$.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 3, z: 0 },
      'D': { name: 'D', x: 0, y: 3, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 },
      'H': { name: 'H', x: 1.56, y: 0, z: 3.05 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 3, 0)',
      'D = (0, 3, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'H = (1.56, 0, 3.05)',
      'Segment(A, H)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Kẻ AH ⊥ SB',
        commentary: 'Trong mặt phẳng vuông góc $(SAB)$, kẻ đường cao $AH \perp SB$ tại $H$.',
        ggbCommands: ['H = (1.56, 0, 3.05)', 'Segment(A, H)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Chứng minh AH ⊥ (SBC)',
        commentary: 'Ta có $AH \perp SB$ và $AH \perp BC$ (vì $BC \perp (SAB)$). Suy ra $AH \perp (SBC)$. Độ dài $AH = \\frac{SA \\cdot AB}{\\sqrt{SA^2 + AB^2}} = \\frac{5 \\cdot 4}{\\sqrt{25 + 16}} = \\frac{20}{\\sqrt{41}} \\approx 3.12$.',
        ggbCommands: ['Segment(A, H)']
      }
    ]
  },
  {
    id: 'lop11_slice_section',
    name: '9. Bài toán Thiết diện lát cắt động (α) // Đáy',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 10: Thiết diện động',
    description: 'Mặt phẳng $(\\alpha)$ đi qua điểm $M \in SA$ và song song với đáy $(ABCD)$, tạo thiết diện đa giác cắt $MNPQ$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -2, z: 0 },
      'B': { name: 'B', x: 2, y: -2, z: 0 },
      'C': { name: 'C', x: 2, y: 2, z: 0 },
      'D': { name: 'D', x: -2, y: 2, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 },
      'M': { name: 'M', x: -1, y: -1, z: 2.5 },
      'N': { name: 'N', x: 1, y: -1, z: 2.5 },
      'P': { name: 'P', x: 1, y: 1, z: 2.5 },
      'Q': { name: 'Q', x: -1, y: 1, z: 2.5 }
    },
    initialCommands: [
      'A = (-2, -2, 0)',
      'B = (2, -2, 0)',
      'C = (2, 2, 0)',
      'D = (-2, 2, 0)',
      'S = (0, 0, 5)',
      'pyr = Pyramid(A, B, C, D, S)',
      'k = Slider(0.1, 0.9, 0.05, 1, 100, false, true, false, false)',
      'SetValue(k, 0.5)',
      'M = A + k * (S - A)',
      'N = B + k * (S - B)',
      'P = C + k * (S - C)',
      'Q = D + k * (S - D)',
      'sec = Polygon(M, N, P, Q)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Xác định điểm M trên cạnh SA',
        commentary: 'Lấy điểm $M$ thuộc cạnh bên $SA$ theo tỉ số $k = \\frac{SM}{SA}$.',
        ggbCommands: ['M = A + 0.5 * (S - A)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng các giao tuyến song song',
        commentary: 'Kẻ $MN // AB$, $NP // BC$, $PQ // CD$, $QM // DA$.',
        ggbCommands: ['Segment(M, N)', 'Segment(N, P)', 'Segment(P, Q)', 'Segment(Q, M)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Phủ màu thiết diện MNPQ',
        commentary: 'Thiết diện $MNPQ$ thu được là hình đồng dạng với đáy $ABCD$ theo tỉ số $1 - k$.',
        ggbCommands: ['Polygon(M, N, P, Q)']
      }
    ]
  },
  {
    id: 'lop11_angle_two_planes',
    name: '10. Góc giữa hai mặt phẳng: ((SBC), (ABCD))',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 8: Góc trong không gian',
    description: 'Chóp $S.ABCD$ có $SA \\perp (ABCD)$, đáy $ABCD$ là hình vuông. Góc giữa $(SBC)$ và $(ABCD)$ là góc phẳng nhị diện $[S, BC, A] = \\widehat{SBA}$.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 4, z: 0 },
      'D': { name: 'D', x: 0, y: 4, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 4 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 4, 0)',
      'D = (0, 4, 0)',
      'S = (0, 0, 4)',
      'Pyramid(A, B, C, D, S)',
      'Angle(S, B, A)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Tìm giao tuyến BC',
        commentary: 'Hai mặt phẳng $(SBC)$ và $(ABCD)$ có giao tuyến chung là đường thẳng $BC$.',
        ggbCommands: ['Segment(B, C)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Tìm hai đường thẳng cùng vuông góc với BC tại B',
        commentary: 'Trong mặt đáy $(ABCD)$, ta có $AB \\perp BC$. Trong mặt bên $(SBC)$, ta có $BC \\perp (SAB)$ vì $BC \\perp AB$ và $BC \\perp SA$, do đó $SB \\perp BC$.',
        ggbCommands: ['Segment(S, B)', 'Segment(A, B)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Xác định góc giữa hai mặt phẳng',
        commentary: 'Góc giữa $(SBC)$ và $(ABCD)$ là góc giữa $SB$ và $AB$, chính là $\\widehat{SBA} = 45^\\circ$ (do tam giác $SAB$ vuông cân tại $A$ với $SA = AB = 4$).',
        ggbCommands: ['Angle(S, B, A)']
      }
    ]
  },
  {
    id: 'lop11_skew_lines_distance',
    name: '11. Khoảng cách giữa 2 đường chéo nhau d(SA, BC)',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 9: Khoảng cách',
    description: 'Tìm đoạn vuông góc chung và khoảng cách giữa hai đường thẳng chéo nhau $SA$ và $BC$. Vì $SA \\perp (ABCD)$ và đáy là hình chữ nhật nên $AB$ là đoạn vuông góc chung.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 3, z: 0 },
      'D': { name: 'D', x: 0, y: 3, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 3, 0)',
      'D = (0, 3, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'Segment(A, B)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Kiểm tra tính vuông góc của AB',
        commentary: 'Ta có $AB \\perp SA$ (do $SA \\perp (ABCD)$) và $AB \\perp BC$ (do $ABCD$ là hình chữ nhật).',
        ggbCommands: ['Segment(A, B)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Kết luận đoạn vuông góc chung và khoảng cách',
        commentary: 'Đoạn $AB$ cắt cả $SA$ và $BC$, đồng thời vuông góc với cả hai đường. Vậy $AB$ là đoạn vuông góc chung. Khoảng cách $d(SA, BC) = AB = 4$.',
        ggbCommands: ['Segment(A, B)', 'Segment(S, A)', 'Segment(B, C)']
      }
    ]
  },
  {
    id: 'lop11_regular_tetrahedron',
    name: '12. Khối chóp tam giác đều S.ABC (Đường cao SG)',
    gradeLevel: 'Lop11',
    categoryName: 'Khối đa diện đặc biệt',
    description: 'Hình chóp tam giác đều $S.ABC$ có đáy $ABC$ là tam giác đều tâm $G$. Chiều cao $SG \\perp (ABC)$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -1.15, z: 0 },
      'B': { name: 'B', x: 2, y: -1.15, z: 0 },
      'C': { name: 'C', x: 0, y: 2.31, z: 0 },
      'G': { name: 'G', x: 0, y: 0, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 4 }
    },
    initialCommands: [
      'A = (-2, -1.15, 0)',
      'B = (2, -1.15, 0)',
      'C = (0, 2.31, 0)',
      'G = (0, 0, 0)',
      'S = (0, 0, 4)',
      'Pyramid(A, B, C, S)',
      'Segment(S, G)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Dựng đáy tam giác đều ABC và trọng tâm G',
        commentary: 'Đáy $ABC$ là tam giác đều cạnh $a = 4$. Trọng tâm $G(0,0,0)$ chính là tâm đường tròn ngoại tiếp tam giác đều.',
        ggbCommands: ['Polygon(A, B, C)', 'G = (0, 0, 0)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng trục đường cao SG ⊥ (ABC)',
        commentary: 'Từ trọng tâm $G$, dựng đoạn thẳng đứng $SG$ vuông góc với mặt phẳng đáy $(ABC)$.',
        ggbCommands: ['Segment(S, G)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Nối các cạnh bên',
        commentary: 'Nối $S$ tới $A, B, C$. Các cạnh bên bằng nhau $SA = SB = SC = \\sqrt{SG^2 + AG^2} = \\sqrt{4^2 + (\\frac{4}{\\sqrt{3}})^2} = \\sqrt{16 + \\frac{16}{3}} \\approx 4.62$.',
        ggbCommands: ['Pyramid(A, B, C, S)']
      }
    ]
  },
  {
    id: 'lop11_section_three_points',
    name: '13. Thiết diện qua 3 điểm M, N, P (Mở rộng mặt phẳng)',
    gradeLevel: 'Lop11',
    categoryName: 'Bài 10: Thiết diện mặt phẳng',
    description: 'Thiết diện cắt hình chóp $S.ABCD$ bởi mặt phẳng $(MNP)$ với $M \\in SA, N \\in SB, P \\in SC$.',
    points3D: {
      'A': { name: 'A', x: -2, y: -2, z: 0 },
      'B': { name: 'B', x: 2, y: -2, z: 0 },
      'C': { name: 'C', x: 2, y: 2, z: 0 },
      'D': { name: 'D', x: -2, y: 2, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 },
      'M': { name: 'M', x: -1, y: -1, z: 2.5 },
      'N': { name: 'N', x: 1.33, y: -1.33, z: 1.67 },
      'P': { name: 'P', x: 1, y: 1, z: 2.5 },
      'Q': { name: 'Q', x: -1.33, y: 1.33, z: 1.67 }
    },
    initialCommands: [
      'A = (-2, -2, 0)',
      'B = (2, -2, 0)',
      'C = (2, 2, 0)',
      'D = (-2, 2, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'M = (-1, -1, 2.5)',
      'N = (1.33, -1.33, 1.67)',
      'P = (1, 1, 2.5)',
      'Q = (-1.33, 1.33, 1.67)',
      'sec = Polygon(M, N, P, Q)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Nối MN và NP',
        commentary: 'Vì $M \\in SA, N \\in SB \\Rightarrow MN \\subset (SAB)$ và $N \\in SB, P \\in SC \\Rightarrow NP \\subset (SBC)$.',
        ggbCommands: ['Segment(M, N)', 'Segment(N, P)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Tìm giao điểm mở rộng',
        commentary: 'Kéo dài $MN$ cắt $AB$ tại điểm $E$, kéo dài $NP$ cắt $BC$ tại điểm $F$. Giao tuyến của $(MNP)$ với đáy là đường thẳng $EF$.',
        ggbCommands: ['Segment(M, N)', 'Segment(N, P)']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Hoàn thiện thiết diện tứ giác MNPQ',
        commentary: 'Đường thẳng $EF$ cắt $AD$ và $CD$, từ đó dựng được điểm $Q \\in SD$. Thiết diện cần tìm là tứ giác $MNPQ$.',
        ggbCommands: ['Polygon(M, N, P, Q)']
      }
    ]
  },

  // =========================================================================
  // CẤP 3 (LỚP 12): THỂ TÍCH, KHỐI TRÒN XOAY & HỆ TRỤC Oxyz
  // =========================================================================
  {
    id: 'lop12_oxyz_pyramid',
    name: '1. Gắn hệ trục Oxyz vào chóp S.ABCD',
    gradeLevel: 'Lop12',
    categoryName: 'Phương pháp Tọa độ Oxyz',
    description: 'Chóp $S.ABCD$ vuông tại $A$. Tự động đặt gốc $O \equiv A$, các tia $Ox \equiv AB, Oy \equiv AD, Oz \equiv AS$ và tính tọa độ các đỉnh.',
    oxyzOrigin: 'A',
    oxyzCoordinates: {
      'A': { x: 0, y: 0, z: 0 },
      'B': { x: 4, y: 0, z: 0 },
      'D': { x: 0, y: 3, z: 0 },
      'C': { x: 4, y: 3, z: 0 },
      'S': { x: 0, y: 0, z: 5 }
    },
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 4, y: 0, z: 0 },
      'C': { name: 'C', x: 4, y: 3, z: 0 },
      'D': { name: 'D', x: 0, y: 3, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 5 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (4, 0, 0)',
      'C = (4, 3, 0)',
      'D = (0, 3, 0)',
      'S = (0, 0, 5)',
      'Pyramid(A, B, C, D, S)',
      'uOx = Vector((0,0,0), (6,0,0))',
      'uOy = Vector((0,0,0), (0,5,0))',
      'uOz = Vector((0,0,0), (0,0,7))'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Chọn gốc tọa độ O trùng với A',
        commentary: 'Chọn gốc $O \equiv A(0,0,0)$ vì tại $A$ có 3 đường đôi một vuông góc $AB, AD, AS$.',
        ggbCommands: ['A = (0, 0, 0)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng 3 trục Ox, Oy, Oz',
        commentary: 'Trục $Ox$ chứa tia $AB$, $Oy$ chứa tia $AD$, $Oz$ chứa tia $AS$.',
        ggbCommands: ['Vector((0,0,0), (6,0,0))', 'Vector((0,0,0), (0,5,0))', 'Vector((0,0,0), (0,0,7))']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Xác định tọa độ tất cả các đỉnh',
        commentary: 'Tọa độ: $A(0,0,0), B(4,0,0), D(0,3,0), C(4,3,0), S(0,0,5)$.',
        ggbCommands: ['Text("A(0,0,0)", A)', 'Text("B(4,0,0)", B)', 'Text("C(4,3,0)", C)', 'Text("S(0,0,5)", S)']
      }
    ]
  },
  {
    id: 'lop12_circumscribed_sphere',
    name: '2. Mặt cầu ngoại tiếp hình chóp S.ABC',
    gradeLevel: 'Lop12',
    categoryName: 'Mặt cầu & Khối tròn xoay',
    description: 'Xác định tâm $I$ và bán kính $R$ của mặt cầu ngoại tiếp hình chóp $S.ABC$ có $SA \perp (ABC)$.',
    points3D: {
      'A': { name: 'A', x: 0, y: 0, z: 0 },
      'B': { name: 'B', x: 3, y: 0, z: 0 },
      'C': { name: 'C', x: 0, y: 4, z: 0 },
      'S': { name: 'S', x: 0, y: 0, z: 6 },
      'O': { name: 'O', x: 1.5, y: 2, z: 0 },
      'I': { name: 'I', x: 1.5, y: 2, z: 3 }
    },
    initialCommands: [
      'A = (0, 0, 0)',
      'B = (3, 0, 0)',
      'C = (0, 4, 0)',
      'S = (0, 0, 6)',
      'O = (1.5, 2, 0)',
      'I = (1.5, 2, 3)',
      'Pyramid(A, B, C, S)',
      'Sphere(I, 3.905)'
    ],
    timelineSteps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Dựng tâm O ngoại tiếp đáy ABC',
        commentary: 'Tam giác $ABC$ vuông tại $A$ có trung điểm $O$ của cạnh huyền $BC$ chính là tâm đường tròn ngoại tiếp đáy.',
        ggbCommands: ['O = Midpoint(B, C)']
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Dựng trục đường tròn đáy',
        commentary: 'Dựng đường thẳng $d$ đi qua $O$ và vuông góc với mặt phẳng $(ABC)$.',
        ggbCommands: ['Line(O, Vector((0,0,1)))']
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Xác định tâm I mặt cầu',
        commentary: 'Dựng mặt phẳng trung trực của đoạn $SA$, cắt trục $d$ tại tâm $I(1.5, 2, 3)$. Bán kính $R = IA = \\sqrt{r_{đá}y^2 + (h/2)^2} = \\sqrt{2.5^2 + 3^2} = \\sqrt{15.25} \\approx 3.91$.',
        ggbCommands: ['I = (1.5, 2, 3)', 'Sphere(I, 3.905)']
      }
    ]
  }
];

export function getPresetsByGrade(gradeLevel: 'THCS' | 'Lop11' | 'Lop12'): GeometryPreset[] {
  return GEOMETRY_PRESETS.filter(p => p.gradeLevel === gradeLevel);
}
