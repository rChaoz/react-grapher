import React from "react";
import {PatternProps} from "./Background";

export const PatternGrid = React.memo(function PatternDots({id, color, scale, size, xShift, yShift}: PatternProps) {
    if (color == null) color = "#E4E4EA"
    const s = scale * 20 * size

    return <pattern id={id} x={xShift % s} y={yShift % s} width={s} height={s} viewBox={"0 0 20 20"} patternUnits={"userSpaceOnUse"}>
        <rect x="0" y="0" width="100%" height="100%" fill="none" stroke={color} strokeWidth="3"/>
    </pattern>
})