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
    const nodes: any = new Map([
        ["node1", {id: "node1"}],
        ["node2", {id: "node2"}],
    ])
    const edges: any = new Map([
        ["edge1", {id: "edge1"}],
        ["edge2", {id: "edge2"}],
    ])

    it("logs error and returns null when element is null", () => {
        consoleError.mockClear()
        expect(processDomElement(null, nodes, edges)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })

    it("logs error and returns null when dataset is empty", () => {
        consoleError.mockClear()
        expect(processDomElement({dataset: {}} as any, nodes, edges)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })

    it("returns object when type is node and it exists in nodes list", () => {
        expect(processDomElement({dataset: {type: "node", id: "node1"}} as any, nodes, edges))
            .toEqual({type: "node", objID: "node1", obj: {id: "node1"}})
    })

    it("returns object when type is edge and it exists in edge list", () => {
        expect(processDomElement({dataset: {type: "edge", id: "edge1"}} as any, nodes, edges))
            .toEqual({type: "edge", objID: "edge1", obj: {id: "edge1"}})
    })

    it("logs error and returns null when node does not exist in node list", () => {
        consoleError.mockClear()
        expect(processDomElement({dataset: {type: "node", id: "edge1"}} as any, nodes, edges)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })

    it("logs error and returns null when type is unsupported", () => {
        consoleError.mockClear()
        expect(processDomElement({dataset: {type: "special", id: "whatever"}} as any, nodes, edges)).toBeNull()
        expect(consoleError).toHaveBeenCalled()
    })
})