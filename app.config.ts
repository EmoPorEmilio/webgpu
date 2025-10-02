import { defineConfig } from "@tanstack/start/config";
import viteSolid from "vite-plugin-solid";

export default defineConfig({
	routers: {
		ssr: {
			entry: "./app/ssr.tsx",
		},
		client: {
			entry: "./app/client.tsx",
		},
	},
	vite: {
		plugins: [viteSolid({} as any)],
	},
	server: {
		preset: "bun",
	},
});
