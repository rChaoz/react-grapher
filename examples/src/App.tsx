import React from 'react';
import {GrapherConfig, EdgeData, NodeData, ReactGrapher, Background, SOURCE} from "reactgrapher";
import "reactgrapher/dist/default-style.css"
import "./App.css"

const nodes: NodeData[] = [
    {id: "0", position: new DOMPoint(0, 0), data: {label: "0", handles: [{position: "right", role: SOURCE}]}},
    {id: "1", position: new DOMPoint(0, 100), data: "1", resize: "both"},
    {id: "2", position: new DOMPoint(100, 0), data: {label: "2", handles: [{position: "bottom-right"}]}},
    {id: "3", position: new DOMPoint(200, 200), data: "3"},
]

const edges: EdgeData[] = [
    {id: "0", source: "1", target: "0", label: "hehe", markerStart: "arrow", markerEnd: "arrow-filled"},
    {id: "1", source: "0", target: "2", label: "hihi", markerEnd: "arrow", targetHandle: null},
    {id: "2", source: "3", target: "2", label: "a", markerEnd: "arrow", data: {type: "round"}},
    {id: "3", source: "2", target: "3", label: "b", markerEnd: "arrow", data: {type: "round"}},
]

const config: GrapherConfig = {
    nodeDefaults: {
        handlePointerEvents: true,
    },
    edgeDefaults: {
        labelShift: 4,
    }
}

export default function App() {
    return <div style={{
        width: 800,
        marginInline: "auto",
    }}>
        <div style={{
            height: 400,
        }}>
            <ReactGrapher defaultNodes={nodes} defaultEdges={edges} fitView={"initial"} config={config}>
                <Background/>
            </ReactGrapher>
        </div>
    </div>
}
