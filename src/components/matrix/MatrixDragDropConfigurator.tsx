import React, { useState } from 'react';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  X, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  HelpCircle,
  Move,
  Info
} from 'lucide-react';
import { MatrixRowItem } from '../../data/matrixLibraryData';
import { countMatrixCommands, countMatrixScore } from '../CompetencyMatrixModal';

interface MatrixDragDropConfiguratorProps {
  matrixData: MatrixRowItem[];
  onChangeMatrixData: (newData: MatrixRowItem[]) => void;
  competencyHeaders: {
    c1: string;
    c2: string;
    c3: string;
  };
  onResetDefault?: () => void;
}

interface DraggedTokenInfo {
  type: 'existing_token' | 'new_generator';
  sourceRowId?: string;
  sourceCompetency?: 'gqvd' | 'tuduy' | 'mohinh';
  sourceLevel?: 'biet' | 'hieu' | 'vd';
  token?: string;
  newType?: 'mc' | 'tf' | 'sa' | 'essay';
}

export function MatrixDragDropConfigurator({
  matrixData,
  onChangeMatrixData,
  competencyHeaders,
  onResetDefault
}: MatrixDragDropConfiguratorProps) {
  // Drag states
  const [draggedToken, setDraggedToken] = useState<DraggedTokenInfo | null>(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [activeDropCell, setActiveDropCell] = useState<string | null>(null);
  const [isTrashHovered, setIsTrashHovered] = useState<boolean>(false);
  const [quickAddModal, setQuickAddModal] = useState<{
    rowId: string;
    competency: 'gqvd' | 'tuduy' | 'mohinh';
    level: 'biet' | 'hieu' | 'vd';
  } | null>(null);
  const [customInputVal, setCustomInputVal] = useState<string>('');

  // 1. Row Drag & Drop
  const handleRowDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === targetIndex) {
      setDraggedRowIndex(null);
      return;
    }
    const updated = [...matrixData];
    const [moved] = updated.splice(draggedRowIndex, 1);
    updated.splice(targetIndex, 0, moved);
    onChangeMatrixData(updated);
    setDraggedRowIndex(null);
  };

  // 2. Token Drag & Drop
  const handleTokenDragStart = (
    e: React.DragEvent,
    token: string,
    rowId: string,
    competency: 'gqvd' | 'tuduy' | 'mohinh',
    level: 'biet' | 'hieu' | 'vd'
  ) => {
    e.stopPropagation();
    const info: DraggedTokenInfo = {
      type: 'existing_token',
      token,
      sourceRowId: rowId,
      sourceCompetency: competency,
      sourceLevel: level
    };
    setDraggedToken(info);
    e.dataTransfer.setData('text/plain', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'move';
  };

  // New question chip generator drag start
  const handleNewChipDragStart = (e: React.DragEvent, newType: 'mc' | 'tf' | 'sa' | 'essay') => {
    e.stopPropagation();
    const info: DraggedTokenInfo = {
      type: 'new_generator',
      newType
    };
    setDraggedToken(info);
    e.dataTransfer.setData('text/plain', JSON.stringify(info));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCellDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedToken?.type === 'new_generator' ? 'copy' : 'move';
    if (activeDropCell !== cellKey) {
      setActiveDropCell(cellKey);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropCell(null);
  };

  // Compute next available question number for new chip
  const getNextQuestionCode = (type: 'mc' | 'tf' | 'sa' | 'essay'): string => {
    const allTokens: string[] = [];
    matrixData.forEach(r => {
      ['gqvd', 'tuduy', 'mohinh'].forEach(c => {
        ['biet', 'hieu', 'vd'].forEach(l => {
          const str = (r as any)[c][l];
          if (str) {
            allTokens.push(...str.split(',').map((s: string) => s.trim()).filter(Boolean));
          }
        });
      });
    });

    if (type === 'mc') {
      let maxNum = 0;
      allTokens.forEach(t => {
        const m = t.match(/^I\.(\d+)/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      return `I.${maxNum + 1}`;
    } else if (type === 'tf') {
      let maxNum = 0;
      allTokens.forEach(t => {
        const m = t.match(/^II\.(\d+)/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      return `II.${maxNum + 1}ab`;
    } else if (type === 'sa') {
      let maxNum = 0;
      allTokens.forEach(t => {
        const m = t.match(/^III\.(\d+)/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      return `III.${maxNum + 1}`;
    } else {
      let maxNum = 0;
      allTokens.forEach(t => {
        const m = t.match(/^TL(\d+)/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      return `TL${maxNum + 1}`;
    }
  };

  const handleCellDrop = (
    e: React.DragEvent,
    targetRowId: string,
    targetCompetency: 'gqvd' | 'tuduy' | 'mohinh',
    targetLevel: 'biet' | 'hieu' | 'vd'
  ) => {
    e.preventDefault();
    setActiveDropCell(null);

    if (!draggedToken) return;

    if (draggedToken.type === 'existing_token') {
      const { sourceRowId, sourceCompetency, sourceLevel, token } = draggedToken;
      if (!token || !sourceRowId || !sourceCompetency || !sourceLevel) return;

      // If dropped onto the exact same cell, do nothing
      if (
        sourceRowId === targetRowId &&
        sourceCompetency === targetCompetency &&
        sourceLevel === targetLevel
      ) {
        setDraggedToken(null);
        return;
      }

      // Move token from source to target
      const updated = matrixData.map(row => {
        const next = { ...row };
        // Remove from source
        if (row.id === sourceRowId) {
          const oldVal = (next as any)[sourceCompetency][sourceLevel] || '';
          const filtered = oldVal
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && s !== token)
            .join(', ');
          next[sourceCompetency] = {
            ...next[sourceCompetency],
            [sourceLevel]: filtered
          };
        }
        // Add to target
        if (row.id === targetRowId) {
          const oldVal = (next as any)[targetCompetency][targetLevel] || '';
          const parts = oldVal ? oldVal.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          if (!parts.includes(token)) {
            parts.push(token);
          }
          next[targetCompetency] = {
            ...next[targetCompetency],
            [targetLevel]: parts.join(', ')
          };
        }
        return next;
      });

      onChangeMatrixData(updated);
    } else if (draggedToken.type === 'new_generator' && draggedToken.newType) {
      // Generate new token code
      const newTokenCode = getNextQuestionCode(draggedToken.newType);
      const updated = matrixData.map(row => {
        if (row.id === targetRowId) {
          const oldVal = (row as any)[targetCompetency][targetLevel] || '';
          const parts = oldVal ? oldVal.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          parts.push(newTokenCode);
          return {
            ...row,
            [targetCompetency]: {
              ...row[targetCompetency],
              [targetLevel]: parts.join(', ')
            }
          };
        }
        return row;
      });

      onChangeMatrixData(updated);
    }

    setDraggedToken(null);
  };

  // Trash drop: delete token
  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsTrashHovered(false);
    if (!draggedToken || draggedToken.type !== 'existing_token') {
      setDraggedToken(null);
      return;
    }

    const { sourceRowId, sourceCompetency, sourceLevel, token } = draggedToken;
    if (!sourceRowId || !sourceCompetency || !sourceLevel || !token) {
      setDraggedToken(null);
      return;
    }

    const updated = matrixData.map(row => {
      if (row.id === sourceRowId) {
        const oldVal = (row as any)[sourceCompetency][sourceLevel] || '';
        const filtered = oldVal
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s && s !== token)
          .join(', ');
        return {
          ...row,
          [sourceCompetency]: {
            ...row[sourceCompetency],
            [sourceLevel]: filtered
          }
        };
      }
      return row;
    });

    onChangeMatrixData(updated);
    setDraggedToken(null);
  };

  // Direct token delete
  const handleDeleteTokenDirect = (
    rowId: string,
    competency: 'gqvd' | 'tuduy' | 'mohinh',
    level: 'biet' | 'hieu' | 'vd',
    tokenToDelete: string
  ) => {
    const updated = matrixData.map(row => {
      if (row.id === rowId) {
        const oldVal = (row as any)[competency][level] || '';
        const filtered = oldVal
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s && s !== tokenToDelete)
          .join(', ');
        return {
          ...row,
          [competency]: {
            ...row[competency],
            [level]: filtered
          }
        };
      }
      return row;
    });
    onChangeMatrixData(updated);
  };

  // Quick manual add
  const handleCommitQuickAdd = () => {
    if (!quickAddModal || !customInputVal.trim()) {
      setQuickAddModal(null);
      return;
    }
    const { rowId, competency, level } = quickAddModal;
    const tokensToAdd = customInputVal
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updated = matrixData.map(row => {
      if (row.id === rowId) {
        const oldVal = (row as any)[competency][level] || '';
        const parts = oldVal ? oldVal.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        tokensToAdd.forEach(t => {
          if (!parts.includes(t)) parts.push(t);
        });
        return {
          ...row,
          [competency]: {
            ...row[competency],
            [level]: parts.join(', ')
          }
        };
      }
      return row;
    });

    onChangeMatrixData(updated);
    setQuickAddModal(null);
    setCustomInputVal('');
  };

  // Helper badge styles
  const getTokenStyle = (token: string) => {
    if (/^I\.\d+/i.test(token)) {
      return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700';
    } else if (/^II\.\d+/i.test(token)) {
      return 'bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700';
    } else if (/^III\.\d+/i.test(token)) {
      return 'bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700';
    } else if (/^TL\d+/i.test(token)) {
      return 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300';
  };

  // Render a droppable cell
  const renderDroppableCell = (
    row: MatrixRowItem,
    competency: 'gqvd' | 'tuduy' | 'mohinh',
    level: 'biet' | 'hieu' | 'vd',
    bgColorClass: string
  ) => {
    const cellKey = `${row.id}_${competency}_${level}`;
    const rawVal = (row as any)[competency][level] || '';
    const tokens = rawVal
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const isTarget = activeDropCell === cellKey;

    return (
      <td
        key={cellKey}
        onDragOver={e => handleCellDragOver(e, cellKey)}
        onDragLeave={handleCellDragLeave}
        onDrop={e => handleCellDrop(e, row.id, competency, level)}
        className={`border border-black p-1.5 transition-all relative group/cell min-w-[70px] ${
          isTarget
            ? 'bg-amber-100 ring-2 ring-amber-500 ring-inset shadow-inner'
            : bgColorClass
        }`}
      >
        <div className="flex flex-wrap gap-1 min-h-[28px] items-center justify-center">
          {tokens.map((token: string, idx: number) => (
            <div
              key={`${token}_${idx}`}
              draggable
              onDragStart={e => handleTokenDragStart(e, token, row.id, competency, level)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-grab active:cursor-grabbing select-none shadow-2xs transition-transform active:scale-95 ${getTokenStyle(
                token
              )}`}
              title="Kéo sang ô khác để chuyển câu hỏi hoặc kéo vào Thùng rác để xóa"
            >
              <span>{token}</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteTokenDirect(row.id, competency, level, token);
                }}
                className="opacity-40 hover:opacity-100 hover:text-red-600 rounded cursor-pointer"
                title="Xóa câu hỏi này"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}

          {/* Quick Add Button on Hover */}
          <button
            type="button"
            onClick={() => {
              setQuickAddModal({ rowId: row.id, competency, level });
              setCustomInputVal('');
            }}
            className="opacity-0 group-hover/cell:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all cursor-pointer"
            title="Thêm nhanh câu lệnh hỏi"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </td>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Quick Question Tray / Generator & Trash Dropzone */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-indigo-900/60 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Tray of Draggable Chips */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-amber-300">
              Khay Kéo - Thả Câu Lệnh Hỏi Mới (Drag & Drop Pool)
            </h4>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Kéo các chip câu hỏi mẫu dưới đây thả trực tiếp vào các ô ma trận để phân bổ lệnh hỏi:
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            
            {/* Chip Phần I */}
            <div
              draggable
              onDragStart={e => handleNewChipDragStart(e, 'mc')}
              className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-xs transition-all select-none border border-blue-400/50"
              title="Kéo vào ô ma trận để thêm câu Trắc nghiệm 4 lựa chọn (Phần I - 0.25đ)"
            >
              <Move className="w-3 h-3" />
              <span>+ I.x (TNKQ 4 Lựa chọn)</span>
            </div>

            {/* Chip Phần II */}
            <div
              draggable
              onDragStart={e => handleNewChipDragStart(e, 'tf')}
              className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-xs transition-all select-none border border-violet-400/50"
              title="Kéo vào ô ma trận để thêm câu Đúng/Sai (Phần II - 4 ý a,b,c,d)"
            >
              <Move className="w-3 h-3" />
              <span>+ II.x (Đúng / Sai)</span>
            </div>

            {/* Chip Phần III */}
            <div
              draggable
              onDragStart={e => handleNewChipDragStart(e, 'sa')}
              className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-xs transition-all select-none border border-cyan-400/50"
              title="Kéo vào ô ma trận để thêm câu Trả lời ngắn (Phần III - 0.5đ)"
            >
              <Move className="w-3 h-3" />
              <span>+ III.x (Trả lời ngắn)</span>
            </div>

            {/* Chip Phần IV */}
            <div
              draggable
              onDragStart={e => handleNewChipDragStart(e, 'essay')}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-xs transition-all select-none border border-rose-400/50"
              title="Kéo vào ô ma trận để thêm câu Tự luận (Phần IV - 1.0đ)"
            >
              <Move className="w-3 h-3" />
              <span>+ TL.x (Tự luận)</span>
            </div>
          </div>
        </div>

        {/* Trash Dropzone */}
        <div
          onDragOver={e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsTrashHovered(true);
          }}
          onDragLeave={() => setIsTrashHovered(false)}
          onDrop={handleTrashDrop}
          className={`px-4 py-3 rounded-xl border-2 border-dashed flex items-center gap-2 transition-all shrink-0 cursor-default select-none ${
            isTrashHovered
              ? 'bg-rose-600 text-white border-rose-300 scale-105 shadow-lg'
              : 'bg-white/10 text-slate-300 border-slate-600 hover:border-rose-400'
          }`}
          title="Thả câu hỏi vào đây để xóa bỏ khỏi ma trận"
        >
          <Trash2 className="w-5 h-5 text-rose-400" />
          <div className="text-xs">
            <span className="font-extrabold block">Thùng rác Kéo - Thả</span>
            <span className="text-[10px] opacity-75">Thả câu hỏi vào đây để xóa</span>
          </div>
        </div>

      </div>

      {/* 2. Drag-and-drop Table */}
      <div className="overflow-x-auto bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Mẹo: Kéo biểu tượng <strong>⠿</strong> ở cột đầu để đổi thứ tự hàng; kéo các nhãn câu hỏi giữa các ô để chuyển mức độ nhận thức.</span>
          </div>
          {onResetDefault && (
            <button
              type="button"
              onClick={onResetDefault}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục mẫu gốc</span>
            </button>
          )}
        </div>

        <table
          className="w-full border-collapse border border-black text-[12px] min-w-[980px] font-serif text-black"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          <thead>
            {/* Hàng 1 */}
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1 w-8" rowSpan={3}>⠿</th>
              <th className="border border-black p-1 w-10" rowSpan={3}>TT</th>
              <th className="border border-black p-1 w-48" rowSpan={3}>Chủ đề</th>
              <th className="border border-black p-1 w-52" rowSpan={3}>Nội dung / Đơn vị kiến thức</th>
              <th className="border border-black p-1" colSpan={9}>
                Mức độ đánh giá theo Năng lực môn học
              </th>
              <th className="border border-black p-1 w-16" rowSpan={3}>Tổng lệnh</th>
              <th className="border border-black p-1 w-14" rowSpan={3}>Điểm</th>
            </tr>

            {/* Hàng 2: Tên năng lực */}
            <tr className="bg-slate-50 font-bold text-center">
              <th className="border border-black p-1 text-blue-800" colSpan={3}>
                1. {competencyHeaders.c1}
              </th>
              <th className="border border-black p-1 text-indigo-800" colSpan={3}>
                2. {competencyHeaders.c2}
              </th>
              <th className="border border-black p-1 text-purple-800" colSpan={3}>
                3. {competencyHeaders.c3}
              </th>
            </tr>

            {/* Hàng 3: Cấp độ nhận thức */}
            <tr className="bg-slate-100 font-bold text-center text-[11px]">
              <th className="border border-black p-1 w-14 text-blue-700 bg-blue-50/50">Biết</th>
              <th className="border border-black p-1 w-14 text-blue-700 bg-blue-50/50">Hiểu</th>
              <th className="border border-black p-1 w-14 text-blue-700 bg-blue-50/50">VD</th>

              <th className="border border-black p-1 w-14 text-indigo-700 bg-indigo-50/50">Biết</th>
              <th className="border border-black p-1 w-14 text-indigo-700 bg-indigo-50/50">Hiểu</th>
              <th className="border border-black p-1 w-14 text-indigo-700 bg-indigo-50/50">VD</th>

              <th className="border border-black p-1 w-14 text-purple-700 bg-purple-50/50">Biết</th>
              <th className="border border-black p-1 w-14 text-purple-700 bg-purple-50/50">Hiểu</th>
              <th className="border border-black p-1 w-14 text-purple-700 bg-purple-50/50">VD</th>
            </tr>
          </thead>

          <tbody>
            {matrixData.map((row, idx) => {
              const rowCmdCount = 
                countMatrixCommands(row.gqvd.biet) + countMatrixCommands(row.gqvd.hieu) + countMatrixCommands(row.gqvd.vd) +
                countMatrixCommands(row.tuduy.biet) + countMatrixCommands(row.tuduy.hieu) + countMatrixCommands(row.tuduy.vd) +
                countMatrixCommands(row.mohinh.biet) + countMatrixCommands(row.mohinh.hieu) + countMatrixCommands(row.mohinh.vd);

              const rowScore = 
                countMatrixScore(row.gqvd.biet) + countMatrixScore(row.gqvd.hieu) + countMatrixScore(row.gqvd.vd) +
                countMatrixScore(row.tuduy.biet) + countMatrixScore(row.tuduy.hieu) + countMatrixScore(row.tuduy.vd) +
                countMatrixScore(row.mohinh.biet) + countMatrixScore(row.mohinh.hieu) + countMatrixScore(row.mohinh.vd);

              const isDraggingThisRow = draggedRowIndex === idx;

              return (
                <tr
                  key={row.id}
                  draggable
                  onDragStart={e => handleRowDragStart(e, idx)}
                  onDragOver={e => handleRowDragOver(e, idx)}
                  onDrop={e => handleRowDrop(e, idx)}
                  className={`transition-colors ${
                    isDraggingThisRow ? 'opacity-30 bg-indigo-100' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Grip Handle for Row Drag */}
                  <td className="border border-black p-1 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 bg-slate-50">
                    <GripVertical className="w-4 h-4 mx-auto" />
                  </td>

                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold text-slate-900">{row.topic}</td>
                  <td className="border border-black p-1 text-slate-800">{row.unit}</td>

                  {/* 1. Năng lực 1: GQVĐ */}
                  {renderDroppableCell(row, 'gqvd', 'biet', 'bg-blue-50/20')}
                  {renderDroppableCell(row, 'gqvd', 'hieu', 'bg-blue-50/20')}
                  {renderDroppableCell(row, 'gqvd', 'vd', 'bg-blue-50/20')}

                  {/* 2. Năng lực 2: Tư duy */}
                  {renderDroppableCell(row, 'tuduy', 'biet', 'bg-indigo-50/20')}
                  {renderDroppableCell(row, 'tuduy', 'hieu', 'bg-indigo-50/20')}
                  {renderDroppableCell(row, 'tuduy', 'vd', 'bg-indigo-50/20')}

                  {/* 3. Năng lực 3: Mô hình hoá */}
                  {renderDroppableCell(row, 'mohinh', 'biet', 'bg-purple-50/20')}
                  {renderDroppableCell(row, 'mohinh', 'hieu', 'bg-purple-50/20')}
                  {renderDroppableCell(row, 'mohinh', 'vd', 'bg-purple-50/20')}

                  {/* Tổng dòng */}
                  <td className="border border-black p-1 text-center font-bold text-indigo-700 bg-slate-50">
                    {rowCmdCount || '-'}
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-emerald-800 bg-slate-50">
                    {rowScore > 0 ? `${rowScore.toFixed(2)}đ` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Modal thêm câu hỏi nhanh */}
      {quickAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                Thêm mã câu hỏi vào ô
              </h5>
              <button onClick={() => setQuickAddModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Nhập mã câu hỏi (ví dụ: <code className="font-mono bg-slate-100 px-1 rounded">I.1</code>, <code className="font-mono bg-slate-100 px-1 rounded">II.1ab</code>, <code className="font-mono bg-slate-100 px-1 rounded">III.1</code>, <code className="font-mono bg-slate-100 px-1 rounded">TL1</code>). Ngăn cách bằng dấu phẩy nếu nhiều câu:
            </p>
            <input
              type="text"
              value={customInputVal}
              onChange={e => setCustomInputVal(e.target.value)}
              placeholder="VD: I.1, I.2 hoặc TL1"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleCommitQuickAdd();
              }}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuickAddModal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCommitQuickAdd}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                Thêm vào ma trận
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
