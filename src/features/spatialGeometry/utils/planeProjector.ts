import { Point3D, Point2D, Edge2D, Angle2D, ExtractedPolygon } from '../types/geometry.types';

/**
 * Calculates Euclidean distance between two 3D points.
 */
export function distance3D(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Gram-Schmidt Orthonormal Basis projection:
 * Maps 3D coplanar points (x, y, z) into a 2D plane (u, v)
 * strictly preserving 100% Euclidean distances and angle sizes.
 */
export function project3DPointsTo2D(points3D: Point3D[]): Point2D[] {
  if (points3D.length === 0) return [];
  if (points3D.length === 1) return [{ name: points3D[0].name, u: 0, v: 0 }];

  // Origin P0 -> (0,0)
  const P0 = points3D[0];
  const P1 = points3D[1];

  // u-axis direction vector e1 = (P1 - P0) / ||P1 - P0||
  const d01 = distance3D(P0, P1);
  if (d01 < 1e-6) return points3D.map(p => ({ name: p.name, u: 0, v: 0 }));

  const e1 = {
    x: (P1.x - P0.x) / d01,
    y: (P1.y - P0.y) / d01,
    z: (P1.z - P0.z) / d01
  };

  // Find a third non-collinear point P2 to establish v-axis
  let e2 = { x: 0, y: 0, z: 0 };
  let foundP2 = false;

  for (let i = 2; i < points3D.length; i++) {
    const Pi = points3D[i];
    const v = { x: Pi.x - P0.x, y: Pi.y - P0.y, z: Pi.z - P0.z };
    const dot1 = v.x * e1.x + v.y * e1.y + v.z * e1.z;
    
    // v_perp = v - (v . e1) * e1
    const vPerp = {
      x: v.x - dot1 * e1.x,
      y: v.y - dot1 * e1.y,
      z: v.z - dot1 * e1.z
    };

    const normPerp = Math.sqrt(vPerp.x * vPerp.x + vPerp.y * vPerp.y + vPerp.z * vPerp.z);
    if (normPerp > 1e-6) {
      e2 = { x: vPerp.x / normPerp, y: vPerp.y / normPerp, z: vPerp.z / normPerp };
      foundP2 = true;
      break;
    }
  }

  // Default e2 if all points are collinear
  if (!foundP2) {
    let dummy = Math.abs(e1.x) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const dot = dummy.x * e1.x + dummy.y * e1.y + dummy.z * e1.z;
    const perp = { x: dummy.x - dot * e1.x, y: dummy.y - dot * e1.y, z: dummy.z - dot * e1.z };
    const norm = Math.sqrt(perp.x * perp.x + perp.y * perp.y + perp.z * perp.z);
    e2 = { x: perp.x / norm, y: perp.y / norm, z: perp.z / norm };
  }

  // Project all points onto (e1, e2) basis
  return points3D.map(p => {
    const v = { x: p.x - P0.x, y: p.y - P0.y, z: p.z - P0.z };
    const u = v.x * e1.x + v.y * e1.y + v.z * e1.z;
    const vVal = v.x * e2.x + v.y * e2.y + v.z * e2.z;
    return { name: p.name, u: Math.round(u * 100) / 100, v: Math.round(vVal * 100) / 100 };
  });
}

/**
 * Calculates Polygon Area using Shoelace formula on 2D coordinates.
 */
export function calculatePolygonArea2D(points2D: Point2D[]): number {
  const n = points2D.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points2D[i].u * points2D[j].v;
    area -= points2D[j].u * points2D[i].v;
  }
  return Math.abs(area) / 2;
}

/**
 * Computes internal angle degrees at vertex B between A->B and B->C.
 */
