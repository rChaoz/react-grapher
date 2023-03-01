import React, {memo} from "react";
import {BaseNode, NodeProps, BaseResizableNode} from "./BaseNode";

export const SimpleNode = memo<NodeProps<any>>(function SimpleNode(props) {
    if (props.resize === "none" || props.resize === "initial") return <BaseNode {...props}>{String(props.data)}</BaseNode>
    else return <BaseResizableNode {...props}>{String(props.data)}</BaseResizableNode>
})