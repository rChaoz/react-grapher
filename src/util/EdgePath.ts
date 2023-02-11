import {Node, NodeImpl} from "../data/Node";
import {resolveValue} from "./utils";

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
 * Convert a pair of CSS values to pixel values (useful for border radius, which may be 1 or 2 values)
 */
function resolveValues(strValue: string, width: number, height: number): [number, number] {
    /* Computed border radius may be of form:
    - 6px
    - 2px 5px
    - 20%
    - 10% 5%
    - <empty>
     */
    const vals = strValue.split(" ")
    if (vals.length === 0) return [0, 0]
    else if (vals.length === 1) return [resolveValue(vals[0], width), resolveValue(vals[0], height)]
    else return [resolveValue(vals[0], width), resolveValue(vals[1], height)]
}

/**
 * Find the point closest to `targetNode` on the border of `sourceNode`. Used for floating edges.
 */
export function getNodeIntersection(sourceNode: Node<any>, targetNode: Node<any>): DOMPoint {
    const sourcePos = sourceNode.position
    const targetPos = targetNode.position;
    /* border[pos][axis] - border radius for every corner
    pos = 0 (top-left) / 1 (top-right) / 2 (bottom-right) / 3 (bottom-left)
    axis = 0 (x-axis) / 1 (y-axis)
     */
    const sourceNodeImpl = sourceNode as NodeImpl<any>

    // Calculate border radius of source node
    const style = getComputedStyle(sourceNodeImpl.element!)
    const border = [
        resolveValues(style.borderTopLeftRadius, sourceNodeImpl.width!, sourceNodeImpl.height!),
        resolveValues(style.borderTopRightRadius, sourceNodeImpl.width!, sourceNodeImpl.height!),
        resolveValues(style.borderBottomRightRadius, sourceNodeImpl.width!, sourceNodeImpl.height!),
        resolveValues(style.borderBottomLeftRadius, sourceNodeImpl.width!, sourceNodeImpl.height!),
    ]
    // Get line equation
    const [m, b] = getSlopeIntercept(sourcePos, targetPos)

    const w = sourceNodeImpl.width! + sourceNode.edgeMargin;
    const h = sourceNodeImpl.height! + sourceNode.edgeMargin;
    const x1 = sourcePos.x - w / 2, x2 = sourcePos.x + w / 2, y1 = sourcePos.y - h / 2, y2 = sourcePos.y + h / 2

    // If nodes overlap, draw the line between their centers
    if (targetPos.x > x1 && targetPos.x < x2 && targetPos.y > y1 && targetPos.y < y2) return sourcePos

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

export type EdgePath = {
    path: string,
    labelPosition: DOMPoint,
}

/**
 * Returns the EdgePath for a straight line edge
 */
export function getStraightEdgePath(a: DOMPoint, b: DOMPoint): EdgePath {
    return {
        path: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        labelPosition: new DOMPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
    }
}

/**
 * Returns a curved path. Path is curved clockwise for `curve` > 0, and anti-clockwise for negative `curve` values.
 */
export function getCurvedEdgePath(a: DOMPoint, b: DOMPoint, curve: number): EdgePath {
    const dx = b.x - a.x, dy = b.y - a.y
    const px = (b.x + a.x) / 2 + dy * curve, py = (b.y + a.y) / 2 - dx * curve
    return {
        path: `M ${a.x} ${a.y} Q ${px} ${py} ${b.x} ${b.y}`,
        labelPosition: new DOMPoint(a.x / 4 + px / 2 + b.x / 4, a.y / 4 + py / 2 + b.y / 4)
    }
}