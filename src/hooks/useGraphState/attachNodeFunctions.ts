import {Node, Nodes, NodesFunctions} from "../../data/Node";
import React from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";

export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>): Nodes<T> {
    const functions: NodesFunctions<T> = {
        selection,
        multipleSelection: false,
        setSelection(selected: string[]) {
            // Compare selections before updating first. This prevents useless re-renders when deselecting all multiple times, double-clicking nodes etc.
            // This does not work if orders in arrays are different, but chance of this happening is practically 0
            if (selected.length === selection.length) {
                let changed = false
                for (let i = 0; i < selected.length; ++i) if (selected[i] != selection[i]) {
                    changed = true
                    break
                }
                if (!changed) return
            }

            // Update selected nodes. Slice is required because the 'Nodes' objects only updates on setSelection, not on setSelection
            setSelection(selected)
            const n = nodes.slice()
            for (const node of n) node.selected = selected.includes(node.id)
            setNodes(n)
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