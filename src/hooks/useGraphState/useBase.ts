import {useState} from "react";
import {usePersistentComplex} from "../usePersistent";

interface BaseObject {
    id: string
}

interface BaseFunctions<T, NewT> {
    clear(): void

    get(id: string): T | undefined

    set(newObjects: T[] | NewT[]): void

    add(newObject: T | T[] | NewT | NewT[]): void

    update(mapFunc: (obj: T) => T | NewT | null | undefined): void

    replace(targetID: string, replacement?: T | NewT | null | ((obj: T) => T | NewT | null | undefined)): void
}

interface BaseFunctionsImpl<T, NewT> extends BaseFunctions<T, NewT> {
    internalMap: Map<string, T>
}

export function useBase<T extends BaseObject, NewT extends BaseObject>(initialObjects: T[]): T[] & BaseFunctionsImpl<T, NewT> {
    const [state, setState] = useState(initialObjects ?? [])
    const map = usePersistentComplex(() => new Map(state.map(obj => [obj.id, obj])))
    return Object.assign(state, {
        internalMap: map,
        clear() {
            map.clear()
            setState([])
        },
        get(id: string): T | undefined {
            return map.get(id)
        },
        set(newObjects: T[]) {
            map.clear()
            setState(newObjects)
            for (const obj of newObjects) map.set(obj.id, obj)
        },
        add(newObject: T | T[]) {
            if (Array.isArray(newObject)) {
                setState(newObject)
                for (const node of newObject) map.set(node.id, node)
            } else {
                setState(state => state.concat(newObject))
                map.set(newObject.id, newObject)
            }
        },
        update(mapFunc: (obj: T) => (T | null | undefined)) {
            setState(state => {
                const newState: T[] = []
                for (const obj of state) {
                    const r = mapFunc(obj)
                    if (r != null) {
                        if (r !== obj) {
                            if (r.id !== obj.id) map.delete(obj.id)
                            map.set(r.id, r)
                        }
                        newState.push(r)
                    }
                }
                return newState
            })
        },
        replace(targetID: string, replacement?: T | (<T>(node: T) => (T | null | undefined)) | null) {
            this.update(obj => {
                if (obj.id === targetID) return typeof replacement === "function" ? replacement(obj) : replacement
                else return obj
            })
        },
    })
}