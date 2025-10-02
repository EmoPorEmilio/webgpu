import { createFileRoute, Link } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<div
			style={{
				display: "flex",
				"flex-direction": "column",
				"align-items": "center",
				"justify-content": "center",
				height: "100vh",
				gap: "2rem",
			}}
		>
			<h1
				style={{
					"font-size": "3rem",
					"font-weight": "bold",
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					"-webkit-background-clip": "text",
					"-webkit-text-fill-color": "transparent",
					"background-clip": "text",
				}}
			>
				WebGPU Triangle Demo
			</h1>

			<p
				style={{
					"font-size": "1.2rem",
					color: "#999",
					"text-align": "center",
					"max-width": "600px",
				}}
			>
				A simple demonstration of rendering a triangle using WebGPU with
				TanStack Start (Solid.js)
			</p>

			<Link
				to="/shader"
				style={{
					padding: "1rem 2rem",
					"font-size": "1.1rem",
					"font-weight": "600",
					color: "#fff",
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					border: "none",
					"border-radius": "8px",
					cursor: "pointer",
					"text-decoration": "none",
					transition: "transform 0.2s, box-shadow 0.2s",
					display: "inline-block",
				}}
				onMouseEnter={(e: MouseEvent) => {
					const target = e.currentTarget as HTMLAnchorElement;
					target.style.transform = "translateY(-2px)";
					target.style.boxShadow = "0 8px 16px rgba(102, 126, 234, 0.4)";
				}}
				onMouseLeave={(e: MouseEvent) => {
					const target = e.currentTarget as HTMLAnchorElement;
					target.style.transform = "translateY(0)";
					target.style.boxShadow = "none";
				}}
			>
				View Triangle Shader
			</Link>
		</div>
	);
}
