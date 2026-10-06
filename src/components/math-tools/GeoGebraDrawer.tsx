import React, { useEffect, useState, useRef } from 'react';
import { Maximize2, Minimize2, Download, Check, X, Layers, Compass, Box, Sparkles } from 'lucide-react';
import { Interactive3DGeometryEngine } from './Interactive3DGeometryEngine';

declare global {
  interface Window {
    GGBApplet: any;
    ggbApplet: any;
  }
}

interface GeoGebraDrawerProps {
  onInsertImage: (base64: string) => void;
  onClose: () => void;
}

export const GeoGebraDrawer: React.FC<GeoGebraDrawerProps> = ({ onInsertImage, onClose }) => {
  const [activeTab, setActiveTab] = useState<'3d_engine' | 'geometry' | '3d_ggb' | 'graphing'>('3d_engine');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to initialize or re-initialize GeoGebra Applet
  const loadGeoGebra = (type: 'geometry' | '3d' | 'graphing') => {
    setIsLoaded(false);
    
    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const appletDiv = document.createElement('div');
      appletDiv.id = 'ggb-applet-inner';
      containerRef.current.appendChild(appletDiv);
    }

    if (!window.GGBApplet) {
      console.error('GeoGebra deployggb.js library not loaded');
      return;
    }

    const width = isFullscreen ? window.innerWidth - 48 : 800;
    const height = isFullscreen ? window.innerHeight - 180 : 500;

    const params = {
      appName: type,
      width: width,
      height: height,
      showToolBar: true,
      showAlgebraInput: true,
      showMenuBar: true,
      allowStyleBar: true,
      showResetIcon: true,
      enableLabelDrags: true,
      enableShiftDragZoom: true,
      enableRightClick: true,
      playButton: true,
      showZoomButtons: true,
      appletOnLoad: () => {
        setIsLoaded(true);
      },
    };

    const applet = new window.GGBApplet(params, true);
    applet.inject('ggb-applet-inner');
  };

  // Re-load on active tab changes OR fullscreen toggles
  useEffect(() => {
    if (activeTab !== '3d_engine') {
      const ggbType = activeTab === '3d_ggb' ? '3d' : activeTab;
      loadGeoGebra(ggbType);
    }
  }, [activeTab, isFullscreen]);

  const handleDownloadPNG = () => {
    if (window.ggbApplet) {
      window.ggbApplet.getPNGBase64(1, false, 300, (base64: string) => {
        const link = document.createElement('a');
        link.href = 'data:image/png;base64,' + base64;
        link.download = `geogebra_${activeTab}_export.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    } else {
      alert('GeoGebra chưa tải xong hoặc không khả dụng.');
    }
  };

  const handleInsertImage = () => {
    if (window.ggbApplet) {
      window.ggbApplet.getPNGBase64(1, false, 300, (base64: string) => {
        const dataUrl = 'data:image/png;base64,' + base64;
        onInsertImage(dataUrl);
      });
    } else {
      alert('GeoGebra chưa tải xong hoặc không khả dụng.');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 transition-all duration-300`}>
      <div className={`bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'w-screen h-screen m-0 rounded-none' : 'w-full max-w-6xl h-[88vh] max-h-[850px]'
      }`}>
        
        {/* Header Contract */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg tracking-wide">
                Công cụ Vẽ hình & Mô phỏng 3D Tương tác
              </h3>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hỗ trợ Three.js 3D WebGL (Style Cabri 3D) và GeoGebra Embed API chuẩn SGK 2018
              </p>
            </div>
          </div>

          {/* Type switcher */}
          <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('3d_engine')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === '3d_engine' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-emerald-300" />
              <span>Mô phỏng 3D WebGL (Cabri)</span>
            </button>
            <button
              onClick={() => setActiveTab('geometry')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'geometry' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>GeoGebra Phẳng</span>
            </button>
            <button
              onClick={() => setActiveTab('3d_ggb')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === '3d_ggb' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              <span>GeoGebra 3D</span>
            </button>
            <button
              onClick={() => setActiveTab('graphing')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'graphing' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đồ thị GeoGebra</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Sandbox */}
        <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden relative">
          {activeTab === '3d_engine' ? (
            <div className="w-full h-full p-2">
              <Interactive3DGeometryEngine
                onInsertImage={(base64) => {
                  onInsertImage(base64);
                  onClose();
                }}
                insertButtonLabel="Chèn hình 3D vào câu hỏi / đề thi"
                isEmbedModal={true}
              />
            </div>
          ) : (
            <>
              {!isLoaded && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-10 text-white">
                  <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-semibold text-slate-300">Đang khởi tạo GeoGebra {
                    activeTab === 'geometry' ? 'Hình học Phẳng' : activeTab === '3d_ggb' ? 'Không gian 3D' : 'Đồ thị'
                  }...</p>
                </div>
              )}
              <div 
                ref={containerRef} 
                className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-800"
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div id="ggb-applet-inner"></div>
              </div>
            </>
          )}
        </div>

        {/* Actions bar for GeoGebra tabs */}
        {activeTab !== '3d_engine' && (
          <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-white">
            <span className="text-xs text-slate-400 italic">
              * Nhấn "Chèn vào câu hỏi" để chèn trực tiếp hình vẽ này dưới dạng ảnh PNG.
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPNG}
                className="px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                Tải ảnh PNG
              </button>
              <button
                onClick={handleInsertImage}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                Chèn vào câu hỏi
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
