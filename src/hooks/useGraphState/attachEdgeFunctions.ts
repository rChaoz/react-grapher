import React from "react";
import {Edge, EdgeData, EdgesFunctionsImpl, EdgesImpl} from "../../data/Edge";
import {GrapherChange, isEdgeChange} from "../../data/GrapherChange";
import {BaseFunctionsImpl, createBaseFunctions} from "./baseFunctions";

export default function attachEdgeFunctions<T>(edges: Edge<T>[], setEdges: React.Dispatch<React.SetStateAction<Edge<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>,
                                               map: Map<string, Edge<T>>): EdgesImpl<T> {
    const base = createBaseFunctions<Edge<T>, EdgeData<T>>(edges, setEdges, selection, setSelection, map)
    const extra: Omit<EdgesFunctionsImpl<T>, keyof BaseFunctionsImpl<Edge<T>, EdgeData<T>>> = {
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
    return Object.assign(edges, base, extra)
}