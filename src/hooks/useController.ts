import {useState} from "react";
import {Viewport} from "../data/Viewport";
import {Controller, ControllerImpl} from "../data/Controller";

/**
 * A Controller is a collection of states. Use this to obtain a `Controller` instance that you can pass to a `ReactGrapher`. Then, you can call
 * functions on this instance to control the `ReactGrapher`.
 */
export function useController(): Controller {
    const [fitView, setFitView] = useState(0)
    const [viewport, setViewport] = useState<Viewport>({ centerX: 0, centerY: 0, zoom: 1 })

    // noinspection UnnecessaryLocalVariableJS
    const controller: ControllerImpl = {
        fitViewValue: fitView,
        viewport: viewport,
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
        }
    }
    return controller
}