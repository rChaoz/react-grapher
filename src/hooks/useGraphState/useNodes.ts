import {GrapherChange, isNodeChange} from "../../data/GrapherChange";
import {errorUnknownNode} from "../../util/log";
import {useBase} from "./useBase";
// 'Nodes' is used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Node, NewNode, NodeImpl, Nodes, NodesImpl} from "../../data/Node";

/**
 * Returns a stateful array object representing the nodes of a ReactGrapher. This function does not also return a setter for the state; to modify it,
 * use the functions attached to the returned object, such as `.set()`, `.add()`, `.clear()`.
 * @see Nodes
 */
export default function useNodes<T>(initialNodes: NodeImpl<T>[]): NodesImpl<T> {
    const base = useBase<NodeImpl<T>, NewNode<T>>(initialNodes)
    return Object.assign(base, {
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
                switch (change.subType) {
                    case "new":
                        n.push(change.node as NodeImpl<T>)
                        break
                    case "move":
                        change.node.position = change.position
                        break
                }
            }
            if (changed) base.set(n)
        },
    })
}