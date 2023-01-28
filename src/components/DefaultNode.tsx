import React, {memo} from "react";
import {BaseNode, BaseNodeProps} from "./BaseNode";

export interface NodeProps<T> extends Omit<BaseNodeProps, "children"> {
    data: T
}

export const DefaultNode = memo<NodeProps<any>>(props => {
    return <BaseNode classes={[...props.classes]} position={props.position} id={props.id}>
        {String(props.data)}
    </BaseNode>
})