import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import postcss from "rollup-plugin-postcss";

import packageJson from "./package.json";
import babel from "@rollup/plugin-babel"

export default {
    input: "src/index.ts",
    output: [
        {
            file: packageJson.main,
            format: "cjs",
            sourcemap: false,
        },
        {
            file: packageJson.module,
            format: "esm",
            sourcemap: false,
        },
    ],
    plugins: [
        peerDepsExternal(),
        resolve(),
        commonjs(),
        typescript({
            tsconfigOverride: {
                exclude: ["**/*.test.ts"],
            },
        }),
        postcss(),
        babel({babelHelpers: 'bundled'}),
    ],
};