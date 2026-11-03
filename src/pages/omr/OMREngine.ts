import { OMRTemplateType, ExamAnswerKey, OMRGradingResult } from './OMRTypes';

// Dimensions of normalized examination sheet (A4 aspect ratio 1:1.414)
export const NORM_WIDTH = 800;
export const NORM_HEIGHT = 1131;

// ============================================================================
// AUDIO & HAPTIC FEEDBACK (100% Web Native)
// ============================================================================
export function playBeepSound(type: 'success' | 'warning' | 'error' = 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn("Audio feedback error:", e);
  }
}

export function triggerVibration() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {}
}

// ============================================================================
// OPENCV-FREE FAST 2D CANVAS OMR ENGINE
// ============================================================================
export interface BubblePosition {
  x: number;
  y: number;
  r: number;
  label: string;
}

export interface SheetGridMapping {
  sbd: BubblePosition[][]; // 6 columns x 10 rows
  examCode: BubblePosition[][]; // 4 columns x 10 rows
  partI: Record<number, BubblePosition[]>; // question num -> [A, B, C, D]
  partII?: Record<number, Record<'a' | 'b' | 'c' | 'd', { d: BubblePosition; s: BubblePosition }>>;
  partIII?: Record<number, BubblePosition[][]>; // 6 questions x 4 columns x 10 rows
}

/**
 * Builds normalized coordinates for GDPT 2018 (Form 12-4-6)
 */
export function buildGDPT2018Mapping(): SheetGridMapping {
  const marginX = (12 / 210) * NORM_WIDTH;
  const marginY = (12 / 297) * NORM_HEIGHT;
  const sheetW = NORM_WIDTH - marginX * 2;

  // SBD: 6 columns x 10 rows
  const sbdStartX = marginX + (124 / 186) * sheetW;
  const sbdStartY = marginY + (24 / 273) * NORM_HEIGHT;
  const sbdColW = (6.2 / 186) * sheetW;
  const sbdRowH = (4.4 / 273) * NORM_HEIGHT;
  const sbdRadius = 7.5;

  const sbd: BubblePosition[][] = [];
  for (let c = 0; c < 6; c++) {
    const colBubbles: BubblePosition[] = [];
    for (let r = 0; r <= 9; r++) {
      colBubbles.push({
        x: sbdStartX + c * sbdColW + sbdColW / 2,
        y: sbdStartY + r * sbdRowH,
        r: sbdRadius,
        label: r.toString()
      });
    }
    sbd.push(colBubbles);
  }

  // Mã Đề: 4 columns x 10 rows
  const codeStartX = sbdStartX + 6 * sbdColW + (3 / 186) * sheetW;
  const codeColW = (6.2 / 186) * sheetW;
  const codeRowH = sbdRowH;

  const examCode: BubblePosition[][] = [];
  for (let c = 0; c < 4; c++) {
    const colBubbles: BubblePosition[] = [];
    for (let r = 0; r <= 9; r++) {
      colBubbles.push({
        x: codeStartX + c * codeColW + codeColW / 2,
        y: sbdStartY + r * codeRowH,
        r: sbdRadius,
        label: r.toString()
      });
    }
    examCode.push(colBubbles);
  }

  // Part I: 12 questions (2 columns of 6)
  const p1StartX = marginX + (4 / 186) * sheetW;
  const p1StartY = marginY + (107 / 273) * NORM_HEIGHT;
  const p1ColW = (sheetW - 8) / 2;
  const p1RowH = (6.5 / 273) * NORM_HEIGHT;
  const p1OptGap = (12 / 186) * sheetW;
  const p1Radius = 9;

  const partI: Record<number, BubblePosition[]> = {};
  for (let q = 1; q <= 12; q++) {
    const colIdx = q <= 6 ? 0 : 1;
    const rowIdx = q <= 6 ? q - 1 : q - 7;
    const qX = p1StartX + colIdx * p1ColW;
    const qY = p1StartY + rowIdx * p1RowH;

    partI[q] = ['A', 'B', 'C', 'D'].map((opt, oIdx) => ({
      x: qX + (20 / 186) * sheetW + oIdx * p1OptGap,
      y: qY,
      r: p1Radius,
      label: opt
    }));
  }

  // Part II: 4 questions x 4 statements (a, b, c, d)
  const p2StartX = marginX + (4 / 186) * sheetW;
  const p2StartY = marginY + (160 / 273) * NORM_HEIGHT;
  const p2ColW = (sheetW - 8) / 4;
  const p2RowH = (6 / 273) * NORM_HEIGHT;

  const partII: Record<number, Record<'a' | 'b' | 'c' | 'd', { d: BubblePosition; s: BubblePosition }>> = {};
  for (let q = 1; q <= 4; q++) {
    const qX = p2StartX + (q - 1) * p2ColW;
    partII[q] = {
      a: {
        d: { x: qX + (17 / 186) * sheetW, y: p2StartY + 0 * p2RowH, r: 8, label: 'D' },
        s: { x: qX + (28 / 186) * sheetW, y: p2StartY + 0 * p2RowH, r: 8, label: 'S' }
      },
      b: {
        d: { x: qX + (17 / 186) * sheetW, y: p2StartY + 1 * p2RowH, r: 8, label: 'D' },
        s: { x: qX + (28 / 186) * sheetW, y: p2StartY + 1 * p2RowH, r: 8, label: 'S' }
      },
      c: {
        d: { x: qX + (17 / 186) * sheetW, y: p2StartY + 2 * p2RowH, r: 8, label: 'D' },
        s: { x: qX + (28 / 186) * sheetW, y: p2StartY + 2 * p2RowH, r: 8, label: 'S' }
      },
      d: {
        d: { x: qX + (17 / 186) * sheetW, y: p2StartY + 3 * p2RowH, r: 8, label: 'D' },
        s: { x: qX + (28 / 186) * sheetW, y: p2StartY + 3 * p2RowH, r: 8, label: 'S' }
      }
    };
  }

  return { sbd, examCode, partI, partII };
}

