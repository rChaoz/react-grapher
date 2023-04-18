import {Viewport} from "./Viewport";
import {Edge, EdgeDefaults, NewEdge} from "./Edge";
import React from "react";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {GrapherConfig} from "./GrapherConfig";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {InProgressEdgeProps, SimpleInProgressEdge} from "../components/SimpleInProgressEdge";
import {NodeDefaults} from "./Node";

/**
 * Represents an edge that is being created (only has source) by the user by dragging from a Node handle and dropping onto
 * another (or other custom means to create and edge). On a successful drop, the `target` and `targetHandle` properties are set,
 * and this is added to the Nodes list. All other properties are kept unmodified. The only special property for this type is
 * the `InProgressComponent` property, which sets the component function used to render the in-progress node, while the `Component`
 * property will be used for the Edge after it is created.
 *
 * Note that programmatically setting the `InProgressEdge` with an `undefined` sourceHandle (not `null`) will act in the same way as adding
 * a new edge with `undefined` source/target handle properties: once the edge is finished, the source handle will be set automatically. If this is not possible
 * (no handle/node matches any of the {@link GrapherConfig.allowedConnections} rules), the edge will be instantly deleted.
 */
export interface InProgressEdge extends Omit<Edge<any>, "target" | "targetHandle"> {
    /**
     * Component function used to render this in-progress edge. Defaults to {@link SimpleInProgressEdge}
     */
    InProgressComponent: React.ComponentType<InProgressEdgeProps>
}

/**
 * Use this instead of {@link InProgressEdge} when setting the in-progress edge manually, via {@link Controller.setInProgressEdge}. This type has most
 * properties (except "id" and "source") made optional, to allow easily setting the in-progress edge. Note that, when using this, all unset properties
 * will be set to their default upon calling {@link Controller.setInProgressEdge}.
 */
export type NewInProgressEdge = Omit<NewEdge<any>, "target" | "targetHandle">

export interface Controller {
    // TODO Custom fit view area - set to current
    /**
     * Request a fit view, which will pan and zoom the viewport to ensure all nodes and edges are visible.
     */
    fitView(): void,
    /**
     * Do not modify the returned Viewport. Instead, call `setViewport` or `updateViewport`.
     */
    getViewport(): Viewport
    /**
     * Update the viewport information.
     */
    setViewport(newViewport: Viewport): void
    /**
     * Update the viewport partially. Missing values will not be modified.
     */
    updateViewport(changes: Partial<Viewport>): void
    // New nodes/edges stuff
    /**
     * Gets the "in-progress" Edge (being created by the user), if there is one.
     */
    getInProgressEdge(): InProgressEdge | null
    /**
     * Sets the "in-progress" Edge. This means the user will now see the in-progress edge, which can be finished by clicking on a node or handle.
     * This is called automatically if the user begins dragging a handle which has `allowNewEdges` property `true`, or if the user long-clicks a Node with
     * the same property `true`.
     * @param edge New in-progress edge object or null
     */
    setInProgressEdge(edge: InProgressEdge | NewInProgressEdge | null): void
}

export interface ControllerImpl extends Controller {
    fitViewValue: number
    viewport: Viewport

    inProgressEdge: InProgressEdge | null
    // Used by in progress edge & node for apply(Node/Edge)Defaults
    nodeDefaults: NodeDefaults
    edgeDefaults: EdgeDefaults
}