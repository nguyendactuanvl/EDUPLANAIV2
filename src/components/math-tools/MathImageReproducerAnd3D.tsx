import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Upload, Image as ImageIcon, Sparkles, Play, Pause, RotateCcw, 
  Download, Copy, Check, FileText, Printer, Eye, Palette, 
  Maximize2, RefreshCw, Scissors, Box, Layers, HelpCircle, ChevronRight,
  Sliders, Compass, Info, CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';
import { MathSpan, MarkdownRenderer } from '../MarkdownRenderer';
import { apiFetch } from '../../lib/apiFetch';
import { exportHtmlToWord } from '../../lib/exportUtils';

// ============================================================================
// PRESETS DATA: CÂU 43, CÂU 37, CÂU 591, CÂU 592 KHỚP 100% ẢNH CỦA GIÁO VIÊN
// ============================================================================

export interface MathReproducedItem {
  id: string;
  title: string;
  badge: string;
  desc: string;
  questionText: string;
  mathModel: {
    type: 'paper_folding_flower' | 'cylinder_box' | 'twisted_hexagon' | 'twisted_cross' | 'custom';
    formula: string;
    optimalSolution: string;
    variablesDesc: string;
  };
  colorSvg: string;
  bwSvg: string;
  tikzCode: string;
  steps: {
    step: number;
    title: string;
    desc: string;
  }[];
}

