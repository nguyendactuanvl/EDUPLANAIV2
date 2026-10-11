import { Interactive3DObject } from './types';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Face3D {
  vertices: number[]; // indices of vertices
}

export function rotate3DPoint(p: Point3D, rotXDeg: number, rotYDeg: number, rotZDeg: number): Point3D {
  const radX = (rotXDeg * Math.PI) / 180;
  const radY = (rotYDeg * Math.PI) / 180;
  const radZ = (rotZDeg * Math.PI) / 180;

  // Rotate around X (pitch)
  let y1 = p.y * Math.cos(radX) - p.z * Math.sin(radX);
  let z1 = p.y * Math.sin(radX) + p.z * Math.cos(radX);
  let x1 = p.x;

  // Rotate around Y (yaw)
  let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
  let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);
  let y2 = y1;

  // Rotate around Z (roll)
  let x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
  let y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
  let z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

// Compute normal vector Z component for face culling
function computeFaceNormalZ(p1: Point3D, p2: Point3D, p3: Point3D): number {
  // Vector v1 = p2 - p1, v2 = p3 - p1
  const v1x = p2.x - p1.x;
  const v1y = p2.y - p1.y;

  const v2x = p3.x - p1.x;
  const v2y = p3.y - p1.y;

  // Cross product Z = v1x * v2y - v1y * v2x
  return v1x * v2y - v1y * v2x;
}

export function get3DMeshData(kind: string): {
  vertices: Point3D[];
  faces: Face3D[];
  labels?: { index: number; name: string }[];
} {
  if (kind === 'cube') {
    // Cube / Cuboid (-1 to 1)
    const vertices: Point3D[] = [
      { x: -1, y: -1, z: -1 }, // 0
      { x: 1, y: -1, z: -1 },  // 1
      { x: 1, y: 1, z: -1 },   // 2
      { x: -1, y: 1, z: -1 },  // 3
      { x: -1, y: -1, z: 1 },  // 4
      { x: 1, y: -1, z: 1 },   // 5
      { x: 1, y: 1, z: 1 },    // 6
      { x: -1, y: 1, z: 1 },   // 7
    ];
    const faces: Face3D[] = [
      { vertices: [4, 5, 6, 7] }, // Front (z = 1)
      { vertices: [1, 0, 3, 2] }, // Back (z = -1)
      { vertices: [0, 1, 5, 4] }, // Top (y = -1)
      { vertices: [7, 6, 2, 3] }, // Bottom (y = 1)
      { vertices: [5, 1, 2, 6] }, // Right (x = 1)
      { vertices: [0, 4, 7, 3] }, // Left (x = -1)
    ];
    const labels = [
      { index: 0, name: "A'" }, { index: 1, name: "B'" }, { index: 2, name: "C'" }, { index: 3, name: "D'" },
      { index: 4, name: 'A' }, { index: 5, name: 'B' }, { index: 6, name: 'C' }, { index: 7, name: 'D' }
    ];
    return { vertices, faces, labels };
  }

  if (kind === 'pyramid') {
    // Square Pyramid S.ABCD
    const vertices: Point3D[] = [
      { x: 0, y: -1.3, z: 0 },    // 0: Apex S
      { x: -1, y: 0.9, z: -1 },   // 1: A
      { x: 1, y: 0.9, z: -1 },    // 2: B
      { x: 1, y: 0.9, z: 1 },     // 3: C
      { x: -1, y: 0.9, z: 1 },    // 4: D
    ];
    const faces: Face3D[] = [
      { vertices: [4, 3, 2, 1] }, // Base ABCD
      { vertices: [0, 1, 2] },    // Side SAB
      { vertices: [0, 2, 3] },    // Side SBC
      { vertices: [0, 3, 4] },    // Side SCD
      { vertices: [0, 4, 1] },    // Side SDA
    ];
    const labels = [
      { index: 0, name: 'S' }, { index: 1, name: 'A' }, { index: 2, name: 'B' }, { index: 3, name: 'C' }, { index: 4, name: 'D' }
    ];
    return { vertices, faces, labels };
  }

  if (kind === 'tetrahedron') {
    // Tetrahedron S.ABC
    const vertices: Point3D[] = [
      { x: 0, y: -1.3, z: 0 },         // 0: S
      { x: -1, y: 0.9, z: -0.7 },      // 1: A
      { x: 0.2, y: 0.9, z: 1.1 },      // 2: B
      { x: 1.1, y: 0.9, z: -0.7 },      // 3: C
    ];
    const faces: Face3D[] = [
      { vertices: [1, 2, 3] }, // Base ABC
      { vertices: [0, 1, 2] }, // SAB
      { vertices: [0, 2, 3] }, // SBC
      { vertices: [0, 3, 1] }, // SCA
    ];
    const labels = [
      { index: 0, name: 'S' }, { index: 1, name: 'A' }, { index: 2, name: 'B' }, { index: 3, name: 'C' }
    ];
    return { vertices, faces, labels };
  }

  if (kind === 'prism') {
    // Triangular Prism ABC.A'B'C'
    const vertices: Point3D[] = [
      { x: -0.8, y: -1, z: -0.6 }, // 0: A'
      { x: 0, y: -1, z: 0.9 },     // 1: B'
      { x: 0.9, y: -1, z: -0.6 },  // 2: C'
      { x: -0.8, y: 1, z: -0.6 },  // 3: A
      { x: 0, y: 1, z: 0.9 },      // 4: B
      { x: 0.9, y: 1, z: -0.6 },   // 5: C
    ];
    const faces: Face3D[] = [
      { vertices: [0, 1, 2] },       // Top base A'B'C'
      { vertices: [5, 4, 3] },       // Bottom base CBA
      { vertices: [0, 3, 4, 1] },    // Rect AA'B'B
      { vertices: [1, 4, 5, 2] },    // Rect BB'C'C
      { vertices: [2, 5, 3, 0] },    // Rect CC'A'A
    ];
    const labels = [
      { index: 0, name: "A'" }, { index: 1, name: "B'" }, { index: 2, name: "C'" },
      { index: 3, name: 'A' }, { index: 4, name: 'B' }, { index: 5, name: 'C' }
    ];
    return { vertices, faces, labels };
  }

  // Fallback default
  return get3DMeshData('cube');
}

