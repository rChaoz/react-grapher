import React, {memo, useContext} from "react";
import styled from "@emotion/styled";
import {cx} from "@emotion/css";
import {NODE_CLASS} from "../util/constants";
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

const BaseDiv = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
`

export const BaseNode = memo<BaseNodeProps>(
    function BaseNode({id, absolutePosition, classes, selected, grabbed, children}) {
        const baseID = useContext(IDContext)
        const bounds = useContext(BoundsContext)

        return <BaseDiv id={`${baseID}n-${id}`} className={cx([...classes], NODE_CLASS)} data-selected={selected} data-grabbed={grabbed} style={{
            zIndex: grabbed ? 1 : "auto",
            left: absolutePosition.x - bounds.x,
            top: absolutePosition.y - bounds.y,
        }}>
            {children}
        </BaseDiv>
    }
)