import {Node, Nodes} from "../../model/Node";
import React from "react";

export default function attachNodeFunctions<T>(nodes: Node<T>[], setNodes: React.Dispatch<React.SetStateAction<Node<T>[]>>) {
    const n = nodes as Nodes<T>
    n.clear = () => setNodes([])
    n.set = newNodes => setNodes(newNodes)
    n.add = newNode => setNodes(nodes => nodes.concat(newNode))
    n.update = mapFunc => setNodes(nodes => {
        const newNodes: Node<T>[] = []
        for (const node of nodes) {
            const r = mapFunc(node)
            if (r != null) newNodes.push(r)
        }
        return newNodes
    })
    n.replace = (targetNodeID, replacement) => n.update(node => {
        if (node.id === targetNodeID) {
            if (typeof replacement === "function") replacement(node)
            else return replacement
        } else return node
    })
}