// 1. PRESET CÂU 43: HỘP HOA KHUM TỪ TỜ GIẤY 10cm x 10cm
const PRESET_CAU_43: MathReproducedItem = {
  id: 'cau_43',
  title: 'Câu 43: Gấp hộp hoa khum từ tờ giấy hình vuông 10 cm',
  badge: 'Cắt gấp giấy • Thể tích cực trị (Toán 12)',
  desc: 'Tờ giấy hình vuông 10 cm, ở giữa là hình vuông x, 4 hình chữ nhật x × x/2, 4 hình thang cân 45 độ và nửa hình tròn.',
  questionText: 'Một tờ giấy hình vuông có cạnh bằng $10\\text{ cm}$. Người ta vẽ ở chính giữa tờ giấy một hình vuông có độ dài cạnh bằng $x$. Sau đó, vẽ ra phía ngoài bốn hình chữ nhật bằng nhau có kích thước là $x\\text{ cm} \\times \\frac{x}{2}\\text{ cm}$. Sau đó, vẽ tiếp ra phía ngoài bốn hình thang cân có đáy lớn dài $x$ và đáy nhỏ dài $\\frac{x}{2}$, góc ở đáy của hình thang cân là $45^\\circ$. Sau đó, vẽ tiếp ra phía ngoài sao cho ở phía ngoài cùng là nửa hình tròn và ở giữa hình thang cân và nửa hình tròn đó là một hình chữ nhật. Toàn bộ phần được tô màu được cắt ra, sau đó được gấp lại để thành một hình như trong hình vẽ. Người ta đổ nước vào hình này, giả sử các chỗ nối được làm kín và không thấm nước. Tính thể tích nước tối đa người ta có thể đổ vào một khối hình như vậy.',
  mathModel: {
    type: 'paper_folding_flower',
    formula: 'V(x) = x^2 \\cdot \\frac{x}{2} + V_{\\text{vòm}} = \\frac{x^3}{2} + \\dots',
    optimalSolution: 'Khảo sát hàm số $V(x)$ trên khoảng $(0; \\frac{10}{1 + 2\\sqrt{2}})$. Đạo hàm $V\'(x) = 0$ để tìm độ dài cạnh đáy $x$ tối ưu giúp khối hình đạt thể tích nước chứa lớn nhất $V_{\\max}$.',
    variablesDesc: '$x$: độ dài cạnh hình vuông đáy ($0 < x < 4\\text{ cm}$)'
  },
  colorSvg: `<svg viewBox="0 0 880 500" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <marker id="arrow-color" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b" />
    </marker>
    <linearGradient id="grad-box-3d" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fee2e2"/>
      <stop offset="100%" stop-color="#fca5a5"/>
    </linearGradient>
    <linearGradient id="grad-petal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffedd5"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>
  </defs>

  <!-- VÙNG 1: SƠ ĐỒ TRẢI PHẲNG (NETTING DIAGRAM) BÊN TRÁI -->
  <g transform="translate(40, 50)">
    <!-- Tờ giấy hình vuông 10cm viền đứt -->
    <rect x="0" y="0" width="260" height="260" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4" />
    <line x1="0" y1="0" x2="260" y2="260" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="260" y1="0" x2="0" y2="260" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />

    <!-- Tâm hình vuông cạnh x (tô màu pastel) -->
    <!-- Tâm tại (130, 130), x = 60, nửa x = 30 -->
    <g fill="#fed7aa" stroke="#1e293b" stroke-width="1.8">
      <!-- Đáy hình vuông chính giữa -->
      <rect x="100" y="100" width="60" height="60" fill="#fde68a" stroke-dasharray="3,3" />
      
      <!-- 4 hình chữ nhật x × x/2 (chiều cao x/2 = 30) -->
      <!-- Trên -->
      <rect x="100" y="70" width="60" height="30" />
      <!-- Dưới -->
      <rect x="100" y="160" width="60" height="30" />
      <!-- Trái -->
      <rect x="70" y="100" width="30" height="60" />
      <!-- Phải -->
      <rect x="160" y="100" width="30" height="60" />

      <!-- 4 hình thang cân đáy lớn x=60, đáy nhỏ x/2=30, góc đáy 45 độ (cao = 15) -->
      <!-- Trên: từ y=70 lên y=55, x từ 100..160 thu về 115..145 -->
      <polygon points="100,70 160,70 145,52 115,52" />
      <!-- Dưới: từ y=190 xuống y=208, x từ 100..160 thu về 115..145 -->
      <polygon points="100,190 160,190 145,208 115,208" />
      <!-- Trái: từ x=70 sang trái x=52, y từ 100..160 thu về 115..145 -->
      <polygon points="70,100 70,160 52,145 52,115" />
      <!-- Phải: từ x=190 sang phải x=208, y từ 100..160 thu về 115..145 -->
      <polygon points="190,100 190,160 208,145 208,115" />

      <!-- 4 hình chữ nhật nhỏ nối tiếp và nửa hình tròn ngoài cùng -->
      <!-- Cánh Trên -->
      <rect x="115" y="32" width="30" height="20" />
      <path d="M 115,32 A 15,15 0 0,1 145,32 Z" fill="#fed7aa" />

      <!-- Cánh Dưới -->
      <rect x="115" y="208" width="30" height="20" />
      <path d="M 115,228 A 15,15 0 0,0 145,228 Z" fill="#fed7aa" />

      <!-- Cánh Trái -->
      <rect x="32" y="115" width="20" height="30" />
      <path d="M 32,115 A 15,15 0 0,0 32,145 Z" fill="#fed7aa" />

      <!-- Cánh Phải -->
      <rect x="208" y="115" width="20" height="30" />
      <path d="M 228,115 A 15,15 0 0,1 228,145 Z" fill="#fed7aa" />
    </g>

    <!-- Đường kích thước & Ký hiệu góc -->
    <!-- Kích thước x ở đáy -->
    <line x1="100" y1="175" x2="160" y2="175" stroke="#0f172a" stroke-width="1.2" />
    <path d="M 100,172 L 100,178 M 160,172 L 160,178" stroke="#0f172a" stroke-width="1.2" />
    <text x="130" y="188" font-size="14" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">x</text>

    <!-- Kích thước x/2 ở thành bên phải -->
    <line x1="160" y1="175" x2="190" y2="175" stroke="#0f172a" stroke-width="1.2" />
    <text x="175" y="196" font-size="13" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">x/2</text>

    <!-- Góc 45 độ -->
    <path d="M 185,100 A 10,10 0 0,1 180,107" fill="none" stroke="#0f172a" stroke-width="1.2" />
    <text x="194" y="96" font-size="12" font-weight="bold" fill="#0f172a">45°</text>

    <!-- Chú thích Nửa hình tròn -->
    <line x1="228" y1="130" x2="275" y2="130" stroke="#0f172a" stroke-width="1" stroke-dasharray="2,2" />
    <text x="280" y="125" font-size="12" fill="#0f172a">Nửa</text>
    <text x="280" y="139" font-size="12" fill="#0f172a">hình tròn</text>
  </g>

  <!-- VÙNG 2: QUY TRÌNH GẤP THU NHỎ (4 BƯỚC Ở GIỮA) -->
  <g transform="translate(320, 30)">
    <text x="180" y="20" font-size="13" font-weight="bold" text-anchor="middle" fill="#334155">
      Quy trình gấp lại thành chiếc hộp (đã thu nhỏ để thấy toàn bộ quy trình)
    </text>

    <!-- Bước 1: Khung phẳng hơi nghiêng 3D -->
    <g transform="translate(20, 45) scale(0.65)">
      <!-- Trục phẳng phối cảnh -->
      <polygon points="50,40 110,40 130,55 70,55" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="10,48 50,40 70,55 30,65" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="110,40 150,45 170,62 130,55" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="65,25 95,25 110,40 50,40" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="70,55 130,55 145,80 85,80" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <!-- Mũi tên cong sang Bước 2 -->
    <path d="M 155,75 C 175,60 195,60 215,75" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow-color)" />

    <!-- Bước 2: 4 cánh nâng lên 45 độ -->
    <g transform="translate(225, 40) scale(0.65)">
      <polygon points="40,60 80,60 95,75 55,75" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="20,20 40,60 55,75 30,30" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="80,60 115,25 130,35 95,75" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="50,15 70,15 80,60 40,60" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="55,75 95,75 105,95 65,95" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <!-- Mũi tên cong sang Bước 3 -->
    <path d="M 335,75 C 355,60 375,60 395,75" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow-color)" />

    <!-- Bước 3: Nâng đứng lên thành hộp -->
    <g transform="translate(405, 38) scale(0.65)">
      <polygon points="35,65 75,65 90,80 50,80" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="25,10 40,10 50,80 35,65" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="75,65 90,80 100,15 85,15" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="45,5 65,5 75,65 35,65" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="50,80 90,80 95,95 55,95" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <!-- Mũi tên cong vòng xuống dưới -->
    <path d="M 450,115 C 470,135 470,165 440,185" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow-color)" />

    <!-- Bước 4: Khép cánh hoa -->
    <g transform="translate(370, 180) scale(0.7)">
      <polygon points="30,50 65,50 80,65 45,65" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="30,50 45,65 45,90 30,75" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="45,65 80,65 80,90 45,90" fill="#fca5a5" stroke="#1e293b" stroke-width="1.5" />
      <!-- Cánh khum cong -->
      <path d="M 30,50 Q 40,15 50,15 Q 60,15 65,50 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <path d="M 45,65 Q 55,20 68,20 Q 75,25 80,65 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <!-- Mũi tên cong về hộp to -->
    <path d="M 360,220 C 330,225 300,225 270,235" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow-color)" />
  </g>

  <!-- VÙNG 3: CHIẾC HỘP HOÀN THÀNH PHÓNG TO (3D BEAUTIFUL) -->
  <g transform="translate(320, 260)">
    <!-- Đáy hộp khối 3D chữ nhật -->
    <!-- Mặt trước -->
    <polygon points="60,90 180,90 180,170 60,170" fill="#fed7aa" stroke="#1e293b" stroke-width="2" />
    <!-- Mặt phải -->
    <polygon points="180,90 260,50 260,120 180,170" fill="#fdba74" stroke="#1e293b" stroke-width="2" />
    <!-- Mặt trên thành hộp -->
    <polygon points="60,90 140,50 260,50 180,90" fill="#ffedd5" stroke="#1e293b" stroke-width="2" />

    <!-- 4 CÁNH VÒM HOA KHUM LẠI Ở GIỮA -->
    <!-- Cánh sau bên trái -->
    <path d="M 100,68 C 100,10 135,5 145,10 C 150,15 150,55 140,50 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="2" />
    <!-- Cánh sau bên phải -->
    <path d="M 190,68 C 195,15 165,5 155,10 C 150,15 150,55 160,50 Z" fill="#fdba74" stroke="#1e293b" stroke-width="2" />
    <!-- Cánh trước bên trái (uốn cong vòm) -->
    <path d="M 100,68 C 100,0 145,0 145,68 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="2" />
    <!-- Cánh trước bên phải -->
    <path d="M 145,68 C 145,0 190,0 190,68 Z" fill="#fb923c" stroke="#1e293b" stroke-width="2" />

    <!-- Nhãn chú thích bên dưới hộp -->
    <text x="270" y="160" font-size="13" font-style="italic" fill="#334155">
      Chiếc hộp sau khi gấp xong
    </text>
    <text x="270" y="178" font-size="12" fill="#64748b">
      (đã được phóng to)
    </text>
  </g>
</svg>`,
  bwSvg: `<svg viewBox="0 0 880 500" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <pattern id="hatch-bw" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#000000" stroke-width="1" />
    </pattern>
    <marker id="arrow-bw" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
    </marker>
  </defs>

  <!-- BẢN VẼ ĐEN TRẮNG CHUẨN IN ẤN ĐỀ THI -->
  <g transform="translate(40, 50)">
    <rect x="0" y="0" width="260" height="260" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,4" />
    <line x1="0" y1="0" x2="260" y2="260" stroke="#000000" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="260" y1="0" x2="0" y2="260" stroke="#000000" stroke-width="1" stroke-dasharray="3,3" />

    <g fill="url(#hatch-bw)" stroke="#000000" stroke-width="1.8">
      <rect x="100" y="100" width="60" height="60" fill="#ffffff" stroke-dasharray="3,3" />
      <rect x="100" y="70" width="60" height="30" />
      <rect x="100" y="160" width="60" height="30" />
      <rect x="70" y="100" width="30" height="60" />
      <rect x="160" y="100" width="30" height="60" />

      <polygon points="100,70 160,70 145,52 115,52" />
      <polygon points="100,190 160,190 145,208 115,208" />
      <polygon points="70,100 70,160 52,145 52,115" />
      <polygon points="190,100 190,160 208,145 208,115" />

      <rect x="115" y="32" width="30" height="20" />
      <path d="M 115,32 A 15,15 0 0,1 145,32 Z" />

      <rect x="115" y="208" width="30" height="20" />
      <path d="M 115,228 A 15,15 0 0,0 145,228 Z" />

      <rect x="32" y="115" width="20" height="30" />
      <path d="M 32,115 A 15,15 0 0,0 32,145 Z" />

      <rect x="208" y="115" width="20" height="30" />
      <path d="M 228,115 A 15,15 0 0,1 228,145 Z" />
    </g>

    <line x1="100" y1="175" x2="160" y2="175" stroke="#000000" stroke-width="1.2" />
    <path d="M 100,172 L 100,178 M 160,172 L 160,178" stroke="#000000" stroke-width="1.2" />
    <text x="130" y="188" font-size="14" font-weight="bold" font-style="italic" text-anchor="middle" fill="#000000">x</text>

    <line x1="160" y1="175" x2="190" y2="175" stroke="#000000" stroke-width="1.2" />
    <text x="175" y="196" font-size="13" font-weight="bold" font-style="italic" text-anchor="middle" fill="#000000">x/2</text>

    <path d="M 185,100 A 10,10 0 0,1 180,107" fill="none" stroke="#000000" stroke-width="1.2" />
    <text x="194" y="96" font-size="12" font-weight="bold" fill="#000000">45°</text>

    <line x1="228" y1="130" x2="275" y2="130" stroke="#000000" stroke-width="1" stroke-dasharray="2,2" />
    <text x="280" y="125" font-size="12" fill="#000000">Nửa</text>
    <text x="280" y="139" font-size="12" fill="#000000">hình tròn</text>
  </g>

  <!-- QUY TRÌNH GẤP THU NHỎ ĐEN TRẮNG -->
  <g transform="translate(320, 30)">
    <text x="180" y="20" font-size="13" font-weight="bold" text-anchor="middle" fill="#000000">
      Quy trình gấp lại thành chiếc hộp (đã thu nhỏ để thấy toàn bộ quy trình)
    </text>

    <g transform="translate(20, 45) scale(0.65)" fill="none" stroke="#000000" stroke-width="1.5">
      <polygon points="50,40 110,40 130,55 70,55" fill="#f8fafc" />
      <polygon points="10,48 50,40 70,55 30,65" fill="url(#hatch-bw)" />
      <polygon points="110,40 150,45 170,62 130,55" fill="url(#hatch-bw)" />
      <polygon points="65,25 95,25 110,40 50,40" fill="url(#hatch-bw)" />
      <polygon points="70,55 130,55 145,80 85,80" fill="url(#hatch-bw)" />
    </g>

    <path d="M 155,75 C 175,60 195,60 215,75" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow-bw)" />

    <g transform="translate(225, 40) scale(0.65)" fill="none" stroke="#000000" stroke-width="1.5">
      <polygon points="40,60 80,60 95,75 55,75" />
      <polygon points="20,20 40,60 55,75 30,30" fill="url(#hatch-bw)" />
      <polygon points="80,60 115,25 130,35 95,75" fill="url(#hatch-bw)" />
      <polygon points="50,15 70,15 80,60 40,60" fill="url(#hatch-bw)" />
      <polygon points="55,75 95,75 105,95 65,95" fill="url(#hatch-bw)" />
    </g>

    <path d="M 335,75 C 355,60 375,60 395,75" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow-bw)" />

    <g transform="translate(405, 38) scale(0.65)" fill="none" stroke="#000000" stroke-width="1.5">
      <polygon points="35,65 75,65 90,80 50,80" />
      <polygon points="25,10 40,10 50,80 35,65" fill="url(#hatch-bw)" />
      <polygon points="75,65 90,80 100,15 85,15" fill="url(#hatch-bw)" />
      <polygon points="45,5 65,5 75,65 35,65" fill="url(#hatch-bw)" />
      <polygon points="50,80 90,80 95,95 55,95" fill="url(#hatch-bw)" />
    </g>

    <path d="M 450,115 C 470,135 470,165 440,185" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow-bw)" />

    <g transform="translate(370, 180) scale(0.7)" fill="none" stroke="#000000" stroke-width="1.5">
      <polygon points="30,50 65,50 80,65 45,65" />
      <polygon points="30,50 45,65 45,90 30,75" fill="url(#hatch-bw)" />
      <polygon points="45,65 80,65 80,90 45,90" />
      <path d="M 30,50 Q 40,15 50,15 Q 60,15 65,50 Z" fill="url(#hatch-bw)" />
      <path d="M 45,65 Q 55,20 68,20 Q 75,25 80,65 Z" fill="url(#hatch-bw)" />
    </g>

    <path d="M 360,220 C 330,225 300,225 270,235" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow-bw)" />
  </g>

  <!-- HỘP ĐEN TRẮNG PHÓNG TO -->
  <g transform="translate(320, 260)">
    <polygon points="60,90 180,90 180,170 60,170" fill="#ffffff" stroke="#000000" stroke-width="2" />
    <polygon points="180,90 260,50 260,120 180,170" fill="url(#hatch-bw)" stroke="#000000" stroke-width="2" />
    <polygon points="60,90 140,50 260,50 180,90" fill="#ffffff" stroke="#000000" stroke-width="2" />

    <path d="M 100,68 C 100,10 135,5 145,10 C 150,15 150,55 140,50 Z" fill="#ffffff" stroke="#000000" stroke-width="2" />
    <path d="M 190,68 C 195,15 165,5 155,10 C 150,15 150,55 160,50 Z" fill="url(#hatch-bw)" stroke="#000000" stroke-width="2" />
    <path d="M 100,68 C 100,0 145,0 145,68 Z" fill="#ffffff" stroke="#000000" stroke-width="2" />
    <path d="M 145,68 C 145,0 190,0 190,68 Z" fill="url(#hatch-bw)" stroke="#000000" stroke-width="2" />

    <text x="270" y="160" font-size="13" font-style="italic" fill="#000000">
      Chiếc hộp sau khi gấp xong
    </text>
    <text x="270" y="178" font-size="12" fill="#000000">
      (đã được phóng to)
    </text>
  </g>
</svg>`,
  tikzCode: `\\begin{tikzpicture}[scale=0.45, font=\\small]
  % Hình vuông tờ giấy 10cm
  \\draw[dashed] (0,0) rectangle (10,10);
  \\draw[dotted] (0,0) -- (10,10) (0,10) -- (10,0);
  % Đáy hộp ở chính giữa
  \\draw[thick, fill=yellow!20] (3.5,3.5) rectangle (6.5,6.5);
  % 4 thành hình chữ nhật
  \\draw[thick, fill=orange!20] (3.5,2) rectangle (6.5,3.5);
  \\draw[thick, fill=orange!20] (3.5,6.5) rectangle (6.5,8);
  \\draw[thick, fill=orange!20] (2,3.5) rectangle (3.5,6.5);
  \\draw[thick, fill=orange!20] (6.5,3.5) rectangle (8,6.5);
  % Kích thước
  \\draw[<->] (3.5,3.2) -- node[below]{$x$} (6.5,3.2);
  \\draw[<->] (6.5,3.2) -- node[below]{$\\frac{x}{2}$} (8,3.2);
\\end{tikzpicture}`,
  steps: [
    { step: 1, title: 'Bước 1: Trải phẳng trên tờ giấy', desc: 'Cắt theo đường bao viền nét liền, giữ lại phần nếp gấp nét đứt.' },
    { step: 2, title: 'Bước 2: Gập 4 thành đứng', desc: 'Nâng 4 hình chữ nhật kích thước x × x/2 vuông góc 90 độ so với đáy.' },
    { step: 3, title: 'Bước 3: Nghiêng 4 hình thang cân', desc: 'Bẻ gập 4 hình thang góc 45 độ nghiêng chụm dần vào tâm hộp.' },
    { step: 4, title: 'Bước 4: Khép cánh hoa vòm', desc: 'Uốn 4 dải vòm nửa hình tròn khép kín lại thành chiếc hộp hoa hoàn chỉnh.' }
  ]
};

