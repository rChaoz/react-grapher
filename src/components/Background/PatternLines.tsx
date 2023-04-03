import React from "react";
import {PatternProps} from "./Background";

export const PatternLines = React.memo(function PatternLines({id, color, scale, size, xShift, yShift}: PatternProps) {
    if (color == null) color = "#DFDFE8"
    const s = scale * 80 * size

    return <pattern id={id} x={xShift % s} y={yShift % s} width={s} height={s} viewBox={"0 0 50 50"} patternUnits={"userSpaceOnUse"}>
        <line x1="49" y1="51" x2="51" y2="49" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="44" y1="51" x2="51" y2="44" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="39" y1="51" x2="51" y2="39" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="34" y1="51" x2="51" y2="34" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="29" y1="51" x2="51" y2="29" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="24" y1="51" x2="51" y2="24" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="19" y1="51" x2="51" y2="19" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="14" y1="51" x2="51" y2="14" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="09" y1="51" x2="51" y2="09" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="04" y1="51" x2="51" y2="04" strokeWidth="2" fill="none" stroke={color}/>

        <line x1="-1" y1="51" x2="51" y2="-1" strokeWidth="2" fill="none" stroke={color}/>

        <line x1="-1" y1="46" x2="46" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="41" x2="41" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="36" x2="36" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="31" x2="31" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="26" x2="26" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="21" x2="21" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="16" x2="16" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="11" x2="11" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="06" x2="06" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
        <line x1="-1" y1="01" x2="01" y2="-1" strokeWidth="2" fill="none" stroke={color}/>
    </pattern>
})