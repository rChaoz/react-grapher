import React, {useCallback, useContext, useEffect, useMemo, useRef} from "react";
import {BoundsContext} from "../context/BoundsContext";
import {NODE_CLASS, NODE_CONTAINER_CLASS, NODE_HANDLE_BOX_CLASS, NODE_HANDLE_CONTAINER_CLASS, Z_INDEX_GRABBED_NODE} from "../util/constants";
import {Property} from "csstype";
import styled from "@emotion/styled";
import {InternalContext} from "../context/InternalContext";
import {errorUnknownNode} from "../util/log";
import {hasProperty, resolveValue, resolveValues, splitCSSCalc, stringToBoolean} from "../util/utils";
import {NodeHandleInfo} from "../data/Node";
import {useCallbackState} from "../hooks/useCallbackState";
import {cx} from "@emotion/css";
import {isFragment} from "react-is";
import {NodeContext, NodeContextValue} from "../context/NodeContext";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {HandlePresetToVariablePosition, NodeHandle, NodeHandleProps, NodeHandlePropsPositioned} from "./NodeHandle";

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
     * Whether this node should be user-resizable, as set in the {@link Node Node's} properties.
     */
    resize: Property.Resize
    /**
     * Whether to enable pointer events for this node.
     */
    pointerEvents: boolean
    /**
     * Whether to enable pointer events for this node's handles (unless they override it).
     */
    handlePointerEvents: boolean | null
    /**
     * Handles of this node. You should use an array of {@link SimpleNodeHandle SimpleNodeHandles} initially, and use a {@link React.ReactFragment &lt;&gt;...&lt;/&gt;}
     * (ReactFragment) containing multiple {@link NodeHandle} elements for more complex needs.
     */
    handles?: SimpleNodeHandle[] | React.ReactFragment
    /**
     * Contents of your node should be placed here
     */
    children: React.ReactNode
}

export type SimpleNodeHandle = Pick<NodeHandlePropsPositioned, "name" | "role" | "position" | "className" | "allowNewEdges" | "allowEdgeTarget" | "pointerEvents">

const ContainerDiv = styled.div<{ resize: Property.Resize | undefined, resizable: boolean }>`
  position: absolute;
  resize: ${props => props.resize ?? "initial"};
  overflow: ${props => props.resizable ? "auto" : "initial"};
  width: max-content;
  height: max-content;
  display: flex;
  justify-content: stretch;
  align-items: stretch;
`

const ContentDiv = styled.div<{ zIndex: number, grabbed: boolean, pointerEvents: boolean | undefined }>`
  pointer-events: ${props => props.pointerEvents === false ? "none" : "initial"};
  position: relative;
  flex-grow: 1;
  z-index: ${props => props.zIndex};
`

type ResizeAnchor = "top-left" | "top-right" | "bottom-right" | "bottom-left" | "center"

const dummyNode = {
    width: 0, height: 0, margin: [0, 0, 0, 0], handlePointerEvents: false
}