// 2. PRESET CÂU 37: HỘP CHỮ NHẬT & HÌNH TRỤ TỪ TẤM BÌA 40cm x 80cm
const PRESET_CAU_37: MathReproducedItem = {
  id: 'cau_37',
  title: 'Câu 37: Tấm bìa 40 × 80 cm gấp thành khối hộp và hình trụ',
  badge: 'Khối hộp + Khối trụ • Cực trị V(x) (Toán 12)',
  desc: 'Tấm bìa 40 cm × 80 cm, phần dưới gấp thành hộp chữ nhật đáy x, phần trên cuộn thành hình trụ tròn không nắp.',
  questionText: 'Một tấm bìa hình chữ nhật có kích thước $40\\text{ cm} \\times 80\\text{ cm}$. Chính giữa hình vuông phía bên dưới của tấm bìa, người ta vẽ một hình vuông nhỏ hơn có cạnh bằng $x$. Sau đó, vẽ thêm bốn hình chữ nhật ở xung quanh hình vuông này. Lên phía trên phần được vẽ, người ta lại vẽ thêm một hình vuông có cạnh bằng $x$. Phần còn lại, người ta vẽ một hình tròn và một hình chữ nhật, với đường kính của hình tròn bằng chiều cao theo phương thẳng đứng của hình chữ nhật. Toàn bộ phần tô màu được cắt ra và gấp lại thành một hình như sau: phần bên dưới là một hình hộp chữ nhật, phần bên trên là một hình trụ (không có nắp), phần tiếp giáp của hình tròn được cắt gần đứt chứ không cắt đứt. Lưu ý: Phần hình chữ nhật trên cùng phải bao lấy vừa đủ hoặc dư bề mặt xung quanh của hình trụ có thể được tạo thành. Hãy tính thể tích lớn nhất của toàn bộ hai khối hình (là hình hộp chữ nhật và hình trụ).',
  mathModel: {
    type: 'cylinder_box',
    formula: 'V(x) = V_{\\text{hộp}} + V_{\\text{trụ}} = x^2 \\cdot h_1 + \\pi R^2 \\cdot h_2',
    optimalSolution: 'Từ kích thước tấm bìa $40 \\times 80\\text{ cm}$, thiết lập mối quan hệ giữa $x$, $y$, bán kính $R = \\frac{y}{2}$, chiều cao $h_1 = \\frac{40 - x}{2}$. Tìm nghiệm cực đại $V\'(x) = 0$ để tối đa hoá tổng thể tích $V_{\\max}$.',
    variablesDesc: '$x$: cạnh đáy hình vuông của hộp chữ nhật, $y$: chiều cao dải cuộn vỏ trụ'
  },
  colorSvg: `<svg viewBox="0 0 920 520" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <marker id="arrow-c37" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b" />
    </marker>
  </defs>

  <!-- TẤM BÌA 40 x 80 cm BÊN TRÁI -->
  <g transform="translate(40, 40)">
    <!-- Viền tấm bìa 40x80 (tỉ lệ 120 x 240) -->
    <rect x="0" y="0" width="130" height="260" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
    
    <!-- Kích thước ngoài -->
    <line x1="-15" y1="0" x2="-15" y2="260" stroke="#1e293b" stroke-width="1.2" />
    <path d="M -20,0 L -10,0 M -20,260 L -10,260" stroke="#1e293b" stroke-width="1.2" />
    <text x="-25" y="135" font-size="14" font-weight="bold" text-anchor="middle" transform="rotate(-90, -25, 135)" fill="#0f172a">80 cm</text>

    <line x1="0" y1="275" x2="130" y2="275" stroke="#1e293b" stroke-width="1.2" />
    <path d="M 0,270 L 0,280 M 130,270 L 130,280" stroke="#1e293b" stroke-width="1.2" />
    <text x="65" y="293" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">40 cm</text>

    <!-- Đường chia đôi 40 cm ngang -->
    <line x1="0" y1="130" x2="130" y2="130" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
    <text x="145" y="195" font-size="13" font-weight="bold" fill="#0f172a">40 cm</text>

    <!-- Nửa dưới: Khai triển hộp đáy x -->
    <!-- Hình vuông tâm x=60, y=195, kích thước x=50, viền 4 bên x=40 -->
    <g fill="#fed7aa" stroke="#1e293b" stroke-width="1.5">
      <rect x="40" y="170" width="50" height="50" fill="#fde68a" stroke-dasharray="3,3" />
      <rect x="40" y="130" width="50" height="40" />
      <rect x="40" y="220" width="50" height="40" />
      <rect x="0" y="170" width="40" height="50" />
      <rect x="90" y="170" width="40" height="50" />
      <!-- Nắp trên cạnh x -->
      <rect x="40" y="80" width="50" height="50" />
    </g>

    <!-- Kích thước x ở nửa dưới -->
    <line x1="40" y1="235" x2="90" y2="235" stroke="#0f172a" stroke-width="1" />
    <text x="65" y="248" font-size="12" font-style="italic" font-weight="bold" text-anchor="middle" fill="#0f172a">x</text>

    <!-- Nửa trên: Dải chữ nhật y và hình tròn đường kính y -->
    <!-- Dải trên cùng rộng y -->
    <rect x="0" y="15" width="130" height="30" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    <line x1="100" y1="15" x2="100" y2="45" stroke="#0f172a" stroke-width="1" />
    <text x="110" y="34" font-size="12" font-style="italic" font-weight="bold" fill="#0f172a">y</text>

    <!-- Hình tròn đường kính y -->
    <circle cx="65" cy="62" r="15" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    <line x1="90" y1="47" x2="90" y2="77" stroke="#0f172a" stroke-width="1" />
    <text x="100" y="66" font-size="12" font-style="italic" font-weight="bold" fill="#0f172a">y</text>
  </g>

  <!-- QUY TRÌNH GẤP 7 BƯỚC THU NHỎ BÊN PHẢI -->
  <g transform="translate(230, 25)">
    <text x="320" y="15" font-size="13" font-weight="bold" text-anchor="middle" fill="#334155">
      Quy trình gấp lại thành chiếc hộp (đã thu nhỏ để thấy toàn bộ quy trình)
    </text>

    <!-- Hàng trên: 4 bước gập hộp dưới -->
    <!-- Bước 1 -->
    <g transform="translate(20, 30) scale(0.65)">
      <polygon points="30,40 70,40 85,55 45,55" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="10,45 30,40 45,55 25,60" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="70,40 95,45 110,60 85,55" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="45,55 85,55 100,75 60,75" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="85,75 145,75 160,95 100,95" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <path d="M 125,55 C 140,45 155,45 170,55" fill="none" stroke="#1e293b" stroke-width="1.6" marker-end="url(#arrow-c37)" />

    <!-- Bước 2 -->
    <g transform="translate(180, 25) scale(0.65)">
      <polygon points="30,50 70,50 85,65 45,65" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="20,20 30,50 45,65 35,35" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="70,50 90,25 105,40 85,65" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="45,65 85,65 95,85 55,85" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <!-- Dải trên ngửa lên -->
      <polygon points="50,10 90,10 85,65 45,65" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <path d="M 285,55 C 300,45 315,45 330,55" fill="none" stroke="#1e293b" stroke-width="1.6" marker-end="url(#arrow-c37)" />

    <!-- Bước 3 -->
    <g transform="translate(340, 20) scale(0.65)">
      <polygon points="30,55 70,55 85,70 45,70" fill="#fde68a" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="20,15 30,55 45,70 35,30" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="70,55 85,70 100,25 85,10" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <!-- Nắp phẳng vươn cao -->
      <polygon points="35,10 75,10 85,70 45,70" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <circle cx="55" cy="5" r="8" fill="#fed7aa" stroke="#1e293b" stroke-width="1.2" />
      <rect x="25" y="-15" width="60" height="15" fill="#fed7aa" stroke="#1e293b" stroke-width="1.2" />
    </g>

    <!-- Mũi tên cong vòng xuống -->
    <path d="M 445,45 C 470,50 480,80 470,110" fill="none" stroke="#1e293b" stroke-width="1.6" marker-end="url(#arrow-c37)" />

    <!-- Hàng giữa: Đậy nắp hộp và cuộn vỏ trụ tròn -->
    <g transform="translate(350, 115) scale(0.65)">
      <!-- Hộp kín dưới -->
      <polygon points="20,60 70,60 70,95 20,95" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="70,60 100,40 100,75 70,95" fill="#fdba74" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="20,60 50,40 100,40 70,60" fill="#ffedd5" stroke="#1e293b" stroke-width="1.5" />
      <!-- Dải uốn cong hình trụ -->
      <path d="M 35,40 C 35,10 75,10 75,40 C 75,25 35,25 35,40 Z" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <path d="M 330,150 C 300,150 270,150 240,150" fill="none" stroke="#1e293b" stroke-width="1.6" marker-end="url(#arrow-c37)" />

    <!-- Uốn cong dải trụ thành ống tròn -->
    <g transform="translate(160, 115) scale(0.65)">
      <polygon points="20,60 70,60 70,95 20,95" fill="#fed7aa" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="70,60 100,40 100,75 70,95" fill="#fdba74" stroke="#1e293b" stroke-width="1.5" />
      <polygon points="20,60 50,40 100,40 70,60" fill="#ffedd5" stroke="#1e293b" stroke-width="1.5" />
      <!-- Vỏ trụ tròn uốn vòng -->
      <ellipse cx="60" cy="35" rx="18" ry="8" fill="none" stroke="#1e293b" stroke-width="1.5" />
      <path d="M 42,35 L 42,55 M 78,35 L 78,55" stroke="#1e293b" stroke-width="1.5" />
    </g>

    <!-- Mũi tên cong xuống dưới sang Hộp to hoàn chỉnh -->
    <path d="M 140,165 C 110,185 110,230 140,260" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow-c37)" />
  </g>

  <!-- HỘP HOÀN CHỈNH KẾT HỢP HÌNH TRỤ PHÓNG TO GÓC PHẢI DƯỚI -->
  <g transform="translate(560, 240)">
    <!-- Hộp chữ nhật dưới (đáy x × x, cao h1) -->
    <!-- Mặt trước -->
    <polygon points="40,130 180,130 180,210 40,210" fill="#fed7aa" stroke="#1e293b" stroke-width="2" />
    <!-- Mặt phải -->
    <polygon points="180,130 260,80 260,160 180,210" fill="#fdba74" stroke="#1e293b" stroke-width="2" />
    <!-- Mặt nắp hộp -->
    <polygon points="40,130 120,80 260,80 180,130" fill="#ffedd5" stroke="#1e293b" stroke-width="2" />
    
    <!-- Đường khuất đáy nét đứt -->
    <line x1="40" y1="210" x2="120" y2="160" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />
    <line x1="120" y1="160" x2="260" y2="160" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />
    <line x1="120" y1="160" x2="120" y2="80" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />

    <!-- Hình trụ tròn không nắp ở trên -->
    <!-- Đáy dưới của trụ (tiếp xúc nắp hộp) -->
    <ellipse cx="140" cy="85" rx="36" ry="16" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="3,3" />
    <!-- Thân trụ đứng -->
    <path d="M 104,85 L 104,20" stroke="#1e293b" stroke-width="2" />
    <path d="M 176,85 L 176,20" stroke="#1e293b" stroke-width="2" />
    <!-- Đáy trên của hình trụ (mở không nắp) -->
    <ellipse cx="140" cy="20" rx="36" ry="16" fill="#fed7aa" stroke="#1e293b" stroke-width="2" />

    <text x="140" y="235" font-size="13" font-style="italic" text-anchor="middle" fill="#334155">
      Chiếc hộp sau khi gấp xong (đã được phóng to)
    </text>
  </g>
</svg>`,
  bwSvg: `<svg viewBox="0 0 920 520" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <pattern id="hatch-bw-37" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#000000" stroke-width="1" />
    </pattern>
    <marker id="arrow-bw-37" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
    </marker>
  </defs>

  <g transform="translate(40, 40)">
    <rect x="0" y="0" width="130" height="260" fill="#ffffff" stroke="#000000" stroke-width="2" />
    <line x1="-15" y1="0" x2="-15" y2="260" stroke="#000000" stroke-width="1.2" />
    <text x="-25" y="135" font-size="14" font-weight="bold" text-anchor="middle" transform="rotate(-90, -25, 135)" fill="#000000">80 cm</text>
    <line x1="0" y1="275" x2="130" y2="275" stroke="#000000" stroke-width="1.2" />
    <text x="65" y="293" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">40 cm</text>

    <line x1="0" y1="130" x2="130" y2="130" stroke="#000000" stroke-width="1" stroke-dasharray="3,3" />
    <text x="145" y="195" font-size="13" font-weight="bold" fill="#000000">40 cm</text>

    <g fill="url(#hatch-bw-37)" stroke="#000000" stroke-width="1.5">
      <rect x="40" y="170" width="50" height="50" fill="#ffffff" stroke-dasharray="3,3" />
      <rect x="40" y="130" width="50" height="40" />
      <rect x="40" y="220" width="50" height="40" />
      <rect x="0" y="170" width="40" height="50" />
      <rect x="90" y="170" width="40" height="50" />
      <rect x="40" y="80" width="50" height="50" />
    </g>

    <line x1="40" y1="235" x2="90" y2="235" stroke="#000000" stroke-width="1" />
    <text x="65" y="248" font-size="12" font-style="italic" font-weight="bold" text-anchor="middle" fill="#000000">x</text>

    <rect x="0" y="15" width="130" height="30" fill="url(#hatch-bw-37)" stroke="#000000" stroke-width="1.5" />
    <text x="110" y="34" font-size="12" font-style="italic" font-weight="bold" fill="#000000">y</text>
    <circle cx="65" cy="62" r="15" fill="url(#hatch-bw-37)" stroke="#000000" stroke-width="1.5" />
    <text x="100" y="66" font-size="12" font-style="italic" font-weight="bold" fill="#000000">y</text>
  </g>

  <!-- HỘP HOÀN CHỈNH KẾT HỢP HÌNH TRỤ ĐEN TRẮNG -->
  <g transform="translate(560, 240)">
    <polygon points="40,130 180,130 180,210 40,210" fill="#ffffff" stroke="#000000" stroke-width="2" />
    <polygon points="180,130 260,80 260,160 180,210" fill="url(#hatch-bw-37)" stroke="#000000" stroke-width="2" />
    <polygon points="40,130 120,80 260,80 180,130" fill="#ffffff" stroke="#000000" stroke-width="2" />
    
    <line x1="40" y1="210" x2="120" y2="160" stroke="#000000" stroke-width="1.5" stroke-dasharray="3,3" />
    <line x1="120" y1="160" x2="260" y2="160" stroke="#000000" stroke-width="1.5" stroke-dasharray="3,3" />
    <line x1="120" y1="160" x2="120" y2="80" stroke="#000000" stroke-width="1.5" stroke-dasharray="3,3" />

    <ellipse cx="140" cy="85" rx="36" ry="16" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="3,3" />
    <path d="M 104,85 L 104,20" stroke="#000000" stroke-width="2" />
    <path d="M 176,85 L 176,20" stroke="#000000" stroke-width="2" />
    <ellipse cx="140" cy="20" rx="36" ry="16" fill="#ffffff" stroke="#000000" stroke-width="2" />

    <text x="140" y="235" font-size="13" font-style="italic" text-anchor="middle" fill="#000000">
      Chiếc hộp sau khi gấp xong (đã được phóng to)
    </text>
  </g>
</svg>`,
  tikzCode: `\\begin{tikzpicture}[scale=0.5]
  % Tấm bìa 40 x 80
  \\draw[thick] (0,0) rectangle (4,8);
  \\draw[dashed] (0,4) -- (4,4);
  \\node[left] at (0,4) {$40\\text{ cm}$};
  \\node[below] at (2,0) {$40\\text{ cm}$};
\\end{tikzpicture}`,
  steps: [
    { step: 1, title: 'Bước 1: Cắt tấm bìa 40 × 80 cm', desc: 'Bóc tách các phần tô màu theo đúng kích thước x và y.' },
    { step: 2, title: 'Bước 2: Gấp hộp chữ nhật dưới', desc: 'Dựng 4 vách đứng cạnh x × (40-x)/2 và nắp đậy trên.' },
    { step: 3, title: 'Bước 3: Cuộn vỏ hình trụ', desc: 'Uốn cong dải chữ nhật rộng y tạo thành mặt xung quanh trụ tròn.' },
    { step: 4, title: 'Bước 4: Gắn đáy trụ vào nắp hộp', desc: 'Lắp đáy tròn và gắn chắc chắn khối trụ không nắp lên khối hộp.' }
  ]
};

