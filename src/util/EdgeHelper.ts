import {Node, NodeImpl} from "../data/Node";

/**
 * Create slope-intercept form of line defined by 2 points
 */
function getSlopeIntercept(p1: DOMPoint, p2: DOMPoint): [number, number] {
    let m = (p2.y - p1.y) / (p2.x - p1.x)
    // Deal with infinities
    if (m > 10000) m = 10000
    else if (m < -10000) m = -10000
    const b = p1.y - m * p1.x
    return [m, b]
}

/**
 * Find the point closest to `target` on the border of `sourceNode`. Used for floating edges.
 */
export function getNodeBorderPoint(sourceNode: Node<any>, target: Node<any> | DOMPoint): DOMPoint {
    const sourceNodeImpl = sourceNode as NodeImpl<any>
    const sourcePos = sourceNodeImpl.absolutePosition
    const border = sourceNodeImpl.borderRadius
    const w = sourceNodeImpl.width! + sourceNode.edgeMargin;
    const h = sourceNodeImpl.height! + sourceNode.edgeMargin;
    const x1 = sourcePos.x - w / 2, x2 = sourcePos.x + w / 2, y1 = sourcePos.y - h / 2, y2 = sourcePos.y + h / 2

    let targetPos: DOMPoint
    // If 'target' is a node and overlaps with sourceNode, draw the line between their centers
    if (!(target instanceof DOMPointReadOnly)) {
        const targetNodeImpl = target as NodeImpl<any>
        targetPos = (target as NodeImpl<any>).absolutePosition;
        const tw = targetNodeImpl.width!, th = targetNodeImpl.height!
        if (targetPos.x + tw / 2 > x1 && targetPos.x - tw / 2 < x2 && targetPos.y + th / 2 > y1 && targetPos.y - th / 2 < y2) return sourcePos
    } else targetPos = target

    // Get line equation
    const [m, b] = getSlopeIntercept(sourcePos, targetPos)

    // Utility function
    /**
     * Accounts for the border-radius of the node. Receives where the intersection happened, if the rectangle was not rounded, and approximates
     * the closest point to the intersection point on the arc of the rounded rectangle.
     * @param arc 0 for top-left, 1 for top-right, 2 for bottom-right, 3 for bottom-left
     * @param axis axis of the rectangle side the intersection happened on (0 for x, 1 for y)
     * @param length how far away, along the side of the rectangle denoted by `axis`, the intersection happened
     */
    function accountForRounding(arc: 0 | 1 | 2 | 3, axis: 0 | 1, length: number): DOMPoint {
        // Calculate arc size & center
        const [rx, ry] = border[arc]
        const c = new DOMPoint()
        switch (arc) {
            case 0: // top-left
                [c.x, c.y] = [x1 + rx, y1 + ry]
                break
            case 1: // top-right
                [c.x, c.y] = [x2 - rx, y1 + ry]
                break
            case 2: // bottom-right
                [c.x, c.y] = [x2 - rx, y2 - ry]
                break
            default: // bottom-left
                [c.x, c.y] = [x1 + rx, y2 - ry]
                break
        }
        // Get point on arc
        const p = (axis === 0 ? rx - length : rx + length) / (rx + ry) // [0, 1] value denoting for far on the arc the returned point should be
        const x = rx * p, y = ry * Math.sqrt(1 - p * p) // convert cosine to sine
        // Convert to absolute point
        switch (arc) {
            case 0: // top-left
                c.x -= x
                c.y -= y
                return c
            case 1: // top-right
                c.x += x
                c.y -= y
                return c
            case 2: // bottom-right
                c.x += x
                c.y += y
                return c
            default: // bottom-left
                c.x -= x
                c.y += y
                return c
        }
    }

    let pos: number
    // Check intersection with left side
    pos = m * x1 + b
    if (targetPos.x < sourcePos.x && pos > y1 && pos < y2) {
        // Calculate distance to top & bottom
        const t = pos - y1, b = y2 - pos
        // Check if it's in the top-left arc
        if (t < border[0][1]) return accountForRounding(0, 1, t)
        // And bottom-left
        if (b < border[3][1]) return accountForRounding(3, 1, b)
        // Point is on side but not on arcs
        else return new DOMPoint(x1, pos)
    }

    // Check intersection with right side
    pos = m * x2 + b
    if (targetPos.x > sourcePos.x && pos > y1 && pos < y2) {
        // Calculate distance to top & bottom
        const t = pos - y1, b = y2 - pos
        // Check if it's in the top-right arc
        if (t < border[1][1]) return accountForRounding(1, 1, t)
        // And bottom-right
        else if (b < border[2][1]) return accountForRounding(2, 1, b)
        // Point is on side but not on arcs
        else return new DOMPoint(x2, pos)
    }

    // If m is tiny, the line cannot intersect the top/bottom sides
    if (Math.abs(m) < .001) return sourcePos

    // Check top side
    pos = (y1 - b) / m
    if (targetPos.y < sourcePos.y && pos > x1 && pos < x2) {
        // Calculate distance to left & right
        const l = pos - x1, r = x2 - pos
        // Top-left
        if (l < border[0][0]) return accountForRounding(0, 0, l)
        // Top-right
        else if (r < border[1][0]) return accountForRounding(1, 0, r)
        else return new DOMPoint(pos, y1)
    }

    // Check bottom side
    pos = (y2 - b) / m
    if (targetPos.y > sourcePos.y && pos > x1 && pos < x2) {
        // Calculate distance to left & right
        const l = pos - x1, r = x2 - pos
        // Bottom-right
        if (r < border[2][0]) return accountForRounding(2, 0, r)
        // Bottom-left
        else if (l < border[3][0]) return accountForRounding(3, 0, l)
        else return new DOMPoint(pos, y2)
    }

    // Return something, should never get here anyway
    return sourcePos
}