export function BaseNode({id, classes, absolutePosition, grabbed, selected, resize, pointerEvents, handlePointerEvents, handles, children}: BaseNodeProps) {
    const internals = useContext(InternalContext)
    const bounds = useContext(BoundsContext)

    // Ref to node content div
    const ref = useRef<HTMLDivElement>(null)
    // Get node object
    const node = internals.getNode(id)
    if (node == null) errorUnknownNode(id)
    // Whether this node is resizable
    const resizable = resize != null && resize !== "none" && resize !== "initial"
    // Resize position (always bottom right for HTML-based resize via 'resize' CSS property)
    const resizeAnchor = useRef<ResizeAnchor>("bottom-right")

    // To allow recalculateNode to access new position without having to re-create callback
    const s = useCallbackState({absolutePosition, bounds})

    // Function to notify ReactGrapher of changes to this node (size, border radius)
    const recalculateNode = useCallback(() => {
        const elem = ref.current
        const container = elem?.parentElement
        if (elem == null || node == null || container == null) return
        const style = getComputedStyle(elem)
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

        // Update margins
        const containerWidth = container.offsetWidth, containerHeight = container.offsetHeight
        const margin: [number, number, number, number] = [
            resolveValue(style.marginTop, containerHeight),
            resolveValue(style.marginRight, containerWidth),
            resolveValue(style.marginBottom, containerHeight),
            resolveValue(style.marginLeft, containerWidth),
        ]
        for (let i = 0; i < 4; i++) {
            if (Math.abs(margin[i] - node.margin[i]) > .5) {
                sizeChanged = true
                node.margin = margin
                break
            }
        }

        if (sizeChanged) {
            if (internals.nodeBeingResized === id) {
                // If node is being resized, it needs to be moved to account the resize anchor point
                const containerStyle = getComputedStyle(container)
                const left = resolveValue(containerStyle.left, 0)
                const top = resolveValue(containerStyle.top, 0)
                /* Calculate new absolute x and y, extracted from formula (same for top/y):
                 - left = absolutePosition.x - bounds.x - node.width / 2
                 == results into =>
                 - absolutePosition.x = left + bounds.x + node.width / 2
                 Note: only node.width changes when resizing; by doing this (using the old 'left' value), we get the X it should have if we want to *keep*
                 the same left (and top), which means "bottom-right" anchor. This needs to be adjusted for other anchor positions.
                 Additionally, we need to update node's position too, not just absolute position (position might be relative to a parent). So, calculate delta:
                 - deltaX = newAbsolute.x - oldAbsolute.x
                 We can add this delta to the node's position to correctly set the new position. This needs to be done because, on render, absolutePosition is
                 recalculated, so the changes absolutePosition would be revered next render.
                 */
                const dx = left + s.bounds.x + node.width / 2 + node.margin[3] - s.absolutePosition.x,
                    dy = top + s.bounds.y + node.height / 2 + node.margin[0] - s.absolutePosition.y
                let ndx = 0, ndy = 0 // node delta x - how much we want to actually move the node
                switch (resizeAnchor.current) {
                    case "bottom-right":
                        ndx = dx;
                        ndy = dy;
                        break
                    case "bottom-left": // keep y, reverse x movement
                        ndx = -dx;
                        ndy = dy;
                        break
                    case "top-right": // keep x, reverse y movement
                        ndx = dx;
                        ndy = -dy;
                        break
                    case "top-left": // reverse both
                        ndx = -dx;
                        ndy = -dy;
                        break
                    // For "center" anchor, we don't move the node (keep ndx = 0, ndy = 0)
                }
                // Update state position, to have correct position until next render
                s.absolutePosition.x += ndx
                s.absolutePosition.y += ndy
                // Update node position
                node.absolutePosition = new DOMPoint(node.absolutePosition.x + ndx, node.absolutePosition.y + ndy)
                node.position = new DOMPoint(node.position.x + ndx, node.position.y + ndy)
            }
            // Update node position on-screen
            container.style.left = s.absolutePosition.x - s.bounds.x - node.width / 2 - node.margin[3] + "px"
            container.style.top = s.absolutePosition.y - s.bounds.y - node.height / 2 - node.margin[0] + "px"
            internals.rerenderEdges()
            internals.recalculateBounds()
        }

        // Update border radius
        let borderChanged = false
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
            internals.rerenderEdges()
        }

        // Get handles
        const handleElems = container.querySelectorAll<HTMLElement>("." + NODE_HANDLE_CONTAINER_CLASS)
        // Check if handles have changed and update permissions (that we don't care if they change, no need to re-render)
        let handlesChanged = false
        if (node.handles == null || borderChanged) handlesChanged = true
        else {
            if (node.handles.length !== handleElems.length) handlesChanged = true
            else for (let i = 0; i < handleElems.length; ++i) {
                const handleElem = handleElems[i]  // handle element
                const nodeHandle = node.handles[i] // node handle
                const style = getComputedStyle(handleElem)

                const [x, y] = [resolveValue(style.left, 0) + border[3] - node.width / 2, resolveValue(style.top, 0) + border[0] - node.height / 2]

                if (handleElem.dataset.name !== nodeHandle.name || Math.abs(x - nodeHandle.x) > 2 || Math.abs(y - nodeHandle.y) > 2) handlesChanged = true
                else {
                    nodeHandle.allowCreatingEdges = stringToBoolean(handleElem.dataset.allowNewEdges)
                    nodeHandle.allowCreatingEdgesTarget = stringToBoolean(handleElem.dataset.allowEdgesTarget)
                    nodeHandle.allowGrabbing = stringToBoolean(handleElem.dataset.allowGrabbing)
                }
            }
        }
        if (!handlesChanged) return

        internals.rerenderEdges()
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
                h.style.left = x - h.offsetWidth / 2 + node.margin[3] + "px"
                h.style.top = y - h.offsetHeight / 2 + node.margin[0] + "px"
            }

            // Get handle roles and config
            const roles = h.dataset.role?.split(",")
            const allowCreatingEdges = stringToBoolean(h.dataset.allowNewEdges)
            const allowCreatingEdgesTarget = stringToBoolean(h.dataset.allowEdgesTarget)
            const allowGrabbing = stringToBoolean(h.dataset.allowGrabbing)

            // Save data and make x and y relative to the node's center
            handles.push({name, roles, x: x - node.width / 2, y: y - node.height / 2, allowCreatingEdges, allowCreatingEdgesTarget, allowGrabbing})
        }
        node.handles = handles
    }, [id, internals, node])

    // Set listeners
    useEffect(() => {
        const elem = ref.current
        const container = elem?.parentElement
        if (elem == null || container == null || node == null || internals.isStatic) return

        // Destruct to ensure callbacks don't change until onEffect cleanup runs
        const {onObjectPointerDown, onObjectPointerUp} = internals
        elem.addEventListener("pointerdown", onObjectPointerDown)
        elem.addEventListener("pointerup", onObjectPointerUp)
        const handles = container.querySelectorAll("." + NODE_HANDLE_BOX_CLASS)
        for (const handle of handles) {
            (handle as HTMLElement).addEventListener("pointerdown", onObjectPointerDown);
            (handle as HTMLElement).addEventListener("pointerup", onObjectPointerUp)
        }

        const observer = new ResizeObserver(recalculateNode)
        observer.observe(elem)
        return () => {
            elem.removeEventListener("pointerdown", onObjectPointerDown)
            elem.removeEventListener("pointerup", onObjectPointerUp)
            for (const handle of handles) {
                (handle as HTMLElement).removeEventListener("pointerdown", onObjectPointerDown);
                (handle as HTMLElement).removeEventListener("pointerup", onObjectPointerUp)
            }
            observer.disconnect()
        }
    }, [internals, node, recalculateNode])

    // Additionally, recalculateNode() should be called any time any prop changes
    useEffect(recalculateNode, [recalculateNode, id, classes, absolutePosition, grabbed, selected, resize, handles])

    // Set listeners for resizable node (if needed)
    useEffect(() => {
        if (ref.current == null || !resizable || internals.isStatic) return
        const parent = ref.current.parentElement
        if (parent == null) return

        // Extract to variable to prevent cleanup to being called with a different argument
        const onResizeStart = internals.onResizeStart.bind(null, id)

        parent.addEventListener("pointerdown", onResizeStart)
        return () => parent.removeEventListener("pointerdown", onResizeStart)
    }, [internals.onResizeStart, id, internals.isStatic, ref, resizable])

    // Z Index of this node
    const zIndex = grabbed ? Z_INDEX_GRABBED_NODE : selected ? internals.nodeZIndex + 1 : internals.nodeZIndex

    // Use dummy node if node is null to avoid having to test node for nullability for top and left calculations
    const n = node ?? dummyNode

    // Node Context value
    const nodeContext = useMemo<NodeContextValue>(() => ({id, zIndex, grabbed, handlePointerEvents}), [id, zIndex, grabbed, handlePointerEvents])

    return <ContainerDiv className={NODE_CONTAINER_CLASS} resize={internals.isStatic ? undefined : resize} resizable={resizable} style={{
        left: absolutePosition.x - bounds.x - n.width / 2 - n.margin[3],
        top: absolutePosition.y - bounds.y - n.height / 2 - n.margin[0],
    }}>
        <ContentDiv ref={ref} id={`${internals.id}-node-${id}`} className={cx(NODE_CLASS, classes)} zIndex={zIndex} pointerEvents={pointerEvents}
                    grabbed={grabbed} data-grabbed={grabbed} data-selected={selected} data-id={id} data-type={"node"}>
            {children}
        </ContentDiv>
        <NodeContext.Provider value={nodeContext}>
            {handles && (isFragment(handles) ? handles : (handles as SimpleNodeHandle[]).map(h => <NodeHandle key={h.position} {...h}/>))}
        </NodeContext.Provider>
    </ContainerDiv>
}