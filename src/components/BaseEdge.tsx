import React, {memo, useContext} from "react";
import IDContext from "../context/IDContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_MARKER_START, EDGE_MARKER_END, EDGE_PATH_CLASS, EDGE_LABEL_CLASS} from "../util/Constants";

export interface BaseEdgeProps {
    /**
     * ID of this edge
     */
    id: string
    /**
     * List of classes this node should use (besides the default "react-grapher-edge")
     */
    classes: Set<string>
    /**
     * SVG path
     */
    path: string
    /**
     * ID of the custom SVG marker or true for the default arrow tip. False/undefined means no marker.
     */
    markerStart?: boolean | string
    /**
     * ID of the custom SVG marker or true for the default arrow tip. False/undefined means no marker.
     */
    markerEnd?: boolean | string
    /**
     * Label text
     */
    label?: string
    /**
     * Label center position
     */
    labelPosition?: DOMPoint
}

export const BaseEdge = memo<BaseEdgeProps>(
    function BaseEdge({id, classes, path, markerStart, markerEnd, label, labelPosition}) {
        const baseID = useContext(IDContext)

        return <g id={`${baseID}-${id}`} className={cx([...classes], EDGE_CLASS)}>
            <path d={path} className={EDGE_PATH_CLASS} markerStart={
                markerStart === true ? baseID + EDGE_MARKER_START : typeof markerStart === "string" ? markerStart : undefined
            } markerEnd={
                markerEnd === true ? baseID + EDGE_MARKER_END : typeof markerEnd === "string" ? markerEnd : undefined
            }/>
            {label && labelPosition && <text className={EDGE_LABEL_CLASS} x={labelPosition.x} y={labelPosition.y} textAnchor={"middle"}>{label}</text>}
        </g>
    }
)