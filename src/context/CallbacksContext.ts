import React from "react";

export interface CallbacksContextValue {
    onObjectPointerDown(event: PointerEvent): void
    onObjectPointerUp(event: PointerEvent): void
}

export const CallbacksContext = React.createContext<CallbacksContextValue>({onObjectPointerDown: null as any, onObjectPointerUp: null as any})