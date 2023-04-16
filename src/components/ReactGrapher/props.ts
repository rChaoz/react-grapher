import {Controller} from "../../data/Controller";
import React from "react";
import {GrapherConfig} from "../../data/GrapherConfig";
import {GrapherEvent} from "../../data/GrapherEvent";
import {GrapherChange} from "../../data/GrapherChange";
import {NewNode, Nodes} from "../../data/Node";
import {NewEdge, Edges} from "../../data/Edge";
import {Selection} from "../../data/Selection";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {useGraphState} from "../../hooks/useGraphState";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {useController} from "../../hooks/useController";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {useSelection} from "../../hooks/useSelection";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {useControlledGrapher} from "../../hooks/useControlledGrapher";

export interface CommonGraphProps {
    /**
     * ID for the element, must be specified for react versions <18
     */
    id?: string
    /**
     * The width of the root div element. Defaults to '100%'.
     */
    width?: string
    /**
     * The height of the root div element. Defaults to '100%'.
     */
    height?: string
    /**
     * Used to control the viewport. If undefined, the viewport will be uncontrolled (the graph will manage it itself).
     * If you need access to it, obtain a controller state with {@link useController} and lift it up your component tree as much as you want.
     *
     * Also check {@link useControlledGrapher} for a fully-controlled graph.
     * @see Controller
     */
    controller?: Controller
    /**
     * Elements that will be placed inside the Graph div.
     */
    children?: React.ReactNode
    /**
     * Fine configuration for the Graph.
     *
     * Note: You should *really* memoize this value to avoid performance issues.
     */
    config?: GrapherConfig
    /**
     * Quick option to completely disable all controls. Check `GrapherConfig` for finer tuning.
     */
    disableControls?: boolean
    /**
     * Automatic fit view function. You should not change the value of this prop across renders, it will likely lead to
     * unexpected behaviour. Possible values:
     * 'initial' - fit view after the first render
     * 'always' - fit view every time nodes/edges are updated. You probably want to pair this with `disableControls`
     * undefined/'manual - you can fit view using the Controller returned by useController()/useControlledGraph()
     */
    fitView?: "initial" | "always" | "manual"
    /**
     * Fit view when the DOM element's size changes
     */
    fitViewOnResize?: boolean
    /**
     * This config option will make the graph completely static, by implementing the following changes:
     * - set config.hideControls = true (if unset)
     * - set config.fitViewConfig.abideMinMaxZoom = false (if unset)
     * - do not attach any pointer/key listeners
     * - disable pointer events on nodes & edges to prevent CSS hover effects
     * - make all resizable nodes non-resizable
     *
     * Additionally, if not already set (if undefined), the following props will be set:
     * - fitView -> "always"
     * - fitViewOnResize -> true
     *
     * This is meant to be used when you want to display a graph (e.g. for a preview), but without any user interaction. By default, the view will be permanently fitted, but
     * if you manually set fitView/fitViewOnResize props, they will not be overridden, allowing you to manually call `controller.fitView()` when needed.
     * TODO Test/improve this prop; make sure all pointer events are disabled when true
     */
    static?: boolean
    /**
     * Listen to events such as nodes or edges being clicked, selected, keystrokes or internal events.
     */
    onEvent?: (event: GrapherEvent) => GrapherChange[] | undefined | void
    /**
     * Called whenever the graph would suffer changes, such as nodes being moved or deleted. You can modify the changes before they are committed
     * or cancel them entirely.
     */
    onChange?: (changes: GrapherChange[]) => GrapherChange[] | undefined | void
    /**
     * Custom markers to be used for Edges. They will be placed inside the SVG's `<defs>` element.
     *
     * You should use the {@link Marker} component instead of the standard svg `<marker>` element for them to work.
     * For more info, read Marker's {@link Marker own documentation}.
     */
    customMarkers?: React.ReactNode
}

export interface ControlledGraphProps<N, E> extends CommonGraphProps {
    /**
     * For controlled graphs. Obtain graph state with {@link useGraphState} and lift it as high up the component tree as you want.
     *
     * Also check {@link useControlledGrapher} for a fully-controlled graph.
     * @see Nodes
     */
    nodes: Nodes<N>
    /**
     * For controlled graphs. Obtain graph state with {@link useGraphState} and lift it as high up the component tree as you want.
     *
     * Also check {@link useControlledGrapher} for a fully-controlled graph.
     * @see Edges
     */
    edges: Edges<E>
    /**
     * Used to observe and change the selected nodes/edges. If undefined, the graph will manage this state by itself.
     * If you need acces to it, obtain a selection state with {@link useSelection} and lift it as high up the component tree as you want.
     *
     * Also check {@link useControlledGrapher} for a fully-controlled graph.
     * @see Selection
     */
    selection?: Selection
}

export interface UncontrolledGraphProps<N, E> extends CommonGraphProps {
    /**
     * For uncontrolled graph. The graph will manage its own state, and state can be changed via user interactions.
     * This represents the starting nodes of the graph.
     */
    defaultNodes?: NewNode<N>[]
    /**
     * For uncontrolled graph. The graph will manage its own state, and state can be changed via user interactions.
     * This represents the starting edges of the graph.
     */
    defaultEdges?: NewEdge<E>[]
}