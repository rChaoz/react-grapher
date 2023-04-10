import React from "react";
import {BaseNode, BaseNodeProps, SimpleNodeHandle} from "./BaseNode";
import {Node} from "../data/Node";

export interface NodeProps<T> extends Omit<BaseNodeProps, "children"> {
    /**
     * Custom node data
     */
    data: T
    /**
     * Parent of this node, if it exists
     */
    parent?: Node<unknown> | null
    /**
     * Position relative to parent, if parent is not null, or same as {@link absolutePosition} if it is null
     */
    position: DOMPoint
    /**
     * Spacing between this node and the edges that connect to it. This space is *automatically taken into consideration* for the calculation of edges.
     */
    edgeMargin: number
}

export type SimpleNodeData = string | {
    label?: string
    handles?: SimpleNodeHandle[]
}

export const SimpleNode = React.memo<NodeProps<SimpleNodeData>>(function SimpleNode(props) {
    return <BaseNode {...props} handles={typeof props.data === "object" ? props.data.handles : undefined}>
        {typeof props.data === "string" ? props.data : String(props.data?.label)}
    </BaseNode>
})