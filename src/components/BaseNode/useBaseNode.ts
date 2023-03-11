import {GrapherContext, GrapherContextValue} from "../../context/GrapherContext";
import React, {useCallback, useContext, useEffect, useRef} from "react";
import {CallbacksContext} from "../../context/CallbacksContext";
import {errorUnknownNode} from "../../util/log";
import {resolveValues} from "../../util/utils";

// Common code of BaseNode and BaseNodeResizable
export function useBaseNode(id: string): [GrapherContextValue, React.RefObject<HTMLDivElement>] {
    const grapherContext = useContext(GrapherContext)
    const listeners = useContext(CallbacksContext)

    const ref = useRef<HTMLDivElement>(null)
    const node = grapherContext.getNode(id)
    if (node == null) errorUnknownNode(id)

    // Function to notify ReactGrapher of changes to this node (size, border radius)
    const recalculateNode = useCallback(() => {
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
    }, [grapherContext, node])

    // Set listeners
    useEffect(() => {
        const elem = ref.current
        if (elem == null || node == null || grapherContext.static) return
        recalculateNode()

        elem.addEventListener("pointerdown", listeners.onObjectPointerDown)
        elem.addEventListener("pointerup", listeners.onObjectPointerUp)
        const observer = new ResizeObserver(recalculateNode)
        observer.observe(elem)
        return () => {
            elem.removeEventListener("pointerdown", listeners.onObjectPointerDown)
            elem.removeEventListener("pointerup", listeners.onObjectPointerUp)
            observer.disconnect()
        }
    }, [grapherContext, listeners, node, recalculateNode])

    return [grapherContext, ref]
}