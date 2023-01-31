import React, {useRef} from "react";
import {Controller} from "../data/Controller";
import styled from "@emotion/styled";
import {Viewport} from "../data/Viewport";
import {NODES_CONTAINER_CLASS, VIEWPORT_CLASS} from "../util/Constants";

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

const ContentDiv = styled.div<Viewport>`
  position: absolute;
  overflow: visible;
  white-space: nowrap;
  width: 100%;
  height: 100%;
  transform: scale(${viewport => viewport.zoom}) translate(${viewport => -viewport.centerX}px, ${viewport => -viewport.centerY}px) translate(50%, 50%);
`

export function GrapherViewport(props: GrapherViewportProps) {
    const ref = useRef<HTMLDivElement>(null)

    // TODO Pointer events

    return <BaseDiv ref={ref} className={VIEWPORT_CLASS}>
        <ContentDiv {...props.controller.getViewport()} className={NODES_CONTAINER_CLASS}>
            {props.children}
        </ContentDiv>
    </BaseDiv>
}