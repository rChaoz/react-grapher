import {Node, Position} from "./Node";

export interface GraphChange {
    type: string
}

export interface NodeChange<T> extends GraphChange {
    /**
     * Node affected by the change
     */
    node: Node<T>
}

/**
 * Used when the changes the node's position using a pointer. The user can move multiple nodes at once by selecting them and them
 * dragging any of them.
 */
export interface NodeDragChange<T> extends NodeChange<T> {
    type: "node-drag"
    /**
     * The node being dragged by the pointer will have the "move-pointer" event, while all others will receive "selected"
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
    oldPosition: Position
    /**
     * Position where this node should arrive
     */
    position: Position
}