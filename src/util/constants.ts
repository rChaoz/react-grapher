/*
 * Document class names & IDs
 * React Grapher:           .react-grapher
 * > Viewport:              .react-grapher-viewport
 * > > Nodes container:     .react-grapher-nodes
 * > > > Node:              .react-grapher-node#react-grapher-node-<NODE_ID>
 */


export const BACKGROUND_CLASS = "react-grapher-background"


export const REACT_GRAPHER_CLASS = "react-grapher"
export const VIEWPORT_CLASS = "react-grapher-viewport"
export const CONTENT_CLASS = "react-grapher-content"
export const NODES_CLASS = "react-grapher-nodes"
export const EDGES_CLASS = "react-grapher-edges"



export const NODE_CONTAINER_CLASS = "react-grapher-node-container"
export const NODE_CLASS = "react-grapher-node"
export const NODE_HANDLE_CLASS = "react-grapher-node-handle"
export const NODE_HANDLE_CONTAINER_CLASS = "react-grapher-node-handle-container"
export const NODE_HANDLE_BOX_CLASS = "react-grapher-node-handle-box"


export const EDGE_CLASS = "react-grapher-edge"
export const EDGE_PATH_CLASS = "react-grapher-edge-path"
export const EDGE_HANDLE_CLASS = "react-grapher-edge-handle" // TODO Handle source & target

export const EDGE_LABEL_CLASS = "react-grapher-edge-label"
export const EDGE_LABEL_BACKGROUND_CLASS = "react-grapher-edge-label-background"

export const MARKER_ARROW_ID = "arrow"
export const MARKER_ARROW_FILLED_ID = "arrow-filled"
export const MARKER_ARROW_CLASS = "react-grapher-marker-arrow"
export const MARKER_ARROW_FILLED_CLASS = "react-grapher-marker-arrow-filled"

// Grapher context Z-Indices

export const Z_INDEX_BACKGROUND = 1
export const Z_INDEX_VIEWPORT = 5;
export const Z_INDEX_INTERFACE = 9;

// Viewport context Z-Indices. If config option "nodesOverEdges" is enabled, nodes & edges have their Z-Indices swapped


export const Z_INDEX_NODE = 3
export const Z_INDEX_HANDLE_BOX = 6
export const Z_INDEX_GRABBED_NODE = 6
export const Z_INDEX_EDGES = 5