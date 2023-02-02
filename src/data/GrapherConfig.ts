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

export interface GrapherConfig {
    /**
     * Whether the user can control the viewport (panning, zoom in & out). Possible values:
     * - undefined / true (all controls are allowed, with default values)
     * - false (no controls are allowed)
     * - object to fine tune the controls
     */
    viewportControls?: true | false | GrapherViewportControls
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
     * Bounds for the viewport (in pixels). Defaults to a 10000 by 10000 square with x=-5000px and y=-5000. For most cases this shouldn't be changed, but
     * you can make this bigger if nodes are at positions outside this square and are getting clipped / hidden.
     */
    viewportRect?: DOMRect
}

export interface GrapherConfigSet {
    viewportControls: Required<GrapherViewportControls>
    userControls: Required<GrapherUserControls>
    fitViewConfig: GrapherFitViewConfigSet
    viewportBounds: DOMRect
}

export type GrapherFitViewConfigSet = Required<GrapherFitViewConfig>

// TODO Replace this madness with Object.assign maybe?
export function withDefaultConfig(config: GrapherConfig | undefined): GrapherConfigSet {
    if (config == null) return {
        viewportControls: {minZoom: .4, maxZoom: 4, allowPanning: true, allowZooming: true},
        userControls: {
            allowSelection: true, multipleSelection: true, allowMovingNodes: true, allowDeletingNodes: false,
            allowEditingEdges: false, allowDeletingEdges: false, allowCreatingEdges: false,
        },
        fitViewConfig: withDefaultFitViewConfig(undefined),
        viewportBounds: new DOMRect(-5000, -5000, 10000, 10000),
    }; else return {
        viewportControls: config.viewportControls === false ? {
            minZoom: .4, maxZoom: 4, allowPanning: false, allowZooming: false
        } : typeof config.viewportControls === "object" ? {
            minZoom: config.viewportControls.minZoom ?? .4,
            maxZoom: config.viewportControls.maxZoom ?? 4,
            allowPanning: config.viewportControls.allowPanning ?? true,
            allowZooming: config.viewportControls.allowZooming ?? true,
        } : {
            minZoom: .4, maxZoom: 4, allowPanning: true, allowZooming: true
        },
        userControls: config.userControls === false ? {
            allowSelection: false, multipleSelection: false, allowMovingNodes: false, allowDeletingNodes: false,
            allowEditingEdges: false, allowDeletingEdges: false, allowCreatingEdges: false,
        } : {
            allowSelection: config.userControls?.allowSelection ?? true,
            multipleSelection: config.userControls?.multipleSelection ?? true,
            allowMovingNodes: config.userControls?.allowMovingNodes ?? true,
            allowDeletingNodes: config.userControls?.allowDeletingNodes ?? false,
            allowEditingEdges: config.userControls?.allowEditingEdges ?? false,
            allowDeletingEdges: config.userControls?.allowDeletingEdges ?? false,
            allowCreatingEdges: config.userControls?.allowCreatingEdges ?? false,
        },
        fitViewConfig: withDefaultFitViewConfig(config.fitViewConfig),
        viewportBounds: new DOMRect(-5000, -5000, 10000, 10000),
    }
}

export function withDefaultFitViewConfig(config: GrapherFitViewConfig | undefined): GrapherFitViewConfigSet {
    if (config == null) return {padding: "5%", abideMinMaxZoom: true}
    else return {
        padding: config.padding ?? "5%",
        abideMinMaxZoom: config.abideMinMaxZoom ?? true,
    }
}