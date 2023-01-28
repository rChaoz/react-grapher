import React from 'react';
import {ReactGrapher} from "../../src";

export default function App() {
    return <div style={{
        width: "800px",
        marginInline: "auto",
    }}>
        <div style={{
            height: 400,
        }}>
            <ReactGrapher defaultNodes={} defaultEdges={} />
        </div>
    </div>
}
