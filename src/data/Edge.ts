import {randomID} from "../util/randomID";
import {GrapherChange} from "./GrapherChange";
import {warnEmptyID} from "../util/log";
import React from "react";
import {EdgeProps} from "../components/DefaultEdge";

/**
 * An edge from a node with ID 'source' to another with ID 'target'
 */
export interface Edge<T> {
    id: string
    Component?: React.ExoticComponent<EdgeProps<T>>
    classes: Set<string>
    /**
     * ID of source node
     */
    source: string
    /**
     * Name of the handle of the source node (null for floating edge)
     */
    sourceHandle?: string | null
    /**
     * Name of the handle of the target node (null for floating edge)
     */
    targetHandle?: string | null
    /**
     * ID of target node
     */
    target: string
    /**
     * Custom data this edge can hold
     */
    data?: T
    /**
     * ID of the custom SVG marker or true for the default arrow tip. False/undefined means no marker.
     */
    markerStart?: boolean | string
    /**
     * ID of the custom SVG marker or true for the default arrow tip. False/undefined means no marker.
     */
    markerEnd?: boolean | string
    /**
     * Label for this edge
     */
    label: string | undefined
    /**
     * Whether this edge has been selected by the user (read-only). You can access all selected edges using `Edges.selection`.
     * You can modify the current selection using selection related functions on the Edges object.
     */
    selected: boolean
}

/**
 * Create a new edge between 2 nodes
 * @param source Source node ID
 * @param target Target node ID
 * @param id ID of this edge (defaults to random alphanumerical sequence)
 * @param data Custom data that you may want to store for this edge
 * @param label Label for the edge
 * @param classes Array of class names to be passed to the Edge component
 * @param Component Custom component function for rendering this edge
 */
export function createEdge<T>(source: string, target: string, {id, data, label, classes}: {id?: string, data?: T, label?: string, classes?: string[]},
                              Component?: React.ExoticComponent<EdgeProps<T>>): Edge<T> {
    if (id === "" || id == null) {
        id = randomID()
        warnEmptyID(id)
    }
    return {
        id,
        Component,
        classes: new Set(classes),
        source,
        target,
        data,
        label,
        selected: false,
    }
}

export function createSimpleEdge<T>(source: string, target: string, id?: string): Edge<T> {
    return createEdge(source, target, {id})
}

/**
 * Represents a Graph's collection of Edges. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered.
 */
export interface EdgesFunctions<T> {
    /**
     * Gets currently selected edges. Do not modify the returned array; instead, use `setSelection` or `setSelected` to modify the selection.
     */
    getSelection(): string[]

    /**
     * Sets currently selected edges
     */
    setSelection(selected: string[]): void

    /**
     * Selects/deselects an edge.
     * @param node ID of the edge
     * @param selected Whether to select or unselect the edge.
     * @param newSelection If this parameter is true or `ReactGrapher` does not allow multiple selections and `selected` is true, previously selected edges are unselected.
     */
    setSelected(node: string, selected: boolean, newSelection?: boolean): void

    /**
     * Remove all edges
     */
    clear(): void

    /**
     * Replace all existing edges
     */
    set(newEdges: Edge<T>[]): void

    /**
     * Add one or more edges to the Graph
     */
    add(newEdge: Edge<T> | Edge<T>[]): void

    /**
     * Map in-place, return null/undefined to remove an edge
     */
    update(mapFunc: (node: Edge<T>) => Edge<T> | null | undefined): void

    /**
     * Replace or remove an edge by ID
     * @param targetID ID of the edge you want to remove
     * @param replacement New edge or function that returns a new edge and receives the old edge (null to remove)
     */
    replace(targetID: string, replacement?: Edge<T> | null | ((edge: Edge<T>) => Edge<T> | null | undefined)): void

    /**
     * Process given changes, updating this Edges list (ignores non-Edge changes)
     */
    processChanges(changes: GrapherChange[]): void
}

export interface EdgesFunctionsImpl<T> extends EdgesFunctions<T> {
    /**
     * Automatically set during rendering. Bounding box of edges used when fitting view.
     */
    boundingRect?: DOMRect
    /**
     * Whether multiple selection is enabled.
     */
    multipleSelection: boolean
    /**
     * Currently selected edges
     */
    selection: string[]
    /**
     * Internal map used to get edge by ID
     */
    internalMap: Map<string, Edge<T>>
}

export type Edges<T> = EdgesFunctions<T> & Edge<T>[]

export type EdgesImpl<T> = EdgesFunctionsImpl<T> & Edge<T>[]