import {Node, Position} from "./Node";

export interface GraphChange {
    type: string
}

export interface NodeDragChange<T> {
    type: "node-manipulation"
    nodes: Node<T>[]
    /**
     * Used when the changes the node's position using a pointer. The user can move multiple nodes at once by selecting them and them
     * dragging any of them. The node being dragged by the pointer will receive the "move-keyboard" change, while all others will receive
     *
     */
    event: "move-pointer" | "move-keyboard" | "selected"
    /**
     * True if the user selected nodes and then started dragging them. False if the user started
     * dragging a node without selecting it first (simply dragging does not cause selection).
     */
    selected: boolean
    oldPosition: Position
    position: Position

}