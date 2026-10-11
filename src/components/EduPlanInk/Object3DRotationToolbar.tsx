import React from 'react';
import { Rotate3d, RefreshCw, ZoomIn, ZoomOut, Trash2, Tag, Lock, Move, ChevronUp, ChevronDown } from 'lucide-react';
import { Interactive3DObject } from './types';

interface Object3DRotationToolbarProps {
  object: Interactive3DObject;
  onUpdate: (updated: Interactive3DObject) => void;
  onDelete: () => void;
  onDeselect: () => void;
}

export const Object3DRotationToolbar: React.FC<Object3DRotationToolbarProps> = ({
  object,
  onUpdate,
  onDelete,
  onDeselect
}) => {
  const handleRotate = (axis: 'rotX' | 'rotY' | 'rotZ', delta: number) => {
    onUpdate({
      ...object,
      [axis]: (object[axis] + delta + 360) % 360
    });
  };

  const handleReset = () => {
    onUpdate({
      ...object,
      rotX: 25,
      rotY: 35,
      rotZ: 0
    });
  };

  const handleScale = (delta: number) => {
    onUpdate({
      ...object,
      scale: Math.max(30, Math.min(300, object.scale + delta))
    });
  };

  const handleToggleLabels = () => {
    onUpdate({
      ...object,
      showLabels: !object.showLabels
    });
  };

  return (
    <div
      className="fixed z-40 bg-slate-900/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl p-3 shadow-2xl text-white animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-2.5 max-w-md"
      style={{
        left: Math.max(20, Math.min(window.innerWidth - 380, object.x - 180)),
        top: Math.max(20, object.y - object.scale - 130)
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
            <Rotate3d className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Xoay Khối 3D: <span className="text-sky-400 capitalize">{object.kind}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
            title="Đặt lại góc xoay chuẩn"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={onDeselect}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs px-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Axis Rotation Sliders & Quick Step Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Pitch X */}
        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-400">
            <span>X (Pitch)</span>
            <span className="text-sky-400">{Math.round(object.rotX)}°</span>
          </div>
          <div className="flex items-center gap-1 w-full justify-center">
            <button
              onClick={() => handleRotate('rotX', -15)}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 active:scale-95"
              title="Xoay X -15°"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0"
              max="360"
              value={object.rotX}
              onChange={(e) => onUpdate({ ...object, rotX: Number(e.target.value) })}
              className="w-16 accent-sky-400 cursor-pointer"
            />
            <button
              onClick={() => handleRotate('rotX', 15)}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 active:scale-95"
              title="Xoay X +15°"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Yaw Y */}
        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-400">
            <span>Y (Yaw)</span>
            <span className="text-sky-400">{Math.round(object.rotY)}°</span>
          </div>
          <div className="flex items-center gap-1 w-full justify-center">
            <button
              onClick={() => handleRotate('rotY', -15)}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 active:scale-95"
              title="Xoay Y -15°"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0"
              max="360"
              value={object.rotY}
              onChange={(e) => onUpdate({ ...object, rotY: Number(e.target.value) })}
              className="w-16 accent-sky-400 cursor-pointer"
            />
            <button
              onClick={() => handleRotate('rotY', 15)}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 active:scale-95"
              title="Xoay Y +15°"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Roll Z */}
        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 flex flex-col items-center gap-1">
          <div className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-400">
            <span>Z (Roll)</span>
            <span className="text-sky-400">{Math.round(object.rotZ)}°</span>
          </div>
          <div className="flex items-center gap-1 w-full justify-center">
            <button
              onClick={() => handleRotate('rotZ', -15)}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 active:scale-95"
              title="Xoay Z -15°"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0"
              max="360"
              value={object.rotZ}
              onChange={(e) => onUpdate({ ...object, rotZ: Number(e.target.value) })}
              className="w-16 accent-sky-400 cursor-pointer"
            />
            <button
              onClick={() => handleRotate('rotZ', 15)}
              className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 active:scale-95"
              title="Xoay Z +15°"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Utility Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          {/* Scale controls */}
          <button
            onClick={() => handleScale(-15)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 text-xs"
            title="Thu nhỏ khối 3D"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleScale(15)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 text-xs"
            title="Phóng to khối 3D"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Labels */}
          <button
            onClick={handleToggleLabels}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors ${
              object.showLabels
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Hiện/Ẩn tên đỉnh (S, A, B, C...)"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tên đỉnh</span>
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex items-center gap-1 text-xs"
          title="Xóa khối 3D này"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa</span>
        </button>
      </div>
    </div>
  );
};