/**
 * Builds normalized coordinates for TNMaker (20, 40, or 50 questions)
 */
export function buildTNMakerMapping(totalQuestions: number): SheetGridMapping {
  const marginX = (12 / 210) * NORM_WIDTH;
  const marginY = (12 / 297) * NORM_HEIGHT;
  const sheetW = NORM_WIDTH - marginX * 2;

  // SBD and ExamCode same header layout
  const sbdStartX = marginX + (124 / 186) * sheetW;
  const sbdStartY = marginY + (24 / 273) * NORM_HEIGHT;
  const sbdColW = (6.2 / 186) * sheetW;
  const sbdRowH = (4.4 / 273) * NORM_HEIGHT;
  const sbdRadius = 7.5;

  const sbd: BubblePosition[][] = [];
  for (let c = 0; c < 6; c++) {
    const colBubbles: BubblePosition[] = [];
    for (let r = 0; r <= 9; r++) {
      colBubbles.push({
        x: sbdStartX + c * sbdColW + sbdColW / 2,
        y: sbdStartY + r * sbdRowH,
        r: sbdRadius,
        label: r.toString()
      });
    }
    sbd.push(colBubbles);
  }

  const codeStartX = sbdStartX + 6 * sbdColW + (3 / 186) * sheetW;
  const examCode: BubblePosition[][] = [];
  for (let c = 0; c < 4; c++) {
    const colBubbles: BubblePosition[] = [];
    for (let r = 0; r <= 9; r++) {
      colBubbles.push({
        x: codeStartX + c * sbdColW + sbdColW / 2,
        y: sbdStartY + r * sbdRowH,
        r: sbdRadius,
        label: r.toString()
      });
    }
    examCode.push(colBubbles);
  }

  const numColumns = totalQuestions <= 20 ? 2 : totalQuestions <= 40 ? 3 : 4;
  const perCol = Math.ceil(totalQuestions / numColumns);
  const colWidth = (sheetW - 8) / numColumns;
  const contentY = marginY + (90 / 273) * NORM_HEIGHT;
  const rowHeight = (6.5 / 273) * NORM_HEIGHT;
  const optGap = (9.5 / 186) * sheetW;
  const qRadius = 8;

  const partI: Record<number, BubblePosition[]> = {};
  for (let q = 1; q <= totalQuestions; q++) {
    const col = Math.floor((q - 1) / perCol);
    const row = (q - 1) % perCol;
    const qX = marginX + (4 / 186) * sheetW + col * colWidth;
    const qY = contentY + row * rowHeight;

    partI[q] = ['A', 'B', 'C', 'D'].map((opt, oIdx) => ({
      x: qX + (15 / 186) * sheetW + oIdx * optGap,
      y: qY,
      r: qRadius,
      label: opt
    }));
  }

  return { sbd, examCode, partI };
}

