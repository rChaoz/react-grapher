import React, {SVGProps, useContext, useEffect, useRef} from "react";
import {InternalContext} from "../context/InternalContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_HANDLE_CLASS, EDGE_IN_PROGRESS_CLASS, EDGE_LABEL_BACKGROUND_CLASS, EDGE_LABEL_CLASS, EDGE_PATH_CLASS} from "../util/constants";
import {errorUnknownEdge, warnInvalidPropValue} from "../util/log";
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
     * Additional x/y label position offset amount.
     * @see Edge.labelOffset
     */
    labelOffset: DOMPoint
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
     * Label background border radius
     */
    labelBackgroundRadius: NonNullable<SVGProps<SVGRectElement>["rx"]>
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
    /**
     * Whether this is an in-progress edge (i.e. currently being created by the user by dragging from a node handle).
     * This will swap the base class "react-grapher-edge", on the root element, for "react-grapher-edge-in-progress".
     */
    inProgress?: boolean
}

export function BaseEdge({id, path, classes, boxWidth, label, labelPosition, labelOffset, labelAnchor, labelBaseline, labelAngle, labelBackgroundRadius,
                             selected, grabbed, markerStart, markerEnd, pointerEvents, inProgress} : BaseEdgeProps) {
    const internals = useContext(InternalContext)

    // Ref to the Edge <g> and <path> elements
    const ref = useRef<SVGGraphicsElement>(null), pathRef = useRef<SVGPathElement>(null)
    // Ref to the label and its background
    const labelRef = useRef<SVGTextElement>(null), labelBgRef = useRef<SVGRectElement>(null)
    // Get internal edge object
    const edge = internals.getEdge(id)
    if (edge == null && !inProgress) errorUnknownEdge(id)
    
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
            const transform = `translate(${labelOffset.x} ${labelOffset.y}) rotate(${labelAngle} ${x} ${y})`
            labelElem.setAttribute("transform", transform)
            labelBg.setAttribute("transform", transform)

            // Set size of label background
            const labelBounds = labelElem.getBBox()
            const p = edge.labelPadding
            labelBg.setAttribute("x", String(labelBounds.x - p))
            labelBg.setAttribute("y", String(labelBounds.y - p))
            labelBg.setAttribute("width", String(labelBounds.width + p * 2))
            labelBg.setAttribute("height", String(labelBounds.height + p * 2))
        }

    }, [internals, edge, id, path, grabbed, selected, label, labelPosition, labelOffset, labelAngle])

    const baseID = internals.id
    return <g ref={ref} id={`${baseID}-edge-${id}`} className={cx(classes, inProgress ? EDGE_IN_PROGRESS_CLASS : EDGE_CLASS)} data-id={id} data-type={"edge"}
              pointerEvents={!pointerEvents || internals.isStatic || inProgress ? "none" : "stroke"} data-grabbed={grabbed} data-selected={selected}>
        <path d={path} className={EDGE_HANDLE_CLASS} stroke={"transparent"} fill={"none"} strokeWidth={boxWidth}/>
        <path ref={pathRef} d={path} className={EDGE_PATH_CLASS}
              markerStart={markerStart != null ? `url(#${baseID}-${markerStart})` : undefined}
              markerEnd={markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined}/>
        {label != null && <>
            <rect ref={labelBgRef} className={EDGE_LABEL_BACKGROUND_CLASS} rx={labelBackgroundRadius} pointerEvents={!pointerEvents || internals.isStatic ? "none" : "fill"}/>
            <text ref={labelRef} className={EDGE_LABEL_CLASS} data-label-pos={String(labelPosition)} textAnchor={labelAnchor} dominantBaseline={labelBaseline}
                  x={typeof labelPosition === "object" ? labelPosition.x : undefined}
                  y={typeof labelPosition === "object" ? labelPosition.y : undefined}>
                {label}
            </text>
        </>}
    </g>
}