// 3. PRESET CÂU 591: VẬT THỂ XOẮN ỐC THIẾT DIỆN LỤC GIÁC ĐỀU
const PRESET_CAU_591: MathReproducedItem = {
  id: 'cau_591',
  title: 'Câu 591: Khối vật thể xoắn ốc có thiết diện lục giác đều y = 9 - x/6',
  badge: 'Tích phân tính thể tích • Thiết diện biến thiên (Toán 12)',
  desc: 'Chiều dài 20 cm, thiết diện vuông góc trục Ox là hình lục giác đều có cạnh y = 9 - x/6.',
  questionText: 'Cho một khối hình như trong hình vẽ. Biết rằng thiết diện cắt bởi một mặt phẳng bất kỳ vuông góc với trục $Ox$ là hình một lục giác đều có độ dài cạnh giảm dần theo công thức $y = 9 - \\frac{x}{6}$. Biết chiều dài của khối hình là $20\\text{ cm}$. Tính thể tích của khối hình đó.',
  mathModel: {
    type: 'twisted_hexagon',
    formula: 'S(x) = \\frac{3\\sqrt{3}}{2} \\cdot y^2 = \\frac{3\\sqrt{3}}{2}\\left(9 - \\frac{x}{6}\\right)^2 \\Rightarrow V = \\int_0^{20} S(x)\\,dx',
    optimalSolution: 'Diện tích thiết diện lục giác đều tại hoành độ $x$: $S(x) = \\frac{3\\sqrt{3}}{2}\\left(9 - \\frac{x}{6}\\right)^2$.\\nThể tích vật thể:\\n$$V = \\int_0^{20} \\frac{3\\sqrt{3}}{2}\\left(9 - \\frac{x}{6}\\right)^2 dx = \\frac{3\\sqrt{3}}{2} \\left[ -2\\left(9 - \\frac{x}{6}\\right)^3 \\right]_0^{20} = 735\\sqrt{3} \\approx 1273.06\\text{ cm}^3.$$',
    variablesDesc: '$x \\in [0; 20]$: hoành độ lát cắt, $y(x) = 9 - \\frac{x}{6}$: độ dài cạnh lục giác đều'
  },
  colorSvg: `<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <linearGradient id="grad-twist-blue" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <marker id="arrow-591" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f172a" />
    </marker>
  </defs>

  <!-- HÌNH CHÍNH BÊN TRÁI: KHỐI XOẮN ỐC VỚI 2 MẶT CẮT x=0 và x=20 -->
  <g transform="translate(60, 40)">
    <!-- Mặt phẳng cắt x = 0 bên trái (Màu cam đào) -->
    <polygon points="10,40 100,10 100,240 10,270" fill="#fed7aa" opacity="0.8" stroke="#f97316" stroke-width="1.5" />
    <text x="35" y="30" font-size="14" font-style="italic" font-weight="bold" fill="#0f172a">x = 0</text>
    <line x1="45" y1="35" x2="70" y2="70" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="3,3" />

    <!-- Khối xoắn ốc (Twisted Hexagon) từ x=0 sang x=20 -->
    <!-- Mặt trên xoắn -->
    <path d="M 60,70 C 130,85 200,100 280,120 L 260,150 C 180,130 110,115 50,110 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1.5" />
    <!-- Mặt giữa gradient lượn sóng -->
    <path d="M 50,110 C 120,130 190,145 260,150 L 245,185 C 170,180 100,170 30,160 Z" fill="url(#grad-twist-blue)" stroke="#0284c7" stroke-width="1.8" />
    <!-- Mặt dưới -->
    <path d="M 30,160 C 100,175 170,185 245,185 L 230,210 C 160,205 90,200 20,200 Z" fill="#0369a1" stroke="#0284c7" stroke-width="1.5" />

    <!-- Mặt phẳng cắt x = 20 bên phải -->
    <polygon points="230,100 290,80 290,220 230,240" fill="#fed7aa" opacity="0.8" stroke="#f97316" stroke-width="1.5" />
    <text x="235" y="70" font-size="14" font-style="italic" font-weight="bold" fill="#0f172a">x = 20</text>
    <line x1="245" y1="75" x2="260" y2="120" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="3,3" />

    <!-- Trục tọa độ Ox đâm xuyên qua -->
    <line x1="40" y1="150" x2="350" y2="150" stroke="#0f172a" stroke-width="1.8" marker-end="url(#arrow-591)" />
    <text x="360" y="155" font-size="15" font-weight="bold" font-style="italic" fill="#0f172a">Ox</text>

    <!-- Thiết diện lục giác đều tại x = 20 chiếu phóng to sang bên -->
    <line x1="270" y1="130" x2="330" y2="130" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="3,3" />
    <line x1="270" y1="180" x2="330" y2="180" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="3,3" />
    
    <!-- Ô vuông màu cam chứa hình lục giác -->
    <rect x="330" y="110" width="70" height="70" fill="#fed7aa" stroke="#f97316" stroke-width="1.5" />
    <!-- Lục giác đều x=20 -->
    <polygon points="365,120 385,132 385,158 365,170 345,158 345,132" fill="#0284c7" stroke="#0f172a" stroke-width="1.5" />
  </g>

  <!-- HÌNH BÊN PHẢI: MỘT GÓC NHÌN KHÁC VỀ VẬT THỂ -->
  <g transform="translate(560, 40)">
    <text x="140" y="30" font-size="13" font-style="italic" text-anchor="middle" fill="#334155">
      Một góc nhìn khác về vật
    </text>

    <!-- Khối xoắn nhìn từ đầu trục (Perspective front-view) -->
    <!-- Thiết diện lục giác lớn ở đầu -->
    <polygon points="60,110 90,85 130,95 140,130 110,155 70,145" fill="#0284c7" stroke="#0f172a" stroke-width="2" />
    
    <!-- Thân xoắn vút về phía sau -->
    <path d="M 90,85 C 130,70 180,60 220,65 L 240,95 C 190,90 140,110 130,95 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1.5" />
    <path d="M 140,130 C 180,120 220,105 240,95 L 230,130 C 190,140 140,150 110,155 Z" fill="url(#grad-twist-blue)" stroke="#0284c7" stroke-width="1.8" />
    <path d="M 110,155 C 150,165 190,160 230,130 L 210,155 C 170,175 120,170 70,145 Z" fill="#0369a1" stroke="#0284c7" stroke-width="1.5" />
  </g>
</svg>`,
  bwSvg: `<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <pattern id="hatch-591" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#000000" stroke-width="1" />
    </pattern>
    <marker id="arrow-bw-591" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
    </marker>
  </defs>

  <g transform="translate(60, 40)">
    <polygon points="10,40 100,10 100,240 10,270" fill="none" stroke="#000000" stroke-width="1.5" />
    <text x="35" y="30" font-size="14" font-style="italic" font-weight="bold" fill="#000000">x = 0</text>
    <line x1="45" y1="35" x2="70" y2="70" stroke="#000000" stroke-width="1.2" stroke-dasharray="3,3" />

    <path d="M 60,70 C 130,85 200,100 280,120 L 260,150 C 180,130 110,115 50,110 Z" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
    <path d="M 50,110 C 120,130 190,145 260,150 L 245,185 C 170,180 100,170 30,160 Z" fill="url(#hatch-591)" stroke="#000000" stroke-width="1.8" />
    <path d="M 30,160 C 100,175 170,185 245,185 L 230,210 C 160,205 90,200 20,200 Z" fill="#ffffff" stroke="#000000" stroke-width="1.5" />

    <polygon points="230,100 290,80 290,220 230,240" fill="none" stroke="#000000" stroke-width="1.5" />
    <text x="235" y="70" font-size="14" font-style="italic" font-weight="bold" fill="#000000">x = 20</text>

    <line x1="40" y1="150" x2="350" y2="150" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow-bw-591)" />
    <text x="360" y="155" font-size="15" font-weight="bold" font-style="italic" fill="#000000">Ox</text>

    <rect x="330" y="110" width="70" height="70" fill="none" stroke="#000000" stroke-width="1.5" />
    <polygon points="365,120 385,132 385,158 365,170 345,158 345,132" fill="url(#hatch-591)" stroke="#000000" stroke-width="1.5" />
  </g>

  <g transform="translate(560, 40)">
    <text x="140" y="30" font-size="13" font-style="italic" text-anchor="middle" fill="#000000">
      Một góc nhìn khác về vật
    </text>
    <polygon points="60,110 90,85 130,95 140,130 110,155 70,145" fill="url(#hatch-591)" stroke="#000000" stroke-width="2" />
    <path d="M 90,85 C 130,70 180,60 220,65 L 240,95 C 190,90 140,110 130,95 Z" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
    <path d="M 140,130 C 180,120 220,105 240,95 L 230,130 C 190,140 140,150 110,155 Z" fill="url(#hatch-591)" stroke="#000000" stroke-width="1.8" />
  </g>
</svg>`,
  tikzCode: `\\begin{tikzpicture}[x={(0.8cm,-0.2cm)}, y={(0.5cm,0.5cm)}, z={(0cm,1cm)}]
  % Trục Ox
  \\draw[->, thick] (-1,0,0) -- (8,0,0) node[right]{$Ox$};
  % Thiết diện lục giác đều tại x
  \\draw[fill=cyan!30] (0,0,-1) -- (0,1,-0.5) -- (0,1,0.5) -- (0,0,1) -- (0,-1,0.5) -- (0,-1,-0.5) -- cycle;
\\end{tikzpicture}`,
  steps: [
    { step: 1, title: 'Bước 1: Xác định trục Ox', desc: 'Vật thể nằm giới hạn bởi 2 mặt phẳng vuông góc Ox tại x = 0 và x = 20.' },
    { step: 2, title: 'Bước 2: Diện tích mặt cắt S(x)', desc: 'Tại hoành độ x, thiết diện là lục giác đều cạnh y = 9 - x/6. S(x) = 3√3/2 · y^2.' },
    { step: 3, title: 'Bước 3: Tích phân thể tích', desc: 'Tích phân V = ∫[0..20] S(x) dx cho giá trị thể tích chính xác 100%.' }
  ]
};

