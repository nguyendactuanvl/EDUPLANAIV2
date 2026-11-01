import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  Layers, 
  Award, 
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { MatrixRowItem } from '../../data/matrixLibraryData';
import { countMatrixCommands, countMatrixScore } from '../CompetencyMatrixModal';

interface MatrixVisualChartsProps {
  matrixData: MatrixRowItem[];
  competencyHeaders: {
    c1: string;
    c2: string;
    c3: string;
  };
  targetRatio?: {
    biet: number;
    hieu: number;
    vd: number;
    vdc?: number;
  };
  totalPoints?: number;
  subjectName?: string;
  grade?: string;
  title?: string;
}

const COGNITIVE_COLORS = {
  biet: '#3B82F6',   // Blue
  hieu: '#F59E0B',   // Amber
  vd: '#EF4444',     // Rose / Red
  vdc: '#8B5CF6'     // Purple
};

const COMPETENCY_COLORS = {
  c1: '#6366F1',     // Indigo
  c2: '#10B981',     // Emerald
  c3: '#EC4899'      // Pink
};

const QUESTION_TYPE_COLORS = {
  part1: '#3B82F6',  // Blue
  part2: '#8B5CF6',  // Violet
  part3: '#06B6D4',  // Cyan
  essay: '#F43F5E'   // Rose
};

