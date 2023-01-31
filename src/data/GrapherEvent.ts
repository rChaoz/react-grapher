import {Node} from "./Node"

export type GrapherEvent = NodePointerEvent | ViewportPointerEvent | ViewportWheelEvent | UpEvent | KeyEvent

export interface BaseGrapherEvent {
    /**
     * Similar to DOM's Event.preventDefault(), this function will ensure that the default action for the specified event will not occur. For example,
     * when clicked, a Node or Edge will be selected. Or, on a  'down' event, a movable node will be "grabbed" (that means, from now on, moving the pointer without
     * releasing the hold will move the node).
     */
    preventDefault(): void
}

export interface NodeEvent extends BaseGrapherEvent {
    /**
     * Node on which the event occurred
     */
    target: Node<any>
}

export interface NodePointerEvent extends NodeEvent {
    type: "node"
    /**
     * A down event occurs triggers when the node receives a 'pointerdown' event. By default, the node is "grabbed".
     *
     * A move event occurs at the document level when the pointer is moved while the node is "grabbed". By default, a NodeMoveChange<T> is emitted for all the nodes.
     *
     * An up event occurs when a pointer button is released inside the node.
     *
     * A click event occurs if down and up events occur on the same node and no node move events occurred in-between. By default, the node is selected.
     */
    action: "down" | "move" | "up" | "click"
    /**
     * Relevant for "up" events: whether the node that received the 'pointerup' event is also the one that was "grabbed" (received 'pointerdown') earlier.
     */
    grabbed: boolean
    /**
     * The PointerEvent that caused this event. Note that for the "click" event, this is actually a "pointerup" event.
     */
    pointerEvent: PointerEvent
}

export interface ViewportPointerEvent extends BaseGrapherEvent {
    type: "viewport"
    /**
     * A down event occurs triggers when the viewport receives a 'pointerdown' event. By default, the viewport is "grabbed", if no node was grabbed.
     *
     * A move event occurs at the document level when the pointer is moved while the viewport if "grabbed". By default, the viewport is updated (moved).
     *
     * An up event occurs when the pointer button is released inside the viewport.
     *
     * A click event occurs if down and up events occur on the viewport, no node is grabbed and no move events occurred in-between.
     */
    action: "down" | "move" | "up" | "click"
    /**
     * Relevant for the "up" and "wheel" events.
     */
    grabbed: boolean
    /**
     * The PointerEvent that caused this event. Note that for the "click" event, this is actually a "pointerup" event.
     */
    pointerEvent: PointerEvent
}

/**
 * This event occurs when the mouse wheel is actioned while the pointer is hovered.
 * By default, the viewport zoom is changed.
 */
export interface ViewportWheelEvent extends BaseGrapherEvent {
    type: "viewport"
    /**
     * This event occurs when the mouse wheel is actioned while the pointer is hovered.
     * By default, the viewport zoom is changed.
     */
    action: "wheel"
    grabbed: boolean
    wheelEvent: WheelEvent
}

/**
 * This event occurs at the document level, on 'pointerup' and it's used to let (remove "grabbed" flag) of a node/viewport (by default).
 */
export interface UpEvent extends BaseGrapherEvent {
    type: "up"
    /**
     * The currently grabbed object, if any: the node's ID, empty string for viewport and null if nothing is grabbed.
     */
    grabbed: string | null
    pointerEvent: PointerEvent
}

/**
 * This event occurs when a key is pressed while the viewport is focused.
 */
export interface KeyEvent extends BaseGrapherEvent {
    type: "key"
    /**
     * The currently grabbed object, if any: the node's ID, empty string for viewport and null if nothing is grabbed.
     */
    grabbed: string | null
    keyboardEvent: KeyboardEvent
}