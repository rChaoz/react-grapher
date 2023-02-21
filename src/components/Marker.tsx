import React, {forwardRef, useContext} from "react";
import {GrapherContext} from "../context/GrapherContext";

// SVG props with ID required
export type MarkerProps = React.ComponentPropsWithoutRef<"marker"> & { id: string }

/**
 * When passing custom markers to ReactGrapher, you must use this component instead of the standard `<marker>`. The difference is that ReactGrapher, in order to
 * avoid ID conflicts, prepends its own ID to every child element ID. This component will prepend the ID of the parent ReactGrapher to the provided ID to ensure
 * ReactGrapher will find it.
 *
 * Instead of using this component, you could handle the ID prepending yourself:
 *
 * ```tsx
 * // These 2 are identical
 * <ReactGrapher id="graph1" {...otherProps} customMarkers={<Marker id={"marker1"}>}/>
 * <ReactGrapher id="graph1" {...otherProps} customMarkers={<marker id={"graph1-marker1"}>}/>
 * ```
 *
 * Then, you can have edges use this custom marker:
 *
 * ```tsx
 * const edge = {id: "0", source: "...", target: "...", markerStart: "marker1"}
 * ```
 */
export const Marker = forwardRef<SVGMarkerElement, MarkerProps>(function Marker(props, ref) {
    const baseID = useContext(GrapherContext).id
    return <marker ref={ref} {...props} id={`${baseID}-${props.id}`}/>
})