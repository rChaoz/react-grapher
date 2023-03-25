import React from "react";
import {NodeData, Nodes} from "../data/Node";
import {EdgeData, Edges} from "../data/Edge";
import {Controller} from "../data/Controller";
import {ControlledGraphProps, ReactGrapher} from "../components/ReactGrapher";
import {useGraphState} from "./useGraphState";
import {useController} from "./useController";
import {Selection} from "../data/Selection";

export interface GraphState<N, E> {
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
export function useControlledGraph<N, E>(initialNodes?: NodeData<N>[], initialEdges?: EdgeData<E>[]): GraphState<N, E> {
    const {nodes, edges, selection} = useGraphState(initialNodes, initialEdges)
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
