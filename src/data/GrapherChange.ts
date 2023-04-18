import {Node} from "./Node";
import {Edge} from "./Edge";

export type GrapherChange = NodeChanges | EdgeChanges
type NodeChanges = NodeNewChange | NodeMoveChange
type EdgeChanges = EdgeNewChange

export interface NodeChange {
    type: "node"
    /**
     * Node affected by the change
     */
    node: Node<any>
}

export interface EdgeChange {
    type: "edge"
    /**
     * Edge affected by the change
     */
    edge: Edge<any>
}

export function isNodeChange(change: GrapherChange): change is NodeChanges {
    return change.type === "node"
}

export function isEdgeChange(change: GrapherChange): change is EdgeChanges {
    return change.type === "edge"
}

// ========================== Node Changes ==========================

/**
 * Used to add a new Node to the graph.
 */
export interface NodeNewChange extends NodeChange {
    subType: "new"
}

/**
 * Normally used when the changes the node's position using a pointer. The user can move multiple nodes at once by selecting them and them
 * dragging any of them. When sent, updates the node's position.
 */
export interface NodeMoveChange extends NodeChange {
    subType: "move"
    /**
     * The node being dragged by the pointer will have the "move-pointer" event, while all others will have "selected".
     * If moved by keyboard, all moved nodes will have "selected-keyboard".
     */
    event: "move-pointer" | "selected" | "selected-keyboard"
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

// ========================== Edge Changes ==========================

/**
 * Used to add a new Edge to the graph.
 */
export interface EdgeNewChange extends EdgeChange {
    subType: "new"
}

