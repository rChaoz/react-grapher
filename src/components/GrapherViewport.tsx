import React, {useContext, useRef} from "react";
import {Controller} from "../data/Controller";
import styled from "@emotion/styled";
import {Viewport} from "../data/Viewport";
import {CONTENT_CLASS, VIEWPORT_CLASS} from "../util/Constants";
import BoundsContext from "../context/BoundsContext";

export interface GrapherViewportProps {
    children: React.ReactNode
    controller: Controller
}

const BaseDiv = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: clip;
`

interface ContentDivProps {
    viewport: Viewport
    bounds: DOMRect
}

const ContentDiv = styled.div<ContentDivProps>`
  position: absolute;
  top: 50%;
  left: 50%;
  overflow: clip;
  outline: 10px solid gray;
  width: ${p => p.bounds.width}px;
  height: ${p => p.bounds.height}px;
  transform: translate(${p => p.bounds.x}px, ${p => p.bounds.y}px) scale(${p => p.viewport.zoom}) translate(${p => -p.viewport.centerX}px, ${p => -p.viewport.centerY}px);
`

export function GrapherViewport(props: GrapherViewportProps) {
    const ref = useRef<HTMLDivElement>(null)
    const bounds = useContext(BoundsContext)

    return <BaseDiv ref={ref} className={VIEWPORT_CLASS}>
        <ContentDiv viewport={props.controller.getViewport()} bounds={bounds} className={CONTENT_CLASS}>
            {props.children}
        </ContentDiv>
    </BaseDiv>
}