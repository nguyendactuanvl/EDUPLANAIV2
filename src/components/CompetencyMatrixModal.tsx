import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Printer, Download, Sparkles, Check, Copy, RefreshCw, FileText, 
  FileSpreadsheet, Eye, ChevronDown, ChevronRight, Edit3, Plus, Trash2, 
  BookOpen, Search, Filter, Layers, CheckCircle2, Bookmark, ArrowRight,
  GraduationCap, HelpCircle, Save, RotateCcw, BarChart3, Upload, Move,
  PieChart as PieIcon, FolderHeart, Cloud, School
} from 'lucide-react';
import { exportHtmlToWord } from '../lib/exportUtils';
import * as XLSX from 'xlsx';
import { 
  ALL_MATRIX_TEMPLATES, 
  ExamMatrixTemplate, 
  TEMPLATE_TOAN_11_GK1,
  TEMPLATE_TOAN_12_GK1,
  MatrixRowItem,
  SpecUnitItem,
  SAMPLE_COMPETENCY_MATRIX_11,
  SAMPLE_SPEC_LIST_11
} from '../data/matrixLibraryData';
import { AiMatrixSuggestModal } from './AiMatrixSuggestModal';
import { MatrixVisualCharts } from './matrix/MatrixVisualCharts';
import { MatrixDragDropConfigurator } from './matrix/MatrixDragDropConfigurator';
import { GoogleDriveMatrixModal } from './GoogleDriveMatrixModal';
import { autoSaveMatrixToGoogleDrive } from '../lib/googleDrive';
import { getCachedToken } from '../lib/googleAuth';
import { HeaderConfigModal } from './HeaderConfigModal';
import { HeaderConfig, getHeaderConfig, saveHeaderConfig } from '../lib/headerConfig';

// Re-export for external consumers
export type { MatrixRowItem, SpecUnitItem };
export { SAMPLE_COMPETENCY_MATRIX_11, SAMPLE_SPEC_LIST_11 };

// ============================================================================
// HELPER ĐẾM SỐ LỆNH HỎI & ĐIỂM
// ============================================================================

export function countMatrixCommands(codeStr: string): number {
  if (!codeStr || !codeStr.trim()) return 0;
  let count = 0;
  const parts = codeStr.split(',').map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (/II\.\d+[a-d]{2}/i.test(p)) {
      count += 2;
    } else if (/II\.\d+[a-d]{4}/i.test(p)) {
      count += 4;
    } else {
      count += 1;
    }
  }
  return count;
}

export function countMatrixScore(codeStr: string): number {
  if (!codeStr || !codeStr.trim()) return 0;
  let score = 0;
  const parts = codeStr.split(',').map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (/^I\.\d+/i.test(p)) {
      score += 0.25;
    } else if (/^II\.\d+[a-d]{2}/i.test(p)) {
      score += 0.5;
    } else if (/^II\.\d+[a-d]/i.test(p)) {
      score += 0.25;
    } else if (/^III\.\d+/i.test(p)) {
      score += 0.5;
    } else if (/^TL\d+/i.test(p)) {
      score += 1.0;
    } else {
      score += 0.25;
    }
  }
  return score;
}

// ============================================================================
// MODAL CHÍNH: CompetencyMatrixModal
// ============================================================================

interface CompetencyMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle?: string;
  initialTab?: 'library' | 'drag_drop' | 'matrix' | 'charts' | 'spec' | 'both';
  initialTemplateId?: string;
  onApplyToExam?: (config: {
    examName: string;
    subject?: string;
    grade: string;
    qCounts: { mc: number; tf: number; sa: number; essay: number };
    totalPoints: number;
    topics: string[];
    matrixRows?: MatrixRowItem[];
    specUnits?: SpecUnitItem[];
  }) => void;
  onLoadSampleExamQuestions?: () => void;
}

