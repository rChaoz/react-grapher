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
                createTextNode("BIG if true?", new DOMPoint(0, 0), "1"),
                createTextNode("..small if true :(", new DOMPoint(0, 100), "2"),
            ]} defaultEdges={[createSimpleEdge("1", "2")]}/>
        </div>
    </div>
}
