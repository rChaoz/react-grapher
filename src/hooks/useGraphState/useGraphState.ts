import {NodeData, NodeImpl, Nodes} from "../../data/Node";
import {EdgeData, EdgeImpl, Edges} from "../../data/Edge";
import {useMemo} from "react";
import useNodes from "./useNodes";
import useEdges from "./useEdges";

export type GraphState<N, E> = [Nodes<N>, Edges<E>]

/**
 * Returns a pair of stateful array-like objects that initially hold the given data.
 * Never modify these directly, such as with 'nodes.push(...)', edges[4].target = ... etc. This will not work.
 * Use the provided helper functions, attached to the returned objects, that will update the internal React state associated with it.
 */
export function useGraphState<N, E>(initialNodes?: NodeData<N>[], initialEdges?: EdgeData<E>[]): GraphState<N, E> {
    const nodes = useNodes(initialNodes as NodeImpl<N>[])
    const edges = useEdges(initialEdges as EdgeImpl<E>[])
    return useMemo(() => ([nodes, edges]), [nodes, edges])
}