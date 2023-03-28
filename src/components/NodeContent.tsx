import styled from "@emotion/styled";
import {NODE_CLASS, Z_INDEX_GRABBED_NODE} from "../util/constants";
import React, {useContext} from "react";
import {NodeContext} from "../context/NodeContext";
import {errorComponentOutsideContext} from "../util/log";
import {cx} from "@emotion/css";

export interface NodeContentProps {
    children: React.ReactNode
}

const ContentDiv = styled.div<{baseZIndex: number, grabbed: boolean,}>`
  position: relative;
  z-index: ${props => props.grabbed ? Z_INDEX_GRABBED_NODE : props.baseZIndex};
`

export function NodeContent({children}: NodeContentProps) {
    const c = useContext(NodeContext)
    if (c.id === "context-error") errorComponentOutsideContext("NodeContent", "BaseNode")

    return <ContentDiv ref={c.ref} id={c.id} className={cx(NODE_CLASS, c.classes)} baseZIndex={c.baseZIndex}
                       grabbed={c.grabbed} data-grabbed={c.grabbed} data-selected={c.selected}>
        {children}
    </ContentDiv>
}