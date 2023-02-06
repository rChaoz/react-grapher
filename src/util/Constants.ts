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
export const NODE_CLASS = "react-grapher-node"

// Flipped if config option "nodesOverEdges" is enabled
export const Z_INDEX_BACKGROUND = 1
export const Z_INDEX_INTERFACE = 7
export const Z_INDEX_NODES = 3
export const Z_INDEX_EDGES = 5