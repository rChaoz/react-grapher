import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import babel from "@rollup/plugin-babel"
import postcss from "rollup-plugin-postcss";

import packageJson from "./package.json";
import copy from "rollup-plugin-copy";

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
                exclude: ["**/*.test.ts", "**/*.test.tsx"],
            },
        }),
        postcss(),
        babel({babelHelpers: 'bundled'}),
        copy({
            targets: [
                {src: "src/css/*", dest: "dist/"},
            ]
        })
    ],
};