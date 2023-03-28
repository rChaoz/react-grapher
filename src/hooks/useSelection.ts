import {Nodes} from "../data/Node";
import {Edges} from "../data/Edge";
import {Selection, SelectionImpl} from "../data/Selection";
import {useMemo, useState} from "react";

function selectionsEqual(sel1: string[], sel2: string[]) {
    if (sel1.length !== sel2.length) return false
    for (let i = 0; i < sel1.length; ++i) if (sel1[i] !== sel2[i]) return false
    return true
}

export function useSelection<N, E>(nodes: Nodes<N>, edges: Edges<E>): Selection {
    const [nodesSelection, setNodesSelection] = useState<string[]>([])
    const [edgesSelection, setEdgesSelection] = useState<string[]>([])
    return useMemo<SelectionImpl>(() => ({
        multipleSelection: false,
        getNodesSelection(): string[] {
            return nodesSelection
        },
        getEdgesSelection(): string[] {
            return edgesSelection
        },
        setNodesSelection(selection: string[]) {
            // Compare first to avoid excessive re-renders
            if (selectionsEqual(nodesSelection, selection)) return
            setNodesSelection(selection)
            // Update 'selected' property on nodes
            for (const node of nodes) node.selected = selection.includes(node.id)
        },
        setEdgesSelection(selection: string[]) {
            // Compare first to avoid excessive re-renders
            if (selectionsEqual(edgesSelection, selection)) return
            setEdgesSelection(selection)
            // Update 'selected' property on edges
            for (const edge of edges) edge.selected = selection.includes(edge.id)
        },
        setNodeSelected(id: string, selected: boolean, newSelection?: boolean) {
            if (selected && (!this.multipleSelection || newSelection)) {
                this.setNodesSelection([id])
                this.setEdgesSelection([])
                return
            }
            const index = nodesSelection.indexOf(id)
            if (index != -1) {
                if (!selected) this.setNodesSelection(nodesSelection.slice(0, index).concat(nodesSelection.slice(index + 1)))
            } else {
                if (selected) this.setNodesSelection(nodesSelection.concat(id))
            }
        },
        setEdgeSelected(id: string, selected: boolean, newSelection?: boolean) {
            if (selected && (!this.multipleSelection || newSelection)) {
                this.setNodesSelection([])
                this.setEdgesSelection([id])
                return
            }
            const index = edgesSelection.indexOf(id)
            if (index != -1) {
                if (!selected) this.setEdgesSelection(edgesSelection.slice(0, index).concat(edgesSelection.slice(index + 1)))
            } else {
                if (selected) this.setEdgesSelection(edgesSelection.concat(id))
            }
        },
        deselectAll() {
            this.setNodesSelection([])
            this.setEdgesSelection([])
        }
    }), [nodes, nodesSelection, edges, edgesSelection])
}