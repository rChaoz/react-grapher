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
     * ID of the edge
     */
    id: string
    /**
     * SVG path for this edge
     */
    path: string
    /**
     * CSS classes to be added to the edge element.
     */
    classes: string[]
    /**
     * Label text. If null, the text element will not be rendered at all.
     */
    label: string | null
    /**
     * Label center position. Can be a number 0..1, as a position on the SVG path (as specified by {@link Edge.labelPosition}), or absolute coordinates.
     */
    labelPosition: DOMPoint | number
    /**
     * Whether this edge is selected
     */
    selected: boolean
    /**
     * Whether this edge is grabbed (being moved) or not
     */
    grabbed: boolean
    /**
     * ID of the predefined/custom SVG marker, null means no marker.
     */
    markerStart: string | null
    /**
     * ID of the predefined/custom SVG marker, null means no marker.
     */
    markerEnd: string | null
}

export interface EdgeProps<T> extends Omit<BaseEdgeProps, "path"> {
    /**
     * Custom Edge data
     */
    data: T | undefined
    /**
     * Source Node object
     */
    source: Node<any>
    /**
     * Absolute position
     */
    sourcePos: DOMPoint
    /**
     * Handle of source Node this edge originates from (null for floating edge)
     */
    sourceHandle: string | null
    /**
     * Target Node object
     */
    target: Node<any>
    /**
     * Absolute position
     */
    targetPos: DOMPoint
    /**
     * Handle of target Node this edge connects to (null for floating edge)
     */
    targetHandle: string | null
}

export const BaseEdge = memo<BaseEdgeProps>(
    function BaseEdge({
                          id, path, classes, label, labelPosition,
                          selected, grabbed, markerStart, markerEnd
                      }) {
        const baseID = useContext(GrapherContext).id

        return <g id={`${baseID}e-${id}`} className={cx(classes, EDGE_CLASS)} data-grabbed={grabbed} data-selected={selected}>
            <path d={path} className={EDGE_HANDLE_CLASS} stroke={"transparent"} fill={"none"} strokeWidth={15}/>
            <path d={path} className={EDGE_PATH_CLASS}
                  markerStart={markerStart != null ? `url(#${baseID}-${markerStart})` : undefined}
                  markerEnd={markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined}/>
            {label != null && <>
                <rect className={EDGE_LABEL_BACKGROUND_CLASS} rx={6}/>
                {typeof labelPosition === "number" || labelPosition == null
                    ? <text className={EDGE_LABEL_CLASS} data-label-pos={String(labelPosition)} textAnchor={"middle"} dominantBaseline={"middle"}>{label}</text>
                    : <text className={EDGE_LABEL_CLASS} x={labelPosition.x} y={labelPosition.y} textAnchor={"middle"} dominantBaseline={"middle"}>{label}</text>}
            </>}
        </g>
    }
)