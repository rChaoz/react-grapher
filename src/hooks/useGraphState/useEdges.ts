import {useMemo} from "react";
import {EdgeData, EdgeImpl, EdgesFunctionsImpl, EdgesImpl} from "../../data/Edge";
import {GrapherChange, isEdgeChange} from "../../data/GrapherChange";
import {BaseFunctionsImpl, useBase} from "./useBase";

export default function useEdges<T>(initialEdges: EdgeImpl<T>[]): EdgesImpl<T> {
    const base = useBase<EdgeImpl<T>, EdgeData<T>>(initialEdges)
    const extra = useMemo<Omit<EdgesFunctionsImpl<T>, keyof BaseFunctionsImpl<EdgeImpl<T>, EdgeData<T>>>>(() => ({
        processChanges(changes: GrapherChange[]) {
            const e = base.slice()
            let changed = false
            for (const change of changes) {
                if (!isEdgeChange(change)) continue
                changed = true
                // TODO
            }
            if (changed) base.set(e)
        },
    }), [base])
    return Object.assign(base, extra)
}