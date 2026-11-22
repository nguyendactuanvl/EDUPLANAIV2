import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  ShadingType,
  VerticalAlign,
  convertMillimetersToTwip,
} from 'docx';

export interface MathTermEntry {
  vi: string;
  en: string;
  category: string;
}

export const CORE_MATH_TERMINOLOGY: MathTermEntry[] = [
  // Hàm số & Giải tích (Calculus & Functions)
  { vi: 'Hàm số', en: 'Function', category: 'Giải tích' },
  { vi: 'Tập xác định', en: 'Domain', category: 'Giải tích' },
  { vi: 'Tập giá trị', en: 'Range / Codomain', category: 'Giải tích' },
  { vi: 'Điều kiện xác định', en: 'Validity condition / Domain restriction', category: 'Giải tích' },
  { vi: 'Hàm số đồng biến', en: 'Strictly increasing function', category: 'Giải tích' },
  { vi: 'Hàm số nghịch biến', en: 'Strictly decreasing function', category: 'Giải tích' },
  { vi: 'Đơn điệu', en: 'Monotonicity', category: 'Giải tích' },
  { vi: 'Đạo hàm', en: 'Derivative', category: 'Giải tích' },
  { vi: 'Đạo hàm cấp hai', en: 'Second derivative', category: 'Giải tích' },
  { vi: 'Cực trị', en: 'Extrema / Critical point', category: 'Giải tích' },
  { vi: 'Cực đại', en: 'Local maximum', category: 'Giải tích' },
  { vi: 'Cực tiểu', en: 'Local minimum', category: 'Giải tích' },
  { vi: 'Giá trị lớn nhất (GTLN)', en: 'Global maximum / Absolute maximum', category: 'Giải tích' },
  { vi: 'Giá trị nhỏ nhất (GTNN)', en: 'Global minimum / Absolute minimum', category: 'Giải tích' },
  { vi: 'Tiệm cận đứng', en: 'Vertical asymptote', category: 'Giải tích' },
  { vi: 'Tiệm cận ngang', en: 'Horizontal asymptote', category: 'Giải tích' },
  { vi: 'Tiệm cận xiên', en: 'Oblique / Slant asymptote', category: 'Giải tích' },
  { vi: 'Bảng biến thiên', en: 'Variation table / Sign chart', category: 'Giải tích' },
  { vi: 'Đồ thị hàm số', en: 'Graph of the function', category: 'Giải tích' },
  { vi: 'Điểm uốn', en: 'Inflection point', category: 'Giải tích' },
  { vi: 'Tiếp tuyến', en: 'Tangent line', category: 'Giải tích' },
  { vi: 'Giới hạn', en: 'Limit', category: 'Giải tích' },
  { vi: 'Hàm số liên tục', en: 'Continuous function', category: 'Giải tích' },
  { vi: 'Nguyên hàm', en: 'Antiderivative / Indefinite integral', category: 'Giải tích' },
  { vi: 'Tích phân', en: 'Definite integral', category: 'Giải tích' },
  { vi: 'Phương pháp đổi biến số', en: 'Integration by substitution', category: 'Giải tích' },
  { vi: 'Tích phân từng phần', en: 'Integration by parts', category: 'Giải tích' },

  // Đại số & Số học (Algebra & Number Theory)
  { vi: 'Phương trình', en: 'Equation', category: 'Đại số' },
  { vi: 'Phương trình bậc hai', en: 'Quadratic equation', category: 'Đại số' },
  { vi: 'Bất phương trình', en: 'Inequality', category: 'Đại số' },
  { vi: 'Hệ phương trình', en: 'System of equations', category: 'Đại số' },
  { vi: 'Nghiệm', en: 'Root / Solution', category: 'Đại số' },
  { vi: 'Nghiệm duy nhất', en: 'Unique solution', category: 'Đại số' },
  { vi: 'Vô nghiệm', en: 'No solution', category: 'Đại số' },
  { vi: 'Nghiệm ngoại lai', en: 'Extraneous root', category: 'Đại số' },
  { vi: 'Bất đẳng thức', en: 'Inequality (relation)', category: 'Đại số' },
  { vi: 'Tham số', en: 'Parameter', category: 'Đại số' },
  { vi: 'Hệ số', en: 'Coefficient', category: 'Đại số' },
  { vi: 'Hằng số', en: 'Constant', category: 'Đại số' },
  { vi: 'Đa thức', en: 'Polynomial', category: 'Đại số' },
  { vi: 'Biểu thức', en: 'Expression', category: 'Đại số' },
  { vi: 'Rút gọn biểu thức', en: 'Simplify the expression', category: 'Đại số' },
  { vi: 'Phân thức đại số', en: 'Rational expression', category: 'Đại số' },
  { vi: 'Tử số', en: 'Numerator', category: 'Đại số' },
  { vi: 'Mẫu số', en: 'Denominator', category: 'Đại số' },
  { vi: 'Lũy thừa', en: 'Exponent / Power', category: 'Đại số' },
  { vi: 'Căn bậc hai', en: 'Square root', category: 'Đại số' },
  { vi: 'Lôgarit tự nhiên', en: 'Natural logarithm', category: 'Đại số' },
  { vi: 'Số nguyên', en: 'Integer', category: 'Số học' },
  { vi: 'Số nguyên tố', en: 'Prime number', category: 'Số học' },
  { vi: 'Chia hết', en: 'Divisible by', category: 'Số học' },
  { vi: 'Số dư', en: 'Remainder', category: 'Số học' },
  { vi: 'Số chính phương', en: 'Perfect square', category: 'Số học' },
  { vi: 'Dãy số', en: 'Sequence', category: 'Đại số' },
  { vi: 'Cấp số cộng', en: 'Arithmetic progression', category: 'Đại số' },
  { vi: 'Cấp số nhân', en: 'Geometric progression', category: 'Đại số' },
  { vi: 'Số hạng tổng quát', en: 'General term', category: 'Đại số' },
  { vi: 'Công sai', en: 'Common difference', category: 'Đại số' },
  { vi: 'Công bội', en: 'Common ratio', category: 'Đại số' },
  { vi: 'Hàm số lượng giác', en: 'Trigonometric function', category: 'Lượng giác' },
  { vi: 'Định lý Côsin', en: 'Law of Cosines', category: 'Lượng giác' },
  { vi: 'Định lý Sin', en: 'Law of Sines', category: 'Lượng giác' },

  // Tổ hợp & Xác suất & Thống kê (Combinatorics, Probability & Statistics)
  { vi: 'Không gian mẫu', en: 'Sample space', category: 'Xác suất' },
  { vi: 'Biến cố', en: 'Event', category: 'Xác suất' },
  { vi: 'Biến cố đối', en: 'Complementary event', category: 'Xác suất' },
  { vi: 'Xác suất', en: 'Probability', category: 'Xác suất' },
  { vi: 'Xác suất có điều kiện', en: 'Conditional probability', category: 'Xác suất' },
  { vi: 'Hoán vị', en: 'Permutation', category: 'Tổ hợp' },
  { vi: 'Chỉnh hợp', en: 'Variation / k-permutation', category: 'Tổ hợp' },
  { vi: 'Tổ hợp', en: 'Combination', category: 'Tổ hợp' },
  { vi: 'Nhị thức Newton', en: 'Binomial theorem', category: 'Tổ hợp' },
  { vi: 'Giá trị trung bình', en: 'Mean / Average', category: 'Thống kê' },
  { vi: 'Phương sai', en: 'Variance', category: 'Thống kê' },
  { vi: 'Độ lệch chuẩn', en: 'Standard deviation', category: 'Thống kê' },

  // Hình học & Tọa độ (Geometry & Vectors)
  { vi: 'Tam giác', en: 'Triangle', category: 'Hình học' },
  { vi: 'Tam giác vuông', en: 'Right triangle', category: 'Hình học' },
  { vi: 'Tam giác đều', en: 'Equilateral triangle', category: 'Hình học' },
  { vi: 'Tam giác cân', en: 'Isosceles triangle', category: 'Hình học' },
  { vi: 'Cạnh huyền', en: 'Hypotenuse', category: 'Hình học' },
  { vi: 'Đường cao', en: 'Altitude / Height', category: 'Hình học' },
  { vi: 'Đường trung tuyến', en: 'Median', category: 'Hình học' },
  { vi: 'Đường phân giác', en: 'Angle bisector', category: 'Hình học' },
  { vi: 'Đường trung trực', en: 'Perpendicular bisector', category: 'Hình học' },
  { vi: 'Đường tròn', en: 'Circle', category: 'Hình học' },
  { vi: 'Bán kính', en: 'Radius', category: 'Hình học' },
  { vi: 'Đường kính', en: 'Diameter', category: 'Hình học' },
  { vi: 'Dây cung', en: 'Chord', category: 'Hình học' },
  { vi: 'Chu vi', en: 'Perimeter', category: 'Hình học' },
  { vi: 'Diện tích', en: 'Area', category: 'Hình học' },
  { vi: 'Đường tròn ngoại tiếp', en: 'Circumscribed circle (Circumcircle)', category: 'Hình học' },
  { vi: 'Đường tròn nội tiếp', en: 'Inscribed circle (Incircle)', category: 'Hình học' },
  { vi: 'Song song', en: 'Parallel', category: 'Hình học' },
  { vi: 'Vuông góc', en: 'Perpendicular', category: 'Hình học' },
  { vi: 'Giao điểm', en: 'Intersection point', category: 'Hình học' },
  { vi: 'Hình chiếu vuông góc', en: 'Orthogonal projection', category: 'Hình học' },
  { vi: 'Hai tam giác đồng dạng', en: 'Similar triangles', category: 'Hình học' },
  { vi: 'Hai tam giác bằng nhau', en: 'Congruent triangles', category: 'Hình học' },
  { vi: 'Hệ trục tọa độ', en: 'Coordinate system', category: 'Hình học' },
  { vi: 'Hình chóp', en: 'Pyramid', category: 'Hình học không gian' },
  { vi: 'Hình lăng trụ', en: 'Prism', category: 'Hình học không gian' },
  { vi: 'Mặt cầu', en: 'Sphere', category: 'Hình học không gian' },
  { vi: 'Hình trụ', en: 'Cylinder', category: 'Hình học không gian' },
  { vi: 'Hình nón', en: 'Cone', category: 'Hình học không gian' },
  { vi: 'Góc nhị diện', en: 'Dihedral angle', category: 'Hình học không gian' },
  { vi: 'Thể tích', en: 'Volume', category: 'Hình học không gian' },
  { vi: 'Diện tích toàn phần', en: 'Total surface area', category: 'Hình học không gian' },
  { vi: 'Vectơ pháp tuyến', en: 'Normal vector', category: 'Hình học Oxyz' },
  { vi: 'Vectơ chỉ phương', en: 'Direction vector', category: 'Hình học Oxyz' },
  { vi: 'Tích vô hướng', en: 'Dot product / Scalar product', category: 'Hình học Oxyz' },
  { vi: 'Tích có hướng', en: 'Cross product / Vector product', category: 'Hình học Oxyz' },
  { vi: 'Điều kiện cần và đủ', en: 'Necessary and sufficient condition', category: 'Chứng minh' },
  { vi: 'Chứng minh phản chứng', en: 'Proof by contradiction', category: 'Chứng minh' },
];

