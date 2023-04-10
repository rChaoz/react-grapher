import {GrapherChange} from "./GrapherChange";
import React from "react";
import {NodeProps, SimpleNode, SimpleNodeData} from "../components/SimpleNode";
import {checkErrorInvalidID} from "../util/log";
import {MemoObject} from "../util/utils";
import {Property} from "csstype";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Edge} from "./Edge";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {GrapherConfig} from "./GrapherConfig";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {NodeHandle, NodeHandlePropsBase, SOURCE, TARGET} from "../components/NodeHandle";

/**
 * Node of a ReactGrapher. All properties will be set to their defaults (according to the provided {@link GrapherConfig}) when the graph is rendered.
 *
 * Note that properties in this object are _always_ respected by the default implementation (i.e. {@link SimpleNode}), however if you implement/use a custom
 * component function, it is up to that function to decide everything about the node it is rendering: CSS classes, resizability, data displayed, even the position
 * can be adjusted.
 */
export interface Node<T> {
    id: string
    /**
     * Custom data for this node. The default node implementation displays this value as a string.
     */
    data: T
    /**
     * Parent of this node. If non-null, its position will be relative to the center of this node.
     */
    parent?: string | null
    /**
     * Whether this node has been selected by the user (read-only). You can access all selected nodes using `Nodes.selection`.
     * You can modify the current selection using selection related functions on the Nodes object.
     */
    selected: boolean
    /**
     * Component function for rendering the node, defaults to {@link SimpleNode}
     */
    Component: React.ComponentType<NodeProps<T>>
    /**
     * CSS classes that will be passed to the SimpleNode/custom component function.
     *
     * In order to trigger a re-rendering of the Node component, you should set this to a new array when changing it using {@link Nodes.replace}:
     * @example
     * nodes.replace("targetID", node => {
     *     node.classes = node.classes.slice().concat("new-css-class")
     *     return node
     * })
     */
    classes: string[]
    /**
     * See {@link NodeHandlePropsBase.role}. These per-node roles are used for floating edges (i.e. edges that connect directly to the node, not to a node's handle).
     *
     * This defaults to null (all connections are allowed), however, there is no default way for the user to create floating edges. Should you enable floating edges,
     * you should probably give your nodes roles, such as {@link SOURCE} or {@link TARGET}.
     */
    roles: null | string[]
    /**
     * Position relative to the parent (or absolute if parent is null). Defaults to 0,0.
     * Note: never change a node's position by modifying the x & y values directly. Always use `node.position = ...` to update to a new object, as reference
     * equality is used to detect position change.
     */
    position: DOMPoint
    /**
     * Whether this node should be user-resizable. If you want to set min/max width or height, you should create a CSS class and add it to {@link classes}.
     * Defaults to "none".
     */
    resize: Property.Resize
    /**
     * Spacing between this node and the edges that connect to it. Defaults to 3
     */
    edgeMargin: number
    /**
     * Whether pointer events are enabled for this node. If disabled, this node will not have hover effects and any pointer events will go through it (to the viewport).
     * Defaults to true
     */
    pointerEvents: boolean
    /**
     * Default value for this node's handles' {@link NodeHandle.pointerEvents} prop, used if they don't set it explicitly.
     * Defaults to null (fallback to handle's individual setting).
     */
    handlePointerEvents: boolean | null

    // Config

    /**
     * Whether this node is selectable by the user. Defaults to true
     */
    allowSelection?: boolean
    /**
     * Whether this node can the moved by the user. Defaults to true
     */
    allowMoving?: boolean
    /**
     * Whether this node can be deleted by the user. Defaults to false
     */
    allowDeletion?: boolean
    /**
     * Allow new edges to be created by long-clicking the node. Defaults to false
     */
    allowNewEdges?: boolean
    /**
     * Allows this node to be a target for new edges, i.e. when a user starts to create a new edge, from a node/handle with {@link allowNewEdges} true,
     * they can drag onto this node in order to complete the edge creation. Note that, if {@link pointerEvents} is disabled (`false`), this property does nothing,
     * as the `pointerup` listener will never be fired. Defaults to false
     */
    allowEdgeTarget?: boolean
    /**
     * Default value for this node's handles for {@link NodeHandle.allowNewEdges}, if they don't set it explicitly.
     */
    allowNewEdgesFromHandles?: boolean
    /**
     * Default value for this node's handles for {@link NodeHandle.allowEdgeTarget}, if they don't set it explicitly.
     */
    allowEdgeTargetForHandles?: boolean
    /**
     * Read-only absolute position, calculated during rendering.
     */
    absolutePosition: DOMPoint
}

interface NodeInternals {
    /**
     * Used internally to check if a node was initialized with default values.
     */
    isInitialized: boolean
    /**
     * Automatically set during rendering. DOM width of this node
     */
    width: number
    /**
     * Automatically set during rendering. DOM height of this node
     */
    height: number
    /**
     * Automatically set during rendering. Border widths of this node in CSS order (top/right/bottom/left).
     */
    border: [number, number, number, number]
    /**
     * Automatically set during rendering. Margins of node in CSS order.
     */
    margin: [number, number, number, number]
    /**
     * Automatically set during rendering. Border radii of this node in CSS order (top-left/top-right/bottom-right/bottom-left), each having x-radius and y-radius.
     */
    borderRadius: [[number, number], [number, number], [number, number], [number, number]]
    /**
     * Memo object used to detect when the absolute position changes
     */
    absolutePositionMemoObject: MemoObject<DOMPoint>
    /**
     * Automatically set during rendering. Read-only information on handles of this node.
     */
    handles: NodeHandleInfo[]
}

