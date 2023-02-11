import React from 'react';
import {createTextNode, createSimpleEdge, ReactGrapher} from "reactgrapher";
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
                createTextNode("0", new DOMPoint(0, 0), "0"),
                createTextNode("1", new DOMPoint(0, 100), "1"),
                createTextNode("2", new DOMPoint(100, 0), "2"),
                createTextNode("3", new DOMPoint(100, 100), "3"),
            ]} defaultEdges={[createSimpleEdge("0", "1"), createSimpleEdge("0", "2"), createSimpleEdge("3", "2")]}/>
        </div>
    </div>
}
