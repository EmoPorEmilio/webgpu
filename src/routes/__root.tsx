/// <reference types="vite/client" />
import { createRootRoute, Link, Outlet } from "@tanstack/solid-router";
import type * as Solid from "solid-js";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charset: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "WebGPU Triangle Demo",
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<style>
				{`
					* {
						margin: 0;
						padding: 0;
						box-sizing: border-box;
					}
					body {
						font-family: system-ui, -apple-system, sans-serif;
						background: #0a0a0a;
						color: #ffffff;
					}
				`}
			</style>
			<Outlet />
			<TanStackRouterDevtools position="bottom-right" />
		</>
	);
}
