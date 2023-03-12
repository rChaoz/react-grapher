import {GrapherContext, GrapherContextValue} from "../../context/GrapherContext";
import React, {useCallback, useContext, useEffect, useRef} from "react";
import {CallbacksContext} from "../../context/CallbacksContext";
import {errorUnknownNode} from "../../util/log";
import {hasProperty, resolveValue, resolveValues} from "../../util/utils";
import {NODE_HANDLE_CLASS} from "../../util/constants";
import {NodeHandle} from "../../data/Node";
import {HandlePresetToVariablePosition, NodeHandlePropsPositioned} from "../NodeHandle";

// Common code of BaseNode and BaseNodeResizable
export function useBaseNode(id: string, updateDeps: any[]): [GrapherContextValue, React.RefObject<HTMLDivElement>] {
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

        // Set handles on Node object
        const handles: NodeHandle[] = []
        let handleNum = 1; // to name nameless handles
        elem.querySelectorAll<HTMLElement>("." + NODE_HANDLE_CLASS).forEach(h => {
            // Get name and set if unnamed
            const name = h.dataset.name ?? (h.dataset.name = "handle-" + handleNum++)
            // Calculate position if needed
            const pos = h.dataset.position as NodeHandlePropsPositioned["position"] | undefined
            if (pos != null) {
                let variablePos: string | null = pos
                switch (pos) {
                    // Treat corner cases first
                    case "top-left":
                        variablePos = null
                        h.style.left = border[0][0] / 2 + "px"
                        h.style.top = border[0][1] / 2 + "px"
                        break
                    case "top-right":
                        variablePos = null
                        h.style.left = `calc(100% - ${border[1][0] / 2}px)`
                        h.style.top = border[1][1] / 2 + "px"
                        break
                    case "bottom-right":
                        variablePos = null
                        h.style.left = `calc(100% - ${border[2][0] / 2}px)`
                        h.style.top = `calc(100% - ${border[2][1] / 2}px)`
                        break
                    case "bottom-left":
                        variablePos = null
                        h.style.left = border[3][0] / 2 + "px"
                        h.style.top = `calc(100% - ${border[3][1] / 2}px)`
                        break
                    // On-side cases
                    default:
                        if (hasProperty(HandlePresetToVariablePosition, variablePos)) variablePos = HandlePresetToVariablePosition[pos] as string
                        break
                }
                // Variable on-side position
                if (variablePos != null) {
                    const [side, percentageStr] = variablePos.split(":")
                    const percentage = Number(percentageStr)
                    let p: number, pr: number, angle: number
                    switch (side) {
                        // Sides case
                        case "top":
                            h.style.left = percentageStr + "%"
                            p = node.width * percentage / 100
                            pr = node.width - p
                            if (p < border[0][0]) h.style.top = Math.sqrt(1 - (p / border[0][0]) ** 2) * border[0][1] + "px"
                            else if (pr < border[1][0]) h.style.top = Math.sqrt(1 - (pr / border[1][0]) ** 2) * border[1][1] + "px"
                            else h.style.top = "0"
                            break
                        case "right":
                            h.style.top = percentageStr + "%"
                            p = node.height * percentage / 100
                            pr = node.height - p
                            if (p < border[1][1]) h.style.left = `calc(100% - ${Math.sqrt(1 - (p / border[1][1]) ** 2) * border[1][0]}px`
                            else if (pr < border[2][1]) h.style.left = `calc(100% - ${Math.sqrt(1 - (pr / border[2][1]) ** 2) * border[2][0]}px`
                            else h.style.left = "100%"
                            break
                        case "bottom":
                            h.style.left = (100 - percentage) + "%"
                            p = node.width * percentage / 100
                            pr = node.width - p
                            if (p < border[2][0]) h.style.top = `calc(100% - ${Math.sqrt(1 - (p / border[2][0]) ** 2) * border[2][1]}px`
                            else if (pr < border[3][0]) h.style.top = `calc(100% - ${Math.sqrt(1 - (pr / border[3][0]) ** 2) * border[3][1]}px`
                            else h.style.top = "100%"
                            break
                        case "left":
                            h.style.top = (100 - percentage) + "%"
                            p = node.height * percentage / 100
                            pr = node.height - p
                            if (p < border[3][1]) h.style.left = Math.sqrt(1 - (p / border[3][1]) ** 2) * border[3][0] + "px"
                            else if (pr < border[0][1]) h.style.left = Math.sqrt(1 - (pr / border[0][1]) ** 2) * border[0][0] + "px"
                            else h.style.left = "0"
                            break
                        // Ellipse case
                        case "ellipse":
                            variablePos = null
                            angle = (-percentage + 25) / 50 * Math.PI
                            h.style.top = node.height / 2 + node.height / 2 * Math.sin(angle) + "px"
                            h.style.left = node.width / 2 - node.width / 2 * Math.cos(angle) + "px"
                            break
                    }
                }
            }
            // Get handle position
            const style = getComputedStyle(h)
            const x = resolveValue(style.left, node.width) - node.width / 2 // make it relative to node center
            const y = resolveValue(style.top, node.height) - node.height / 2
            // And roles
            const roles = h.dataset.role?.split(",")
            // Save data
            handles.push({name, roles, x, y})
        })
        node.handles = handles
    }, [grapherContext, node])

    // Set listeners
    useEffect(() => {
        const elem = ref.current
        if (elem == null || node == null || grapherContext.static) return

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

    // Additionally, recalculateNode() should be called any time any prop changes
    useEffect(recalculateNode, [recalculateNode, ...updateDeps])

    return [grapherContext, ref]
}