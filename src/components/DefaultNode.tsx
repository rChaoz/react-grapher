import React, {memo} from "react";
import {BaseNode, BaseNodeProps} from "./BaseNode";

export interface NodeProps<T> extends Omit<BaseNodeProps, "children"> {
    data: T
}

export const DefaultNode = memo<NodeProps<any>>(function DefaultNode(props) {
    return <BaseNode {...props}>
        {String(props.data)}
    </BaseNode>
})