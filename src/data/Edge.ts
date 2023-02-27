import {GrapherChange} from "./GrapherChange";
import React from "react";
import {EdgeProps} from "../components/BaseEdge";
import {SimpleEdge, SimpleEdgeData} from "../components/SimpleEdge";
import {checkInvalidID} from "../util/log";
import {MemoObject} from "../util/utils";

/**
 * An edge from a node with ID 'source' to another with ID 'target'
 */
export interface Edge<T = SimpleEdgeData> {
    id: string
    /**
     * Custom data this edge can hold
     */
    data?: T
    /**
     * Whether this edge has been selected by the user (read-only). You can access all selected edges using `Edges.selection`.
     * You can modify the current selection using selection related functions on the Edges object.
     */
    selected: boolean
    /**
     * Component function for rendering the edge, defaults to DefaultEdge
     */
    Component: React.ExoticComponent<EdgeProps<T>>
    /**
     * CSS classes that will be passed to the SimpleEdge/custom component function.
     * By default, these classes are kept as-is, however a custom component function can change these on render.
     *
     * In order to trigger a re-rendering of the Edge component, you should set this to a new array when changing it using {@link Edges.replace}:
     * @example
     * edges.replace("targetID", edge => {
     *     edge.classes = edge.classes.slice().concat("new-css-class")
     *     return edge
     * })
     */
    classes: string[]
    /**
     * ID of source node
     */
    source: string
    /**
     * Name of the handle of the source node (null for floating edge)
     */
    sourceHandle: string | null
    /**
     * ID of target node
     */
    target: string
    /**
     * Name of the handle of the target node (null for floating edge)
     */
    targetHandle: string | null
    /**
     * Label for this edge (can be null, in which case the text element won't be rendered at all)
     */
    label: string | null
    /**
     * Where to display the label, along the Edge's path, as a value between 0 and 1 (inclusive). Defaults to 0.5
     * It will be multiplied by the path's {@link SVGGeometryElement.getTotalLength length} before being passed as an argument to {@link SVGGeometryElement.getPointAtLength}.
     *
     * Note that, while this is the default behaviour of {@link SimpleEdge}, a custom Edge component function can decide to override this behaviour and place the label wherever.
     */
    labelPosition: number
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerStart: string | null
    /**
     * ID of the predefined/custom SVG marker.
     */
    markerEnd: string | null
    // Config
    /**
     * Whether this edge is selectable by the user. Defaults to true
     */
    allowSelection?: boolean
    /**
     * Whether this edge can be "grabbed" by the user. An edge is grabbed on pointerdown, and this prevents the viewport from being grabbed (as it is the second to receive
     * the event). If false, attempting to drag this edge will pan the viewport instead; the event will completely ignore this edge. Defaults to true
     */
    allowGrabbing?: boolean
}

export interface EdgeImpl<T> extends Edge<T> {
    /**
     * Automatically set during rendering. Bounding rect of this edge.
     */
    bounds: DOMRect
    /**
     * Used internally to check if a node was initialized (all fields set).
     */
    isInitialized?: boolean
    /**
     * Source position, used for memoization
     */
    sourcePos?: DOMPoint
    /**
     * SourcePos memoization is done by source node position, width, height & border radius
     */
    sourcePosMemoObject: MemoObject<DOMPoint>
    /**
     * Target position, used for memoization
     */
    targetPos?: DOMPoint
    /**
     * TargetPos memoization is done by source node position, width, height & border radius
     */
    targetPosMemoObject: MemoObject<DOMPoint>
}

/**
 * Edge with all properties made optional except ID, source and target. Upon rendering, all properties will be set to their default values.
 */
export type EdgeData<T> = Partial<Edge<T>> & {id: string, source: string, target: string}

/**
 * Default values for edges.
 */
export type EdgeDefaults = Omit<EdgeData<any>, "id" | "source" | "target" | "data" | "selected">

const edgeDefaults: Omit<Required<EdgeDefaults>, "allowGrabbing" | "allowSelection"> = {
    Component: SimpleEdge,
    classes: [],
    sourceHandle: null,
    targetHandle: null,
    label: null,
    labelPosition: .5,
    markerStart: null,
    markerEnd: null,
}

export function applyEdgeDefaults(target: EdgeData<any>, defaults: EdgeDefaults) {
    const i = target as EdgeImpl<any>
    if (i.isInitialized) return
    i.isInitialized = true
    checkInvalidID("edge", i.id)
    i.selected = false
    i.bounds = new DOMRect()
    i.sourcePosMemoObject = {}
    i.targetPosMemoObject = {}

    // @ts-ignore
    for (const prop in edgeDefaults) if (i[prop] === undefined) i[prop] = defaults[prop] ?? edgeDefaults[prop]
}

export interface EdgesFunctions<T> {
    /**
     * Remove all edges
     */
    clear(): void

    /**
     * Finds the edge with the given ID
     */
    get(id: string): Edge<T> | undefined

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
     * Internal map used to get edge by ID
     */
    internalMap: Map<string, EdgeImpl<T>>
}

/**
 * Represents a Graph's collection of Edges. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered.
 *
 * Note that the custom functions' implementation uses `this`, so you should bind `this` value to the Nodes object should you use them as callback.
 */
export type Edges<T> = EdgesFunctions<T> & Edge<T>[]

export type EdgesImpl<T> = EdgesFunctionsImpl<T> & EdgeImpl<T>[]