import {Node} from "./Node";

export type GrapherChange = NodeMoveChange

export interface NodeChange {
    /**
     * Node affected by the change
     */
    node: Node<any>
}

export function isNodeChange(change: GrapherChange): change is NodeMoveChange {
    return change.type.startsWith("node")
}

export function isEdgeChange(change: GrapherChange): boolean { // TODO is NoveChange
    return change.type.startsWith("edge")
}

/**
 * Used when the changes the node's position using a pointer. The user can move multiple nodes at once by selecting them and them
 * dragging any of them.
 */
export interface NodeMoveChange extends NodeChange {
    type: "node-move"
    /**
     * The node being dragged by the pointer will have the "move-pointer" event, while all others will have "selected".
     * If moved by keyboard, all moved nodes will have "selected".
     */
    event: "move-pointer" | "move-keyboard" | "selected"
    /**
     * True if the user selected nodes and then started dragging them. False if the user started
     * dragging a node without selecting it first (simply dragging does not cause selection).
     */
    selected: boolean
    /**
     * Old (current) position
     */
    oldPosition: DOMPoint
    /**
     * Position where this node should arrive
     */
    position: DOMPoint
}