// 4. PRESET CÂU 592: VẬT THỂ XOẮN ỐC THIẾT DIỆN HÌNH DẤU CỘNG
const PRESET_CAU_592: MathReproducedItem = {
  id: 'cau_592',
  title: 'Câu 592: Khối vật thể xoắn ốc có thiết diện hình dấu cộng l = 9 - x/6',
  badge: 'Tích phân tính thể tích • Thiết diện dấu cộng (Toán 12)',
  desc: 'Chiều dài 20 cm, thiết diện vuông góc trục Ox là hình dấu cộng có kích thước l giảm theo l = 9 - x/6.',
  questionText: 'Cho một khối hình như trong hình vẽ. Biết rằng thiết diện cắt bởi một mặt phẳng bất kỳ vuông góc với trục $Ox$ là hình dấu cộng như trong hình vẽ có một kích thước $l$ giảm theo công thức $l = 9 - \\frac{x}{6}$. Biết chiều dài của khối hình là $20\\text{ cm}$. Tính thể tích khối hình đó.',
  mathModel: {
    type: 'twisted_cross',
    formula: 'S(x) = 5l^2 = 5\\left(9 - \\frac{x}{6}\\right)^2 \\Rightarrow V = \\int_0^{20} 5\\left(9 - \\frac{x}{6}\\right)^2 dx',
    optimalSolution: 'Hình dấu cộng tạo bởi $5$ ô vuông cạnh $l$: $S(x) = 5l^2 = 5\\left(9 - \\frac{x}{6}\\right)^2$.\\nThể tích vật thể:\\n$$V = \\int_0^{20} 5\\left(9 - \\frac{x}{6}\\right)^2 dx = 5 \\left[ -2\\left(9 - \\frac{x}{6}\\right)^3 \\right]_0^{20} = 2450\\text{ cm}^3.$$',
    variablesDesc: '$l(x) = 9 - \\frac{x}{6}$: bề dày nhánh dấu cộng, $5l$: chiều rộng ngang và dọc'
  },
  colorSvg: `<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <linearGradient id="grad-cross-blue" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <marker id="arrow-592" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f172a" />
    </marker>
  </defs>

  <g transform="translate(60, 40)">
    <!-- Mặt phẳng x = 0 -->
    <polygon points="10,40 100,10 100,240 10,270" fill="#fed7aa" opacity="0.8" stroke="#f97316" stroke-width="1.5" />
    <text x="35" y="30" font-size="14" font-style="italic" font-weight="bold" fill="#0f172a">x = 0</text>
    <line x1="45" y1="35" x2="70" y2="70" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="3,3" />

    <!-- Khối xoắn hình dấu cộng 4 cánh (Cross-twisted solid) -->
    <!-- Cánh trên -->
    <path d="M 50,70 C 120,85 190,100 270,120 L 255,145 C 180,130 110,115 40,100 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1.5" />
    <!-- Cánh ngang lượn xoắn -->
    <path d="M 40,100 C 110,115 180,130 255,145 L 245,175 C 170,165 100,150 30,135 Z" fill="url(#grad-cross-blue)" stroke="#0284c7" stroke-width="1.8" />
    <!-- Cánh dưới lượn xoắn -->
    <path d="M 30,135 C 100,150 170,165 245,175 L 230,205 C 160,195 90,185 20,170 Z" fill="#0369a1" stroke="#0284c7" stroke-width="1.5" />

    <!-- Mặt phẳng x = 20 -->
    <polygon points="230,100 290,80 290,220 230,240" fill="#fed7aa" opacity="0.8" stroke="#f97316" stroke-width="1.5" />
    <text x="235" y="70" font-size="14" font-style="italic" font-weight="bold" fill="#0f172a">x = 20</text>

    <!-- Trục Ox -->
    <line x1="40" y1="150" x2="350" y2="150" stroke="#0f172a" stroke-width="1.8" marker-end="url(#arrow-592)" />
    <text x="360" y="155" font-size="15" font-weight="bold" font-style="italic" fill="#0f172a">Ox</text>

    <!-- Phóng to thiết diện hình dấu cộng -->
    <rect x="330" y="110" width="80" height="80" fill="#fed7aa" stroke="#f97316" stroke-width="1.5" />
    <!-- Hình dấu cộng -->
    <g fill="#0284c7" stroke="#0f172a" stroke-width="1.5">
      <polygon points="360,120 380,120 380,140 400,140 400,160 380,160 380,180 360,180 360,160 340,160 340,140 360,140" />
    </g>

    <!-- Kích thước l và 5l -->
    <line x1="360" y1="115" x2="380" y2="115" stroke="#0f172a" stroke-width="1" />
    <text x="370" y="110" font-size="11" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">l</text>
    
    <line x1="335" y1="195" x2="405" y2="195" stroke="#0f172a" stroke-width="1" />
    <text x="370" y="208" font-size="12" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">5l</text>

    <line x1="415" y1="120" x2="415" y2="180" stroke="#0f172a" stroke-width="1" />
    <text x="425" y="155" font-size="12" font-weight="bold" font-style="italic" fill="#0f172a">5l</text>
  </g>
</svg>`,
  bwSvg: `<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:'Times New Roman', serif;">
  <defs>
    <pattern id="hatch-592" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#000000" stroke-width="1" />
    </pattern>
    <marker id="arrow-bw-592" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
    </marker>
  </defs>

  <g transform="translate(60, 40)">
    <polygon points="10,40 100,10 100,240 10,270" fill="none" stroke="#000000" stroke-width="1.5" />
    <text x="35" y="30" font-size="14" font-style="italic" font-weight="bold" fill="#000000">x = 0</text>
    <path d="M 50,70 C 120,85 190,100 270,120 L 255,145 C 180,130 110,115 40,100 Z" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
    <path d="M 40,100 C 110,115 180,130 255,145 L 245,175 C 170,165 100,150 30,135 Z" fill="url(#hatch-592)" stroke="#000000" stroke-width="1.8" />
    <path d="M 30,135 C 100,150 170,165 245,175 L 230,205 C 160,195 90,185 20,170 Z" fill="#ffffff" stroke="#000000" stroke-width="1.5" />

    <polygon points="230,100 290,80 290,220 230,240" fill="none" stroke="#000000" stroke-width="1.5" />
    <text x="235" y="70" font-size="14" font-style="italic" font-weight="bold" fill="#000000">x = 20</text>

    <line x1="40" y1="150" x2="350" y2="150" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow-bw-592)" />
    <text x="360" y="155" font-size="15" font-weight="bold" font-style="italic" fill="#000000">Ox</text>

    <rect x="330" y="110" width="80" height="80" fill="none" stroke="#000000" stroke-width="1.5" />
    <polygon points="360,120 380,120 380,140 400,140 400,160 380,160 380,180 360,180 360,160 340,160 340,140 360,140" fill="url(#hatch-592)" stroke="#000000" stroke-width="1.5" />

    <text x="370" y="110" font-size="11" font-weight="bold" font-style="italic" text-anchor="middle" fill="#000000">l</text>
    <text x="370" y="208" font-size="12" font-weight="bold" font-style="italic" text-anchor="middle" fill="#000000">5l</text>
    <text x="425" y="155" font-size="12" font-weight="bold" font-style="italic" fill="#000000">5l</text>
  </g>
</svg>`,
  tikzCode: `\\begin{tikzpicture}
  \\draw[thick, fill=blue!20] (-1,-0.33) rectangle (1,0.33);
  \\draw[thick, fill=blue!20] (-0.33,-1) rectangle (0.33,1);
\\end{tikzpicture}`,
  steps: [
    { step: 1, title: 'Bước 1: Thiết diện dấu cộng', desc: 'Thiết diện gồm 5 ô vuông cạnh l, diện tích S(x) = 5l^2.' },
    { step: 2, title: 'Bước 2: Thay l = 9 - x/6', desc: 'Hàm diện tích thiết diện S(x) = 5(9 - x/6)^2.' },
    { step: 3, title: 'Bước 3: Tích phân thể tích', desc: 'V = ∫[0..20] 5(9 - x/6)^2 dx = 2450 cm³.' }
  ]
};