export function CompetencyMatrixModal({
  isOpen,
  onClose,
  examTitle = "ĐỀ KIỂM TRA GIỮA HỌC KÌ I MÔN TOÁN - KHỐI 11 NĂM HỌC 2025-2026",
  initialTab = 'library',
  initialTemplateId,
  onApplyToExam,
  onLoadSampleExamQuestions
}: CompetencyMatrixModalProps) {
  // Current active template
  const [currentTemplate, setCurrentTemplate] = useState<ExamMatrixTemplate>(() => {
    if (initialTemplateId) {
      const found = ALL_MATRIX_TEMPLATES.find(t => t.id === initialTemplateId);
      if (found) return found;
    }
    if (examTitle && (examTitle.includes('12') || examTitle.includes('Khối 12') || examTitle.includes('Lớp 12'))) {
      return TEMPLATE_TOAN_12_GK1;
    }
    return TEMPLATE_TOAN_11_GK1;
  });

  const [title, setTitle] = useState(examTitle || currentTemplate.title);
  const [matrixData, setMatrixData] = useState<MatrixRowItem[]>(currentTemplate.matrixRows);
  const [specData, setSpecData] = useState<SpecUnitItem[]>(currentTemplate.specUnits);
  
  // Navigation tab inside modal: library | drag_drop | matrix | charts | spec | both
  const [activeViewTab, setActiveViewTab] = useState<'library' | 'drag_drop' | 'matrix' | 'charts' | 'spec' | 'both'>(initialTab);
  
  // Custom templates stored in localStorage
  const [customTemplates, setCustomTemplates] = useState<ExamMatrixTemplate[]>(() => {
    try {
      const raw = localStorage.getItem('eduplan_custom_matrix_templates');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Filter & Search states in Library tab
  const [originFilter, setOriginFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [showWordExportDropdown, setShowWordExportDropdown] = useState<boolean>(false);

  // Auto-save to Google Drive states (30s debounce)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef<boolean>(true);

  // Modal save current matrix as custom template
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [saveTemplateName, setSaveTemplateName] = useState<string>('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState<string>('');

  // 30-second debounced auto-save effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const token = getCachedToken();
    if (!token) return;

    setAutoSaveStatus('pending');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const constructedTemplate: ExamMatrixTemplate = {
        ...currentTemplate,
        title,
        matrixRows: matrixData,
        specUnits: specData
      };

      const result = await autoSaveMatrixToGoogleDrive(constructedTemplate, title);
      if (result) {
        setAutoSaveStatus('saved');
        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastAutoSaveTime(nowStr);
      } else {
        setAutoSaveStatus('error');
      }
    }, 30000); // 30s delay after last edit

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [matrixData, specData, title]);

  // Sync state when template changes
  const handleSelectTemplate = (template: ExamMatrixTemplate, targetTab: 'matrix' | 'drag_drop' = 'matrix') => {
    setCurrentTemplate(template);
    setTitle(template.title);
    setMatrixData(JSON.parse(JSON.stringify(template.matrixRows)));
    setSpecData(JSON.parse(JSON.stringify(template.specUnits)));
    setActiveViewTab(targetTab);
    setAppliedNotification(`Đã tải mẫu ma trận: ${template.title}`);
    setTimeout(() => setAppliedNotification(null), 3000);
  };

  // Sync state when AI proposes a matrix
  const handleApplyFromAi = (suggestedData: any, directToExam?: boolean) => {
    setCurrentTemplate(suggestedData.template);
    setMatrixData(suggestedData.matrixRows);
    setSpecData(suggestedData.specUnits);
    setTitle(suggestedData.title);
    setShowAiModal(false);
    if (directToExam) {
      handleApplyConfig(suggestedData.template);
    } else {
      setActiveViewTab('matrix');
      setAppliedNotification('✨ Đã nạp Ma trận & Bản đặc tả được AI đề xuất thành công!');
      setTimeout(() => setAppliedNotification(null), 3500);
    }
  };

  // Save current matrix into my templates
  const handleSaveCurrentAsCustomTemplate = () => {
    const newTpl: ExamMatrixTemplate = {
      id: `custom_matrix_${Date.now()}`,
      subjectId: currentTemplate.subjectId,
      subjectName: currentTemplate.subjectName,
      grade: currentTemplate.grade,
      semester: currentTemplate.semester,
      title: saveTemplateName.trim() || title,
      badge: 'Mẫu cá nhân của GV',
      description: saveTemplateDesc.trim() || `Mẫu ma trận được thiết kế riêng cho môn ${currentTemplate.subjectName} Lớp ${currentTemplate.grade}.`,
      durationMinutes: currentTemplate.durationMinutes,
      totalPoints: currentTemplate.totalPoints,
      competencyHeaders: { ...currentTemplate.competencyHeaders },
      qCounts: { ...currentTemplate.qCounts },
      matrixRows: JSON.parse(JSON.stringify(matrixData)),
      specUnits: JSON.parse(JSON.stringify(specData)),
      topicsList: Array.from(new Set(matrixData.map(r => r.topic))).filter(Boolean)
    };

    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('eduplan_custom_matrix_templates', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setShowSaveTemplateModal(false);
    setSaveTemplateName('');
    setSaveTemplateDesc('');
    setAppliedNotification(`Đã lưu "${newTpl.title}" vào Thư viện mẫu cá nhân!`);
    setTimeout(() => setAppliedNotification(null), 3000);
  };

  // Delete custom template
  const handleDeleteCustomTemplate = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu ma trận này khỏi Thư viện cá nhân?')) {
      const updated = customTemplates.filter(t => t.id !== id);
      setCustomTemplates(updated);
      try {
        localStorage.setItem('eduplan_custom_matrix_templates', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      setAppliedNotification('Đã xóa mẫu ma trận thành công.');
      setTimeout(() => setAppliedNotification(null), 2500);
    }
  };

  // Export template as .json file
  const handleExportTemplateJson = (tpl: ExamMatrixTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tpl, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Mau_Ma_Tran_${tpl.subjectName}_${tpl.grade}_${tpl.title.replace(/\s+/g, '_')}.matrix.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    setAppliedNotification(`Đã xuất file mẫu JSON: ${tpl.title}`);
    setTimeout(() => setAppliedNotification(null), 2500);
  };

  // Import template from .json file
  const handleImportTemplateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !parsed.matrixRows || !Array.isArray(parsed.matrixRows)) {
          alert('Tệp mẫu ma trận không đúng cấu trúc quy định.');
          return;
        }
        const imported: ExamMatrixTemplate = {
          ...parsed,
          id: `imported_matrix_${Date.now()}`,
          badge: parsed.badge || 'Mẫu nhập từ file'
        };
        const updated = [imported, ...customTemplates];
        setCustomTemplates(updated);
        try {
          localStorage.setItem('eduplan_custom_matrix_templates', JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
        handleSelectTemplate(imported);
        setAppliedNotification(`Đã nạp và lưu thành công mẫu: ${imported.title}`);
        setTimeout(() => setAppliedNotification(null), 3000);
      } catch (err) {
        console.error(err);
        alert('Không thể đọc file mẫu. Vui lòng kiểm tra lại định dạng JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Combined list of templates (custom templates on top)
  const allAvailableTemplates = useMemo(() => {
    return [...customTemplates, ...ALL_MATRIX_TEMPLATES];
  }, [customTemplates]);

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    return allAvailableTemplates.filter(tpl => {
      const isCustom = tpl.id.startsWith('custom_') || tpl.id.startsWith('imported_');
      if (originFilter === 'custom' && !isCustom) return false;
      if (originFilter === 'system' && isCustom) return false;
      if (subjectFilter !== 'all' && tpl.subjectId !== subjectFilter) return false;
      if (gradeFilter !== 'all' && tpl.grade !== gradeFilter) return false;
      if (semesterFilter !== 'all' && tpl.semester !== semesterFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = tpl.title.toLowerCase().includes(q);
        const inSub = tpl.subjectName.toLowerCase().includes(q);
        const inDesc = tpl.description.toLowerCase().includes(q);
        const inTopics = tpl.topicsList?.some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inSub && !inDesc && !inTopics) return false;
      }
      return true;
    });
  }, [allAvailableTemplates, originFilter, subjectFilter, gradeFilter, semesterFilter, searchQuery]);

  if (!isOpen) return null;

  // Tính toán số lệnh hỏi và điểm động
  const calculateTotals = () => {
    let c1BietCount = 0; let c1BietScore = 0;
    let c1HieuCount = 0; let c1HieuScore = 0;
    let c1VdCount = 0;   let c1VdScore = 0;

    let c2BietCount = 0; let c2BietScore = 0;
    let c2HieuCount = 0; let c2HieuScore = 0;
    let c2VdCount = 0;   let c2VdScore = 0;

    let c3BietCount = 0; let c3BietScore = 0;
    let c3HieuCount = 0; let c3HieuScore = 0;
    let c3VdCount = 0;   let c3VdScore = 0;

    matrixData.forEach(row => {
      c1BietCount += countMatrixCommands(row.gqvd.biet);
      c1BietScore += countMatrixScore(row.gqvd.biet);
      c1HieuCount += countMatrixCommands(row.gqvd.hieu);
      c1HieuScore += countMatrixScore(row.gqvd.hieu);
      c1VdCount += countMatrixCommands(row.gqvd.vd);
      c1VdScore += countMatrixScore(row.gqvd.vd);

      c2BietCount += countMatrixCommands(row.tuduy.biet);
      c2BietScore += countMatrixScore(row.tuduy.biet);
      c2HieuCount += countMatrixCommands(row.tuduy.hieu);
      c2HieuScore += countMatrixScore(row.tuduy.hieu);
      c2VdCount += countMatrixCommands(row.tuduy.vd);
      c2VdScore += countMatrixScore(row.tuduy.vd);

      c3BietCount += countMatrixCommands(row.mohinh.biet);
      c3BietScore += countMatrixScore(row.mohinh.biet);
      c3HieuCount += countMatrixCommands(row.mohinh.hieu);
      c3HieuScore += countMatrixScore(row.mohinh.hieu);
      c3VdCount += countMatrixCommands(row.mohinh.vd);
      c3VdScore += countMatrixScore(row.mohinh.vd);
    });

    const totalQuestions = c1BietCount + c1HieuCount + c1VdCount +
      c2BietCount + c2HieuCount + c2VdCount +
      c3BietCount + c3HieuCount + c3VdCount;

    const totalScore = Math.round((
      c1BietScore + c1HieuScore + c1VdScore +
      c2BietScore + c2HieuScore + c2VdScore +
      c3BietScore + c3HieuScore + c3VdScore
    ) * 100) / 100;

    const bietTotalScore = c1BietScore + c2BietScore + c3BietScore;
    const hieuTotalScore = c1HieuScore + c2HieuScore + c3HieuScore;
    const vdTotalScore = c1VdScore + c2VdScore + c3VdScore;

    return {
      counts: {
        c1: { biet: c1BietCount, hieu: c1HieuCount, vd: c1VdCount },
        c2: { biet: c2BietCount, hieu: c2HieuCount, vd: c2VdCount },
        c3: { biet: c3BietCount, hieu: c3HieuCount, vd: c3VdCount }
      },
      scores: {
        c1: { biet: c1BietScore, hieu: c1HieuScore, vd: c1VdScore },
        c2: { biet: c2BietScore, hieu: c2HieuScore, vd: c2VdScore },
        c3: { biet: c3BietScore, hieu: c3HieuScore, vd: c3VdScore }
      },
      cognitivePercent: {
        biet: totalScore > 0 ? Math.round((bietTotalScore / totalScore) * 100) : 40,
        hieu: totalScore > 0 ? Math.round((hieuTotalScore / totalScore) * 100) : 30,
        vd: totalScore > 0 ? Math.round((vdTotalScore / totalScore) * 100) : 30
      },
      totalQuestions: totalQuestions || currentTemplate.qCounts.mc + currentTemplate.qCounts.tf * 4 + currentTemplate.qCounts.sa + currentTemplate.qCounts.essay,
      totalScore: totalScore || 10
    };
  };

  const totals = calculateTotals();

  // Nhóm các hàng theo chủ đề
  const groupedTopics: { topic: string; rows: MatrixRowItem[] }[] = [];
  matrixData.forEach(item => {
    const existing = groupedTopics.find(g => g.topic === item.topic);
    if (existing) {
      existing.rows.push(item);
    } else {
      groupedTopics.push({ topic: item.topic, rows: [item] });
    }
  });

  // Cell editing
  const handleCellChange = (rowId: string, competency: 'gqvd' | 'tuduy' | 'mohinh', level: 'biet' | 'hieu' | 'vd', val: string) => {
    setMatrixData(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          [competency]: {
            ...r[competency],
            [level]: val
          }
        };
      }
      return r;
    }));
  };

  // Add row to matrix
  const handleAddRow = (topicName: string) => {
    const newId = `row_${Date.now()}`;
    const newRow: MatrixRowItem = {
      id: newId,
      topic: topicName || 'CHỦ ĐỀ MỚI',
      unit: `${matrixData.length + 1}. Nội dung kiến thức mới`,
      gqvd: { biet: '', hieu: '', vd: '' },
      tuduy: { biet: '', hieu: '', vd: '' },
      mohinh: { biet: '', hieu: '', vd: '' }
    };
    setMatrixData(prev => [...prev, newRow]);
  };

  // Delete row from matrix
  const handleDeleteRow = (rowId: string) => {
    if (matrixData.length <= 1) {
      alert('Ma trận phải có ít nhất 1 dòng đơn vị kiến thức.');
      return;
    }
    setMatrixData(prev => prev.filter(r => r.id !== rowId));
  };

  // Reset to original template
  const handleResetToTemplate = () => {
    if (window.confirm('Khôi phục lại toàn bộ nội dung ma trận & đặc tả theo mẫu chuẩn gốc của Bộ GD&ĐT?')) {
      setMatrixData(JSON.parse(JSON.stringify(currentTemplate.matrixRows)));
      setSpecData(JSON.parse(JSON.stringify(currentTemplate.specUnits)));
      setTitle(currentTemplate.title);
    }
  };

  // Export Word (.docx) chuẩn sư phạm Bộ GD&ĐT
  const handleExportWord = (scope: 'full' | 'matrix' | 'spec' = 'full', targetTemplate?: ExamMatrixTemplate) => {
    const tpl = targetTemplate || currentTemplate;
    setShowWordExportDropdown(false);

    let targetElId = 'pedagogical-matrix-full-export';
    let fileSuffix = 'Ma_Tran_Va_Ban_Dac_Ta';
    if (scope === 'matrix') {
      targetElId = 'pedagogical-matrix-only-export';
      fileSuffix = 'Ma_Tran';
    } else if (scope === 'spec') {
      targetElId = 'pedagogical-spec-only-export';
      fileSuffix = 'Ban_Dac_Ta';
    }

    let el = document.getElementById(targetElId);
    if (!el) {
      el = document.getElementById('competency-matrix-export-wrap');
    }
    if (!el) return;

    exportHtmlToWord(
      el,
      `${fileSuffix}_GDPT2018_${tpl.subjectName}_Lop${tpl.grade}_${title.replace(/\s+/g, '_')}.docx`
    );
  };

  // Export Excel (.xlsx)
  const handleExportExcel = (targetTemplate?: ExamMatrixTemplate) => {
    const tpl = targetTemplate || currentTemplate;
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ma trận
      const matrixAoa: any[][] = [
        [title.toUpperCase()],
        [`Môn học: ${tpl.subjectName} - Lớp: ${tpl.grade} - Thời gian làm bài: ${tpl.durationMinutes} phút`],
        [],
        [
          'TT', 
          'Chủ đề', 
          'Nội dung / Đơn vị kiến thức', 
          `${tpl.competencyHeaders.c1} - Biết`, 
          `${tpl.competencyHeaders.c1} - Hiểu`, 
          `${tpl.competencyHeaders.c1} - Vận dụng`, 
          `${tpl.competencyHeaders.c2} - Biết`, 
          `${tpl.competencyHeaders.c2} - Hiểu`, 
          `${tpl.competencyHeaders.c2} - Vận dụng`, 
          `${tpl.competencyHeaders.c3} - Biết`, 
          `${tpl.competencyHeaders.c3} - Hiểu`, 
          `${tpl.competencyHeaders.c3} - Vận dụng`,
          'Tổng số lệnh',
          'Điểm',
          'Tỉ lệ %'
        ]
      ];

      matrixData.forEach((r, idx) => {
        matrixAoa.push([
          idx + 1,
          r.topic,
          r.unit,
          r.gqvd.biet,
          r.gqvd.hieu,
          r.gqvd.vd,
          r.tuduy.biet,
          r.tuduy.hieu,
          r.tuduy.vd,
          r.mohinh.biet,
          r.mohinh.hieu,
          r.mohinh.vd,
          countMatrixCommands(r.gqvd.biet) + countMatrixCommands(r.gqvd.hieu) + countMatrixCommands(r.gqvd.vd) +
          countMatrixCommands(r.tuduy.biet) + countMatrixCommands(r.tuduy.hieu) + countMatrixCommands(r.tuduy.vd) +
          countMatrixCommands(r.mohinh.biet) + countMatrixCommands(r.mohinh.hieu) + countMatrixCommands(r.mohinh.vd),
          (countMatrixScore(r.gqvd.biet) + countMatrixScore(r.gqvd.hieu) + countMatrixScore(r.gqvd.vd) +
          countMatrixScore(r.tuduy.biet) + countMatrixScore(r.tuduy.hieu) + countMatrixScore(r.tuduy.vd) +
          countMatrixScore(r.mohinh.biet) + countMatrixScore(r.mohinh.hieu) + countMatrixScore(r.mohinh.vd)).toFixed(2),
          '10%'
        ]);
      });

      matrixAoa.push([
        'Tổng số lệnh hỏi',
        '',
        '',
        totals.counts.c1.biet,
        totals.counts.c1.hieu,
        totals.counts.c1.vd,
        totals.counts.c2.biet,
        totals.counts.c2.hieu,
        totals.counts.c2.vd,
        totals.counts.c3.biet,
        totals.counts.c3.hieu,
        totals.counts.c3.vd,
        totals.totalQuestions,
        `${totals.totalScore.toFixed(1)}đ`,
        '100%'
      ]);

      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixAoa);
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Ma_Tran_GDPT_2018');

      // Sheet 2: Bảng đặc tả
      const specAoa: any[][] = [
        [`BẢNG ĐẶC TẢ CHI TIẾT KĨ THUẬT ĐỀ KIỂM TRA MÔN ${tpl.subjectName.toUpperCase()}`],
        [],
        ['TT', 'Chủ đề', 'Đơn vị kiến thức', 'Nhận biết (Yêu cầu cần đạt)', 'Thông hiểu (Yêu cầu cần đạt)', 'Vận dụng (Yêu cầu cần đạt)', 'Phần I (TNKQ)', 'Phần II (Đúng/Sai)', 'Phần III (Trả lời ngắn)', 'Phần IV (Tự luận)', 'Điểm']
      ];

      specData.forEach((s, idx) => {
        specAoa.push([
          idx + 1,
          s.topic,
          s.unit,
          s.bietSpec,
          s.hieuSpec,
          s.vdSpec,
          s.assignedQuestions.part1,
          s.assignedQuestions.part2,
          s.assignedQuestions.part3,
          s.assignedQuestions.essay,
          s.points
        ]);
      });

      const wsSpec = XLSX.utils.aoa_to_sheet(specAoa);
      XLSX.utils.book_append_sheet(wb, wsSpec, 'Ban_Dac_Ta_Chi_Tiet');

      XLSX.writeFile(wb, `Ma_Tran_Va_Ban_Dac_Ta_${tpl.subjectId}_${tpl.grade}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    }
  };

  // Apply to Exam Generator
  const handleApplyConfig = (templateToApply?: ExamMatrixTemplate) => {
    const tpl = templateToApply || currentTemplate;
    if (onApplyToExam) {
      onApplyToExam({
        examName: title || tpl.title,
        subject: tpl.subjectName,
        grade: tpl.grade,
        qCounts: tpl.qCounts,
        totalPoints: tpl.totalPoints,
        topics: groupedTopics.map(g => g.topic),
        matrixRows: matrixData,
        specUnits: specData
      });
    }
    setAppliedNotification(`Đã đồng bộ ma trận môn ${tpl.subjectName} vào Đề thi thành công!`);
    setTimeout(() => {
      setAppliedNotification(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-md">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-xs">
                Thư viện Ma trận GDPT 2018
              </span>
              <span className="text-xs text-blue-100 font-semibold">
                Môn: <strong>{currentTemplate.subjectName}</strong> • Lớp {currentTemplate.grade} • {currentTemplate.semester}
              </span>
              <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded font-mono">
                {currentTemplate.durationMinutes} phút • {currentTemplate.totalPoints} điểm
              </span>
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="px-3 py-1 bg-white text-slate-900 rounded font-bold text-sm sm:text-base w-full max-w-xl"
                  autoFocus
                />
                <button onClick={() => setIsEditingTitle(false)} className="px-3 py-1 bg-emerald-600 rounded text-xs font-bold cursor-pointer">Lưu</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">{title}</h2>
                <button onClick={() => setIsEditingTitle(true)} className="p-1 hover:bg-white/10 rounded cursor-pointer text-slate-200" title="Chỉnh sửa tên đề thi">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Notification */}
          {appliedNotification && (
            <div className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>{appliedNotification}</span>
            </div>
          )}

          {/* Controls: Tải / Thoát */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWordExportDropdown(prev => !prev)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Tải tài liệu Word (.docx) chuẩn sư phạm Bộ GD&ĐT"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showWordExportDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showWordExportDropdown && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    Tải Word Chuẩn Sư Phạm (A4 Ngang)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportWord('full')}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/60 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-bold text-indigo-700 dark:text-indigo-300">Trọn bộ Ma trận & Đặc tả</div>
                      <div className="text-[10px] text-slate-500">Đầy đủ tiêu đề, 2 bảng chuẩn và chữ ký</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportWord('matrix')}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700/60 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-bold">Chỉ tải Bảng Ma trận</div>
                      <div className="text-[10px] text-slate-500">Khung ma trận năng lực 18 cột GDPT 2018</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportWord('spec')}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700/60 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold">Chỉ tải Bản đặc tả chi tiết</div>
                      <div className="text-[10px] text-slate-500">Yêu cầu cần đạt và phân bổ các phần thi</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => handleExportExcel()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Xuất file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs cursor-pointer"
              title="In hoặc lưu PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-2 sm:px-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setActiveViewTab('library')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeViewTab === 'library'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>📚 Thư viện Mẫu ({allAvailableTemplates.length})</span>
            </button>

            <button
              onClick={() => setActiveViewTab('drag_drop')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeViewTab === 'drag_drop'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm ring-1 ring-white/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Move className="w-4 h-4 text-amber-300" />
              <span>🔀 Kéo - Thả Cấu hình Ma trận</span>
            </button>

            <button
              onClick={() => setActiveViewTab('matrix')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeViewTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>📊 Ma trận Bảng số liệu</span>
            </button>

            <button
              onClick={() => setActiveViewTab('charts')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeViewTab === 'charts'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-300" />
              <span>📈 Trực quan hoá Biểu đồ GDPT 2018</span>
            </button>

            <button
              onClick={() => setActiveViewTab('spec')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeViewTab === 'spec'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>📋 Bảng đặc tả chi tiết</span>
            </button>

            <button
              onClick={() => setActiveViewTab('both')}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeViewTab === 'both'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <span>📑 Toàn diện (In ấn)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className="text-[11px] text-slate-500 font-semibold hidden md:inline">
              Tỉ lệ mức độ tư duy:
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Biết: {totals.cognitivePercent.biet}%
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              Hiểu: {totals.cognitivePercent.hieu}%
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              Vận dụng: {totals.cognitivePercent.vd}%
            </span>

            {/* Auto-Save Google Drive Status Indicator */}
            {autoSaveStatus === 'pending' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 animate-pulse" title="Hệ thống tự động đồng bộ ma trận lên Google Drive sau 30s chỉnh sửa">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span>Lưu Drive (30s)...</span>
              </span>
            )}
            {autoSaveStatus === 'saving' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 animate-pulse">
                <Cloud className="w-3 h-3 animate-bounce text-blue-600" />
                <span>Đang lưu Drive...</span>
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1" title="Đã tự động sao lưu ma trận lên Google Drive thành công">
                <Check className="w-3 h-3 text-emerald-600 font-black" />
                <span>Đã lưu Drive ({lastAutoSaveTime})</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Mở trợ lý AI tự động đề xuất phân bổ ma trận và bản đặc tả GDPT 2018"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>AI Đề xuất</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6" id="competency-matrix-export-wrap">
          
          {/* ================================================================= */}
          {/* TAB 1: THƯ VIỆN MA TRẬN ĐA MÔN HỌC                                 */}
          {/* ================================================================= */}
          {activeViewTab === 'library' && (
            <div className="space-y-5">
              {/* Header Bar Thư viện */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl border border-indigo-900 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Kho Mẫu Ma Trận & Bản Đặc Tả GDPT 2018 Đa Môn Học</span>
                  </h3>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                    Tuyển tập các mẫu ma trận năng lực và bảng đặc tả chuẩn của Bộ GD&ĐT dành cho các môn <strong>Toán học, Vật lí, Hóa học, Sinh học, Tiếng Anh, Ngữ văn</strong>. Thầy/cô có thể lưu các ma trận đã thiết kế thành file mẫu cá nhân, xuất/nhập file JSON để tái sử dụng tức thì cho các kỳ thi sau.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDriveModal(true)}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Lưu & Tải ma trận đề thi trực tuyến từ Google Drive"
                  >
                    <Cloud className="w-4 h-4 text-amber-300" />
                    <span>☁️ Google Drive Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSaveTemplateName(title);
                      setShowSaveTemplateModal(true);
                    }}
                    className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Lưu ma trận đang soạn thành mẫu riêng trong Thư viện của bạn"
                  >
                    <Bookmark className="w-4 h-4 text-amber-300" />
                    <span>💾 Lưu thành File Mẫu</span>
                  </button>

                  <label
                    className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
                    title="Tải lên file mẫu ma trận (.json hoặc .matrix.json) từ máy tính"
                  >
                    <Upload className="w-4 h-4 text-emerald-300" />
                    <span>📥 Nhập File JSON</span>
                    <input
                      type="file"
                      accept=".json,.matrix.json"
                      className="hidden"
                      onChange={handleImportTemplateJson}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-500 hover:to-rose-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>🤖 AI Đề xuất</span>
                  </button>
                </div>
              </div>

              {/* Thanh lọc & Tìm kiếm */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  
                  {/* Lọc Nguồn mẫu */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 px-1.5">Nguồn:</span>
                    {[
                      { id: 'all', label: `Tất cả (${allAvailableTemplates.length})` },
                      { id: 'custom', label: `⭐ Mẫu của tôi (${customTemplates.length})` },
                      { id: 'system', label: `GDPT 2018 (${ALL_MATRIX_TEMPLATES.length})` }
                    ].map(og => (
                      <button
                        key={og.id}
                        type="button"
                        onClick={() => setOriginFilter(og.id as any)}
                        className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                          originFilter === og.id
                            ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {og.label}
                      </button>
                    ))}
                  </div>

                  {/* Lọc Môn học */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 px-1.5">Môn:</span>
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'toan', label: 'Toán' },
                      { id: 'vat_li', label: 'Vật lí' },
                      { id: 'hoa_hoc', label: 'Hóa học' },
                      { id: 'sinh_hoc', label: 'Sinh học' },
                      { id: 'tieng_anh', label: 'Tiếng Anh' },
                      { id: 'ngu_van', label: 'Ngữ văn' }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSubjectFilter(sub.id)}
                        className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                          subjectFilter === sub.id
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {/* Lọc Khối Lớp */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 px-1.5">Khối:</span>
                    {['all', '10', '11', '12'].map(gr => (
                      <button
                        key={gr}
                        type="button"
                        onClick={() => setGradeFilter(gr)}
                        className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                          gradeFilter === gr
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {gr === 'all' ? 'Tất cả' : `Lớp ${gr}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tìm kiếm */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo môn, chủ đề, bài..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Lưới danh sách các Card Mẫu Ma Trận */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(tpl => {
                  const isCurrent = tpl.id === currentTemplate.id;
                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-2xl border transition-all flex flex-col justify-between p-4 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md ${
                        isCurrent
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 dark:border-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Header card: Môn & Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            {tpl.subjectName} • Lớp {tpl.grade}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {tpl.semester}
                          </span>
                        </div>

                        {/* Title & Badge */}
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {tpl.title}
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 inline-block mt-0.5">
                            {tpl.badge}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {tpl.description}
                        </p>

                        {/* Info pills: Cấu trúc số câu & Thời gian */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                            <span>Phân bổ câu hỏi:</span>
                            <span className="text-indigo-600 font-mono">
                              {tpl.qCounts.mc} TN + {tpl.qCounts.tf} Đ/S + {tpl.qCounts.sa} TLN + {tpl.qCounts.essay} TL
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Thời gian: {tpl.durationMinutes} phút</span>
                            <span>Thang điểm: {tpl.totalPoints}.0đ (100%)</span>
                          </div>
                        </div>

                        {/* Danh sách chủ đề chính */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Các mạch kiến thức:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tpl.topicsList.slice(0, 3).map((tp, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md truncate max-w-full font-medium">
                                • {tp}
                              </span>
                            ))}
                            {tpl.topicsList.length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">+{tpl.topicsList.length - 3} chủ đề</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectTemplate(tpl, 'drag_drop')}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 font-extrabold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 border border-indigo-200 shadow-2xs"
                            title="Mở giao diện Kéo - Thả trực quan cho mẫu ma trận này"
                          >
                            <Move className="w-3.5 h-3.5" />
                            <span>Kéo-Thả</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectTemplate(tpl, 'matrix')}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Xem chi tiết bảng số liệu ma trận"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Xem & Sửa</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleExportTemplateJson(tpl, e)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                            title="Tải về file mẫu .matrix.json để dùng lại sau"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {(tpl.id.startsWith('custom_') || tpl.id.startsWith('imported_')) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                              title="Xóa mẫu cá nhân này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleApplyConfig(tpl)}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Áp dụng ngay cấu hình này vào Đề thi"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Áp dụng</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: KÉO - THẢ CẤU HÌNH MA TRẬN TRỰC QUAN                       */}
          {/* ================================================================= */}
          {activeViewTab === 'drag_drop' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                    <Move className="w-4 h-4 text-amber-300" />
                    <span>Giao diện Kéo - Thả Cấu hình Ma trận Đề thi ({currentTemplate.subjectName} - Lớp {currentTemplate.grade})</span>
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Kéo thả trực quan các lệnh hỏi giữa các ô năng lực để phân bổ lại tỷ lệ cấp độ tư duy; kéo đổi thứ tự hàng; kéo vào Thùng rác để xóa.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('charts')}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Xem Biểu đồ Năng lực</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('matrix')}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Xem Bảng số liệu</span>
                  </button>
                </div>
              </div>

              <MatrixDragDropConfigurator
                matrixData={matrixData}
                onChangeMatrixData={setMatrixData}
                competencyHeaders={currentTemplate.competencyHeaders}
                onResetDefault={handleResetToTemplate}
              />
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3 & TAB 6: BẢNG MA TRẬN THEO NĂNG LỰC MÔN HỌC                 */}
          {/* ================================================================= */}
          {(activeViewTab === 'matrix' || activeViewTab === 'both') && (
            <div className="space-y-4">
              
              {/* Toolbar điều khiển tùy chỉnh ma trận */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 no-print">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Đang xem & tùy chỉnh ma trận: <strong>{currentTemplate.title}</strong>
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[11px] font-bold">
                    {currentTemplate.matrixRows.length} đơn vị kiến thức
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddRow(groupedTopics[0]?.topic || 'CHỦ ĐỀ MỚI')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng kiến thức</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                    title="Khôi phục mẫu chuẩn Bộ GD&ĐT"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mẫu gốc</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveViewTab('library')}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs border border-purple-200 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Chọn môn khác</span>
                  </button>
                </div>
              </div>

              {/* Bảng Ma trận Năng lực chuẩn */}
              <div className="overflow-x-auto bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-center mb-3">
                  <h3 className="text-base sm:text-lg font-bold uppercase text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    I. MA TRẬN ĐỀ KIỂM TRA MÔN {currentTemplate.subjectName.toUpperCase()} - KHỐI {currentTemplate.grade}
                  </h3>
                  <p className="text-xs italic text-slate-600">
                    (Khung ma trận đánh giá năng lực theo chuẩn Chương trình GDPT 2018 - Thời gian: {currentTemplate.durationMinutes} phút)
                  </p>
                </div>

                <table className="w-full border-collapse border border-black text-[12px] min-w-[1100px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  <thead>
                    {/* Hàng 1 */}
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black p-1.5 w-10" rowSpan={3}>TT</th>
                      <th className="border border-black p-1.5 w-44" rowSpan={3}>Chủ đề</th>
                      <th className="border border-black p-1.5 w-52" rowSpan={3}>Nội dung / Đơn vị kiến thức</th>
                      <th className="border border-black p-1.5" colSpan={9}>NĂNG LỰC MÔN HỌC</th>
                      <th className="border border-black p-1.5" colSpan={3} rowSpan={2}>SỐ LỆNH HỎI</th>
                      <th className="border border-black p-1.5 w-14" rowSpan={3}>Tổng số lệnh hỏi</th>
                      <th className="border border-black p-1.5 w-14" rowSpan={3}>Điểm số</th>
                      <th className="border border-black p-1.5 w-14" rowSpan={3}>Tỉ lệ % điểm</th>
                      <th className="border border-black p-1.5" colSpan={3}>Tỉ lệ mức độ tư duy (%)</th>
                      <th className="border border-black p-1.5 w-10 no-print" rowSpan={3}>Thao tác</th>
                    </tr>
                    {/* Hàng 2 */}
                    <tr className="bg-slate-50 font-bold text-center">
                      <th className="border border-black p-1" colSpan={3}>Năng lực {currentTemplate.competencyHeaders.c1}</th>
                      <th className="border border-black p-1" colSpan={3}>Năng lực {currentTemplate.competencyHeaders.c2}</th>
                      <th className="border border-black p-1" colSpan={3}>Năng lực {currentTemplate.competencyHeaders.c3}</th>
                      <th className="border border-black p-1 w-12" rowSpan={2}>Biết<br/>({totals.cognitivePercent.biet}%)</th>
                      <th className="border border-black p-1 w-12" rowSpan={2}>Hiểu<br/>({totals.cognitivePercent.hieu}%)</th>
                      <th className="border border-black p-1 w-12" rowSpan={2}>Vận dụng<br/>({totals.cognitivePercent.vd}%)</th>
                    </tr>
                    {/* Hàng 3 */}
                    <tr className="bg-slate-100 font-bold text-center text-[11px]">
                      {/* C1 */}
                      <th className="border border-black p-1 w-10">Biết</th>
                      <th className="border border-black p-1 w-10">Hiểu</th>
                      <th className="border border-black p-1 w-10">Vận dụng</th>
                      {/* C2 */}
                      <th className="border border-black p-1 w-10">Biết</th>
                      <th className="border border-black p-1 w-10">Hiểu</th>
                      <th className="border border-black p-1 w-10">Vận dụng</th>
                      {/* C3 */}
                      <th className="border border-black p-1 w-10">Biết</th>
                      <th className="border border-black p-1 w-10">Hiểu</th>
                      <th className="border border-black p-1 w-10">Vận dụng</th>
                      {/* Số lệnh hỏi */}
                      <th className="border border-black p-1 w-10">Biết</th>
                      <th className="border border-black p-1 w-10">Hiểu</th>
                      <th className="border border-black p-1 w-10">Vận dụng</th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupedTopics.map((group, gIdx) => {
                      return group.rows.map((row, rIdx) => {
                        const rowBietCommands = countMatrixCommands(row.gqvd.biet) + countMatrixCommands(row.tuduy.biet) + countMatrixCommands(row.mohinh.biet);
                        const rowHieuCommands = countMatrixCommands(row.gqvd.hieu) + countMatrixCommands(row.tuduy.hieu) + countMatrixCommands(row.mohinh.hieu);
                        const rowVdCommands = countMatrixCommands(row.gqvd.vd) + countMatrixCommands(row.tuduy.vd) + countMatrixCommands(row.mohinh.vd);
                        const rowTotalCommands = rowBietCommands + rowHieuCommands + rowVdCommands;
                        
                        const rowScore = (
                          countMatrixScore(row.gqvd.biet) + countMatrixScore(row.gqvd.hieu) + countMatrixScore(row.gqvd.vd) +
                          countMatrixScore(row.tuduy.biet) + countMatrixScore(row.tuduy.hieu) + countMatrixScore(row.tuduy.vd) +
                          countMatrixScore(row.mohinh.biet) + countMatrixScore(row.mohinh.hieu) + countMatrixScore(row.mohinh.vd)
                        );
                        const rowPercent = totals.totalScore > 0 ? Math.round((rowScore / totals.totalScore) * 100) : 0;

                        return (
                          <tr key={row.id} className="hover:bg-slate-50">
                            {rIdx === 0 && (
                              <>
                                <td className="border border-black p-1 text-center font-bold" rowSpan={group.rows.length}>
                                  {gIdx + 1}
                                </td>
                                <td className="border border-black p-1 font-bold" rowSpan={group.rows.length}>
                                  <input
                                    type="text"
                                    value={row.topic}
                                    onChange={e => {
                                      const newTopic = e.target.value;
                                      setMatrixData(prev => prev.map(item => item.topic === group.topic ? { ...item, topic: newTopic } : item));
                                    }}
                                    className="w-full bg-transparent font-bold focus:bg-white focus:outline-blue-500 rounded px-1"
                                  />
                                </td>
                              </>
                            )}

                            {/* Tên đơn vị kiến thức */}
                            <td className="border border-black p-1">
                              <input
                                type="text"
                                value={row.unit}
                                onChange={e => {
                                  const newUnit = e.target.value;
                                  setMatrixData(prev => prev.map(item => item.id === row.id ? { ...item, unit: newUnit } : item));
                                }}
                                className="w-full bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>

                            {/* C1: Biết - Hiểu - VD */}
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.gqvd.biet}
                                onChange={e => handleCellChange(row.id, 'gqvd', 'biet', e.target.value)}
                                className="w-full text-center font-bold text-blue-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.gqvd.hieu}
                                onChange={e => handleCellChange(row.id, 'gqvd', 'hieu', e.target.value)}
                                className="w-full text-center font-bold text-blue-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.gqvd.vd}
                                onChange={e => handleCellChange(row.id, 'gqvd', 'vd', e.target.value)}
                                className="w-full text-center font-bold text-blue-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>

                            {/* C2: Biết - Hiểu - VD */}
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.tuduy.biet}
                                onChange={e => handleCellChange(row.id, 'tuduy', 'biet', e.target.value)}
                                className="w-full text-center font-bold text-indigo-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.tuduy.hieu}
                                onChange={e => handleCellChange(row.id, 'tuduy', 'hieu', e.target.value)}
                                className="w-full text-center font-bold text-indigo-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.tuduy.vd}
                                onChange={e => handleCellChange(row.id, 'tuduy', 'vd', e.target.value)}
                                className="w-full text-center font-bold text-indigo-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>

                            {/* C3: Biết - Hiểu - VD */}
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.mohinh.biet}
                                onChange={e => handleCellChange(row.id, 'mohinh', 'biet', e.target.value)}
                                className="w-full text-center font-bold text-purple-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.mohinh.hieu}
                                onChange={e => handleCellChange(row.id, 'mohinh', 'hieu', e.target.value)}
                                className="w-full text-center font-bold text-purple-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>
                            <td className="border border-black p-1 text-center">
                              <input
                                type="text"
                                value={row.mohinh.vd}
                                onChange={e => handleCellChange(row.id, 'mohinh', 'vd', e.target.value)}
                                className="w-full text-center font-bold text-purple-700 bg-transparent focus:bg-white focus:outline-blue-500 rounded px-1"
                              />
                            </td>

                            {/* Số lệnh hỏi theo mức độ */}
                            <td className="border border-black p-1 text-center font-bold">{rowBietCommands || '-'}</td>
                            <td className="border border-black p-1 text-center font-bold">{rowHieuCommands || '-'}</td>
                            <td className="border border-black p-1 text-center font-bold">{rowVdCommands || '-'}</td>

                            {/* Tổng dòng */}
                            <td className="border border-black p-1 text-center font-bold">{rowTotalCommands || '-'}</td>
                            <td className="border border-black p-1 text-center font-bold">{rowScore ? rowScore.toFixed(2) : '-'}</td>
                            <td className="border border-black p-1 text-center font-bold">{rowPercent ? `${rowPercent}%` : '-'}</td>

                            {/* Tỉ lệ tư duy */}
                            <td className="border border-black p-1 text-center">-</td>
                            <td className="border border-black p-1 text-center">-</td>
                            <td className="border border-black p-1 text-center">-</td>

                            {/* Thao tác xóa */}
                            <td className="border border-black p-1 text-center no-print">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                                title="Xóa dòng này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })}

                    {/* DÒNG TỔNG 1: Tổng số lệnh hỏi */}
                    <tr className="bg-slate-100 font-bold text-center">
                      <td className="border border-black p-1 text-center" colSpan={3}>Tổng số lệnh hỏi</td>
                      <td className="border border-black p-1 text-blue-700">{totals.counts.c1.biet}</td>
                      <td className="border border-black p-1 text-blue-700">{totals.counts.c1.hieu}</td>
                      <td className="border border-black p-1 text-blue-700">{totals.counts.c1.vd}</td>
                      <td className="border border-black p-1 text-indigo-700">{totals.counts.c2.biet}</td>
                      <td className="border border-black p-1 text-indigo-700">{totals.counts.c2.hieu}</td>
                      <td className="border border-black p-1 text-indigo-700">{totals.counts.c2.vd}</td>
                      <td className="border border-black p-1 text-purple-700">{totals.counts.c3.biet}</td>
                      <td className="border border-black p-1 text-purple-700">{totals.counts.c3.hieu}</td>
                      <td className="border border-black p-1 text-purple-700">{totals.counts.c3.vd}</td>
                      <td className="border border-black p-1">{totals.counts.c1.biet + totals.counts.c2.biet + totals.counts.c3.biet}</td>
                      <td className="border border-black p-1">{totals.counts.c1.hieu + totals.counts.c2.hieu + totals.counts.c3.hieu}</td>
                      <td className="border border-black p-1">{totals.counts.c1.vd + totals.counts.c2.vd + totals.counts.c3.vd}</td>
                      <td className="border border-black p-1 text-emerald-800">{totals.totalQuestions}</td>
                      <td className="border border-black p-1 text-emerald-800">{totals.totalScore.toFixed(1)}</td>
                      <td className="border border-black p-1 text-emerald-800">100%</td>
                      <td className="border border-black p-1">{totals.cognitivePercent.biet}%</td>
                      <td className="border border-black p-1">{totals.cognitivePercent.hieu}%</td>
                      <td className="border border-black p-1">{totals.cognitivePercent.vd}%</td>
                      <td className="border border-black p-1 no-print"></td>
                    </tr>

                    {/* DÒNG TỔNG 2: Tổng số điểm */}
                    <tr className="bg-slate-50 font-bold text-center">
                      <td className="border border-black p-1 text-center" colSpan={3}>Tổng số điểm</td>
                      <td className="border border-black p-1">{totals.scores.c1.biet.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c1.hieu.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c1.vd.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c2.biet.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c2.hieu.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c2.vd.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c3.biet.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c3.hieu.toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.scores.c3.vd.toFixed(2)}</td>
                      <td className="border border-black p-1">{(totals.scores.c1.biet + totals.scores.c2.biet + totals.scores.c3.biet).toFixed(2)}</td>
                      <td className="border border-black p-1">{(totals.scores.c1.hieu + totals.scores.c2.hieu + totals.scores.c3.hieu).toFixed(2)}</td>
                      <td className="border border-black p-1">{(totals.scores.c1.vd + totals.scores.c2.vd + totals.scores.c3.vd).toFixed(2)}</td>
                      <td className="border border-black p-1">{totals.totalQuestions}</td>
                      <td className="border border-black p-1 text-emerald-800">{totals.totalScore.toFixed(1)}</td>
                      <td className="border border-black p-1 text-emerald-800">100%</td>
                      <td className="border border-black p-1">{totals.cognitivePercent.biet}%</td>
                      <td className="border border-black p-1">{totals.cognitivePercent.hieu}%</td>
                      <td className="border border-black p-1">{totals.cognitivePercent.vd}%</td>
                      <td className="border border-black p-1 no-print"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: TRỰC QUAN HOÁ BIỂU ĐỒ NĂNG LỰC GDPT 2018                  */}
          {/* ================================================================= */}
          {activeViewTab === 'charts' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-300" />
                    <span>Trực quan hoá Phân bổ Tỉ lệ Câu hỏi theo Chuẩn Năng lực GDPT 2018</span>
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Biểu đồ tương tác phân tích cơ cấu điểm số, cấp độ tư duy (Biết - Hiểu - Vận dụng), 3 năng lực cốt lõi môn học và mạch kiến thức.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('drag_drop')}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Move className="w-3.5 h-3.5 text-amber-300" />
                    <span>Chỉnh sửa bằng Kéo - Thả</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('matrix')}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Xem Bảng số liệu</span>
                  </button>
                </div>
              </div>

              <MatrixVisualCharts
                matrixData={matrixData}
                competencyHeaders={currentTemplate.competencyHeaders}
                targetRatio={{ biet: totals.cognitivePercent.biet, hieu: totals.cognitivePercent.hieu, vd: totals.cognitivePercent.vd, vdc: 0 }}
                totalPoints={currentTemplate.totalPoints}
                subjectName={currentTemplate.subjectName}
                grade={currentTemplate.grade}
                title={title}
              />
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5 & TAB 6: BẢNG ĐẶC TẢ KĨ THUẬT ĐỀ KIỂM TRA                   */}
          {/* ================================================================= */}
          {(activeViewTab === 'spec' || activeViewTab === 'both') && (
            <div className="space-y-4">
              <div className="overflow-x-auto bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-center mb-3">
                  <h3 className="text-base sm:text-lg font-bold uppercase text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    II. BẢN ĐẶC TẢ ĐỀ KIỂM TRA MÔN {currentTemplate.subjectName.toUpperCase()} - KHỐI {currentTemplate.grade}
                  </h3>
                  <p className="text-xs italic text-slate-600">
                    (Quy cách kĩ thuật yêu cầu cần đạt và phân bổ các câu hỏi trắc nghiệm & tự luận chuẩn Bộ GD&ĐT)
                  </p>
                </div>

                <table className="w-full border-collapse border border-black text-[12px] min-w-[1000px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black p-2 w-10">TT</th>
                      <th className="border border-black p-2 w-44">Chủ đề</th>
                      <th className="border border-black p-2 w-52">Nội dung kiến thức</th>
                      <th className="border border-black p-2 min-w-[280px]">Yêu cầu cần đạt</th>
                      <th className="border border-black p-2 w-24">Phần I<br/>(TNKQ 4 Lựa chọn)</th>
                      <th className="border border-black p-2 w-24">Phần II<br/>(Đúng / Sai)</th>
                      <th className="border border-black p-2 w-24">Phần III<br/>(Trả lời ngắn)</th>
                      <th className="border border-black p-2 w-24">Phần IV<br/>(Tự luận)</th>
                      <th className="border border-black p-2 w-16">Điểm số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specData.map((spec, sIdx) => (
                      <tr key={spec.id} className="hover:bg-slate-50">
                        <td className="border border-black p-2 text-center font-bold">{sIdx + 1}</td>
                        <td className="border border-black p-2 font-bold">{spec.topic}</td>
                        <td className="border border-black p-2">{spec.unit}</td>
                        <td className="border border-black p-2 text-left space-y-2">
                          <div>
                            <span className="font-bold text-blue-700 block">Nhận biết:</span>
                            <textarea
                              rows={2}
                              value={spec.bietSpec}
                              onChange={e => {
                                const val = e.target.value;
                                setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, bietSpec: val } : s));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs focus:bg-white"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-indigo-700 block">Thông hiểu:</span>
                            <textarea
                              rows={2}
                              value={spec.hieuSpec}
                              onChange={e => {
                                const val = e.target.value;
                                setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, hieuSpec: val } : s));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs focus:bg-white"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-rose-700 block">Vận dụng:</span>
                            <textarea
                              rows={2}
                              value={spec.vdSpec}
                              onChange={e => {
                                const val = e.target.value;
                                setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, vdSpec: val } : s));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs focus:bg-white"
                            />
                          </div>
                        </td>

                        {/* Gán mã câu hỏi */}
                        <td className="border border-black p-1.5 text-center font-bold text-blue-700">
                          <input
                            type="text"
                            value={spec.assignedQuestions.part1}
                            onChange={e => {
                              const val = e.target.value;
                              setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, assignedQuestions: { ...s.assignedQuestions, part1: val } } : s));
                            }}
                            className="w-full text-center bg-transparent focus:bg-white rounded"
                          />
                        </td>
                        <td className="border border-black p-1.5 text-center font-bold text-indigo-700">
                          <input
                            type="text"
                            value={spec.assignedQuestions.part2}
                            onChange={e => {
                              const val = e.target.value;
                              setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, assignedQuestions: { ...s.assignedQuestions, part2: val } } : s));
                            }}
                            className="w-full text-center bg-transparent focus:bg-white rounded"
                          />
                        </td>
                        <td className="border border-black p-1.5 text-center font-bold text-purple-700">
                          <input
                            type="text"
                            value={spec.assignedQuestions.part3}
                            onChange={e => {
                              const val = e.target.value;
                              setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, assignedQuestions: { ...s.assignedQuestions, part3: val } } : s));
                            }}
                            className="w-full text-center bg-transparent focus:bg-white rounded"
                          />
                        </td>
                        <td className="border border-black p-1.5 text-center font-bold text-rose-700">
                          <input
                            type="text"
                            value={spec.assignedQuestions.essay}
                            onChange={e => {
                              const val = e.target.value;
                              setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, assignedQuestions: { ...s.assignedQuestions, essay: val } } : s));
                            }}
                            className="w-full text-center bg-transparent focus:bg-white rounded"
                          />
                        </td>
                        <td className="border border-black p-1.5 text-center font-bold text-emerald-800">
                          <input
                            type="number"
                            step="0.25"
                            value={spec.points}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setSpecData(prev => prev.map(s => s.id === spec.id ? { ...s, points: val } : s));
                            }}
                            className="w-14 text-center bg-transparent focus:bg-white rounded"
                          />
                        </td>
                      </tr>
                    ))}

                    {/* Tổng điểm bảng đặc tả */}
                    <tr className="bg-slate-100 font-bold text-center">
                      <td className="border border-black p-2" colSpan={4}>TỔNG CỘNG ĐỀ KIỂM TRA</td>
                      <td className="border border-black p-2 text-blue-700">{currentTemplate.qCounts.mc} câu</td>
                      <td className="border border-black p-2 text-indigo-700">{currentTemplate.qCounts.tf} câu</td>
                      <td className="border border-black p-2 text-purple-700">{currentTemplate.qCounts.sa} câu</td>
                      <td className="border border-black p-2 text-rose-700">{currentTemplate.qCounts.essay} câu</td>
                      <td className="border border-black p-2 text-emerald-800 text-sm">
                        {specData.reduce((acc, curr) => acc + (curr.points || 0), 0).toFixed(2)}đ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Khung ma trận chuẩn Chương trình GDPT 2018 (Phân phối năng lực, tỉ lệ mức độ tư duy 40% - 30% - 30%).</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              Đóng lại
            </button>
            <button
              onClick={() => handleApplyConfig()}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Đồng bộ cấu hình ma trận này vào đề thi</span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal Lưu Ma trận thành File Mẫu cá nhân */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>Lưu Ma trận thành Mẫu Cá Nhân</span>
              </h4>
              <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên mẫu ma trận để nhận diện:
                </label>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={e => setSaveTemplateName(e.target.value)}
                  placeholder="VD: Ma trận Giữa kì I Toán 11 - Phân hóa cao"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mô tả / Ghi chú sư phạm:
                </label>
                <textarea
                  rows={3}
                  value={saveTemplateDesc}
                  onChange={e => setSaveTemplateDesc(e.target.value)}
                  placeholder="Ghi chú về số câu, thời gian, đối tượng học sinh hoặc lưu ý dạy học..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <div>• Môn: <strong>{currentTemplate.subjectName}</strong> • Khối {currentTemplate.grade} • {currentTemplate.semester}</div>
                <div>• Quy mô: <strong>{matrixData.length}</strong> đơn vị kiến thức ({totals.totalQuestions} lệnh hỏi - {totals.totalScore}đ)</div>
                <div>• Tỉ lệ nhận thức: <strong>{totals.cognitivePercent.biet}% Biết - {totals.cognitivePercent.hieu}% Hiểu - {totals.cognitivePercent.vd}% Vận dụng</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsCustomTemplate}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Lưu vào Thư viện của tôi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal AI Tự động Đề xuất Ma trận GDPT 2018 */}
      <AiMatrixSuggestModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        initialSubject={currentTemplate.subjectName}
        initialGrade={currentTemplate.grade}
        onApplySuggestedMatrix={handleApplyFromAi}
      />

      {/* Modal Quản lý & Đồng bộ Google Drive */}
      <GoogleDriveMatrixModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        currentTemplate={currentTemplate}
        onLoadTemplateFromDrive={(driveTpl) => {
          handleSelectTemplate(driveTpl, 'matrix');
        }}
      />

      {/* Container chuẩn hóa xuất tài liệu Word & In ấn sư phạm Bộ GD&ĐT */}
      <PedagogicalMatrixExportView
        tpl={currentTemplate}
        docTitle={title}
        matrixRows={matrixData}
        specUnits={specData}
        idPrefix="pedagogical-matrix"
      />
    </div>
  );
}

