import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import pkg from "./package.json";

export default [
  {
    input: "src/index.js",
    plugins: [
      nodeResolve(),
      commonjs(),
      babel({
        babelHelpers: "bundled",
        exclude: "**/node_modules/**",
      }),
    ],
    output: [
      { file: pkg.main, format: "cjs", exports: "auto" },
    ],
  },
];