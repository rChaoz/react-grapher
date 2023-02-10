import React from "react";
import {Edge, EdgesFunctionsImpl, EdgesImpl} from "../../data/Edge";
import {GrapherChange, isEdgeChange} from "../../data/GrapherChange";

// TODO DRY this code
export default function attachEdgeFunctions<T>(edges: Edge<T>[], setEdges: React.Dispatch<React.SetStateAction<Edge<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>,
                                               map: Map<string, Edge<T>>): EdgesImpl<T> {
    const functions: EdgesFunctionsImpl<T> = {
        selection,
        internalMap: map,
        multipleSelection: false,
        getSelection(): string[] {
            return selection
        },
        setSelection(selected: string[]) {
            // Compare selections before updating first. This prevents useless re-renders when deselecting all multiple times, double-clicking nodes etc.
            // This does not work if orders in arrays are different, but chance of this happening is practically 0
            if (selected.length === selection.length) {
                let changed = false
                for (let i = 0; i < selected.length; ++i) if (selected[i] != selection[i]) {
                    changed = true
                    break
                }
                if (!changed) return
            }

            // Update selected nodes. Slice is required because the 'Nodes' objects only updates on setSelection, not on setSelection
            setSelection(selected)
            const e = edges.slice()
            for (const edge of e) edge.selected = selected.includes(edge.id)
            setEdges(e)
        },
        setSelected(edge: string, selected: boolean, newSelection?: boolean) {
            if (selected && (!this.multipleSelection || newSelection)) return this.setSelection([edge])
            const index = selection.indexOf(edge)
            if (index != -1) {
                if (!selected) this.setSelection(selection.slice(0, index).concat(selection.slice(index + 1)))
            } else {
                if (selected) this.setSelection(selection.concat(edge))
            }
        },
        clear() {
            setEdges([])
        },
        set(newEdges: Edge<T>[]) {
            setEdges(newEdges)
        },
        add(newEdge: Edge<T> | Edge<T>[]) {
            setEdges(edges.concat(newEdge))
        },
        update(mapFunc: (node: Edge<T>) => (Edge<T> | null | undefined)) {
            const newEdges = []
            for (const edge of edges) {
                const r = mapFunc(edge)
                if (r != null) newEdges.push(r)
            }
            return newEdges
        },
        replace(targetID: string, replacement?: Edge<any> | ((edge: Edge<any>) => (Edge<any> | null | undefined)) | null) {
            this.update(edge => {
                if (edge.id === targetID) {
                    if (typeof replacement === "function") replacement(edge)
                    else return replacement
                } else return edge
            })
        },
        processChanges(changes: GrapherChange[]) {
            const e = edges.slice()
            let changed = false
            for (const change of changes) {
                if (!isEdgeChange(change)) continue
                changed = true
                // TODO
            }
            if (changed) setEdges(e)
        }
    }
    return Object.assign(edges, functions)
}