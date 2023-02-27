import {Node, NodeData, NodeImpl, NodesFunctionsImpl, NodesImpl} from "../../data/Node";
import {useMemo} from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";
import {errorUnknownNode} from "../../util/log";
import {BaseFunctionsImpl, useBase} from "./useBase";

export default function useNodes<T>(initialNodes: NodeImpl<T>[]): NodesImpl<T> {
    const base = useBase<NodeImpl<T>, NodeData<T>>(initialNodes)
    const extra = useMemo<Omit<NodesFunctionsImpl<T>, keyof BaseFunctionsImpl<NodeImpl<T>, NodeData<T>>>>(() => ({
        absolute(node: Node<any> | string): DOMPoint {
            if (typeof node === "string") {
                const n = base.internalMap.get(node)
                if (n == null) {
                    errorUnknownNode(node)
                    return new DOMPoint(0, 0)
                } else node = n
            }
            if (node.parent == null) return node.position
            else {
                const parent = this.absolute(node.parent)
                return new DOMPoint(node.position.x + parent.x, node.position.y + parent.y)
            }
        },
        processChanges(changes: GrapherChange[]) {
            const n = base.slice()
            let changed = false
            for (const change of changes) {
                if (!isNodeChange(change)) continue
                changed = true
                if (change.type == "node-move") change.node.position = change.position
            }
            if (changed) base.set(n)
        },
    }), [base])
    return Object.assign(base, extra)
}