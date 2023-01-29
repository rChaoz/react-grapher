import {Node, Nodes} from "../../data/Node";
import {Edge, Edges} from "../../data/Edge";
import {useState} from "react";
import attachNodeFunctions from "./attachNodeFunctions";
import attachEdgeFunctions from "./attachEdgeFunctions";


export function useGraphState<T>(initialNodes?: Node<T>[], initialEdges?: Edge[]): { nodes: Nodes<T>, edges: Edges } {
    const [nodes, setNodes] = useState(initialNodes ?? [])
    const [edges, setEdges] = useState(initialEdges ?? [])
    return {nodes: attachNodeFunctions(nodes, setNodes), edges: attachEdgeFunctions(edges, setEdges)}
}