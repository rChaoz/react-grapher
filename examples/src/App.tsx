import React from 'react';
import {ReactGrapher, createNode} from "reactgrapher";
import "reactgrapher/dist/default-style.css"

export default function App() {
    return <div style={{
        width: "800px",
        marginInline: "auto",
    }}>
        <div style={{
            outline: "1px red solid",
            height: 400,
        }}>
            <ReactGrapher defaultNodes={[
                createNode({
                    position: {x: 100, y: 100},
                    data: "BIG",
                })
            ]} defaultEdges={[]} />
        </div>
    </div>
}
