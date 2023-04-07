import React from "react";
import {Z_INDEX_NODE} from "../util/constants";

export interface NodeContextValue {
    id: string
    baseZIndex: number
    grabbed: boolean
}

/**
 * Used to pass information from the BaseNode to the NodeContent
 */
export const NodeContext = React.createContext<NodeContextValue>({
    id: undefined as any,
    baseZIndex: Z_INDEX_NODE,
    grabbed: false,
})