// ============================================================================
// COMPONENT CHUẨN SƯ PHẠM XUẤT TÀI LIỆU WORD & IN ẤN (KHÔNG CHỨA INPUT / BUTTON)
// ============================================================================

export function PedagogicalMatrixExportView({
  tpl,
  docTitle,
  matrixRows,
  specUnits,
  idPrefix
}: {
  tpl: ExamMatrixTemplate;
  docTitle: string;
  matrixRows: MatrixRowItem[];
  specUnits: SpecUnitItem[];
  idPrefix: string;
}) {
  const isVinhLoc = useMemo(() => {
    return matrixRows.some(r => r.nlc || r.ds || r.tln || r.tl) || 
      tpl.badge?.includes('EDUPLAN AI') || 
      tpl.badge?.includes('19') ||
      (tpl.subjectId === 'toan' && ['10', '11', '12'].includes(tpl.grade));
  }, [matrixRows, tpl]);

  const vlTotals = useMemo(() => {
    let nlcBiet = 0, nlcHieu = 0, nlcVd = 0;
    let dsBiet = 0, dsHieu = 0, dsVd = 0;
    let tlnBiet = 0, tlnHieu = 0, tlnVd = 0;
    let tlBiet = 0, tlHieu = 0, tlVd = 0;

    matrixRows.forEach(r => {
      if (r.nlc) {
        nlcBiet += countMatrixCommands(r.nlc.biet);
        nlcHieu += countMatrixCommands(r.nlc.hieu);
        nlcVd += countMatrixCommands(r.nlc.vd);
      }
      if (r.ds) {
        dsBiet += countMatrixCommands(r.ds.biet);
        dsHieu += countMatrixCommands(r.ds.hieu);
        dsVd += countMatrixCommands(r.ds.vd);
      }
      if (r.tln) {
        tlnBiet += countMatrixCommands(r.tln.biet);
        tlnHieu += countMatrixCommands(r.tln.hieu);
        tlnVd += countMatrixCommands(r.tln.vd);
      }
      if (r.tl) {
        tlBiet += countMatrixCommands(r.tl.biet);
        tlHieu += countMatrixCommands(r.tl.hieu);
        tlVd += countMatrixCommands(r.tl.vd);
      }
    });

    const tongBiet = nlcBiet + dsBiet + tlnBiet + tlBiet;
    const tongHieu = nlcHieu + dsHieu + tlnHieu + tlHieu;
    const tongVd = nlcVd + dsVd + tlnVd + tlVd;
    const totalQuestions = tongBiet + tongHieu + tongVd;

    const scoreNlcBiet = nlcBiet * 0.25;
    const scoreNlcHieu = nlcHieu * 0.25;
    const scoreNlcVd = nlcVd * 0.25;

    const scoreDsBiet = dsBiet * 0.25;
    const scoreDsHieu = dsHieu * 0.25;
    const scoreDsVd = dsVd * 0.25;

    const scoreTlnBiet = tlnBiet * 0.5;
    const scoreTlnHieu = tlnHieu * 0.5;
    const scoreTlnVd = tlnVd * 0.5;

    let scoreTlBiet = 0, scoreTlHieu = 0, scoreTlVd = 0;
    matrixRows.forEach(r => {
      if (r.tl?.biet) scoreTlBiet += countMatrixScore(r.tl.biet);
      if (r.tl?.hieu) scoreTlHieu += countMatrixScore(r.tl.hieu);
      if (r.tl?.vd) scoreTlVd += countMatrixScore(r.tl.vd);
    });
    if (scoreTlBiet === 0 && tlBiet > 0) scoreTlBiet = tlBiet * 0.5;
    if (scoreTlHieu === 0 && tlHieu > 0) scoreTlHieu = 1.0;
    if (scoreTlVd === 0 && tlVd > 0) scoreTlVd = 2.0;

    const scoreBiet = scoreNlcBiet + scoreDsBiet + scoreTlnBiet + scoreTlBiet;
    const scoreHieu = scoreNlcHieu + scoreDsHieu + scoreTlnHieu + scoreTlHieu;
    const scoreVd = scoreNlcVd + scoreDsVd + scoreTlnVd + scoreTlVd;

    return {
      counts: {
        nlc: { biet: nlcBiet || 8, hieu: nlcHieu || 4, vd: nlcVd || 0 },
        ds: { biet: dsBiet || 4, hieu: dsHieu || 4, vd: dsVd || 0 },
        tln: { biet: tlnBiet || 2, hieu: tlnHieu || 2, vd: tlnVd || 0 },
        tl: { biet: tlBiet || 0, hieu: tlHieu || 2, vd: tlVd || 2 },
        tong: { biet: tongBiet || 14, hieu: tongHieu || 12, vd: tongVd || 2 },
        totalQuestions: totalQuestions || 28
      },
      scores: {
        nlc: { biet: scoreNlcBiet || 2.0, hieu: scoreNlcHieu || 1.0, vd: scoreNlcVd || 0 },
        ds: { biet: scoreDsBiet || 1.0, hieu: scoreDsHieu || 1.0, vd: scoreDsVd || 0 },
        tln: { biet: scoreTlnBiet || 1.0, hieu: scoreTlnHieu || 1.0, vd: scoreTlnVd || 0 },
        tl: { biet: scoreTlBiet || 0, hieu: scoreTlHieu || 1.0, vd: scoreTlVd || 2.0 },
        tong: { biet: scoreBiet || 4.0, hieu: scoreHieu || 3.0, vd: scoreVd || 3.0 },
        totalScore: 10.0
      }
    };
  }, [matrixRows]);

  const totals = useMemo(() => {
    let c1BietCount = 0; let c1BietScore = 0;
    let c1HieuCount = 0; let c1HieuScore = 0;
    let c1VdCount = 0;   let c1VdScore = 0;
    let c2BietCount = 0; let c2BietScore = 0;
    let c2HieuCount = 0; let c2HieuScore = 0;
    let c2VdCount = 0;   let c2VdScore = 0;
    let c3BietCount = 0; let c3BietScore = 0;
    let c3HieuCount = 0; let c3HieuScore = 0;
    let c3VdCount = 0;   let c3VdScore = 0;

    matrixRows.forEach(row => {
      if (row.gqvd) {
        c1BietCount += countMatrixCommands(row.gqvd.biet);
        c1BietScore += countMatrixScore(row.gqvd.biet);
        c1HieuCount += countMatrixCommands(row.gqvd.hieu);
        c1HieuScore += countMatrixScore(row.gqvd.hieu);
        c1VdCount += countMatrixCommands(row.gqvd.vd);
        c1VdScore += countMatrixScore(row.gqvd.vd);
      }
      if (row.tuduy) {
        c2BietCount += countMatrixCommands(row.tuduy.biet);
        c2BietScore += countMatrixScore(row.tuduy.biet);
        c2HieuCount += countMatrixCommands(row.tuduy.hieu);
        c2HieuScore += countMatrixScore(row.tuduy.hieu);
        c2VdCount += countMatrixCommands(row.tuduy.vd);
        c2VdScore += countMatrixScore(row.tuduy.vd);
      }
      if (row.mohinh) {
        c3BietCount += countMatrixCommands(row.mohinh.biet);
        c3BietScore += countMatrixScore(row.mohinh.biet);
        c3HieuCount += countMatrixCommands(row.mohinh.hieu);
        c3HieuScore += countMatrixScore(row.mohinh.hieu);
        c3VdCount += countMatrixCommands(row.mohinh.vd);
        c3VdScore += countMatrixScore(row.mohinh.vd);
      }
    });

    const bietScore = c1BietScore + c2BietScore + c3BietScore;
    const hieuScore = c1HieuScore + c2HieuScore + c3HieuScore;
    const vdScore = c1VdScore + c2VdScore + c3VdScore;
    const totalScore = bietScore + hieuScore + vdScore;

    const totalQuestions =
      c1BietCount + c1HieuCount + c1VdCount +
      c2BietCount + c2HieuCount + c2VdCount +
      c3BietCount + c3HieuCount + c3VdCount;

    return {
      counts: {
        c1: { biet: c1BietCount, hieu: c1HieuCount, vd: c1VdCount },
        c2: { biet: c2BietCount, hieu: c2HieuCount, vd: c2VdCount },
        c3: { biet: c3BietCount, hieu: c3HieuCount, vd: c3VdCount },
      },
      scores: {
        c1: { biet: c1BietScore, hieu: c1HieuScore, vd: c1VdScore },
        c2: { biet: c2BietScore, hieu: c2HieuScore, vd: c2VdScore },
        c3: { biet: c3BietScore, hieu: c3HieuScore, vd: c3VdScore },
      },
      cognitivePercent: {
        biet: totalScore > 0 ? Math.round((bietScore / totalScore) * 100) : 40,
        hieu: totalScore > 0 ? Math.round((hieuScore / totalScore) * 100) : 30,
        vd: totalScore > 0 ? Math.round((vdScore / totalScore) * 100) : 30,
      },
      totalQuestions: totalQuestions || 24,
      totalScore: totalScore || 10,
    };
  }, [matrixRows]);

  const groupedTopics = useMemo(() => {
    const groups: { topic: string; rows: MatrixRowItem[] }[] = [];
    matrixRows.forEach(item => {
      const existing = groups.find(g => g.topic === item.topic);
      if (existing) {
        existing.rows.push(item);
      } else {
        groups.push({ topic: item.topic, rows: [item] });
      }
    });
    return groups;
  }, [matrixRows]);

  const renderHeader = (subTitleText: string) => (
    <div style={{ marginBottom: '16px' }}>
      <table style={{ width: '100%', border: 'none', marginBottom: '12px' }} className="borderless">
        <tbody>
          <tr>
            <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '4px' }}>
              <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>TRƯỜNG THPT .....................</div>
              <div style={{ fontSize: '10pt', fontStyle: 'italic' }}>TỔ CHUYÊN MÔN: {tpl.subjectName.toUpperCase()}</div>
            </td>
            <td style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '4px' }}>
              <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', textDecoration: 'underline' }}>Độc lập - Tự do - Hạnh phúc</div>
              <div style={{ fontSize: '9.5pt', fontStyle: 'italic', marginTop: '4px' }}>........., ngày ..... tháng ..... năm 202...</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0' }}>
          {subTitleText}
        </h2>
        <h3 style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '2px 0' }}>
          MÔN: {tpl.subjectName.toUpperCase()} - KHỐI {tpl.grade} - NĂM HỌC 2025 - 2026
        </h3>
        <p style={{ fontSize: '10pt', fontStyle: 'italic', margin: '2px 0' }}>
          ({docTitle} - Thời gian làm bài: {tpl.durationMinutes} phút - Không kể thời gian phát đề)
        </p>
      </div>
    </div>
  );

  const renderMatrix = () => {
    if (isVinhLoc) {
      return (
        <div style={{ width: '100%' }}>
          <table className="w-full border-collapse border border-black text-[10.5px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif', width: '100%' }}>
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-1 text-center" style={{ width: '3.5%' }} rowSpan={3}>TT</th>
                <th className="border border-black p-1 text-center" style={{ width: '16%' }} rowSpan={3}>Chương / Chủ đề</th>
                <th className="border border-black p-1 text-center" style={{ width: '17%' }} rowSpan={3}>Nội dung / Đơn vị kiến thức</th>
                <th className="border border-black p-1 text-center" colSpan={12}>MỨC ĐỘ ĐÁNH GIÁ</th>
                <th className="border border-black p-1 text-center" colSpan={3} rowSpan={2}>TỔNG</th>
                <th className="border border-black p-1 text-center" style={{ width: '6.5%' }} rowSpan={3}>Tỉ lệ %</th>
              </tr>
              <tr className="bg-slate-50 font-bold text-center">
                <th className="border border-black p-1 text-center" colSpan={9}>TNKQ</th>
                <th className="border border-black p-1 text-center" colSpan={3}>Tự luận</th>
              </tr>
              <tr className="bg-slate-100 font-bold text-center text-[9.5px]">
                <th className="border border-black p-1 text-center">Nhiều LC<br/>Biết</th>
                <th className="border border-black p-1 text-center">Nhiều LC<br/>Hiểu</th>
                <th className="border border-black p-1 text-center">Nhiều LC<br/>VD</th>
                <th className="border border-black p-1 text-center">Đúng-Sai<br/>Biết</th>
                <th className="border border-black p-1 text-center">Đúng-Sai<br/>Hiểu</th>
                <th className="border border-black p-1 text-center">Đúng-Sai<br/>VD</th>
                <th className="border border-black p-1 text-center">TL ngắn<br/>Biết</th>
                <th className="border border-black p-1 text-center">TL ngắn<br/>Hiểu</th>
                <th className="border border-black p-1 text-center">TL ngắn<br/>VD</th>
                <th className="border border-black p-1 text-center">TL<br/>Biết</th>
                <th className="border border-black p-1 text-center">TL<br/>Hiểu</th>
                <th className="border border-black p-1 text-center">TL<br/>VD</th>
                <th className="border border-black p-1 text-center">Biết</th>
                <th className="border border-black p-1 text-center">Hiểu</th>
                <th className="border border-black p-1 text-center">VD</th>
              </tr>
            </thead>
            <tbody>
              {groupedTopics.map((group, gIdx) => {
                return group.rows.map((row, rIdx) => {
                  const bietSum = row.tong?.biet ?? (countMatrixCommands(row.nlc?.biet||'') + countMatrixCommands(row.ds?.biet||'') + countMatrixCommands(row.tln?.biet||'') + countMatrixCommands(row.tl?.biet||''));
                  const hieuSum = row.tong?.hieu ?? (countMatrixCommands(row.nlc?.hieu||'') + countMatrixCommands(row.ds?.hieu||'') + countMatrixCommands(row.tln?.hieu||'') + countMatrixCommands(row.tl?.hieu||''));
                  const vdSum = row.tong?.vd ?? (countMatrixCommands(row.nlc?.vd||'') + countMatrixCommands(row.ds?.vd||'') + countMatrixCommands(row.tln?.vd||'') + countMatrixCommands(row.tl?.vd||''));

                  return (
                    <tr key={row.id}>
                      {rIdx === 0 && (
                        <>
                          <td className="border border-black p-1 text-center font-bold" rowSpan={group.rows.length}>
                            {gIdx + 1}
                          </td>
                          <td className="border border-black p-1 font-bold" rowSpan={group.rows.length}>
                            {row.topic}
                          </td>
                        </>
                      )}
                      <td className="border border-black p-1">{row.unit}</td>
                      <td className="border border-black p-1 text-center font-bold text-blue-700">{row.nlc?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-blue-700">{row.nlc?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-blue-700">{row.nlc?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-indigo-700">{row.ds?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-indigo-700">{row.ds?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-indigo-700">{row.ds?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-purple-700">{row.tln?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-purple-700">{row.tln?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-purple-700">{row.tln?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-rose-700">{row.tl?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-rose-700">{row.tl?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-rose-700">{row.tl?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{bietSum || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{hieuSum || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{vdSum || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.tiLe || '-'}</td>
                    </tr>
                  );
                });
              })}

              {/* Dòng 1: Tổng số câu */}
              <tr className="bg-slate-100 font-bold text-center">
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tổng số câu</td>
                <td className="border border-black p-1 text-center font-bold text-blue-700">{vlTotals.counts.nlc.biet}</td>
                <td className="border border-black p-1 text-center font-bold text-blue-700">{vlTotals.counts.nlc.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-blue-700">{vlTotals.counts.nlc.vd || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-700">{vlTotals.counts.ds.biet}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-700">{vlTotals.counts.ds.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-700">{vlTotals.counts.ds.vd || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-purple-700">{vlTotals.counts.tln.biet}</td>
                <td className="border border-black p-1 text-center font-bold text-purple-700">{vlTotals.counts.tln.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-purple-700">{vlTotals.counts.tln.vd || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-rose-700">{vlTotals.counts.tl.biet || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-rose-700">{vlTotals.counts.tl.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-rose-700">{vlTotals.counts.tl.vd}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.tong.biet}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.tong.hieu}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.tong.vd}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.totalQuestions} lệnh hỏi</td>
              </tr>

              {/* Dòng 2: Tổng số điểm */}
              <tr className="bg-slate-50 font-bold text-center">
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tổng số điểm</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.nlc.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.nlc.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.nlc.vd ? vlTotals.scores.nlc.vd.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.ds.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.ds.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.ds.vd ? vlTotals.scores.ds.vd.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tln.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tln.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tln.vd ? vlTotals.scores.tln.vd.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tl.biet ? vlTotals.scores.tl.biet.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tl.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tl.vd.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tong.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tong.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tong.vd.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold text-emerald-800">10.0đ</td>
              </tr>

              {/* Dòng 3: Tỉ lệ % */}
              <tr className="bg-slate-100 font-bold text-center">
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tỉ lệ %</td>
                <td className="border border-black p-1 text-center font-bold" colSpan={9}>70% (TNKQ: 7.0 điểm)</td>
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>30% (Tự luận: 3.0 điểm)</td>
                <td className="border border-black p-1 text-center font-bold">40%</td>
                <td className="border border-black p-1 text-center font-bold">30%</td>
                <td className="border border-black p-1 text-center font-bold">30%</td>
                <td className="border border-black p-1 text-center font-bold text-emerald-800">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div style={{ width: '100%' }}>
        <table className="w-full border-collapse border border-black text-[11px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif', width: '100%' }}>
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1 text-center" style={{ width: '4%' }} rowSpan={3}>TT</th>
              <th className="border border-black p-1 text-center" style={{ width: '14%' }} rowSpan={3}>Chủ đề</th>
              <th className="border border-black p-1 text-center" style={{ width: '16%' }} rowSpan={3}>Nội dung / Đơn vị kiến thức</th>
              <th className="border border-black p-1 text-center" colSpan={9}>NĂNG LỰC MÔN HỌC</th>
              <th className="border border-black p-1 text-center" colSpan={3} rowSpan={2}>SỐ LỆNH HỎI</th>
              <th className="border border-black p-1 text-center" style={{ width: '5%' }} rowSpan={3}>Tổng số lệnh</th>
              <th className="border border-black p-1 text-center" style={{ width: '5%' }} rowSpan={3}>Điểm số</th>
              <th className="border border-black p-1 text-center" style={{ width: '5%' }} rowSpan={3}>Tỉ lệ % điểm</th>
              <th className="border border-black p-1 text-center" colSpan={3}>Tỉ lệ tư duy (%)</th>
            </tr>
            <tr className="bg-slate-50 font-bold text-center">
              <th className="border border-black p-1 text-center" colSpan={3}>Năng lực {tpl.competencyHeaders.c1}</th>
              <th className="border border-black p-1 text-center" colSpan={3}>Năng lực {tpl.competencyHeaders.c2}</th>
              <th className="border border-black p-1 text-center" colSpan={3}>Năng lực {tpl.competencyHeaders.c3}</th>
              <th className="border border-black p-1 text-center" style={{ width: '4%' }} rowSpan={2}>Biết<br/>({totals.cognitivePercent.biet}%)</th>
              <th className="border border-black p-1 text-center" style={{ width: '4%' }} rowSpan={2}>Hiểu<br/>({totals.cognitivePercent.hieu}%)</th>
              <th className="border border-black p-1 text-center" style={{ width: '4%' }} rowSpan={2}>Vận dụng<br/>({totals.cognitivePercent.vd}%)</th>
            </tr>
            <tr className="bg-slate-100 font-bold text-center text-[10px]">
              <th className="border border-black p-1 text-center">Biết</th>
              <th className="border border-black p-1 text-center">Hiểu</th>
              <th className="border border-black p-1 text-center">Vận dụng</th>
              <th className="border border-black p-1 text-center">Biết</th>
              <th className="border border-black p-1 text-center">Hiểu</th>
              <th className="border border-black p-1 text-center">Vận dụng</th>
              <th className="border border-black p-1 text-center">Biết</th>
              <th className="border border-black p-1 text-center">Hiểu</th>
              <th className="border border-black p-1 text-center">Vận dụng</th>
              <th className="border border-black p-1 text-center">Biết</th>
              <th className="border border-black p-1 text-center">Hiểu</th>
              <th className="border border-black p-1 text-center">Vận dụng</th>
            </tr>
          </thead>
          <tbody>
            {groupedTopics.map((group, gIdx) => {
              return group.rows.map((row, rIdx) => {
                const rowBietCommands = countMatrixCommands(row.gqvd?.biet || '') + countMatrixCommands(row.tuduy?.biet || '') + countMatrixCommands(row.mohinh?.biet || '');
                const rowHieuCommands = countMatrixCommands(row.gqvd?.hieu || '') + countMatrixCommands(row.tuduy?.hieu || '') + countMatrixCommands(row.mohinh?.hieu || '');
                const rowVdCommands = countMatrixCommands(row.gqvd?.vd || '') + countMatrixCommands(row.tuduy?.vd || '') + countMatrixCommands(row.mohinh?.vd || '');
                const rowTotalCommands = rowBietCommands + rowHieuCommands + rowVdCommands;
                const rowScore = (
                  countMatrixScore(row.gqvd?.biet || '') + countMatrixScore(row.gqvd?.hieu || '') + countMatrixScore(row.gqvd?.vd || '') +
                  countMatrixScore(row.tuduy?.biet || '') + countMatrixScore(row.tuduy?.hieu || '') + countMatrixScore(row.tuduy?.vd || '') +
                  countMatrixScore(row.mohinh?.biet || '') + countMatrixScore(row.mohinh?.hieu || '') + countMatrixScore(row.mohinh?.vd || '')
                );
                const rowPercent = totals.totalScore > 0 ? Math.round((rowScore / totals.totalScore) * 100) : 0;

                return (
                  <tr key={row.id}>
                    {rIdx === 0 && (
                      <>
                        <td className="border border-black p-1 text-center font-bold" rowSpan={group.rows.length}>
                          {gIdx + 1}
                        </td>
                        <td className="border border-black p-1 font-bold" rowSpan={group.rows.length}>
                          {row.topic}
                        </td>
                      </>
                    )}
                    <td className="border border-black p-1">{row.unit}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.gqvd?.biet || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.gqvd?.hieu || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.gqvd?.vd || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.tuduy?.biet || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.tuduy?.hieu || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.tuduy?.vd || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.mohinh?.biet || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.mohinh?.hieu || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{row.mohinh?.vd || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{rowBietCommands || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{rowHieuCommands || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{rowVdCommands || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{rowTotalCommands || '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{rowScore ? rowScore.toFixed(2) : '-'}</td>
                    <td className="border border-black p-1 text-center font-bold">{rowPercent ? `${rowPercent}%` : '-'}</td>
                    <td className="border border-black p-1 text-center">-</td>
                    <td className="border border-black p-1 text-center">-</td>
                    <td className="border border-black p-1 text-center">-</td>
                  </tr>
                );
              });
            })}

            {/* Dòng tổng 1 */}
            <tr className="bg-slate-100 font-bold text-center">
              <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tổng số lệnh hỏi</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c1.biet}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c1.hieu}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c1.vd}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c2.biet}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c2.hieu}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c2.vd}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c3.biet}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c3.hieu}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c3.vd}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c1.biet + totals.counts.c2.biet + totals.counts.c3.biet}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c1.hieu + totals.counts.c2.hieu + totals.counts.c3.hieu}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.counts.c1.vd + totals.counts.c2.vd + totals.counts.c3.vd}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.totalQuestions}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.totalScore.toFixed(1)}</td>
              <td className="border border-black p-1 text-center font-bold">100%</td>
              <td className="border border-black p-1 text-center font-bold">{totals.cognitivePercent.biet}%</td>
              <td className="border border-black p-1 text-center font-bold">{totals.cognitivePercent.hieu}%</td>
              <td className="border border-black p-1 text-center font-bold">{totals.cognitivePercent.vd}%</td>
            </tr>

            {/* Dòng tổng 2 */}
            <tr className="bg-slate-50 font-bold text-center">
              <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tổng số điểm</td>
              <td className="border border-black p-1 text-center">{totals.scores.c1.biet.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c1.hieu.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c1.vd.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c2.biet.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c2.hieu.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c2.vd.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c3.biet.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c3.hieu.toFixed(2)}</td>
              <td className="border border-black p-1 text-center">{totals.scores.c3.vd.toFixed(2)}</td>
              <td className="border border-black p-1 text-center font-bold">{(totals.scores.c1.biet + totals.scores.c2.biet + totals.scores.c3.biet).toFixed(2)}</td>
              <td className="border border-black p-1 text-center font-bold">{(totals.scores.c1.hieu + totals.scores.c2.hieu + totals.scores.c3.hieu).toFixed(2)}</td>
              <td className="border border-black p-1 text-center font-bold">{(totals.scores.c1.vd + totals.scores.c2.vd + totals.scores.c3.vd).toFixed(2)}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.totalQuestions}</td>
              <td className="border border-black p-1 text-center font-bold">{totals.totalScore.toFixed(1)}</td>
              <td className="border border-black p-1 text-center font-bold">100%</td>
              <td className="border border-black p-1 text-center font-bold">{totals.cognitivePercent.biet}%</td>
              <td className="border border-black p-1 text-center font-bold">{totals.cognitivePercent.hieu}%</td>
              <td className="border border-black p-1 text-center font-bold">{totals.cognitivePercent.vd}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderSpec = () => (
    <div style={{ width: '100%' }}>
      <table className="w-full border-collapse border border-black text-[11px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif', width: '100%' }}>
        <thead>
          <tr className="bg-slate-100 font-bold text-center">
            <th className="border border-black p-1.5" style={{ width: '4%' }}>TT</th>
            <th className="border border-black p-1.5" style={{ width: '13%' }}>Chủ đề</th>
            <th className="border border-black p-1.5" style={{ width: '15%' }}>Nội dung kiến thức</th>
            <th className="border border-black p-1.5" style={{ width: '38%' }}>Mức độ đánh giá / Yêu cầu cần đạt</th>
            <th className="border border-black p-1.5" style={{ width: '6%' }}>Phần I<br/>(TNKQ)</th>
            <th className="border border-black p-1.5" style={{ width: '6%' }}>Phần II<br/>(Đúng/Sai)</th>
            <th className="border border-black p-1.5" style={{ width: '6%' }}>Phần III<br/>(Trả lời ngắn)</th>
            <th className="border border-black p-1.5" style={{ width: '6%' }}>Phần IV<br/>(Tự luận)</th>
            <th className="border border-black p-1.5" style={{ width: '6%' }}>Điểm số</th>
          </tr>
        </thead>
        <tbody>
          {specUnits.map((spec, sIdx) => (
            <tr key={spec.id || sIdx}>
              <td className="border border-black p-1.5 text-center font-bold">{sIdx + 1}</td>
              <td className="border border-black p-1.5 font-bold">{spec.topic}</td>
              <td className="border border-black p-1.5">{spec.unit}</td>
              <td className="border border-black p-1.5 text-left">
                {spec.bietSpec && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Nhận biết: </strong>
                    <span>{spec.bietSpec}</span>
                  </div>
                )}
                {spec.hieuSpec && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Thông hiểu: </strong>
                    <span>{spec.hieuSpec}</span>
                  </div>
                )}
                {spec.vdSpec && (
                  <div>
                    <strong>Vận dụng: </strong>
                    <span>{spec.vdSpec}</span>
                  </div>
                )}
              </td>
              <td className="border border-black p-1.5 text-center font-bold">{spec.assignedQuestions?.part1 || spec.part1 || '-'}</td>
              <td className="border border-black p-1.5 text-center font-bold">{spec.assignedQuestions?.part2 || spec.part2 || '-'}</td>
              <td className="border border-black p-1.5 text-center font-bold">{spec.assignedQuestions?.part3 || spec.part3 || '-'}</td>
              <td className="border border-black p-1.5 text-center font-bold">{spec.assignedQuestions?.essay || spec.part4 || '-'}</td>
              <td className="border border-black p-1.5 text-center font-bold">{spec.points ? `${spec.points.toFixed(2)}đ` : '1.0đ'}</td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold text-center">
            <td className="border border-black p-1.5" colSpan={4}>TỔNG CỘNG ĐỀ KIỂM TRA</td>
            <td className="border border-black p-1.5 text-blue-700">{isVinhLoc ? '12 câu (3.0đ)' : '16 câu (4.0đ)'}</td>
            <td className="border border-black p-1.5 text-indigo-700">2 câu (2.0đ)</td>
            <td className="border border-black p-1.5 text-purple-700">{isVinhLoc ? '4 câu (2.0đ)' : '2 câu (1.0đ)'}</td>
            <td className="border border-black p-1.5 text-rose-700">{isVinhLoc ? '4 câu (3.0đ)' : '3 câu (3.0đ)'}</td>
            <td className="border border-black p-1.5 text-emerald-800">10.0đ (100%)</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderSignatures = () => (
    <table style={{ width: '100%', border: 'none', marginTop: '28px' }} className="borderless">
      <tbody>
        <tr>
          <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '6px' }}>
            <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>NGƯỜI RA ĐỀ</div>
            <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
            <div style={{ height: '70px' }}></div>
          </td>
          <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '6px' }}>
            <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>TỔ TRƯỞNG CHUYÊN MÔN</div>
            <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
            <div style={{ height: '70px' }}></div>
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1200px' }} aria-hidden="true">
      {/* 1. TRỌN BỘ MA TRẬN & ĐẶC TẢ */}
      <div id={`${idPrefix}-full-export`} className="matrix-table p-6 bg-white text-black font-serif" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        {renderHeader('MA TRẬN VÀ BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ')}
        <div style={{ marginTop: '14px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', margin: '6px 0' }}>
            I. KHUNG MA TRẬN ĐỀ KIỂM TRA ĐÁNH GIÁ NĂNG LỰC THEO CHƯƠNG TRÌNH GDPT 2018
          </h3>
          {renderMatrix()}
        </div>
        <div style={{ pageBreakBefore: 'always', marginTop: '24px', marginBottom: '8px' }}></div>
        <div style={{ marginTop: '14px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', margin: '6px 0' }}>
            II. BẢN ĐẶC TẢ KĨ THUẬT ĐỀ KIỂM TRA ĐỊNH KỲ
          </h3>
          {renderSpec()}
        </div>
        {renderSignatures()}
      </div>

      {/* 2. CHỈ MA TRẬN */}
      <div id={`${idPrefix}-only-export`} className="matrix-table p-6 bg-white text-black font-serif" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        {renderHeader('MA TRẬN ĐỀ KIỂM TRA ĐÁNH GIÁ NĂNG LỰC GDPT 2018')}
        <div style={{ marginTop: '14px', marginBottom: '8px' }}>
          {renderMatrix()}
        </div>
        {renderSignatures()}
      </div>

      {/* 3. CHỈ BẢN ĐẶC TẢ */}
      <div id={`${idPrefix}-spec-only-export`} className="matrix-table p-6 bg-white text-black font-serif" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        {renderHeader('BẢN ĐẶC TẢ KĨ THUẬT ĐỀ KIỂM TRA ĐỊNH KỲ')}
        <div style={{ marginTop: '14px', marginBottom: '8px' }}>
          {renderSpec()}
        </div>
        {renderSignatures()}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT INLINE XEM TRỰC TIẾP TRONG BƯỚC 2 (ExamGenerator)
