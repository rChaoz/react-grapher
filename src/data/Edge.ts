import {GrapherChange} from "./GrapherChange";
import React, {SVGProps} from "react";
import {EdgeProps} from "../components/BaseEdge";
import {SimpleEdge, SimpleEdgeData} from "../components/SimpleEdge";
import {checkErrorInvalidID} from "../util/log";
import {MemoObject} from "../util/utils";

/**
 * An edge in a ReactGrapher. All properties should be set to their defaults (according to the provided {@link GrapherConfig}) if the graph has rendered.
 *
 * Note that properties in this object are _always_ respected by the default implementation (i.e. {@link SimpleEdge}), however if you implement/use a custom
 * component function, it is up to that function to decide everything about the edge it is rendering: CSS classes, actual source, target points and path, label
 * text, position, markers etc.
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
    Component: React.ComponentType<EdgeProps<T>>
    /**
     * CSS classes that will be passed to the SimpleEdge/custom component function.
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
     * Name of the handle of the source node (null for floating edge). Leaving this undefined (not null) will attempt to automatically connect this edge
     * to the first (in DOM order) available handle in both nodes. The node itself will be considered as well (to create floating edges).
     */
    sourceHandle?: string | null
    /**
     * ID of target node
     */
    target: string
    /**
     * Name of the handle of the target node (null for floating edge). Leaving this undefined (not null) will attempt to automatically connect this edge
     * to the first (in DOM order) available handle in both nodes. The node itself will be considered as well (to create floating edges).
     */
    targetHandle?: string | null
    /**
     * Label for this edge (can be null, in which case the text element won't be rendered at all)
     */
    label: string | null
    /**
     * Where to display the label, along the Edge's path, as a value between 0 and 1 (inclusive). Defaults to 0.5
     * It will be multiplied by the path's {@link SVGGeometryElement.getTotalLength length} before being passed as an argument to {@link SVGGeometryElement.getPointAtLength}.
     */
    labelPosition: number
    /**
     * Padding used by the label's background. Defaults to 2
     */
    labelPadding: number
    /**
     * Label background border radius, which will be passed to the `rx` prop of `<rect>`. Defaults to 6
     */
    labelRadius: SVGProps<SVGRectElement>["rx"]
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

interface EdgeInternals {
    /**
     * Used internally to check if a node was initialized (all fields set).
     */
    isInitialized: boolean
    /**
     * Used to check that the handles are set correctly
     */
    verified: boolean
    /**
     * Automatically set during rendering. Bounding rect of this edge.
     */
    bounds: DOMRect
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

export type EdgeImpl<T> = Edge<T> & EdgeInternals

/**
 * Edge with all properties made optional except ID, source and target. Upon rendering, all properties will be set to their default values.
 */
export type EdgeData<T = SimpleEdgeData> = Partial<Edge<T>> & {id: string, source: string, target: string}

/**
 * Default values for edges.
 */
export type EdgeDefaults = Omit<EdgeData<any>, "id" | "source" | "target" | "data" | "selected">

function getEdgeDefaults(): Omit<Required<EdgeDefaults>, "allowGrabbing" | "allowSelection"> & EdgeInternals {
    return {
        Component: SimpleEdge,
        classes: [],
        sourceHandle: null,
        targetHandle: null,
        label: null,
        labelPosition: .5,
        labelPadding: 2,
        labelRadius: 6,
        markerStart: null,
        markerEnd: null,
        // Internals
        isInitialized: true,
        verified: false,
        bounds: new DOMRect(),
        sourcePosMemoObject: {},
        targetPosMemoObject: {},
    }
}

export function applyEdgeDefaults(target: EdgeData<any>, defaults: EdgeDefaults) {
    const i = target as EdgeImpl<any>
    if (i.isInitialized) return
    checkErrorInvalidID("edge", i.id)
    // Set undefined values to their defaults
    const edgeDefaults = getEdgeDefaults()
    // @ts-ignore
    for (const prop in edgeDefaults) if (i[prop] === undefined) i[prop] = defaults[prop] ?? edgeDefaults[prop]
    i.selected = false
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