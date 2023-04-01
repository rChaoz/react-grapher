import {Nodes} from "../data/Node";
import {Edges} from "../data/Edge";
import {Selection} from "../data/Selection";
import {Controller} from "../data/Controller";
import React from "react";

export interface GrapherContextValue {
    /**
     * DOM ID of ReactGrapher component. You can use this as a prefix for your components' IDs to prevent
     * duplicate IDs, should you have multiple ReactGraphers on one page.
     */
    id: string
    nodes: Nodes<unknown>
    edges: Edges<unknown>
    selection: Selection
    controller: Controller
}

export const GrapherContext = React.createContext<GrapherContextValue>(null as any)