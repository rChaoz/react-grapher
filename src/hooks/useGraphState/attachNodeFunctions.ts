import {Node, Nodes, NodesFunctions} from "../../data/Node";
import React from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";

export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>): Nodes<T> {
    const functions: NodesFunctions<T> = {
        selection,
        multipleSelection: false,
        setSelection(selected: string[]) {
            setNodes(nodes.slice())
            setSelection(selected)
            for (const node of nodes) node.selected = selected.includes(node.id)
        },
        setSelected(node: string, selected: boolean, newSelection?: boolean) {
            if (selected && (!this.multipleSelection || newSelection)) return this.setSelection([node])
            const index = selection.indexOf(node)
            if (index != -1) {
                if (!selected) this.setSelection(selection.slice(0, index).concat(selection.slice(index + 1)))
            } else {
                if (selected) this.setSelection(selection.concat(node))
            }
        },
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
            setNodes(nodes => nodes.concat(newNode))
        },
        update(mapFunc: (node: Node<T>) => (Node<T> | null | undefined)) {
            setNodes(nodes => {
                const newNodes: Node<T>[] = []
                for (const node of nodes) {
                    const r = mapFunc(node)
                    if (r != null) newNodes.push(r)
                }
                return newNodes
            })
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