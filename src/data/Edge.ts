import {GrapherChange} from "./GrapherChange";
import React from "react";
import {EdgeProps} from "../components/BaseEdge";
import {SimpleEdge, SimpleEdgeData} from "../components/SimpleEdge";

/**
 * An edge from a node with ID 'source' to another with ID 'target'
 */
export interface Edge<T = SimpleEdgeData> {
    id: string
    /**
     * Component function for rendering the edge, defaults to DefaultEdge
     */
    Component: React.ExoticComponent<EdgeProps<T>>
    /**
     * CSS classes that will be passed to the DefaultEdge/custom component function. Ultimately, the component function decides what classes it adds to the DOM element.
     * By default, these classes are kept as-is.
     */
    classes: string[]
    /**
     * ID of source node
     */
    source: string
    /**
     * Name of the handle of the source node (null for floating edge)
     */
    sourceHandle?: string | null
    /**
     * ID of target node
     */
    target: string
    /**
     * Name of the handle of the target node (null for floating edge)
     */
    targetHandle?: string | null
    /**
     * Label for this edge
     */
    label?: string
    /**
     * Where to display the label, along the Edge's path, as a value between 0 and 1 (inclusive).
     * It will be multiplied by the path's {@link SVGGeometryElement.getTotalLength length} before being passed as an argument to {@link SVGGeometryElement.getPointAtLength}.
     *
     * Note that, while this is the default behaviour of {@link SimpleEdge}
     */
    labelPosition?: number
    /**
     * Custom data this edge can hold
     */
    data?: T
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerStart?: string
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerEnd?: string
    /**
     * Whether this edge has been selected by the user (read-only). You can access all selected edges using `Edges.selection`.
     * You can modify the current selection using selection related functions on the Edges object.
     */
    selected: boolean
}

export interface EdgeImpl<T> extends Edge<T> {
    /**
     * Used internally to check if a node was initialized (all fields set).
     */
    isInitialized?: boolean
}

/**
 * Edge with all properties made optional except ID, source and target. Upon rendering, all properties will be set to their default values.
 */
export type EdgeData<T> = Partial<Edge<T>> & {id: string, source: string, target: string}

/**
 * Default values for edges.
 */
export type EdgeDefaults = Omit<EdgeData<any>, "id" | "source" | "target" | "data">

export function applyEdgeDefaults(target: EdgeData<any>, defaults: EdgeDefaults) {
    const i = target as EdgeImpl<any>
    if (i.isInitialized) return
    i.isInitialized = true

    if (i.Component == null) i.Component = defaults.Component ?? SimpleEdge
    if (i.classes == null) i.classes = defaults.classes ?? []
    if (i.label == null) i.label = defaults.label
    if (i.markerStart == null) i.markerStart = defaults.markerStart
    if (i.markerEnd == null) i.markerEnd = defaults.markerEnd
    if (i.selected == null) i.selected = defaults.selected ?? false
}

/**
 * Represents a Graph's collection of Edges. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered.
 */
export interface EdgesFunctions<T> {
    /**
     * Gets currently selected edge IDs. Do not modify the returned array; instead, use `setSelection` or `setSelected` to modify the selection.
     */
    getSelection(): string[]

    /**
     * Sets currently selected edges by IDs
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
    set(newEdges: Edge<T>[] | EdgeData<T>[]): void

    /**
     * Add one or more edges to the Graph
     */
    add(newEdge: Edge<T> | Edge<T>[] | EdgeData<T> | EdgeData<T>[]): void

    /**
     * Map in-place, return null/undefined to remove an edge
     */
    update(mapFunc: (node: Edge<T>) => Edge<T> | EdgeData<T> | null | undefined): void

    /**
     * Replace or remove an edge by ID
     * @param targetID ID of the edge you want to remove
     * @param replacement New edge or function that returns a new edge and receives the old edge (null to remove)
     */
    replace(targetID: string, replacement?: Edge<T> | EdgeData<T> | null | ((edge: Edge<T>) => Edge<T> | EdgeData<T> | null | undefined)): void

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