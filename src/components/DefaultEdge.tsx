import {BaseEdge} from "./BaseEdge";
import {Node} from "../data/Node";
import React, {memo} from "react";
import {getStraightEdgePath} from "../util/EdgePath";

export interface EdgeProps<T> {
    source: Node<any>
    target: Node<any>
    /**
     * Absolute position
     */
    sourcePos: DOMPoint
    /**
     * Absolute position
     */
    targetPos: DOMPoint
    /**
     * ID of this edge
     */
    id: string
    /**
     * List of classes this node should use (besides the default "react-grapher-edge")
     */
    classes: Set<string>
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerStart?: string
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerEnd?: string
    /**
     * Label text
     */
    label?: string
    /**
     * Custom data
     */
    data?: T
}

export const DefaultEdge = memo<EdgeProps<any>>(
    function DefaultEdge(props) {
        return <BaseEdge {...props} {...getStraightEdgePath(props.sourcePos, props.targetPos)} />
    }
)