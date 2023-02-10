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

const noViewportControls =  {
    minZoom: .4,
    maxZoom: 4,
    allowPanning: false,
    allowZooming: false,
}

function withDefaultsViewportControls(controls: GrapherViewportControls | boolean | undefined): Required<GrapherViewportControls> {
    if (controls === true || controls === undefined) return defaultViewportControls
    else if (controls === false) return noViewportControls
    else return {...defaultViewportControls, ...controls}
}

export interface GrapherUserControls {
    /**
     * Allows the user to select nodes. Defaults to true
     */
    allowSelection?: boolean
    /**
     * Allows selecting multiple nodes. Defaults to true
     */
    multipleSelection?: boolean
    /**
     * Allow moving nodes around. Defaults to true
     */
    allowMovingNodes?: boolean
    /**
     * Allow deletion of nodes. Deleting a node also deletes all edges that connect to it. Defaults to false
     */
    allowDeletingNodes?: boolean
    // TODO Options to allow creating new nodes
    /**
     * Allow editing (reassignment) of edges. Defaults to false
     */
    allowEditingEdges?: boolean
    /**
     * Allow deleting edges. Defaults to false
     */
    allowDeletingEdges?: boolean
    /**
     * Allow creating new edges. Defaults to false
     */
    allowCreatingEdges?: boolean
}

const defaultUserControls = {
    allowSelection: true,
    multipleSelection: true,
    allowMovingNodes: true,
    allowDeletingNodes: false,
    allowEditingEdges: false,
    allowDeletingEdges: false,
    allowCreatingEdges: false,
}

const noUserControls = {
    allowSelection: false,
    multipleSelection: false,
    allowMovingNodes: false,
    allowDeletingNodes: false,
    allowEditingEdges: false,
    allowDeletingEdges: false,
    allowCreatingEdges: false,
}

function withDefaultsUserControls(controls: GrapherUserControls | false | undefined): Required<GrapherUserControls> {
    if (controls === undefined) return defaultUserControls
    else if (controls === false) return noUserControls
    else return {...defaultUserControls, ...controls}
}

export interface GrapherFitViewConfig {
    /**
     * Any CSS string applicable to the "padding" CSS property. This padding will be resolved and used when fitting view to space the nodes/edges away from
     * the edges of the ReactGrapher. Defaults to "10%".
     */
    padding?: string,
    /**
     * Whether to take minZoom and maxZoom (from viewportControls) when fitting view. If false and user zooming is enabled, the zoom value might
     * get a snap effect upon user zooming if the zoom value was outside limits. Defaults to true.
     */
    abideMinMaxZoom?: boolean
    // TODO Animation, other options
}

const defaultFitViewConfig = {
    padding: "10%",
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
}

export interface GrapherConfigSet {
    viewportControls: Required<GrapherViewportControls>
    userControls: Required<GrapherUserControls>
    fitViewConfig: GrapherFitViewConfigSet
    nodesOverEdges: boolean
}

export type GrapherFitViewConfigSet = Required<GrapherFitViewConfig>

export function withDefaultsConfig(config: GrapherConfig | undefined): GrapherConfigSet {
    return {
        viewportControls: withDefaultsViewportControls(config?.viewportControls),
        userControls: withDefaultsUserControls(config?.userControls),
        fitViewConfig: withDefaultsFitViewConfig(config?.fitViewConfig),
        nodesOverEdges: config?.nodesOverEdges ?? false,
    }
}