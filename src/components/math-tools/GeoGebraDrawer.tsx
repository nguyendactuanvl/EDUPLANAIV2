import React, { useEffect, useState, useRef } from 'react';
import { Maximize2, Minimize2, Download, Check, X, Layers, Compass, Box } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'geometry' | '3d' | 'graphing'>('geometry');
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
    loadGeoGebra(activeTab);
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 transition-all duration-300`}>
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'w-screen h-screen m-0 rounded-none' : 'w-full max-w-5xl h-[700px]'
      }`}>
        
        {/* Header Contract */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📐</span>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">GeoGebra vẽ hình trực quan</h3>
              <p className="text-xs text-slate-500">Thiết kế hình phẳng, hình không gian 3D và vẽ đồ thị hàm số</p>
            </div>
          </div>

          {/* Type switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('geometry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'geometry' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Hình học phẳng
            </button>
            <button
              onClick={() => setActiveTab('3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === '3d' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Không gian 3D
            </button>
            <button
              onClick={() => setActiveTab('graphing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'graphing' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Đồ thị hàm số
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-all"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-all"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Sandbox */}
        <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-hidden relative">
          {!isLoaded && (
            <div className="absolute inset-0 bg-slate-100/90 flex flex-col items-center justify-center z-10">
              <div className="w-10 h-10 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-semibold text-slate-600">Đang khởi tạo GeoGebra {
                activeTab === 'geometry' ? 'Hình học' : activeTab === '3d' ? '3D' : 'Đồ thị'
              }...</p>
            </div>
          )}
          <div 
            ref={containerRef} 
            className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200"
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div id="ggb-applet-inner"></div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-500 italic">
            * Nhấn "Chèn vào câu hỏi" để chèn trực tiếp hình vẽ này vào nội dung câu hỏi dưới dạng ảnh.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPNG}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Tải ảnh PNG
            </button>
            <button
              onClick={handleInsertImage}
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              Chèn vào câu hỏi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
