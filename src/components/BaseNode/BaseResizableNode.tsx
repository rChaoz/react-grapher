import {useBaseNode} from "./useBaseNode";
import React, {useContext, useEffect} from "react";
import {BoundsContext} from "../../context/BoundsContext";
import {NODE_CLASS, NODE_RESIZABLE_WRAPPER, Z_INDEX_GRABBED_NODE} from "../../util/constants";
import {cx} from "@emotion/css";
import {Property} from "csstype";
import {BaseNodeProps} from "./BaseNode";
import styled from "@emotion/styled";

const ResizableDiv = styled.div<{ baseZIndex: number, grabbed: boolean, resize?: Property.Resize }>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: ${props => props.grabbed ? Z_INDEX_GRABBED_NODE : props.baseZIndex};
  resize: ${props => props.resize};
  overflow: auto;
`

const ContentDiv = styled.div`
  box-sizing: border-box;
  width: 100%;
  height: 100%;
`

export interface BaseResizableNodeProps extends BaseNodeProps {
    /**
     * Direction of allowed user resizing.
     */
    resize: Property.Resize
}

export function BaseResizableNode({id, classes, absolutePosition, grabbed, selected, children, resize}: BaseResizableNodeProps) {
    const [grapherContext, ref] = useBaseNode(id)
    const bounds = useContext(BoundsContext)

    useEffect(() => {
        if (ref.current == null) return
        const parent = ref.current.parentElement
        if (parent == null) return

        const onResizeStart = grapherContext.onResizeStart

        parent.addEventListener("pointerdown", onResizeStart)
        return () => parent.removeEventListener("pointerdown", onResizeStart)
    }, [grapherContext.onResizeStart, ref])

    return <ResizableDiv className={NODE_RESIZABLE_WRAPPER} baseZIndex={grapherContext.nodeZIndex} grabbed={grabbed} resize={resize} style={{
        left: absolutePosition.x - bounds.x,
        top: absolutePosition.y - bounds.y,
    }}>
        <ContentDiv id={`${grapherContext.id}n-${id}`} ref={ref} className={cx(classes, NODE_CLASS)} data-grabbed={grabbed} data-selected={selected}>
            {children}
        </ContentDiv>
    </ResizableDiv>
}