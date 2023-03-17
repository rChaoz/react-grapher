import {GrapherChange} from "./GrapherChange";
import React from "react";
import {NodeProps} from "../components/BaseNode";
import {SimpleNode, SimpleNodeData} from "../components/SimpleNode";
import {checkInvalidID} from "../util/log";
import {MemoObject} from "../util/utils";
import {Property} from "csstype";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Edge} from "./Edge";

export interface Node<T = SimpleNodeData> {
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
     * By default, these classes are kept as-is, however a custom component function can change these on render.
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
     * Position relative to the parent (or absolute if parent is null). Defaults to 0,0.
     * Note: never change a node's position by modifying the x & y values directly. Always use `node.position = ...` to update to a new object, as reference
     * equality is used to detect position change.
     */
    position: DOMPoint
    /**
     * Whether this node should be user-resizable. The default implementation always respects this, a custom Component function is responsible for making the node resizable.
     * If you want to set min/max width or height, you should use a custom CSS class for that, and add it to {@link classes}.
     */
    resize: Property.Resize
    /**
     * Spacing between this node and the edges that connect to it. Defaults to 3
     */
    edgeMargin: number

    // Config
    /**
     * Whether this node is selectable by the user. Defaults to true
     */
    allowSelection?: boolean
    /**
     * Whether this node can be "grabbed" by the user. A node is grabbed on pointerdown, and this prevents the viewport from being grabbed (as it is the second to receive
     * the event). If false, attempting to drag this node will pan the viewport instead; the event will completely ignore this node. Defaults to true
     */
    allowGrabbing?: boolean
    /**
     * Whether this node can the moved by the user. Defaults to true
     */
    allowMoving?: boolean
    /**
     * Whether this node can be deleted by the user. Defaults to false
     */
    allowDeletion?: boolean
    /**
     * Read-only absolute position, calculated during rendering.
     */
    absolutePosition: DOMPoint
}

export interface NodeImpl<T> extends Node<T> {
    /**
     * Used internally to check if a node was initialized with default values.
     */
    isInitialized?: boolean
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
    handles: NodeHandle[]
}

export interface NodeHandle {
    /**
     * Name of this handle, used for {@link Edge.sourceHandle} and {@link Edge.targetHandle}
     */
    name: string
    roles: string[] | undefined
    /**
     * X coordinate relative to node center
     */
    x: number
    /**
     * Y coordinate relative to node center
     */
    y: number
}

/**
 * Node with all properties made optional except ID. Upon rendering, all properties will be set to their default values.
 */
export type NodeData<T = SimpleNodeData> = Partial<Node<T>> & {id: string}

/**
 * Default values for nodes.
 */
export type NodeDefaults = Omit<NodeData<any>, "id" | "data" | "parent" | "selected">

const nodeDefaults: Omit<Required<NodeDefaults>, "allowSelection" | "allowGrabbing" | "allowMoving" | "allowDeletion"> = {
    Component: SimpleNode,
    classes: [],
    resize: "none",
    position: new DOMPoint(),
    edgeMargin: 3,
    absolutePosition: new DOMPoint(),
}

export function applyNodeDefaults(target: NodeData<any>, defaults: NodeDefaults) {
    const i = target as NodeImpl<any>
    if (i.isInitialized) return
    i.isInitialized = true
    // TODO TypeChecking to ensure all required properties are set
    checkInvalidID("node", i.id)
    i.selected = false
    i.width = i.height = 0
    i.border = [0, 0, 0, 0]
    i.borderRadius = [[0, 0], [0, 0], [0, 0], [0, 0]]
    i.absolutePositionMemoObject = {}

    // @ts-ignore
    for (const prop in nodeDefaults) if (i[prop] === undefined) i[prop] = defaults[prop] ?? nodeDefaults[prop]
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
 * Note that the custom functions' implementation uses `this`, so you should bind `this` value to the Nodes object should you use them as callback.
 */
export type Nodes<T> = NodesFunctions<T> & Node<T>[]

export type NodesImpl<T> = NodesFunctionsImpl<T> & NodeImpl<T>[]