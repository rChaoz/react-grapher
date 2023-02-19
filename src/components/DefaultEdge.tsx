import {BaseEdge, EdgeProps} from "./BaseEdge";
import React, {memo} from "react";
import {getStraightEdgePath, getCurvedEdgePath} from "../util/EdgePath";
import {warnUnknownEdgeType} from "../util/log";


export type DefaultEdgeData = {
    /**
     * - "straight" will use {@link getStraightEdgePath}
     * - "curved" will use {@link getCurvedEdgePath} with curve amount specified by `curve` property
     * TODO More types
     */
    type: "straight" | "curved"
    /**
     * Used as a parameter for {@link getCurvedEdgePath} when `type` is `curved`. Defaults to .2
     */
    curve?: number
}

/**
 * Simple edge implementation.
 */
export const DefaultEdge = memo<EdgeProps<DefaultEdgeData>>(
    function DefaultEdge(props) {
        let path: string
        console.log(props.data)
        switch (props.data?.type) {
            case undefined:
            case "straight":
                path = getStraightEdgePath(props.sourcePos, props.targetPos)
                break
            case "curved":
                path = getCurvedEdgePath(props.sourcePos, props.targetPos, props.data?.curve ?? .2)
                break
            default:
                path = getStraightEdgePath(props.sourcePos, props.targetPos)
                // Typescript cannot fathom that the undefined case is already dealt with, above, with "case undefined:"
                // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                warnUnknownEdgeType(props.data?.type!)
                break
        }
        return <BaseEdge {...props} path={path} />
    }
)