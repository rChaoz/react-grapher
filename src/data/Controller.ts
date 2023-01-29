import {useState} from "react";
import {Viewport} from "./Viewport";

export interface Controller {
    fitView(): void,

    /**
     * Do not modify the returned Viewport. Instead, call `setViewport` with a new Viewport
     */
    getViewport(): Viewport
    setViewport(newViewport: Viewport): void
}

export interface ControllerImpl extends Controller {
    fitViewValue: number
    viewport: Viewport
}

export function useController(): Controller {
    const [fitView, setFitView] = useState(0)
    const [viewport, setViewport] = useState<Viewport>({ translateX: 0, translateY: 0, scale: 1 })

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
    }
    return controller
}