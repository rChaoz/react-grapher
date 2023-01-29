import {Node, Nodes, NodesFunctions} from "../../data/Node";
import React from "react";
import {GraphChange, NodeChange, NodeDragChange} from "../../data/GraphChange";

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
        processChanges(changes: GraphChange[]) {
            const n = nodes.slice()
            for (const change of changes) {
                if (!isNodeChange(change)) continue
                if (isDragChange(change)) change.node.position = change.position
            }
            setNodes(n)
        },
    }
    return Object.assign(nodes, functions)
}

function isNodeChange(change: GraphChange): change is NodeChange<any> {
    return "node" in change
}

function isDragChange(change: NodeChange<any>): change is NodeDragChange<any> {
    return change.type === "node-drag"
}