// ============================================================================
// IMAGE PROCESSING & CORNER ANCHOR DETECTOR
// ============================================================================
export interface DetectedAnchors {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  confidence: number;
}

/**
 * Searches for 4 black square corner markers in video / canvas frame
 */
export function detectCornerAnchors(ctx: CanvasRenderingContext2D, width: number, height: number): DetectedAnchors | null {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Fast brightness calculation and Otsu thresholding
    let totalLum = 0;
    const step = 4; // Subsample for 60fps real-time performance
    let sampleCount = 0;
    for (let i = 0; i < data.length; i += step * 4) {
      totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sampleCount++;
    }
    const avgLum = totalLum / sampleCount;
    const darkThreshold = Math.max(45, avgLum * 0.5);

    // Bounding regions for 4 corners (outer 25% of viewport)
    const scanW = Math.floor(width * 0.28);
    const scanH = Math.floor(height * 0.28);

    const findAnchorInRegion = (startX: number, startY: number, endX: number, endY: number) => {
      let minScore = Infinity;
      let bestX = startX + (endX - startX) / 2;
      let bestY = startY + (endY - startY) / 2;
      const patch = 12;

      for (let y = startY + patch; y < endY - patch; y += 6) {
        for (let x = startX + patch; x < endX - patch; x += 6) {
          let darkCount = 0;
          for (let dy = -patch; dy <= patch; dy += 3) {
            for (let dx = -patch; dx <= patch; dx += 3) {
              const idx = ((y + dy) * width + (x + dx)) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < darkThreshold) darkCount++;
            }
          }
          if (darkCount > 35) { // Solid dark cluster found
            const distFromCorner = Math.hypot(
              x - (startX === 0 ? 0 : width),
              y - (startY === 0 ? 0 : height)
            );
            if (distFromCorner < minScore) {
              minScore = distFromCorner;
              bestX = x;
              bestY = y;
            }
          }
        }
      }
      return { x: bestX, y: bestY };
    };

    const tl = findAnchorInRegion(0, 0, scanW, scanH);
    const tr = findAnchorInRegion(width - scanW, 0, width, scanH);
    const bl = findAnchorInRegion(0, height - scanH, scanW, height);
    const br = findAnchorInRegion(width - scanW, height - scanH, width, height);

    // Validate geometry: width & height ratio must be reasonable for an A4 sheet
    const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
    const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);

    const aspect = ((leftH + rightH) / 2) / ((topW + botW) / 2);
    // Standard A4 aspect is 1.414. Accept range [1.15, 1.65] for perspective tilting
    if (aspect >= 1.15 && aspect <= 1.7 && topW > width * 0.4) {
      return {
        topLeft: tl,
        topRight: tr,
        bottomLeft: bl,
        bottomRight: br,
        confidence: 0.92
      };
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Calculates pixel darkness density inside a circular bubble
 */
export function getBubbleDarkness(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  threshold: number = 110
): number {
  try {
    const rInt = Math.ceil(radius);
    const imgData = ctx.getImageData(cx - rInt, cy - rInt, rInt * 2, rInt * 2);
    const data = imgData.data;

    let darkPixels = 0;
    let totalInCircle = 0;
    const rSq = radius * radius;

    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          totalInCircle++;
          const idx = ((dy + rInt) * (rInt * 2) + (dx + rInt)) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum < threshold) {
            darkPixels++;
          }
        }
      }
    }

    return totalInCircle > 0 ? darkPixels / totalInCircle : 0;
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// FULL SCAN & GRADING PIPELINE
// ============================================================================
export interface ScanResultDetail {
  sbd: string;
  examCode: string;
  partI_answers: Record<number, string>;
  partII_answers: Record<number, { a?: boolean; b?: boolean; c?: boolean; d?: boolean }>;
  partIII_answers: Record<number, string>;
  annotatedCanvas: HTMLCanvasElement;
}

