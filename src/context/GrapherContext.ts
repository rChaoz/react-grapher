import {Nodes} from "../data/Node";
import {Edges} from "../data/Edge";
import {Selection} from "../data/Selection";
import {Controller} from "../data/Controller";
import React from "react";

export interface GrapherContextValue {
    nodes: Nodes<unknown>
    edges: Edges<unknown>
    selection: Selection
    controller: Controller
}

export const GrapherContext = React.createContext<GrapherContextValue>(null as any)