import React from "react";
import {Z_INDEX_NODE} from "../util/constants";

export interface NodeContextValue {
    id: string
    ref: React.RefObject<HTMLDivElement>
    baseZIndex: number
    classes: string[]
    grabbed: boolean
    selected: boolean
}

/**
 * Used to pass information from the BaseNode to the NodeContent
 */
export const NodeContext = React.createContext<NodeContextValue>({
    id: undefined as any,
    ref: React.createRef(),
    baseZIndex: Z_INDEX_NODE,
    classes: [],
    grabbed: false,
    selected: false,
})