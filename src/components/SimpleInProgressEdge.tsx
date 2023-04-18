import React from "react";
import {EdgeProps} from "./SimpleEdge";
import {BaseEdge} from "./BaseEdge";
import {getStraightEdgePath, labelHelper} from "../util/EdgeHelper";

export type InProgressEdgeProps = Omit<EdgeProps<any>, "target" | "targetHandle">

/**
 * Simple in-progress edge implementation.
 */
export const SimpleInProgressEdge = React.memo<InProgressEdgeProps>(function SimpleInProgressEdge(props) {
    return <BaseEdge {...props} inProgress path={getStraightEdgePath(props.sourcePos, props.targetPos)}
                     {...labelHelper(props.sourcePos, props.targetPos, props.labelOffset, props.labelRotateWithEdge)}/>
})