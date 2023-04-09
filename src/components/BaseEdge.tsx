import React, {useContext, useEffect, useRef} from "react";
import {InternalContext} from "../context/InternalContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_HANDLE_CLASS, EDGE_LABEL_BACKGROUND_CLASS, EDGE_LABEL_CLASS, EDGE_PATH_CLASS} from "../util/constants";
import {Node} from "../data/Node";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Edge} from "../data/Edge";
import {errorUnknownEdge, warnInvalidPropValue} from "../util/log";

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
     * "Hit-box" width of an edge (i.e. clickable stroke-width).
     */
    boxWidth: number
    /**
     * Label text. If null, the text element will not be rendered at all.
     */
    label: string | null
    /**
     * Label center position. Can be a number 0..1, as a position on the SVG path (as specified by {@link Edge.labelPosition}), or absolute coordinates.
     */
    labelPosition: DOMPoint | number
    /**
     * Additional x/y label position shift amount. Generally this should be used if you want, for example, the label to be above the center of the node.
     */
    labelShift: DOMPoint
    /**
     * Label text anchor position.
     */
    labelAnchor: "start" | "middle" | "end"
    /**
     * Label text baseline.
     */
    labelBaseline: "auto" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "central" | "middle" | "text-after-edge" | "text-before-edge"
    /**
     * Label rotation angle.
     */
    labelAngle: number
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
    /**
     * Whether to enable pointer events for this edge.
     */
    pointerEvents: boolean
}

export interface EdgeProps<T> extends Omit<BaseEdgeProps, "path" | "labelPosition" | "labelShift" | "labelAnchor" | "labelBaseline" | "labelAngle"> {
    /**
     * Custom Edge data
     */
    data: T | undefined
    /**
     * Label center position. A number 0..1, as a position on the SVG path (as specified by {@link Edge.labelPosition}).
     */
    labelPosition: number
    /**
     * Shifting of the label, perpendicular to the edge's direction, in pixels. As specified by {@link Edge.labelShift}.
     */
    labelShift: number
    /**
     * If true, the label's text anchor should rotate so that it flows in the same direction as the edge.
     * As specified by {@link Edge.labelRotationFollowEdge}.
     */
    labelRotationFollowEdge: boolean
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

export function BaseEdge({id, path, classes, boxWidth, label, labelPosition, labelShift, labelAnchor, labelBaseline, labelAngle,
                             selected, grabbed, markerStart, markerEnd, pointerEvents} : BaseEdgeProps) {
    const internals = useContext(InternalContext)

    // Ref to the Edge <g> and <path> elements
    const ref = useRef<SVGGraphicsElement>(null), pathRef = useRef<SVGPathElement>(null)
    // Ref to the label and its background
    const labelRef = useRef<SVGTextElement>(null), labelBgRef = useRef<SVGRectElement>(null)
    // Get internal edge object
    const edge = internals.getEdge(id)
    if (edge == null) errorUnknownEdge(id)
    
    // Set listeners
    useEffect(() => {
        const elem = ref.current
        if (elem == null || edge == null || internals.isStatic) return

        // Add listeners (destruct to ensure they do not modify, so we can remove the same listeners later
        const {onObjectPointerUp, onObjectPointerDown} = internals
        elem.addEventListener("pointerdown", onObjectPointerDown)
        elem.addEventListener("pointerup", onObjectPointerUp)

        return () => {
            elem.removeEventListener("pointerdown", onObjectPointerDown)
            elem.removeEventListener("pointerup", onObjectPointerUp)
        }
    }, [edge, internals])

    // Update edge on re-render
    useEffect(() => {
        const elem = ref.current
        if (elem == null || edge == null) return

        // Update edge size if it has changed
        const bounds = elem.getBBox()
        if (Math.abs(edge.bounds.x - bounds.x) > 1 || Math.abs(edge.bounds.y - bounds.y) > 1
            || Math.abs(edge.bounds.width - bounds.width) > 1 || Math.abs(edge.bounds.height - bounds.height) > 1) {
            edge.bounds = bounds
            internals.recalculateBounds()
        }

        // Update label
        const labelElem = labelRef.current
        const labelBg = labelBgRef.current
        const path = pathRef.current

        if (labelElem != null && labelBg != null && path != null && label != null) {
            // Set label position
            let x, y
            if (typeof labelPosition === "number") {
                if (labelPosition < 0 || labelPosition > 1)
                    warnInvalidPropValue(`Edge '${edge.id}'`, "labelPosition", labelPosition, ["0..1"])
                else {
                    const pos = path.getPointAtLength(labelPosition * path.getTotalLength())
                    x = pos.x
                    y = pos.y
                    labelElem.setAttribute("x", String(x))
                    labelElem.setAttribute("y", String(y))
                }
            } else {
                x = labelPosition.x
                y = labelPosition.y
            }
            // And transform
            const transform = `translate(${labelShift.x} ${labelShift.y}) rotate(${labelAngle} ${x} ${y})`
            labelElem.setAttribute("transform", transform)
            labelBg.setAttribute("transform", transform)

            // Set size of label background
            const labelBounds = labelElem.getBBox()
            const p = edge.labelPadding
            labelBg.setAttribute("x", String(labelBounds.x - p))
            labelBg.setAttribute("y", String(labelBounds.y - p))
            labelBg.setAttribute("width", String(labelBounds.width + p * 2))
            labelBg.setAttribute("height", String(labelBounds.height + p * 2))
        } else console.log({labelElem, labelBg, path, label})

    }, [internals, edge, id, path, grabbed, selected, label, labelPosition, labelShift, labelAngle])

    const baseID = internals.id
    return <g ref={ref} id={`${baseID}-edge-${id}`} className={cx(classes, EDGE_CLASS)} pointerEvents={!pointerEvents || internals.isStatic ? "none" : "stroke"}
                  data-grabbed={grabbed} data-selected={selected} data-id={id} data-type={"edge"}>
        <path d={path} className={EDGE_HANDLE_CLASS} stroke={"transparent"} fill={"none"} strokeWidth={boxWidth}/>
        <path ref={pathRef} d={path} className={EDGE_PATH_CLASS}
              markerStart={markerStart != null ? `url(#${baseID}-${markerStart})` : undefined}
              markerEnd={markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined}/>
        {label != null && <>
            <rect ref={labelBgRef} className={EDGE_LABEL_BACKGROUND_CLASS} rx={edge?.labelRadius} pointerEvents={!pointerEvents || internals.isStatic ? "none" : "fill"}/>
            <text ref={labelRef} className={EDGE_LABEL_CLASS} data-label-pos={String(labelPosition)} textAnchor={labelAnchor} dominantBaseline={labelBaseline}
                  x={typeof labelPosition === "object" ? labelPosition.x : undefined}
                  y={typeof labelPosition === "object" ? labelPosition.y : undefined}>
                {label}
            </text>
        </>}
    </g>
}