import { onMount, onCleanup, createSignal } from "solid-js";

export function WebGPUTriangle() {
	let canvasRef: HTMLCanvasElement | undefined;
	const [error, setError] = createSignal<string | null>(null);
	const [isSupported, setIsSupported] = createSignal(true);

	onMount(async () => {
		if (!navigator.gpu) {
			setIsSupported(false);
			setError(
				"WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.",
			);
			return;
		}

		try {
			await initWebGPU();
		} catch (err) {
			console.error("WebGPU initialization failed:", err);
			setError(
				`Failed to initialize WebGPU: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	});

	async function initWebGPU() {
		if (!canvasRef) return;

		// Request adapter and device
		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) {
			throw new Error("No GPU adapter found");
		}

		const device = await adapter.requestDevice();

		// Configure canvas
		const context = canvasRef.getContext("webgpu");
		if (!context) {
			throw new Error("Failed to get WebGPU context");
		}

		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		context.configure({
			device,
			format: presentationFormat,
			alphaMode: "opaque",
		});

		// Vertex shader - defines triangle vertices in clip space
		const vertexShaderCode = `
			@vertex
			fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
				// Define triangle vertices (x, y, z, w in clip space)
				var positions = array<vec2f, 3>(
					vec2f(0.0, 0.5),    // Top vertex (center-top)
					vec2f(-0.5, -0.5),  // Bottom-left vertex
					vec2f(0.5, -0.5)    // Bottom-right vertex
				);
				
				return vec4f(positions[vertexIndex], 0.0, 1.0);
			}
		`;

		// Fragment shader - defines the color for each pixel
		const fragmentShaderCode = `
			@fragment
			fn main() -> @location(0) vec4f {
				// Return a gradient purple color (RGBA)
				return vec4f(0.6, 0.4, 0.9, 1.0);
			}
		`;

		// Create shader modules
		const vertexShaderModule = device.createShaderModule({
			label: "Triangle Vertex Shader",
			code: vertexShaderCode,
		});

		const fragmentShaderModule = device.createShaderModule({
			label: "Triangle Fragment Shader",
			code: fragmentShaderCode,
		});

		// Create render pipeline
		const pipeline = device.createRenderPipeline({
			label: "Triangle Render Pipeline",
			layout: "auto",
			vertex: {
				module: vertexShaderModule,
				entryPoint: "main",
			},
			fragment: {
				module: fragmentShaderModule,
				entryPoint: "main",
				targets: [
					{
						format: presentationFormat,
					},
				],
			},
			primitive: {
				topology: "triangle-list",
			},
		});

		// Render function
		function render() {
			if (!canvasRef) return;

			const commandEncoder = device.createCommandEncoder();
			const textureView = context.getCurrentTexture().createView();

			const renderPassDescriptor: GPURenderPassDescriptor = {
				colorAttachments: [
					{
						view: textureView,
						clearValue: { r: 0.05, g: 0.05, b: 0.05, a: 1.0 }, // Dark gray background
						loadOp: "clear",
						storeOp: "store",
					},
				],
			};

			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
			passEncoder.setPipeline(pipeline);
			passEncoder.draw(3); // Draw 3 vertices (1 triangle)
			passEncoder.end();

			device.queue.submit([commandEncoder.finish()]);
		}

		// Initial render
		render();

		// Optional: Re-render on resize
		const resizeObserver = new ResizeObserver(() => {
			if (canvasRef) {
				canvasRef.width = canvasRef.clientWidth * window.devicePixelRatio;
				canvasRef.height = canvasRef.clientHeight * window.devicePixelRatio;
				render();
			}
		});

		resizeObserver.observe(canvasRef);

		onCleanup(() => {
			resizeObserver.disconnect();
			device.destroy();
		});
	}

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				"flex-direction": "column",
				"align-items": "center",
				"justify-content": "center",
				padding: "2rem",
			}}
		>
			{error() ? (
				<div
					style={{
						padding: "2rem",
						"border-radius": "8px",
						background: "#2a1a1a",
						border: "2px solid #ff4444",
						color: "#ff6666",
						"max-width": "600px",
						"text-align": "center",
					}}
				>
					<h2 style={{ "margin-bottom": "1rem", color: "#ff4444" }}>
						Error: {isSupported() ? "Initialization Failed" : "Not Supported"}
					</h2>
					<p>{error()}</p>
					{!isSupported() && (
						<p style={{ "margin-top": "1rem", color: "#999" }}>
							Try using Google Chrome 113+ or Microsoft Edge 113+
						</p>
					)}
				</div>
			) : (
				<>
					<canvas
						ref={canvasRef}
						width={800}
						height={600}
						style={{
							width: "800px",
							height: "600px",
							"max-width": "100%",
							"max-height": "100%",
							border: "2px solid #333",
							"border-radius": "8px",
							"box-shadow": "0 4px 20px rgba(0, 0, 0, 0.5)",
						}}
					/>
					<div
						style={{
							"margin-top": "2rem",
							"text-align": "center",
							color: "#999",
							"max-width": "600px",
						}}
					>
						<p style={{ "margin-bottom": "0.5rem" }}>
							This triangle is rendered using WebGPU with custom vertex and
							fragment shaders written in WGSL (WebGPU Shading Language).
						</p>
						<p style={{ "font-size": "0.9rem" }}>
							The vertex shader defines the triangle's position, and the
							fragment shader determines its color.
						</p>
					</div>
				</>
			)}
		</div>
	);
}
