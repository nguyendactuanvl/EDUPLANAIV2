import React, { useState } from "react";
import { Box, Sparkles, Sliders, Layers } from "lucide-react";
import { Shape3DType } from "./types";
import { Interactive3DGeometryEngine, Shape3DId } from "./Interactive3DGeometryEngine";

interface Geometry3DViewerProps {
  initialShape?: Shape3DType | Shape3DId;
  title?: string;
  subtitle?: string;
  onSelectShape?: (shape: Shape3DType) => void;
  onInsertImage?: (dataUrl: string) => void;
  insertButtonLabel?: string;
}

export const Geometry3DViewer: React.FC<Geometry3DViewerProps> = ({
  initialShape = "pyramid_regular_quad",
  title = "Mô phỏng Hình học không gian 3D Tương tác",
  subtitle = "Hỗ trợ Three.js WebGL xoay 360°, tạo thiết diện cắt & trải phẳng (Cabri 3D)",
  onInsertImage,
  insertButtonLabel = "Chèn hình vào tài liệu"
}) => {
  const mapShapeId = (s: string): Shape3DId => {
    if (s === "pyramid_quad") return "pyramid_regular_quad";
    if (s === "pyramid_triangle") return "pyramid_regular_tri";
    return (s as Shape3DId) || "pyramid_regular_quad";
  };

  return (
    <div className="w-full h-[620px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 flex flex-col">
      <Interactive3DGeometryEngine
        initialShape={mapShapeId(initialShape)}
        onInsertImage={onInsertImage}
        insertButtonLabel={insertButtonLabel}
      />
    </div>
  );
};
