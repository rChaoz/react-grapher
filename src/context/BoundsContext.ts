import React from "react";

/**
 * To have the 0,0 point at the center of the Graph, we move the content div by 50%, 50%, to place it's top-left point in the middle.
 * This works, but it's difficult to allow negative x, y values for nodes & SVG content. Also, nodes that are outside the content div will have
 * their text wrapped. So, we use the bounds to shift all nodes towards bottom-right to make sure the top-left-most point in the Graph has positive coordinates.
 * Then, we shift the content-div towards top-left to bring the 0,0 point back in the center of the Graph. This context holds the bounding rect to allow this.
 */
export const BoundsContext = React.createContext<DOMRect>(new DOMRect())