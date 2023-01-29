export interface ReactGrapherConfig {
    /**
     * Whether the user can control the viewport (panning, zoom in & out). Possible values:
     * - undefined / true (all controls are allowed, with default values)
     * - false (no controls are allowed)
     * - object to fine tune the controls
     */
    viewportControls?: true | false | {
        /**
         * Minimum zoom allowed by user input. If minZoom == maxZoom, user cannot use the zoom function. Defaults to .25
         */
        minZoom?: number
        /**
         * Maximum zoom allowed by user input. If minZoom == maxZoom, user cannot use the zoom function. Defaults to 3
         */
        maxZoom?: number
        /**
         * Whether the user can pan the viewport. Defaults to true
         */
        allowPanning?: boolean
    }
    /**
     * Controls how the user may change the graph. Possible values:
     * - undefined - same as empty object (default values) - user may move nodes
     * - false - user cannot modify the graph
     * - object to fine tune the controls. Note that (almost) all options listed here can be individually overridden for each Node/Edge.
     */
    userControls?: false | {
        /**
         * Allows the user to select multiple nodes. Defaults to true
         */
        allowMultipleSelection?: boolean
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
}