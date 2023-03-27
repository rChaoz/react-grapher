import styled from "@emotion/styled";
import {NODE_CLASS, Z_INDEX_GRABBED_NODE} from "../util/constants";
import React, {useContext} from "react";
import {NodeContext} from "../context/NodeContext";
import {errorNodeContentPlacement} from "../util/log";
import {cx} from "@emotion/css";

export interface NodeContentProps {
    children: React.ReactNode
}

const ContentDiv = styled.div<{baseZIndex: number, grabbed: boolean,}>`
  box-sizing: border-box;
  z-index: ${props => props.grabbed ? Z_INDEX_GRABBED_NODE : props.baseZIndex};
  width: 100%;
  height: 100%;
`

export function NodeContent({children}: NodeContentProps) {
    const c = useContext(NodeContext)
    if (c.id === "context-error") errorNodeContentPlacement()

    return <ContentDiv ref={c.ref} id={c.id} className={cx(NODE_CLASS, c.classes)} baseZIndex={c.baseZIndex}
                       grabbed={c.grabbed} data-grabbed={c.grabbed} data-selected={c.selected}>
        {children}
    </ContentDiv>
}