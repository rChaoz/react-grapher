import React, {memo, useContext} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {NODE_CLASS, Z_INDEX_GRABBED_NODE} from "../util/constants";
import {GrapherContext} from "../context/GrapherContext";
import {BoundsContext} from "../context/BoundsContext";
import {Node} from "../data/Node";

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

const BaseDiv = styled.div<{baseZIndex: number, grabbed: boolean}>`
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: ${props => props.grabbed ? Z_INDEX_GRABBED_NODE : props.baseZIndex};
`

export const BaseNode = memo<BaseNodeProps>(
    function BaseNode({id, classes, absolutePosition, grabbed, selected, children}) {
        const grapherContext = useContext(GrapherContext)
        const bounds = useContext(BoundsContext)

        return <BaseDiv id={`${grapherContext.id}n-${id}`} baseZIndex={grapherContext.nodeZIndex} grabbed={grabbed}
                        className={cx(classes, NODE_CLASS)} data-grabbed={grabbed} data-selected={selected} style={{
            left: absolutePosition.x - bounds.x,
            top: absolutePosition.y - bounds.y,
        }}>
            {children}
        </BaseDiv>
    }
)