export function calculateAngleDegrees(A: Point2D, B: Point2D, C: Point2D): number {
  const v1 = { u: A.u - B.u, v: A.v - B.v };
  const v2 = { u: C.u - B.u, v: C.v - B.v };

  const len1 = Math.sqrt(v1.u * v1.u + v1.v * v1.v);
  const len2 = Math.sqrt(v2.u * v2.u + v2.v * v2.v);

  if (len1 < 1e-6 || len2 < 1e-6) return 0;

  const dot = v1.u * v2.u + v1.v * v2.v;
  const cosTheta = Math.max(-1, Math.min(1, dot / (len1 * len2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Classifies geometric polygon shape based on side lengths & angles.
 */
export function classifyPolygonShape(vertices2D: Point2D[], edges: Edge2D[], angles: Angle2D[]): string {
  const n = vertices2D.length;
  if (n === 3) {
    const rightAngle = angles.find(a => a.isRightAngle);
    const sideLens = edges.map(e => e.length).sort((a, b) => a - b);
    const isEquilateral = Math.abs(sideLens[0] - sideLens[2]) < 0.05;
    const isIsosceles = Math.abs(sideLens[0] - sideLens[1]) < 0.05 || Math.abs(sideLens[1] - sideLens[2]) < 0.05;

    if (isEquilateral) return 'Tam giác đều';
    if (rightAngle && isIsosceles) return `Tam giác vuông cân tại ${rightAngle.vertexName}`;
    if (rightAngle) return `Tam giác vuông tại ${rightAngle.vertexName}`;
    if (isIsosceles) return 'Tam giác cân';
    return 'Tam giác thường';
  }

  if (n === 4) {
    const rightAngleCount = angles.filter(a => a.isRightAngle).length;
    const sideLens = edges.map(e => e.length);
    const allSidesEqual = sideLens.every(l => Math.abs(l - sideLens[0]) < 0.05);
    const oppositeSidesEqual = Math.abs(sideLens[0] - sideLens[2]) < 0.05 && Math.abs(sideLens[1] - sideLens[3]) < 0.05;

    if (rightAngleCount >= 3 && allSidesEqual) return 'Hình vuông';
    if (rightAngleCount >= 3) return 'Hình chữ nhật';
    if (allSidesEqual) return 'Hình thoi';
    if (oppositeSidesEqual) return 'Hình bình hành';

    // Check for trapezoid (parallel sides)
    const isTrapezoid = rightAngleCount >= 2;
    if (isTrapezoid) return 'Hình thang vuông';
    return 'Tứ giác phẳng';
  }

  return `Đa giác ${n} đỉnh`;
}

/**
 * Extracts a complete 2D planar inspector payload from selected 3D points.
 */
export function extractPlanarFace(faceName: string, points3D: Point3D[]): ExtractedPolygon {
  const vertices2D = project3DPointsTo2D(points3D);
  const n = vertices2D.length;

  const edges: Edge2D[] = [];
  let perimeter = 0;

  for (let i = 0; i < n; i++) {
    const fromP = vertices2D[i];
    const toP = vertices2D[(i + 1) % n];
    const p3d1 = points3D[i];
    const p3d2 = points3D[(i + 1) % n];

    const len = Math.round(distance3D(p3d1, p3d2) * 100) / 100;
    perimeter += len;

    edges.push({
      fromName: fromP.name,
      toName: toP.name,
      length: len,
      label: `${fromP.name}${toP.name} = ${len}`
    });
  }

  const angles: Angle2D[] = [];
  for (let i = 0; i < n; i++) {
    const prevP = vertices2D[(i - 1 + n) % n];
    const currP = vertices2D[i];
    const nextP = vertices2D[(i + 1) % n];

    const deg = Math.round(calculateAngleDegrees(prevP, currP, nextP) * 10) / 10;
    const isRight = Math.abs(deg - 90) < 1.0;

    angles.push({
      vertexName: currP.name,
      p1Name: prevP.name,
      p2Name: nextP.name,
      degrees: deg,
      isRightAngle: isRight
    });
  }

  const area = Math.round(calculatePolygonArea2D(vertices2D) * 100) / 100;
  const perimeterRound = Math.round(perimeter * 100) / 100;
  const shapeType = classifyPolygonShape(vertices2D, edges, angles);

  return {
    id: `face_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: faceName || vertices2D.map(v => v.name).join(''),
    vertexNames: vertices2D.map(v => v.name),
    vertices3D: points3D,
    vertices2D,
    edges,
    angles,
    area,
    perimeter: perimeterRound,
    shapeType
  };
}
