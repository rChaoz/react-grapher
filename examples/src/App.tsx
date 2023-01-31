import React from 'react';
import {createTextNode, ReactGrapher, useController} from "reactgrapher";
import "reactgrapher/dist/default-style.css"
import "./App.css"

export default function App() {
    const controller = useController()

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
            ]} defaultEdges={[]} fitView={"initial"} controller={controller} onEvent={event => {
                if (event.type === "node" && event.action === "click") {
                    console.log("CLICK")
                    controller.fitView()
                }
            }}/>
        </div>
    </div>
}
