import React from "react";

/**
 * SVG <pattern> element contents, viewBox width, height and base size multiplier (to be multiplied with view box sizes to get real width/height)
 */
export type Pattern = [JSX.Element, number, number, number]

export function patternGrid(color: string | undefined, strokeWidthMul: number): Pattern {
    if (color == null) color = "#E4E4EA"
    return [<rect key="pattern" x="0" y="0" width="100%" height="100%" fill="none" stroke={color} strokeWidth={3 * strokeWidthMul}/>, 20, 20, 1]
}

export function patternLines(color: string | undefined, strokeWidthMul: number): Pattern {
    if (color == null) color = "#DFDFE8"
    return [<>
        <line x1="49" y1="51" x2="51" y2="49" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="44" y1="51" x2="51" y2="44" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="39" y1="51" x2="51" y2="39" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="34" y1="51" x2="51" y2="34" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="29" y1="51" x2="51" y2="29" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="24" y1="51" x2="51" y2="24" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="19" y1="51" x2="51" y2="19" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="14" y1="51" x2="51" y2="14" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="09" y1="51" x2="51" y2="09" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="04" y1="51" x2="51" y2="04" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>

        <line x1="-1" y1="51" x2="51" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>

        <line x1="-1" y1="46" x2="46" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="41" x2="41" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="36" x2="36" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="31" x2="31" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="26" x2="26" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="21" x2="21" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="16" x2="16" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="11" x2="11" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="06" x2="06" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
        <line x1="-1" y1="01" x2="01" y2="-1" strokeWidth={strokeWidthMul} fill="none" stroke={color}/>
    </>, 50, 50, 1.6]
}

export function patternDots(color: string | undefined, strokeWidthMul: number): Pattern {
    if (color == null) color = "#E8E8EF"
    return [<React.Fragment key="pattern">
        <circle cx="05" cy="05" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="15" cy="05" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="25" cy="05" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="35" cy="05" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="45" cy="05" r={strokeWidthMul * 2} fill={color} stroke="none"/>

        <circle cx="05" cy="15" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="15" cy="15" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="25" cy="15" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="35" cy="15" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="45" cy="15" r={strokeWidthMul * 2} fill={color} stroke="none"/>

        <circle cx="05" cy="25" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="15" cy="25" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="25" cy="25" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="35" cy="25" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="45" cy="25" r={strokeWidthMul * 2} fill={color} stroke="none"/>

        <circle cx="05" cy="35" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="15" cy="35" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="25" cy="35" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="35" cy="35" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="45" cy="35" r={strokeWidthMul * 2} fill={color} stroke="none"/>

        <circle cx="05" cy="45" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="15" cy="45" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="25" cy="45" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="35" cy="45" r={strokeWidthMul * 2} fill={color} stroke="none"/>
        <circle cx="45" cy="45" r={strokeWidthMul * 2} fill={color} stroke="none"/>
    </React.Fragment>, 50, 50, 1]
}

export function patternHexagons(color: string | undefined, strokeWidthMul: number): Pattern {
    if (color == null) color = "#E4E4EA"
    return [<React.Fragment key="pattern">,
        <line x1="0" y1="25" x2="27" y2="25" strokeWidth={strokeWidthMul * 2} stroke={color}/>
        <path d="M72 0 l-31 0 l-14 25 l14 25 l31 0 l14 -25 z" strokeWidth={strokeWidthMul * 2} stroke={color} fill="none"/>
        <line x1="86" y1="25" x2="87" y2="25" strokeWidth={strokeWidthMul * 2} stroke={color}/>
    </React.Fragment>, 87, 50, .6]
}

export function patternTriangles(color: string | undefined): Pattern {
    if (color == null) color = "#ECECF0"
    return [<React.Fragment key="pattern">,
        <path d="M25 0 l-25 43 l50 0 z" stroke="none" fill={color}/>
        <path d="M0 43 l25 43 l-25 0 z" stroke="none" fill={color}/>
        <path d="M50 43 l-25 43 l25 0 z" stroke="none" fill={color}/>
    </React.Fragment>, 50, 86, .6]
}