import React from "react";
import {BaseNode, NodeProps} from "./BaseNode";
import {NodeHandle, NodeHandlePropsPositioned} from "./NodeHandle";
import {NodeContent} from "./NodeContent";

export type SimpleNodeData = string | {
    label?: string
    handles?: SimpleNodeHandle[]
}

export type SimpleNodeHandle = Pick<NodeHandlePropsPositioned, "name" | "role" | "position">

export const SimpleNode = React.memo<NodeProps<SimpleNodeData>>(function SimpleNode(props) {
    const label = typeof props.data === "string" ? props.data : props.data.label
    const handles = typeof props.data === "object" ? props.data.handles?.map(h => <NodeHandle key={h.position} {...h}/>) : undefined

    return <BaseNode {...props}>
        <NodeContent>{label}</NodeContent>
        {handles}
    </BaseNode>
})