import {Node, Nodes, NodesFunctions} from "../../data/Node";
import React from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";

export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>): Nodes<T> {
    const functions: NodesFunctions<T> = {
        clear() {
            setNodes([])
        },
        get(id: string): Node<T> | undefined {
            return nodes.find(node => node.id === id)
        },
        set(newNodes: Node<T>[]) {
            setNodes(newNodes)
        },
        add(newNode: Node<T> | Node<T>[]) {
            setNodes(nodes.concat(newNode))
        },
        update(mapFunc: (node: Node<T>) => (Node<T> | null | undefined)) {
            const newNodes: Node<T>[] = []
            for (const node of nodes) {
                const r = mapFunc(node)
                if (r != null) newNodes.push(r)
            }
            setNodes(newNodes)
        },
        replace(targetID: string, replacement?: Node<T> | (<T>(node: Node<T>) => (Node<T> | null | undefined)) | null) {
            this.update(node => {
                if (node.id === targetID) {
                    if (typeof replacement === "function") replacement(node)
                    else return replacement
                } else return node
            })
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
    return Object.assign(nodes, functions)
}