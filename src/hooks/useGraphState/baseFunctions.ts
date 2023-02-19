import React from "react";

export interface BaseObject {
    id: string
    classes: string[]
    selected: boolean
}

export interface BaseObjectData {
    id: string
    classes?: string[]
}

export interface BaseFunctions<T, TData> {
    getSelection(): string[]
    setSelection(selected: string[]): void
    setSelected(id: string, selected: boolean, newSelection?: boolean): void
    clear(): void
    get(id: string): T | undefined
    set(newObjects: T[] | TData[]): void
    add(newObject: T | T[] | TData | TData[]): void
    update(mapFunc: (obj: T) => T | TData | null | undefined): void
    replace(targetID: string, replacement?: T | TData | null | ((obj: T) => T | TData | null | undefined)): void
}

export interface BaseFunctionsImpl<T, TData> extends BaseFunctions<T, TData> {
    boundingRect?: DOMRect
    multipleSelection: boolean
    selection: string[]
    internalMap: Map<string, T>
}

export function createBaseFunctions<T extends BaseObject, TData extends BaseObjectData>(state: T[], setState: React.Dispatch<React.SetStateAction<T[]>>,
                                               selection: string[], setSelection: React.Dispatch<React.SetStateAction<string[]>>,
                                               map: Map<string, T>) {
    const base: BaseFunctionsImpl<T, TData> = {
        multipleSelection: false,
        selection,
        internalMap: map,
        getSelection(): string[] {
            return this.selection
        },
        setSelection(selected: string[]) {
            // Compare selections before updating first. This prevents useless re-renders when deselecting all multiple times, double-clicking nodes etc.
            // This does not work if orders in arrays are different, but chance of this happening is practically 0
            if (selected.length === selection.length) {
                let changed = false
                for (let i = 0; i < selected.length; ++i) if (selected[i] != selection[i]) {
                    changed = true
                    break
                }
                if (!changed) return
            }

            // Update selected nodes. Slice is required because the Nodes/Edges objects only updates on setState, not on setSelection
            setSelection(selected)
            const newState = state.slice()
            for (const obj of newState) obj.selected = selected.includes(obj.id)
            setState(newState)
        },
        setSelected(id: string, selected: boolean, newSelection?: boolean) {
            if (selected && (!this.multipleSelection || newSelection)) return this.setSelection([id])
            const index = selection.indexOf(id)
            if (index != -1) {
                if (!selected) this.setSelection(selection.slice(0, index).concat(selection.slice(index + 1)))
            } else {
                if (selected) this.setSelection(selection.concat(id))
            }
        },
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
        update(mapFunc: (node: T) => (T | null | undefined)) {
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
        replace(targetID: string, replacement?: T | TData | (<T>(node: T) => (T | TData | null | undefined)) | null) {
            this.update(obj => {
                if (obj.id === targetID) return typeof replacement === "function" ? replacement(obj) : replacement
                else return obj
            })
        },
    }
    return base
}