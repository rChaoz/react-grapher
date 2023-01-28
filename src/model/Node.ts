export interface Node<T> {
    id: string
    parent?: string | null
    data: T
    /**
     * CSS classes that will be passed to the Node component function. Ultimately, the function decides what classes it adds to the DOM element.
     * By default, these classes are kept as-is.
     */
    classes: Set<string>
    position: Position
    /**
     * Whether this node has been selected by the user. You can access all selected nodes using `Nodes.selection`.
     */
    selected: boolean
}

export interface Position {
    /**
     * True if this node has a parent (i.e. belongs in a group), yet needs to have absolute positioning.
     */
    isAbsolute: boolean
    x: number
    y: number
}

/**
 * Represents a Graph's collection of Nodes. Provides array-like acces, but never use this to cause modifications - only
 * use the provided functions to modify, as these will cause an internal `setState` call - otherwise your changes will not
 * be registered. If you need complex array manipulation, use `.slice()` on this object to obtain a copy, modify it as you please,
 * then use `.set()` to update the Graph
 */
export interface Nodes<T> extends Array<Node<T>> {
    /**
     * Remove all nodes
     */
    clear(): void

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
}