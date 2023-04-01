import React from "react";
import {NodeImpl} from "../data/Node"
import {EdgeImpl} from "../data/Edge";
import {Z_INDEX_NODE} from "../util/constants";
import {criticalInternalContext} from "../util/log";

export interface InternalContextValue {
    id: string
    nodeZIndex: number
    isStatic?: boolean

    // When these properties are changed, the context itself doesn't change (no re-render):
    getNode(id: string): NodeImpl<any> | undefined

    getEdge(id: string): EdgeImpl<any> | undefined

    rerenderEdges(): void

    recalculateBounds(): void

    onResizeStart(): void

    // Object click events
    onObjectPointerDown(event: PointerEvent): void

    onObjectPointerUp(event: PointerEvent): void
}

/**
 * Context for the ReactGrapher's ID. This is used because, if there are 2 different ReactGraphers in one page, 2 nodes might have the same DOM ID,
 * which is an issue. To fix this, each Node (or any other element that needs a DOM ID) will have its ID prepended with the owning ReactGrapher ID, which cannot
 * be empty (if not provided, a random ID is used for React 18 or later, otherwise, "react-grapher" is used, which might cause duplicated DOM ID issues).
 */
export const InternalContext = React.createContext<InternalContextValue>(
    {
        id: undefined as any, nodeZIndex: Z_INDEX_NODE, isStatic: true,
        getNode() {
            criticalInternalContext()
            return undefined
        },
        getEdge() {
            criticalInternalContext()
            return undefined
        },
        rerenderEdges: criticalInternalContext,
        recalculateBounds: criticalInternalContext,
        onResizeStart: criticalInternalContext,
        onObjectPointerDown: criticalInternalContext,
        onObjectPointerUp: criticalInternalContext,
    }
)
