import {GrapherContext, GrapherContextValue} from "../../context/GrapherContext";
import React, {useCallback, useContext, useEffect, useRef} from "react";
import {CallbacksContext} from "../../context/CallbacksContext";
import {errorUnknownNode} from "../../util/log";
import {splitCSSCalc, hasProperty, resolveValue, resolveValues} from "../../util/utils";
import {NODE_HANDLE_CLASS} from "../../util/constants";
import {NodeHandle} from "../../data/Node";
import {HandlePresetToVariablePosition, NodeHandleProps, NodeHandlePropsPositioned} from "../NodeHandle";

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
        if (Math.abs(node.width - elem.offsetWidth) > .5) {
            node.width = elem.offsetWidth
            grapherContext.rerenderEdges()
            grapherContext.recalculateBounds()
        }
        if (Math.abs(node.height - elem.offsetHeight) > .5) {
            node.height = elem.offsetHeight
            grapherContext.rerenderEdges()
            grapherContext.recalculateBounds()
        }

        // Update border radius
        let borderChanged = false
        const style = getComputedStyle(elem)
        /* bRadius[pos][axis] - bRadius radius for every corner
        pos = 0 (top-left) / 1 (top-right) / 2 (bottom-right) / 3 (bottom-left)
        axis = 0 (x-axis) / 1 (y-axis)
         */
        const bRadius: [[number, number], [number, number], [number, number], [number, number]] = [
            resolveValues(style.borderTopLeftRadius, node.width, node.height),
            resolveValues(style.borderTopRightRadius, node.width, node.height),
            resolveValues(style.borderBottomRightRadius, node.width, node.height),
            resolveValues(style.borderBottomLeftRadius, node.width, node.height),
        ]
        const border: [number, number, number, number] = [
            resolveValue(style.borderTopWidth, 0),
            resolveValue(style.borderRightWidth, 0),
            resolveValue(style.borderBottomWidth, 0),
            resolveValue(style.borderLeftWidth, 0),
        ]
        for (let i = 0; i < 4; ++i) if (Math.abs(border[i] - node.border[i]) > .5) {
            borderChanged = true
            break
        }
        for (let i = 0; i < 4; ++i) if (Math.abs(bRadius[i][0] - node.borderRadius[i][0]) > .5 || Math.abs(bRadius[i][1] - node.borderRadius[i][1]) > .5) {
            borderChanged = true
            break
        }
        if (borderChanged) {
            node.borderRadius = bRadius
            node.border = border
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
            // top & left values in 'px' and in '%'
            let top = 0, left = 0, topP = 0, leftP = 0
            let useNodeBorder = h.dataset.useNodeBorder as NodeHandleProps["useNodeBorderBox"]
            if (pos != null) {
                if (useNodeBorder == null) useNodeBorder = "disable"
                let variablePos: string | null = null
                switch (pos) {
                    // Treat corner cases first
                    case "top-left":
                        left = bRadius[0][0] * .3 // 1 - cos(45deg)
                        top = bRadius[0][1] * .3  // 1 - sin(45deg)
                        break
                    case "top-right":
                        left = -bRadius[1][0] * .3
                        leftP = 100
                        top = bRadius[1][1] * .3
                        break
                    case "bottom-right":
                        left = -bRadius[2][0] * .3
                        top = -bRadius[2][1] * .3
                        leftP = topP = 100
                        break
                    case "bottom-left":
                        left = bRadius[3][0] * .3
                        top = -bRadius[3][1] * .3
                        topP = -100
                        break
                    // On-side cases
                    default:
                        if (hasProperty(HandlePresetToVariablePosition, pos)) variablePos = HandlePresetToVariablePosition[pos] as string
                        else variablePos = pos
                        break
                }
                // Variable on-side position
                if (variablePos != null) {
                    const [side, percentageStr] = variablePos.split(":")
                    const percentage = Number(percentageStr) / 100
                    let p: number, pr: number, angle: number
                    switch (side) {
                        // Sides case
                        case "top":
                            leftP = percentage
                            p = node.width * percentage
                            pr = node.width - p
                            if (p < bRadius[0][0]) top = Math.sqrt(1 - (p / bRadius[0][0]) ** 2) * bRadius[0][1]
                            else if (pr < bRadius[1][0]) top = Math.sqrt(1 - (pr / bRadius[1][0]) ** 2) * bRadius[1][1]
                            break
                        case "right":
                            topP = percentage
                            leftP = 1
                            p = node.height * percentage
                            pr = node.height - p
                            if (p < bRadius[1][1]) left = -Math.sqrt(1 - (p / bRadius[1][1]) ** 2) * bRadius[1][0]
                            else if (pr < bRadius[2][1]) left = Math.sqrt(1 - (pr / bRadius[2][1]) ** 2) * bRadius[2][0]
                            break
                        case "bottom":
                            leftP = 1 - percentage
                            topP = 1
                            p = node.width * percentage
                            pr = node.width - p
                            if (p < bRadius[2][0]) top = Math.sqrt(1 - (p / bRadius[2][0]) ** 2) * bRadius[2][1]
                            else if (pr < bRadius[3][0]) top = Math.sqrt(1 - (pr / bRadius[3][0]) ** 2) * bRadius[3][1]
                            break
                        case "left":
                            topP = 1 - percentage
                            p = node.height * percentage
                            pr = node.height - p
                            if (p < bRadius[3][1]) left = Math.sqrt(1 - (p / bRadius[3][1]) ** 2) * bRadius[3][0]
                            else if (pr < bRadius[0][1]) left = Math.sqrt(1 - (pr / bRadius[0][1]) ** 2) * bRadius[0][0]
                            break
                        // Ellipse case
                        case "ellipse":
                            variablePos = null
                            angle = (-percentage + .25) / .5 * Math.PI
                            topP = .5 + .5 * Math.sin(angle)
                            leftP = .5 - .5 * Math.cos(angle)
                            break
                    }
                }
            } else if (useNodeBorder != null) {
                // Position was set manually, but top & left values should be adjusted to account for the node's bRadius
                const style = getComputedStyle(h);
                [topP, top] = splitCSSCalc(style.top);
                [leftP, left] = splitCSSCalc(style.left)
                topP /= 100
                leftP /= 100
            }

            // Position of handle relative to node center
            let x: number, y: number

            // Set x and y to account for border, if needed
            if (useNodeBorder === "full") {
                x = left + leftP * node.width
                y = top + topP * node.width
            } else if (useNodeBorder === "normal") {
                // "Updated padding box" - padding box extended to contain half of the borders' widths
                const uWidth = node.width - (border[1] + border[3]) / 2, uHeight = node.height - (border[0] + border[2]) / 2
                x = border[3] / 2 + left + leftP * uWidth
                y = border[0] / 2 + top + topP * uHeight
            } else {
                // Padding box
                const pWidth = node.width - border[1] - border[3], pHeight = node.height - border[0] - border[2]
                x = border[3] + leftP * pWidth + left
                y = border[0] + topP * pHeight + top
            }

            // If requested, update the handle's DOM position
            if (useNodeBorder != null) {
                console.log("Handle pos updated")
                h.style.left = x - border[3] + "px"
                h.style.top = y - border[0] + "px"
            }

            // Make x and y relative to the node's center
            x -= node.width / 2
            y -= node.height / 2

            // Get handle roles
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