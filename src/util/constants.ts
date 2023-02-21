/*
 * Document class names & IDs
 * React Grapher:           .react-grapher
 * > Viewport:              .react-grapher-viewport
 * > > Nodes container:     .react-grapher-nodes
 * > > > Node:              .react-grapher-node#react-grapher-node-<NODE_ID>
 */

export const REACT_GRAPHER_CLASS = "react-grapher"
export const VIEWPORT_CLASS = "react-grapher-viewport"
export const CONTENT_CLASS = "react-grapher-content"
export const NODES_CLASS = "react-grapher-nodes"
export const EDGES_CLASS = "react-grapher-edges"

export const NODE_CLASS = "react-grapher-node"
export const NODE_HANDLE_CLASS = "react-grapher-node-handle"

export const EDGE_CLASS = "react-grapher-edge"
export const EDGE_PATH_CLASS = "react-grapher-edge-path"
export const EDGE_LABEL_CLASS = "react-grapher-edge-label"
export const EDGE_LABEL_BACKGROUND_CLASS = "react-grapher-edge-label-background"

export const MARKER_ARROW_ID = "arrow"
export const MARKER_ARROW_FILLED_ID = "arrow-filled"
export const MARKER_ARROW_CLASS = "react-grapher-marker-arrow"
export const MARKER_ARROW_FILLED_CLASS = "react-grapher-marker-arrow-filled"

export const Z_INDEX_BACKGROUND = 1
export const Z_INDEX_INTERFACE = 7
/**
 * 5 if config option "nodesOverEdges" is enabled
  */
export const Z_INDEX_NODE = 3
export const Z_INDEX_GRABBED_NODE = 6
/**
 * 3 if config option "nodesOverEdges" is enabled
 */
export const Z_INDEX_EDGES = 5