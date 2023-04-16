import React from "react";
import {NewNode, Nodes} from "../data/Node";
import {NewEdge, Edges} from "../data/Edge";
import {Controller} from "../data/Controller";
import {ControlledGraphProps, ReactGrapher} from "../components/ReactGrapher";
import {useGraphState} from "./useGraphState";
import {useController} from "./useController";
import {Selection} from "../data/Selection";
import {useSelection} from "./useSelection";

export interface ControlledGrapher<N, E> {
    nodes: Nodes<N>
    edges: Edges<E>
    selection: Selection
    controller: Controller

    Grapher(props: HookGraphProps<N, E>): React.ReactElement
}

export type HookGraphProps<N, E> = Omit<ControlledGraphProps<N, E>, "nodes" | "edges" | "selection" | "controller">

/**
 * Combination of `useGraphState()` and `useController()`. Also returns a Grapher component that has `nodes`, `edges`, `selection` and `controller` props pre-set.
 */
export function useControlledGrapher<N, E>(initialNodes?: NewNode<N>[], initialEdges?: NewEdge<E>[]): ControlledGrapher<N, E> {
    const [nodes, edges] = useGraphState(initialNodes, initialEdges)
    const selection = useSelection(nodes, edges)
    const controller = useController()

    return {
        nodes,
        edges,
        selection,
        controller,
        Grapher(props: HookGraphProps<N, E>) {
            return <ReactGrapher nodes={nodes} edges={edges} selection={selection} controller={controller} {...props}/>
        }
    }
}
