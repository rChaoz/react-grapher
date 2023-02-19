import {Node, NodeData, Nodes} from "../../data/Node";
import {Edge, EdgeData, Edges} from "../../data/Edge";
import {useMemo, useState} from "react";
import attachNodeFunctions from "./attachNodeFunctions";
import attachEdgeFunctions from "./attachEdgeFunctions";

/**
 * Returns a pair of stateful array-like objects that initially hold the given data.
 * Never modify these directly, such as with 'nodes.push(...)', edges[4].target = ... etc. This will not work.
 * Use the provided helper functions, attached to the returned objects, that will update the internal React state associated with it.
 */
export function useGraphState<N, E>(initialNodes?: NodeData<N>[], initialEdges?: EdgeData<E>[]): { nodes: Nodes<N>, edges: Edges<E> } {
    const [nodes, setNodes] = useState(initialNodes as Node<N>[] ?? [])
    const [nodesSelection, setNodesSelection] = useState<string[]>([])
    const [edges, setEdges] = useState(initialEdges as Edge<E>[] ?? [])
    const [edgesSelection, setEdgesSelection] = useState<string[]>([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const nodesMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const edgesMap = useMemo(() => new Map(edges.map(edge => [edge.id, edge])), [])
    return {
        nodes: attachNodeFunctions(nodes, setNodes, nodesSelection, setNodesSelection, nodesMap),
        edges: attachEdgeFunctions(edges, setEdges, edgesSelection, setEdgesSelection, edgesMap),
    }
}