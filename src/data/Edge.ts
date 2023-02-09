import {randomID} from "../util/randomID";
import {GrapherChange} from "./GrapherChange";
import {emptyID} from "../util/log";
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
        emptyID(id)
    }
    return {
        id,
        Component,
        classes: new Set(classes),
        source,
        target,
        data,
        label,
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
export interface EdgesFunctions {
    // TODO Bounding rect

    /**
     * Remove all edges
     */
    clear(): void

    /**
     * Replace all existing edges
     */
    set(newEdges: Edge<any>[]): void

    /**
     * Add one or more edges to the Graph
     */
    add(newEdge: Edge<any> | Edge<any>[]): void

    /**
     * Map in-place, return null/undefined to remove an edge
     */
    update(mapFunc: (node: Edge<any>) => Edge<any> | null | undefined): void

    /**
     * Replace or remove an edge by ID
     * @param targetID ID of the edge you want to remove
     * @param replacement New edge or function that returns a new edge and receives the old edge (null to remove)
     */
    replace(targetID: string, replacement?: Edge<any> | null | ((edge: Edge<any>) => Edge<any> | null | undefined)): void

    /**
     * Process given changes, updating this Edges list (ignores non-Edge changes)
     */
    processChanges(changes: GrapherChange[]): void
}

export type Edges<E> = EdgesFunctions & Edge<E>[]