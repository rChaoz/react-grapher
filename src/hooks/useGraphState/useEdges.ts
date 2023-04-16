import {GrapherChange, isEdgeChange} from "../../data/GrapherChange";
import {useBase} from "./useBase";
// 'Edges' is used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {NewEdge, EdgeImpl, Edges, EdgesImpl} from "../../data/Edge";

/**
 * Returns a stateful array object representing the edges of a ReactGrapher. This function does not also return a setter for the state; to modify it,
 * use the functions attached to the returned object, such as `.set()`, `.add()`, `.clear()`.
 * @see Edges
 */
export default function useEdges<T>(initialEdges: EdgeImpl<T>[]): EdgesImpl<T> {
    const base = useBase<EdgeImpl<T>, NewEdge<T>>(initialEdges)
    return Object.assign(base, {
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
    })
}