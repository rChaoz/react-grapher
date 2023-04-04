import React, {useContext, useEffect, useRef} from "react";
import {InternalContext} from "../context/InternalContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_HANDLE_CLASS, EDGE_LABEL_BACKGROUND_CLASS, EDGE_LABEL_CLASS, EDGE_PATH_CLASS} from "../util/constants";
import {Node} from "../data/Node";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Edge} from "../data/Edge";
import {errorQueryFailed, errorUnknownEdge, warnInvalidPropValue} from "../util/log";
import styled from "@emotion/styled";

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

export interface EdgeProps<T> extends Omit<BaseEdgeProps, "path" | "labelPosition"> {
    /**
     * Custom Edge data
     */
    data: T | undefined
    /**
     * Label center position. A number 0..1, as a position on the SVG path (as specified by {@link Edge.labelPosition}).
     */
    labelPosition: DOMPoint | number
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

const BaseG = styled.g<{ static?: boolean }>`
  pointer-events: ${props => props.static ? "none" : "stroke"};
`

export function BaseEdge({id, path, classes, label, labelPosition, selected, grabbed, markerStart, markerEnd}: BaseEdgeProps) {
    const internals = useContext(InternalContext)

    const ref = useRef<SVGGraphicsElement>(null)
    const edge = internals.getEdge(id)
    if (edge == null) errorUnknownEdge(id)

    useEffect(() => {
        const elem = ref.current
        if (elem == null || edge == null) return

        // Update edge size if it has changed
        const bounds = elem.getBBox()
        if (Math.abs(edge.bounds.x - bounds.x) > 2 || Math.abs(edge.bounds.y - bounds.y) > 2
            || Math.abs(edge.bounds.width - bounds.width) > 4 || Math.abs(edge.bounds.height - bounds.height) > 4) {
            edge.bounds = bounds
            internals.recalculateBounds()
        }

        // Add listeners (destruct to ensure they do not modify, so we can remove the same listeners later(
        const {isStatic, onObjectPointerUp, onObjectPointerDown} = internals
        if (!isStatic) {
            elem.addEventListener("pointerdown", onObjectPointerDown)
            elem.addEventListener("pointerup", onObjectPointerUp)
        }

        // Label stuff
        const labelElem = elem.querySelector<SVGGraphicsElement>("." + EDGE_LABEL_CLASS)
        const labelBg = elem.querySelector<SVGGraphicsElement>("." + EDGE_LABEL_BACKGROUND_CLASS)
        if (labelElem != null && labelBg != null) {
            // Set position of label
            if ("labelPos" in labelElem.dataset) {
                const labelPos = Number(labelElem.dataset.labelPos)
                if (labelPos < 0 || labelPos > 1)
                    warnInvalidPropValue(`Edge '${edge.id}'`, "labelPosition", labelElem.dataset.labelPos, ["0..1"])
                else {
                    const pathElem = elem.querySelector<SVGGeometryElement>("." + EDGE_PATH_CLASS)
                    if (pathElem == null) errorQueryFailed(`'.${EDGE_PATH_CLASS}' from element #${elem.id}`, `SVG path element of edge ${edge.id}`)
                    else {
                        const pos = pathElem.getPointAtLength(labelPos * pathElem.getTotalLength())
                        labelElem.setAttribute("x", String(pos.x))
                        labelElem.setAttribute("y", String(pos.y))
                    }
                }
            }

            // Set size of label background
            const labelBounds = labelElem.getBBox()
            const p = edge.labelPadding
            labelBg.setAttribute("x", String(labelBounds.x - p))
            labelBg.setAttribute("y", String(labelBounds.y - p))
            labelBg.setAttribute("width", String(labelBounds.width + p * 2))
            labelBg.setAttribute("height", String(labelBounds.height + p * 2))
        }

        if (!isStatic) return () => {
            elem.removeEventListener("pointerdown", onObjectPointerDown)
            elem.removeEventListener("pointerup", onObjectPointerUp)
        }
    }, [internals, edge, id, path, grabbed, selected])

    const baseID = internals.id
    return <BaseG ref={ref} id={`${baseID}e-${id}`} className={cx(classes, EDGE_CLASS)} data-grabbed={grabbed} data-selected={selected} static={internals.isStatic}>
        <path d={path} className={EDGE_HANDLE_CLASS} stroke={"transparent"} fill={"none"} strokeWidth={15}/>
        <path d={path} className={EDGE_PATH_CLASS}
              markerStart={markerStart != null ? `url(#${baseID}-${markerStart})` : undefined}
              markerEnd={markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined}/>
        {label != null && <>
            <rect className={EDGE_LABEL_BACKGROUND_CLASS} rx={edge?.labelRadius} pointerEvents={internals.isStatic ? "none" : "fill"}/>
            {typeof labelPosition === "number" || labelPosition == null
                ? <text className={EDGE_LABEL_CLASS} textAnchor={"middle"}
                        dominantBaseline={"middle"} data-label-pos={String(labelPosition)}>{label}</text>
                : <text className={EDGE_LABEL_CLASS} x={labelPosition.x} y={labelPosition.y} textAnchor={"middle"}
                        dominantBaseline={"middle"}>{label}</text>}
        </>}
    </BaseG>
}