export type NodeImpl<T> = Node<T> & NodeInternals

export interface NodeHandleInfo {
    /**
     * Name of this handle, used for {@link Edge.sourceHandle} and {@link Edge.targetHandle}
     */
    name: string
    /**
     * See {@link NodeHandlePropsBase.role}. Split into array of individual roles. null/undefined means that any edge may connect to this handle
     */
    roles: string[] | null | undefined
    /**
     * X coordinate relative to node center
     */
    x: number
    /**
     * Y coordinate relative to node center
     */
    y: number
    /**
     * Same as NodeHandle prop.
     */
    allowCreatingEdges: boolean | undefined
    /**
     * Same as NodeHandle prop.
     */
    allowCreatingEdgesTarget: boolean | undefined
    /**
     * Same as NodeHandle prop.
     */
    allowGrabbing: boolean | undefined
}

/**
 * Node with all properties made optional except ID. Upon rendering, all properties will be set to their default values.
 *
 * See {@link Node} for more information.
 */
export type NodeData<T = SimpleNodeData> = Partial<Node<T>> & {id: string}

/**
 * Default values for nodes.
 */
export type NodeDefaults = Omit<NodeData<any>, "id" | "data" | "parent" | "selected">

function getNodeDefaults(): Omit<Required<NodeDefaults>, "allowSelection" | "allowMoving" | "allowDeletion"
    | "allowNewEdges" | "allowEdgeTarget" | "allowNewEdgesFromHandles" | "allowEdgeTargetForHandles"> & NodeInternals {
    return {
        Component: SimpleNode,
        classes: [],
        roles: null,
        resize: "none",
        position: new DOMPoint(),
        edgeMargin: 3,
        pointerEvents: true,
        handlePointerEvents: null,
        absolutePosition: new DOMPoint(),
        // Internals
        isInitialized: true,
        width: 0,
        height: 0,
        border: [0, 0, 0, 0],
        margin: [0, 0, 0, 0],
        borderRadius: [[0, 0], [0, 0], [0, 0], [0, 0]],
        absolutePositionMemoObject: {},
        handles: [],
    }
}

export function applyNodeDefaults(target: NodeData<any>, defaults: NodeDefaults) {
    const i = target as NodeImpl<any>
    if (i.isInitialized) return
    checkErrorInvalidID("node", i.id)
    // Set undefined values to their defaults
    const nodeDefaults = getNodeDefaults()
    // @ts-ignore
    for (const prop in nodeDefaults) if (i[prop] === undefined) i[prop] = defaults[prop] ?? nodeDefaults[prop]
    i.selected = false
}

export interface NodesFunctions<T> {
    /**
     * Calculate absolute position of a node
     * @param node ID or Node object
     */
    absolute(node: Node<any> | string): DOMPoint

    /**
     * Remove all nodes
     */
    clear(): void

    /**
     * Finds the node with the given ID
     */
    get(id: string): Node<T> | undefined

    /**
     * Replaces all existing nodes
     */
    set(newNodes: Node<T>[] | NodeData<T>[]): void

    /**
     * Add one or more nodes to the Graph
     */
    add(newNode: Node<T> | Node<T>[] | NodeData<T> | NodeData<T>[]): void

    /**
     * Map in-place, return null/undefined to remove a node. If you return a node but modified, make sure to set its "hasChanged" property to true to
     * trigger internal re-calculations for the node.
     */
    update(mapFunc: (node: Node<T>) => Node<T> | NodeData<T> | null | undefined): void

    /**
     * Replace or remove a node by ID
     * @param targetID ID of the node that should be replaced
     * @param replacement New node or function that returns a new node and receives the old node (null to remove)
     */
    replace(targetID: string, replacement?: Node<T> | NodeData<T> | null | ((node: Node<T>) => Node<T> | NodeData<T> | null | undefined)): void

    /**
     * Process given changes, updating this Nodes list (ignores non-Node changes)
     */
    processChanges(changes: GrapherChange[]): void
}

export interface NodesFunctionsImpl<T> extends NodesFunctions<T> {
    /**
     * Internal map used to get node by ID
     */
    internalMap: Map<string, NodeImpl<T>>
}

/**
 * Represents a Graph's collection of Nodes. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered. If you need complex array manipulation, use `.slice()` on this object to obtain a copy, modify it as you please,
 * then use `.set()` to update the Graph.
 *
 * Note that the custom functions' implementation uses `this`, so you should bind `this` value to the Nodes object, should you use them as callback.
 */
export type Nodes<T> = NodesFunctions<T> & Node<T>[]

export type NodesImpl<T> = NodesFunctionsImpl<T> & NodeImpl<T>[]