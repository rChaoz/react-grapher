import {Node, Nodes} from "../../data/Node";
import {Edge, Edges} from "../../data/Edge";
import {useState} from "react";
import attachNodeFunctions from "./attachNodeFunctions";
import attachEdgeFunctions from "./attachEdgeFunctions";

/**
 * Returns a pair of stateful array-like objects that initially hold the given data.
 * Never modify these directly, such as with 'nodes.push(...)', edges[4].target = ... etc. This will not work.
 * Use the provided helper functions, attached to the returned objects, that will update the internal React state associated with it.
 */
export function useGraphState<T>(initialNodes?: Node<T>[], initialEdges?: Edge[]): { nodes: Nodes<T>, edges: Edges } {
    const [nodes, setNodes] = useState(initialNodes ?? [])
    const [selection, setSelection] = useState<string[]>([])
    const [edges, setEdges] = useState(initialEdges ?? [])
    return {nodes: attachNodeFunctions(nodes, setNodes, selection, setSelection), edges: attachEdgeFunctions(edges, setEdges)}
}