export type EdgePath = {
    path: string,
    labelPosition: DOMPoint,
}

export function getStraightLinePath(a: DOMPoint, b: DOMPoint): EdgePath {
    return {
        path: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        labelPosition: new DOMPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
    }
}