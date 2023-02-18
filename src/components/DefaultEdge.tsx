import {BaseEdge, EdgeProps} from "./BaseEdge";
import React, {memo} from "react";
import {getStraightEdgePath} from "../util/EdgePath";

export const DefaultEdge = memo<EdgeProps<any>>(
    function DefaultEdge(props) {
        return <BaseEdge {...props} {...getStraightEdgePath(props.sourcePos, props.targetPos)} />
    }
)