// ============================================================================

export function CompetencyMatrixInlineView({
  examTitle,
  onOpenModal,
  onLoadSampleExam,
  grade = '11',
  matrixRows,
  specUnits
}: {
  examTitle: string;
  onOpenModal: () => void;
  onLoadSampleExam?: () => void;
  grade?: string;
  matrixRows?: MatrixRowItem[];
  specUnits?: SpecUnitItem[];
}) {
  const [showSpecTable, setShowSpecTable] = useState(true);
  const [showInlineWordDropdown, setShowInlineWordDropdown] = useState(false);

  const inlineTemplate = useMemo<ExamMatrixTemplate>(() => {
    if (grade === '12') return TEMPLATE_TOAN_12_GK1;
    if (grade === '10') return ALL_MATRIX_TEMPLATES.find(t => t.grade === '10') || TEMPLATE_TOAN_11_GK1;
    return TEMPLATE_TOAN_11_GK1;
  }, [grade]);

  // Dynamic matrix and spec data selection based on props or grade
  const activeMatrix = useMemo(() => {
    if (matrixRows && matrixRows.length > 0) return matrixRows;
    if (grade === '12') return TEMPLATE_TOAN_12_GK1.matrixRows;
    if (grade === '10') return ALL_MATRIX_TEMPLATES.find(t => t.grade === '10')?.matrixRows || SAMPLE_COMPETENCY_MATRIX_11;
    return SAMPLE_COMPETENCY_MATRIX_11;
  }, [matrixRows, grade]);

  const activeSpec = useMemo(() => {
    if (specUnits && specUnits.length > 0) return specUnits;
    if (grade === '12') return TEMPLATE_TOAN_12_GK1.specUnits;
    if (grade === '10') return ALL_MATRIX_TEMPLATES.find(t => t.grade === '10')?.specUnits || SAMPLE_SPEC_LIST_11;
    return SAMPLE_SPEC_LIST_11;
  }, [specUnits, grade]);

  const gradeDisplay = grade === '12' ? 'KHỐI 12' : grade === '10' ? 'KHỐI 10' : 'KHỐI 11';

  const isVinhLoc = useMemo(() => {
    return activeMatrix.some(r => r.nlc || r.ds || r.tln || r.tl) || 
      inlineTemplate.badge?.includes('EDUPLAN AI') || 
      inlineTemplate.badge?.includes('19') ||
      ['10', '11', '12'].includes(grade);
  }, [activeMatrix, inlineTemplate, grade]);

  const groupedTopics = useMemo(() => {
    const groups: { topic: string; rows: MatrixRowItem[] }[] = [];
    activeMatrix.forEach(item => {
      const existing = groups.find(g => g.topic === item.topic);
      if (existing) {
        existing.rows.push(item);
      } else {
        groups.push({ topic: item.topic, rows: [item] });
      }
    });
    return groups;
  }, [activeMatrix]);

  const vlTotals = useMemo(() => {
    let nlcBiet = 0, nlcHieu = 0, nlcVd = 0;
    let dsBiet = 0, dsHieu = 0, dsVd = 0;
    let tlnBiet = 0, tlnHieu = 0, tlnVd = 0;
    let tlBiet = 0, tlHieu = 0, tlVd = 0;

    activeMatrix.forEach(r => {
      if (r.nlc) {
        nlcBiet += countMatrixCommands(r.nlc.biet);
        nlcHieu += countMatrixCommands(r.nlc.hieu);
        nlcVd += countMatrixCommands(r.nlc.vd);
      }
      if (r.ds) {
        dsBiet += countMatrixCommands(r.ds.biet);
        dsHieu += countMatrixCommands(r.ds.hieu);
        dsVd += countMatrixCommands(r.ds.vd);
      }
      if (r.tln) {
        tlnBiet += countMatrixCommands(r.tln.biet);
        tlnHieu += countMatrixCommands(r.tln.hieu);
        tlnVd += countMatrixCommands(r.tln.vd);
      }
      if (r.tl) {
        tlBiet += countMatrixCommands(r.tl.biet);
        tlHieu += countMatrixCommands(r.tl.hieu);
        tlVd += countMatrixCommands(r.tl.vd);
      }
    });

    const tongBiet = nlcBiet + dsBiet + tlnBiet + tlBiet;
    const tongHieu = nlcHieu + dsHieu + tlnHieu + tlHieu;
    const tongVd = nlcVd + dsVd + tlnVd + tlVd;
    const totalQuestions = tongBiet + tongHieu + tongVd;

    const scoreNlcBiet = nlcBiet * 0.25;
    const scoreNlcHieu = nlcHieu * 0.25;
    const scoreNlcVd = nlcVd * 0.25;

    const scoreDsBiet = dsBiet * 0.25;
    const scoreDsHieu = dsHieu * 0.25;
    const scoreDsVd = dsVd * 0.25;

    const scoreTlnBiet = tlnBiet * 0.5;
    const scoreTlnHieu = tlnHieu * 0.5;
    const scoreTlnVd = tlnVd * 0.5;

    let scoreTlBiet = 0, scoreTlHieu = 0, scoreTlVd = 0;
    activeMatrix.forEach(r => {
      if (r.tl?.biet) scoreTlBiet += countMatrixScore(r.tl.biet);
      if (r.tl?.hieu) scoreTlHieu += countMatrixScore(r.tl.hieu);
      if (r.tl?.vd) scoreTlVd += countMatrixScore(r.tl.vd);
    });
    if (scoreTlBiet === 0 && tlBiet > 0) scoreTlBiet = tlBiet * 0.5;
    if (scoreTlHieu === 0 && tlHieu > 0) scoreTlHieu = 1.0;
    if (scoreTlVd === 0 && tlVd > 0) scoreTlVd = 2.0;

    const scoreBiet = scoreNlcBiet + scoreDsBiet + scoreTlnBiet + scoreTlBiet;
    const scoreHieu = scoreNlcHieu + scoreDsHieu + scoreTlnHieu + scoreTlHieu;
    const scoreVd = scoreNlcVd + scoreDsVd + scoreTlnVd + scoreTlVd;

    return {
      counts: {
        nlc: { biet: nlcBiet || 8, hieu: nlcHieu || 4, vd: nlcVd || 0 },
        ds: { biet: dsBiet || 4, hieu: dsHieu || 4, vd: dsVd || 0 },
        tln: { biet: tlnBiet || 2, hieu: tlnHieu || 2, vd: tlnVd || 0 },
        tl: { biet: tlBiet || 0, hieu: tlHieu || 2, vd: tlVd || 2 },
        tong: { biet: tongBiet || 14, hieu: tongHieu || 12, vd: tongVd || 2 },
        totalQuestions: totalQuestions || 28
      },
      scores: {
        nlc: { biet: scoreNlcBiet || 2.0, hieu: scoreNlcHieu || 1.0, vd: scoreNlcVd || 0 },
        ds: { biet: scoreDsBiet || 1.0, hieu: scoreDsHieu || 1.0, vd: scoreDsVd || 0 },
        tln: { biet: scoreTlnBiet || 1.0, hieu: scoreTlnHieu || 1.0, vd: scoreTlnVd || 0 },
        tl: { biet: scoreTlBiet || 0, hieu: scoreTlHieu || 1.0, vd: scoreTlVd || 2.0 },
        tong: { biet: scoreBiet || 4.0, hieu: scoreHieu || 3.0, vd: scoreVd || 3.0 },
        totalScore: 10.0
      }
    };
  }, [activeMatrix]);

  const handleExportWord = (scope: 'full' | 'matrix' | 'spec' = 'full') => {
    setShowInlineWordDropdown(false);
    let targetElId = 'pedagogical-inline-full-export';
    let fileSuffix = 'Ma_Tran_Va_Ban_Dac_Ta';
    if (scope === 'matrix') {
      targetElId = 'pedagogical-inline-only-export';
      fileSuffix = 'Ma_Tran';
    } else if (scope === 'spec') {
      targetElId = 'pedagogical-inline-spec-only-export';
      fileSuffix = 'Ban_Dac_Ta';
    }

    const el = document.getElementById(targetElId) || document.getElementById('competency-matrix-inline-container');
    if (!el) return;

    exportHtmlToWord(
      el,
      `${fileSuffix}_GDPT2018_${inlineTemplate.subjectName}_Lop${inlineTemplate.grade}_${(examTitle || 'De_Kiem_Tra').replace(/\s+/g, '_')}.docx`
    );
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (isVinhLoc) {
        const matrixAoa: any[][] = [
          [examTitle.toUpperCase()],
          [`KHUNG MA TRẬN ĐỀ KIỂM TRA MÔN TOÁN - ${gradeDisplay} (19 CỘT MẪU THPT VINH LỘC 2026-2027)`],
          [],
          [
            'TT', 'Chương / Chủ đề', 'Nội dung / Đơn vị kiến thức',
            'Nhiều LC - Biết', 'Nhiều LC - Hiểu', 'Nhiều LC - VD',
            'Đúng-Sai - Biết', 'Đúng-Sai - Hiểu', 'Đúng-Sai - VD',
            'TL ngắn - Biết', 'TL ngắn - Hiểu', 'TL ngắn - VD',
            'Tự luận - Biết', 'Tự luận - Hiểu', 'Tự luận - VD',
            'Tổng Biết', 'Tổng Hiểu', 'Tổng VD', 'Tỉ lệ %'
          ]
        ];

        let tt = 1;
        groupedTopics.forEach(group => {
          group.rows.forEach(r => {
            const bietSum = r.tong?.biet ?? (countMatrixCommands(r.nlc?.biet||'') + countMatrixCommands(r.ds?.biet||'') + countMatrixCommands(r.tln?.biet||'') + countMatrixCommands(r.tl?.biet||''));
            const hieuSum = r.tong?.hieu ?? (countMatrixCommands(r.nlc?.hieu||'') + countMatrixCommands(r.ds?.hieu||'') + countMatrixCommands(r.tln?.hieu||'') + countMatrixCommands(r.tl?.hieu||''));
            const vdSum = r.tong?.vd ?? (countMatrixCommands(r.nlc?.vd||'') + countMatrixCommands(r.ds?.vd||'') + countMatrixCommands(r.tln?.vd||'') + countMatrixCommands(r.tl?.vd||''));

            matrixAoa.push([
              tt++,
              r.topic,
              r.unit,
              r.nlc?.biet || '-', r.nlc?.hieu || '-', r.nlc?.vd || '-',
              r.ds?.biet || '-', r.ds?.hieu || '-', r.ds?.vd || '-',
              r.tln?.biet || '-', r.tln?.hieu || '-', r.tln?.vd || '-',
              r.tl?.biet || '-', r.tl?.hieu || '-', r.tl?.vd || '-',
              bietSum, hieuSum, vdSum,
              r.tiLe || '-'
            ]);
          });
        });

        matrixAoa.push([
          'Tổng số câu', '', '',
          vlTotals.counts.nlc.biet, vlTotals.counts.nlc.hieu, vlTotals.counts.nlc.vd || '-',
          vlTotals.counts.ds.biet, vlTotals.counts.ds.hieu, vlTotals.counts.ds.vd || '-',
          vlTotals.counts.tln.biet, vlTotals.counts.tln.hieu, vlTotals.counts.tln.vd || '-',
          vlTotals.counts.tl.biet || '-', vlTotals.counts.tl.hieu, vlTotals.counts.tl.vd,
          vlTotals.counts.tong.biet, vlTotals.counts.tong.hieu, vlTotals.counts.tong.vd,
          `${vlTotals.counts.totalQuestions} lệnh hỏi`
        ]);

        matrixAoa.push([
          'Tổng số điểm', '', '',
          vlTotals.scores.nlc.biet.toFixed(1), vlTotals.scores.nlc.hieu.toFixed(1), vlTotals.scores.nlc.vd ? vlTotals.scores.nlc.vd.toFixed(1) : '-',
          vlTotals.scores.ds.biet.toFixed(1), vlTotals.scores.ds.hieu.toFixed(1), vlTotals.scores.ds.vd ? vlTotals.scores.ds.vd.toFixed(1) : '-',
          vlTotals.scores.tln.biet.toFixed(1), vlTotals.scores.tln.hieu.toFixed(1), vlTotals.scores.tln.vd ? vlTotals.scores.tln.vd.toFixed(1) : '-',
          vlTotals.scores.tl.biet ? vlTotals.scores.tl.biet.toFixed(1) : '-', vlTotals.scores.tl.hieu.toFixed(1), vlTotals.scores.tl.vd.toFixed(1),
          vlTotals.scores.tong.biet.toFixed(1), vlTotals.scores.tong.hieu.toFixed(1), vlTotals.scores.tong.vd.toFixed(1),
          '10.0đ'
        ]);

        matrixAoa.push([
          'Tỉ lệ %', '', '',
          'TNKQ: 70% (7.0 điểm)', '', '', '', '', '', '', '', '',
          'Tự luận: 30% (3.0 điểm)', '', '',
          '40%', '30%', '30%', '100%'
        ]);

        const ws = XLSX.utils.aoa_to_sheet(matrixAoa);
        XLSX.utils.book_append_sheet(wb, ws, "Ma_Tran_19_Cot_Vinh_Loc");
      } else {
        const matrixAoa: any[][] = [
          [examTitle.toUpperCase()],
          [],
          ['TT', 'Chủ đề', 'Nội dung/ Đơn vị kiến thức', 'GQVĐ - Biết', 'GQVĐ - Hiểu', 'GQVĐ - VD', 'Tư duy - Biết', 'Tư duy - Hiểu', 'Tư duy - VD', 'Mô hình - Biết', 'Mô hình - Hiểu', 'Mô hình - VD', 'Tổng số lệnh', 'Điểm', 'Tỉ lệ %']
        ];

        activeMatrix.forEach((r, idx) => {
          matrixAoa.push([
            idx + 1,
            r.topic,
            r.unit,
            r.gqvd?.biet || '-', r.gqvd?.hieu || '-', r.gqvd?.vd || '-',
            r.tuduy?.biet || '-', r.tuduy?.hieu || '-', r.tuduy?.vd || '-',
            r.mohinh?.biet || '-', r.mohinh?.hieu || '-', r.mohinh?.vd || '-',
            2, '0.5-1.0', '5-10%'
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(matrixAoa);
        XLSX.utils.book_append_sheet(wb, ws, "Ma_Tran_GDPT_2018");
      }

      const specAoa: any[][] = [
        [`BẢN ĐẶC TẢ CHI TIẾT KĨ THUẬT ĐỀ KIỂM TRA MÔN TOÁN - ${gradeDisplay}`],
        [],
        ['TT', 'Chủ đề', 'Nội dung kiến thức', 'Yêu cầu cần đạt', 'Phần I (TN)', 'Phần II (Đ/S)', 'Phần III (TLN)', 'Tự luận', 'Điểm']
      ];
      activeSpec.forEach((s, idx) => {
        specAoa.push([
          idx + 1,
          s.topic,
          s.unit,
          `Nhận biết:\n${s.bietSpec}\n\nThông hiểu:\n${s.hieuSpec}\n\nVận dụng:\n${s.vdSpec}`,
          s.assignedQuestions?.part1 || '-',
          s.assignedQuestions?.part2 || '-',
          s.assignedQuestions?.part3 || '-',
          s.assignedQuestions?.essay || '-',
          s.points ? `${s.points.toFixed(2)}đ` : '1.0đ'
        ]);
      });
      const wsSpec = XLSX.utils.aoa_to_sheet(specAoa);
      XLSX.utils.book_append_sheet(wb, wsSpec, "Ban_Dac_Ta_Chi_Tiet");

      XLSX.writeFile(wb, `Ma_Tran_Va_Ban_Dac_Ta_GDPT_${inlineTemplate.subjectName}_${gradeDisplay}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Không thể xuất file Excel. Vui lòng thử lại!");
    }
  };

  return (
    <div className="space-y-6" id="competency-matrix-inline-container">
      {/* Thanh công cụ tương tác */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200 no-print shadow-2xs w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
              Khung chuẩn GDPT 2018 • THPT EDUPLAN AI
            </span>
            <span className="text-xs font-semibold text-indigo-900">
              Mẫu ma trận 19 cột & Bản đặc tả chi tiết 28 lệnh hỏi
            </span>
          </div>
          <h3 className="font-extrabold text-slate-900 text-base mt-1">
            Ma trận 19 cột & Bản đặc tả chi tiết ({examTitle || `Toán ${grade}`})
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Cấu trúc 4 phần chuẩn: <strong>Phần I</strong> (12 câu TNKQ - 3.0đ), <strong>Phần II</strong> (2 câu Đúng/Sai 8 lệnh - 2.0đ), <strong>Phần III</strong> (4 câu TLN - 2.0đ), <strong>Phần IV</strong> (4 câu Tự luận - 3.0đ). Tỉ lệ: 40% Biết - 30% Hiểu - 30% Vận dụng.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            title="Mở Thư viện Ma trận đa môn học để đổi môn hoặc chỉnh sửa chi tiết"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📚 Thư viện Ma trận</span>
          </button>

          {onLoadSampleExam && (
            <button
              type="button"
              onClick={onLoadSampleExam}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              title="Nạp ngay bộ 28 lệnh hỏi khớp 100% mã câu trong ma trận này"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Nạp 28 lệnh mẫu</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSpecTable(prev => !prev)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>{showSpecTable ? 'Ẩn Bảng đặc tả' : 'Hiện Bảng đặc tả'}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowInlineWordDropdown(prev => !prev)}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              title="Tải tài liệu Word (.docx) chuẩn sư phạm Bộ GD&ĐT"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Xuất Word (.docx)</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showInlineWordDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showInlineWordDropdown && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Tải Word Chuẩn Sư Phạm (A4 Ngang)
                </div>
                <button
                  type="button"
                  onClick={() => handleExportWord('full')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold text-indigo-700">Trọn bộ Ma trận & Đặc tả</div>
                    <div className="text-[10px] text-slate-500">Đầy đủ tiêu đề, 2 bảng chuẩn và chữ ký</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord('matrix')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <div className="font-bold">Chỉ tải Bảng Ma trận</div>
                    <div className="text-[10px] text-slate-500">Khung ma trận 19 cột THPT EDUPLAN AI</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportWord('spec')}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold">Chỉ tải Bản đặc tả chi tiết</div>
                    <div className="text-[10px] text-slate-500">Yêu cầu cần đạt và phân bổ các phần thi</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg cursor-pointer transition-all"
            title="In hoặc lưu PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* I. BẢNG MA TRẬN 19 CỘT MẪU THPT VINH LỘC HOẶC KHUNG NĂNG LỰC */}
      <div className="overflow-x-auto bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-center mb-3">
          <h3 className="text-base sm:text-lg font-bold uppercase text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {isVinhLoc 
              ? `I. MA TRẬN ĐỀ KIỂM TRA GIỮA HỌC KÌ I MÔN TOÁN - ${gradeDisplay} (KHUNG 19 CỘT MẪU THPT VINH LỘC 2026-2027)`
              : `I. MA TRẬN ĐỀ KIỂM TRA GIỮA HỌC KÌ I - ${gradeDisplay} (CHUẨN GDPT 2018)`}
          </h3>
        </div>

        {isVinhLoc ? (
          <table className="w-full border-collapse border border-black text-[12px] min-w-[1100px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <thead>
              {/* Hàng 1 */}
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-1.5 w-10" rowSpan={3}>TT</th>
                <th className="border border-black p-1.5 w-44" rowSpan={3}>Chương / Chủ đề</th>
                <th className="border border-black p-1.5 w-52" rowSpan={3}>Nội dung / Đơn vị kiến thức</th>
                <th className="border border-black p-1.5" colSpan={12}>MỨC ĐỘ ĐÁNH GIÁ</th>
                <th className="border border-black p-1.5" colSpan={3} rowSpan={2}>TỔNG</th>
                <th className="border border-black p-1.5 w-16" rowSpan={3}>Tỉ lệ %</th>
              </tr>
              {/* Hàng 2 */}
              <tr className="bg-slate-50 font-bold text-center">
                <th className="border border-black p-1" colSpan={9}>TNKQ</th>
                <th className="border border-black p-1" colSpan={3}>Tự luận</th>
              </tr>
              {/* Hàng 3 */}
              <tr className="bg-slate-100 font-bold text-center text-[11px]">
                <th className="border border-black p-1 w-11">Nhiều LC<br/>Biết</th>
                <th className="border border-black p-1 w-11">Nhiều LC<br/>Hiểu</th>
                <th className="border border-black p-1 w-11">Nhiều LC<br/>VD</th>
                <th className="border border-black p-1 w-11">Đúng-Sai<br/>Biết</th>
                <th className="border border-black p-1 w-11">Đúng-Sai<br/>Hiểu</th>
                <th className="border border-black p-1 w-11">Đúng-Sai<br/>VD</th>
                <th className="border border-black p-1 w-11">TL ngắn<br/>Biết</th>
                <th className="border border-black p-1 w-11">TL ngắn<br/>Hiểu</th>
                <th className="border border-black p-1 w-11">TL ngắn<br/>VD</th>
                <th className="border border-black p-1 w-11">TL<br/>Biết</th>
                <th className="border border-black p-1 w-11">TL<br/>Hiểu</th>
                <th className="border border-black p-1 w-11">TL<br/>VD</th>
                <th className="border border-black p-1 w-11">Biết</th>
                <th className="border border-black p-1 w-11">Hiểu</th>
                <th className="border border-black p-1 w-11">VD</th>
              </tr>
            </thead>

            <tbody>
              {groupedTopics.map((group, gIdx) => {
                return group.rows.map((row, rIdx) => {
                  const bietSum = row.tong?.biet ?? (countMatrixCommands(row.nlc?.biet||'') + countMatrixCommands(row.ds?.biet||'') + countMatrixCommands(row.tln?.biet||'') + countMatrixCommands(row.tl?.biet||''));
                  const hieuSum = row.tong?.hieu ?? (countMatrixCommands(row.nlc?.hieu||'') + countMatrixCommands(row.ds?.hieu||'') + countMatrixCommands(row.tln?.hieu||'') + countMatrixCommands(row.tl?.hieu||''));
                  const vdSum = row.tong?.vd ?? (countMatrixCommands(row.nlc?.vd||'') + countMatrixCommands(row.ds?.vd||'') + countMatrixCommands(row.tln?.vd||'') + countMatrixCommands(row.tl?.vd||''));

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      {rIdx === 0 && (
                        <>
                          <td className="border border-black p-1 text-center font-bold" rowSpan={group.rows.length}>
                            {gIdx + 1}
                          </td>
                          <td className="border border-black p-1 font-bold" rowSpan={group.rows.length}>
                            {row.topic}
                          </td>
                        </>
                      )}
                      <td className="border border-black p-1">{row.unit}</td>
                      <td className="border border-black p-1 text-center font-bold text-blue-700">{row.nlc?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-blue-700">{row.nlc?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-blue-700">{row.nlc?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-indigo-700">{row.ds?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-indigo-700">{row.ds?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-indigo-700">{row.ds?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-purple-700">{row.tln?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-purple-700">{row.tln?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-purple-700">{row.tln?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-rose-700">{row.tl?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-rose-700">{row.tl?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-rose-700">{row.tl?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold bg-slate-50">{bietSum || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold bg-slate-50">{hieuSum || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold bg-slate-50">{vdSum || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold text-emerald-800">{row.tiLe || '-'}</td>
                    </tr>
                  );
                });
              })}

              {/* Dòng 1: Tổng số câu */}
              <tr className="bg-slate-100 font-bold text-center">
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tổng số câu</td>
                <td className="border border-black p-1 text-center font-bold text-blue-700">{vlTotals.counts.nlc.biet}</td>
                <td className="border border-black p-1 text-center font-bold text-blue-700">{vlTotals.counts.nlc.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-blue-700">{vlTotals.counts.nlc.vd || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-700">{vlTotals.counts.ds.biet}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-700">{vlTotals.counts.ds.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-700">{vlTotals.counts.ds.vd || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-purple-700">{vlTotals.counts.tln.biet}</td>
                <td className="border border-black p-1 text-center font-bold text-purple-700">{vlTotals.counts.tln.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-purple-700">{vlTotals.counts.tln.vd || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-rose-700">{vlTotals.counts.tl.biet || '-'}</td>
                <td className="border border-black p-1 text-center font-bold text-rose-700">{vlTotals.counts.tl.hieu}</td>
                <td className="border border-black p-1 text-center font-bold text-rose-700">{vlTotals.counts.tl.vd}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.tong.biet}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.tong.hieu}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.counts.tong.vd}</td>
                <td className="border border-black p-1 text-center font-bold text-indigo-900">{vlTotals.counts.totalQuestions} lệnh hỏi</td>
              </tr>

              {/* Dòng 2: Tổng số điểm */}
              <tr className="bg-slate-50 font-bold text-center">
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tổng số điểm</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.nlc.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.nlc.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.nlc.vd ? vlTotals.scores.nlc.vd.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.ds.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.ds.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.ds.vd ? vlTotals.scores.ds.vd.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tln.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tln.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tln.vd ? vlTotals.scores.tln.vd.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tl.biet ? vlTotals.scores.tl.biet.toFixed(1) : '-'}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tl.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tl.vd.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tong.biet.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tong.hieu.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{vlTotals.scores.tong.vd.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold text-emerald-800">10.0đ</td>
              </tr>

              {/* Dòng 3: Tỉ lệ % */}
              <tr className="bg-slate-100 font-bold text-center">
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>Tỉ lệ %</td>
                <td className="border border-black p-1 text-center font-bold" colSpan={9}>70% (TNKQ: 7.0 điểm)</td>
                <td className="border border-black p-1 text-center font-bold" colSpan={3}>30% (Tự luận: 3.0 điểm)</td>
                <td className="border border-black p-1 text-center font-bold">40%</td>
                <td className="border border-black p-1 text-center font-bold">30%</td>
                <td className="border border-black p-1 text-center font-bold">30%</td>
                <td className="border border-black p-1 text-center font-bold text-emerald-800">100%</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse border border-black text-[12px] min-w-[1100px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-1.5 w-10" rowSpan={3}>TT</th>
                <th className="border border-black p-1.5 w-44" rowSpan={3}>Chủ đề</th>
                <th className="border border-black p-1.5 w-52" rowSpan={3}>Nội dung/ Đơn vị kiến thức</th>
                <th className="border border-black p-1.5" colSpan={9}>NĂNG LỰC MÔN HỌC</th>
                <th className="border border-black p-1.5" colSpan={3} rowSpan={2}>SỐ LỆNH HỎI</th>
                <th className="border border-black p-1.5 w-14" rowSpan={3}>Tổng số lệnh hỏi</th>
                <th className="border border-black p-1.5 w-14" rowSpan={3}>Điểm số</th>
                <th className="border border-black p-1.5 w-14" rowSpan={3}>Tỉ lệ % điểm</th>
                <th className="border border-black p-1.5" colSpan={3}>Tỉ lệ mức độ tư duy (%)</th>
              </tr>
              <tr className="bg-slate-50 font-bold text-center">
                <th className="border border-black p-1" colSpan={3}>Năng lực Giải quyết vấn đề</th>
                <th className="border border-black p-1" colSpan={3}>Năng lực Tư duy và lập luận</th>
                <th className="border border-black p-1" colSpan={3}>Năng lực Mô hình hoá</th>
                <th className="border border-black p-1 w-12" rowSpan={2}>Biết<br/>(40%)</th>
                <th className="border border-black p-1 w-12" rowSpan={2}>Hiểu<br/>(30%)</th>
                <th className="border border-black p-1 w-12" rowSpan={2}>Vận dụng<br/>(30%)</th>
              </tr>
              <tr className="bg-slate-100 font-bold text-center text-[11px]">
                <th className="border border-black p-1 w-10">Biết</th>
                <th className="border border-black p-1 w-10">Hiểu</th>
                <th className="border border-black p-1 w-10">Vận dụng</th>
                <th className="border border-black p-1 w-10">Biết</th>
                <th className="border border-black p-1 w-10">Hiểu</th>
                <th className="border border-black p-1 w-10">Vận dụng</th>
                <th className="border border-black p-1 w-10">Biết</th>
                <th className="border border-black p-1 w-10">Hiểu</th>
                <th className="border border-black p-1 w-10">Vận dụng</th>
                <th className="border border-black p-1 w-10">Biết</th>
                <th className="border border-black p-1 w-10">Hiểu</th>
                <th className="border border-black p-1 w-10">Vận dụng</th>
              </tr>
            </thead>
            <tbody>
              {groupedTopics.map((group, gIdx) => {
                return group.rows.map((row, rIdx) => {
                  return (
                    <tr key={row.id}>
                      {rIdx === 0 && (
                        <>
                          <td className="border border-black p-1 text-center font-bold" rowSpan={group.rows.length}>{gIdx + 1}</td>
                          <td className="border border-black p-1 font-bold" rowSpan={group.rows.length}>{row.topic}</td>
                        </>
                      )}
                      <td className="border border-black p-1">{row.unit}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.gqvd?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.gqvd?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.gqvd?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.tuduy?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.tuduy?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.tuduy?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.mohinh?.biet || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.mohinh?.hieu || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">{row.mohinh?.vd || '-'}</td>
                      <td className="border border-black p-1 text-center font-bold">-</td>
                      <td className="border border-black p-1 text-center font-bold">-</td>
                      <td className="border border-black p-1 text-center font-bold">-</td>
                      <td className="border border-black p-1 text-center font-bold">-</td>
                      <td className="border border-black p-1 text-center font-bold">-</td>
                      <td className="border border-black p-1 text-center font-bold">-</td>
                      <td className="border border-black p-1 text-center">-</td>
                      <td className="border border-black p-1 text-center">-</td>
                      <td className="border border-black p-1 text-center">-</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* II. BẢNG ĐẶC TẢ KĨ THUẬT */}
      {showSpecTable && (
        <div className="overflow-x-auto bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-center mb-3">
            <h3 className="text-base sm:text-lg font-bold uppercase text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              II. BẢN ĐẶC TẢ ĐỀ KIỂM TRA MÔN TOÁN - {gradeDisplay} NĂM HỌC 2025-2026
            </h3>
          </div>

          <table className="w-full border-collapse border border-black text-[12px] min-w-[1000px] font-serif text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-2 w-10">TT</th>
                <th className="border border-black p-2 w-44">Chủ đề</th>
                <th className="border border-black p-2 w-52">Nội dung kiến thức</th>
                <th className="border border-black p-2 min-w-[280px]">Yêu cầu cần đạt</th>
                <th className="border border-black p-2 w-24">Phần I<br/>(TNKQ 4 Lựa chọn)</th>
                <th className="border border-black p-2 w-24">Phần II<br/>(Đúng / Sai)</th>
                <th className="border border-black p-2 w-24">Phần III<br/>(Trả lời ngắn)</th>
                <th className="border border-black p-2 w-24">Phần IV<br/>(Tự luận)</th>
                <th className="border border-black p-2 w-16">Điểm số</th>
              </tr>
            </thead>
            <tbody>
              {activeSpec.map((s, idx) => (
                <tr key={s.id || idx} className="hover:bg-slate-50">
                  <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-2 font-bold">{s.topic}</td>
                  <td className="border border-black p-2">{s.unit}</td>
                  <td className="border border-black p-2 text-left space-y-1.5 whitespace-pre-line">
                    <p><strong className="text-blue-700">Nhận biết:</strong><br/>{s.bietSpec}</p>
                    <p><strong className="text-indigo-700">Thông hiểu:</strong><br/>{s.hieuSpec}</p>
                    <p><strong className="text-rose-700">Vận dụng:</strong><br/>{s.vdSpec}</p>
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-blue-700">{s.assignedQuestions?.part1 || '-'}</td>
                  <td className="border border-black p-2 text-center font-bold text-indigo-700">{s.assignedQuestions?.part2 || '-'}</td>
                  <td className="border border-black p-2 text-center font-bold text-purple-700">{s.assignedQuestions?.part3 || '-'}</td>
                  <td className="border border-black p-2 text-center font-bold text-rose-700">{s.assignedQuestions?.essay || '-'}</td>
                  <td className="border border-black p-2 text-center font-bold text-emerald-800">{s.points ? `${s.points.toFixed(2)}đ` : '1.0đ'}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-center">
                <td className="border border-black p-2" colSpan={4}>TỔNG CỘNG ĐỀ KIỂM TRA</td>
                <td className="border border-black p-2 text-blue-700">{isVinhLoc ? '12 câu (3.0đ)' : '16 câu (4.0đ)'}</td>
                <td className="border border-black p-2 text-indigo-700">2 câu (2.0đ)</td>
                <td className="border border-black p-2 text-purple-700">{isVinhLoc ? '4 câu (2.0đ)' : '2 câu (1.0đ)'}</td>
                <td className="border border-black p-2 text-rose-700">{isVinhLoc ? '4 câu (3.0đ)' : '3 câu (3.0đ)'}</td>
                <td className="border border-black p-2 text-emerald-800 text-sm">10.0đ (100%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Container chuẩn hóa xuất tài liệu Word & In ấn sư phạm Bộ GD&ĐT */}
      <PedagogicalMatrixExportView
        tpl={inlineTemplate}
        docTitle={examTitle || 'ĐỀ KIỂM TRA ĐỊNH KỲ'}
        matrixRows={activeMatrix}
        specUnits={activeSpec}
        idPrefix="pedagogical-inline"
      />
    </div>
  );
}