/**
 * Scans a canvas containing an aligned normalized exam sheet (800x1131)
 */
export function analyzeNormalizedSheet(
  canvas: HTMLCanvasElement,
  templateType: OMRTemplateType
): ScanResultDetail {
  const ctx = canvas.getContext('2d')!;
  const mapping = templateType === 'gdpt_2018'
    ? buildGDPT2018Mapping()
    : buildTNMakerMapping(templateType === 'tnmaker_20' ? 20 : templateType === 'tnmaker_40' ? 40 : 50);

  // Compute adaptive threshold for this specific paper lighting
  let sampleLum = 0;
  const sampleData = ctx.getImageData(0, 0, Math.min(200, canvas.width), Math.min(200, canvas.height)).data;
  for (let i = 0; i < sampleData.length; i += 16) {
    sampleLum += 0.299 * sampleData[i] + 0.587 * sampleData[i + 1] + 0.114 * sampleData[i + 2];
  }
  const paperBrightness = sampleLum / (sampleData.length / 16);
  const fillThreshold = Math.max(50, paperBrightness * 0.55);

  // Create annotated review copy
  const reviewCanvas = document.createElement('canvas');
  reviewCanvas.width = canvas.width;
  reviewCanvas.height = canvas.height;
  const revCtx = reviewCanvas.getContext('2d')!;
  revCtx.drawImage(canvas, 0, 0);

  // 1. Decode SBD (6 columns)
  let sbdDigits = '';
  mapping.sbd.forEach((column) => {
    let maxFill = 0;
    let chosenDigit = -1;
    column.forEach((b, digit) => {
      const fill = getBubbleDarkness(ctx, b.x, b.y, b.r, fillThreshold);
      if (fill > maxFill) {
        maxFill = fill;
        chosenDigit = digit;
      }
    });

    if (maxFill > 0.35 && chosenDigit >= 0) {
      sbdDigits += chosenDigit.toString();
      // Draw green indicator on review canvas
      const b = column[chosenDigit];
      revCtx.strokeStyle = '#10b981';
      revCtx.lineWidth = 2.5;
      revCtx.strokeRect(b.x - b.r - 2, b.y - b.r - 2, b.r * 2 + 4, b.r * 2 + 4);
    } else {
      sbdDigits += '0'; // default fallback
    }
  });

  // 2. Decode Mã Đề (4 columns)
  let codeDigits = '';
  mapping.examCode.forEach((column) => {
    let maxFill = 0;
    let chosenDigit = -1;
    column.forEach((b, digit) => {
      const fill = getBubbleDarkness(ctx, b.x, b.y, b.r, fillThreshold);
      if (fill > maxFill) {
        maxFill = fill;
        chosenDigit = digit;
      }
    });

    if (maxFill > 0.35 && chosenDigit >= 0) {
      codeDigits += chosenDigit.toString();
      const b = column[chosenDigit];
      revCtx.strokeStyle = '#3b82f6';
      revCtx.lineWidth = 2.5;
      revCtx.strokeRect(b.x - b.r - 2, b.y - b.r - 2, b.r * 2 + 4, b.r * 2 + 4);
    } else {
      codeDigits += '1';
    }
  });

  // Ensure 4 digits
  if (codeDigits.length < 4) {
    codeDigits = codeDigits.padEnd(4, '1');
  }

  // 3. Decode Part I: Multiple Choice
  const partI_answers: Record<number, string> = {};
  Object.entries(mapping.partI).forEach(([qStr, bubbles]) => {
    const qNum = parseInt(qStr, 10);
    let bestOption = '';
    let maxFill = 0;
    let secondMax = 0;

    bubbles.forEach((b) => {
      const fill = getBubbleDarkness(ctx, b.x, b.y, b.r, fillThreshold);
      if (fill > maxFill) {
        secondMax = maxFill;
        maxFill = fill;
        bestOption = b.label;
      } else if (fill > secondMax) {
        secondMax = fill;
      }
    });

    // Valid if fill > 0.35 and clearly darker than 2nd candidate (avoids double bubbling)
    if (maxFill > 0.35 && maxFill - secondMax > 0.12) {
      partI_answers[qNum] = bestOption;
      // Mark bubble on review canvas
      const chosenB = bubbles.find(b => b.label === bestOption);
      if (chosenB) {
        revCtx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        revCtx.beginPath();
        revCtx.arc(chosenB.x, chosenB.y, chosenB.r + 2, 0, Math.PI * 2);
        revCtx.fill();
      }
    }
  });

  // 4. Decode Part II: True/False (if GDPT 2018)
  const partII_answers: Record<number, { a?: boolean; b?: boolean; c?: boolean; d?: boolean }> = {};
  if (mapping.partII) {
    Object.entries(mapping.partII).forEach(([qStr, stmts]) => {
      const qNum = parseInt(qStr, 10);
      partII_answers[qNum] = {};

      (['a', 'b', 'c', 'd'] as const).forEach((stmtKey) => {
        const pair = stmts[stmtKey];
        const fillD = getBubbleDarkness(ctx, pair.d.x, pair.d.y, pair.d.r, fillThreshold);
        const fillS = getBubbleDarkness(ctx, pair.s.x, pair.s.y, pair.s.r, fillThreshold);

        if (fillD > 0.35 && fillD - fillS > 0.1) {
          partII_answers[qNum][stmtKey] = true;
          revCtx.fillStyle = 'rgba(16, 185, 129, 0.4)';
          revCtx.beginPath();
          revCtx.arc(pair.d.x, pair.d.y, pair.d.r + 2, 0, Math.PI * 2);
          revCtx.fill();
        } else if (fillS > 0.35 && fillS - fillD > 0.1) {
          partII_answers[qNum][stmtKey] = false;
          revCtx.fillStyle = 'rgba(16, 185, 129, 0.4)';
          revCtx.beginPath();
          revCtx.arc(pair.s.x, pair.s.y, pair.s.r + 2, 0, Math.PI * 2);
          revCtx.fill();
        }
      });
    });
  }

  return {
    sbd: sbdDigits,
    examCode: codeDigits,
    partI_answers,
    partII_answers,
    partIII_answers: {},
    annotatedCanvas: reviewCanvas
  };
}

