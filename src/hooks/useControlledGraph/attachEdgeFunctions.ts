import React from "react";
import {Edge, Edges} from "../../model/Edge";

export default function attachEdgeFunctions(edges: Edge[], setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) {
    const e = edges as Edges
    e.clear = () => setEdges([])
    e.set = newEdges => setEdges(newEdges)
    e.add = newEdge => setEdges(nodes => nodes.concat(newEdge))
    e.update = mapFunc => setEdges(nodes => {
        const newEdges: Edge[] = []
        for (const node of nodes) {
            const r = mapFunc(node)
            if (r != null) newEdges.push(r)
        }
        return newEdges
    })
    e.replace = (targetID, replacement) => e.update(edge => {
        if (edge.id === targetID) {
            if (typeof replacement === "function") replacement(edge)
            else return replacement
        } else return edge
    })
}