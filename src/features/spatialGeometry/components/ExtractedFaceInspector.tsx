import React from 'react';
import { 
  X, Scissors, Calculator, Compass, Sparkles, CheckCircle2, 
  Info, CornerDownRight, Maximize2 
} from 'lucide-react';
import { ExtractedPolygon, Point2D } from '../types/geometry.types';
import { MathView } from '../../../components/MathView';

interface ExtractedFaceInspectorProps {
  polygon: ExtractedPolygon | null;
  onClose: () => void;
  selectedVertexNames: string[];
  onClearSelectedVertices: () => void;
}

export const ExtractedFaceInspector: React.FC<ExtractedFaceInspectorProps> = ({
  polygon,
  onClose,
  selectedVertexNames,
  onClearSelectedVertices
}) => {
  if (!polygon) {
    return (
      <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 text-white p-4 flex flex-col justify-between shrink-0 shadow-2xl z-20">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-emerald-400" />
              Bóc tách Mặt phẳng 2D (Inspector)
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-xs space-y-3 text-slate-300">
            <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Cách bóc tách mặt phẳng 3D sang 2D:
            </p>
            <ol className="list-decimal pl-4 space-y-2 text-slate-300 leading-relaxed">
              <li>Click liên tiếp vào các đỉnh 3D trên mô hình (ví dụ: $S \to A \to B$).</li>
              <li>Các đỉnh đang chọn: <span className="font-mono font-bold text-amber-400">{selectedVertexNames.join(' → ') || 'Chưa chọn'}</span></li>
              <li>Sau khi chọn từ 3 đỉnh trở lên, mặt phẳng 2D phẳng $100\%$ sẽ được chiếu xoay về canvas 2D bên dưới.</li>
            </ol>
            {selectedVertexNames.length > 0 && (
              <button
                type="button"
                onClick={onClearSelectedVertices}
                className="mt-2 w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Xóa các đỉnh đang chọn ({selectedVertexNames.length})
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 text-center leading-relaxed">
          Sử dụng thuật toán trực chuẩn Gram-Schmidt bảo toàn $100\%$ khoảng cách Euclid & độ lớn góc thực.
        </div>
      </aside>
    );
  }

  // Calculate SVG viewport bounds for 2D points
  const points = polygon.vertices2D;
  const uVals = points.map(p => p.u);
  const vVals = points.map(p => p.v);

  const minU = Math.min(...uVals);
  const maxU = Math.max(...uVals);
  const minV = Math.min(...vVals);
  const maxV = Math.max(...vVals);

  const widthU = Math.max(1, maxU - minU);
  const heightV = Math.max(1, maxV - minV);

  const padding = 40;
  const svgWidth = 320;
  const svgHeight = 240;

  const scaleU = (svgWidth - 2 * padding) / widthU;
  const scaleV = (svgHeight - 2 * padding) / heightV;
  const scale = Math.min(scaleU, scaleV);

  // Transform (u, v) to SVG (x, y) coordinates
  const toSvgX = (u: number) => padding + (u - minU) * scale + (svgWidth - 2 * padding - widthU * scale) / 2;
  const toSvgY = (v: number) => svgHeight - (padding + (v - minV) * scale + (svgHeight - 2 * padding - heightV * scale) / 2);

  const svgPath = points.map((p, idx) => {
    const x = toSvgX(p.u);
    const y = toSvgY(p.v);
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ' Z';

  return (
    <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 text-white p-4 flex flex-col justify-between shrink-0 shadow-2xl z-20 overflow-y-auto">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
              {polygon.shapeType}
            </span>
            <h3 className="text-base font-bold text-white mt-1">
              Mặt {polygon.name} (Phẳng 100%)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2D SVG Canvas Display */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative shadow-inner">
          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            {/* Grid Pattern Background */}
            <defs>
              <pattern id="grid2d" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#grid2d)" rx="12" />

            {/* Polygon Shape */}
            <path
              d={svgPath}
              fill="rgba(16, 185, 129, 0.15)"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Right Angle Symbols */}
            {polygon.angles.filter(a => a.isRightAngle).map((a, idx) => {
              const vertexP = points.find(p => p.name === a.vertexName);
              if (!vertexP) return null;
              const vx = toSvgX(vertexP.u);
              const vy = toSvgY(vertexP.v);
              return (
                <rect
                  key={idx}
                  x={vx - 6}
                  y={vy - 6}
                  width="12"
                  height="12"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Vertex Nodes & Labels */}
            {points.map((p, idx) => {
              const x = toSvgX(p.u);
              const y = toSvgY(p.v);
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={x + 10}
                    y={y - 10}
                    fill="#38bdf8"
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            Tỉ lệ thực 1:1
          </div>
        </div>

        {/* Calculated Geometric Measurements */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-0.5">
            <span className="text-[11px] text-slate-400">Diện tích thực $S$:</span>
            <p className="text-sm font-extrabold text-emerald-400">{polygon.area} đvdt</p>
          </div>

          <div className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-0.5">
            <span className="text-[11px] text-slate-400">Chu vi thực $P$:</span>
            <p className="text-sm font-extrabold text-sky-400">{polygon.perimeter} đvđd</p>
          </div>
        </div>

        {/* Detailed Side Measurements */}
        <div className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-2 text-xs">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Độ dài các cạnh thực tế:</span>
          </h4>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
            {polygon.edges.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900/70 px-2 py-1 rounded">
                <span>{e.fromName}{e.toName}:</span>
                <span className="font-bold text-emerald-300">{e.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Angle Measurements */}
        <div className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl space-y-2 text-xs">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Số đo các góc trong:</span>
          </h4>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-300">
            {polygon.angles.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900/70 px-2 py-1 rounded">
                <span>Góc {a.vertexName}:</span>
                <span className={`font-bold ${a.isRightAngle ? 'text-amber-400' : 'text-slate-200'}`}>
                  {a.degrees}° {a.isRightAngle && '⦜'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Clear/New Extraction button */}
      <button
        type="button"
        onClick={onClearSelectedVertices}
        className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
      >
        Bóc tách mặt khác
      </button>

    </aside>
  );
};
