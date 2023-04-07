import React, {useCallback, useContext, useEffect, useMemo, useRef} from "react";
import styled from "@emotion/styled";
import {GrapherContext} from "../../context/GrapherContext";
import {errorGrapherContext, warnInvalidPropValue} from "../../util/log";
import {BACKGROUND_CLASS, Z_INDEX_BACKGROUND} from "../../util/constants";
import {DataType} from "csstype";
import {cx} from "@emotion/css";
import {patternDots, patternGrid, patternLines} from "./patterns";
import {useCallbackState} from "../../hooks/useCallbackState";

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
     * Background pattern. Defaults to "grid".
     */
    pattern?: "grid" | "lines" | "dots"
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
    /**
     * Stroke width multiplier (pattern thickness). Defaults to 1
     */
    strokeWidth?: number
    /**
     * Pattern angle, in degrees.
     */
    angle?: number
    /**
     * If {@link angle} prop does not provide enough customisation for you, you can use this to directly set the `patternTransform` property on the
     * SVG `<pattern>` element.
     */
    patternTransform?: string
}

/**
 * <pattern> contents, viewBox size and base size (to be used for width)
 */
export type Pattern = [JSX.Element, number, number]

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

// noinspection JSUnusedGlobalSymbols
const defaultContext: any = {
    id: "context-error",
    controller: {
        defaultViewport: {centerX: 0, centerY: 0, zoom: 1},
        getViewport() {
            return this.defaultViewport
        },
    }
}

// TODO More background patterns
export function Background({id, className, pattern, color, size, strokeWidth, angle, patternTransform}: BackgroundProps) {
    let grapherContext = useContext(GrapherContext)
    if (grapherContext == null) {
        errorGrapherContext("Background")
        grapherContext = defaultContext
    }

    if (id == null) id = grapherContext.id + "-background"
    const pID = id + "-pattern"

    // Get pattern element
    const [pElem, pVBSize, pSize] = useMemo(() => {
        const sizeMul = typeof size === "number" ? size : patternSizeMap[size ?? "md"]
        const strokeWidthMul = strokeWidth ?? 1
        switch (pattern) {
            case null:
            case undefined:
            case "grid":
                return patternGrid(color, strokeWidthMul, sizeMul)
            case "lines":
                return patternLines(color, strokeWidthMul, sizeMul)
            case "dots":
                return patternDots(color, strokeWidthMul, sizeMul)
            default:
                warnInvalidPropValue("Background", "pattern", pattern, ["grid", "lines", "dots"]);
                return patternGrid(color, strokeWidthMul, sizeMul)
        }
    }, [pattern, color, strokeWidth, size])


    const patternRef = useRef<SVGPatternElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // Set pattern transform
    const viewport = grapherContext.controller.getViewport()

    const s = useCallbackState({viewport, angle, patternTransform})
    const updatePatternTransform = useCallback(() => {
        if (patternRef.current == null || svgRef.current == null) return
        const x = -s.viewport.centerX * s.viewport.zoom + svgRef.current.clientWidth / 2, y = -s.viewport.centerY * s.viewport.zoom + svgRef.current.clientHeight / 2
        patternRef.current.setAttribute("patternTransform", `translate(${x} ${y})` + (s.patternTransform || (s.angle ? ` rotate(${s.angle})` : "")))
    }, [])

    // Update it on every render
    useEffect(updatePatternTransform)

    // And on resize
    useEffect(() => {
        if (svgRef.current == null) return
        const obs = new ResizeObserver(updatePatternTransform)
        obs.observe(svgRef.current)

        return () => obs.disconnect()
    }, [updatePatternTransform])

    return <BackgroundDiv id={id} className={cx(BACKGROUND_CLASS, className)}>
        <svg ref={svgRef} width={"100%"} height={"100%"}>
            <defs>
                <pattern ref={patternRef} id={pID} width={pSize * viewport.zoom} height={pSize * viewport.zoom}
                         viewBox={`0 0 ${pVBSize} ${pVBSize}`} patternUnits={"userSpaceOnUse"}>
                    {pElem}
                </pattern>
            </defs>
            <rect x={0} y={0} width={"100%"} height={"100%"} stroke={"none"} fill={`url(#${pID})`}/>
        </svg>
    </BackgroundDiv>
}