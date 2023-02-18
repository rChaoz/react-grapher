import React, {memo} from "react";
import {BaseNode, NodeProps} from "./BaseNode";

export const DefaultNode = memo<NodeProps<any>>(function DefaultNode(props) {
    return <BaseNode {...props}>
        {String(props.data)}
    </BaseNode>
})