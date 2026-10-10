import React, { useState } from "react";
import { generateBbtSvg, BBTData, cleanMathText } from "../../lib/bbtRenderer";
import { Copy, Check } from "lucide-react";

export interface VariationTablePoint {
  x: string;               // LaTeX string e.g. "-\\infty", "1", "2", "+\\infty"
  yPrime?: string;         // "+", "-", "0", or "||"
  yVal?: string;           // value of y e.g. "-\\infty", "4", "+\\infty"
  yPosition?: "top" | "bottom" | "middle"; // where to place in row y
  isDiscontinuity?: boolean; // double bar for both y' and y
  yLeftVal?: string;       // for vertical asymptote e.g. "-\\infty" on left
  yRightVal?: string;      // for vertical asymptote e.g. "+\\infty" on right
}

export interface VariationInterval {
  trend: "increasing" | "decreasing" | "none";
  fromVal?: string;
  toVal?: string;
  sign?: "+" | "-" | "";
}

interface VariationTableProps {
  title?: string;
  points: VariationTablePoint[]; // points along the x-axis
  intervals: VariationInterval[]; // intervals between points
  showDerivative?: boolean;       // false for Grade 10 Parabola (2 rows), true for Grade 11/12 (3 rows)
  className?: string;
}

export const VariationTable: React.FC<VariationTableProps> = ({
  title,
  points,
  intervals,
  showDerivative = true,
  className = ""
}) => {
  const [copiedTikz, setCopiedTikz] = useState(false);

  const bbtData: BBTData = {
    functionName: '',
    showDerivative,
    points: points.map(pt => ({
      x: pt.x,
      yPrime: showDerivative ? pt.yPrime : undefined,
      isAsymptote: pt.isDiscontinuity,
      yVal: pt.yVal,
      yPosition: pt.yPosition,
      yLeftVal: pt.yLeftVal,
      yRightVal: pt.yRightVal,
      yLeftPosition: pt.yLeftVal?.includes('-') ? 'bottom' : 'top',
      yRightPosition: pt.yRightVal?.includes('+') ? 'top' : 'bottom'
    })),
    intervals: intervals.map(inter => ({
      sign: showDerivative ? (inter.sign || (inter.trend === 'decreasing' ? '-' : '+')) : '',
      trend: inter.trend
    }))
  };

  const svgHtml = generateBbtSvg(bbtData);

  const handleCopyTikz = () => {
    const xList = points.map(p => cleanMathText(p.x)).join(", ");
    const lineSigns = intervals.map(it => `,${it.sign || (it.trend === 'decreasing' ? '-' : '+')},0`).join("") + ",";
    const vars = points.map(p => {
      const sign = p.yPosition === "top" ? "+/" : p.yPosition === "bottom" ? "-/" : "+/";
      return `${sign} ${cleanMathText(p.yVal || "0")}`;
    }).join(", ");

    const tikz = `\\begin{tikzpicture}\n\\tkzTabInit[lgt=1.5,espcl=2.5]{$x$/1, $y'$/1, $y$/2.2}{${xList}}\n\\tkzTabLine{${lineSigns}}\n\\tkzTabVar{${vars}}\n\\end{tikzpicture}`;
    navigator.clipboard.writeText(tikz);
    setCopiedTikz(true);
    setTimeout(() => setCopiedTikz(false), 2000);
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-2 sm:p-3 shadow-xs overflow-x-auto ${className}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        {title ? (
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{title}</span>
          </div>
        ) : <div />}

        <button
          onClick={handleCopyTikz}
          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          title="Sao chép mã TikZ (tkz-tab) Bảng biến thiên"
        >
          {copiedTikz ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-700 font-extrabold">Đã chép TikZ!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-purple-600" />
              <span>Copy TikZ</span>
            </>
          )}
        </button>
      </div>

      {/* BBT SGK Standard Vector SVG */}
      <div className="w-full flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svgHtml }} />
    </div>
  );
};
