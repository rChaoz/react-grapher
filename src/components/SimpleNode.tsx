import React, {memo} from "react";
import {BaseNode, NodeProps} from "./BaseNode";

export const SimpleNode = memo<NodeProps<any>>(function SimpleNode(props) {
    return <BaseNode {...props}>
        {String(props.data)}
    </BaseNode>
})