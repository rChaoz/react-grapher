import React from "react";
import {Edge, Edges, EdgesFunctions} from "../../data/Edge";
import {GrapherChange, isEdgeChange} from "../../data/GrapherChange";

export default function attachEdgeFunctions(edges: Edge[], setEdges: React.Dispatch<React.SetStateAction<Edge[]>>): Edges {
    const functions: EdgesFunctions = {
        clear() {
            setEdges([])
        },
        set(newEdges: Edge[]) {
            setEdges(newEdges)
        },
        add(newEdge: Edge | Edge[]) {
            setEdges(edges.concat(newEdge))
        },
        update(mapFunc: (node: Edge) => (Edge | null | undefined)) {
            const newEdges = []
            for (const edge of edges) {
                const r = mapFunc(edge)
                if (r != null) newEdges.push(r)
            }
            return newEdges
        },
        replace(targetID: string, replacement?: Edge | ((edge: Edge) => (Edge | null | undefined)) | null) {
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