import React, {useRef} from "react";
import {Controller} from "../data/Controller";
import styled from "@emotion/styled";
import {Viewport} from "../data/Viewport";

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
  width: 100%;
  height: 100%;
  transform: scale(${viewport => viewport.scale}) translate(${viewport => viewport.translateX}px, ${viewport => viewport.translateY}px);
`

export function GrapherViewport(props: GrapherViewportProps) {
    const ref = useRef<HTMLDivElement>(null)

    // TODO Pointer events

    return <BaseDiv ref={ref} className={"react-grapher-viewport"}>
        <ContentDiv {...props.controller.getViewport()} className={"react-grapher-nodes"}>
            {props.children}
        </ContentDiv>
    </BaseDiv>
}