/**
 * Grades the decoded student answers against the Answer Key Matrix
 */
export function gradeStudentSubmission(
  scanDetail: ScanResultDetail,
  answerKeys: Record<string, ExamAnswerKey>,
  studentRoster: { sbd: string; name: string; className: string }[],
  templateType: OMRTemplateType
): OMRGradingResult {
  const { sbd, examCode, partI_answers, partII_answers, partIII_answers, annotatedCanvas } = scanDetail;

  // 1. Look up student information by SBD
  const matchedStudent = studentRoster.find(
    st => st.sbd === sbd || st.sbd.replace(/^0+/, '') === sbd.replace(/^0+/, '')
  );
  const studentName = matchedStudent ? matchedStudent.name : `Thí sinh SBD ${sbd}`;
  const studentClass = matchedStudent ? matchedStudent.className : '';

  // 2. Look up Answer Key for this 4-digit code (fallback to first key or default)
  let key = answerKeys[examCode];
  if (!key) {
    const allKeys = Object.values(answerKeys);
    key = allKeys.find(k => k.code === examCode) || allKeys[0] || {
      code: examCode,
      templateType,
      partI: {},
      partII: {},
      partIII: {}
    };
  }

  // 3. Grade Part I
  let partI_correct = 0;
  const partI_total = templateType === 'gdpt_2018' ? 12 : templateType === 'tnmaker_20' ? 20 : templateType === 'tnmaker_40' ? 40 : 50;
  const p1PtsPerQ = key.pointsConfig?.partI_per_question ?? (templateType === 'gdpt_2018' ? 0.25 : 10 / partI_total);

  for (let q = 1; q <= partI_total; q++) {
    const studentAns = partI_answers[q];
    const correctAns = key.partI[q];
    if (studentAns && correctAns && studentAns.toUpperCase() === correctAns.toUpperCase()) {
      partI_correct++;
    }
  }
  const partI_score = parseFloat((partI_correct * p1PtsPerQ).toFixed(2));

  // 4. Grade Part II (GDPT 2018 standard scaling: 1 ý = 0.1đ; 2 ý = 0.25đ; 3 ý = 0.5đ; 4 ý = 1.0đ)
  let partII_score = 0;
  let partII_correctCount = 0;

  if (templateType === 'gdpt_2018') {
    for (let q = 1; q <= 4; q++) {
      let correctInQuestion = 0;
      const keyStmt = key.partII[q] || {};
      const studStmt = partII_answers[q] || {};

      (['a', 'b', 'c', 'd'] as const).forEach((stmtKey) => {
        if (typeof keyStmt[stmtKey] === 'boolean' && studStmt[stmtKey] === keyStmt[stmtKey]) {
          correctInQuestion++;
          partII_correctCount++;
        }
      });

      if (correctInQuestion === 1) partII_score += (key.pointsConfig?.partII_1 ?? 0.1);
      else if (correctInQuestion === 2) partII_score += (key.pointsConfig?.partII_2 ?? 0.25);
      else if (correctInQuestion === 3) partII_score += (key.pointsConfig?.partII_3 ?? 0.5);
      else if (correctInQuestion === 4) partII_score += (key.pointsConfig?.partII_4 ?? 1.0);
    }
    partII_score = parseFloat(partII_score.toFixed(2));
  }

  // 5. Grade Part III (6 short answers x 0.5 = 3.0 pts)
  let partIII_correct = 0;
  const partIII_total = templateType === 'gdpt_2018' ? 6 : 0;
  const p3PtsPerQ = key.pointsConfig?.partIII_per_question ?? 0.5;

  if (templateType === 'gdpt_2018') {
    for (let q = 1; q <= 6; q++) {
      const studentAns = (partIII_answers[q] || '').trim();
      const correctAns = (key.partIII[q] || '').trim();
      if (studentAns && correctAns && studentAns === correctAns) {
        partIII_correct++;
      }
    }
  }
  const partIII_score = parseFloat((partIII_correct * p3PtsPerQ).toFixed(2));

  // 6. Total score on 10-point scale
  const totalScore = parseFloat(Math.min(10, partI_score + partII_score + partIII_score).toFixed(2));

  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    sbd,
    studentName,
    studentClass,
    examCode,
    templateType,
    partI_answers,
    partII_answers,
    partIII_answers,
    partI_score,
    partII_score,
    partIII_score,
    totalScore,
    maxScore: 10,
    partI_correct,
    partI_total,
    partII_correctCount,
    partIII_correct,
    partIII_total,
    capturedImageUrl: annotatedCanvas.toDataURL('image/jpeg', 0.85)
  };
}
