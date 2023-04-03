import React, {useContext} from "react";
import {Controller} from "../data/Controller";
import styled from "@emotion/styled";
import {CONTENT_CLASS, VIEWPORT_CLASS, Z_INDEX_VIEWPORT} from "../util/constants";
import {BoundsContext} from "../context/BoundsContext";

export interface GrapherViewportProps {
    children: React.ReactNode
    controller: Controller
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

export function GrapherViewport(props: GrapherViewportProps) {
    const bounds = useContext(BoundsContext)
    const viewport = props.controller.getViewport()
    const dx = bounds.x - viewport.centerX, dy = bounds.y - viewport.centerY

    return <BaseDiv className={VIEWPORT_CLASS} tabIndex={0}>
        <ContentDiv className={CONTENT_CLASS} style={{
            width: bounds.width,
            height: bounds.height,
            transformOrigin: `${-dx}px ${-dy}px`,
            transform: `translate(${dx}px, ${dy}px) scale(${viewport.zoom})`,
        }}>
            {props.children}
        </ContentDiv>
    </BaseDiv>
}