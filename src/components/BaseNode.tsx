import React, {memo} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {Position} from "../data/Node";
import {NODE_CLASS, NODE_ID_PREFIX} from "../util/Constants";

export interface BaseNodeProps<T> {
    /**
     * List of classes this node should use (besides the default "react-grapher-node")
     */
    classes: Set<string>
    /**
     * Position of this node
     */
    position: Position
    /**
     * Whether this node is selected or not
     */
    selected: boolean
    /**
     * Position of the parent of this node
     */
    parentPosition?: Position
    /**
     * ID of this node
     */
    id: string
    /**
     * Contents of your node should be placed here
     */
    children: React.ReactNode
    /**
     * Data of the node
     */
    data: T
}

const BaseDiv = styled.div<Pick<BaseNodeProps<any>, "position">>`
  position: absolute;
  left: ${props => props.position.x}px;
  top: ${props => props.position.y}px;
  transform: translate(-50%, -50%);
`

export const BaseNode = memo<BaseNodeProps<any>>(function BaseNode(props) {
    return <BaseDiv id={NODE_ID_PREFIX + props.id} position={props.position} className={cx([...props.classes], NODE_CLASS)} data-selected={props.selected}>
        {props.children}
    </BaseDiv>
})