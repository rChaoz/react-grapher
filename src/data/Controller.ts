import {Viewport} from "./Viewport";

export interface Controller {
    fitView(): void,
    /**
     * Do not modify the returned Viewport. Instead, call `setViewport` with a new Viewport
     */
    getViewport(): Viewport

    /**
     * Update the viewport information, such as zoom or center point.
     */
    setViewport(newViewport: Viewport): void
}

export interface ControllerImpl extends Controller {
    fitViewValue: number
    viewport: Viewport
}