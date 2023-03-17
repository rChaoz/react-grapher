import React from "react";
import {BaseNode, NodeProps, BaseResizableNode} from "./BaseNode";
import {NodeHandle, NodeHandlePropsPositioned} from "./NodeHandle";

export type SimpleNodeData = string | {
    label?: string
    handles?: SimpleNodeHandle[]
}

export type SimpleNodeHandle = Pick<NodeHandlePropsPositioned, "name" | "role" | "position">

export const SimpleNode = React.memo<NodeProps<SimpleNodeData>>(function SimpleNode(props) {
    const label = typeof props.data === "string" ? props.data : props.data.label
    const handles = typeof props.data === "object" ? props.data.handles?.map(h => <NodeHandle key={h.position} {...h}/>) : undefined
    const content = <>{label}{handles}</>

    if (props.resize === "none" || props.resize === "initial") return <BaseNode {...props}>{content}</BaseNode>
    else return <BaseResizableNode {...props}>{content}</BaseResizableNode>
})