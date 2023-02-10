import {Node, NodeImpl, NodesFunctionsImpl, NodesImpl} from "../../data/Node";
import React from "react";
import {GrapherChange, isNodeChange} from "../../data/GrapherChange";
import {errorUnknownNode} from "../../util/log";

export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>,
                                               map: Map<string, Node<T>>): NodesImpl<T> {
    const functions: NodesFunctionsImpl<T> = {
        selection,
        internalMap: map,
        multipleSelection: false,
        absolute(node: Node<any> | string): DOMPoint {
            if (typeof node === "string") {
                const n = this.get(node)
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
        getSelection(): string[] {
            return selection
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
            map.clear()
            setNodes([])
        },
        get(id: string): Node<T> | undefined {
            return map.get(id)
        },
        set(newNodes: Node<T>[]) {
            setNodes(newNodes)
            map.clear()
            for (const node of newNodes) map.set(node.id, node)
        },
        add(newNode: Node<T> | Node<T>[]) {
            if (Array.isArray(newNode)) for (const node of newNode) map.set(node.id, node)
            else map.set(newNode.id, newNode)
            setNodes(nodes => nodes.concat(newNode))
        },
        update(mapFunc: (node: Node<T>) => (Node<T> | null | undefined)) {
            setNodes(nodes => {
                const newNodes: Node<T>[] = []
                for (const node of nodes) {
                    const r = mapFunc(node)
                    if (r != null) {
                        if (r !== node) {
                            // Use != instead of !== just in case someone might use try to use integers as IDs
                            if (r.id != node.id) map.delete(node.id)
                            map.set(r.id, r)
                        }
                        newNodes.push(r)
                    }
                }
                return newNodes
            })
        },
        replace(targetID: string, replacement?: Node<T> | (<T>(node: Node<T>) => (Node<T> | null | undefined)) | null) {
            this.update(node => {
                if (node.id === targetID) return typeof replacement === "function" ? replacement(node) : replacement
                else return node
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
    return Object.assign(nodes as NodeImpl<T>[], functions)
}