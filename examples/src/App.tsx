import React from 'react';
import {createTextNode, ReactGrapher} from "reactgrapher";
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
                createTextNode("BIG if true?"),
                createTextNode("..small if true :(", {x: 0, y: 100, isAbsolute: true}),
            ]} defaultEdges={[]}/>
        </div>
    </div>
}
