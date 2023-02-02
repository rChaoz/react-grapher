import * as React from 'react';
import {useRef} from "react";

// DEBUGGING USE ONLY FILE, make sure to remove all calls to this when done using

type Props = Record<string, unknown>

export function componentWithPropsChecker(WrappedComponent: React.ComponentType<Props>): React.ComponentClass<Props> {
    return class PropsChecker extends React.Component<Props> {
        // noinspection JSDeprecatedSymbols
        UNSAFE_componentWillReceiveProps(nextProps: Props) {
            Object.keys(nextProps)
                .filter(key => nextProps[key] !== this.props[key])
                .map((key) => {
                    console.log(
                        'changed property:',
                        key,
                        'from',
                        this.props[key],
                        'to',
                        nextProps[key],
                    );
                });
        }

        render() {
            return <WrappedComponent {...this.props} />;
        }
    }
}

export function useDependencyChangeChecker<T extends unknown[]>(arr: T): T {
    const ref = useRef<T>(arr)
    const changedIndices: number[] = []
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i] !== ref.current[i]) changedIndices.push(i)
    }
    if (changedIndices.length > 0) console.log("Dependency checker: change at indices " + changedIndices.join())
    ref.current = arr
    return arr
}