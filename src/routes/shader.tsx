import { createFileRoute, Link } from "@tanstack/solid-router";
import { WebGPUTriangle } from "~/components/WebGPUTriangle";

export const Route = createFileRoute("/shader")({
	component: ShaderPage,
});

function ShaderPage() {
	return (
		<div
			style={{
				display: "flex",
				"flex-direction": "column",
				height: "100vh",
				padding: "2rem",
			}}
		>
			<div
				style={{
					display: "flex",
					"justify-content": "space-between",
					"align-items": "center",
					"margin-bottom": "2rem",
				}}
			>
				<h1
					style={{
						"font-size": "2rem",
						background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
						"-webkit-background-clip": "text",
						"-webkit-text-fill-color": "transparent",
						"background-clip": "text",
					}}
				>
					WebGPU Triangle
				</h1>

				<Link
					to="/"
					style={{
						padding: "0.75rem 1.5rem",
						"font-size": "1rem",
						color: "#fff",
						background: "#333",
						border: "none",
						"border-radius": "6px",
						cursor: "pointer",
						"text-decoration": "none",
						transition: "background 0.2s",
					}}
					onMouseEnter={(e: MouseEvent) => {
						const target = e.currentTarget as HTMLAnchorElement;
						target.style.background = "#444";
					}}
					onMouseLeave={(e: MouseEvent) => {
						const target = e.currentTarget as HTMLAnchorElement;
						target.style.background = "#333";
					}}
				>
					← Back to Home
				</Link>
			</div>

			<div
				style={{
					flex: 1,
					display: "flex",
					"align-items": "center",
					"justify-content": "center",
					background: "#1a1a1a",
					"border-radius": "12px",
					overflow: "hidden",
				}}
			>
				<WebGPUTriangle />
			</div>
		</div>
	);
}
