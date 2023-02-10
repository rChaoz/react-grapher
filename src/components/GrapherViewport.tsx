import React, {useContext, useRef} from "react";
import {Controller} from "../data/Controller";
import styled from "@emotion/styled";
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

const ContentDiv = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  outline: 5px black solid;
`

export function GrapherViewport(props: GrapherViewportProps) {
    const ref = useRef<HTMLDivElement>(null)
    const bounds = useContext(BoundsContext)
    const viewport = props.controller.getViewport()

    return <BaseDiv ref={ref} className={VIEWPORT_CLASS}>
        <ContentDiv className={CONTENT_CLASS} style={{
            width: bounds.width,
            height: bounds.height,
            transform: `translate(${bounds.x}px, ${bounds.y}px) scale(${viewport.zoom}) translate(${-viewport.centerX}px, ${-viewport.centerY}px)`
        }}>
            {props.children}
        </ContentDiv>
    </BaseDiv>
}