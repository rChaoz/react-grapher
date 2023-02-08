import React, {memo, useContext} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {NODE_CLASS} from "../util/Constants";
import IDContext from "../context/IDContext";
import BoundsContext from "../context/BoundsContext";

export interface BaseNodeProps {
    /**
     * ID of this node
     */
    id: string
    /**
     * List of classes this node should use (besides the default "react-grapher-node")
     */
    classes: Set<string>
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

const BaseDiv = styled.div<Pick<BaseNodeProps, "absolutePosition" | "selected" | "grabbed"> & { bounds: DOMRect }>`
  position: absolute;
  z-index: ${props => props.grabbed ? "1" : "auto"};
  left: ${props => props.absolutePosition.x - props.bounds.x}px;
  top: ${props => props.absolutePosition.y - props.bounds.y}px;
  transform: translate(-50%, -50%);
`

export const BaseNode = memo<BaseNodeProps>(
    function BaseNode({id, absolutePosition, classes, selected, grabbed, children}) {
        const baseID = useContext(IDContext)
        const bounds = useContext(BoundsContext)

        return <BaseDiv id={`${baseID}-${id}`} absolutePosition={absolutePosition} className={cx([...classes], NODE_CLASS)}
                        selected={selected} data-selected={selected} bounds={bounds} grabbed={grabbed} data-grabbed={grabbed}>
            {children}
        </BaseDiv>
    }
)