export function extractMatchedMathTerms(text: string): MathTermEntry[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const matched: MathTermEntry[] = [];

  for (const entry of CORE_MATH_TERMINOLOGY) {
    const viKey = entry.vi.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const enVariants = entry.en
      .replace(/\([^)]*\)/g, '')
      .split('/')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const hasVi = viKey.length >= 3 && normalized.includes(viKey);
    const hasEn = enVariants.some(v => v.length >= 4 && normalized.includes(v));
    if (hasVi || hasEn) {
      matched.push(entry);
    }
  }

  return matched;
}

export function formatTerminologyMarkdownTable(terms: MathTermEntry[], heading: string = '## Bảng tổng hợp Thuật ngữ Toán học (Vocabulary Review)'): string {
  const safeTerms = terms.filter(t => t && t.vi && t.en);
  if (safeTerms.length === 0) return '';

  const rows = safeTerms.map((term, idx) => {
    const cleanVi = term.vi.replace(/\|/g, '/').trim();
    const cleanEn = term.en.replace(/\|/g, '/').trim();
    const cleanCat = (term.category || 'Toán học').replace(/\|/g, '/').trim();
    return `| ${idx + 1} | ${cleanVi} | **${cleanEn}** | ${cleanCat} |`;
  });

  return [
    heading,
    '',
    '| STT | Thuật ngữ Tiếng Việt | Thuật ngữ Tiếng Anh (English Term) | Chuyên đề |',
    '| :---: | :--- | :--- | :--- |',
    ...rows,
  ].join('\n');
}

