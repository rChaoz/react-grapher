import React, {memo, useContext} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {NODE_CLASS, Z_INDEX_GRABBED_NODE} from "../util/constants";
import {GrapherContext} from "../context/GrapherContext";
import {BoundsContext} from "../context/BoundsContext";

export interface BaseNodeProps {
    /**
     * ID of this node
     */
    id: string
    /**
     * List of classes this node should use (besides the default "react-grapher-node")
     */
    classes: string[]
    /**
     * Absolute position of this node
     */
    absolutePosition: DOMPoint
    /**
     * Whether this node is selected or not
     */
    selected: boolean
    /**
     * Whether this node is grabbed (being moved) or not
     */
    grabbed: boolean
    /**
     * Contents of your node should be placed here
     */
    children: React.ReactNode
}

export interface NodeProps<T> extends Omit<BaseNodeProps, "children"> {
    data: T
}

const BaseDiv = styled.div<{baseZIndex: number, grabbed: boolean}>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: ${props => props.grabbed ? Z_INDEX_GRABBED_NODE : props.baseZIndex};
`

export const BaseNode = memo<BaseNodeProps>(
    function BaseNode({id, absolutePosition, classes, selected, grabbed, children}) {
        const grapherContext = useContext(GrapherContext)
        const bounds = useContext(BoundsContext)

        return <BaseDiv id={`${grapherContext.id}n-${id}`} baseZIndex={grapherContext.nodeZIndex} grabbed={grabbed}
                        className={cx([...classes], NODE_CLASS)} data-selected={selected} data-grabbed={grabbed} style={{
            left: absolutePosition.x - bounds.x,
            top: absolutePosition.y - bounds.y,
        }}>
            {children}
        </BaseDiv>
    }
)