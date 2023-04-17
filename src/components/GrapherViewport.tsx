import React, {useContext, useEffect, useRef} from "react";
import {Controller} from "../data/Controller";
import styled from "@emotion/styled";
import {CONTENT_CLASS, VIEWPORT_CLASS, Z_INDEX_VIEWPORT} from "../util/constants";
import {BoundsContext} from "../context/BoundsContext";
import {createEvent, GrapherEventImpl, GrapherKeyEvent, GrapherPointerEvent, GrapherWheelEvent} from "../data/GrapherEvent";
import {changeZoom, GrabbedNode, GrapherCallbackState, LastClicked, sendEvent} from "./ReactGrapher/utils";

export interface GrapherViewportProps {
    children: React.ReactNode
    isStatic: boolean | undefined
    controller: Controller
    contentRef: React.RefObject<HTMLDivElement>
    grabbed: GrabbedNode<any>
    updateGrabbed: () => void
    lastClicked: LastClicked
    callbackState: GrapherCallbackState<any, any>
}

const BaseDiv = styled.div`
  position: relative;
  z-index: ${Z_INDEX_VIEWPORT};
  width: 100%;
  height: 100%;
  overflow: clip;
`

const ContentDiv = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
`

export function GrapherViewport({children, isStatic, controller, contentRef, grabbed, updateGrabbed, lastClicked, callbackState}: GrapherViewportProps) {
    const bounds = useContext(BoundsContext)
    const viewport = controller.getViewport()
    const s = callbackState
    const ref = useRef<HTMLDivElement>(null)

    // Add listeners
    useEffect(() => {
        const elem = ref.current
        if (elem == null || isStatic) return

        function onPointerDown(event: PointerEvent) {
            let prevented = false
            if (s.onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "down",
                    clickCount: 0,
                    pointerEvent: event,
                    target: "viewport",
                    targetID: "",
                }
                sendEvent(grapherEvent, s)
                prevented = grapherEvent.prevented
            }
            // "Grab" the viewport
            if (!prevented && grabbed.type == null) {
                // And initiate timer for long-click detection
                const timeoutID = s.config.userControls.longClickDelay < 0 || s.onEvent == null ? -1 : window.setTimeout(() => {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "long-click",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    sendEvent(grapherEvent, s)
                }, s.config.userControls.longClickDelay)
                grabbed.type = "viewport"
                grabbed.clickCount = (lastClicked.type === "viewport" && lastClicked.time + s.config.userControls.multiClickDelay > Date.now())
                    ? lastClicked.times + 1
                    : 1
                grabbed.hasMoved = false
                grabbed.startX = event.clientX
                grabbed.startY = event.clientY
                grabbed.timeoutID = timeoutID
            }
        }

        function onPointerUp(event: PointerEvent) {
            if (s.onEvent != null) {
                const grapherEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: "viewport",
                    targetID: "",
                }
                sendEvent(grapherEvent, s)
            }

            if (grabbed.type === "viewport" && !grabbed.hasMoved) {
                // Remember that the viewport was clicked
                lastClicked.type = "viewport"
                lastClicked.times = grabbed.clickCount
                lastClicked.time = Date.now()
                // Send event
                let prevented = false
                if (s.onEvent != null) {
                    const clickEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "click",
                        clickCount: grabbed.clickCount,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    sendEvent(clickEvent, s)
                    prevented = clickEvent.prevented
                }
                if (!prevented) s.selection.deselectAll()
            }
        }

        function onWheel(event: WheelEvent) {
            let prevented = false
            if (s.onEvent != null) {
                const wheelEvent: GrapherWheelEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "wheel",
                    wheelEvent: event,
                }
                sendEvent(wheelEvent, s)
                prevented = wheelEvent.prevented
            }
            if (!prevented && s.config.viewportControls.allowZooming) changeZoom(-event.deltaY / 1000, s.controller, s.config)
        }

        function onKeyDown(event: KeyboardEvent) {
            // Send graph event
            let prevented = false
            if (s.onEvent != null) {
                const keyEvent: GrapherKeyEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "key",
                    keyboardEvent: event,
                }
                sendEvent(keyEvent, s)
                prevented = keyEvent.prevented
            }
            // Deselect everything and un-grab if anything is grabbed
            if (!prevented && event.code === "Escape") {
                s.selection.deselectAll()
                if (grabbed.type != null) {
                    if (grabbed.type === "node" || grabbed.type === "edge") updateGrabbed()
                    grabbed.type = null
                }
            }
        }

        elem.addEventListener("pointerdown", onPointerDown)
        elem.addEventListener("pointerup", onPointerUp)
        elem.addEventListener("wheel", onWheel)
        elem.addEventListener("keydown", onKeyDown)

        return () => {
            elem.removeEventListener("pointerdown", onPointerDown)
            elem.removeEventListener("pointerup", onPointerUp)
            elem.removeEventListener("wheel", onWheel)
            elem.removeEventListener("keydown", onKeyDown)
        }
    }, [isStatic, grabbed, lastClicked, s, updateGrabbed])

    const dx = bounds.x - viewport.centerX, dy = bounds.y - viewport.centerY
    return <BaseDiv ref={ref} className={VIEWPORT_CLASS} tabIndex={0}>
        <ContentDiv ref={contentRef} className={CONTENT_CLASS} style={{
            width: bounds.width,
            height: bounds.height,
            transformOrigin: `${-dx}px ${-dy}px`,
            transform: `translate(${dx}px, ${dy}px) scale(${viewport.zoom})`,
        }}>
            {children}
        </ContentDiv>
    </BaseDiv>
}