import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Box, AlertCircle } from 'lucide-react';
import { GeometryPreset, Point3D } from '../types/geometry.types';

interface GeoGebraViewerProps {
  activePreset: GeometryPreset;
  currentStepIndex: number;
  isOxyzActive: boolean;
  isUnfoldActive: boolean;
  onPointSelect?: (pointName: string, coords: Point3D) => void;
  onAppletLoaded?: () => void;
}

declare global {
  interface Window {
    GGBApplet?: any;
    ggbApplet?: any;
  }
}

export const GeoGebraViewer: React.FC<GeoGebraViewerProps> = ({
  activePreset,
  currentStepIndex,
  isOxyzActive,
  isUnfoldActive,
  onPointSelect,
  onAppletLoaded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const appletRef = useRef<any>(null);

  // Load GeoGebra deployggb.js script
  useEffect(() => {
    let isMounted = true;

    const loadGgbScript = () => {
      if (window.GGBApplet) {
        initApplet();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.geogebra.org/apps/deployggb.js';
      script.async = true;
      script.onload = () => {
        if (isMounted) initApplet();
      };
      script.onerror = () => {
        if (isMounted) {
          setIsLoading(false);
          setLoadError('Không thể tải thư viện GeoGebra 3D Web API. Vui lòng kiểm tra kết nối mạng.');
        }
      };
      document.body.appendChild(script);
    };

    const initApplet = () => {
      if (!containerRef.current || !window.GGBApplet) return;

      const containerId = 'ggb-3d-applet-container';
      let containerDiv = document.getElementById(containerId);
      if (!containerDiv) {
        containerDiv = document.createElement('div');
        containerDiv.id = containerId;
        containerRef.current.appendChild(containerDiv);
      }

      const params = {
        id: 'ggbApplet3D',
        appName: '3d',
        width: containerRef.current.clientWidth || 800,
        height: containerRef.current.clientHeight || 600,
        showToolBar: false,
        showAlgebraInput: false,
        showMenuBar: false,
        showPerspective: false,
        perspective: 'T',
        enableLabelDrags: false,
        enableShiftDragZoom: true,
        enableRightClick: false,
        showResetIcon: false,
        useBrowserForJS: true,
        allowStyleBar: false,
        errorDialogsActive: false,
        appletOnLoad: (ggbApp: any) => {
          appletRef.current = ggbApp;
          try {
            if (typeof ggbApp.setErrorDialogsActive === 'function') {
              ggbApp.setErrorDialogsActive(false);
            }
          } catch (e) {}
          if (isMounted) {
            setIsLoading(false);
            if (onAppletLoaded) onAppletLoaded();
            setupAppletContent(ggbApp);
          }
        }
      };

      const applet = new window.GGBApplet(params, true);
      applet.inject(containerId);
    };

    loadGgbScript();

    return () => {
      isMounted = false;
    };
  }, []);

  // Setup Applet Content when preset or step changes
  const setupAppletContent = (ggbApp: any) => {
    if (!ggbApp) return;

    try {
      if (typeof ggbApp.setErrorDialogsActive === 'function') {
        ggbApp.setErrorDialogsActive(false);
      }

      // Cleanly clear existing objects without deleting fixed 3D axes
      if (typeof ggbApp.newConstruction === 'function') {
        ggbApp.newConstruction();
      } else if (typeof ggbApp.reset === 'function') {
        ggbApp.reset();
      }

      if (typeof ggbApp.setAxesVisible === 'function') {
        ggbApp.setAxesVisible(true, isOxyzActive, isOxyzActive, isOxyzActive);
      }
      if (typeof ggbApp.setGridVisible === 'function') {
        ggbApp.setGridVisible(true, false);
      }

      // Execute initial preset commands safely
      if (activePreset.initialCommands) {
        activePreset.initialCommands.forEach((cmd: string) => {
          try {
            ggbApp.evalCommand(cmd);
          } catch (e) {
            console.warn('GeoGebra initial command notice:', cmd, e);
          }
        });
      }

      // Execute commands up to current step
      for (let i = 0; i <= currentStepIndex; i++) {
        const step = activePreset.timelineSteps[i];
        if (step && step.ggbCommands) {
          step.ggbCommands.forEach((cmd: string) => {
            try {
              ggbApp.evalCommand(cmd);
            } catch (e) {
              console.warn('GeoGebra step command notice:', cmd, e);
            }
          });
        }
      }

      // Handle Unfold Net 2D only if explicitly active and preset supports it
      if (isUnfoldActive && activePreset.unfoldAvailable) {
        if (activePreset.id === 'thcs_cube') {
          try {
            ggbApp.evalCommand('net = Net(cube1, 1)');
          } catch (e) {}
        }
      }

      // Register click listener on 3D vertices
      if (typeof ggbApp.registerClickListener === 'function') {
        ggbApp.registerClickListener((objName: string) => {
          if (activePreset.points3D && activePreset.points3D[objName] && onPointSelect) {
            onPointSelect(objName, activePreset.points3D[objName]);
          }
        });
      }
    } catch (err) {
      console.warn('GeoGebra script evaluation notice:', err);
    }
  };

  // Sync state whenever activePreset, currentStepIndex, isOxyzActive, isUnfoldActive change
  useEffect(() => {
    const ggbApp = appletRef.current || (window as any).ggbApplet3D || (window as any).ggbApplet;
    if (ggbApp && !isLoading) {
      setupAppletContent(ggbApp);
    }
  }, [activePreset, currentStepIndex, isOxyzActive, isUnfoldActive, isLoading]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Đang khởi tạo không gian hình học 3D (GeoGebra Web Engine)...</p>
        </div>
      )}

      {loadError && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-md space-y-3 z-20 text-white">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-medium text-slate-300">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full min-h-[450px]" />
    </div>
  );
};
