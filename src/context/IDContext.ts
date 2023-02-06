import React from "react";

/**
 * Context for the ReactGrapher's ID. This is used because, if there are 2 different ReactGraphers in one page, 2 nodes might have the same DOM ID,
 * which is an issue. To fix this, each Node (or any other element that needs a DOM ID) will have its ID prepended with the owning ReactGrapher ID, which cannot
 * be empty (if not provided, a random ID is used).
 */
export default React.createContext<string>("react-grapher")