/**
 * Calculates a vector perpendicular on segment [ab], of length `length`. If `relative` is true, its length will be `length`% of [ab]'s length.
 *
 * Distance can be negative to reverse direction. This new vector is relative to the origin 0,0.
 * @return The vector x and y components
 */
export function pointOnPerpendicular(a: DOMPoint, b: DOMPoint, length: number, relative = false): [number, number] {
    // Vector from a to b (delta)
    const dx = b.x - a.x, dy = b.y - a.y
    // Calculate point on perpendicular
    let cx = dy * length, cy = -dx * length
    const cLen = Math.sqrt(cx ** 2 + cy ** 2)
    if (!relative) {
        // Normalize c vector and set its length to 'length'
        if (cLen == 0) cx = cy = 0
        else {
            cx = cx / cLen * Math.abs(length)
            cy = cy / cLen * Math.abs(length)
        }
    }
    return [cx, cy]
}

/**
 * Move the given source & target points slightly, perpendicular to the direction source->target, if argument is true.
 * Otherwise, return the two points as is.
 */
export function applySeparation(sourcePos: DOMPoint, targetPos: DOMPoint, separation: boolean) {
    if (!separation) return [sourcePos, targetPos]
    const [dx, dy] = pointOnPerpendicular(sourcePos, targetPos, 2)
    return [new DOMPoint(sourcePos.x + dx, sourcePos.y + dy), new DOMPoint(targetPos.x + dx, targetPos.y + dy)]
}

/**
 * Calculate necessary parameters for an edge's label: text anchor, baseline, rotation angle and X and Y shift coordinates.
 */
export function labelHelper(sourcePos: DOMPoint, targetPos: DOMPoint, labelOffset: number, labelRotateWithEdge: boolean) {
    const dx = targetPos.x - sourcePos.x, dy = targetPos.y - sourcePos.y
    // Calculate edge angle
    let labelAngle = 0, reverseShift = false

    if (labelRotateWithEdge) {
        if (dy == 0) labelAngle = dx > 0 ? 0 : 180
        else labelAngle = Math.atan(dx / -dy) * (180 / Math.PI) + (dy < 0 ? 270 : 90)
        if (labelAngle > 90 && labelAngle < 270) {
            reverseShift = true
            labelAngle += 180
        }
    }

    // Calculate text anchor and baseline
    let labelAnchor: "start" | "middle" | "end" = "middle"
    let labelBaseline: "text-after-edge" | "text-before-edge" | "middle" = "middle"

    if (labelOffset > 0) {
        if (labelRotateWithEdge) labelBaseline = labelAngle <= 90 || labelAngle >= 270 ? "text-after-edge" : "text-before-edge"
        else if (Math.abs(dx) > Math.abs(dy)) {
            // Edge is mostly horizontal
            labelAnchor = "middle"
            labelBaseline = dx > 0 ? "text-after-edge" : "text-before-edge"
        } else {
            // Edge is mostly vertical
            labelBaseline = "middle"
            labelAnchor = dy > 0 ? "start" : "end"
        }
    }

    // Calculate label position
    const [labelX, labelY] = pointOnPerpendicular(sourcePos, targetPos, reverseShift ? -labelOffset : labelOffset)

    return {labelOffset: new DOMPoint(labelX, labelY), labelAnchor, labelBaseline, labelAngle}
}

/**
 * Returns the EdgePath for a straight line edge
 */
export function getStraightEdgePath(a: DOMPoint, b: DOMPoint) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}

/**
 * Returns a round path. Path is curved clockwise for `curve` > 0, and anti-clockwise for negative `curve` values. The edge will extend sideways `curve` pixels,
 * unless `relativeCurve` is true, in which case it will extend a percentage of its length, making `curve` act more like an angle, not a distance.
 */
export function getRoundEdgePath(a: DOMPoint, b: DOMPoint, curve: number, relativeCurve?: boolean) {
    // Calculate mid-point for bezier curve
    const [cx, cy] = pointOnPerpendicular(a, b, curve, relativeCurve)
    const px = (b.x + a.x) / 2 + cx, py = (b.y + a.y) / 2 + cy;
    return `M ${a.x} ${a.y} Q ${px} ${py} ${b.x} ${b.y}`
}