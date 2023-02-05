import {randomID} from "../util/randomID";
import {GrapherChange} from "./GrapherChange";
import {emptyID} from "../util/log";

/**
 * An edge from a node with ID 'source' to another with ID 'target'
 */
export interface Edge {
    id: string
    source: string
    target: string
}

/**
 * Create a new edge between 2 nodes
 * @param source Source node ID
 * @param target Target node ID
 * @param id ID of this edge (defaults to random)
 */
export function createEdge(source: string, target: string, id?: string) {
    if (id === "") {
        id = randomID()
        emptyID(id)
    }
    return {
        id: id ?? randomID(),
        source,
        target,
    }
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
    set(newEdges: Edge[]): void

    /**
     * Add one or more edges to the Graph
     */
    add(newEdge: Edge | Edge[]): void

    /**
     * Map in-place, return null/undefined to remove an edge
     */
    update(mapFunc: (node: Edge) => Edge | null | undefined): void

    /**
     * Replace or remove an edge by ID
     * @param targetID ID of the edge you want to remove
     * @param replacement New edge or function that returns a new edge and receives the old edge (null to remove)
     */
    replace(targetID: string, replacement?: Edge | null | ((edge: Edge) => Edge | null | undefined)): void

    /**
     * Process given changes, updating this Edges list (ignores non-Edge changes)
     */
    processChanges(changes: GrapherChange[]): void
}

export type Edges = EdgesFunctions & Edge[]