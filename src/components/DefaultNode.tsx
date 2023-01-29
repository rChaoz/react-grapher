import React, {memo} from "react";
import {BaseNode, BaseNodeProps} from "./BaseNode";

export interface NodeProps<T> extends Omit<BaseNodeProps, "children" | "classes"> {
    classes: Set<string>
    data: T
}

export const DefaultNode = memo<NodeProps<any>>(function DefaultNode(props) {
    return <BaseNode classes={[...props.classes]} position={props.position} id={props.id}>
        {String(props.data)}
    </BaseNode>
})