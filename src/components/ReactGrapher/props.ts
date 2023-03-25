import {Controller} from "../../data/Controller";
import React from "react";
import {GrapherConfig} from "../../data/GrapherConfig";
import {GrapherEvent} from "../../data/GrapherEvent";
import {GrapherChange} from "../../data/GrapherChange";
import {NodeData, Nodes} from "../../data/Node";
import {EdgeData, Edges} from "../../data/Edge";
import {Selection} from "../../data/Selection";

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
     * Used to control the viewport
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
     * - set config.hideControls = true (if undefined)
     * - set config.fitViewConfig.abideMinMaxZoom = false (if undefined)
     * - do not attach any pointer/key listeners
     * - disable pointer events on nodes & edges to prevent CSS hover effects
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
    nodes: Nodes<N>
    edges: Edges<E>
    selection: Selection
}

export interface UncontrolledGraphProps<N, E> extends CommonGraphProps {
    defaultNodes?: NodeData<N>[]
    defaultEdges?: EdgeData<E>[]
}