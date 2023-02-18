import React, {memo, useContext} from "react";
import IDContext from "../context/IDContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_PATH_CLASS, EDGE_LABEL_CLASS, EDGE_LABEL_BACKGROUND_CLASS} from "../util/constants";
import {Node} from "../data/Node";

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
     * Label center position
     */
    labelPosition?: DOMPoint
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

export const BaseEdge = memo<BaseEdgeProps>(
    function BaseEdge({id, classes, path, markerStart, markerEnd, label, labelPosition}) {
        const baseID = useContext(IDContext)

        return <g id={`${baseID}e-${id}`} className={cx([...classes], EDGE_CLASS)}>
            <path d={path} className={EDGE_PATH_CLASS} markerStart={
                markerStart != null ? `url(#${baseID}-${markerStart})` : undefined
            } markerEnd={
                markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined
            }/>
            {label && labelPosition && <>
                <rect className={EDGE_LABEL_BACKGROUND_CLASS}/>
                <text className={EDGE_LABEL_CLASS} x={labelPosition.x} y={labelPosition.y} textAnchor={"middle"} dominantBaseline={"middle"}>{label}</text>
            </>}
        </g>
    }
)