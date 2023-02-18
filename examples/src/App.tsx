import React from 'react';
import {ReactGrapher} from "reactgrapher";
import "reactgrapher/dist/default-style.css"
import "./App.css"

export default function App() {
    return <div style={{
        width: "800px",
        marginInline: "auto",
    }}>
        <div style={{
            height: 400,
        }}>
            <ReactGrapher defaultNodes={[
                {id: "0", x: 0, y: 0, data: "0"},
                {id: "1", x: 0, y: 100, data: "1"},
                {id: "2", x: 100, y: 0, data: "2"},
                {id: "3", x: 100, y: 100, data: "3"},
            ]} defaultEdges={[
                {id: "0", source: "0", target: "1", label: "hehe", markerStart: "arrow", markerEnd: "arrow-filled"},
                {id: "1", source: "0", target: "2", label: "hihi", markerEnd: "arrow"},
                {id: "2", source: "3", target: "2", markerEnd: "arrow"},
            ]}/>
        </div>
    </div>
}
