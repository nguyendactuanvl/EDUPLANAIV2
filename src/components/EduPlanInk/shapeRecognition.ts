import { Point, Stroke } from './types';

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function detectShape(points: Point[]): {
  type: 'line' | 'rect' | 'triangle' | 'circle' | 'arrow' | 'coordinate_axes';
  p1: Point;
  p2: Point;
  p3?: Point;
} | null {
  if (points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const startEndDist = distance(start, end);

  // Total path length along stroke
  let totalPathLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalPathLength += distance(points[i - 1], points[i]);
  }

  // 1. Check if closed loop (Circle or Polygon)
  const isClosed = startEndDist < totalPathLength * 0.25 || startEndDist < 30;

  if (isClosed && points.length >= 8) {
    // Calculate bounding box and centroid
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let cx = 0, cy = 0;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      cx += p.x;
      cy += p.y;
    });
    cx /= points.length;
    cy /= points.length;

    const width = maxX - minX;
    const height = maxY - minY;

    // Check if Circle / Ellipse: variance of distance from center
    const radii = points.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance = radii.reduce((acc, r) => acc + Math.pow(r - avgRadius, 2), 0) / radii.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev / avgRadius < 0.22) {
      // It's a Circle / Ellipse
      return {
        type: 'circle',
        p1: { x: cx, y: cy },
        p2: { x: cx + avgRadius, y: cy }
      };
    }

    // Check corners for Polygon (Rectangle or Triangle)
    // Simplify path using Ramer-Douglas-Peucker or corner detection
    const corners = findCorners(points);
    if (corners.length === 3) {
      return {
        type: 'triangle',
        p1: corners[0],
        p2: corners[1],
        p3: corners[2]
      };
    } else if (corners.length === 4) {
      return {
        type: 'rect',
        p1: { x: minX, y: minY },
        p2: { x: maxX, y: maxY }
      };
    } else {
      // Default closed shape to Rect if aspect ratio is rectangular
      return {
        type: 'rect',
        p1: { x: minX, y: minY },
        p2: { x: maxX, y: maxY }
      };
    }
  } else {
    // Open path: Straight Line or Arrow
    const straightness = startEndDist / totalPathLength;
    if (straightness > 0.82) {
      return {
        type: 'line',
        p1: start,
        p2: end
      };
    }
  }

  return null;
}

function findCorners(points: Point[]): Point[] {
  if (points.length < 6) return [];
  
  // Angle-based corner detection
  const corners: Point[] = [];
  const step = Math.max(1, Math.floor(points.length / 12));

  for (let i = step; i < points.length - step; i += step) {
    const prev = points[i - step];
    const curr = points[i];
    const next = points[i + step];

    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);

    if (mag1 === 0 || mag2 === 0) continue;
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

    // Acute or right angle bend
    if (angleDeg < 135) {
      // Make sure it's not too close to previously found corner
      if (!corners.some(c => distance(c, curr) < 30)) {
        corners.push(curr);
      }
    }
  }

  return corners;
}
