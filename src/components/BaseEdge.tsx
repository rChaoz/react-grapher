import React, {memo, useContext} from "react";
import {GrapherContext} from "../context/GrapherContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_HANDLE_CLASS, EDGE_LABEL_BACKGROUND_CLASS, EDGE_LABEL_CLASS, EDGE_PATH_CLASS} from "../util/constants";
import {Node} from "../data/Node";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Edge} from "../data/Edge";

export interface BaseEdgeProps {
    /**
     * ID of this edge
     */
    id: string
    /**
     * List of classes this node should use (besides the default "react-grapher-edge")
     */
    classes: string[]
    /**
     * SVG path
     */
    path: string
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerStart?: string | null
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerEnd?: string | null
    /**
     * Label text
     */
    label?: string | null
    /**
     * Label center position. Can be a number 0..1, as a position on the SVG path (as specified by {@link Edge.labelPosition}), or absolute coordinates.
     */
    labelPosition?: DOMPoint | number
    /**
     * Whether this node is selected or not
     */
    selected: boolean
    /**
     * Whether this node is grabbed (being moved) or not
     */
    grabbed: boolean
}

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
    classes: string[]
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerStart?: string | null
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerEnd?: string | null
    /**
     * Label text
     */
    label?: string | null
    /**
     * Label position, as set in the Edge object
     * @see Edge.labelPosition
     */
    labelPosition?: number
    /**
     * Custom data
     */
    data?: T
    /**
     * Whether this node is selected or not
     */
    selected: boolean
    /**
     * Whether this node is grabbed (being moved) or not
     */
    grabbed: boolean
}

export const BaseEdge = memo<BaseEdgeProps>(
    function BaseEdge({id, classes, path, markerStart, markerEnd, label, labelPosition, grabbed, selected}) {
        const baseID = useContext(GrapherContext).id

        return <g id={`${baseID}e-${id}`} className={cx([...classes], EDGE_CLASS)} data-grabbed={grabbed} data-selected={selected}>
            <path d={path} className={EDGE_HANDLE_CLASS} stroke={"transparent"} fill={"none"} strokeWidth={15}/>
            <path d={path} className={EDGE_PATH_CLASS} markerStart={
                markerStart != null ? `url(#${baseID}-${markerStart})` : undefined
            } markerEnd={
                markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined
            }/>
            {label && <>
                <rect className={EDGE_LABEL_BACKGROUND_CLASS} rx={6}/>
                {typeof labelPosition === "number" || labelPosition == null
                    ? <text className={EDGE_LABEL_CLASS} data-label-pos={String(labelPosition ?? .5)} textAnchor={"middle"} dominantBaseline={"middle"}>{label}</text>
                    : <text className={EDGE_LABEL_CLASS} x={labelPosition.x} y={labelPosition.y} textAnchor={"middle"} dominantBaseline={"middle"}>{label}</text>}
            </>}
        </g>
    }
)