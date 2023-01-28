import {useState} from "react";

export interface Controller {
    fitView(): void
}

export interface ControllerImpl extends Controller {
    fitViewValue: number
}

export function useController(): ControllerImpl {
    const [fitView, setFitView] = useState(0)

    return {
        fitViewValue: fitView,
        fitView() {
            setFitView(value => value + 1)
        },
    }
}