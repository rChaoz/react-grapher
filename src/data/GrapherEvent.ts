import {NodesImpl} from "./Node";
import {EdgesImpl} from "./Edge";

export type GrapherEvent = GrapherPointerEvent | GrapherWheelEvent | GrapherKeyEvent

export interface GrapherBaseEvent {
    /**
     * Similar to DOM's Event.preventDefault(), this function will ensure that the default action for the specified event will not occur. For example,
     * when clicked, a Node or Edge will be selected. Or, on a  'down' event, a movable node will be "grabbed" (that means, from now on, moving the pointer without
     * releasing the hold will move the node).
     */
    preventDefault(): void

    /**
     * The currently grabbed object, if any. A node/edge/viewport is 'grabbed' after receiving a pointerdown event, until a pointerup is received.
     * Can be null if nothing is grabbed.
     */
    grabbed: "node" | "edge" | "viewport" | null
    /**
     * ID of grabbed node/edge, only valid if {@link grabbed} is 'node' or 'edge', otherwise empty string.
     */
    grabbedID: string
    /**
     * Read-only array of selected node IDs.
     */
    selectedNodes: string[]
    /**
     * Read-only array of selected edge IDs.
     */
    selectedEdges: string[]
}

export interface GrapherEventImpl {
    prevented: boolean
}

export function createEvent({type, id}: { type: "node" | "edge" | "viewport" | null, id: string },
                            nodes: NodesImpl<any>, edges: EdgesImpl<any>): GrapherBaseEvent & GrapherEventImpl {
    return {
        prevented: false,
        preventDefault() {
            this.prevented = true
        },
        grabbed: type,
        grabbedID: id,
        selectedNodes: nodes.selection,
        selectedEdges: edges.selection,
    }
}

/**
 * This event occurs on pointerdown, pointermove or pointerup in relation to the graph's viewport, nodes or edges.
 */
export interface GrapherPointerEvent extends GrapherBaseEvent {
    type: "pointer"
    /**
     * A click event is registered when a pointerdown event is followed by a pointerup, without the pointer moving more than a few pixels in-between.
     * Multiple clicks withing 0.5s of each other are counted, you can use {@link clickCount} to detect double/triple clicks if needed.
     */
    subType: "down" | "move" | "up" | "click"
    /**
     * Useful for detecting multiple clicks. Value is always 0 for non-click events.
     */
    clickCount: number
    /**
     * DOM event that caused this event
     */
    pointerEvent: PointerEvent
    /**
     * Target of the event.
     * // TODO Docs for up event, is it sent twice?
     */
    target: "node" | "edge" | "viewport"
    /**
     * ID of targeted node/edge. Only valid if {@link target} is 'node' or 'edge', otherwise empty string.
     */
    targetID: string
}


/**
 * This event occurs when the mouse wheel is actioned while the viewport is hovered.
 * By default, the viewport zoom is changed.
 */
export interface GrapherWheelEvent extends GrapherBaseEvent {
    type: "wheel"
    /**
     * DOM event that caused this event
     */
    wheelEvent: WheelEvent
}

/**
 * This event occurs when a key is pressed while the viewport is focused.
 */
export interface GrapherKeyEvent extends GrapherBaseEvent {
    type: "key"
    /**
     * DOM event that caused this event
     */
    keyboardEvent: KeyboardEvent
}