export interface Selection {
    /**
     * Gets currently selected nodes IDs. Do not modify the returned array; instead, use `setNodesSelection` or `setNodeSelected` to modify the selection.
     */
    getNodesSelection(): string[]

    /**
     * Gets currently selected edges IDs. Do not modify the returned array; instead, use `setEdgesSelection` or `setEdgeSelected` to modify the selection.
     */
    getEdgesSelection(): string[]

    /**
     * Sets currently selected nodes by IDs
     */
    setNodesSelection(selection: string[]): void

    /**
     * Sets currently selected edges by IDs
     */
    setEdgesSelection(selection: string[]): void

    /**
     * Selects/deselects a node.
     * @param node ID of the node
     * @param selected Whether to select or unselect the node
     * @param newSelection If this parameter is true or `ReactGrapher` does not allow multiple selections and `selected` is true, previously selected objects are unselected.
     */
    setNodeSelected(node: string, selected: boolean, newSelection?: boolean): void

    /**
     * Selects/deselects an edge.
     * @param node ID of the edge
     * @param selected Whether to select or unselect the edge
     * @param newSelection If this parameter is true or `ReactGrapher` does not allow multiple selections and `selected` is true, previously selected objects are unselected.
     */
    setEdgeSelected(node: string, selected: boolean, newSelection?: boolean): void

    /**
     * Selects all nodes
     */
    selectAllNodes(): void

    /**
     * Deselects all nodes
     */
    deselectAllNodes(): void

    /**
     * Selects all edges
     */
    selectAllEdges(): void

    /**
     * Deselects all edges
     */
    deselectAllEdges(): void

    /**
     * Selects everything
     */
    selectAll(): void

    /**
     * Deselect all nodes and edges
     */
    deselectAll(): void
}

export interface SelectionImpl extends Selection {
    /**
     * Whether multiple selection is enabled.
     */
    multipleSelection: boolean
}