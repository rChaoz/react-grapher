import React, {useContext} from "react";
import styled from "@emotion/styled";
import {GrapherContext} from "../../context/GrapherContext";
import {errorGrapherContext} from "../../util/log";
import {BACKGROUND_CLASS, Z_INDEX_BACKGROUND} from "../../util/constants";
import {PatternLines} from "./PatternLines";
import {DataType} from "csstype";
import {cx} from "@emotion/css";
import {PatternDots} from "./PatternDots";

// eslint-disable-next-line @typescript-eslint/ban-types
export type SvgPaint = "none" | "context-fill" | "context-stroke" | DataType.NamedColor | string & {}

export interface BackgroundProps {
    /**
     * If not provided, the ReactGrapher's ID with "-background" appended will be used.
     */
    id?: string
    /**
     * Custom CSS classes to be applied.
     */
    className?: string
    /**
     * Background pattern. Defaults to "dots".
     */
    pattern?: "lines" | "dots"
    /**
     * Color used for background {@link pattern}. If not provided, the chosen pattern's default will be used.
     */
    color?: SvgPaint
    /**
     * Pattern size, as a predefined or a number. Predefined values:
     * - xs = .4
     * - sm = .6
     * - md = 1
     * - lg = 1.7
     * - xl = 2.5
     *
     * Defaults to 'md' (medium).
     */
    size?: "xs" | "sm" | "md" | "lg" | "xl" | number
}

export interface PatternProps {
    id: string
    color: SvgPaint | undefined
    scale: number
    size: number
    xShift: number
    yShift: number
}

const BackgroundDiv = styled.div`
  position: absolute;
  z-index: ${Z_INDEX_BACKGROUND};
  inset: 0;
`

const patternSizeMap = {
    "xs": .4,
    "sm": .6,
    "md": 1,
    "lg": 1.7,
    "xl": 2.5,
}

// TODO More background patterns
export function Background({id, className, pattern, color, size}: BackgroundProps) {
    const grapherContext = useContext(GrapherContext)
    if (grapherContext == null) {
        errorGrapherContext("Background")
        return <BackgroundDiv id={id} className={className}/>
    }

    if (id == null) id = grapherContext.id + "-background"
    const pID = id + "-pattern"

    // Create pattern element
    const viewport = grapherContext.controller.getViewport()
    let p
    const pSize = typeof size === "number" ? size : patternSizeMap[size ?? "md"]
    const xShift = -viewport.centerX * viewport.zoom, yShift = -viewport.centerY * viewport.zoom
    switch (pattern ?? "dots") {
        case "lines":
            p = <PatternLines id={pID} color={color} scale={viewport.zoom} size={pSize} xShift={xShift} yShift={yShift}/>
            break
        case "dots":
            p = <PatternDots id={pID} color={color} scale={viewport.zoom} size={pSize} xShift={xShift} yShift={yShift}/>
            break
    }

    return <BackgroundDiv id={id} className={cx(BACKGROUND_CLASS, className)}>
        <svg width={"100%"} height={"100%"}>
            <defs>{p}</defs>
            <rect x={0} y={0} width={"100%"} height={"100%"} stroke={"none"} fill={`url(#${pID})`}/>
        </svg>
    </BackgroundDiv>
}