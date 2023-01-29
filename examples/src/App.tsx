import React from 'react';
import {ReactGrapher, createTextNode} from "reactgrapher";
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
                createTextNode("BIG if true?")
            ]} defaultEdges={[]} />
        </div>
    </div>
}