import {Node, Nodes, NodesFunctions} from "../../data/Node";
import React from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";
import {unknownNode} from "../../util/log";

export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>): Nodes<T> {
    const functions: NodesFunctions<T> = {
        selection,
        multipleSelection: false,
        absolute(node: Node<any> | string): DOMPoint {
            if (typeof node === "string") {
                const n = this.get(node)
                if (n == null) {
                    unknownNode(node)
                    return new DOMPoint(0, 0)
                } else node = n
            }
            if (node.parent == null) return node.position
            else {
                const parent = this.absolute(node.parent)
                return new DOMPoint(node.position.x + parent.x, node.position.y + parent.y)
            }
        },
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
            for (const node of n) {
                const sel = selected.includes(node.id)
                node.hasChanged = node.selected != sel
                node.selected = sel
            }
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
            for (const node of newNodes) node.hasChanged = true
            setNodes(newNodes)
        },
        add(newNode: Node<T> | Node<T>[]) {
            if (Array.isArray(newNode)) for (const node of newNode) node.hasChanged = true
            else newNode.hasChanged = true
            setNodes(nodes => nodes.concat(newNode))
        },
        update(mapFunc: (node: Node<T>) => (Node<T> | null | undefined)) {
            setNodes(nodes => {
                const newNodes: Node<T>[] = []
                for (const node of nodes) {
                    const r = mapFunc(node)
                    if (r != null) {
                        if (r !== node) r.hasChanged = true
                        newNodes.push(r)
                    }
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
                if (change.type == "node-move") {
                    change.node.position = change.position
                    change.node.hasChanged = true
                }
            }
            if (changed) setNodes(n)
        },
    }
    return Object.assign(nodes, functions)
}