export function MatrixVisualCharts({
  matrixData,
  competencyHeaders,
  targetRatio = { biet: 40, hieu: 30, vd: 20, vdc: 10 },
  totalPoints = 10,
  subjectName = 'Toán học',
  grade = '11',
  title = 'Đề kiểm tra'
}: MatrixVisualChartsProps) {

  // Calculate detailed stats
  const analytics = useMemo(() => {
    let c1BietCount = 0; let c1BietScore = 0;
    let c1HieuCount = 0; let c1HieuScore = 0;
    let c1VdCount = 0;   let c1VdScore = 0;

    let c2BietCount = 0; let c2BietScore = 0;
    let c2HieuCount = 0; let c2HieuScore = 0;
    let c2VdCount = 0;   let c2VdScore = 0;

    let c3BietCount = 0; let c3BietScore = 0;
    let c3HieuCount = 0; let c3HieuScore = 0;
    let c3VdCount = 0;   let c3VdScore = 0;

    let part1Count = 0; let part1Score = 0;
    let part2Count = 0; let part2Score = 0;
    let part3Count = 0; let part3Score = 0;
    let essayCount = 0; let essayScore = 0;

    // By topic
    const topicMap: Record<string, { count: number; score: number }> = {};

    matrixData.forEach(row => {
      const topicKey = row.topic || 'Chủ đề khác';
      if (!topicMap[topicKey]) {
        topicMap[topicKey] = { count: 0, score: 0 };
      }

      const countAndClassify = (str: string, compId: 'c1' | 'c2' | 'c3', level: 'biet' | 'hieu' | 'vd') => {
        if (!str || !str.trim()) return;
        const cmds = str.split(',').map(s => s.trim()).filter(Boolean);
        cmds.forEach(cmd => {
          const c = /II\.\d+[a-d]{4}/i.test(cmd) ? 4 : /II\.\d+[a-d]{2}/i.test(cmd) ? 2 : 1;
          let s = 0.25;
          if (/^I\.\d+/i.test(cmd)) {
            s = 0.25;
            part1Count += c;
            part1Score += s;
          } else if (/^II\.\d+/i.test(cmd)) {
            s = /II\.\d+[a-d]{2}/i.test(cmd) ? 0.5 : 0.25;
            part2Count += c;
            part2Score += s;
          } else if (/^III\.\d+/i.test(cmd)) {
            s = 0.5;
            part3Count += c;
            part3Score += s;
          } else if (/^TL\d+/i.test(cmd)) {
            s = 1.0;
            essayCount += c;
            essayScore += s;
          } else {
            part1Count += c;
            part1Score += s;
          }

          topicMap[topicKey].count += c;
          topicMap[topicKey].score += s;

          if (compId === 'c1') {
            if (level === 'biet') { c1BietCount += c; c1BietScore += s; }
            else if (level === 'hieu') { c1HieuCount += c; c1HieuScore += s; }
            else { c1VdCount += c; c1VdScore += s; }
          } else if (compId === 'c2') {
            if (level === 'biet') { c2BietCount += c; c2BietScore += s; }
            else if (level === 'hieu') { c2HieuCount += c; c2HieuScore += s; }
            else { c2VdCount += c; c2VdScore += s; }
          } else {
            if (level === 'biet') { c3BietCount += c; c3BietScore += s; }
            else if (level === 'hieu') { c3HieuCount += c; c3HieuScore += s; }
            else { c3VdCount += c; c3VdScore += s; }
          }
        });
      };

      countAndClassify(row.gqvd?.biet || '', 'c1', 'biet');
      countAndClassify(row.gqvd?.hieu || '', 'c1', 'hieu');
      countAndClassify(row.gqvd?.vd || '', 'c1', 'vd');

      countAndClassify(row.tuduy?.biet || '', 'c2', 'biet');
      countAndClassify(row.tuduy?.hieu || '', 'c2', 'hieu');
      countAndClassify(row.tuduy?.vd || '', 'c2', 'vd');

      countAndClassify(row.mohinh?.biet || '', 'c3', 'biet');
      countAndClassify(row.mohinh?.hieu || '', 'c3', 'hieu');
      countAndClassify(row.mohinh?.vd || '', 'c3', 'vd');
    });

    const bietScoreTotal = c1BietScore + c2BietScore + c3BietScore;
    const hieuScoreTotal = c1HieuScore + c2HieuScore + c3HieuScore;
    const vdScoreTotal = c1VdScore + c2VdScore + c3VdScore;

    const bietCountTotal = c1BietCount + c2BietCount + c3BietCount;
    const hieuCountTotal = c1HieuCount + c2HieuCount + c3HieuCount;
    const vdCountTotal = c1VdCount + c2VdCount + c3VdCount;

    const computedTotalScore = Math.max(0.1, Math.round((bietScoreTotal + hieuScoreTotal + vdScoreTotal) * 100) / 100);
    const computedTotalCommands = bietCountTotal + hieuCountTotal + vdCountTotal;

    const bietPct = Math.round((bietScoreTotal / computedTotalScore) * 100);
    const hieuPct = Math.round((hieuScoreTotal / computedTotalScore) * 100);
    const vdPct = Math.max(0, 100 - bietPct - hieuPct);

    // Data for Donut chart: Cognitive levels
    const cognitiveDonutData = [
      { name: 'Nhận biết', value: Math.round(bietScoreTotal * 100) / 100, percent: bietPct, count: bietCountTotal, color: COGNITIVE_COLORS.biet },
      { name: 'Thông hiểu', value: Math.round(hieuScoreTotal * 100) / 100, percent: hieuPct, count: hieuCountTotal, color: COGNITIVE_COLORS.hieu },
      { name: 'Vận dụng', value: Math.round(vdScoreTotal * 100) / 100, percent: vdPct, count: vdCountTotal, color: COGNITIVE_COLORS.vd }
    ];

    // Data for Comparison Bar chart: Actual vs Target
    const comparisonBarData = [
      {
        level: 'Nhận biết',
        'Thực tế (%)': bietPct,
        'Mục tiêu GDPT 2018 (%)': targetRatio.biet,
        score: bietScoreTotal.toFixed(2),
        count: bietCountTotal
      },
      {
        level: 'Thông hiểu',
        'Thực tế (%)': hieuPct,
        'Mục tiêu GDPT 2018 (%)': targetRatio.hieu,
        score: hieuScoreTotal.toFixed(2),
        count: hieuCountTotal
      },
      {
        level: 'Vận dụng',
        'Thực tế (%)': vdPct,
        'Mục tiêu GDPT 2018 (%)': targetRatio.vd + (targetRatio.vdc || 0),
        score: vdScoreTotal.toFixed(2),
        count: vdCountTotal
      }
    ];

    // Competency breakdown
    const c1TotalScore = c1BietScore + c1HieuScore + c1VdScore;
    const c2TotalScore = c2BietScore + c2HieuScore + c2VdScore;
    const c3TotalScore = c3BietScore + c3HieuScore + c3VdScore;

    const competencyBarData = [
      {
        name: competencyHeaders.c1,
        'Biết': Math.round(c1BietScore * 100) / 100,
        'Hiểu': Math.round(c1HieuScore * 100) / 100,
        'Vận dụng': Math.round(c1VdScore * 100) / 100,
        totalScore: Math.round(c1TotalScore * 100) / 100,
        percent: Math.round((c1TotalScore / computedTotalScore) * 100)
      },
      {
        name: competencyHeaders.c2,
        'Biết': Math.round(c2BietScore * 100) / 100,
        'Hiểu': Math.round(c2HieuScore * 100) / 100,
        'Vận dụng': Math.round(c2VdScore * 100) / 100,
        totalScore: Math.round(c2TotalScore * 100) / 100,
        percent: Math.round((c2TotalScore / computedTotalScore) * 100)
      },
      {
        name: competencyHeaders.c3,
        'Biết': Math.round(c3BietScore * 100) / 100,
        'Hiểu': Math.round(c3HieuScore * 100) / 100,
        'Vận dụng': Math.round(c3VdScore * 100) / 100,
        totalScore: Math.round(c3TotalScore * 100) / 100,
        percent: Math.round((c3TotalScore / computedTotalScore) * 100)
      }
    ];

    // Question type format distribution
    const questionTypeData = [
      { name: 'Phần I (TN 4 lựa chọn)', count: part1Count, score: Math.round(part1Score * 100) / 100, color: QUESTION_TYPE_COLORS.part1 },
      { name: 'Phần II (Đúng/Sai)', count: part2Count, score: Math.round(part2Score * 100) / 100, color: QUESTION_TYPE_COLORS.part2 },
      { name: 'Phần III (Trả lời ngắn)', count: part3Count, score: Math.round(part3Score * 100) / 100, color: QUESTION_TYPE_COLORS.part3 },
      { name: 'Phần IV (Tự luận)', count: essayCount, score: Math.round(essayScore * 100) / 100, color: QUESTION_TYPE_COLORS.essay }
    ].filter(q => q.count > 0 || q.score > 0);

    // Topic distribution data
    const topicData = Object.entries(topicMap).map(([topic, val]) => ({
      name: topic.length > 28 ? topic.slice(0, 26) + '...' : topic,
      fullName: topic,
      count: val.count,
      score: Math.round(val.score * 100) / 100,
      percent: Math.round((val.score / computedTotalScore) * 100)
    }));

    // Compliance assessment
    const bietDelta = Math.abs(bietPct - targetRatio.biet);
    const hieuDelta = Math.abs(hieuPct - targetRatio.hieu);
    const vdTarget = targetRatio.vd + (targetRatio.vdc || 0);
    const vdDelta = Math.abs(vdPct - vdTarget);
    const maxDelta = Math.max(bietDelta, hieuDelta, vdDelta);

    let complianceStatus: 'optimal' | 'acceptable' | 'skewed' = 'optimal';
    if (maxDelta > 15) {
      complianceStatus = 'skewed';
    } else if (maxDelta > 5) {
      complianceStatus = 'acceptable';
    }

    return {
      computedTotalScore,
      computedTotalCommands,
      cognitiveDonutData,
      comparisonBarData,
      competencyBarData,
      questionTypeData,
      topicData,
      bietPct,
      hieuPct,
      vdPct,
      bietScoreTotal,
      hieuScoreTotal,
      vdScoreTotal,
      complianceStatus,
      maxDelta
    };
  }, [matrixData, competencyHeaders, targetRatio]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng điểm */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Tổng thang điểm</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {analytics.computedTotalScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 10.0đ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Quy chuẩn $100\%$ đề thi GDPT 2018
          </div>
        </div>

        {/* Card 2: Tổng lệnh hỏi */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Tổng số lệnh hỏi</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {analytics.computedTotalCommands} <span className="text-xs font-normal text-slate-400">lệnh hỏi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Phân bổ trên {matrixData.length} đơn vị kiến thức
          </div>
        </div>

        {/* Card 3: Tỉ lệ Nhận thức thực tế */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Tỉ lệ Nhận thức thực tế</span>
            <PieIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1">
            <span className="text-blue-600">{analytics.bietPct}%</span> : 
            <span className="text-amber-500">{analytics.hieuPct}%</span> : 
            <span className="text-rose-600">{analytics.vdPct}%</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Biết : Hiểu : Vận dụng
          </div>
        </div>

        {/* Card 4: Đánh giá độ chuẩn hóa */}
        <div className={`p-4 rounded-2xl border shadow-2xs ${
          analytics.complianceStatus === 'optimal'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : analytics.complianceStatus === 'acceptable'
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={
              analytics.complianceStatus === 'optimal' ? 'text-emerald-800 dark:text-emerald-300' :
              analytics.complianceStatus === 'acceptable' ? 'text-amber-800 dark:text-amber-300' : 'text-rose-800 dark:text-rose-300'
            }>Chuẩn hóa GDPT 2018</span>
            {analytics.complianceStatus === 'optimal' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="text-base font-extrabold text-slate-900 dark:text-white">
            {analytics.complianceStatus === 'optimal' ? 'Hoàn hảo ($100\\%$)' :
             analytics.complianceStatus === 'acceptable' ? 'Đạt yêu cầu (Lệch ' + analytics.maxDelta + '%)' :
             'Cần cân đối lại'}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Mục tiêu: {targetRatio.biet}% - {targetRatio.hieu}% - {targetRatio.vd + (targetRatio.vdc || 0)}%
          </div>
        </div>
      </div>

      {/* 2. Visual Charts Row 1: Donut (Cognitive Levels) & Comparison Bar (Actual vs Target) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Biểu đồ Donut: Tỉ lệ cấp độ nhận thức */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <span>Biểu đồ Phân bổ Cấp độ Tư duy & Điểm số</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Cơ cấu điểm số và tỷ lệ phần trăm giữa Nhận biết, Thông hiểu và Vận dụng
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Tổng {analytics.computedTotalScore.toFixed(1)}đ
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.cognitiveDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${percent}%`}
                >
                  {analytics.cognitiveDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any, item: any) => [
                    `${val} điểm (${item.payload.percent}% - ${item.payload.count} lệnh hỏi)`, 
                    name
                  ]}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 text-center text-xs">
            <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/20">
              <span className="font-bold text-blue-700 block">Nhận biết</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{analytics.bietScoreTotal.toFixed(2)}đ</span>
              <span className="text-[10px] text-slate-500 block">({analytics.bietPct}%)</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20">
              <span className="font-bold text-amber-700 block">Thông hiểu</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{analytics.hieuScoreTotal.toFixed(2)}đ</span>
              <span className="text-[10px] text-slate-500 block">({analytics.hieuPct}%)</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/20">
              <span className="font-bold text-rose-700 block">Vận dụng</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{analytics.vdScoreTotal.toFixed(2)}đ</span>
              <span className="text-[10px] text-slate-500 block">({analytics.vdPct}%)</span>
            </div>
          </div>
        </div>

        {/* Biểu đồ Cột: Đối chiếu Thực tế vs Mục tiêu chuẩn GDPT 2018 */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Đối chiếu Tỉ lệ Thực tế vs Mục tiêu GDPT 2018</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm soát độ lệch chuẩn giữa phân bổ câu hỏi thiết kế và khung yêu cầu
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.comparisonBarData}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="level" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 60]} />
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="Thực tế (%)" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Mục tiêu GDPT 2018 (%)" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hướng dẫn sư phạm */}
          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-xs flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-slate-600 dark:text-slate-300">
              <strong>Đánh giá chuẩn hóa:</strong> {analytics.complianceStatus === 'optimal'
                ? 'Tỉ lệ phân bổ mức độ nhận thức khớp chuẩn hoàn hảo với mục tiêu đề ra.'
                : analytics.complianceStatus === 'acceptable'
                ? 'Tỉ lệ chấp nhận được trong biên độ cho phép (±5%).'
                : 'Mức độ nhận thức đang bị lệch khá nhiều. Khuyến nghị dùng chế độ Kéo-Thả hoặc nút "AI Đề xuất" để cân đối lại.'}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Visual Charts Row 2: Competency Breakdown & Question Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Biểu đồ Cột chồng: Phân bổ 3 Năng lực Cốt lõi */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="mb-4">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Phân bổ theo Nhóm Năng lực Cốt lõi ({subjectName})</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Tỉ trọng điểm số các năng lực thành phần được kiểm tra đánh giá
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.competencyBarData}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis unit="đ" tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} điểm`, name]}
                />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="Biết" stackId="a" fill={COGNITIVE_COLORS.biet} />
                <Bar dataKey="Hiểu" stackId="a" fill={COGNITIVE_COLORS.hieu} />
                <Bar dataKey="Vận dụng" stackId="a" fill={COGNITIVE_COLORS.vd} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
            {analytics.competencyBarData.map((c, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span className="font-bold text-slate-700 dark:text-slate-200 block truncate" title={c.name}>{c.name}</span>
                <span className="text-indigo-600 font-extrabold">{c.totalScore.toFixed(2)}đ</span>
                <span className="text-[10px] text-slate-400 block">({c.percent}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Biểu đồ Cột ngang: Cơ cấu Điểm theo Hình thức câu hỏi */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="mb-4">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <span>Cơ cấu Hình thức Câu hỏi & Thang điểm</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Phần I (TNKQ), Phần II (Đúng/Sai), Phần III (Trả lời ngắn), Phần IV (Tự luận)
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={analytics.questionTypeData}
                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" unit="đ" domain={[0, 6]} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 600 }} width={120} />
                <Tooltip formatter={(value: any, name: any, item: any) => [`${value} điểm (${item.payload.count} lệnh hỏi)`, 'Điểm số']} />
                <Bar dataKey="score" fill="#8B5CF6" radius={[0, 6, 6, 0]}>
                  {analytics.questionTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 text-xs justify-between">
            {analytics.questionTypeData.map((q, i) => (
              <div key={i} className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: q.color }} />
                <span>{q.name}:</span>
                <span className="text-slate-900 dark:text-white font-mono">{q.score}đ ({q.count} câu)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Visual Chart Row 3: Point Allocation per Topic */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Phân bổ Điểm số theo Từng Mạch Kiến thức / Chủ đề</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Đảm bảo tính bao quát và cân đối nội dung dạy học trong toàn bộ đề thi
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {analytics.topicData.length} chủ đề
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analytics.topicData}
              margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fontWeight: 600 }} 
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis unit="đ" tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => [
                  `${val} điểm (${item.payload.percent}% - ${item.payload.count} lệnh hỏi)`, 
                  'Điểm số chủ đề'
                ]}
                labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
              />
              <Bar dataKey="score" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
