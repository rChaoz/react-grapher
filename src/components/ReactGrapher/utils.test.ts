import {describe, expect, it, jest} from "@jest/globals";
import {parseAllowedConnections, processDomElement} from "./utils";

const consoleError = jest.spyOn(console, "error").mockImplementation(() => {
    // empty
})

describe("parseAllowedConnections", () => {
    it("works for default config", () => {
        const expected = new Map([
            ["source", ["target"]],
        ])
        const map = parseAllowedConnections("source->target")
        expect(map).toEqual(expected)
        expect(map.sources).toEqual(new Set(["source"]))
        expect(map.targets).toEqual(new Set(["target"]))
    })

    it("works for -> direction", () => {
        const expected = new Map([
            ["a", ["b"]],
        ])
        const map = parseAllowedConnections("a->b")
        expect(map).toEqual(expected)
        expect(map.sources).toEqual(new Set(["a"]))
        expect(map.targets).toEqual(new Set(["b"]))
    })

    it("works for <- direction", () => {
        const expected = new Map([
            ["b", ["a"]],
        ])
        const map = parseAllowedConnections("a<-b")
        expect(map).toEqual(expected)
        expect(map.sources).toEqual(new Set(["b"]))
        expect(map.targets).toEqual(new Set(["a"]))
    })

    it("works for <-> direction", () => {
        const expected = new Map([
            ["a", ["b"]],
            ["b", ["a"]],
        ])
        const map = parseAllowedConnections("a<->b")
        expect(map).toEqual(expected)
        expect(map.sources).toEqual(new Set(["a", "b"]))
        expect(map.targets).toEqual(new Set(["a", "b"]))
    })

    it("works for multiline config", () => {
        const input = `
            a -> b
            c <-> d
            X <- Y
        `
        const expected = new Map([
            ["a", ["b"]],
            ["c", ["d"]],
            ["d", ["c"]],
            ["Y", ["X"]],
        ])
        const map = parseAllowedConnections(input)
        expect(map).toEqual(expected)
        expect(map.sources).toEqual(new Set(["a", "c", "d", "Y"]))
        expect(map.targets).toEqual(new Set(["b", "c", "d", "X"]))
    })

    it("works for empty config", () => {
        const map = parseAllowedConnections("")
        expect(map).toEqual(new Map())
        expect(map.sources).toEqual(new Set())
        expect(map.targets).toEqual(new Set())
    })

    it("works for invalid input", () => {
        consoleError.mockClear()
        const input = `
            a <-> b
            source -> target
            hello - there
        `
        const map = parseAllowedConnections(input)
        expect(map).toEqual(new Map())
        expect(map.sources).toEqual(new Set())
        expect(map.targets).toEqual(new Set())
        expect(consoleError).toHaveBeenCalled()
    })
})

describe("processDomElement", () => {
    const nodes = new Map([
        ["node1", {id: "node1"}],
        ["node2", {id: "node2"}],
    ]) as any
    const edges = new Map([
        ["edge1", {id: "edge1"}],
        ["edge2", {id: "edge2"}],
    ]) as any

    const id = "Xr10X"

    it("returns null when element is null or has no ID", () => {
        expect(processDomElement(null, nodes, edges, id)).toBeNull()
        expect(processDomElement({} as any, nodes, edges, id)).toBeNull()
    })

    it("logs error and returns null when domID is null", () => {
        consoleError.mockClear()
        expect(processDomElement({id: null} as any, nodes, edges, id)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })

    it("returns object when type is node and it exists in nodes list", () => {
        expect(processDomElement({id: "Xr10Xn-node1"} as any, nodes, edges, id))
            .toEqual({domID: "Xr10Xn-node1", type: "node", objID: "node1", obj: {id: "node1"}})
    })

    it("returns object when type is edge and it exists in edge list", () => {
        expect(processDomElement({id: "Xr10Xe-edge1"} as any, nodes, edges, id))
            .toEqual({domID: "Xr10Xe-edge1", type: "edge", objID: "edge1", obj: {id: "edge1"}})
    })

    it("logs error and returns null when type is something other than node or edge", () => {
        consoleError.mockClear()
        expect(processDomElement({id: "Xr10Xx-node1"} as any, nodes, edges, id)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })

    it("logs error and returns null when node does not exist in node list", () => {
        consoleError.mockClear()
        expect(processDomElement({id: "Xr10Xn-node3"} as any, nodes, edges, id)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })
})