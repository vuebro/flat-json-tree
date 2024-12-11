import dts from "bun-plugin-dts";

const entrypoints = ["./index.ts"];
const external = ["vue"];
const minify = true;
const outdir = "./";
const plugins = [dts()];
await Bun.build({ entrypoints, external, minify, outdir, plugins });
