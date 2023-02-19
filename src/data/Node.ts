import {GrapherChange} from "./GrapherChange";
import React from "react";
import {NodeProps} from "../components/BaseNode";
import {SimpleNode} from "../components/SimpleNode";

export interface Node<T = string> {
    id: string
    /**
     * Component function for rendering the node, defaults to DefaultNode
     */
    Component: React.ExoticComponent<NodeProps<T>>
    /**
     * Parent of this node. If non-null, its position will be relative to the center of this node.
     */
    parent?: string | null
    /**
     * Custom data for this node. The default node implementation displays this value as a string.
     */
    data: T
    /**
     * CSS classes that will be passed to the DefaultNode/custom component function. Ultimately, the component function decides what classes it adds to the DOM element.
     * By default, these classes are kept as-is.
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
    /**
     * Whether this node has been selected by the user (read-only). You can access all selected nodes using `Nodes.selection`.
     * You can modify the current selection using selection related functions on the Nodes object.
     */
    selected: boolean
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
export type NodeDefaults = Omit<NodeData<any>, "id" | "data">

export function applyNodeDefaults(target: NodeData<any>, defaults: NodeDefaults) {
    const i = target as NodeImpl<any>
    if (i.isInitialized) return
    i.isInitialized = true
    i.width = i.height = 0

    if (i.Component == null) i.Component = defaults.Component ?? SimpleNode
    if (i.classes == null) i.classes = defaults.classes ?? []
    if (i.position == null) i.position = defaults.position ?? new DOMPoint()
    if (i.edgeMargin == null) i.edgeMargin = defaults.edgeMargin ?? 3
    if (i.selected == null) i.selected = defaults.selected ?? false
}

/**
 * Represents a Graph's collection of Nodes. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered. If you need complex array manipulation, use `.slice()` on this object to obtain a copy, modify it as you please,
 * then use `.set()` to update the Graph
 */
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

export type Nodes<T> = NodesFunctions<T> & Node<T>[]

export type NodesImpl<T> = NodesFunctionsImpl<T> & NodeImpl<T>[]