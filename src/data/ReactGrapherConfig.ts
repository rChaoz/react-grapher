export interface ReactGrapherViewportControls {
    /**
     * Minimum zoom allowed by user input. If minZoom == maxZoom, user cannot use the zoom function. Defaults to .25
     */
    minZoom?: number
    /**
     * Maximum zoom allowed by user input. If minZoom == maxZoom, user cannot use the zoom function. Defaults to 4
     */
    maxZoom?: number
    /**
     * Whether the user can pan the viewport. Defaults to true
     */
    allowPanning?: boolean
}

export interface ReactGrapherUserControls {
    /**
     * Allows the user to select nodes. Defaults to true
     */
    allowSelection?: boolean
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

export interface ReactGrapherConfig {
    /**
     * Whether the user can control the viewport (panning, zoom in & out). Possible values:
     * - undefined / true (all controls are allowed, with default values)
     * - false (no controls are allowed)
     * - object to fine tune the controls
     */
    viewportControls?: true | false | ReactGrapherViewportControls
    /**
     * Controls how the user may change the graph. Possible values:
     * - undefined - same as empty object (default values) - user may select and move nodes
     * - false - user cannot modify the graph (disable all controls)
     * - object to fine tune the controls. Note that (almost) all options listed here can be individually overridden for each Node/Edge.
     */
    userControls?: false | ReactGrapherUserControls
}

export interface ReactGrapherConfigSet {
    viewportControls: Required<ReactGrapherViewportControls>
    userControls: Required<ReactGrapherUserControls>
}

export function useDefaults(config: ReactGrapherConfig | undefined): ReactGrapherConfigSet {
    if (config == null) return {
        viewportControls: {minZoom: .25, maxZoom: 4, allowPanning: true},
        userControls: {
            allowSelection: true, allowMovingNodes: true, allowDeletingNodes: false,
            allowEditingEdges: false, allowDeletingEdges: false, allowCreatingEdges: false,
        }
    }; else return {
        viewportControls: config.viewportControls === false ? {
            minZoom: 1, maxZoom: 1, allowPanning: false
        } : typeof config.viewportControls === "object" ? {
            minZoom: config.viewportControls.minZoom ?? .25,
            maxZoom: config.viewportControls.maxZoom ?? 4,
            allowPanning: config.viewportControls.allowPanning ?? true,
        } : {
            minZoom: .25, maxZoom: 4, allowPanning: true
        },
        userControls: config.userControls === false ? {
            allowSelection: false, allowMovingNodes: false, allowDeletingNodes: false,
            allowEditingEdges: false, allowDeletingEdges: false, allowCreatingEdges: false,
        } : {
            allowSelection: config.userControls?.allowSelection ?? true,
            allowMovingNodes: config.userControls?.allowMovingNodes ?? true,
            allowDeletingNodes: config.userControls?.allowDeletingNodes ?? false,
            allowEditingEdges: config.userControls?.allowEditingEdges ?? false,
            allowDeletingEdges: config.userControls?.allowDeletingEdges ?? false,
            allowCreatingEdges: config.userControls?.allowCreatingEdges ?? false,
        }
    }
}