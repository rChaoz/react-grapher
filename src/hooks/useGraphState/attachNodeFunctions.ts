import {Node, NodeImpl, NodesFunctionsImpl, NodesImpl} from "../../data/Node";
import React from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";
import {errorUnknownNode} from "../../util/log";
import {BaseFunctionsImpl, createBaseFunctions} from "./baseFunctions";

// TODO DRY this code
export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>,
                                               map: Map<string, Node<T>>): NodesImpl<T> {
    const base = createBaseFunctions(nodes, setNodes, selection, setSelection, map)
    const extra: Omit<NodesFunctionsImpl<T>, keyof BaseFunctionsImpl<T>> = {
        absolute(node: Node<any> | string): DOMPoint {
            if (typeof node === "string") {
                const n = map.get(node)
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
            const n = nodes.slice()
            let changed = false
            for (const change of changes) {
                if (!isNodeChange(change)) continue
                changed = true
                if (change.type == "node-move") change.node.position = change.position
            }
            if (changed) setNodes(n)
        },
    }
    return Object.assign(nodes as NodeImpl<T>[], base, extra)
}