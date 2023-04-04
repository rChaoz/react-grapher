import React from "react";
import {Pattern} from "./Background";

export function patternGrid(color: string | undefined, sizeMul: number): Pattern {
    if (color == null) color = "#E4E4EA"
    return [<rect key="pattern" x="0" y="0" width="100%" height="100%" fill="none" stroke={color} strokeWidth="3"/>, 20, 20 * sizeMul]
}

export function patternLines(color: string | undefined, sizeMul: number): Pattern {
    if (color == null) color = "#DFDFE8"
    return [<>
        <line x1="49" y1="51" x2="51" y2="49" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="44" y1="51" x2="51" y2="44" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="39" y1="51" x2="51" y2="39" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="34" y1="51" x2="51" y2="34" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="29" y1="51" x2="51" y2="29" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="24" y1="51" x2="51" y2="24" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="19" y1="51" x2="51" y2="19" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="14" y1="51" x2="51" y2="14" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="09" y1="51" x2="51" y2="09" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="04" y1="51" x2="51" y2="04" strokeWidth="1" fill="none" stroke={color}/>

        <line x1="-1" y1="51" x2="51" y2="-1" strokeWidth="1" fill="none" stroke={color}/>

        <line x1="-1" y1="46" x2="46" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="41" x2="41" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="36" x2="36" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="31" x2="31" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="26" x2="26" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="21" x2="21" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="16" x2="16" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="11" x2="11" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="06" x2="06" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
        <line x1="-1" y1="01" x2="01" y2="-1" strokeWidth="1" fill="none" stroke={color}/>
    </>, 50, 80 * sizeMul]
}

export function patternDots(color: string | undefined, sizeMul: number): Pattern {
    if (color == null) color = "#E8E8EF"
    return [<React.Fragment key="pattern">
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
    </React.Fragment>, 50, 50 * sizeMul]
}
