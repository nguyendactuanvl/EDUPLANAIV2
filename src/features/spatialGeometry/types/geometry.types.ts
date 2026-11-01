export type GradeLevel = 'THCS' | 'Lop11' | 'Lop12';

export interface Point3D {
  name: string;
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  name: string;
  u: number;
  v: number;
}

export interface Edge2D {
  fromName: string;
  toName: string;
  length: number;
  label: string;
}

export interface Angle2D {
  vertexName: string;
  p1Name: string;
  p2Name: string;
  degrees: number;
  isRightAngle: boolean;
}

export interface ExtractedPolygon {
  id: string;
  name: string;
  vertexNames: string[];
  vertices3D: Point3D[];
  vertices2D: Point2D[];
  edges: Edge2D[];
  angles: Angle2D[];
  area: number;
  perimeter: number;
  shapeType: string; // e.g. "Tam giác vuông tại A", "Hình vuông", "Hình chữ nhật", "Hình thang cân", ...
}

export interface ConstructionStep {
  stepNumber: number;
  title: string;
  commentary: string;
  ggbCommands: string[];
  visibleObjects?: string[];
  hiddenObjects?: string[];
}

export interface GeometryPreset {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  categoryName: string;
  description: string;
  points3D: Record<string, Point3D>;
  initialCommands: string[];
  timelineSteps: ConstructionStep[];
  oxyzOrigin?: string;
  oxyzCoordinates?: Record<string, { x: number; y: number; z: number }>;
  unfoldAvailable?: boolean;
}

export interface SketchPoint {
  x: number;
  y: number;
}

export interface SketchStroke {
  id: string;
  points: SketchPoint[];
  color: string;
  width: number;
  opacity: number;
  toolType: 'pen' | 'highlighter' | 'eraser';
}
