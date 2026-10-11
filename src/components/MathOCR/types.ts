export interface MathOCRResult {
  latex: string;
  timestamp: string;
  imageUrl?: string;
  mode?: string;
}

export interface CropArea {
  x: number; // percentage or px
  y: number;
  width: number;
  height: number;
}

export interface HistoryOCRItem {
  id: string;
  imageUrl: string;
  latex: string;
  title: string;
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}
