import React, { useState, useMemo, useCallback } from 'react';
import { GradeLevel, GeometryPreset, Point3D, ExtractedPolygon } from './types/geometry.types';
import { GEOMETRY_PRESETS } from './utils/ggbCommandBuilder';
import { extractPlanarFace } from './utils/planeProjector';
import { GeoHeaderToolbar } from './components/GeoHeaderToolbar';
import { GeoGebraViewer } from './components/GeoGebraViewer';
import { ConstructionTimeline } from './components/ConstructionTimeline';
import { ExtractedFaceInspector } from './components/ExtractedFaceInspector';
import { QuickActionFloatingBar } from './components/QuickActionFloatingBar';
import { FreehandSketchCanvas } from './components/FreehandSketchCanvas';

export const SpatialGeometryWorkspace: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('Lop11');
  const [activePreset, setActivePreset] = useState<GeometryPreset>(() => {
    return GEOMETRY_PRESETS.find(p => p.id === 'lop11_sa_perp_abcd') || 
           GEOMETRY_PRESETS.find(p => p.gradeLevel === 'Lop11') || 
           GEOMETRY_PRESETS[0];
  });

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isOxyzActive, setIsOxyzActive] = useState<boolean>(false);
  const [isUnfoldActive, setIsUnfoldActive] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isSketchActive, setIsSketchActive] = useState<boolean>(false);
  const [sectionSliceValue, setSectionSliceValue] = useState<number>(0.5);

  // Sync real-time slice plane slider with GeoGebra
  React.useEffect(() => {
    const ggbApp = (window as any).ggbApplet3D || (window as any).ggbApplet;
    if (ggbApp && typeof ggbApp.setValue === 'function' && activePreset.id === 'lop11_slice_section') {
      try {
        ggbApp.setValue('k', sectionSliceValue);
      } catch (e) {}
    }
  }, [sectionSliceValue, activePreset.id]);

  // Selected 3D Vertices for Face Extraction
  const [selectedVertexNames, setSelectedVertexNames] = useState<string[]>([]);

  // Extracted Polygon payload
  const extractedPolygon = useMemo<ExtractedPolygon | null>(() => {
    if (selectedVertexNames.length < 3) return null;
    
    const points: Point3D[] = [];
    selectedVertexNames.forEach(name => {
      if (activePreset.points3D[name]) {
        points.push(activePreset.points3D[name]);
      } else {
        // Fallback estimated coordinate
        points.push({ name, x: Math.random() * 4, y: Math.random() * 4, z: Math.random() * 4 });
      }
    });

    if (points.length < 3) return null;
    return extractPlanarFace(selectedVertexNames.join(''), points);
  }, [selectedVertexNames, activePreset]);

  // Handle vertex click selection on 3D model
  const handlePointSelect = useCallback((pointName: string, coords: Point3D) => {
    setSelectedVertexNames(prev => {
      if (prev.includes(pointName)) {
        return prev.filter(p => p !== pointName);
      }
      return [...prev, pointName];
    });
    setIsInspectorOpen(true);
  }, []);

  // Handle preset selection
  const handleSelectPreset = (preset: GeometryPreset) => {
    setActivePreset(preset);
    setCurrentStepIndex(0);
    setSelectedVertexNames([]);
    setIsUnfoldActive(false);
    setIsOxyzActive(preset.gradeLevel === 'Lop12' || !!preset.oxyzOrigin);
  };

  // Reset Camera or View
  const handleResetCamera = () => {
    setCurrentStepIndex(0);
    setSelectedVertexNames([]);
  };

  // Export PNG Image
  const handleExportPng = () => {
    const ggbApp = (window as any).ggbApplet3D || (window as any).ggbApplet;
    if (ggbApp && typeof ggbApp.exportImage === 'function') {
      try {
        const dataUrl = ggbApp.exportImage({ type: 'png', scale: 2 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Hinh_Hoc_Khong_Gian_${activePreset.id}_${Date.now()}.png`;
        a.click();
      } catch (e) {
        alert('Đã sẵn sàng hình vẽ 3D. Thầy cô có thể dùng phím PrtScn hoặc Snipping Tool để chụp nhanh hình vẽ.');
      }
    } else {
      alert('Đã sẵn sàng hình vẽ 3D. Thầy cô có thể chụp ảnh màn hình để chèn vào tài liệu Word.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* 1. Header Toolbar */}
      <GeoHeaderToolbar
        selectedGrade={selectedGrade}
        onSelectGrade={setSelectedGrade}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        isOxyzActive={isOxyzActive}
        onToggleOxyz={() => setIsOxyzActive(!isOxyzActive)}
        isUnfoldActive={isUnfoldActive}
        onToggleUnfold={() => setIsUnfoldActive(!isUnfoldActive)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        isSketchActive={isSketchActive}
        onToggleSketch={() => setIsSketchActive(!isSketchActive)}
        onResetCamera={handleResetCamera}
        onExportPng={handleExportPng}
      />

      {/* 2. Main Split Canvas View (3D GeoGebra + 2D Inspector) */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        
        {/* Floating Quick Action Overlay */}
        <QuickActionFloatingBar
          selectedVertices={selectedVertexNames}
          onClearSelectedVertices={() => setSelectedVertexNames([])}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
          sectionSliceValue={sectionSliceValue}
          onSectionSliceChange={setSectionSliceValue}
          hasSliceSlider={activePreset.id === 'lop11_slice_section'}
        />

        {/* 3D GeoGebra Viewer Canvas */}
        <div className="flex-1 h-full relative">
          <GeoGebraViewer
            activePreset={activePreset}
            currentStepIndex={currentStepIndex}
            isOxyzActive={isOxyzActive}
            isUnfoldActive={isUnfoldActive}
            onPointSelect={handlePointSelect}
          />

          {/* Interactive Freehand Sketch Canvas Overlay */}
          <FreehandSketchCanvas
            isActive={isSketchActive}
            onClose={() => setIsSketchActive(false)}
          />
        </div>

        {/* 2D Planar Inspector Sidebar */}
        {isInspectorOpen && (
          <ExtractedFaceInspector
            polygon={extractedPolygon}
            onClose={() => setIsInspectorOpen(false)}
            selectedVertexNames={selectedVertexNames}
            onClearSelectedVertices={() => setSelectedVertexNames([])}
          />
        )}

      </div>

      {/* 3. Construction Step-by-Step Timeline Player */}
      <ConstructionTimeline
        steps={activePreset.timelineSteps || []}
        currentStepIndex={currentStepIndex}
        onStepChange={setCurrentStepIndex}
      />

    </div>
  );
};
