import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["./src/index.ts"],
	clean: true,
	format: ["esm", "cjs"],
	dts: true,
	minify: true,
	outDir: "./dist",
});
