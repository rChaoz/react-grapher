import React from "react";
import {PatternProps} from "./Background";

export const PatternDots = React.memo(function PatternDots({id, color, scale, size, xShift, yShift}: PatternProps) {
    if (color == null) color = "#E8E8EF"
    const s = scale * 50 * size

    return <pattern id={id} x={xShift % s} y={yShift % s} width={s} height={s} viewBox={"0 0 50 50"} patternUnits={"userSpaceOnUse"}>
        <circle cx="05" cy="05" r="2" fill={color} stroke="none"/>
        <circle cx="15" cy="05" r="2" fill={color} stroke="none"/>
        <circle cx="25" cy="05" r="2" fill={color} stroke="none"/>
        <circle cx="35" cy="05" r="2" fill={color} stroke="none"/>
        <circle cx="45" cy="05" r="2" fill={color} stroke="none"/>

        <circle cx="05" cy="15" r="2" fill={color} stroke="none"/>
        <circle cx="15" cy="15" r="2" fill={color} stroke="none"/>
        <circle cx="25" cy="15" r="2" fill={color} stroke="none"/>
        <circle cx="35" cy="15" r="2" fill={color} stroke="none"/>
        <circle cx="45" cy="15" r="2" fill={color} stroke="none"/>

        <circle cx="05" cy="25" r="2" fill={color} stroke="none"/>
        <circle cx="15" cy="25" r="2" fill={color} stroke="none"/>
        <circle cx="25" cy="25" r="2" fill={color} stroke="none"/>
        <circle cx="35" cy="25" r="2" fill={color} stroke="none"/>
        <circle cx="45" cy="25" r="2" fill={color} stroke="none"/>

        <circle cx="05" cy="35" r="2" fill={color} stroke="none"/>
        <circle cx="15" cy="35" r="2" fill={color} stroke="none"/>
        <circle cx="25" cy="35" r="2" fill={color} stroke="none"/>
        <circle cx="35" cy="35" r="2" fill={color} stroke="none"/>
        <circle cx="45" cy="35" r="2" fill={color} stroke="none"/>

        <circle cx="05" cy="45" r="2" fill={color} stroke="none"/>
        <circle cx="15" cy="45" r="2" fill={color} stroke="none"/>
        <circle cx="25" cy="45" r="2" fill={color} stroke="none"/>
        <circle cx="35" cy="45" r="2" fill={color} stroke="none"/>
        <circle cx="45" cy="45" r="2" fill={color} stroke="none"/>
    </pattern>
})