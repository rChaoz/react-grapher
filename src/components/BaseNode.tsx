import React, {useContext, useEffect, useRef} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {NODE_CLASS, Z_INDEX_GRABBED_NODE} from "../util/constants";
import {GrapherContext} from "../context/GrapherContext";
import {BoundsContext} from "../context/BoundsContext";
import {Node} from "../data/Node";
import {errorUnknownNode} from "../util/log";
import {CallbacksContext} from "../context/CallbacksContext";
import {resolveValues} from "../util/utils";

export interface BaseNodeProps {
    /**
     * ID of the node
     */
    id: string
    /**
     * CSS classes to be added to the node element
     */
    classes: string[]
    /**
     * Absolute position of this node
     * TODO This shouldn't be recalculated every render
     */
    absolutePosition: DOMPoint
    /**
     * Whether this node is grabbed (being moved)
     */
    grabbed: boolean
    /**
     * Whether this node is selected
     */
    selected: boolean
    /**
     * Contents of your node should be placed here
     */
    children: React.ReactNode
}

export interface NodeProps<T> extends Omit<BaseNodeProps, "children"> {
    /**
     * Custom node data
     */
    data: T
    /**
     * Parent of this node, if it exists
     */
    parent?: Node<unknown> | null
    /**
     * Position relative to parent, if parent is not null, or same as {@link absolutePosition} if it is null
     */
    position: DOMPoint
    /**
     * Spacing between this node and the edges that connect to it. This space is *automatically taken into consideration* for the calculation of edges.
     */
    edgeMargin: number
}

const BaseDiv = styled.div<{ baseZIndex: number, grabbed: boolean }>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: ${props => props.grabbed ? Z_INDEX_GRABBED_NODE : props.baseZIndex};
`

export function BaseNode({id, classes, absolutePosition, grabbed, selected, children}: BaseNodeProps) {
    const grapherContext = useContext(GrapherContext)
    const listeners = useContext(CallbacksContext)
    const bounds = useContext(BoundsContext)

    const ref = useRef<HTMLDivElement>(null)
    const node = grapherContext.getNode(id)
    if (node == null) errorUnknownNode(id)

    useEffect(() => {
        const elem = ref.current
        if (elem == null || node == null) return
        // Update node size
        if (Math.abs(node.width - elem.offsetWidth) > 3) {
            node.width = elem.offsetWidth
            grapherContext.rerenderEdges()
            grapherContext.recalculateBounds()
        }
        if (Math.abs(node.height - elem.offsetHeight) > 3) {
            node.height = elem.offsetHeight
            grapherContext.rerenderEdges()
            grapherContext.recalculateBounds()
        }

        // Update border radius
        let borderChanged = false
        const style = getComputedStyle(elem)
        /* border[pos][axis] - border radius for every corner
        pos = 0 (top-left) / 1 (top-right) / 2 (bottom-right) / 3 (bottom-left)
        axis = 0 (x-axis) / 1 (y-axis)
         */
        const border: [[number, number], [number, number], [number, number], [number, number]] = [
            resolveValues(style.borderTopLeftRadius, node.width, node.height),
            resolveValues(style.borderTopRightRadius, node.width, node.height),
            resolveValues(style.borderBottomRightRadius, node.width, node.height),
            resolveValues(style.borderBottomLeftRadius, node.width, node.height),
        ]
        for (let i = 0; i < 4; ++i) if (Math.abs(border[i][0] - node.borderRadius[i][0]) > 3 || Math.abs(border[i][1] - node.borderRadius[i][1]) > 3) {
            borderChanged = true
            break
        }
        if (borderChanged) {
            node.borderRadius = border
            grapherContext.rerenderEdges()
        }

        // Set listeners
        if (grapherContext.static) return
        elem.addEventListener("pointerdown", listeners.onObjectPointerDown)
        elem.addEventListener("pointerup", listeners.onObjectPointerUp)
        return () => {
            elem.removeEventListener("pointerdown", listeners.onObjectPointerDown)
            elem.removeEventListener("pointerup", listeners.onObjectPointerUp)
        }
    }, [grapherContext, listeners, node, grabbed, selected])

    return <BaseDiv ref={ref} id={`${grapherContext.id}n-${id}`} baseZIndex={grapherContext.nodeZIndex} grabbed={grabbed}
                    className={cx(classes, NODE_CLASS)} data-grabbed={grabbed} data-selected={selected} style={{
        left: absolutePosition.x - bounds.x,
        top: absolutePosition.y - bounds.y,
    }}>
        {children}
    </BaseDiv>
}