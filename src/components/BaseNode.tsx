import React, {useCallback, useContext, useEffect, useMemo, useRef} from "react";
import {BoundsContext} from "../context/BoundsContext";
import {NODE_CONTAINER_CLASS, NODE_HANDLE_CONTAINER_CLASS} from "../util/constants";
import {Property} from "csstype";
import styled from "@emotion/styled";
import {GrapherContext} from "../context/GrapherContext";
import {errorUnknownNode} from "../util/log";
import {hasProperty, resolveValue, resolveValues, splitCSSCalc} from "../util/utils";
import {Node, NodeHandleInfo} from "../data/Node";
import {HandlePresetToVariablePosition, NodeHandleProps, NodeHandlePropsPositioned} from "./NodeHandle";
import {NodeContext, NodeContextValue} from "../context/NodeContext";
import {useCallbackState} from "../hooks/useCallbackState";

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
    /**
     * Whether this node should be user-resizable, as set in the {@link Node Node's} properties.
     */
    resize?: Property.Resize
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

const ContainerDiv = styled.div<{ resize: Property.Resize | undefined, resizable: boolean }>`
  position: absolute;
  resize: ${props => props.resize ?? "initial"};
  overflow: ${props => props.resizable ? "auto" : "initial"};
  width: max-content;
  height: max-content;
`

export function BaseNode({id, classes, absolutePosition, grabbed, selected, children, resize}: BaseNodeProps) {
    const grapherContext = useContext(GrapherContext)
    const bounds = useContext(BoundsContext)

    const ref = useRef<HTMLDivElement>(null)
    const node = grapherContext.getNode(id)
    if (node == null) errorUnknownNode(id)
    const resizable = resize != null && resize !== "none" && resize !== "initial"
    const nodeID = `${grapherContext.id}n-${id}`

    // To allow recalculateNode to access new position & bounds without being re-created
    const s = useCallbackState({absolutePosition, bounds})

    // Function to notify ReactGrapher of changes to this node (size, border radius)
    const recalculateNode = useCallback(() => {
        const elem = ref.current
        const container = elem?.parentElement
        if (elem == null || node == null || container == null) return
        // Update node size
        let sizeChanged = false
        if (Math.abs(node.width - elem.offsetWidth) > .5) {
            node.width = elem.offsetWidth
            sizeChanged = true
        }
        if (Math.abs(node.height - elem.offsetHeight) > .5) {
            node.height = elem.offsetHeight
            sizeChanged = true
        }

        if (sizeChanged) {
            grapherContext.rerenderEdges()
            // If node is out of bounds, need to recalculate them
            const top = node.position.y - node.height / 2, left = node.position.x - node.width / 2
            const bottom = top + node.height, right = left + node.width
            if (top < s.bounds.top || bottom > s.bounds.bottom || left < s.bounds.left || right > s.bounds.right) grapherContext.recalculateBounds()
            // Update node position on-screen
            container.style.left = Math.round(s.absolutePosition.x - s.bounds.x - (node.width ?? 0) / 2) + "px"
            container.style.top = Math.round(s.absolutePosition.y - s.bounds.y - (node.height ?? 0) / 2) + "px"
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
            node.border = border
            node.borderRadius = bRadius
            grapherContext.rerenderEdges()
        }

        // Get handles
        const handleElems = container.querySelectorAll<HTMLElement>("." + NODE_HANDLE_CONTAINER_CLASS)
        // Check if handles have changed
        let handlesChanged = false
        if (node.handles == null || borderChanged) handlesChanged = true
        else {
            if (node.handles.length !== handleElems.length) handlesChanged = true
            else for (let i = 0; i < handleElems.length; ++i) {
                const style = getComputedStyle(handleElems[i])
                const [x, y] = [resolveValue(style.left, 0) + border[3] - node.width / 2, resolveValue(style.top, 0) + border[0] - node.height / 2]
                if (Math.abs(x - node.handles[i].x) > 2 || Math.abs(y - node.handles[i].y) > 2) {
                    handlesChanged = true
                    break
                }
            }
        }
        if (!handlesChanged) return

        grapherContext.rerenderEdges()
        // Set handles on Node object
        const handles: NodeHandleInfo[] = []
        let handleNum = 1; // to name nameless handles
        for (const h of handleElems) {
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
            if (useNodeBorder === "inner") {
                // Use padding box
                const pWidth = node.width - border[1] - border[3], pHeight = node.height - border[0] - border[2]
                x = border[3] + leftP * pWidth + left
                y = border[0] + topP * pHeight + top
            } else if (useNodeBorder === "normal") {
                // 'border-box' reduced to exclude half of the borders' widths
                const uWidth = node.width - (border[1] + border[3]) / 2, uHeight = node.height - (border[0] + border[2]) / 2
                x = border[3] / 2 + left + leftP * uWidth
                y = border[0] / 2 + top + topP * uHeight
            } else {
                x = left + leftP * node.width
                y = top + topP * node.width
            }

            // If requested, update the handle's DOM position
            if (useNodeBorder != null) {
                h.style.left = x + "px"
                h.style.top = y + "px"
            }

            // Get handle roles
            const roles = h.dataset.role?.split(",")

            // Save data and make x and y relative to the node's center
            handles.push({name, roles, x: x - node.width / 2, y: y - node.height / 2})
        }
        node.handles = handles
    }, [s, grapherContext, node])

    // Set listeners
    useEffect(() => {
        const elem = ref.current
        if (elem == null || node == null || grapherContext.isStatic) return

        // Destruct to ensure callbacks don't change until onEffect cleanup runs
        const {onObjectPointerDown, onObjectPointerUp} = grapherContext
        elem.addEventListener("pointerdown", onObjectPointerDown)
        elem.addEventListener("pointerup", onObjectPointerUp)
        const observer = new ResizeObserver(recalculateNode)
        observer.observe(elem)
        return () => {
            elem.removeEventListener("pointerdown", onObjectPointerDown)
            elem.removeEventListener("pointerup", onObjectPointerUp)
            observer.disconnect()
        }
    }, [grapherContext, node, recalculateNode])

    // Additionally, recalculateNode() should be called any time any prop changes
    useEffect(recalculateNode, [recalculateNode, id, classes, absolutePosition, grabbed, selected])

    // Set listeners for resizable node (if needed)
    useEffect(() => {
        if (ref.current == null || !resizable || grapherContext.isStatic) return
        const parent = ref.current.parentElement
        if (parent == null) return

        const onResizeStart = grapherContext.onResizeStart

        parent.addEventListener("pointerdown", onResizeStart)
        return () => parent.removeEventListener("pointerdown", onResizeStart)
    }, [grapherContext.onResizeStart, grapherContext.isStatic, ref, resizable])

    // Data that needs to be passed to NodeContent
    const nodeContextValue = useMemo<NodeContextValue>(() => ({
        id: nodeID,
        ref,
        baseZIndex: grapherContext.nodeZIndex,
        classes,
        selected,
        grabbed,
    }), [ref, grapherContext, nodeID, classes, selected, grabbed])

    return <ContainerDiv className={NODE_CONTAINER_CLASS} resize={grapherContext.isStatic ? undefined : resize} resizable={resizable} style={{
        left: Math.round(absolutePosition.x - bounds.x - (node?.width ?? 0) / 2),
        top: Math.round(absolutePosition.y - bounds.y - (node?.height ?? 0) / 2),
    }}>
        <NodeContext.Provider value={nodeContextValue}>
            {children}
        </NodeContext.Provider>
    </ContainerDiv>
}