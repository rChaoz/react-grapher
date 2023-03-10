import React from "react";
import {NodeImpl} from "../data/Node"
import {EdgeImpl} from "../data/Edge";
import {Z_INDEX_NODE} from "../util/constants";

export interface GrapherContextValue {
    id: string
    nodeZIndex: number
    static?: boolean

    // When these properties are changed, the context itself doesn't change (no re-render):
    getNode(id: string): NodeImpl<any> | undefined

    getEdge(id: string): EdgeImpl<any> | undefined

    rerenderEdges(): void

    recalculateBounds(): void

    onResizeStart(): void
}

/**
 * Context for the ReactGrapher's ID. This is used because, if there are 2 different ReactGraphers in one page, 2 nodes might have the same DOM ID,
 * which is an issue. To fix this, each Node (or any other element that needs a DOM ID) will have its ID prepended with the owning ReactGrapher ID, which cannot
 * be empty (if not provided, a random ID is used for React 18 or later, otherwise, "react-grapher" is used, which might cause duplicated DOM ID issues).
 */
export const GrapherContext = React.createContext<GrapherContextValue>(
    {id: "react-grapher", nodeZIndex: Z_INDEX_NODE, static: false,
        getNode: null as any, getEdge: null as any, rerenderEdges: null as any, recalculateBounds: null as any, onResizeStart: null as any}
)
