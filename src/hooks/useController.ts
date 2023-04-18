import {useMemo, useState} from "react";
import {Viewport} from "../data/Viewport";
import {Controller, ControllerImpl, InProgressEdge, NewInProgressEdge} from "../data/Controller";
import {applyEdgeDefaults, NewEdge} from "../data/Edge";

/**
 * A Controller is a collection of states. Use this to obtain a `Controller` instance that you can pass to a `ReactGrapher`. Then, you can call
 * functions on this instance to control the `ReactGrapher`.
 */
export function useController(): Controller {
    const [fitView, setFitView] = useState(0)
    const [viewport, setViewport] = useState<Viewport>({ centerX: 0, centerY: 0, zoom: 1 })

    const [inProgressEdge, setInProgressEdge] = useState<InProgressEdge | null>(null)

    return useMemo<ControllerImpl>(() => ({
        fitViewValue: fitView,
        viewport,
        inProgressEdge,
        edgeDefaults: null as any, // this will be set by ReactGrapher
        // Viewport stuff
        fitView() {
            setFitView(value => value + 1)
        },
        getViewport(): Viewport {
            return viewport
        },
        setViewport(newViewport: Viewport) {
            setViewport(newViewport)
        },
        updateViewport(changes: Partial<Viewport>) {
            setViewport({
                zoom: changes.zoom ?? viewport.zoom,
                centerX: changes.centerX ?? viewport.centerX,
                centerY: changes.centerY ?? viewport.centerY,
            })
        },
        // New nodes/edges stuff
        getInProgressEdge(): InProgressEdge | null {
            return inProgressEdge
        },
        setInProgressEdge(edge: InProgressEdge | NewInProgressEdge | null) {
            if (edge != null) {
                applyEdgeDefaults(edge as NewEdge, this.edgeDefaults)
            }
            setInProgressEdge(edge as InProgressEdge)
        },
    }), [fitView, viewport, inProgressEdge])
}