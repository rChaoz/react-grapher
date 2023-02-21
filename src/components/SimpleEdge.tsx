import {BaseEdge, EdgeProps} from "./BaseEdge";
import React, {memo} from "react";
import {getStraightEdgePath, getRoundEdgePath} from "../util/EdgePath";
import {warnUnknownEdgeType} from "../util/log";

export type SimpleEdgeData = {
    /**
     * - "straight" will use {@link getStraightEdgePath}
     * - "round" will use {@link getRoundEdgePath} with curve amount specified by `curve` property
     * TODO More types
     */
    type: "straight" | "round"
    /**
     * Used as a parameter for {@link getRoundEdgePath} when `type` is `curved`. Defaults to .2
     */
    curve?: number
}

/**
 * Simple edge implementation.
 */
export const SimpleEdge = memo<EdgeProps<SimpleEdgeData>>(
    function SimpleEdge(props) {
        let path: string
        switch (props.data?.type) {
            case undefined:
            case "straight":
                path = getStraightEdgePath(props.sourcePos, props.targetPos)
                break
            case "round":
                path = getRoundEdgePath(props.sourcePos, props.targetPos, props.data?.curve ?? .2)
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