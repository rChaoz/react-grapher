import {NodeDefaults} from "./Node";
import {EdgeDefaults} from "./Edge";
import {Property} from "csstype";

export interface GrapherViewportControls {
    /**
     * Minimum zoom allowed by user input. Defaults to .4
     */
    minZoom?: number
    /**
     * Maximum zoom allowed by user input. Defaults to 4
     */
    maxZoom?: number
    /**
     * Whether the user can pan the viewport. Defaults to true
     */
    allowPanning?: boolean
    /**
     * Whether the user can zoom the viewport. Defaults to true
     */
    allowZooming?: boolean
}

const defaultViewportControls = {
    minZoom: .4,
    maxZoom: 4,
    allowPanning: true,
    allowZooming: true,
}

const noViewportControls = {
    minZoom: .4,
    maxZoom: 4,
    allowPanning: false,
    allowZooming: false,
}

function withDefaultsViewportControls(controls: GrapherViewportControls | boolean | undefined): GrapherViewportControlsSet {
    if (controls === true || controls === undefined) return defaultViewportControls
    else if (controls === false) return noViewportControls
    else return {...defaultViewportControls, ...controls}
}

export interface GrapherUserControls {
    /**
     * Allows the user to select nodes or edges. Defaults to true
     */
    allowSelection?: boolean
    /**
     * Allows selecting multiple nodes or edges. Defaults to true
     */
    multipleSelection?: boolean
    /**
     * Minimum amount, in pixels, that the pointer must travel after a down event, before a move event being registered and a click event becoming impossible.
     *
     * In other words: if the user taps a node but during the tap the pointer moves by just a pixel, without this a click wouldn't be registered, and the node
     * would be moved (dragged) instead. Defaults to 5.
     */
    minimumPointerMovement?: number
    /**
     * Delay allowed between clicks of a multi-click, in milliseconds.
     * Practically, maximum time between a pointerup event and the next pointerdown event, for the clicks to be counted as a multi-click.
     * Defaults to 500.
     */
    multiClickDelay?: number
    /**
     * How long a click must be held for it to count as a long-click, in milliseconds. A negative value long-click detection is disabled.
     * Defaults to 500.
     */
    longClickDelay?: number
    // TODO Options to allow creating new nodes
    // TODO Options to allow creating new edges
}

const defaultUserControls: Required<GrapherUserControls> = {
    allowSelection: true,
    multipleSelection: true,
    minimumPointerMovement: 5,
    multiClickDelay: 500,
    longClickDelay: 500,
}

const noUserControls: Required<GrapherUserControls> = {
    allowSelection: false,
    multipleSelection: false,
    minimumPointerMovement: 5,
    multiClickDelay: 500,
    longClickDelay: 500,
}

function withDefaultsUserControls(controls: GrapherUserControls | false | undefined): Required<GrapherUserControls> {
    if (controls === undefined) return defaultUserControls
    else if (controls === false) return noUserControls
    else return {...defaultUserControls, ...controls}
}

export interface GrapherFitViewConfig {
    /**
     * Any CSS string applicable to the "padding" CSS property (including multiple, eg. for top/right/bottom/left).
     * This padding will be resolved, then used when fitting view to space the nodes/edges away from the edges of the ReactGrapher. Defaults to "5%".
     */
    padding?: Property.Padding<number>,
    /**
     * Whether to take minZoom and maxZoom (from `viewportControls`) when fitting view. If false and user zooming is enabled, the zoom value might
     * get a snap effect upon user zooming if the zoom value was outside limits. Defaults to true.
     */
    abideMinMaxZoom?: boolean
    // TODO Animation, other options
}

const defaultFitViewConfig: GrapherFitViewConfigSet = {
    padding: "5%",
    abideMinMaxZoom: true,
}

export function withDefaultsFitViewConfig(config: GrapherFitViewConfig | undefined): GrapherFitViewConfigSet {
    if (config === undefined) return defaultFitViewConfig
    else return {...defaultFitViewConfig, ...config}
}

export interface GrapherConfig {
    /**
     * Whether the user can control the viewport (panning, zoom in & out). Possible values:
     * - undefined / true (all controls are allowed, with default values)
     * - false (no controls are allowed)
     * - object to fine tune the controls
     */
    viewportControls?: boolean | GrapherViewportControls
    /**
     * Controls how the user may change the graph. Possible values:
     * - undefined - same as empty object (default values) - user may select and move nodes
     * - false - user cannot modify the graph (disable all controls)
     * - object to fine tune the controls. Note that (almost) all options listed here can be individually overridden for each Node/Edge.
     */
    userControls?: false | GrapherUserControls
    /**
     * Settings used to control how fit view happens. Note that, the controller's `fitView()` also takes a `FitViewConfig` argument, where you can
     * override, if needed, the configuration set here.
     */
    fitViewConfig?: GrapherFitViewConfig
    /**
     * If true, nodes will have a higher Z-Index than edges (will render on top of them).
     * Defaults to false.
     */
    nodesOverEdges?: boolean
    /**
     * If true, all control buttons will be hidden, regardless of individual options for viewportControls/userControls.
     * Defaults to false.
     */
    hideControls?: boolean
    /**
     * Default config for a Node. When a new node is created, undefined fields will be set from this object.
     */
    nodeDefaults?: NodeDefaults
    /**
     * Default config for an Edge. When a new edge is created, undefined fields will be set from this object.
     */
    edgeDefaults?: EdgeDefaults
}

export interface GrapherConfigSet extends Required<Omit<GrapherConfig, "viewportControls" | "userControls" | "fitViewConfig">> {
    viewportControls: GrapherViewportControlsSet
    userControls: Required<GrapherUserControls>
    fitViewConfig: GrapherFitViewConfigSet
}

export type GrapherFitViewConfigSet = Required<GrapherFitViewConfig>
export type GrapherViewportControlsSet = Required<GrapherViewportControls>

export function withDefaultsConfig(config: GrapherConfig | undefined): GrapherConfigSet {
    return {
        viewportControls: withDefaultsViewportControls(config?.viewportControls),
        userControls: withDefaultsUserControls(config?.userControls),
        fitViewConfig: withDefaultsFitViewConfig(config?.fitViewConfig),
        nodesOverEdges: config?.nodesOverEdges ?? false,
        hideControls: config?.hideControls ?? false,
        nodeDefaults: config?.nodeDefaults ?? {},
        edgeDefaults: config?.edgeDefaults ?? {},
    }
}