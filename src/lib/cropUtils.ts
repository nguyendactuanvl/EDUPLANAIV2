import { renderPdfPageToDataUrl } from './pdfUtils';

/**
 * Cắt ảnh hoặc trang PDF theo tọa độ chuẩn hóa box: [ymin, xmin, ymax, xmax] (thang đo 0 - 1000).
 * Có bổ sung padding 6px để tránh lẹm biên hình ảnh.
 */
export async function cropImageByNormalizedBox(
  base64OrUrl: string,
  box: [number, number, number, number] | number[],
  pageNumber: number = 1
): Promise<string> {
  if (!base64OrUrl || !box || box.length < 4) {
    throw new Error('Thiếu dữ liệu ảnh gốc hoặc tọa độ hộp giới hạn.');
  }

  // Refine box: slightly shrink to exclude labels
  const [ymin, xmin, ymax, xmax] = box;
  const marginY = (ymax - ymin) * 0.05; // 5% margin top/bottom
  const marginX = (xmax - xmin) * 0.02; // 2% margin left/right

  const refinedYmin = Math.min(ymin + marginY, ymax);
  const refinedXmin = Math.min(xmin + marginX, xmax);
  const refinedYmax = Math.max(ymax - marginY, ymin);
  const refinedXmax = Math.max(xmax - marginX, xmin);

  let sourceImageUrl = base64OrUrl;

  // Nếu là file PDF dạng base64 / data URL, kết xuất đúng trang tương ứng sang hình ảnh trước khi cắt
  if (base64OrUrl.startsWith('data:application/pdf') || base64OrUrl.includes('application/pdf')) {
    try {
      const base64Data = base64OrUrl.includes(',') ? base64OrUrl.split(',')[1] : base64OrUrl;
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const safePage = Math.max(1, pageNumber || 1);
      const rendered = await renderPdfPageToDataUrl(bytes, safePage, 2.0);
      sourceImageUrl = rendered.dataUrl;
    } catch (pdfErr) {
      console.warn(`Lỗi kết xuất trang PDF (${pageNumber}) sang ảnh để crop:`, pdfErr);
      throw pdfErr;
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // Tính tọa độ pixel thực tế trên ảnh gốc
        let cropX = (Math.max(0, Math.min(1000, refinedXmin)) / 1000) * origW;
        let cropY = (Math.max(0, Math.min(1000, refinedYmin)) / 1000) * origH;
        let cropW = ((Math.max(0, Math.min(1000, refinedXmax)) - Math.max(0, Math.min(1000, refinedXmin))) / 1000) * origW;
        let cropH = ((Math.max(0, Math.min(1000, refinedYmax)) - Math.max(0, Math.min(1000, refinedYmin))) / 1000) * origH;

        // Thêm padding 0px để lấy đúng vùng box.
        const padding = 0;
        const paddedX = Math.max(0, cropX - padding);
        const paddedY = Math.max(0, cropY - padding);
        const paddedW = Math.min(origW - paddedX, cropW + padding * 2);
        const paddedH = Math.min(origH - paddedY, cropH + padding * 2);

        if (paddedW <= 4 || paddedH <= 4) {
          throw new Error('Vùng cắt ảnh quá nhỏ.');
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(paddedW);
        canvas.height = Math.round(paddedH);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Không thể khởi tạo Canvas 2D.');
        }

        // Đổ nền trắng phía dưới để hình vẽ trong suốt hiển thị rõ ràng
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
          img,
          paddedX,
          paddedY,
          paddedW,
          paddedH,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const croppedBase64 = canvas.toDataURL('image/png');
        resolve(croppedBase64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      reject(new Error('Không thể tải hình ảnh để crop: ' + String(e)));
    };

    img.src = sourceImageUrl;
  });
}

/**
 * Duyệt qua danh sách câu hỏi, với mỗi câu có hasFigure và figureBox,
 * tự động cắt ảnh từ originalImageBase64, gán vào imageUrl và thay thế [HINH_ANH] bằng thẻ <img>.
 */
export async function attachCroppedFiguresToQuestions(
  questions: any[],
  originalImageBase64?: string
): Promise<any[]> {
  if (!questions || !Array.isArray(questions) || !originalImageBase64) {
    return questions || [];
  }

  const updatedQuestions = [...questions];

  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = { ...updatedQuestions[i] };
    const box = q.figureBox || (q.figure && q.figure.box);
    const targetPage = Number(q.page || q.figurePage || 1);

    if ((q.hasFigure || box) && Array.isArray(box) && box.length === 4) {
      try {
        const croppedDataUrl = await cropImageByNormalizedBox(originalImageBase64, box, targetPage);
        q.imageUrl = croppedDataUrl;
        q.hasFigure = true;
      } catch (cropError) {
        console.warn(`Không thể tự động crop hình cho câu ${q.id || i + 1} (trang ${targetPage}):`, cropError);
      }
    }

    // Dọn dẹp sạch sẽ placeholder [HINH_ANH] và các thẻ HTML ảnh rách khỏi question / content
    const cleanStem = (str: string) => String(str || '')
      .replace(/\[HINH_ANH\]/g, '')
      .replace(/<div\b[^>]*>\s*<\/div>/gi, '')
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/(?:max-h-\d+|max-w-\[[^\]]+\]|mx-auto|shadow-md|border-slate-200)[^>]*>/gi, '')
      .trim();

    if (typeof q.content === 'string') {
      q.content = cleanStem(q.content);
    }
    if (typeof q.question === 'string') {
      q.question = cleanStem(q.question);
    }
    
    updatedQuestions[i] = q;
  }

  return updatedQuestions;
}
