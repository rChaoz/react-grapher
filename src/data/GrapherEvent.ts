import {Selection} from "./Selection";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {GrapherUserControls} from "./GrapherConfig";
import {GrabbedNode} from "../components/ReactGrapher/utils";

export type GrapherEvent = GrapherPointerEvent | GrapherWheelEvent | GrapherKeyEvent

export interface GrapherBaseEvent {
    /**
     * Similar to DOM's Event.preventDefault(), this function will ensure that the default action for the specified event will not occur. For example,
     * when clicked, a Node or Edge will be selected. Or, on a  'down' event, a movable node will be "grabbed" (that means, from now on, moving the pointer without
     * releasing the hold will move the node).
     */
    preventDefault(): void

    /**
     * The currently grabbed object, if any. A node/edge/handle/viewport is 'grabbed' after receiving a pointerdown event, until a pointerup is received.
     * If a new node/edge is being created by the user, it will be considered 'grabbed'. Can be `null` if nothing is grabbed.
     */
    grabbed: Omit<GrabbedNode<any>["type"], "resizing"> | null
    /**
     * ID of grabbed node/edge, only valid if {@link grabbed} is 'node', 'edge' or 'handle' (for a handle, its name is its ID), otherwise empty string.
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

export function createEvent({type, id}: { type: GrabbedNode<any>["type"], id: string }, selection: Selection): GrapherBaseEvent & GrapherEventImpl {
    return {
        prevented: false,
        preventDefault() {
            this.prevented = true
        },
        grabbed: type === "resizing" ? null : type,
        grabbedID: id,
        selectedNodes: selection.getNodesSelection(),
        selectedEdges: selection.getEdgesSelection(),
    }
}

/**
 * This event occurs on pointerdown, pointermove or pointerup in relation to the graph's viewport, nodes (and their handles) or edges.
 */
export interface GrapherPointerEvent extends GrapherBaseEvent {
    type: "pointer"
    /**
     * A click event is registered when a pointerdown event is followed by a pointerup, without the pointer moving more than a few pixels in-between.
     * Multiple clicks withing 0.5s of each other are counted, you can use {@link clickCount} to detect double/triple clicks if needed.
     *
     * A long-click event is sent if there is no up/move event for a specified delay after a down event. {@link clickCount} is always 0 in this case. The
     * delay defaults to 500 milliseconds and can be changed using the `config` prop, `userControls` section.
     *
     * A document-up event is sent when a pointerup event is caught at the document level. If a user clicks a node normally, you will receive both 'up' and
     * 'document-up' events. If the user clicks the node and moves the cursor far, such that the node no longer is under the cursor, you will only receive this
     * event. Note that 'move' events are *always* captured at the document level because rapid pointer movements will cause the dragged node to 'lag' behind,
     * and not be under the pointer.
     */
    subType: "down" | "move" | "up" | "document-up" | "click" | "long-click"
    /**
     * Useful for detecting multiple clicks. Value is always 0 for non-click events, including long-click.
     */
    clickCount: number
    /**
     * DOM event that caused this event
     */
    pointerEvent: PointerEvent
    /**
     * Target of the event (component affected by this event). Not necessarily the element that captured the event, e.g. pointermove is captured at the
     * document level but may affect a node, edge or the viewport.
     */
    target: "node" | "edge" | "viewport" | "handle"
    /**
     * If the {@link target} is "edge", this will indicate what part of the edge received the event (close to the source point, close to the target point or
     * close to neither - `undefined`). "Close" is defined by {@link GrapherUserControls.edgeHandleThreshold GrapherConfig.userControls.edgeHandleDistance}.
     */
    edgeSection?: "source" | "target"
    /**
     * ID of targeted node/edge. Only valid if {@link target} is 'node' or 'edge'.
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