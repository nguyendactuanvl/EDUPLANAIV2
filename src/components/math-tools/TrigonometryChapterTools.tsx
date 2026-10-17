import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, Compass, ArrowRight, CheckCircle2, 
  Sparkles, Layers, Calculator, BookOpen, MoveRight, Scale,
  Sun, Moon, Copy, Check, Eye, Ruler, Building2, Mountain
} from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface TrigonometryChapterToolsProps {
  theme?: 'light' | 'dark';
}

export function TrigonometryChapterTools({ theme = 'light' }: TrigonometryChapterToolsProps) {
  // Active Lesson state (1 to 3)
  const [activeLesson, setActiveLesson] = useState<1 | 2 | 3>(2);

  // Solution Theme: 'light' (trắng giấy) or 'dark' (bảng phấn)
  const [solutionTheme, setSolutionTheme] = useState<'light' | 'dark'>(theme);
  const [solutionFontSize, setSolutionFontSize] = useState<'normal' | 'large'>('normal');
  const [copiedLesson, setCopiedLesson] = useState<number | null>(null);

  const isLightMode = theme === 'light';

  const handleCopySolution = (text: string, lessonId: number) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedLesson(lessonId);
      setTimeout(() => setCopiedLesson(null), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // =========================================================================
  // BÀI 1: GIÁ TRỊ LƯỢNG GIÁC CỦA GÓC TỪ 0 ĐẾN 180 ĐỘ
  // =========================================================================
  const [b1Angle, setB1Angle] = useState<number>(60);

  const b1Result = useMemo(() => {
    const rad = (b1Angle * Math.PI) / 180;
    const sinVal = Math.sin(rad);
    const cosVal = Math.cos(rad);
    const tanVal = Math.abs(b1Angle - 90) < 1e-4 ? null : Math.tan(rad);
    const cotVal = b1Angle === 0 || b1Angle === 180 ? null : 1 / Math.tan(rad);

    // Supplementary angle (180 - angle)
    const suppAngle = 180 - b1Angle;
    const suppRad = (suppAngle * Math.PI) / 180;
    const suppSin = Math.sin(suppRad);
    const suppCos = Math.cos(suppRad);

    // Exact string representation for special angles
    let exactText = "";
    if (b1Angle === 0) exactText = "$\\sin 0^\\circ = 0, \\cos 0^\\circ = 1, \\tan 0^\\circ = 0$";
    else if (b1Angle === 30) exactText = "$\\sin 30^\\circ = \\frac{1}{2}, \\cos 30^\\circ = \\frac{\\sqrt{3}}{2}, \\tan 30^\\circ = \\frac{\\sqrt{3}}{3}, \\cot 30^\\circ = \\sqrt{3}$";
    else if (b1Angle === 45) exactText = "$\\sin 45^\\circ = \\frac{\\sqrt{2}}{2}, \\cos 45^\\circ = \\frac{\\sqrt{2}}{2}, \\tan 45^\\circ = 1, \\cot 45^\\circ = 1$";
    else if (b1Angle === 60) exactText = "$\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}, \\cos 60^\\circ = \\frac{1}{2}, \\tan 60^\\circ = \\sqrt{3}, \\cot 60^\\circ = \\frac{\\sqrt{3}}{3}$";
    else if (b1Angle === 90) exactText = "$\\sin 90^\\circ = 1, \\cos 90^\\circ = 0, \\tan 90^\\circ$ không xác định, $\\cot 90^\\circ = 0$";
    else if (b1Angle === 120) exactText = "$\\sin 120^\\circ = \\frac{\\sqrt{3}}{2}, \\cos 120^\\circ = -\\frac{1}{2}, \\tan 120^\\circ = -\\sqrt{3}, \\cot 120^\\circ = -\\frac{\\sqrt{3}}{3}$";
    else if (b1Angle === 135) exactText = "$\\sin 135^\\circ = \\frac{\\sqrt{2}}{2}, \\cos 135^\\circ = -\\frac{\\sqrt{2}}{2}, \\tan 135^\\circ = -1, \\cot 135^\\circ = -1$";
    else if (b1Angle === 150) exactText = "$\\sin 150^\\circ = \\frac{1}{2}, \\cos 150^\\circ = -\\frac{\\sqrt{3}}{2}, \\tan 150^\\circ = -\\frac{\\sqrt{3}}{3}, \\cot 150^\\circ = -\\sqrt{3}$";
    else if (b1Angle === 180) exactText = "$\\sin 180^\\circ = 0, \\cos 180^\\circ = -1, \\tan 180^\\circ = 0$";

    return { rad, sinVal, cosVal, tanVal, cotVal, suppAngle, suppSin, suppCos, exactText };
  }, [b1Angle]);

  const b1Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 1: GIÁ TRỊ LƯỢNG GIÁC TỪ $0^\\circ$ ĐẾN $180^\\circ$)",
      "",
      `1. **Tọa độ điểm $M(x_0, y_0)$ trên nửa đường tròn đơn vị ứng với góc $\\alpha = ${b1Angle}^\\circ$:**`,
      `   - Bán kính đường tròn $R = 1$, tâm $O(0, 0)$.`,
      `   - Hoành độ: $x_0 = \\cos(${b1Angle}^\\circ) \\approx ${b1Result.cosVal.toFixed(4)}$`,
      `   - Tung độ: $y_0 = \\sin(${b1Angle}^\\circ) \\approx ${b1Result.sinVal.toFixed(4)}$`,
      `   - Điểm biểu diễn: $M(${b1Result.cosVal.toFixed(3)}, ${b1Result.sinVal.toFixed(3)})$`,
      "",
      "2. **Các giá trị lượng giác tương ứng:**",
      `   - $\\sin ${b1Angle}^\\circ = ${b1Result.sinVal.toFixed(4)}$`,
      `   - $\\cos ${b1Angle}^\\circ = ${b1Result.cosVal.toFixed(4)}$`,
      b1Result.tanVal !== null 
        ? `   - $\\tan ${b1Angle}^\\circ = \\frac{\\sin ${b1Angle}^\\circ}{\\cos ${b1Angle}^\\circ} \\approx ${b1Result.tanVal.toFixed(4)}$`
        : `   - $\\tan 90^\\circ$ không xác định (do $\\cos 90^\\circ = 0$).`,
      b1Result.cotVal !== null 
        ? `   - $\\cot ${b1Angle}^\\circ = \\frac{\\cos ${b1Angle}^\\circ}{\\sin ${b1Angle}^\\circ} \\approx ${b1Result.cotVal.toFixed(4)}$`
        : `   - $\\cot ${b1Angle}^\\circ$ không xác định (do $\\sin ${b1Angle}^\\circ = 0$).`,
      "",
      b1Result.exactText ? `3. **Giá trị đại số chính xác:**\n   ${b1Result.exactText}\n` : "",
      "4. **Mối quan hệ với góc bù nhau ($180^\\circ - \\alpha$):**",
      `   - Góc bù: $180^\\circ - ${b1Angle}^\\circ = ${b1Result.suppAngle}^\\circ$`,
      `   - $\\sin(${b1Result.suppAngle}^\\circ) = \\sin(${b1Angle}^\\circ) = ${b1Result.sinVal.toFixed(4)}$`,
      `   - $\\cos(${b1Result.suppAngle}^\\circ) = -\\cos(${b1Angle}^\\circ) = ${(-b1Result.cosVal).toFixed(4)}$`
    ].filter(Boolean).join("\n");
  }, [b1Angle, b1Result]);

  // =========================================================================
  // BÀI 2: ĐỊNH LÝ CÔ-SIN VÀ ĐỊNH LÝ SIN (TAM GIÁC ABC)
  // =========================================================================
  const [b2Mode, setB2Mode] = useState<'SAS' | 'SSS' | 'ASA'>('SAS');
  // State for SAS: side b, side c, angle A
  const [b2SideB, setB2SideB] = useState<number>(5);
  const [b2SideC, setB2SideC] = useState<number>(6);
  const [b2AngleA, setB2AngleA] = useState<number>(60);

  // Toggle visual elements on triangle SVG
  const [b2ShowCircumcircle, setB2ShowCircumcircle] = useState<boolean>(true);
  const [b2ShowIncircle, setB2ShowIncircle] = useState<boolean>(false);
  const [b2ShowHeight, setB2ShowHeight] = useState<boolean>(true);

  const b2Result = useMemo(() => {
    const angleA_rad = (b2AngleA * Math.PI) / 180;
    
    // 1. Tính cạnh a theo định lý cô-sin: a^2 = b^2 + c^2 - 2bc*cos(A)
    const a2 = b2SideB * b2SideB + b2SideC * b2SideC - 2 * b2SideB * b2SideC * Math.cos(angleA_rad);
    const sideA = a2 > 0 ? Math.sqrt(a2) : 0;

    // 2. Tính diện tích tam giác: S = 1/2 * b * c * sin(A)
    const area = 0.5 * b2SideB * b2SideC * Math.sin(angleA_rad);

    // 3. Tính góc B và C theo định lý cô-sin: cos(B) = (a^2 + c^2 - b^2) / (2ac)
    let angleB_deg = 0;
    let angleC_deg = 0;
    let cosB = 0;
    let cosC = 0;

    if (sideA > 0 && b2SideC > 0) {
      cosB = (sideA * sideA + b2SideC * b2SideC - b2SideB * b2SideB) / (2 * sideA * b2SideC);
      cosB = Math.max(-1, Math.min(1, cosB));
      angleB_deg = (Math.acos(cosB) * 180) / Math.PI;

      cosC = (sideA * sideA + b2SideB * b2SideB - b2SideC * b2SideC) / (2 * sideA * b2SideB);
      cosC = Math.max(-1, Math.min(1, cosC));
      angleC_deg = (Math.acos(cosC) * 180) / Math.PI;
    }

    // 4. Bán kính đường tròn ngoại tiếp: R = a / (2 * sin(A))
    const sinA = Math.sin(angleA_rad);
    const R = sinA > 0 ? sideA / (2 * sinA) : 0;

    // 5. Chu vi & Nửa chu vi p:
    const perimeter = sideA + b2SideB + b2SideC;
    const p = perimeter / 2;

    // 6. Bán kính đường tròn nội tiếp r: r = S / p
    const r = p > 0 ? area / p : 0;

    // 7. Độ dài đường cao hạ từ A: h_a = 2S / a
    const ha = sideA > 0 ? (2 * area) / sideA : 0;
    const hb = b2SideB > 0 ? (2 * area) / b2SideB : 0;
    const hc = b2SideC > 0 ? (2 * area) / b2SideC : 0;

    // 8. Độ dài đường trung tuyến m_a^2 = (2(b^2 + c^2) - a^2) / 4
    const ma2 = (2 * (b2SideB * b2SideB + b2SideC * b2SideC) - sideA * sideA) / 4;
    const ma = ma2 > 0 ? Math.sqrt(ma2) : 0;

    return { 
      sideA, a2, area, angleB_deg, angleC_deg, cosB, cosC, 
      R, p, perimeter, r, ha, hb, hc, ma 
    };
  }, [b2SideB, b2SideC, b2AngleA]);

  const b2Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 2: ĐỊNH LÝ CÔ-SIN VÀ ĐỊNH LÝ SIN)",
      "",
      `Cho tam giác $ABC$ có cạnh $b = ${b2SideB}$, $c = ${b2SideC}$, góc xen giữa $\\widehat{A} = ${b2AngleA}^\\circ$.`,
      "",
      "1. **Tính cạnh $a$ (Định lý Cô-sin):**",
      `   Công thức: $a^2 = b^2 + c^2 - 2bc \\cos A$`,
      `   Thay số: $a^2 = ${b2SideB}^2 + ${b2SideC}^2 - 2 \\cdot ${b2SideB} \\cdot ${b2SideC} \\cdot \\cos(${b2AngleA}^\\circ)$`,
      `   $a^2 = ${b2SideB * b2SideB} + ${b2SideC * b2SideC} - ${2 * b2SideB * b2SideC} \\cdot ${Math.cos((b2AngleA * Math.PI) / 180).toFixed(4)} = ${b2Result.a2.toFixed(3)}$`,
      `   Suy ra cạnh $a = \\sqrt{${b2Result.a2.toFixed(3)}} \\approx ${b2Result.sideA.toFixed(2)}$`,
      "",
      "2. **Tính các góc còn lại $\\widehat{B}$ và $\\widehat{C}$:**",
      `   Hệ quả định lý cô-sin: $\\cos B = \\frac{a^2 + c^2 - b^2}{2ac}$`,
      `   Thay số: $\\cos B = \\frac{${b2Result.sideA.toFixed(2)}^2 + ${b2SideC}^2 - ${b2SideB}^2}{2 \\cdot ${b2Result.sideA.toFixed(2)} \\cdot ${b2SideC}} \\approx ${b2Result.cosB.toFixed(4)}$`,
      `   Suy ra góc $\\widehat{B} \\approx ${b2Result.angleB_deg.toFixed(1)}^\\circ$`,
      `   Góc $\\widehat{C} = 180^\\circ - \\widehat{A} - \\widehat{B} = 180^\\circ - ${b2AngleA}^\\circ - ${b2Result.angleB_deg.toFixed(1)}^\\circ \\approx ${b2Result.angleC_deg.toFixed(1)}^\\circ$`,
      "",
      "3. **Tính Diện tích tam giác $S$:**",
      `   Công thức: $S = \\frac{1}{2}bc \\sin A = \\frac{1}{2} \\cdot ${b2SideB} \\cdot ${b2SideC} \\cdot \\sin(${b2AngleA}^\\circ) \\approx ${b2Result.area.toFixed(2)}$`,
      "",
      "4. **Bán kính đường tròn ngoại tiếp $R$ (Định lý Sin):**",
      `   Công thức: $\\frac{a}{\\sin A} = 2R \\implies R = \\frac{a}{2\\sin A} = \\frac{${b2Result.sideA.toFixed(2)}}{2 \\cdot \\sin(${b2AngleA}^\\circ)} \\approx ${b2Result.R.toFixed(2)}$`,
      "",
      "5. **Bán kính đường tròn nội tiếp $r$ và các đường cao:**",
      `   - Nửa chu vi: $p = \\frac{a + b + c}{2} = \\frac{${b2Result.sideA.toFixed(2)} + ${b2SideB} + ${b2SideC}}{2} = ${b2Result.p.toFixed(2)}$`,
      `   - Bán kính nội tiếp: $r = \\frac{S}{p} = \\frac{${b2Result.area.toFixed(2)}}{${b2Result.p.toFixed(2)}} \\approx ${b2Result.r.toFixed(2)}$`,
      `   - Đường cao $h_a = \\frac{2S}{a} = \\frac{2 \\cdot ${b2Result.area.toFixed(2)}}{${b2Result.sideA.toFixed(2)}} \\approx ${b2Result.ha.toFixed(2)}$`
    ].join("\n");
  }, [b2SideB, b2SideC, b2AngleA, b2Result]);

  // =========================================================================
  // BÀI 3: GIẢI TAM GIÁC & ỨNG DỤNG THỰC TẾ (ĐO CHIỀU CAO & KHOẢNG CÁCH)
  // =========================================================================
  // Scenario 1: Đo chiều cao ngọn tháp/tòa nhà từ 2 điểm A và B
  const [appDistance, setAppDistance] = useState<number>(20); // mét giữa A và B
  const [appAngleAlpha, setAppAngleAlpha] = useState<number>(45); // góc ngắm tại A (độ)
  const [appAngleBeta, setAppAngleBeta] = useState<number>(32); // góc ngắm tại B (độ)
  const [appInstrumentHeight, setAppInstrumentHeight] = useState<number>(1.3); // chiều cao giác kế (m)

  const b3Result = useMemo(() => {
    const alphaRad = (appAngleAlpha * Math.PI) / 180;
    const betaRad = (appAngleBeta * Math.PI) / 180;

    // Trong tam giác CAB: góc ACB = alpha - beta
    const gammaDeg = appAngleAlpha - appAngleBeta;
    const gammaRad = (gammaDeg * Math.PI) / 180;

    let AC = 0;
    let heightAboveInstrument = 0;
    let totalHeight = 0;
    let distFromA = 0;

    if (gammaRad > 0) {
      // Theo định lý Sin trong tam giác CAB: AC / sin(beta) = AB / sin(alpha - beta)
      AC = (appDistance * Math.sin(betaRad)) / Math.sin(gammaRad);
      // Chiều cao phần trên giác kế: CH' = AC * sin(alpha)
      heightAboveInstrument = AC * Math.sin(alphaRad);
      // Chiều cao toàn phần: h = CH' + h0
      totalHeight = heightAboveInstrument + appInstrumentHeight;
      // Khoảng cách từ điểm A tới chân tháp: d_A = CH' / tan(alpha)
      distFromA = Math.tan(alphaRad) > 0 ? heightAboveInstrument / Math.tan(alphaRad) : 0;
    }

    return { gammaDeg, AC, heightAboveInstrument, totalHeight, distFromA };
  }, [appDistance, appAngleAlpha, appAngleBeta, appInstrumentHeight]);

  const b3Markdown = useMemo(() => {
    return [
      "#### GIẢI CHI TIẾT (BÀI 3: ỨNG DỤNG THỰC TẾ ĐO CHIỀU CAO THÁP)",
      "",
      `**Bài toán thực tế:** Để đo chiều cao tháp truyền hình $CH = h$ khi không thể đến được chân tháp $H$, người ta đặt giác kế tại hai điểm quan sát $A$ và $B$ thẳng hàng với chân tháp, cách nhau một khoảng $AB = d = ${appDistance}\\text{ m}$.`,
      `- Góc nâng tại vị trí $A$: $\\alpha = ${appAngleAlpha}^\\circ$`,
      `- Góc nâng tại vị trí $B$: $\\beta = ${appAngleBeta}^\\circ$`,
      `- Chiều cao của giác kế: $h_0 = ${appInstrumentHeight}\\text{ m}$`,
      "",
      "1. **Xét tam giác $\\triangle CAB$:**",
      `   - Ta có góc $\\widehat{CAH'} = \\alpha = ${appAngleAlpha}^\\circ$ là góc ngoài tại đỉnh $A$ của $\\triangle CAB$.`,
      `   - Do đó góc tại đỉnh tháp: $\\widehat{ACB} = \\alpha - \\beta = ${appAngleAlpha}^\\circ - ${appAngleBeta}^\\circ = ${b3Result.gammaDeg.toFixed(1)}^\\circ$`,
      "",
      "2. **Áp dụng định lý Sin trong tam giác $\\triangle CAB$:**",
      `   $$\\frac{AC}{\\sin \\beta} = \\frac{AB}{\\sin(\\alpha - \\beta)} \\implies AC = \\frac{AB \\cdot \\sin \\beta}{\\sin(\\alpha - \\beta)}$$`,
      `   Thay số: $AC = \\frac{${appDistance} \\cdot \\sin(${appAngleBeta}^\\circ)}{\\sin(${b3Result.gammaDeg.toFixed(1)}^\\circ)} \\approx ${b3Result.AC.toFixed(2)}\\text{ m}$`,
      "",
      "3. **Tính chiều cao của ngọn tháp $h$:**",
      `   - Chiều cao từ độ cao giác kế lên đỉnh tháp:`,
      `     $$CH' = AC \\cdot \\sin \\alpha = ${b3Result.AC.toFixed(2)} \\cdot \\sin(${appAngleAlpha}^\\circ) \\approx ${b3Result.heightAboveInstrument.toFixed(2)}\\text{ m}$$`,
      `   - Chiều cao toàn phần của ngọn tháp tính từ mặt đất:`,
      `     $$h = CH' + h_0 = ${b3Result.heightAboveInstrument.toFixed(2)} + ${appInstrumentHeight} = ${b3Result.totalHeight.toFixed(2)}\\text{ m}$$`,
      `   - Khoảng cách từ điểm đo $A$ đến chân tháp: $AH = \\frac{CH'}{\\tan \\alpha} \\approx ${b3Result.distFromA.toFixed(2)}\\text{ m}$`
    ].join("\n");
  }, [appDistance, appAngleAlpha, appAngleBeta, appInstrumentHeight, b3Result]);

  // Helper to render high-contrast solution card
  const renderSolutionCard = (content: string, lessonId: number, lessonTitle: string) => {
    const isSolLight = solutionTheme === 'light';
    const isLarge = solutionFontSize === 'large';

    return (
      <div className={`rounded-2xl border transition-all duration-200 shadow-md overflow-hidden ${
        isSolLight
          ? "bg-white border-emerald-200 text-slate-900 ring-1 ring-emerald-100"
          : "bg-slate-900 border-slate-700 text-slate-100 ring-1 ring-slate-800"
      }`}>
        {/* Header Bar */}
        <div className={`p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 border-b ${
          isSolLight ? "bg-emerald-50/90 border-emerald-100" : "bg-slate-850 border-slate-750"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs ${
              isSolLight ? "bg-emerald-600 text-white" : "bg-emerald-950 text-emerald-300 border border-emerald-700"
            }`}>
              📖 LỜI GIẢI CHI TIẾT
            </span>
            <span className={`text-xs font-bold truncate ${isSolLight ? "text-emerald-950" : "text-slate-100"}`}>
              {lessonTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme switcher */}
            <div className={`flex items-center p-0.5 rounded-xl border ${
              isSolLight ? "bg-emerald-100/70 border-emerald-200" : "bg-slate-800 border-slate-700"
            }`}>
              <button
                type="button"
                onClick={() => setSolutionTheme('light')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isSolLight
                    ? "bg-white text-emerald-950 shadow-xs border border-emerald-200"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Nền giấy sáng (Khuyên dùng - Dễ đọc nhất)"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Nền sáng</span>
              </button>
              <button
                type="button"
                onClick={() => setSolutionTheme('dark')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  !isSolLight
                    ? "bg-slate-700 text-amber-300 shadow-xs border border-slate-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Bảng phấn dạ quang"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Nền tối</span>
              </button>
            </div>

            {/* Font size button */}
            <button
              type="button"
              onClick={() => setSolutionFontSize(isLarge ? 'normal' : 'large')}
              className={`px-2.5 py-1 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                isSolLight
                  ? "bg-white hover:bg-slate-100 text-slate-800 border-emerald-200 shadow-2xs"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
              }`}
              title="Đổi cỡ chữ hiển thị"
            >
              <span>{isLarge ? 'Cỡ thường' : 'Chữ to'}</span>
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={() => handleCopySolution(content, lessonId)}
              className={`p-1.5 sm:px-2.5 sm:py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                isSolLight
                  ? "bg-white hover:bg-slate-100 text-slate-800 border-emerald-200 shadow-2xs"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"
              }`}
              title="Sao chép lời giải"
            >
              {copiedLesson === lessonId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Markdown Content Area */}
        <div className={`p-4 sm:p-6 select-text overflow-x-auto ${
          isLarge ? "text-sm sm:text-base leading-relaxed" : "text-xs sm:text-sm leading-normal"
        }`}>
          <MarkdownRenderer
            className={isSolLight
              ? "markdown-body prose prose-slate max-w-none prose-headings:text-emerald-950 prose-headings:font-black prose-p:text-slate-900 prose-p:font-medium prose-strong:text-emerald-950 prose-li:text-slate-900"
              : "markdown-body prose prose-invert max-w-none prose-headings:text-amber-300 prose-headings:font-black prose-p:text-slate-100 prose-p:font-medium prose-strong:text-amber-300 prose-li:text-slate-100"
            }
            content={content}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 3 LESSON TABS FOR CHAPTER 2 */}
      <div className="space-y-2">
        <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
          isLightMode ? "text-slate-800" : "text-slate-200"
        }`}>
          <BookOpen className="w-4 h-4 text-emerald-600" />
          Chọn bài học minh họa & tính toán:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 1 as const,
              title: "Bài 1: Giá trị lượng giác",
              sub: "Góc từ 0° đến 180°, nửa đường tròn",
              badge: "sin, cos, tan, cot"
            },
            {
              id: 2 as const,
              title: "Bài 2: Định lý Cô-sin & Định lý Sin",
              sub: "Giải tam giác a, b, c, góc A, B, C, R, r",
              badge: "Định lý & Diện tích"
            },
            {
              id: 3 as const,
              title: "Bài 3: Ứng dụng thực tế",
              sub: "Đo chiều cao ngọn tháp & khoảng cách",
              badge: "Ứng dụng thực tế"
            }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveLesson(item.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeLesson === item.id
                  ? isLightMode
                    ? "bg-emerald-50/90 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 shadow-md"
                    : "bg-slate-800 border-emerald-400 text-white ring-2 ring-emerald-500/40 shadow-lg"
                  : isLightMode
                    ? "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 text-slate-800 shadow-2xs"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    activeLesson === item.id 
                      ? "bg-emerald-600 text-white" 
                      : isLightMode ? "bg-slate-200 text-slate-700" : "bg-slate-700 text-slate-300"
                  }`}>
                    Bài 0{item.id}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isLightMode ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-emerald-950 text-emerald-300"
                  }`}>
                    {item.badge}
                  </span>
                </div>
                <h4 className={`font-black text-xs sm:text-sm leading-tight ${
                  activeLesson === item.id 
                    ? isLightMode ? "text-emerald-950 font-black" : "text-white"
                    : isLightMode ? "text-slate-800" : "text-slate-200"
                }`}>
                  {item.title}
                </h4>
              </div>
              <span className={`text-[11px] font-semibold mt-2.5 block truncate ${
                isLightMode ? "text-slate-600" : "text-slate-300"
              }`}>
                {item.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className={`border rounded-3xl p-4 sm:p-6 space-y-6 shadow-sm ${
        isLightMode 
          ? "bg-slate-50/90 border-slate-200 text-slate-900" 
          : "bg-slate-900 border-slate-700 text-slate-100"
      }`}>

        {/* ========================================================================= */}
        {/* LESSON 1: GIÁ TRỊ LƯỢNG GIÁC TỪ 0 ĐẾN 180 ĐỘ */}
        {/* ========================================================================= */}
        {activeLesson === 1 && (
          <div className="space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
              isLightMode ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                  isLightMode ? "text-emerald-700" : "text-emerald-400"
                }`}>
                  BÀI 1 • SÁCH KẾT NỐI TRI THỨC
                </span>
                <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                  isLightMode ? "text-slate-900" : "text-white"
                }`}>
                  <Compass className="w-5 h-5 text-emerald-600" />
                  {"Giá Trị Lượng Giác Của Một Góc Từ $0^\\circ$ Đến $180^\\circ$"}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[30, 45, 60, 90, 120, 135, 150].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setB1Angle(deg)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                      b1Angle === deg
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : isLightMode
                          ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls */}
              <div className="lg:col-span-5 space-y-4">
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                  isLightMode ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                    isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                  }`}>
                    {"1. Chọn góc $\\alpha$ trên nửa đường tròn đơn vị"}
                  </span>

                  <div className="space-y-2">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-emerald-900" : "text-emerald-300"
                    }`}>
                      <span>{"Góc $\\alpha$ (độ):"}</span>
                      <span className={`font-mono text-base px-3 py-0.5 rounded-lg border font-black ${
                        isLightMode 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : "bg-emerald-950 border-emerald-700 text-emerald-200"
                      }`}>
                        α = {b1Angle}°
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="1"
                      value={b1Angle}
                      onChange={(e) => setB1Angle(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className={`flex justify-between text-[10px] font-mono font-bold ${
                      isLightMode ? "text-slate-500" : "text-slate-400"
                    }`}>
                      <span>0° (Trục Ox)</span>
                      <span>90° (Góc vuông)</span>
                      <span>180° (Góc bẹt)</span>
                    </div>
                  </div>

                  {/* Point M Coordinates */}
                  <div className={`p-3 rounded-xl border text-xs ${
                    isLightMode ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-700"
                  }`}>
                    <span className="font-bold text-slate-500 block mb-1">Tọa độ điểm biểu diễn $M(x_0, y_0)$:</span>
                    <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                      M({b1Result.cosVal.toFixed(3)}, {b1Result.sinVal.toFixed(3)})
                    </span>
                  </div>
                </div>

                {/* 4 Summary Value Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-emerald-50/90 border-emerald-200" : "bg-emerald-950/70 border-emerald-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-emerald-800" : "text-emerald-300"
                    }`}>
                      {"$\\sin \\alpha$ (Tung độ)"}
                    </span>
                    <span className={`text-lg font-black font-mono ${
                      isLightMode ? "text-emerald-950" : "text-emerald-200"
                    }`}>
                      {b1Result.sinVal.toFixed(4)}
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-indigo-50/90 border-indigo-200" : "bg-indigo-950/70 border-indigo-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-indigo-800" : "text-indigo-300"
                    }`}>
                      {"$\\cos \\alpha$ (Hoành độ)"}
                    </span>
                    <span className={`text-lg font-black font-mono ${
                      isLightMode ? "text-indigo-950" : "text-indigo-200"
                    }`}>
                      {b1Result.cosVal.toFixed(4)}
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-amber-50/90 border-amber-200" : "bg-amber-950/70 border-amber-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-amber-800" : "text-amber-300"
                    }`}>
                      {"$\\tan \\alpha = \\frac{\\sin}{\\cos}$"}
                    </span>
                    <span className={`text-lg font-black font-mono ${
                      isLightMode ? "text-amber-950" : "text-amber-200"
                    }`}>
                      {b1Result.tanVal !== null ? b1Result.tanVal.toFixed(4) : "Không xác định"}
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-rose-50/90 border-rose-200" : "bg-rose-950/70 border-rose-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-rose-800" : "text-rose-300"
                    }`}>
                      {"$\\cot \\alpha = \\frac{\\cos}{\\sin}$"}
                    </span>
                    <span className={`text-lg font-black font-mono ${
                      isLightMode ? "text-rose-950" : "text-rose-200"
                    }`}>
                      {b1Result.cotVal !== null ? b1Result.cotVal.toFixed(4) : "Không xác định"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Canvas & Explanation */}
              <div className="lg:col-span-7 space-y-4">
                {/* SVG Semicircle Canvas */}
                <div className={`p-2 rounded-2xl border shadow-sm ${
                  isLightMode ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700"
                }`}>
                  <svg viewBox="0 0 500 320" className="w-full h-auto select-none">
                    {/* Definitions */}
                    <defs>
                      <marker id="arrow-trig" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill={isLightMode ? "#0f172a" : "#cbd5e1"} />
                      </marker>
                    </defs>

                    {/* Semicircle Area Background */}
                    <path
                      d="M 50 250 A 200 200 0 0 1 450 250 Z"
                      fill={isLightMode ? "rgba(16, 185, 129, 0.06)" : "rgba(16, 185, 129, 0.12)"}
                      stroke={isLightMode ? "#10b981" : "#059669"}
                      strokeWidth="2"
                    />

                    {/* Ox and Oy Axes */}
                    <line x1="20" y1="250" x2="480" y2="250" stroke={isLightMode ? "#0f172a" : "#cbd5e1"} strokeWidth="2" markerEnd="url(#arrow-trig)" />
                    <line x1="250" y1="270" x2="250" y2="30" stroke={isLightMode ? "#0f172a" : "#cbd5e1"} strokeWidth="2" markerEnd="url(#arrow-trig)" />

                    {/* Axis Labels */}
                    <text x="480" y="244" fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="12" fontWeight="bold">x</text>
                    <text x="256" y="26" fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="12" fontWeight="bold">y</text>
                    <text x="238" y="266" fill={isLightMode ? "#0f172a" : "#cbd5e1"} fontSize="11" fontWeight="bold">O</text>

                    {/* Ticks: -1, 0, 1 */}
                    <circle cx="50" cy="250" r="3" fill={isLightMode ? "#0f172a" : "#cbd5e1"} />
                    <text x="50" y="268" fill={isLightMode ? "#475569" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">-1</text>
                    
                    <circle cx="450" cy="250" r="3" fill={isLightMode ? "#0f172a" : "#cbd5e1"} />
                    <text x="450" y="268" fill={isLightMode ? "#475569" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">1</text>
                    
                    <circle cx="250" cy="50" r="3" fill={isLightMode ? "#0f172a" : "#cbd5e1"} />
                    <text x="235" y="54" fill={isLightMode ? "#475569" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="end">1</text>

                    {/* Moving Point M calculations */}
                    {(() => {
                      const R_svg = 200;
                      const originX = 250;
                      const originY = 250;
                      const rad = (b1Angle * Math.PI) / 180;
                      const mx = originX + R_svg * Math.cos(rad);
                      const my = originY - R_svg * Math.sin(rad);

                      return (
                        <>
                          {/* Angle Arc */}
                          <circle cx={originX} cy={originY} r="35" fill="none" stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1.8" strokeDasharray="3 3" />
                          <text x={originX + 25} y={originY - 15} fill={isLightMode ? "#b45309" : "#fbbf24"} fontSize="11" fontWeight="bold">
                            {b1Angle}°
                          </text>

                          {/* Radius OM */}
                          <line x1={originX} y1={originY} x2={mx} y2={my} stroke={isLightMode ? "#0d9488" : "#14b8a6"} strokeWidth="3" />

                          {/* Dashed projections to Ox and Oy */}
                          <line x1={mx} y1={my} x2={mx} y2={originY} stroke={isLightMode ? "#4338ca" : "#818cf8"} strokeWidth="1.5" strokeDasharray="4 4" />
                          <line x1={mx} y1={my} x2={originX} y2={my} stroke={isLightMode ? "#059669" : "#10b981"} strokeWidth="1.5" strokeDasharray="4 4" />

                          {/* Colored segments on axes: cos on Ox, sin on Oy */}
                          <line x1={originX} y1={originY} x2={mx} y2={originY} stroke={isLightMode ? "#4338ca" : "#818cf8"} strokeWidth="4" />
                          <line x1={originX} y1={originY} x2={originX} y2={my} stroke={isLightMode ? "#059669" : "#10b981"} strokeWidth="4" />

                          {/* Point M */}
                          <circle cx={mx} cy={my} r="7" fill={isLightMode ? "#e11d48" : "#f43f5e"} />
                          <text x={mx + (mx >= originX ? 10 : -35)} y={my - 10} fill={isLightMode ? "#9f1239" : "#fb7185"} fontSize="13" fontWeight="bold">
                            M
                          </text>

                          {/* Projected text on axes */}
                          <text x={mx} y={originY + 18} fill={isLightMode ? "#312e81" : "#a5b4fc"} fontSize="10" fontWeight="bold" textAnchor="middle">
                            cos={b1Result.cosVal.toFixed(2)}
                          </text>
                          <text x={originX - 10} y={my + 4} fill={isLightMode ? "#064e3b" : "#6ee7b7"} fontSize="10" fontWeight="bold" textAnchor="end">
                            sin={b1Result.sinVal.toFixed(2)}
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Explanation */}
                {renderSolutionCard(b1Markdown, 1, "Bài 1: Giá trị lượng giác của góc từ 0° đến 180°")}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LESSON 2: ĐỊNH LÝ CÔ-SIN VÀ ĐỊNH LÝ SIN (TAM GIÁC ABC) */}
        {/* ========================================================================= */}
        {activeLesson === 2 && (
          <div className="space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
              isLightMode ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                  isLightMode ? "text-emerald-700" : "text-emerald-400"
                }`}>
                  BÀI 2 • SÁCH KẾT NỐI TRI THỨC
                </span>
                <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                  isLightMode ? "text-slate-900" : "text-white"
                }`}>
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  {"Định Lý Cô-Sin, Định Lý Sin & Giải Tam Giác $ABC$"}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setB2SideB(5); setB2SideC(6); setB2AngleA(60); }}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                    isLightMode 
                      ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300" 
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  Đặt lại tam giác mẫu
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                  isLightMode ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                    isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                  }`}>
                    {"1. Nhập 2 cạnh và góc xen giữa (Định lý Cô-sin)"}
                  </span>

                  {/* Side b */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>Cạnh $b$ ($AC$):</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-slate-900 text-emerald-300 border border-slate-700"
                      }`}>
                        b = {b2SideB}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={b2SideB}
                      onChange={(e) => setB2SideB(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Side c */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>Cạnh $c$ ($AB$):</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-slate-900 text-emerald-300 border border-slate-700"
                      }`}>
                        c = {b2SideC}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={b2SideC}
                      onChange={(e) => setB2SideC(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Angle A */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>{"Góc xen giữa $\\widehat{A}$ (độ):"}</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-900 text-amber-300 border border-slate-700"
                      }`}>
                        A = {b2AngleA}°
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="179"
                      step="1"
                      value={b2AngleA}
                      onChange={(e) => setB2AngleA(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  {/* Visual Toggles */}
                  <div className={`pt-3 border-t space-y-2 text-xs font-bold ${
                    isLightMode ? "border-slate-100 text-slate-700" : "border-slate-700 text-slate-300"
                  }`}>
                    <span className="block font-black text-slate-500 uppercase tracking-wider text-[10px]">Tùy chọn hiển thị hình:</span>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b2ShowCircumcircle}
                          onChange={(e) => setB2ShowCircumcircle(e.target.checked)}
                          className="accent-emerald-600 rounded cursor-pointer"
                        />
                        <span>Đường tròn ngoại tiếp ($R$)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b2ShowHeight}
                          onChange={(e) => setB2ShowHeight(e.target.checked)}
                          className="accent-emerald-600 rounded cursor-pointer"
                        />
                        <span>Đường cao ($h_a$)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4 Result Cards as specified by User */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-cyan-50/90 border-cyan-200" : "bg-slate-800 border-slate-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-cyan-800" : "text-slate-300"
                    }`}>
                      {"Cạnh đối diện $a$ ($BC$):"}
                    </span>
                    <span className={`text-xl font-black font-mono ${
                      isLightMode ? "text-cyan-950" : "text-cyan-300"
                    }`}>
                      {b2Result.sideA.toFixed(2)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-800 border-slate-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-amber-800" : "text-slate-300"
                    }`}>
                      {"Diện tích tam giác ($S$):"}
                    </span>
                    <span className={`text-xl font-black font-mono ${
                      isLightMode ? "text-amber-950" : "text-amber-300"
                    }`}>
                      {b2Result.area.toFixed(2)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-emerald-50/90 border-emerald-200" : "bg-slate-800 border-slate-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-emerald-800" : "text-slate-300"
                    }`}>
                      {"Góc $\\widehat{B}$ & Góc $\\widehat{C}$:"}
                    </span>
                    <span className={`text-sm font-black font-mono ${
                      isLightMode ? "text-emerald-950" : "text-emerald-300"
                    }`}>
                      B = {b2Result.angleB_deg.toFixed(1)}°, C = {b2Result.angleC_deg.toFixed(1)}°
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-rose-50/90 border-rose-200" : "bg-slate-800 border-slate-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-rose-800" : "text-slate-300"
                    }`}>
                      {"Bán kính ngoại tiếp $R$:"}
                    </span>
                    <span className={`text-xl font-black font-mono ${
                      isLightMode ? "text-rose-950" : "text-rose-300"
                    }`}>
                      {b2Result.R.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Core formula summary */}
                <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                  isLightMode ? "bg-emerald-50/60 border-emerald-200 text-slate-800" : "bg-slate-950 border-slate-800 text-slate-300"
                }`}>
                  <p className="text-emerald-600 font-bold">💡 Công thức áp dụng cốt lõi:</p>
                  <p>{"• Định lý Cô-sin: $a^2 = b^2 + c^2 - 2bc \\cos A$"}</p>
                  <p>{"• Diện tích: $S = \\frac{1}{2}bc \\sin A$ | Định lý Sin: $\\frac{a}{\\sin A} = 2R$"}</p>
                </div>
              </div>

              {/* Canvas & Explanation */}
              <div className="lg:col-span-7 space-y-4">
                {/* SVG Triangle Graphic */}
                <div className={`p-2 rounded-2xl border shadow-sm ${
                  isLightMode ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700"
                }`}>
                  <svg viewBox="0 0 500 320" className="w-full h-auto select-none">
                    {(() => {
                      // Place B at origin (0, 0), C at (a, 0), and A at (c*cosB, c*sinB)
                      const a = b2Result.sideA;
                      const c = b2SideC;
                      const b = b2SideB;
                      const B_rad = (b2Result.angleB_deg * Math.PI) / 180;

                      // Scaled coordinates
                      const padX = 70;
                      const padY = 50;
                      const drawWidth = 360;
                      const drawHeight = 220;

                      // Max dimensions
                      const ax_raw = c * Math.cos(B_rad);
                      const ay_raw = c * Math.sin(B_rad);

                      const minX = Math.min(0, ax_raw, a);
                      const maxX = Math.max(0, ax_raw, a);
                      const maxY = ay_raw;

                      const spanX = maxX - minX || 1;
                      const spanY = maxY || 1;

                      const scale = Math.min(drawWidth / spanX, drawHeight / spanY);

                      // SVG coordinates
                      const bx = padX + (0 - minX) * scale;
                      const by = 270;

                      const cx = padX + (a - minX) * scale;
                      const cy = 270;

                      const ax = padX + (ax_raw - minX) * scale;
                      const ay = 270 - ay_raw * scale;

                      // Height H on BC
                      const hx = ax;
                      const hy = by;

                      return (
                        <>
                          {/* Circumcircle if toggled */}
                          {b2ShowCircumcircle && b2Result.R > 0 && (
                            <circle
                              cx={(bx + cx) / 2}
                              cy={by - b2Result.R * scale * 0.4}
                              r={Math.min(b2Result.R * scale, 130)}
                              fill="none"
                              stroke={isLightMode ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.3)"}
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                          )}

                          {/* Height AH */}
                          {b2ShowHeight && (
                            <>
                              <line x1={ax} y1={ay} x2={hx} y2={hy} stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1.8" strokeDasharray="3 3" />
                              <rect x={hx - 8} y={hy - 8} width="8" height="8" fill="none" stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1" />
                              <text x={hx} y={hy + 16} fill={isLightMode ? "#b45309" : "#fbbf24"} fontSize="10" fontWeight="bold" textAnchor="middle">H</text>
                            </>
                          )}

                          {/* Triangle ABC */}
                          <polygon
                            points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
                            fill={isLightMode ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.18)"}
                            stroke={isLightMode ? "#059669" : "#10b981"}
                            strokeWidth="3"
                          />

                          {/* Vertices */}
                          <circle cx={ax} cy={ay} r="6" fill={isLightMode ? "#e11d48" : "#f43f5e"} />
                          <text x={ax} y={ay - 12} fill={isLightMode ? "#9f1239" : "#fb7185"} fontSize="13" fontWeight="bold" textAnchor="middle">
                            A ({b2AngleA}°)
                          </text>

                          <circle cx={bx} cy={by} r="6" fill={isLightMode ? "#2563eb" : "#3b82f6"} />
                          <text x={bx - 14} y={by + 16} fill={isLightMode ? "#1e3a8a" : "#60a5fa"} fontSize="13" fontWeight="bold">
                            B ({b2Result.angleB_deg.toFixed(0)}°)
                          </text>

                          <circle cx={cx} cy={cy} r="6" fill={isLightMode ? "#0d9488" : "#14b8a6"} />
                          <text x={cx + 10} y={by + 16} fill={isLightMode ? "#064e3b" : "#2dd4bf"} fontSize="13" fontWeight="bold">
                            C ({b2Result.angleC_deg.toFixed(0)}°)
                          </text>

                          {/* Side Labels */}
                          <text x={(bx + cx) / 2} y={by + 18} fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="12" fontWeight="bold" textAnchor="middle">
                            a = {b2Result.sideA.toFixed(2)}
                          </text>
                          <text x={(ax + cx) / 2 + 15} y={(ay + cy) / 2} fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="12" fontWeight="bold">
                            b = {b2SideB}
                          </text>
                          <text x={(ax + bx) / 2 - 25} y={(ay + by) / 2} fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="12" fontWeight="bold">
                            c = {b2SideC}
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Explanation */}
                {renderSolutionCard(b2Markdown, 2, "Bài 2: Định lý cô-sin & Định lý sin trong tam giác ABC")}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LESSON 3: GIẢI TAM GIÁC & ỨNG DỤNG THỰC TẾ (ĐO CHIỀU CAO & KHOẢNG CÁCH) */}
        {/* ========================================================================= */}
        {activeLesson === 3 && (
          <div className="space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
              isLightMode ? "border-slate-200" : "border-slate-800"
            }`}>
              <div>
                <span className={`text-xs font-black uppercase tracking-widest ${
                  isLightMode ? "text-emerald-700" : "text-emerald-400"
                }`}>
                  BÀI 3 • SÁCH KẾT NỐI TRI THỨC
                </span>
                <h3 className={`text-lg font-black flex items-center gap-2 mt-0.5 ${
                  isLightMode ? "text-slate-900" : "text-white"
                }`}>
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  {"Giải Tam Giác & Ứng Dụng Thực Tế (Đo Khoảng Cách, Chiều Cao Tháp)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setAppDistance(20); setAppAngleAlpha(45); setAppAngleBeta(32); setAppInstrumentHeight(1.3); }}
                className={`px-3 py-1.5 text-xs font-black rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                  isLightMode 
                    ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300" 
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
              >
                Đặt lại thông số mẫu
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs ${
                  isLightMode ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider block border-b pb-2 ${
                    isLightMode ? "text-slate-900 border-slate-100" : "text-slate-100 border-slate-700"
                  }`}>
                    1. Nhập thông số thực địa đo ngọn tháp
                  </span>

                  {/* Distance d = AB */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>Khoảng cách hai mốc ngắm $d = AB$ (m):</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-slate-900 text-emerald-300 border border-slate-700"
                      }`}>
                        d = {appDistance} m
                      </span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={appDistance}
                      onChange={(e) => setAppDistance(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Angle Alpha */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>{"Góc ngắm tại điểm gần $A$ ($\\alpha$):"}</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-indigo-50 text-indigo-900 border border-indigo-200" : "bg-slate-900 text-indigo-300 border border-slate-700"
                      }`}>
                        α = {appAngleAlpha}°
                      </span>
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="75"
                      step="1"
                      value={appAngleAlpha}
                      onChange={(e) => {
                        const newAlpha = Number(e.target.value);
                        setAppAngleAlpha(newAlpha);
                        if (appAngleBeta >= newAlpha) setAppAngleBeta(newAlpha - 5);
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Angle Beta */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>{"Góc ngắm tại điểm xa $B$ ($\\beta$):"}</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-900 text-amber-300 border border-slate-700"
                      }`}>
                        β = {appAngleBeta}°
                      </span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max={appAngleAlpha - 2}
                      step="1"
                      value={appAngleBeta}
                      onChange={(e) => setAppAngleBeta(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>

                  {/* Instrument height */}
                  <div className="space-y-1">
                    <label className={`text-xs font-black flex items-center justify-between ${
                      isLightMode ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <span>Chiều cao giác kế ($h_0$):</span>
                      <span className={`font-mono px-2 py-0.5 rounded font-bold ${
                        isLightMode ? "bg-rose-50 text-rose-900 border border-rose-200" : "bg-slate-900 text-rose-300 border border-slate-700"
                      }`}>
                        h_0 = {appInstrumentHeight} m
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.1"
                      value={appInstrumentHeight}
                      onChange={(e) => setAppInstrumentHeight(Number(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Practical Result Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-emerald-50/90 border-emerald-200" : "bg-emerald-950/70 border-emerald-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-emerald-800" : "text-emerald-300"
                    }`}>
                      Chiều cao ngọn tháp ($h$):
                    </span>
                    <span className={`text-2xl font-black font-mono ${
                      isLightMode ? "text-emerald-950" : "text-white"
                    }`}>
                      {b3Result.totalHeight.toFixed(2)} m
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl border shadow-xs ${
                    isLightMode ? "bg-indigo-50/90 border-indigo-200" : "bg-indigo-950/70 border-indigo-700"
                  }`}>
                    <span className={`text-xs font-black uppercase block mb-1 ${
                      isLightMode ? "text-indigo-800" : "text-indigo-300"
                    }`}>
                      Khoảng cách đến chân ($AH$):
                    </span>
                    <span className={`text-xl font-black font-mono ${
                      isLightMode ? "text-indigo-950" : "text-indigo-200"
                    }`}>
                      {b3Result.distFromA.toFixed(2)} m
                    </span>
                  </div>
                </div>
              </div>

              {/* Canvas & Explanation */}
              <div className="lg:col-span-7 space-y-4">
                {/* SVG Real-World Scheme Canvas */}
                <div className={`p-2 rounded-2xl border shadow-sm ${
                  isLightMode ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700"
                }`}>
                  <svg viewBox="0 0 500 320" className="w-full h-auto select-none">
                    {/* Ground line */}
                    <line x1="30" y1="270" x2="470" y2="270" stroke={isLightMode ? "#334155" : "#64748b"} strokeWidth="3" />

                    {/* Tower C at x=410 */}
                    <rect x="400" y="60" width="20" height="210" fill={isLightMode ? "#cbd5e1" : "#334155"} stroke={isLightMode ? "#475569" : "#94a3b8"} strokeWidth="2" />
                    {/* Tower antenna */}
                    <line x1="410" y1="30" x2="410" y2="60" stroke={isLightMode ? "#e11d48" : "#f43f5e"} strokeWidth="3" />
                    <circle cx="410" cy="30" r="4" fill={isLightMode ? "#e11d48" : "#f43f5e"} />
                    <text x="425" y="34" fill={isLightMode ? "#9f1239" : "#fb7185"} fontSize="13" fontWeight="bold">C (Đỉnh tháp)</text>
                    <text x="425" y="275" fill={isLightMode ? "#334155" : "#cbd5e1"} fontSize="11" fontWeight="bold">H (Chân tháp)</text>

                    {/* Observation Points A and B */}
                    {/* Instrument height line */}
                    <line x1="70" y1="240" x2="410" y2="240" stroke={isLightMode ? "#94a3b8" : "#475569"} strokeWidth="1.2" strokeDasharray="3 3" />
                    <text x="425" y="244" fill={isLightMode ? "#64748b" : "#94a3b8"} fontSize="10">H'</text>

                    {/* Point B (Farther) at x=90 */}
                    <rect x="85" y="240" width="10" height="30" fill={isLightMode ? "#f59e0b" : "#d97706"} />
                    <circle cx="90" cy="240" r="4" fill={isLightMode ? "#d97706" : "#fbbf24"} />
                    <text x="90" y="290" fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="11" fontWeight="bold" textAnchor="middle">B</text>

                    {/* Point A (Closer) at x=230 */}
                    <rect x="225" y="240" width="10" height="30" fill={isLightMode ? "#4338ca" : "#6366f1"} />
                    <circle cx="230" cy="240" r="4" fill={isLightMode ? "#4338ca" : "#818cf8"} />
                    <text x="230" y="290" fill={isLightMode ? "#0f172a" : "#f8fafc"} fontSize="11" fontWeight="bold" textAnchor="middle">A</text>

                    {/* Line of sight from B to C */}
                    <line x1="90" y1="240" x2="410" y2="30" stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="2.5" />
                    {/* Line of sight from A to C */}
                    <line x1="230" y1="240" x2="410" y2="30" stroke={isLightMode ? "#4338ca" : "#818cf8"} strokeWidth="2.5" />

                    {/* Angle beta arc at B */}
                    <circle cx="90" cy="240" r="28" fill="none" stroke={isLightMode ? "#d97706" : "#f59e0b"} strokeWidth="1.5" strokeDasharray="2 2" />
                    <text x="125" y="235" fill={isLightMode ? "#b45309" : "#fbbf24"} fontSize="10" fontWeight="bold">β={appAngleBeta}°</text>

                    {/* Angle alpha arc at A */}
                    <circle cx="230" cy="240" r="28" fill="none" stroke={isLightMode ? "#4338ca" : "#818cf8"} strokeWidth="1.5" strokeDasharray="2 2" />
                    <text x="265" y="230" fill={isLightMode ? "#312e81" : "#a5b4fc"} fontSize="10" fontWeight="bold">α={appAngleAlpha}°</text>

                    {/* Dimension line AB = d */}
                    <line x1="90" y1="305" x2="230" y2="305" stroke={isLightMode ? "#059669" : "#10b981"} strokeWidth="2" />
                    <text x="160" y="300" fill={isLightMode ? "#064e3b" : "#34d399"} fontSize="11" fontWeight="bold" textAnchor="middle">
                      d = {appDistance} m
                    </text>

                    {/* Total Height Label */}
                    <line x1="450" y1="30" x2="450" y2="270" stroke={isLightMode ? "#e11d48" : "#f43f5e"} strokeWidth="2" strokeDasharray="4 4" />
                    <text x="460" y="150" fill={isLightMode ? "#9f1239" : "#fb7185"} fontSize="12" fontWeight="bold">
                      h ≈ {b3Result.totalHeight.toFixed(1)} m
                    </text>
                  </svg>
                </div>

                {/* Explanation */}
                {renderSolutionCard(b3Markdown, 3, "Bài 3: Ứng dụng thực tế đo chiều cao tháp & khoảng cách")}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
