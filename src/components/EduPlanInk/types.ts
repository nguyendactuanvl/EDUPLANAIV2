export type InkTool = 
  | 'pen' 
  | 'highlighter' 
  | 'laser' 
  | 'eraser_stroke' 
  | 'eraser_pixel' 
  | 'shape' 
  | 'ruler' 
  | 'text' 
  | 'pan';

export type ShapeType = 
  | 'auto' 
  | 'line' 
  | 'arrow' 
  | 'rect' 
  | 'triangle' 
  | 'circle' 
  | 'coordinate_axes'
  // 3D Spatial Shapes (Hình không gian)
  | 'tetrahedron'         // Hình chóp tam giác / Tứ diện
  | 'pyramid_square'      // Hình chóp tứ giác S.ABCD
  | 'frustum'             // Hình chóp cụt 3D
  | 'cuboid'              // Hình hộp chữ nhật / Khối lập phương 3D
  | 'prism_triangular'    // Hình lăng trụ tam giác
  | 'cone'                // Hình nón
  | 'cylinder'            // Hình trụ
  | 'sphere'              // Hình cầu
  | 'coordinate_axes_3d'   // Hệ trục 3D Oxyz
  // Function Graphs (Đồ thị hàm số THCS & THPT)
  | 'graph_linear'        // Đồ thị bậc nhất y = ax + b
  | 'graph_parabola'      // Đồ thị Parabol y = ax^2
  | 'graph_cubic'         // Đồ thị bậc ba y = ax^3 + bx^2 + cx + d
  | 'graph_hyperbola'     // Đồ thị nhất biến y = (ax+b)/(cx+d)
  | 'graph_sin';          // Đồ thị lượng giác y = sin x

export type BackgroundType = 'green_board' | 'blackboard' | 'whiteboard' | 'grid_paper' | 'lines_paper' | 'custom';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'shape';
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  shapeType?: ShapeType;
  lineStyle?: 'solid' | 'dashed';
  // For pre-calculated smooth shape or svg path
  isRecognizedShape?: boolean;
  shapeData?: {
    type: ShapeType;
    p1: Point;
    p2: Point;
    p3?: Point; // for triangle
  };
}

export interface TextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  isMath?: boolean;
}

export type Shape3DKind = 'cube' | 'pyramid' | 'tetrahedron' | 'frustum' | 'prism' | 'sphere' | 'cone' | 'cylinder';

export interface Interactive3DObject {
  id: string;
  kind: Shape3DKind;
  x: number;
  y: number;
  scale: number;
  rotX: number; // pitch
  rotY: number; // yaw
  rotZ: number; // roll
  color: string;
  lineWidth: number;
  showLabels?: boolean;
}

export interface BoardPage {
  id: string;
  title: string;
  backgroundType: BackgroundType;
  backgroundColor?: string;
  customBgUrl?: string; // Image or PDF rendered page URL
  strokes: Stroke[];
  texts: TextNote[];
  objects3D?: Interactive3DObject[];
  undoStack: { strokes: Stroke[]; texts: TextNote[]; objects3D?: Interactive3DObject[] }[];
  redoStack: { strokes: Stroke[]; texts: TextNote[]; objects3D?: Interactive3DObject[] }[];
}

export interface RulerState {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  angle: number; // in degrees
}
