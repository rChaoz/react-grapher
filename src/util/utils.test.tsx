import React from "react"
import {describe, expect, it, jest, test} from "@jest/globals"
import styled from "@emotion/styled"

import {convertToCSSLength, deepEquals, expandRect, hasProperty, localMemo, resolveCSSCalc, resolveValue, resolveValues, splitCSSCalc} from "./utils"
import {render} from "@testing-library/react"

const Container = styled.div`
  position: relative;
  width: 1000px;
  height: 800px;
`

//noinspection CssReplaceWithShorthandSafely
const TestComponent = styled.div`
  position: absolute;

  width: 500px;
  height: 100px;

  /*
  = Position: =
  top:   398
  left:  150
  
  = Border radius: =
  property        x    y
  -------------  ---  ---
  top-left:      100   20
  top-right:     40    5
  bottom-right:  135   15
  bottom-left:   25    10
  */

  top: calc(50% - 2px);
  left: 15%;
  border-top-left-radius: 20%;
  border-top-right-radius: 40px calc(50% - 45px);
  border-bottom-right-radius: calc(25% + 10px) calc(30px - 15%);
  border-bottom-left-radius: calc(20px + 1%) 10%;
`

const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {
    // empty
})

describe("splitCSSCalc", () => {
    test.each<[string, number, number]>([
        ["50% + 25px", 50, 25],
        ["30px", 0, 30],
        ["100px - 20%", -20, 100],
        ["25% - 5px", 25, -5],
    ])("works for '%s'", (expression, expectedPercentage, expectedPxValue) => {
        const [percentage, absolute] = splitCSSCalc(expression)
        expect(percentage).toBeCloseTo(expectedPercentage)
        expect(absolute).toBeCloseTo(expectedPxValue)
    })
})

describe("resolveCalc", () => {
    test.each<[number, string, number]>([
        [100, "50%", 50],
        [100, "20px", 20],
        [100, "10% + 25px", 35],
        [200, "15% -  4px", 26],
        [1000, "55px - 3%", 25],
        [350, "12px + 7%", 36.5],
    ])("using length=%d, calc(%s) = %s", (length, expression, expectedValue) => {
        expect(resolveCSSCalc(expression, length)).toBeCloseTo(expectedValue)
    })

    test("invalid calc expression", () => {
        // [500, "50px + invalid - 50vw - 1%", 45]
        // 'invalid' and '50vw' are invalid tokens
        consoleWarn.mockClear()
        expect(resolveCSSCalc("50px + invalid - 50vw - 1%", 500)).toBeCloseTo(45)
        expect(consoleWarn).toHaveBeenCalledTimes(2)
    })
})

// Render sample component to test against
const {container} = render(<Container><TestComponent/></Container>)
const elem = container.firstChild!.firstChild as HTMLElement

const style = window.getComputedStyle(elem)
// Width & height of element and parent element
// jsdom doesn't have a layout engine, so we need to set these manually (instead of using offsetWidth/offsetHeight)
const width = 500, height = 100
const parentWidth = 1000, parentHeight = 800


describe("resolvedValue", () => {
    it("works for simple property", () => {
        expect(resolveValue("50px", 0)).toBeCloseTo(50)
    })
    it("works for percentage property", () => {
        expect(resolveValue(style.top, parentHeight)).toBeCloseTo(398)
    })
    it("works for calc() property", () => {
        expect(resolveValue(style.left, parentWidth)).toBeCloseTo(150)
    })
    it("works for invalid property", () => {
        consoleWarn.mockClear()
        expect(resolveValue("invalid", 0)).toBe(0)
        expect(resolveValue("25vw", 0)).toBe(0)
        expect(consoleWarn).toHaveBeenCalledTimes(2)
    })
})

describe("resolvedValues", () => {
    it("works for single value property", () => {
        const borderTopLeftRadius = resolveValues(style.borderTopLeftRadius, width, height)
        expect(borderTopLeftRadius.length).toBe(2)
        expect(borderTopLeftRadius[0]).toBeCloseTo(100)
        expect(borderTopLeftRadius[1]).toBeCloseTo(20)
    })

    it("works for pixel value & calc property", () => {
        const borderTopRightRadius = resolveValues(style.borderTopRightRadius, width, height)
        expect(borderTopRightRadius.length).toBe(2)
        expect(borderTopRightRadius[0]).toBeCloseTo(40)
        expect(borderTopRightRadius[1]).toBeCloseTo(5)
    })

    it("works for calc & percentage value property", () => {
        const borderBottomLeftRadius = resolveValues(style.borderBottomLeftRadius, width, height)
        expect(borderBottomLeftRadius.length).toBe(2)
        expect(borderBottomLeftRadius[0]).toBeCloseTo(25)
        expect(borderBottomLeftRadius[1]).toBeCloseTo(10)
    })

    it("works for double calc property", () => {
        const borderBottomRightRadius = resolveValues(style.borderBottomRightRadius, width, height)
        expect(borderBottomRightRadius.length).toBe(2)
        expect(borderBottomRightRadius[0]).toBeCloseTo(135)
        expect(borderBottomRightRadius[1]).toBeCloseTo(15)
    })
})

// Because jsdom doesn't define it: https://github.com/jsdom/jsdom/issues/2716
class DOMRect {
    x: number
    y: number
    width: number
    height: number

    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get left() {
        if (this.width < 0) return this.x + this.width
        else return this.x
    }

    get top() {
        if (this.height < 0) return this.y + this.height
        else return this.y
    }

    get right() {
        if (this.width > 0) return this.x + this.width
        else return this.x
    }

    get bottom() {
        if (this.height > 0) return this.y + this.height
        else return this.y
    }

