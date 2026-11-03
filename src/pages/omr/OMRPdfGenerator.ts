import { jsPDF } from 'jspdf';
import { OMRTemplateType } from './OMRTypes';

export interface PDFExportOptions {
  schoolName?: string;
  examTitle?: string;
  className?: string;
  examDate?: string;
  layout?: 'a4_single' | 'a4_double' | 'a5';
}

export function generateOMRPdf(templateType: OMRTemplateType, options: PDFExportOptions = {}): jsPDF {
  const {
    schoolName = 'SỞ GD&ĐT ................... - TRƯỜNG THPT ...................',
    examTitle = 'PHIẾU TRẢ LỜI TRẮC NGHIỆM',
    className = '',
    examDate = new Date().toLocaleDateString('vi-VN'),
    layout = 'a4_single'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  if (templateType === 'gdpt_2018') {
    drawGDPT2018Sheet(doc, { schoolName, examTitle, className, examDate });
  } else if (templateType === 'tnmaker_20') {
    drawTNMakerSheet(doc, 20, { schoolName, examTitle, className, examDate });
  } else if (templateType === 'tnmaker_40') {
    drawTNMakerSheet(doc, 40, { schoolName, examTitle, className, examDate });
  } else {
    drawTNMakerSheet(doc, 50, { schoolName, examTitle, className, examDate });
  }

  return doc;
}

/**
 * Triển khai hàm exportExamSheetPDF sinh file PDF A4 chứa các trường dữ liệu cố định:
 * - 4 góc định vị (black squares 8x8mm)
 * - Khung SBD 6 cột (chữ số từ 0 đến 9)
 * - Khung Mã đề 4 cột (chữ số từ 0 đến 9)
 * - Ma trận câu hỏi (Phần I: Trắc nghiệm, Phần II: Đúng/Sai, Phần III: Trả lời ngắn)
 */
export function exportExamSheetPDF(
  templateType: OMRTemplateType = 'gdpt_2018',
  options: PDFExportOptions = {}
): jsPDF {
  return generateOMRPdf(templateType, options);
}

// ============================================================================
// MẪU 1: CHUẨN BỘ GD&ĐT (GDPT 2018 - 12 CÂU MC, 4 CÂU TF, 6 CÂU SA)
// ============================================================================
function drawGDPT2018Sheet(doc: jsPDF, opts: any) {
  const marginX = 12;
  const marginY = 12;
  const width = 210 - marginX * 2; // 186mm
  const height = 297 - marginY * 2; // 273mm

  // 1. Draw 4 Corner Anchors (8x8 mm solid black squares for optical alignment)
  const anchorSize = 8;
  doc.setFillColor(0, 0, 0);
  doc.rect(marginX, marginY, anchorSize, anchorSize, 'F'); // Top-Left
  doc.rect(marginX + width - anchorSize, marginY, anchorSize, anchorSize, 'F'); // Top-Right
  doc.rect(marginX, marginY + height - anchorSize, anchorSize, anchorSize, 'F'); // Bottom-Left
  doc.rect(marginX + width - anchorSize, marginY + height - anchorSize, anchorSize, anchorSize, 'F'); // Bottom-Right

  // Internal crosshairs in anchors for sub-pixel centering
  doc.setFillColor(255, 255, 255);
  const halfAnchor = anchorSize / 2;
  [
    [marginX, marginY],
    [marginX + width - anchorSize, marginY],
    [marginX, marginY + height - anchorSize],
    [marginX + width - anchorSize, marginY + height - anchorSize]
  ].forEach(([ax, ay]) => {
    doc.rect(ax + halfAnchor - 0.75, ay + halfAnchor - 0.75, 1.5, 1.5, 'F');
  });

  // 2. Header
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(opts.schoolName.toUpperCase(), 105, marginY + 4, { align: 'center' });

  doc.setFontSize(14);
  doc.text(opts.examTitle.toUpperCase(), 105, marginY + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CHUẨN BỘ GIÁO DỤC VÀ ĐÀO TẠO (GDPT 2018 - MÃ ĐỀ 4 CHỮ SỐ & SBD 6 SỐ)', 105, marginY + 14, { align: 'center' });

  // 3. Student Info Boxes (Top left below header)
  const infoX = marginX + 4;
  const infoY = marginY + 18;
  const infoW = 100;
  const infoH = 22;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(infoX, infoY, infoW, infoH);

  doc.setFontSize(8);
  doc.text('Họ và tên thí sinh: .....................................................................', infoX + 3, infoY + 6);
  doc.text(`Lớp: ........................ Ngày sinh: ....../....../......... Phòng thi: ............`, infoX + 3, infoY + 12);
  doc.text(`Ngày thi: ${opts.examDate}      Chữ ký CB coi thi: .............................`, infoX + 3, infoY + 18);

  // 4. SBD (Số báo danh 6 số) and Mã Đề (4 số)
  const sbdX = infoX + infoW + 4; // ~120mm
  const sbdW = 42;
  const codeX = sbdX + sbdW + 3; // ~165mm
  const codeW = 28;
  const gridTopY = infoY;

  // Draw SBD Box (6 columns, 10 rows: 0 to 9)
  drawNumberGrid(doc, sbdX, gridTopY, 6, 'SỐ BÁO DANH');

  // Draw Mã Đề Box (4 columns, 10 rows: 0 to 9)
  drawNumberGrid(doc, codeX, gridTopY, 4, 'MÃ ĐỀ THI');

  // 5. Instruction Bar
  const instructY = infoY + 62;
  doc.setFillColor(245, 245, 245);
  doc.rect(infoX, instructY, width - 8, 7, 'F');
  doc.setDrawColor(160, 160, 160);
  doc.rect(infoX, instructY, width - 8, 7, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('HƯỚNG DẪN TÔ: Dùng bút chì 2B tô đậm và kín toàn bộ ô tròn. Không gạch chéo [X], không đánh dấu [V].', 105, instructY + 4.5, { align: 'center' });

  // 6. Section I: 12 Multiple Choice Questions (Part I)
  const sec1Y = instructY + 11;
  const colW = (width - 12) / 3;

  doc.setFillColor(235, 240, 248);
  doc.rect(infoX, sec1Y, width - 8, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (12 CÂU - MỖI CÂU CHỌN 1 ĐÁP ÁN)', infoX + 3, sec1Y + 4.2);

  const p1ContentY = sec1Y + 7;
  // 12 questions split into 2 columns (6 questions each)
  const p1ColW = (width - 12) / 2;
  for (let q = 1; q <= 12; q++) {
    const colIdx = q <= 6 ? 0 : 1;
    const rowIdx = q <= 6 ? q - 1 : q - 7;
    const qX = infoX + colIdx * p1ColW + 2;
    const qY = p1ContentY + rowIdx * 6.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Câu ${q.toString().padStart(2, ' ')}:`, qX, qY + 4);

    const options = ['A', 'B', 'C', 'D'];
    options.forEach((opt, optIdx) => {
      const cx = qX + 16 + optIdx * 12;
      const cy = qY + 2.5;
      drawBubble(doc, cx, cy, opt);
    });
  }

  // 7. Section II: 4 True/False Questions (Part II - 4 statements a, b, c, d each)
  const sec2Y = p1ContentY + 6 * 6.5 + 4;
  doc.setFillColor(235, 240, 248);
  doc.rect(infoX, sec2Y, width - 8, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (4 CÂU - MỖI Ý a, b, c, d CHỌN Đ HOẶC S)', infoX + 3, sec2Y + 4.2);

  const p2ContentY = sec2Y + 7;
  const p2ColW = (width - 12) / 4; // 4 columns for 4 questions
  for (let q = 1; q <= 4; q++) {
    const qX = infoX + (q - 1) * p2ColW + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`CÂU ${q}`, qX + 14, p2ContentY + 2);

    const letters = ['a', 'b', 'c', 'd'];
    letters.forEach((lettr, lIdx) => {
      const ly = p2ContentY + 6 + lIdx * 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`) ${lettr}`, qX + 3, ly + 2.5);
      // Bubble Đ
      drawBubble(doc, qX + 16, ly + 1.2, 'D');
      // Bubble S
      drawBubble(doc, qX + 27, ly + 1.2, 'S');
    });
  }

  // 8. Section III: 6 Short Answer Questions (Part III - fill numeric answer)
  const sec3Y = p2ContentY + 32;
  doc.setFillColor(235, 240, 248);
  doc.rect(infoX, sec3Y, width - 8, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN (6 CÂU - VIẾT KẾT QUẢ VÀ TÔ KÍN Ô TƯƠNG ỨNG)', infoX + 3, sec3Y + 4.2);

  const p3ContentY = sec3Y + 7;
  const p3ColW = (width - 12) / 6; // 6 columns for 6 questions
  for (let q = 1; q <= 6; q++) {
    const qX = infoX + (q - 1) * p3ColW + 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Câu ${q}`, qX + p3ColW / 2 - 2, p3ContentY + 2, { align: 'center' });

    // 4 handwritten boxes at top
    const boxW = 5;
    const boxH = 5;
    const startBx = qX + (p3ColW - boxW * 4) / 2;
    for (let b = 0; b < 4; b++) {
      doc.rect(startBx + b * boxW, p3ContentY + 3.5, boxW, boxH);
    }

    // Row [-] and [,]
    const rowSignY = p3ContentY + 11;
    drawSmallBubble(doc, startBx + 2.5, rowSignY, '-');
    drawSmallBubble(doc, startBx + 2.5 + boxW, rowSignY, ',');
    drawSmallBubble(doc, startBx + 2.5 + boxW * 2, rowSignY, ',');
    drawSmallBubble(doc, startBx + 2.5 + boxW * 3, rowSignY, ',');

    // Digits 0 to 9 in 4 columns
    for (let digit = 0; digit <= 9; digit++) {
      const dY = rowSignY + 4.5 + digit * 4.2;
      for (let col = 0; col < 4; col++) {
        drawSmallBubble(doc, startBx + 2.5 + col * boxW, dY, digit.toString());
      }
    }
  }

  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('EDUPLANAI MARK • HỆ THỐNG CHẤM THI OMR TỰ ĐỘNG CHUẨN GDPT 2018', 105, marginY + height - 2, { align: 'center' });
}

// ============================================================================
// MẪU 2: CHUẨN TNMAKER (20, 40 HOẶC 50 CÂU TRẮC NGHIỆM 4 LỰA CHỌN)
// ============================================================================
function drawTNMakerSheet(doc: jsPDF, totalQuestions: number, opts: any) {
  const marginX = 12;
  const marginY = 12;
  const width = 210 - marginX * 2;
  const height = 297 - marginY * 2;

  // 4 Corner Anchors
  const anchorSize = 8;
  doc.setFillColor(0, 0, 0);
  doc.rect(marginX, marginY, anchorSize, anchorSize, 'F');
  doc.rect(marginX + width - anchorSize, marginY, anchorSize, anchorSize, 'F');
  doc.rect(marginX, marginY + height - anchorSize, anchorSize, anchorSize, 'F');
  doc.rect(marginX + width - anchorSize, marginY + height - anchorSize, anchorSize, anchorSize, 'F');

  // Crosshair
  const halfAnchor = anchorSize / 2;
  doc.setFillColor(255, 255, 255);
  [
    [marginX, marginY],
    [marginX + width - anchorSize, marginY],
    [marginX, marginY + height - anchorSize],
    [marginX + width - anchorSize, marginY + height - anchorSize]
  ].forEach(([ax, ay]) => {
    doc.rect(ax + halfAnchor - 0.75, ay + halfAnchor - 0.75, 1.5, 1.5, 'F');
  });

  // Header
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(opts.schoolName.toUpperCase(), 105, marginY + 4, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`PHIẾU TRẢ LỜI TRẮC NGHIỆM (${totalQuestions} CÂU)`, 105, marginY + 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('ĐỊNH DẠNG TNMAKER CHUẨN - MÃ ĐỀ 4 SỐ & SBD 6 SỐ', 105, marginY + 15, { align: 'center' });

  // Student info + SBD + Code
  const infoX = marginX + 4;
  const infoY = marginY + 18;
  const infoW = 100;
  const infoH = 22;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(infoX, infoY, infoW, infoH);

  doc.setFontSize(8);
  doc.text('Họ và tên thí sinh: .....................................................................', infoX + 3, infoY + 6);
  doc.text(`Lớp: ........................ Phòng thi: ............ Ngày thi: ${opts.examDate}`, infoX + 3, infoY + 12);
  doc.text(`Chữ ký giám thị 1: ............................ Giám thị 2: ............................`, infoX + 3, infoY + 18);

  const sbdX = infoX + infoW + 4;
  const sbdW = 42;
  const codeX = sbdX + sbdW + 3;

  drawNumberGrid(doc, sbdX, infoY, 6, 'SỐ BÁO DANH');
  drawNumberGrid(doc, codeX, infoY, 4, 'MÃ ĐỀ THI');

  // Questions columns
  const contentY = infoY + 62;
  const numColumns = totalQuestions <= 20 ? 2 : totalQuestions <= 40 ? 3 : 4;
  const perCol = Math.ceil(totalQuestions / numColumns);
  const colWidth = (width - 8) / numColumns;

  for (let q = 1; q <= totalQuestions; q++) {
    const col = Math.floor((q - 1) / perCol);
    const row = (q - 1) % perCol;
    const qX = infoX + col * colWidth + 2;
    const qY = contentY + row * 6.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${q.toString().padStart(2, ' ')}.`, qX, qY + 4);

    ['A', 'B', 'C', 'D'].forEach((opt, optIdx) => {
      const cx = qX + 12 + optIdx * 9.5;
      const cy = qY + 2.5;
      drawBubble(doc, cx, cy, opt);
    });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`EDUPLANAI MARK • MẪU ${totalQuestions} CÂU TRẮC NGHIỆM CHUẨN TNMAKER`, 105, marginY + height - 2, { align: 'center' });
}

// ============================================================================
// HELPER DRAWING FUNCTIONS
// ============================================================================
function drawNumberGrid(doc: jsPDF, x: number, y: number, cols: number, title: string) {
  const colW = 6.2;
  const boxH = 5.5;
  const totalW = cols * colW;

  // Header Title
  doc.setFillColor(235, 240, 248);
  doc.rect(x, y, totalW, 5.5, 'F');
  doc.setDrawColor(160, 160, 160);
  doc.rect(x, y, totalW, 5.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(title, x + totalW / 2, y + 4, { align: 'center' });

  // Handwritten boxes
  for (let c = 0; c < cols; c++) {
    doc.setDrawColor(100, 100, 100);
    doc.rect(x + c * colW, y + 5.5, colW, boxH, 'S');
  }

  // 10 Bubble rows (0-9)
  for (let r = 0; r <= 9; r++) {
    const rowY = y + 13 + r * 4.4;
    for (let c = 0; c < cols; c++) {
      const cx = x + c * colW + colW / 2;
      drawSmallBubble(doc, cx, rowY, r.toString());
    }
  }
}

function drawBubble(doc: jsPDF, cx: number, cy: number, text: string) {
  const r = 2.4;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.25);
  doc.circle(cx, cy, r, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(text, cx, cy + 1, { align: 'center' });
}

function drawSmallBubble(doc: jsPDF, cx: number, cy: number, text: string) {
  const r = 1.8;
  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.2);
  doc.circle(cx, cy, r, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(text, cx, cy + 0.8, { align: 'center' });
}
