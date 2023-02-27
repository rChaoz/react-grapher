import React, {useContext, useEffect, useRef} from "react";
import {GrapherContext} from "../context/GrapherContext";
import {cx} from "@emotion/css";
import {EDGE_CLASS, EDGE_HANDLE_CLASS, EDGE_LABEL_BACKGROUND_CLASS, EDGE_LABEL_CLASS, EDGE_PATH_CLASS} from "../util/constants";
import {Node} from "../data/Node";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Edge} from "../data/Edge";
import {errorQueryFailed, errorUnknownEdge, warnInvalidEdgeLabelPos} from "../util/log";
import {CallbacksContext} from "../context/CallbacksContext";
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
     * TODO Shouldn't be recalculated every render
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
     * TODO Shouldn't be recalculated every render
     */
    targetPos: DOMPoint
    /**
     * Handle of target Node this edge connects to (null for floating edge)
     */
    targetHandle: string | null
}

const BaseG = styled.g<{static?: boolean}>`
  pointer-events: ${props => props.static ? "none" : "all"};
`

export function BaseEdge({id, path, classes, label, labelPosition, selected, grabbed, markerStart, markerEnd}: BaseEdgeProps) {
    const grapherContext = useContext(GrapherContext)
    const listeners = useContext(CallbacksContext)

    const ref = useRef<SVGGraphicsElement>(null)
    const edge = grapherContext.getEdge(id)
    if (edge == null) errorUnknownEdge(id)

    useEffect(() => {
        const elem = ref.current
        if (elem == null || edge == null) return

        // Update edge size if it has changed
        const bounds = elem.getBBox()
        if (Math.abs(edge.bounds.x - bounds.x) > 3 || Math.abs(edge.bounds.y - bounds.y) > 3
            || Math.abs(edge.bounds.width - bounds.width) > 5 || Math.abs(edge.bounds.height - bounds.height) > 5) {
            edge.bounds = bounds
            grapherContext.recalculateBounds()
        }

        // Add listeners
        if (!grapherContext.static) {
            elem.addEventListener("pointerdown", listeners.onObjectPointerDown)
            elem.addEventListener("pointerup", listeners.onObjectPointerUp)
        }

        // Label stuff
        const labelElem = elem.querySelector<SVGGraphicsElement>("." + EDGE_LABEL_CLASS)
        const labelBg = elem.querySelector<SVGGraphicsElement>("." + EDGE_LABEL_BACKGROUND_CLASS)
        if (labelElem != null && labelBg != null) {
            // Set position of label
            if ("labelPos" in labelElem.dataset) {
                const labelPos = Number(labelElem.dataset.labelPos)
                if (labelPos < 0 || labelPos > 1) warnInvalidEdgeLabelPos(edge.id, labelElem.dataset.labelPos)
                else {
                    const pathElem = elem.querySelector<SVGGeometryElement>("." + EDGE_PATH_CLASS)
                    if (pathElem == null) errorQueryFailed(`#${id}e-${edge.id} .${EDGE_PATH_CLASS}`, `SVG path element of edge ${edge.id}`)
                    else {
                        const pos = pathElem.getPointAtLength(labelPos * pathElem.getTotalLength())
                        labelElem.setAttribute("x", String(pos.x))
                        labelElem.setAttribute("y", String(pos.y))
                    }
                }
            }

            // Set size of label background
            const labelBounds = labelElem.getBBox()
            // TODO Customisable padding (global and per edge)
            labelBg.setAttribute("x", String(labelBounds.x - 2))
            labelBg.setAttribute("y", String(labelBounds.y - 2))
            labelBg.setAttribute("width", String(labelBounds.width + 4))
            labelBg.setAttribute("height", String(labelBounds.height + 4))
        }

        if (!grapherContext.static) return () => {
            elem.removeEventListener("pointerdown", listeners.onObjectPointerDown)
            elem.removeEventListener("pointerup", listeners.onObjectPointerUp)
        }
    }, [grapherContext, listeners, edge, id, path, grabbed, selected])

    const baseID = grapherContext.id
    return <BaseG ref={ref} id={`${baseID}e-${id}`} className={cx(classes, EDGE_CLASS)} data-grabbed={grabbed} data-selected={selected} static={grapherContext.static}>
        <path d={path} className={EDGE_HANDLE_CLASS} stroke={"transparent"} fill={"none"} strokeWidth={15}/>
        <path d={path} className={EDGE_PATH_CLASS}
              markerStart={markerStart != null ? `url(#${baseID}-${markerStart})` : undefined}
              markerEnd={markerEnd != null ? `url(#${baseID}-${markerEnd})` : undefined}/>
        {label != null && <>
            <rect className={EDGE_LABEL_BACKGROUND_CLASS} rx={6}/>
            {typeof labelPosition === "number" || labelPosition == null
                ? <text className={EDGE_LABEL_CLASS} textAnchor={"middle"}
                        dominantBaseline={"middle"} data-label-pos={String(labelPosition)}>{label}</text>
                : <text className={EDGE_LABEL_CLASS} x={labelPosition.x} y={labelPosition.y} textAnchor={"middle"}
                        dominantBaseline={"middle"}>{label}</text>}
        </>}
    </BaseG>
}