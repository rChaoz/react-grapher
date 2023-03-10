import {Viewport} from "./Viewport";

export interface Controller {
    fitView(): void,
    /**
     * Do not modify the returned Viewport. Instead, call `setViewport` or `updateViewport`.
     */
    getViewport(): Viewport

    /**
     * Update the viewport information.
     */
    setViewport(newViewport: Viewport): void

    /**
     * Update the viewport partially. Missing values will not be modified.
     */
    updateViewport(changes: Partial<Viewport>): void
}

export interface ControllerImpl extends Controller {
    fitViewValue: number
    viewport: Viewport
}