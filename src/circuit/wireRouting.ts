/**
 * Wokwi-Grade Wire Routing Engine
 * Implements Manhattan orthogonal routing with rounded corner arcs,
 * directional pin exit vectors, component body avoidance, and segment dragging.
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WireSegment {
  index: number;
  start: Point;
  end: Point;
  orientation: 'horizontal' | 'vertical';
  midpoint: Point;
  length: number;
}

export interface ComputedWireRoute {
  path: string;
  points: Point[];
  segments: WireSegment[];
}

/**
 * Converts a sequence of orthogonal points into an SVG path with smooth rounded corners.
 * Uses quadratic bezier arcs (Q) with radius R at each 90-degree corner (Wokwi 4px standard).
 */
export function pointsToRoundedCornerPath(points: Point[], cornerRadius = 4): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Remove duplicate adjacent points
  const cleanPoints: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleanPoints[cleanPoints.length - 1];
    const curr = points[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 0.5) {
      cleanPoints.push(curr);
    }
  }

  if (cleanPoints.length < 2) return '';
  if (cleanPoints.length === 2) {
    return `M ${cleanPoints[0].x} ${cleanPoints[0].y} L ${cleanPoints[1].x} ${cleanPoints[1].y}`;
  }

  // Simplify collinear segments (e.g. P1 -> P2 -> P3 in the same line becomes P1 -> P3)
  const nonCollinear: Point[] = [cleanPoints[0]];
  for (let i = 1; i < cleanPoints.length - 1; i++) {
    const prev = nonCollinear[nonCollinear.length - 1];
    const curr = cleanPoints[i];
    const next = cleanPoints[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const isHorizontal = Math.abs(dy1) < 0.5 && Math.abs(dy2) < 0.5;
    const isVertical = Math.abs(dx1) < 0.5 && Math.abs(dx2) < 0.5;

    if (!isHorizontal && !isVertical) {
      nonCollinear.push(curr);
    }
  }
  nonCollinear.push(cleanPoints[cleanPoints.length - 1]);

  let d = `M ${nonCollinear[0].x} ${nonCollinear[0].y}`;

  for (let i = 1; i < nonCollinear.length - 1; i++) {
    const pPrev = nonCollinear[i - 1];
    const pCurr = nonCollinear[i];
    const pNext = nonCollinear[i + 1];

    const dInX = pCurr.x - pPrev.x;
    const dInY = pCurr.y - pPrev.y;
    const lenIn = Math.hypot(dInX, dInY);

    const dOutX = pNext.x - pCurr.x;
    const dOutY = pNext.y - pCurr.y;
    const lenOut = Math.hypot(dOutX, dOutY);

    if (lenIn < 1 || lenOut < 1) {
      d += ` L ${pCurr.x} ${pCurr.y}`;
      continue;
    }

    const uInX = dInX / lenIn;
    const uInY = dInY / lenIn;
    const uOutX = dOutX / lenOut;
    const uOutY = dOutY / lenOut;

    // Check if direction changes (not collinear)
    const dot = uInX * uOutX + uInY * uOutY;
    if (Math.abs(dot) > 0.98) {
      d += ` L ${pCurr.x} ${pCurr.y}`;
      continue;
    }

    // Dynamic radius clamped by adjacent segment lengths
    const maxR = Math.min(cornerRadius, lenIn * 0.48, lenOut * 0.48);

    if (maxR < 1.2) {
      d += ` L ${pCurr.x} ${pCurr.y}`;
    } else {
      const startArcX = pCurr.x - uInX * maxR;
      const startArcY = pCurr.y - uInY * maxR;
      const endArcX = pCurr.x + uOutX * maxR;
      const endArcY = pCurr.y + uOutY * maxR;

      d += ` L ${startArcX.toFixed(2)} ${startArcY.toFixed(2)}`;
      d += ` Q ${pCurr.x.toFixed(2)} ${pCurr.y.toFixed(2)} ${endArcX.toFixed(2)} ${endArcY.toFixed(2)}`;
    }
  }

  const last = nonCollinear[nonCollinear.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Extracts draggable segments from a sequence of points
 */
export function extractSegmentsFromPoints(points: Point[]): WireSegment[] {
  const segments: WireSegment[] = [];
  if (points.length < 2) return segments;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const orientation: 'horizontal' | 'vertical' = dx >= dy ? 'horizontal' : 'vertical';
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    segments.push({
      index: i,
      start: p1,
      end: p2,
      orientation,
      midpoint: {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      },
      length,
    });
  }

  return segments;
}

/**
 * Calculates a complete Manhattan orthogonal route respecting pin exit normals,
 * component boundaries, and optional waypoints.
 */
export function computeManhattanWireRoute(
  from: Point,
  fromNormal: Point,
  to: Point,
  toNormal: Point,
  waypoints?: Point[],
  obstacles: BoundingBox[] = []
): ComputedWireRoute {
  // If user has provided custom waypoints, route through them with orthogonal elbows
  if (waypoints && waypoints.length > 0) {
    const allKeyPoints: Point[] = [from];

    // First exit step from source pin
    const exitDist = 18;
    const pFirstExit = {
      x: from.x + fromNormal.x * exitDist,
      y: from.y + fromNormal.y * exitDist,
    };
    allKeyPoints.push(pFirstExit);

    let curr = pFirstExit;
    for (const wp of waypoints) {
      // Connect curr to wp orthogonally
      if (Math.abs(curr.x - wp.x) > 2 && Math.abs(curr.y - wp.y) > 2) {
        // Insert intermediate orthogonal elbow
        if (Math.abs(fromNormal.y) > 0.5) {
          // If exiting vertically, turn horizontally first
          allKeyPoints.push({ x: wp.x, y: curr.y });
        } else {
          allKeyPoints.push({ x: curr.x, y: wp.y });
        }
      }
      allKeyPoints.push(wp);
      curr = wp;
    }

    // Last approach step into destination pin
    const pLastEntry = {
      x: to.x + toNormal.x * exitDist,
      y: to.y + toNormal.y * exitDist,
    };

    if (Math.abs(curr.x - pLastEntry.x) > 2 && Math.abs(curr.y - pLastEntry.y) > 2) {
      if (Math.abs(toNormal.x) > 0.5) {
        allKeyPoints.push({ x: curr.x, y: pLastEntry.y });
      } else {
        allKeyPoints.push({ x: pLastEntry.x, y: curr.y });
      }
    }
    allKeyPoints.push(pLastEntry);
    allKeyPoints.push(to);

    const path = pointsToRoundedCornerPath(allKeyPoints, 6);
    const segments = extractSegmentsFromPoints(allKeyPoints);
    return { path, points: allKeyPoints, segments };
  }

  // Automatic Manhattan Routing:
  // Step 1: Parallel ribbon bus lane offsets for adjacent pins (Wokwi multi-wire spacing)
  const fromLane = (Math.abs(Math.round(from.x / 9.6) + Math.round(from.y / 9.6)) % 6) * 5;
  const toLane = (Math.abs(Math.round(to.x / 9.6) + Math.round(to.y / 9.6)) % 6) * 5;
  const fromExitDist = 18 + fromLane;
  const toExitDist = 18 + toLane;

  const p1 = { x: from.x, y: from.y };
  const p2 = { x: from.x + fromNormal.x * fromExitDist, y: from.y + fromNormal.y * fromExitDist };
  const p5 = { x: to.x + toNormal.x * toExitDist, y: to.y + toNormal.y * toExitDist };
  const p6 = { x: to.x, y: to.y };

  const rawPoints: Point[] = [p1, p2];

  // Identify source and destination components to avoid cutting across their bodies
  const pad = 14;
  const sourceObs = obstacles.find(
    (o) => from.x >= o.x - 2 && from.x <= o.x + o.width + 2 && from.y >= o.y - 2 && from.y <= o.y + o.height + 2
  );
  const destObs = obstacles.find(
    (o) => to.x >= o.x - 2 && to.x <= o.x + o.width + 2 && to.y >= o.y - 2 && to.y <= o.y + o.height + 2
  );

  // If source exits vertically (Top -Y or Bottom +Y), ensure it clears the source component horizontally before moving opposite
  if (sourceObs && Math.abs(fromNormal.y) > 0.5) {
    const isExitingUp = fromNormal.y < 0;
    const movingOpposite = isExitingUp ? to.y > from.y : to.y < from.y;
    if (movingOpposite) {
      // Clear the source component horizontally towards destination
      const clearX = to.x >= from.x ? sourceObs.x + sourceObs.width + pad + fromLane : sourceObs.x - pad - fromLane;
      rawPoints.push({ x: clearX, y: p2.y });
    }
  }

  const lastPoint = rawPoints[rawPoints.length - 1];

  // Step 2: Determine orthogonal routing corridor
  const isFromVertical = Math.abs(fromNormal.y) > 0.5;
  const isToVertical = Math.abs(toNormal.y) > 0.5;

  if (isFromVertical && !isToVertical) {
    // Source exits vertically (e.g. Arduino Top -Y or Bottom +Y)
    // Destination exits horizontally (e.g. TB6612 Left -X)
    rawPoints.push({ x: p5.x, y: lastPoint.y });
    rawPoints.push(p5);
  } else if (!isFromVertical && isToVertical) {
    // Source exits horizontally, destination exits vertically
    rawPoints.push({ x: lastPoint.x, y: p5.y });
    rawPoints.push(p5);
  } else if (isFromVertical && isToVertical) {
    // Both exit vertically (e.g. Top to Top, or Top to Bottom)
    if (fromNormal.y < 0 && toNormal.y < 0) {
      // Both exit UP (top headers)
      let topY = Math.min(p2.y, p5.y) - 10;
      for (const obs of obstacles) {
        if (topY >= obs.y - pad && topY <= obs.y + obs.height + pad) {
          topY = obs.y - pad - fromLane;
        }
      }
      rawPoints.push({ x: lastPoint.x, y: topY });
      rawPoints.push({ x: p5.x, y: topY });
      rawPoints.push(p5);
    } else if (fromNormal.y > 0 && toNormal.y > 0) {
      // Both exit DOWN (bottom headers)
      let botY = Math.max(p2.y, p5.y) + 10;
      for (const obs of obstacles) {
        if (botY >= obs.y - pad && botY <= obs.y + obs.height + pad) {
          botY = obs.y + obs.height + pad + fromLane;
        }
      }
      rawPoints.push({ x: lastPoint.x, y: botY });
      rawPoints.push({ x: p5.x, y: botY });
      rawPoints.push(p5);
    } else {
      // One exits UP, one exits DOWN
      let midY = (lastPoint.y + p5.y) / 2;
      for (const obs of obstacles) {
        if (midY >= obs.y - pad && midY <= obs.y + obs.height + pad) {
          midY = obs.y > midY ? obs.y - pad - fromLane : obs.y + obs.height + pad + fromLane;
        }
      }
      rawPoints.push({ x: lastPoint.x, y: midY });
      rawPoints.push({ x: p5.x, y: midY });
      rawPoints.push(p5);
    }
  } else {
    // Both exit horizontally (left to left, left to right, etc.)
    let midX = (lastPoint.x + p5.x) / 2;
    for (const obs of obstacles) {
      if (midX >= obs.x - pad && midX <= obs.x + obs.width + pad) {
        midX = obs.x > midX ? obs.x - pad - fromLane : obs.x + obs.width + pad + fromLane;
      }
    }
    rawPoints.push({ x: midX, y: lastPoint.y });
    rawPoints.push({ x: midX, y: p5.y });
    rawPoints.push(p5);
  }

  rawPoints.push(p6);

  // Check obstacle avoidance for all horizontal & vertical corridors
  for (const obs of obstacles) {
    if (obs === sourceObs || obs === destObs) continue;
    for (let i = 0; i < rawPoints.length - 1; i++) {
      const pA = rawPoints[i];
      const pB = rawPoints[i + 1];

      // Horizontal segment
      if (Math.abs(pA.y - pB.y) < 1) {
        const segY = pA.y;
        const minX = Math.min(pA.x, pB.x);
        const maxX = Math.max(pA.x, pB.x);

        if (
          segY >= obs.y - pad &&
          segY <= obs.y + obs.height + pad &&
          maxX > obs.x - pad &&
          minX < obs.x + obs.width + pad
        ) {
          const shiftY = Math.abs(segY - obs.y) < Math.abs(segY - (obs.y + obs.height))
            ? obs.y - pad - 6
            : obs.y + obs.height + pad + 6;
          pA.y = shiftY;
          pB.y = shiftY;
        }
      }

      // Vertical segment
      if (Math.abs(pA.x - pB.x) < 1) {
        const segX = pA.x;
        const minY = Math.min(pA.y, pB.y);
        const maxY = Math.max(pA.y, pB.y);

        if (
          segX >= obs.x - pad &&
          segX <= obs.x + obs.width + pad &&
          maxY > obs.y - pad &&
          minY < obs.y + obs.height + pad
        ) {
          const shiftX = Math.abs(segX - obs.x) < Math.abs(segX - (obs.x + obs.width))
            ? obs.x - pad - 6
            : obs.x + obs.width + pad + 6;
          pA.x = shiftX;
          pB.x = shiftX;
        }
      }
    }
  }

  const path = pointsToRoundedCornerPath(rawPoints, 4);
  const segments = extractSegmentsFromPoints(rawPoints);
  return { path, points: rawPoints, segments };
}

/**
 * Generates smooth Bezier curve respecting pin exit normals
 */
export function computeSmartWireBezier(
  from: Point,
  fromNormal: Point,
  to: Point,
  toNormal: Point
): string {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const curvature = Math.max(30, Math.min(140, dist * 0.45));

  const cp1x = from.x + fromNormal.x * curvature;
  const cp1y = from.y + fromNormal.y * curvature;
  const cp2x = to.x + toNormal.x * curvature;
  const cp2y = to.y + toNormal.y * curvature;

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
}