export const REPRODUCED_PRESETS = [PRESET_CAU_43, PRESET_CAU_37, PRESET_CAU_591, PRESET_CAU_592];

// ============================================================================
// MAIN COMPONENT: MathImageReproducerAnd3D
// ============================================================================

export function MathImageReproducerAnd3D({ onInsertToExam }: { onInsertToExam?: (snippet: string) => void }) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cau_43');
  const [customItem, setCustomItem] = useState<MathReproducedItem | null>(null);
  
  // Chế độ xem: 'color' (như hình gốc) hoặc 'bw' (đen trắng in ấn)
  const [renderMode, setRenderMode] = useState<'color' | 'bw'>('color');
  
  // Chế độ hiển thị chính: 'vector_svg' (Hình vẽ lại) hay 'simulation_3d' (Mô hình động)
  const [mainDisplayTab, setMainDisplayTab] = useState<'vector_svg' | 'simulation_3d' | 'both'>('both');

  // Animation & 3D Interactive States
  const [animProgress, setAnimProgress] = useState<number>(100); // 0 -> 100%
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [sliceX, setSliceX] = useState<number>(10); // Dành cho bài toán xoắn ốc x in [0, 20]

  // Upload & AI Processing States
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isProcessingAi, setIsProcessingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const threeMountRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Active current item
  const currentItem = useMemo(() => {
    if (customItem) return customItem;
    return REPRODUCED_PRESETS.find(p => p.id === selectedPresetId) || PRESET_CAU_43;
  }, [customItem, selectedPresetId]);

  // Xử lý tự động chạy chuyển động Play / Pause
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setAnimProgress(prev => {
          if (prev >= 100) {
            return 0;
          }
          return Math.min(100, prev + 2);
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Three.js 3D Interactive Scene Initialization
  useEffect(() => {
    const container = threeMountRef.current;
    if (!container) return;

    // Kích thước container
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(renderMode === 'color' ? 0xf8fafc : 0xffffff);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 12, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, renderMode === 'color' ? 0.8 : 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, renderMode === 'color' ? 1.0 : 0.8);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(20, 20, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 4. Mesh Group based on Model Type
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const progressRatio = animProgress / 100; // 0..1
    const foldAngle = (progressRatio * Math.PI) / 2; // 0..90 deg

    // Colors
    const primaryColor = renderMode === 'color' ? 0xfdba74 : 0xe2e8f0;
    const secondaryColor = renderMode === 'color' ? 0xfde68a : 0xffffff;
    const edgeColor = 0x1e293b;

    // TẠO MÔ HÌNH 3D TÙY THUỘC LOẠI BÀI TOÁN
    if (currentItem.mathModel.type === 'paper_folding_flower') {
      // DẠNG CÂU 43: Đáy hình vuông x và 4 cánh hoa khum
      const bottomSize = 4;
      const wallHeight = 2;

      // Đáy hộp (Floor)
      const baseGeo = new THREE.BoxGeometry(bottomSize, 0.05, bottomSize);
      const baseMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.4 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0;
      modelGroup.add(baseMesh);

      // Viền đáy
      const baseEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(baseGeo),
        new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 })
      );
      baseMesh.add(baseEdges);

      // 4 Vách gập (Phía trước, sau, trái, phải)
      const wallGeo = new THREE.BoxGeometry(bottomSize, wallHeight, 0.05);
      const wallMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.3 });

      // Pivot 1: Trước (Z+)
      const pivotFront = new THREE.Group();
      pivotFront.position.set(0, 0, bottomSize / 2);
      const wallFront = new THREE.Mesh(wallGeo, wallMat);
      wallFront.position.set(0, wallHeight / 2, 0);
      pivotFront.add(wallFront);
      pivotFront.rotation.x = (1 - progressRatio) * (Math.PI / 2);
      modelGroup.add(pivotFront);

      // Pivot 2: Sau (Z-)
      const pivotBack = new THREE.Group();
      pivotBack.position.set(0, 0, -bottomSize / 2);
      const wallBack = new THREE.Mesh(wallGeo, wallMat);
      wallBack.position.set(0, wallHeight / 2, 0);
      pivotBack.add(wallBack);
      pivotBack.rotation.x = -(1 - progressRatio) * (Math.PI / 2);
      modelGroup.add(pivotBack);

      // Pivot 3: Phải (X+)
      const pivotRight = new THREE.Group();
      pivotRight.position.set(bottomSize / 2, 0, 0);
      const wallRight = new THREE.Mesh(wallGeo, wallMat);
      wallRight.rotation.y = Math.PI / 2;
      wallRight.position.set(0, wallHeight / 2, 0);
      pivotRight.add(wallRight);
      pivotRight.rotation.z = -(1 - progressRatio) * (Math.PI / 2);
      modelGroup.add(pivotRight);

      // Pivot 4: Trái (X-)
      const pivotLeft = new THREE.Group();
      pivotLeft.position.set(-bottomSize / 2, 0, 0);
      const wallLeft = new THREE.Mesh(wallGeo, wallMat);
      wallLeft.rotation.y = Math.PI / 2;
      wallLeft.position.set(0, wallHeight / 2, 0);
      pivotLeft.add(wallLeft);
      pivotLeft.rotation.z = (1 - progressRatio) * (Math.PI / 2);
      modelGroup.add(pivotLeft);

      // 4 Cánh hoa khum ở trên đỉnh (Khi progress > 50%)
      if (progressRatio > 0.4) {
        const petalRatio = (progressRatio - 0.4) / 0.6; // 0..1
        const petalGeo = new THREE.CylinderGeometry(0.1, 1.2, 2.5, 16, 1, true, 0, Math.PI);
        const petalMat = new THREE.MeshStandardMaterial({ 
          color: renderMode === 'color' ? 0xfb923c : 0xf1f5f9, 
          side: THREE.DoubleSide 
        });

        for (let i = 0; i < 4; i++) {
          const petalMesh = new THREE.Mesh(petalGeo, petalMat);
          petalMesh.rotation.y = (i * Math.PI) / 2;
          petalMesh.position.set(0, wallHeight + 1.2, 0);
          petalMesh.scale.set(petalRatio, petalRatio, petalRatio);
          modelGroup.add(petalMesh);
        }
      }

    } else if (currentItem.mathModel.type === 'cylinder_box') {
      // DẠNG CÂU 37: Hộp chữ nhật dưới & Hình trụ tròn trên
      const boxW = 4;
      const boxH = 2.5;
      const boxL = 4;

      // Hộp dưới
      const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxL);
      const boxMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.3 });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.y = boxH / 2;
      boxMesh.scale.set(1, Math.max(0.1, progressRatio), 1);
      modelGroup.add(boxMesh);

      // Trụ trên (Xuất hiện khi progress > 40%)
      if (progressRatio > 0.3) {
        const cylRatio = (progressRatio - 0.3) / 0.7;
        const cylRadius = 1.3;
        const cylHeight = 3.0 * cylRatio;
        const cylGeo = new THREE.CylinderGeometry(cylRadius, cylRadius, cylHeight, 32, 1, true);
        const cylMat = new THREE.MeshStandardMaterial({ 
          color: renderMode === 'color' ? 0xf97316 : 0xffffff, 
          side: THREE.DoubleSide 
        });
        const cylMesh = new THREE.Mesh(cylGeo, cylMat);
        cylMesh.position.y = boxH + cylHeight / 2;
        modelGroup.add(cylMesh);

        // Đáy tròn của hình trụ
        const capGeo = new THREE.CircleGeometry(cylRadius, 32);
        const capMat = new THREE.MeshStandardMaterial({ color: secondaryColor, side: THREE.DoubleSide });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.rotation.x = Math.PI / 2;
        capMesh.position.y = boxH + 0.02;
        modelGroup.add(capMesh);
      }

    } else if (currentItem.mathModel.type === 'twisted_hexagon') {
      // DẠNG CÂU 591: Khối xoắn ốc mặt cắt lục giác đều
      const length = 10;
      const segments = 40;
      const hexGroup = new THREE.Group();

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const xVal = t * 20; // 0..20
        const yVal = (9 - xVal / 6) * 0.25; // bán kính thu nhỏ
        const angle = t * Math.PI * 0.8; // góc xoắn

        const ringGeo = new THREE.RingGeometry(yVal * 0.85, yVal, 6);
        const ringMat = new THREE.MeshStandardMaterial({ 
          color: renderMode === 'color' ? (i % 2 === 0 ? 0x0284c7 : 0x38bdf8) : 0x000000,
          side: THREE.DoubleSide,
          wireframe: renderMode === 'bw'
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(t * length - length / 2, 2, 0);
        ringMesh.rotation.y = Math.PI / 2;
        ringMesh.rotation.x = angle;
        hexGroup.add(ringMesh);
      }
      modelGroup.add(hexGroup);

      // Mặt cắt lát di động tại sliceX (0..20)
      const currentSliceT = sliceX / 20;
      const sliceYVal = (9 - sliceX / 6) * 0.25;
      const planeGeo = new THREE.PlaneGeometry(4, 4);
      const planeMat = new THREE.MeshStandardMaterial({ 
        color: renderMode === 'color' ? 0xf97316 : 0x94a3b8, 
        transparent: true, 
        opacity: 0.6,
        side: THREE.DoubleSide 
      });
      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.position.set(currentSliceT * length - length / 2, 2, 0);
      planeMesh.rotation.y = Math.PI / 2;
      modelGroup.add(planeMesh);

    } else if (currentItem.mathModel.type === 'twisted_cross') {
      // DẠNG CÂU 592: Khối xoắn ốc mặt cắt hình dấu cộng
      const length = 10;
      const segments = 35;
      const crossGroup = new THREE.Group();

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const xVal = t * 20;
        const lVal = (9 - xVal / 6) * 0.15; // tỉ lệ
        const angle = t * Math.PI * 0.8;

        // Dấu cộng = 2 hình chữ nhật bắt chéo
        const hBar = new THREE.BoxGeometry(lVal * 5, lVal, 0.1);
        const vBar = new THREE.BoxGeometry(lVal, lVal * 5, 0.1);
        const barMat = new THREE.MeshStandardMaterial({ 
          color: renderMode === 'color' ? 0x0284c7 : 0x1e293b,
          wireframe: renderMode === 'bw'
        });

        const bar1 = new THREE.Mesh(hBar, barMat);
        const bar2 = new THREE.Mesh(vBar, barMat);
        const subGroup = new THREE.Group();
        subGroup.add(bar1);
        subGroup.add(bar2);

        subGroup.position.set(t * length - length / 2, 2, 0);
        subGroup.rotation.y = Math.PI / 2;
        subGroup.rotation.x = angle;
        crossGroup.add(subGroup);
      }
      modelGroup.add(crossGroup);

    } else {
      // Mặc định: Khối đa diện tổng quát
      const defaultGeo = new THREE.ConeGeometry(3, 4, 6);
      const defaultMat = new THREE.MeshStandardMaterial({ color: primaryColor, wireframe: renderMode === 'bw' });
      const defaultMesh = new THREE.Mesh(defaultGeo, defaultMat);
      defaultMesh.position.y = 2;
      modelGroup.add(defaultMesh);
    }

    // 5. Render Loop
    let isSubscribed = true;
    const animate = () => {
      if (!isSubscribed) return;
      controls.update();
      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 6. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, [currentItem, animProgress, sliceX, renderMode]);

  // Handle Image Upload & AI Call
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      setUploadedImagePreview(base64Str);
      processImageWithAi(base64Str, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithAi = async (base64Data: string, mimeType: string) => {
    setIsProcessingAi(true);
    setAiError(null);

    try {
      const res = await apiFetch('/api/reproduce-math-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          promptHint: 'Tái tạo hình vẽ vector và mô phỏng 3D chính xác 100%'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.result) {
        throw new Error(data?.error || 'Không thể nhận diện hình ảnh toán học này. Vui lòng thử lại.');
      }

      const resItem = data.result;
      const newCustomItem: MathReproducedItem = {
        id: 'custom_' + Date.now(),
        title: resItem.problemTitle || 'Hình vẽ toán học tái tạo từ ảnh tải lên',
        badge: 'AI Tái tạo thông minh (GDPT 2018)',
        desc: 'Hình vẽ được AI phân tích cấu trúc hình học, số đo và tái tạo tự động.',
        questionText: resItem.questionText || '',
        mathModel: resItem.mathModel || {
          type: 'custom',
          formula: 'V(x) = \\dots',
          optimalSolution: 'Đạo hàm khảo sát cực trị hàm số để tìm giá trị lớn nhất.',
          variablesDesc: '$x$: biến số hình học'
        },
        colorSvg: resItem.colorSvg,
        bwSvg: resItem.bwSvg || resItem.colorSvg,
        tikzCode: resItem.tikzCode || '',
        steps: resItem.foldingSteps || [
          { step: 1, title: 'Bước 1', desc: 'Sơ đồ hình học phẳng' },
          { step: 2, title: 'Bước 2', desc: 'Mô hình không gian 3D' }
        ]
      };

      setCustomItem(newCustomItem);
    } catch (err: any) {
      console.error(err);
      setAiError(err?.message || 'Có lỗi xảy ra khi xử lý ảnh qua AI.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Sao chép mã SVG
  const handleCopySvg = () => {
    const svgCode = renderMode === 'color' ? currentItem.colorSvg : currentItem.bwSvg;
    navigator.clipboard.writeText(svgCode);
    setCopyStatus('svg');
    setTimeout(() => setCopyStatus(null), 2500);
  };

  // Sao chép TikZ LaTeX
  const handleCopyTikz = () => {
    if (!currentItem.tikzCode) return;
    navigator.clipboard.writeText(currentItem.tikzCode);
    setCopyStatus('tikz');
    setTimeout(() => setCopyStatus(null), 2500);
  };

  // Tải file SVG
  const handleDownloadSvg = () => {
    const svgCode = renderMode === 'color' ? currentItem.colorSvg : currentItem.bwSvg;
    const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentItem.id}_${renderMode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tải ảnh PNG độ nét cao (2K)
  const handleDownloadPng = () => {
    const svgCode = renderMode === 'color' ? currentItem.colorSvg : currentItem.bwSvg;
    const img = new Image();
    const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800; // 2K ultra sharp
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${currentItem.id}_${renderMode}_2K.png`;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Xuất file Word (.doc)
  const handleExportDocx = () => {
    const el = document.getElementById('reproduced-math-export-wrap');
    if (!el) return;
    exportHtmlToWord(el, `${currentItem.title.replace(/\s+/g, '_')}.doc`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full p-2 sm:p-4">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-indigo-500/30">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-xs">
              Độc quyền Công cụ Toán học
            </span>
            <span className="text-xs text-blue-100 font-semibold">
              Chính xác 100% tỉ lệ • Mô hình 3D động • Xuất in ấn
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Vẽ Lại Hình Theo Ảnh & Mô Hình Động 3D Minh Họa
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-3xl leading-relaxed">
            Chuyên gia số hóa hình ảnh bài toán cho Giáo viên: Tải ảnh chụp từ đề thi/SGK lên để vẽ lại hình vector tuyệt đẹp, chuyển đổi <strong>Màu sắc chuẩn SGK</strong> hoặc <strong>Đen trắng chuẩn in ấn</strong>, kèm <strong>Mô hình động 3D tương tác</strong> giúp học sinh quan sát quy trình gấp cắt và hiểu sâu bản chất toán học.
          </p>
        </div>

        {/* Nút tải ảnh nhanh của GV */}
        <div className="shrink-0 flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingAi}
            className="px-4 py-2.5 bg-white hover:bg-blue-50 text-indigo-900 font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessingAi ? (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-4 h-4 text-indigo-600" />
            )}
            <span>{isProcessingAi ? 'Đang phân tích ảnh...' : '📸 Tải ảnh bài toán của bạn lên'}</span>
          </button>
        </div>
      </div>

      {/* DANH SÁCH 4 BÀI TOÁN KINH ĐIỂN TỪ HÌNH ẢNH CỦA GIÁO VIÊN */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Mẫu đề bài toán học thực tế khớp 100% hình ảnh giáo viên đưa lên:</span>
          </h3>
          {customItem && (
            <button
              onClick={() => setCustomItem(null)}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              ← Quay lại mẫu có sẵn
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPRODUCED_PRESETS.map((p) => {
            const isSelected = !customItem && selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setCustomItem(null);
                  setSelectedPresetId(p.id);
                  setAnimProgress(100);
                  setIsPlaying(false);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-xs ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-600 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                }`}
              >
                <div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {p.badge}
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-1.5 line-clamp-2">
                    {p.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {p.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* THANH ĐIỀU KHIỂN & CHẾ ĐỘ MÀU SẮC GỐC vs ĐEN TRẮNG IN ẤN */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Switcher 1: Chọn Chế độ Màu sắc vs Đen trắng */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setRenderMode('color')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              renderMode === 'color'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>🎨 Màu sắc như hình gốc (SGK)</span>
          </button>

          <button
            type="button"
            onClick={() => setRenderMode('bw')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              renderMode === 'bw'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>🖨️ Màu đen trắng (Dành cho in ấn)</span>
          </button>
        </div>

        {/* Switcher 2: Chọn khung xem (Hình vẽ lại / Mô hình 3D / Cả hai) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setMainDisplayTab('both')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${mainDisplayTab === 'both' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Song song cả hai
            </button>
            <button
              onClick={() => setMainDisplayTab('vector_svg')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${mainDisplayTab === 'vector_svg' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Chỉ Bản vẽ lại
            </button>
            <button
              onClick={() => setMainDisplayTab('simulation_3d')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${mainDisplayTab === 'simulation_3d' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Chỉ Mô hình 3D động
            </button>
          </div>

          {/* Action buttons: Tải PNG 2K, Tải SVG, Copy SVG, Word */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 transition-all cursor-pointer"
              title="Tải ảnh PNG độ phân giải 2K cực sắc nét"
            >
              <Download className="w-3.5 h-3.5 inline mr-1" /> PNG 2K
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
              title="Tải file vector SVG không vỡ nét"
            >
              <Download className="w-3.5 h-3.5 inline mr-1" /> SVG
            </button>

            <button
              type="button"
              onClick={handleCopySvg}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Sao chép toàn bộ mã SVG"
            >
              {copyStatus === 'svg' ? <Check className="w-3.5 h-3.5 inline mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 inline mr-1" />}
              {copyStatus === 'svg' ? 'Đã chép' : 'Chép SVG'}
            </button>

            {currentItem.tikzCode && (
              <button
                type="button"
                onClick={handleCopyTikz}
                className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold border border-purple-200 transition-all cursor-pointer"
                title="Sao chép mã TikZ LaTeX"
              >
                {copyStatus === 'tikz' ? <Check className="w-3.5 h-3.5 inline mr-1 text-purple-600" /> : <Copy className="w-3.5 h-3.5 inline mr-1" />}
                TikZ
              </button>
            )}

            <button
              type="button"
              onClick={handleExportDocx}
              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
              title="Xuất tài liệu Word kèm hình vẽ"
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" /> Word (.doc)
            </button>

            {onInsertToExam && (
              <button
                type="button"
                onClick={() => {
                  const svgBase64 = btoa(unescape(encodeURIComponent(renderMode === 'color' ? currentItem.colorSvg : currentItem.bwSvg)));
                  onInsertToExam(`\n\n<svg-wrapper data-svg="${svgBase64}"></svg-wrapper>\n\n`);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Chèn vào Đề thi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {aiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* VÙNG HIỂN THỊ NỘI DUNG CHÍNH (BẢN VẼ LẠI & MÔ HÌNH 3D ĐỘNG) */}
      <div id="reproduced-math-export-wrap" className="space-y-6">
        {/* KHUNG HIỂN THỊ HÌNH VẼ LẠI & MÔ HÌNH 3D */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CỘT 1: HÌNH VẼ LẠI CHÍNH XÁC 100% THEO ẢNH (COLOR / B&W) */}
          {(mainDisplayTab === 'vector_svg' || mainDisplayTab === 'both') && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Bản vẽ lại vector ({renderMode === 'color' ? 'Màu sắc gốc SGK' : 'Đen trắng in ấn'})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Chính xác 100% tỉ lệ hình học
                  </span>
                </div>

                {/* SVG Render Container */}
                <div 
                  className={`w-full overflow-hidden rounded-xl border flex items-center justify-center p-2 min-h-[360px] ${
                    renderMode === 'color' 
                      ? 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800' 
                      : 'bg-white border-slate-300'
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: renderMode === 'color' ? currentItem.colorSvg : currentItem.bwSvg 
                  }}
                />
              </div>

              {/* Ghi chú dưới chân hình vẽ */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Font chữ nhãn: <em>Times New Roman</em> chuẩn SGK Toán Việt Nam</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Vector SVG sắc nét vô hạn</span>
              </div>
            </div>
          )}

          {/* CỘT 2: MÔ HÌNH ĐỘNG 3D TƯƠNG TÁC (THREE.JS WEBGL) */}
          {(mainDisplayTab === 'simulation_3d' || mainDisplayTab === 'both') && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Mô hình động 3D tương tác (Xoay 360° & Gấp từng bước)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    WebGL 3D Engine
                  </span>
                </div>

                {/* Three.js Canvas Container */}
                <div 
                  ref={threeMountRef} 
                  className="w-full h-[360px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-50 dark:bg-slate-950 cursor-grab active:cursor-grabbing"
                  title="Dùng chuột kéo để xoay 360°, lăn chuột để zoom xa/gần"
                />

                {/* THANH ĐIỀU KHIỂN CHUYỂN ĐỘNG / SLIDER TIẾN TRÌNH */}
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3">
                  
                  {/* Trường hợp bài toán Gấp hộp: Điều khiển slider tiến trình 0..100% */}
                  {(currentItem.mathModel.type === 'paper_folding_flower' || currentItem.mathModel.type === 'cylinder_box') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          Tiến trình gập giấy: <strong>{animProgress}%</strong>
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {animProgress < 10 ? 'Trải phẳng ban đầu' : animProgress < 50 ? 'Gập đứng các vách hộp' : 'Khép kín thành hộp hoàn chỉnh'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(prev => !prev)}
                          className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                            isPlaying ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{isPlaying ? 'Tạm dừng' : 'Chạy gấp động'}</span>
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={animProgress}
                          onChange={e => {
                            setAnimProgress(Number(e.target.value));
                            setIsPlaying(false);
                          }}
                          className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setAnimProgress(0);
                            setIsPlaying(false);
                          }}
                          className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 rounded-lg hover:bg-slate-200 cursor-pointer"
                          title="Trở về trạng thái phẳng ban đầu"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Trường hợp bài toán xoắn ốc (Câu 591, 592): Điều khiển lát cắt Ox */}
                  {(currentItem.mathModel.type === 'twisted_hexagon' || currentItem.mathModel.type === 'twisted_cross') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-orange-600" />
                          Mặt phẳng cắt tại hoành độ: <strong>x = {sliceX.toFixed(1)} cm</strong> (trong [0; 20])
                        </span>
                        <span className="text-orange-700 font-bold text-[11px] bg-orange-100 dark:bg-orange-950 px-2 py-0.5 rounded">
                          Kích thước y(x) = {(9 - sliceX / 6).toFixed(2)} cm
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">x = 0</span>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={sliceX}
                          onChange={e => setSliceX(Number(e.target.value))}
                          className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                        <span className="text-xs font-bold text-slate-500">x = 20</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Mẹo tương tác */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                <span>💡 Kéo chuột để xoay 360°, cuộn bánh xe để phóng to/thu nhỏ</span>
                <span className="text-emerald-600 font-bold">Mô hình 3D thời gian thực</span>
              </div>
            </div>
          )}

        </div>

        {/* BẢNG QUY TRÌNH TỪNG BƯỚC & PHÂN TÍCH TOÁN HỌC CHUYÊN SÂU */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CỘT 1 & 2: NỘI DUNG ĐỀ BÀI VÀ PHÂN TÍCH LỜI GIẢI CỰC TRỊ */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Box className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Nội dung đề bài & Phân tích toán học chuyên sâu
              </h3>
            </div>

            {/* Đề bài */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Đề bài chuẩn hóa:
              </h4>
              <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <MarkdownRenderer content={currentItem.questionText} />
              </div>
            </div>

            {/* Công thức toán học & Lời giải */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">
                  Công thức thể tích
                </span>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                  <MathSpan content={`$${currentItem.mathModel.formula}$`} />
                </div>
              </div>

              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900">
                <h5 className="font-bold text-xs uppercase tracking-wide text-blue-900 dark:text-blue-300 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Phương pháp giải & Đánh giá cực trị:
                </h5>
                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                  <MarkdownRenderer content={currentItem.mathModel.optimalSolution} />
                </div>
              </div>
            </div>
          </div>

          {/* CỘT 3: CÁC BƯỚC GẤP & MÔ TẢ QUY TRÌNH */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Scissors className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Các bước thực hiện
              </h3>
            </div>

            <div className="space-y-3">
              {currentItem.steps.map((st, sIdx) => (
                <div 
                  key={st.step}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    animProgress >= ((sIdx + 1) / currentItem.steps.length) * 80
                      ? 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800'
                      : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {st.step}
                    </span>
                    <strong className="text-slate-900 dark:text-white font-bold">{st.title}</strong>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-7">
                    {st.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <strong className="block font-bold">✨ Ý nghĩa sư phạm:</strong>
              <p className="leading-relaxed">
                Mô hình động giúp học sinh kết nối trực tiếp giữa <strong>hình học phẳng</strong> (tấm bìa trải lưới 2D) và <strong>hình học không gian</strong> (chiếc hộp 3D), giải quyết triệt để sự trừu tượng trong các câu hỏi vận dụng cao.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
