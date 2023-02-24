import {GrapherChange} from "./GrapherChange";
import React from "react";
import {NodeProps} from "../components/BaseNode";
import {SimpleNode} from "../components/SimpleNode";
import {checkInvalidID} from "../util/log";

export interface Node<T = string> {
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
     * Component function for rendering the node, defaults to DefaultNode
     */
    Component: React.ExoticComponent<NodeProps<T>>
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
     * Position relative to the parent (or absolute if parent is null). Defaults to 0,0
     */
    position: DOMPoint
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
}

export interface NodeImpl<T> extends Node<T> {
    /**
     * Automatically set during rendering. DOM Element for this node.
     */
    element?: HTMLElement
    /**
     * Automatically set during rendering. DOM width of this node
     */
    width: number
    /**
     * Automatically set during rendering. DOM height of this node
     */
    height: number
    /**
     * Used internally to check if a node was initialized (all fields set).
     */
    isInitialized?: boolean
}

/**
 * Node with all properties made optional except ID. Upon rendering, all properties will be set to their default values.
 */
export type NodeData<T = string> = Partial<Node<T>> & {id: string}

/**
 * Default values for nodes.
 */
export type NodeDefaults = Omit<NodeData<any>, "id" | "data" | "parent" | "selected">

const nodeDefaults: Omit<Required<NodeDefaults>, "allowSelection" | "allowGrabbing" | "allowMoving" | "allowDeletion"> = {
    Component: SimpleNode,
    classes: [],
    position: new DOMPoint(),
    edgeMargin: 3,
}

export function applyNodeDefaults(target: NodeData<any>, defaults: NodeDefaults) {
    const i = target as NodeImpl<any>
    if (i.isInitialized) return
    i.isInitialized = true
    checkInvalidID("node", i.id)
    i.selected = false
    i.width = i.height = 0

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
     * Gets currently selected node IDs. Do not modify the returned array; instead, use `setSelection` or `setSelected` to modify the selection.
     */
    getSelection(): string[]

    /**
     * Sets currently selected nodes by IDs
     */
    setSelection(selected: string[]): void

    /**
     * Selects/deselects a node.
     * @param node ID of the node
     * @param selected Whether to select or unselect the node.
     * @param newSelection If this parameter is true or `ReactGrapher` does not allow multiple selections and `selected` is true, previously selected nodes are unselected.
     */
    setSelected(node: string, selected: boolean, newSelection?: boolean): void

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
     * Automatically set during rendering. Bounding box of nodes, used when fitting view.
     */
    boundingRect?: DOMRect
    /**
     * Whether multiple selection is enabled.
     */
    multipleSelection: boolean
    /**
     * Currently selected nodes
     */
    selection: string[]
    /**
     * Internal map used to get node by ID
     */
    internalMap: Map<string, Node<T>>
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