export function render3DShapeOnCanvas(
  ctx: CanvasRenderingContext2D,
  obj: Interactive3DObject,
  isSelected: boolean = false
) {
  ctx.save();

  const { x, y, scale, rotX, rotY, rotZ, color, lineWidth, kind, showLabels = true } = obj;

  if (kind === 'cone' || kind === 'cylinder' || kind === 'sphere') {
    renderCurved3DShape(ctx, obj, isSelected);
    ctx.restore();
    return;
  }

  const mesh = get3DMeshData(kind);
  
  // Rotate vertices
  const rotatedVerts = mesh.vertices.map((v) => rotate3DPoint(v, rotX, rotY, rotZ));

  // Screen coordinates
  const screenVerts = rotatedVerts.map((v) => ({
    x: x + v.x * scale,
    y: y + v.y * scale,
    z: v.z,
  }));

  // Determine face visibility (front vs back)
  const isFaceVisible: boolean[] = mesh.faces.map((face) => {
    const p1 = rotatedVerts[face.vertices[0]];
    const p2 = rotatedVerts[face.vertices[1]];
    const p3 = rotatedVerts[face.vertices[2]];
    const normZ = computeFaceNormalZ(p1, p2, p3);
    return normZ < 0; // Front facing if counter-clockwise in screen space
  });

  // Extract all unique edges and determine if visible (solid) or hidden (dashed)
  const edgeMap: Map<string, { v1: number; v2: number; isVisible: boolean }> = new Map();

  mesh.faces.forEach((face, fIndex) => {
    const visible = isFaceVisible[fIndex];
    const len = face.vertices.length;
    for (let i = 0; i < len; i++) {
      const idx1 = face.vertices[i];
      const idx2 = face.vertices[(i + 1) % len];
      const key = idx1 < idx2 ? `${idx1}_${idx2}` : `${idx2}_${idx1}`;

      if (!edgeMap.has(key)) {
        edgeMap.set(key, { v1: idx1, v2: idx2, isVisible: visible });
      } else {
        const existing = edgeMap.get(key)!;
        existing.isVisible = existing.isVisible || visible; // Visible if at least one face is visible
      }
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth || 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Draw Dashed Hidden Edges First
  ctx.beginPath();
  ctx.setLineDash([6, 6]);
  edgeMap.forEach((edge) => {
    if (!edge.isVisible) {
      const p1 = screenVerts[edge.v1];
      const p2 = screenVerts[edge.v2];
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  });
  ctx.stroke();

  // 2. Draw Solid Visible Edges
  ctx.beginPath();
  ctx.setLineDash([]);
  edgeMap.forEach((edge) => {
    if (edge.isVisible) {
      const p1 = screenVerts[edge.v1];
      const p2 = screenVerts[edge.v2];
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  });
  ctx.stroke();

  // 3. Render Vertex Labels if enabled
  if (showLabels && mesh.labels) {
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = color;
    mesh.labels.forEach((lbl) => {
      const pt = screenVerts[lbl.index];
      ctx.fillText(lbl.name, pt.x + 6, pt.y - 6);
    });
  }

  // 4. Render Interactive Selection Bounding Frame & Rotation Handles if Selected
  if (isSelected) {
    renderSelectionGizmo(ctx, x, y, scale, rotX, rotY, rotZ);
  }

  ctx.restore();
}

function renderCurved3DShape(ctx: CanvasRenderingContext2D, obj: Interactive3DObject, isSelected: boolean) {
  const { x, y, scale, rotX, rotY, rotZ, color, lineWidth, kind, showLabels = true } = obj;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth || 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (kind === 'cone') {
    // 3D Cone
    const S3D = rotate3DPoint({ x: 0, y: -1.3, z: 0 }, rotX, rotY, rotZ);
    const O3D = rotate3DPoint({ x: 0, y: 0.9, z: 0 }, rotX, rotY, rotZ);

    const S = { x: x + S3D.x * scale, y: y + S3D.y * scale };
    const O = { x: x + O3D.x * scale, y: y + O3D.y * scale };

    // Base circle points
    const baseCount = 32;
    const basePts: Point3D[] = [];
    for (let i = 0; i < baseCount; i++) {
      const ang = (i / baseCount) * Math.PI * 2;
      const pt = rotate3DPoint({ x: Math.cos(ang), y: 0.9, z: Math.sin(ang) }, rotX, rotY, rotZ);
      basePts.push(pt);
    }

    const screenBase = basePts.map((p) => ({ x: x + p.x * scale, y: y + p.y * scale, z: p.z }));

    // Draw Base Circle Arc (split front / back z)
    ctx.beginPath();
    ctx.setLineDash([]);
    for (let i = 0; i < baseCount; i++) {
      const p1 = screenBase[i];
      const p2 = screenBase[(i + 1) % baseCount];
      if (basePts[i].z >= O3D.z || basePts[(i + 1) % baseCount].z >= O3D.z) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < baseCount; i++) {
      const p1 = screenBase[i];
      const p2 = screenBase[(i + 1) % baseCount];
      if (basePts[i].z < O3D.z && basePts[(i + 1) % baseCount].z < O3D.z) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
    }
    // Height line S-O
    ctx.moveTo(S.x, S.y);
    ctx.lineTo(O.x, O.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Find extreme left and right outline generator lines
    let minIdx = 0, maxIdx = 0;
    let minCross = Infinity, maxCross = -Infinity;
    screenBase.forEach((pt, idx) => {
      const cross = (pt.x - S.x) * (O.y - S.y) - (pt.y - S.y) * (O.x - S.x);
      if (cross < minCross) { minCross = cross; minIdx = idx; }
      if (cross > maxCross) { maxCross = cross; maxIdx = idx; }
    });

    ctx.beginPath();
    ctx.moveTo(S.x, S.y); ctx.lineTo(screenBase[minIdx].x, screenBase[minIdx].y);
    ctx.moveTo(S.x, S.y); ctx.lineTo(screenBase[maxIdx].x, screenBase[maxIdx].y);
    ctx.stroke();

    if (showLabels) {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = color;
      ctx.fillText('S', S.x - 4, S.y - 6);
      ctx.fillText('O', O.x - 4, O.y + 14);
    }
  } else if (kind === 'cylinder') {
    // 3D Cylinder
    const O13D = rotate3DPoint({ x: 0, y: -1, z: 0 }, rotX, rotY, rotZ);
    const O23D = rotate3DPoint({ x: 0, y: 1, z: 0 }, rotX, rotY, rotZ);

    const baseCount = 32;
    const topPts = Array.from({ length: baseCount }, (_, i) => {
      const a = (i / baseCount) * Math.PI * 2;
      return rotate3DPoint({ x: Math.cos(a), y: -1, z: Math.sin(a) }, rotX, rotY, rotZ);
    });
    const botPts = Array.from({ length: baseCount }, (_, i) => {
      const a = (i / baseCount) * Math.PI * 2;
      return rotate3DPoint({ x: Math.cos(a), y: 1, z: Math.sin(a) }, rotX, rotY, rotZ);
    });

    const screenTop = topPts.map((p) => ({ x: x + p.x * scale, y: y + p.y * scale }));
    const screenBot = botPts.map((p) => ({ x: x + p.x * scale, y: y + p.y * scale }));

    // Top loop
    ctx.beginPath();
    ctx.setLineDash([]);
    for (let i = 0; i < baseCount; i++) {
      const p1 = screenTop[i];
      const p2 = screenTop[(i + 1) % baseCount];
      if (topPts[i].z >= O13D.z || topPts[(i + 1) % baseCount].z >= O13D.z) {
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < baseCount; i++) {
      const p1 = screenTop[i];
      const p2 = screenTop[(i + 1) % baseCount];
      if (topPts[i].z < O13D.z && topPts[(i + 1) % baseCount].z < O13D.z) {
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();

    // Bottom loop
    ctx.beginPath();
    ctx.setLineDash([]);
    for (let i = 0; i < baseCount; i++) {
      const p1 = screenBot[i];
      const p2 = screenBot[(i + 1) % baseCount];
      if (botPts[i].z >= O23D.z || botPts[(i + 1) % baseCount].z >= O23D.z) {
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < baseCount; i++) {
      const p1 = screenBot[i];
      const p2 = screenBot[(i + 1) % baseCount];
      if (botPts[i].z < O23D.z && botPts[(i + 1) % baseCount].z < O23D.z) {
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Side generators
    ctx.beginPath();
    ctx.moveTo(screenTop[0].x, screenTop[0].y); ctx.lineTo(screenBot[0].x, screenBot[0].y);
    ctx.moveTo(screenTop[Math.floor(baseCount / 2)].x, screenTop[Math.floor(baseCount / 2)].y);
    ctx.lineTo(screenBot[Math.floor(baseCount / 2)].x, screenBot[Math.floor(baseCount / 2)].y);
    ctx.stroke();
  } else if (kind === 'sphere') {
    // 3D Sphere with interactive equator and meridian rings
    const R = scale;
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();

    // Rotated Equator Ring
    const count = 36;
    const equatorPts = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return rotate3DPoint({ x: Math.cos(a), y: 0, z: Math.sin(a) }, rotX, rotY, rotZ);
    });

    const screenEq = equatorPts.map((p) => ({ x: x + p.x * scale, y: y + p.y * scale, z: p.z }));

    ctx.beginPath();
    ctx.setLineDash([]);
    for (let i = 0; i < count; i++) {
      const p1 = screenEq[i];
      const p2 = screenEq[(i + 1) % count];
      if (equatorPts[i].z >= 0 || equatorPts[(i + 1) % count].z >= 0) {
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < count; i++) {
      const p1 = screenEq[i];
      const p2 = screenEq[(i + 1) % count];
      if (equatorPts[i].z < 0 && equatorPts[(i + 1) % count].z < 0) {
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Center dot O
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isSelected) {
    renderSelectionGizmo(ctx, x, y, scale, rotX, rotY, rotZ);
  }
}

function renderSelectionGizmo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  rotX: number,
  rotY: number,
  rotZ: number
) {
  const boxSize = scale * 1.5;

  // Selection Bounding Box
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(cx - boxSize, cy - boxSize, boxSize * 2, boxSize * 2);

  // 3D Rotation Trackball Outer Circle
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.arc(cx, cy, boxSize, 0, Math.PI * 2);
  ctx.stroke();

  // Corner Resize handles
  const handles = [
    { x: cx - boxSize, y: cy - boxSize },
    { x: cx + boxSize, y: cy - boxSize },
    { x: cx + boxSize, y: cy + boxSize },
    { x: cx - boxSize, y: cy + boxSize },
  ];

  ctx.fillStyle = '#38bdf8';
  handles.forEach((h) => {
    ctx.beginPath();
    ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });

  // Top Rotation Handle
  ctx.beginPath();
  ctx.moveTo(cx, cy - boxSize);
  ctx.lineTo(cx, cy - boxSize - 20);
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy - boxSize - 20, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.restore();
}