export async function exportMathTerminologyToDocx(
  terms: MathTermEntry[],
  options?: {
    fileName?: string;
    sourceTitle?: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;
  const safeTerms = terms.filter(t => t && t.vi && t.en);
  if (safeTerms.length === 0) return;

  const sourceTitle = options?.sourceTitle?.trim() || 'Bài tập Toán học Song ngữ';
  const dateLabel = new Date().toLocaleDateString('vi-VN');
  const fileName =
    options?.fileName ||
    `ThuatNgu_ToanAnhViet_${new Date().toISOString().slice(0, 10)}.docx`;

  const tableBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
  };

  const cellBorders = {
    top: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    right: tableBorder,
  };

  const cellMargins = {
    top: 100,
    bottom: 100,
    left: 140,
    right: 140,
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'STT',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 22,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Thuật ngữ Tiếng Việt',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 22,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 37, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'English Math Term',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 22,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 22, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Chuyên đề',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 22,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const bodyRows = safeTerms.map((term, idx) => {
    const rowFill = idx % 2 === 1 ? 'F0FDFA' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: String(idx + 1),
                  font: 'Times New Roman',
                  size: 22,
                  color: '334155',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: term.vi,
                  bold: true,
                  font: 'Times New Roman',
                  size: 23,
                  color: '0F172A',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 37, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: term.en,
                  bold: true,
                  font: 'Times New Roman',
                  size: 23,
                  color: '047857',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: term.category || 'Toán học',
                  italics: true,
                  font: 'Times New Roman',
                  size: 21,
                  color: '475569',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(18),
              right: convertMillimetersToTwip(18),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'BẢNG TỔNG HỢP THUẬT NGỮ TOÁN HỌC ANH – VIỆT',
                bold: true,
                font: 'Times New Roman',
                size: 30,
                color: '0F766E',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Tài liệu ôn tập từ vựng chuyên ngành Toán Tiếng Anh dành cho học sinh',
                italics: true,
                font: 'Times New Roman',
                size: 23,
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 80, after: 180 },
            children: [
              new TextRun({
                text: 'Nguồn bài tập: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '1E293B',
              }),
              new TextRun({
                text: `${sourceTitle}   |   `,
                font: 'Times New Roman',
                size: 22,
                color: '334155',
              }),
              new TextRun({
                text: 'Ngày xuất: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '1E293B',
              }),
              new TextRun({
                text: `${dateLabel}   |   `,
                font: 'Times New Roman',
                size: 22,
                color: '334155',
              }),
              new TextRun({
                text: 'Số lượng: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '1E293B',
              }),
              new TextRun({
                text: `${safeTerms.length} thuật ngữ`,
                font: 'Times New Roman',
                size: 22,
                color: '0F766E',
                bold: true,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
          new Paragraph({
            spacing: { before: 220, after: 80 },
            children: [
              new TextRun({
                text: 'Gợi ý ôn tập nhanh: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '0F766E',
              }),
              new TextRun({
                text: 'Học sinh có thể che cột "English Math Term" để tự đọc và viết lại thuật ngữ Tiếng Anh tương ứng theo từng chuyên đề.',
                italics: true,
                font: 'Times New Roman',
                size: 22,
                color: '475569',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 1000);
}
