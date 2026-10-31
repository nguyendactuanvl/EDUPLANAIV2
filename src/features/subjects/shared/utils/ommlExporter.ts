/**
 * @file ommlExporter.ts
 * @description Tiện ích chuyển đổi và xuất công thức Toán/Lý/Hóa sang định dạng OMML (Office Math Markup Language)
 * và tạo văn bản đề thi chuẩn Microsoft Word (.docx / .html).
 */

import { StandardExamPaper } from '../types';

/**
 * Tạo khối OMML chuẩn cho phân số hoặc ký hiệu
 */
export function createOMMLFraction(numerator: string, denominator: string): string {
  return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:f>
    <m:fPr><m:type m:val="bar"/></m:fPr>
    <m:num><m:r><m:t>${escapeXml(numerator)}</m:t></m:r></m:num>
    <m:den><m:r><m:t>${escapeXml(denominator)}</m:t></m:r></m:den>
  </m:f>
</m:oMath>`;
}

/**
 * Tạo khối OMML chuẩn cho ký hiệu có chỉ số trên / dưới (H₂O, Fe³⁺, x², v_max)
 */
export function createOMMLScript(base: string, sub?: string, sup?: string): string {
  if (sub && sup) {
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:sSubSup>
    <m:e><m:r><m:t>${escapeXml(base)}</m:t></m:r></m:e>
    <m:sub><m:r><m:t>${escapeXml(sub)}</m:t></m:r></m:sub>
    <m:sup><m:r><m:t>${escapeXml(sup)}</m:t></m:r></m:sup>
  </m:sSubSup>
</m:oMath>`;
  }
  if (sub) {
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:sSub>
    <m:e><m:r><m:t>${escapeXml(base)}</m:t></m:r></m:e>
    <m:sub><m:r><m:t>${escapeXml(sub)}</m:t></m:r></m:sub>
  </m:sSub>
</m:oMath>`;
  }
  if (sup) {
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:sSup>
    <m:e><m:r><m:t>${escapeXml(base)}</m:t></m:r></m:e>
    <m:sup><m:r><m:t>${escapeXml(sup)}</m:t></m:r></m:sup>
  </m:sSup>
</m:oMath>`;
  }
  return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>${escapeXml(base)}</m:t></m:r></m:oMath>`;
}

/**
 * Tạo khối OMML cho vectơ Vật lý \vec{v}, \vec{F}
 */
export function createOMMLVector(symbol: string): string {
  return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <m:acc>
    <m:accPr><m:chr m:val="&#x20D7;"/></m:accPr>
    <m:e><m:r><m:t>${escapeXml(symbol)}</m:t></m:r></m:e>
  </m:acc>
</m:oMath>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Xuất đề thi 3 phần chuẩn GDPT 2018 ra định dạng văn bản sao chép vào Word
 */
export function exportExamToText(exam: StandardExamPaper): string {
  const lines: string[] = [];

  lines.push(`BỘ GIÁO DỤC VÀ ĐÀO TẠO`);
  lines.push(`ĐỀ KIỂM TRA ĐÁNH GIÁ MÔN: ${exam.title.toUpperCase()}`);
  lines.push(`Khóa/Lớp: ${exam.grade} | Mã đề: ${exam.examCode} | Thời gian làm bài: ${exam.durationMinutes} phút`);
  lines.push(`Năm học: ${exam.schoolYear}`);
  lines.push(`--------------------------------------------------------------------------------\n`);

  // PHẦN I
  lines.push(`PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (Thí sinh trả lời từ câu 1 đến câu ${exam.part1.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án).`);
  exam.part1.forEach((q) => {
    lines.push(`\nCâu ${q.number}: ${q.stem}`);
    lines.push(`  A. ${q.options[0]}`);
    lines.push(`  B. ${q.options[1]}`);
    lines.push(`  C. ${q.options[2]}`);
    lines.push(`  D. ${q.options[3]}`);
    if (q.explanation) {
      lines.push(`  -> [Đáp án: ${q.correctAnswer}] - Hướng dẫn giải: ${q.explanation}`);
    }
  });

  // PHẦN II
  if (exam.part2.length > 0) {
    lines.push(`\n\nPHẦN II. Câu trắc nghiệm đúng sai (Thí sinh trả lời từ câu 1 đến câu ${exam.part2.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai).`);
    exam.part2.forEach((q) => {
      lines.push(`\nCâu ${q.number}: ${q.stem}`);
      q.statements.forEach((st) => {
        lines.push(`  ${st.subId}) ${st.text} [${st.isCorrect ? 'ĐÚNG' : 'SAI'}]`);
        if (st.explanation) {
          lines.push(`     Giải thích: ${st.explanation}`);
        }
      });
    });
  }

  // PHẦN III
  if (exam.part3.length > 0) {
    lines.push(`\n\nPHẦN III. Câu trắc nghiệm trả lời ngắn (Thí sinh trả lời từ câu 1 đến câu ${exam.part3.length}).`);
    exam.part3.forEach((q) => {
      lines.push(`\nCâu ${q.number}: ${q.stem}`);
      lines.push(`  -> Đáp số: ${q.correctAnswer} ${q.unit || ''}`);
      if (q.explanation) {
        lines.push(`     Giải thích: ${q.explanation}`);
      }
    });
  }

  lines.push(`\n--------------------------------- HẾT ---------------------------------`);
  return lines.join('\n');
}

/**
 * Tải file đề thi dưới dạng file .doc (Word-compatible HTML)
 */
export function downloadWordDocument(exam: StandardExamPaper): void {
  const textContent = exportExamToText(exam);
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeXml(exam.title)}</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.4; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
  h2 { font-size: 13pt; margin-top: 18px; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  .header-meta { text-align: center; font-style: italic; margin-bottom: 16px; }
  .question-block { margin-bottom: 12px; }
  .stem { font-weight: bold; }
  .options-grid { margin-left: 20px; }
  .explanation { font-style: italic; color: #475569; margin-left: 20px; font-size: 10.5pt; }
</style>
</head>
<body>
  <h1>${escapeXml(exam.title)}</h1>
  <div class="header-meta">Mã đề: ${escapeXml(exam.examCode)} | Thời gian: ${exam.durationMinutes} phút | Lớp ${exam.grade}</div>
  <pre style="font-family: inherit; white-space: pre-wrap;">${escapeXml(textContent)}</pre>
</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exam.examCode}_${exam.subjectId}_GDPT2018.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
