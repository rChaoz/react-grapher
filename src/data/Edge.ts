import {GrapherChange} from "./GrapherChange";
import React, {SVGProps} from "react";
import {EdgeProps, SimpleEdge, SimpleEdgeData} from "../components/SimpleEdge";
import {checkErrorInvalidID} from "../util/log";
import {MemoObject} from "../util/utils";

/**
 * An edge in a ReactGrapher. All properties will be set to their defaults (according to the provided {@link GrapherConfig}) when the graph is rendered.
 *
 * Note that properties in this object are _always_ respected by the default implementation (i.e. {@link SimpleEdge}), however if you implement/use a custom
 * component function, it is up to that function to decide everything about the edge it is rendering: CSS classes, actual source, target points and path, label
 * text, position, markers etc.
 */
interface EdgeData<T> {
    /**
     * ID of this edge. You can get a edge by its ID using the `Edges` object's `get` method.
     */
    id: string
    /**
     * Custom data for this edge. See {@link SimpleEdgeData} for the default implementation's required data.
     */
    data: T
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
     * Name of the handle of the source node (null for floating edge). An undefined (not null) value will attempt to automatically connect this edge
     * to the first (in DOM order) available handle in both nodes. The node itself will be considered as well (to create floating edges).
     */
    sourceHandle: string | null | undefined
    /**
     * ID of target node
     */
    target: string
    /**
     * Name of the handle of the target node (null for floating edge). An undefined (not null) value will attempt to automatically connect this edge
     * to the first (in DOM order) available handle in both nodes. The node itself will be considered as well (to create floating edges).
     */
    targetHandle: string | null | undefined
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
     * How far away from the edge the label is displayed. Set this to 0 to display the text on top of the edge. Defaults to 5
     */
    labelOffset: number
    /**
     * Whether the label rotates alongside the edge. This will cause the label to always appear above the edge, regardless of the edge's direction, which may be an issue
     * for some edge types, if 2 opposing direction edges overlap. If false, the text will always display left-to-right, and will display under an edge when the edge's
     * direction is right-to-left. Defaults to true
     */
    labelRotateWithEdge: boolean
    /**
     * Padding used by the label's background. Defaults to 2
     */
    labelPadding: number
    /**
     * Label background border radius, which will be passed to the `rx` prop of `<rect>`. Defaults to 6
     */
    labelBackgroundRadius: NonNullable<SVGProps<SVGRectElement>["rx"]>
    /**
     * ID of the predefined/custom SVG marker. Defaults to `null` (none)
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    markerStart: "arrow" | "arrow-filled" | string & {} | null
    /**
     * ID of the predefined/custom SVG marker. Defaults to "arrow".
     */
    markerEnd: string | null
    /**
     * Whether pointer events are enabled for this edge. If disabled, this node will not have hover effects and any pointer events will go through it (to the viewport).
     * Defaults to true
     */
    pointerEvents: boolean
}

export interface EdgeConfig {
    /**
     * Whether this edge is grabbed on pointerdown. A grabbed edge can be deleted / have its source/target points changed, if {@link allowEdit} is true;
     * regardless, the viewport underneath will not be grabbed in this case.
     *
     * If false, the viewport will be grabbed instead, which allows the user to pan the viewport by tapping and dragging on the node. Defaults to true
     */
    allowGrabbing?: boolean
    /**
     * Whether to allow the edge's source/target points to shift slightly, to prevent 2 edges that run
     * between the same 2 points but opposing directions, from overlapping. Defaults to true
     */
    allowOverlapSeparation?: boolean
    /**
     * Whether this edge is selectable by the user. Defaults to true
     */
    allowSelection?: boolean
    /**
     * Whether this edge can be deleted by the user. Defaults to false
     */
    allowDeletion?: boolean
    /**
     * Whether this node can be changed by the user, by dragging either end, to change source/target. Defaults to false.
     */
    allowEdit?: boolean
    /**
     * Same as {@link allowEdit}, but just for the source of this edge, used to override `allowEdit` should you want finer control over the config of this edge.
     * If not set, `allowEdit` will be used instead.
     */
    allowEditSource?: boolean
    /**
     * Same as {@link allowEdit}, but just for the target of this edge, used to override `allowEdit` should you want finer control over the config of this edge.
     * If not set, `allowEdit` will be used instead.
     */
    allowEditTarget?: boolean
}

interface EdgeInternals {
    /**
     * Used internally to check if a node was initialized (all fields set).
     */
    isInitialized: boolean
    /**
     * If true, it means that there is another edge, between the same 2 source points, in opposite direction.
     * To avoid overlap, these edges should be separated by a few pixels.
     */
    separate: boolean
    /**
     * True if this edge is a duplicate (same source & target as another), and should be removed.
     */
    duplicate: boolean
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
    sourcePos: DOMPoint
    /**
     * SourcePos memoization is done by source node position, width, height & border radius
     */
    sourcePosMemoObject: MemoObject<DOMPoint>
    /**
     * Target position, used for memoization
     */
    targetPos: DOMPoint
    /**
     * TargetPos memoization is done by source node position, width, height & border radius
     */
    targetPosMemoObject: MemoObject<DOMPoint>
}

export type Edge<T> = EdgeData<T> & EdgeConfig
export type EdgeImpl<T> = Edge<T> & EdgeInternals

/**
 * Edge with all properties made optional except ID, source and target. Upon rendering, all properties will be set to their default values.
 */
export type NewEdge<T = SimpleEdgeData> = Partial<Edge<T>> & {id: string, source: string, target: string}

/**
 * Default values for edges.
 */
export type EdgeDefaults = Omit<NewEdge<any>, "id" | "source" | "sourceHandle" | "target" | "targetHandle" | "data" | "selected">

function getDefaultEdgeData(): Omit<EdgeData<any>, "id" | "source" | "sourceHandle" | "target" | "targetHandle" | "data" | "selected"> & EdgeInternals {
    return {
        Component: SimpleEdge,
        classes: [],
        label: null,
        labelPosition: .5,
        labelOffset: 5,
        labelRotateWithEdge: true,
        labelPadding: 2,
        labelBackgroundRadius: 6,
        markerStart: null,
        markerEnd: "arrow",
        pointerEvents: true,
        // Internals
        isInitialized: true,
        separate: false,
        duplicate: false,
        verified: false,
        bounds: new DOMRect(),
        sourcePos: new DOMPoint(),
        sourcePosMemoObject: {},
        targetPos: new DOMPoint(),
        targetPosMemoObject: {},
    }
}

export function applyEdgeDefaults(target: NewEdge<any>, defaults: EdgeDefaults) {
    const i = target as EdgeImpl<any>
    if (i.isInitialized) return
    checkErrorInvalidID("edge", i.id)
    // Set undefined values to their defaults
    const edgeDefaults = getDefaultEdgeData()
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
    set(newEdges: Edge<T>[] | NewEdge<T>[]): void

    /**
     * Add one or more edges to the Graph
     */
    add(newEdge: Edge<T> | Edge<T>[] | NewEdge<T> | NewEdge<T>[]): void

    /**
     * Map in-place, return null/undefined to remove an edge
     */
    update(mapFunc: (node: Edge<T>) => Edge<T> | NewEdge<T> | null | undefined): void

    /**
     * Replace or remove an edge by ID
     * @param targetID ID of the edge you want to remove
     * @param replacement New edge or function that returns a new edge and receives the old edge (null to remove)
     */
    replace(targetID: string, replacement?: Edge<T> | NewEdge<T> | null | ((edge: Edge<T>) => Edge<T> | NewEdge<T> | null | undefined)): void

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