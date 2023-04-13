import {BaseEdge, BaseEdgeProps} from "./BaseEdge";
import React from "react";
import {applySeparation, getRoundEdgePath, getStraightEdgePath, labelHelper} from "../util/EdgeHelper";
import {Node} from "../data/Node";

export type SimpleEdgeData = {
    /**
     * - "straight" will use {@link getStraightEdgePath}
     * - "round" will use {@link getRoundEdgePath} with curve amount specified by `curve` property
     * - "auto-straight-round" will use "straight" if there is for edges that are alone between handles, or "round" for pairs of edges between the same 2 handles, but
     * opposing directions, to avoid overlap. This is the default value. "straight" will always be used if {@link Edge.allowOverlapSeparation} is set to false.
     *
     * TODO More types
     */
    type: "straight" | "round" | "auto-straight-round"
    /**
     * Used as a parameter for {@link getRoundEdgePath} when `type` is `curved`. Defaults to 25 if {@link relativeCurve} is false/undefined, otherwise .2.
     */
    curve?: number
    /**
     * If true, edge will be rounded, perpendicular to its direction, a distance equal to a percentage of the edge's length, as set by the {@link curve} property.
     * If false, the distance is an absolute value, in pixels, also set by the `curve` property. Defaults to false
     * @see getRoundEdgePath
     */
    relativeCurve?: boolean
}

export interface EdgeProps<T> extends Omit<BaseEdgeProps, "path" | "labelPosition" | "labelOffset" | "labelAnchor" | "labelBaseline" | "labelAngle"> {
    /**
     * Custom Edge data
     */
    data: T
    /**
     * Label center position. A number 0..1, as a position on the SVG path (as specified by {@link Edge.labelPosition}).
     */
    labelPosition: number
    /**
     * Offsetting of the label, perpendicular to the edge's direction, in pixels. As specified by {@link Edge.labelOffset}.
     */
    labelOffset: number
    /**
     * If true, the label's text anchor should rotate so that it flows in the same direction as the edge.
     * As specified by {@link Edge.labelRotateWithEdge}.
     */
    labelRotateWithEdge: boolean
    /**
     * If true, the source and target position should be shifted slightly perpendicular to the direction of the edge for visibility,
     * as the source/target handles/nodes have both outgoing and incoming edges.
     */
    separate: boolean
    /**
     * Source Node object
     */
    source: Node<any>
    /**
     * Absolute position
     */
    sourcePos: DOMPoint
    /**
     * Handle of source Node this edge originates from (null/undefined for floating edge)
     */
    sourceHandle: string | null | undefined
    /**
     * Target Node object
     */
    target: Node<any>
    /**
     * Absolute position
     */
    targetPos: DOMPoint
    /**
     * Handle of target Node this edge connects to (null/undefined for floating edge)
     */
    targetHandle: string | null | undefined
}

const edgePathsMap = {
    straight: getStraightEdgePath,
    round: getRoundEdgePath,
}

/**
 * Simple edge implementation.
 */
export const SimpleEdge = React.memo<EdgeProps<SimpleEdgeData>>(
    function SimpleEdge(props) {
        // In case data is null/undefined
        const data = props.data ?? {}

        const [source, target] = applySeparation(props.sourcePos, props.targetPos, props.separate)

        const type = data.type == null || data.type == "auto-straight-round" ? (props.separate ? "round" : "straight") : data.type
        const path = edgePathsMap[type](source, target, data.curve ?? (data.relativeCurve ? .2 : 25), data.relativeCurve)
        return <BaseEdge {...props} path={path} {...labelHelper(source, target, props.labelOffset, props.labelRotateWithEdge)}/>
    }
)