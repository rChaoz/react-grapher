/**
 * An edge from a node with ID 'source' to another with ID 'target'
 */
export interface Edge {
    id: string
    source: string
    target: string
}

/**
 * Represents a Graph's collection of Edges. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered.
 */
export interface Edges extends Array<Edge> {
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
}