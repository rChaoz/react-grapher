import {useCallback, useState} from "react";

export function useUpdate(): [number, () => void] {
    const [value, setValue] = useState(0)
    const update = useCallback(() => setValue(num => num + 1), [setValue])
    return [value, update]
}