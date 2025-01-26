import dts from "bun-plugin-dts";

/* -------------------------------------------------------------------------- */

const entrypoints = ["./index.ts"],
  external = ["vue"],
  minify = true,
  outdir = "./",
  plugins = [dts()];

/* -------------------------------------------------------------------------- */

await Bun.build({ entrypoints, external, minify, outdir, plugins });
