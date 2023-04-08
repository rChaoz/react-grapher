import {BaseEdge, EdgeProps} from "./BaseEdge";
import React from "react";
import {labelHelper, getRoundEdgePath, getStraightEdgePath} from "../util/EdgeHelper";
import {warnInvalidPropValue} from "../util/log";

export type SimpleEdgeData = {
    /**
     * - "straight" will use {@link getStraightEdgePath}
     * - "round" will use {@link getRoundEdgePath} with curve amount specified by `curve` property
     * TODO More types
     */
    type: "straight" | "round"
    /**
     * Used as a parameter for {@link getRoundEdgePath} when `type` is `curved`. Defaults to '.2' if {@link absoluteCurve} is false/undefined, otherwise 25.
     */
    curve?: number
    /**
     * If true, edge will extend an absolute amount of pixels perpendicular to its direction, set by the {@link curve} property. Defaults to false
     * @see getRoundEdgePath
     */
    absoluteCurve?: boolean
}

/**
 * Simple edge implementation.
 */
export const SimpleEdge = React.memo<EdgeProps<SimpleEdgeData>>(
    function SimpleEdge(props) {
        let path: string
        // Get edge path
        switch (props.data?.type) {
            case null:
            case undefined:
            case "straight":
                path = getStraightEdgePath(props.sourcePos, props.targetPos)
                break
            case "round":
                path = getRoundEdgePath(props.sourcePos, props.targetPos, props.labelShift,
                    props.data.curve ?? (props.data.absoluteCurve ? 25 : .2), props.data.absoluteCurve)
                break
            default:
                path = getStraightEdgePath(props.sourcePos, props.targetPos)
                warnInvalidPropValue("SimpleEdge", "type", props.data?.type, ["straight", "round"])
                break
        }

        return <BaseEdge {...props} path={path} {...labelHelper(props.sourcePos, props.targetPos, props.labelShift, props.labelRotationFollowEdge)}/>
    }
)