    // noinspection JSUnusedGlobalSymbols
    toJSON() {
        return `{ "x": ${this.x}, "y": ${this.y}, "width": ${this.width}, "height": ${this.height} }`
    }
}

test("enlargeRect", () => {
    const rect = new DOMRect()

    expandRect(rect, new DOMRect(-10, -10, 20, 20))
    expect(rect).toMatchSnapshot()

    expandRect(rect, new DOMRect(50, 70))
    expect(rect).toMatchSnapshot()

    expandRect(rect, new DOMRect(-20, 0, 20, 100))
    expect(rect).toMatchSnapshot()

    expandRect(rect, new DOMRect(-80, 100, 50, 55))
    expect(rect).toMatchSnapshot()
})

describe("parseCSSStringOrNumber", () => {
    it("parses a number as a px string", () => {
        expect(convertToCSSLength(10)).toBe("10px");
    });

    it("returns a string unaltered", () => {
        expect(convertToCSSLength("5rem")).toBe("5rem");
        expect(convertToCSSLength("auto")).toBe("auto");
    });

    it("returns '0' for null, undefined or the number 0", () => {
        expect(convertToCSSLength(null)).toBe("0");
        expect(convertToCSSLength(undefined)).toBe("0");
        expect(convertToCSSLength(0)).toBe("0");
    });
})

describe('localMemo', () => {
    it('returns the memoized value when dependencies have not changed', () => {
        const factory = jest.fn(() => 100)
        const deps = ['a', 123, {obj: true}]
        const memoObject = {}

        expect(localMemo(factory, deps, memoObject)).toBe(100)

        // Change mock function implementation as it shouldn't be called again
        factory.mockImplementation(() => 0)

        expect(localMemo(factory, deps.slice(), memoObject)).toBe(100)

        expect(factory).toHaveBeenCalledTimes(1)
    })

    it('returns a new value when dependencies have changed', () => {
        const factory = jest.fn(() => "value 1")
        const deps = ['a', 123, {obj: true}]
        const memoObject = {}

        expect(localMemo(factory, deps, memoObject)).toBe("value 1")

        // Change deps & mock implementation to test new value
        const newDeps = deps.slice()
        newDeps[1] = 125
        factory.mockImplementation(() => "value 2")

        expect(localMemo(factory, newDeps, memoObject)).toBe("value 2")

        expect(factory).toHaveBeenCalledTimes(2)
    })

    it('returns the same reference every time if deps is empty array', () => {
        const factory = jest.fn(() => ({a: 10, b: true, c: ["test"]}))
        const deps: any[] = []
        const memoObject = {}

        const result1 = localMemo(factory, deps, memoObject)
        const result2 = localMemo(factory, deps, memoObject)
        const result3 = localMemo(factory, deps, memoObject)

        expect(result1).toBe(result2)
        expect(result2).toBe(result3)
        expect(result1).toEqual({a: 10, b: true, c: ["test"]})
        expect(factory).toHaveBeenCalledTimes(1)
    })
})

test("hasProperty", () => {
    consoleWarn.mockClear()

    const object: { a: string } = {a: "hello", b: 123} as any
    expect(hasProperty(object, "b"))
    // Expect no compile error
    if (hasProperty(object, "b")) console.warn(object.b)
    expect(consoleWarn).toHaveBeenCalled()
})

describe("deepEquals", () => {
    it("returns true for the same object, function or simple type", () => {
        const obj = {a: 1}
        expect(deepEquals(obj, obj)).toBe(true)
        const str = "hello world", strArr = ["he", "ll", "o ", "world"]
        expect(deepEquals(str, strArr.join(""))).toBe(true)

        expect(deepEquals(4, +"4")).toBe(true)
        expect(deepEquals(null, null)).toBe(true)
        expect(deepEquals(undefined, undefined)).toBe(true)

        function f() {
            // empty
        }

        expect(deepEquals(f, f)).toBe(true)
    })

    it("returns false for null and undefined", () => {
        expect(deepEquals(null, undefined)).toBe(false)
        expect(deepEquals({}, undefined)).toBe(false)
        expect(deepEquals(undefined, {})).toBe(false)
    })

    it("returns false for objects with different types, constructors, prototypes or number of properties", () => {
        expect(deepEquals({}, [])).toBe(false)
        expect(deepEquals({}, "")).toBe(false)
        expect(deepEquals({}, 1)).toBe(false)
        const obj1 = {a: 1, b: "test", c: {}}
        const obj2 = {a: 1, b: "test"}
        expect(deepEquals(obj1, obj2)).toBe(false)
    })

    it("returns true for equivalent objects", () => {
        const obj1 = {a: 1}
        const obj2 = {a: {b: 2}}
        expect(deepEquals(obj1, {...obj1})).toBe(true)
        expect(deepEquals(obj2, {...obj2})).toBe(true)
    })

    it("returns false for nested objects with different properties", () => {
        expect(deepEquals({a: 1}, {a: 2})).toBe(false)
        expect(deepEquals({a: 1}, {b: 1})).toBe(false)
        expect(deepEquals({a: {b: 1}}, {a: {c: 2}})).toBe(false)
        expect(deepEquals({a: {b: 1}}, {a: {b: 2}})).toBe(false)
    })

    it("returns false for objects with different constructors or prototypes", () => {
        class MyClass1 {
            constructor(public a: number) {
            }
        }

        class MyClass2 {
            constructor(public a: number) {
            }
        }

        const obj1 = new MyClass1(1)
        const obj2 = new MyClass2(1)
        expect(deepEquals(obj1, obj2)).toBe(false)

        expect(deepEquals({}, Object.create(null))).toBe(false)
    })
})