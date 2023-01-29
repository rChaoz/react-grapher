import React, {memo, useEffect, useRef} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {Position} from "../data/Node";

export interface BaseNodeProps {
    /**
     * List of classes this node should use (besides the default "react-grapher-node")
     */
    classes: string[]
    /**
     * Position of this node
     */
    position: Position
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
}

const BaseDiv = styled.div<Pick<BaseNodeProps, "position">>`
  position: absolute;
  left: ${props => props.position.x}px;
  top: ${props => props.position.y}px;
  transform: translate(-50%, -50%);
`

export const BaseNode = memo<BaseNodeProps>(function BaseNode(props) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref.current == null) return
        // TODO Pointer listeners
    })

    return <BaseDiv ref={ref} id={"node-" + props.id} position={props.position} className={cx(props.classes, "react-grapher-node")}>
        {props.children}
    </BaseDiv>
})