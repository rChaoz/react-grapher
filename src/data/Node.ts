import {randomID} from "../util/randomID"
import {GrapherChange} from "./GrapherChange";
import {NodeProps} from "../components/DefaultNode";
import React from "react";
import {emptyID} from "../util/log";

export interface Node<T> {
    id: string
    Component?: React.ExoticComponent<NodeProps<T>>
    parent?: string | null
    data: T
    /**
     * CSS classes that will be passed to the DefaultNode component function. Ultimately, the function decides what classes it adds to the DOM element.
     * By default, these classes are kept as-is.
     */
    classes: Set<string>
    position: Position
    /**
     * Whether this node has been selected by the user (read-only). You can access all selected nodes using `Nodes.selection`.
     * You can modify the current selection using selection related functions on the Nodes object.
     */
    selected: boolean
    /**
     * Automatically set during rendering. DOM Element for this node.
     */
    element?: HTMLElement
    /**
     * Automatically set during rendering. DOM width of this node
     */
    width?: number
    /**
     * Automatically set during rendering. DOM height of this node
     */
    height?: number
    /**
     * Automatically set during rendering. Used for calculation of Floating edges positions.
     */
    borderRadius?: [[number, number], [number, number], [number, number], [number, number]]
}

export interface Position {
    /**
     * True if this node has a parent (i.e. belongs in a group), yet needs to have absolute positioning.
     */
    isAbsolute?: boolean
    x: number
    y: number
}

/**
 * Create a node with provided data.
 * @param id ID of the node, defaults to random alfa-numerical sequence
 * @param position Position of the Node, defaults to 0, 0
 * @param data Data passed to Node component, default implementation just displays a label with value of `String(data)`
 * @param classes Array of class names to be passed to the Node component
 */
export function createNode<T>({id, position, data, classes}: { id?: string, position?: Position, data: T, classes?: string[] }): Node<T> {
    if (id === "") {
        id = randomID()
        emptyID(id)
    }
    return {
        id: id ?? randomID(),
        position: position ?? {x: 0, y: 0},
        data,
        classes: new Set(classes ?? null),
        selected: false,
    }
}

/**
 * Create a new Node with default values and provided string as its data.
 */
export function createTextNode(text: string, position?: Position, id?: string): Node<string> {
    return createNode({data: text, position, id})
}

/**
 * Represents a Graph's collection of Nodes. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered. If you need complex array manipulation, use `.slice()` on this object to obtain a copy, modify it as you please,
 * then use `.set()` to update the Graph
 */
export interface NodesFunctions<T> {
    /**
     * Automatically set during rendering. Bounding box of nodes, used when fitting view.
     */
    boundingRect?: DOMRect

    /**
     * Whether multiple selection is enabled (read-only). Change this using `config` prop of ReactGrapher
     */
    multipleSelection: boolean

    /**
     * Currently selected nodes IDs (read-only, use selection related functions to modify this).
     */
    selection: string[]

    /**
     * Sets currently selected nodes
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
    set(newNodes: Node<T>[]): void

    /**
     * Add one or more nodes to the Graph
     */
    add(newNode: Node<T> | Node<T>[]): void

    /**
     * Map in-place, return null/undefined to remove a node
     */
    update(mapFunc: (node: Node<T>) => Node<T> | null | undefined): void

    /**
     * Replace or remove a node by ID
     * @param targetID ID of the node that should be replaced
     * @param replacement New node or function that returns a new node and receives the old node (null to remove)
     */
    replace(targetID: string, replacement?: Node<T> | null | ((node: Node<T>) => Node<T> | null | undefined)): void

    /**
     * Process given changes, updating this Nodes list (ignores non-Node changes)
     */
    processChanges(changes: GrapherChange[]): void
}

export type Nodes<T> = NodesFunctions<T> & Node<T>[]