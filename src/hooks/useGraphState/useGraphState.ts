import {NewNode, NodeImpl, Nodes} from "../../data/Node";
import {NewEdge, EdgeImpl, Edges} from "../../data/Edge";
import useNodes from "./useNodes";
import useEdges from "./useEdges";

export type GraphState<N, E> = [Nodes<N>, Edges<E>]

/**
 * Returns a pair of stateful array-like objects that initially hold the given data.
 * Never modify these directly, such as with 'nodes.push(...)', `edges[4].target = ...` etc. This will not work.
 * Use the provided modification functions, attached to the returned objects, that will update the internal React state
 * associated with and cause the Grapher to update.
 */
export default function useGraphState<N, E>(initialNodes?: NewNode<N>[], initialEdges?: NewEdge<E>[]): GraphState<N, E> {
    const nodes = useNodes(initialNodes as NodeImpl<N>[])
    const edges = useEdges(initialEdges as EdgeImpl<E>[])
    return [nodes, edges]
}