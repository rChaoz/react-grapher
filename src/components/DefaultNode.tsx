import React, {memo} from "react";
import {BaseNode, BaseNodeProps} from "./BaseNode";

export type NodeProps<T> = Omit<BaseNodeProps<T>, "children">

export const DefaultNode = memo<NodeProps<any>>(function DefaultNode(props) {
    return <BaseNode {...props}>
        {String(props.data)}
    </BaseNode>
})