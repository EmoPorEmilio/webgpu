import { onMount, onCleanup, createSignal } from "solid-js";

// Animation system for smooth card transitions
class CardAnimator {
	private animations = new Map<
		number,
		{
			startTime: number;
			duration: number;
			from: number;
			to: number;
			property: "flip" | "hover";
		}
	>();

	startAnimation(
		cardId: number,
		property: "flip" | "hover",
		from: number,
		to: number,
		duration: number,
	) {
		this.animations.set(cardId, {
			startTime: performance.now(),
			duration,
			from,
			to,
			property,
		});
	}

	update(cardId: number): number | null {
		const anim = this.animations.get(cardId);
		if (!anim) return null;

		const elapsed = performance.now() - anim.startTime;
		const progress = Math.min(elapsed / anim.duration, 1.0);

		// Smooth easing function
		const eased =
			progress < 0.5
				? 2 * progress * progress
				: 1 - Math.pow(-2 * progress + 2, 2) / 2;

		const value = anim.from + (anim.to - anim.from) * eased;

		if (progress >= 1.0) {
			this.animations.delete(cardId);
		}

		return value;
	}

	isAnimating(cardId: number): boolean {
		return this.animations.has(cardId);
	}

	hasActiveAnimations(): boolean {
		return this.animations.size > 0;
	}
}

export function WebGPUTriangle() {
	let canvasRef: HTMLCanvasElement | undefined;
	const [error, setError] = createSignal<string | null>(null);
	const [isSupported, setIsSupported] = createSignal(true);

	// Card grid configuration
	const GRID_SIZE = 4; // 4x4 grid = 16 cards
	const CARD_WIDTH = 0.35;
	const CARD_HEIGHT = 0.45;
	const SPACING = 0.05;

	// Card state management
	const [cardStates, setCardStates] = createSignal<{
		hoveredCard: number | null;
		flippedCards: Set<number>;
		hoverAmounts: Float32Array;
		flipAmounts: Float32Array;
	}>({
		hoveredCard: null,
		flippedCards: new Set(),
		hoverAmounts: new Float32Array(16),
		flipAmounts: new Float32Array(16),
	});

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

		// Animation system
		const animator = new CardAnimator();

		// Generate vertices for 16 cards (4x4 grid)
		// Each card needs: position (2), cardId (1), uv coordinates (2) = 5 floats per vertex
		const vertices: number[] = [];
		const indices: number[] = [];
		const cardPositions: {
			x: number;
			y: number;
			width: number;
			height: number;
		}[] = [];

		// Calculate grid starting position to center the grid
		const totalWidth = GRID_SIZE * CARD_WIDTH + (GRID_SIZE - 1) * SPACING;
		const totalHeight = GRID_SIZE * CARD_HEIGHT + (GRID_SIZE - 1) * SPACING;
		const startX = -totalWidth / 2;
		const startY = totalHeight / 2;

		for (let row = 0; row < GRID_SIZE; row++) {
			for (let col = 0; col < GRID_SIZE; col++) {
				const cardId = row * GRID_SIZE + col;
				const x = startX + col * (CARD_WIDTH + SPACING);
				const y = startY - row * (CARD_HEIGHT + SPACING);

				// Store card bounds for click detection
				cardPositions.push({ x, y, width: CARD_WIDTH, height: CARD_HEIGHT });

				const vertexOffset = cardId * 4;

				// Rectangle vertices with cardId and UV coordinates
				// Top-left
				vertices.push(x, y, cardId, 0, 0);
				// Top-right
				vertices.push(x + CARD_WIDTH, y, cardId, 1, 0);
				// Bottom-right
				vertices.push(x + CARD_WIDTH, y - CARD_HEIGHT, cardId, 1, 1);
				// Bottom-left
				vertices.push(x, y - CARD_HEIGHT, cardId, 0, 1);

				// Two triangles to form a rectangle
				indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
				indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 3);
			}
		}

		// Create vertex buffer
		const vertexBuffer = device.createBuffer({
			label: "Card vertices",
			size: vertices.length * Float32Array.BYTES_PER_ELEMENT,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(vertices));

		// Create index buffer
		const indexBuffer = device.createBuffer({
			label: "Card indices",
			size: indices.length * Uint16Array.BYTES_PER_ELEMENT,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(indexBuffer, 0, new Uint16Array(indices));

		// Create uniform buffer for card states (hover and flip amounts)
		// Each array is 4 vec4s = 4 * 16 bytes = 64 bytes per array, 128 total
		const uniformBufferSize = 128;
		const uniformBuffer = device.createBuffer({
			label: "Card state uniforms",
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		// Vertex shader with card ID and UV
		const vertexShaderCode = `
			struct VertexOutput {
				@builtin(position) position: vec4f,
				@location(0) uv: vec2f,
				@location(1) @interpolate(flat) cardId: u32,
			}

			@vertex
			fn main(
				@location(0) position: vec2f,
				@location(1) cardId: f32,
				@location(2) uv: vec2f
			) -> VertexOutput {
				var output: VertexOutput;
				output.position = vec4f(position, 0.0, 1.0);
				output.uv = uv;
				output.cardId = u32(cardId);
				return output;
			}
		`;

		// Fragment shader with rounded corners, gradient borders, and per-card colors
		const fragmentShaderCode = `
			struct CardStates {
				hoverAmounts: array<vec4f, 4>,
				flipAmounts: array<vec4f, 4>,
			}

			@group(0) @binding(0) var<uniform> states: CardStates;

			// Generate unique color for each card based on ID
			fn getCardColor(cardId: u32) -> vec3f {
				let hue = f32(cardId) / 16.0;
				// Convert HSV to RGB for vibrant colors
				let h = hue * 6.0;
				let i = floor(h);
				let f = h - i;
				let q = 1.0 - f;
				
				if (i == 0.0) { return vec3f(1.0, f, 0.0); }
				else if (i == 1.0) { return vec3f(q, 1.0, 0.0); }
				else if (i == 2.0) { return vec3f(0.0, 1.0, f); }
				else if (i == 3.0) { return vec3f(0.0, q, 1.0); }
				else if (i == 4.0) { return vec3f(f, 0.0, 1.0); }
				else { return vec3f(1.0, 0.0, q); }
			}

			@fragment
			fn main(
				@location(0) uv: vec2f,
				@location(1) @interpolate(flat) cardId: u32
			) -> @location(0) vec4f {
				let cornerRadius = 0.08; // Relative to card size
				let borderWidth = 0.05;
				
				// Get card state (unpack from vec4 arrays)
				let hoverAmount = states.hoverAmounts[cardId / 4][cardId % 4];
				let flipAmount = states.flipAmounts[cardId / 4][cardId % 4];
				
				// Calculate distance from edges for rounded corners
				let distFromEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
				let cornerDist = length(max(abs(uv - 0.5) - (0.5 - cornerRadius), vec2f(0.0)));
				
				// Discard pixels outside rounded corners
				if (cornerDist > cornerRadius) {
					discard;
				}
				
				// Border detection
				let isBorder = distFromEdge < borderWidth;
				
				// Get unique color for this card
				let cardColor = getCardColor(cardId);
				
				// Gradient border colors
				let gradientPos = uv.x * 0.5 + uv.y * 0.5;
				let borderColor1 = cardColor * 1.2;
				let borderColor2 = cardColor * 0.6;
				let borderColor = mix(borderColor1, borderColor2, gradientPos);
				
				// Card face color (white/light when not flipped, dark when flipped)
				let faceColor = mix(vec3f(0.95, 0.95, 0.98), vec3f(0.2, 0.2, 0.25), flipAmount);
				
				// Hover effect - slight brightening
				let brightness = 1.0 + hoverAmount * 0.3;
				
				// Choose between border and face
				var finalColor: vec3f;
				if (isBorder) {
					finalColor = borderColor * brightness;
				} else {
					finalColor = faceColor * brightness;
				}
				
				return vec4f(finalColor, 1.0);
			}
		`;

		// Create shader modules
		const vertexShaderModule = device.createShaderModule({
			label: "Card Vertex Shader",
			code: vertexShaderCode,
		});

		const fragmentShaderModule = device.createShaderModule({
			label: "Card Fragment Shader",
			code: fragmentShaderCode,
		});

		// Create bind group layout
		const bindGroupLayout = device.createBindGroupLayout({
			label: "Card state bind group layout",
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.FRAGMENT,
					buffer: { type: "uniform" },
				},
			],
		});

		// Create bind group
		const bindGroup = device.createBindGroup({
			label: "Card state bind group",
			layout: bindGroupLayout,
			entries: [
				{
					binding: 0,
					resource: { buffer: uniformBuffer },
				},
			],
		});

		// Create render pipeline
		const pipeline = device.createRenderPipeline({
			label: "Card Render Pipeline",
			layout: device.createPipelineLayout({
				bindGroupLayouts: [bindGroupLayout],
			}),
			vertex: {
				module: vertexShaderModule,
				entryPoint: "main",
				buffers: [
					{
						arrayStride: 5 * Float32Array.BYTES_PER_ELEMENT, // position(2) + cardId(1) + uv(2)
						attributes: [
							{
								shaderLocation: 0, // position
								offset: 0,
								format: "float32x2",
							},
							{
								shaderLocation: 1, // cardId
								offset: 2 * Float32Array.BYTES_PER_ELEMENT,
								format: "float32",
							},
							{
								shaderLocation: 2, // uv
								offset: 3 * Float32Array.BYTES_PER_ELEMENT,
								format: "float32x2",
							},
						],
					},
				],
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

		// Mouse interaction handlers
		const getCardAtPosition = (
			clientX: number,
			clientY: number,
		): number | null => {
			if (!canvasRef) return null;

			const rect = canvasRef.getBoundingClientRect();
			const x = ((clientX - rect.left) / rect.width) * 2 - 1;
			const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

			for (let i = 0; i < cardPositions.length; i++) {
				const card = cardPositions[i];
				if (
					x >= card.x &&
					x <= card.x + card.width &&
					y <= card.y &&
					y >= card.y - card.height
				) {
					return i;
				}
			}
			return null;
		};

		const handleMouseMove = (e: MouseEvent) => {
			const cardId = getCardAtPosition(e.clientX, e.clientY);
			const currentState = cardStates();

			if (cardId !== currentState.hoveredCard) {
				// Start hover out animation for previous card
				if (currentState.hoveredCard !== null) {
					animator.startAnimation(
						currentState.hoveredCard,
						"hover",
						currentState.hoverAmounts[currentState.hoveredCard],
						0,
						200,
					);
				}

				// Start hover in animation for new card
				if (cardId !== null) {
					animator.startAnimation(
						cardId,
						"hover",
						currentState.hoverAmounts[cardId],
						1,
						200,
					);
				}

				setCardStates({ ...currentState, hoveredCard: cardId });
			}
		};

		const handleClick = () => {
			const currentState = cardStates();
			const cardId = currentState.hoveredCard;

			if (cardId !== null) {
				const isFlipped = currentState.flippedCards.has(cardId);
				const newFlippedCards = new Set(currentState.flippedCards);

				if (isFlipped) {
					newFlippedCards.delete(cardId);
					animator.startAnimation(
						cardId,
						"flip",
						currentState.flipAmounts[cardId],
						0,
						300,
					);
				} else {
					newFlippedCards.add(cardId);
					animator.startAnimation(
						cardId,
						"flip",
						currentState.flipAmounts[cardId],
						1,
						300,
					);
				}

				setCardStates({ ...currentState, flippedCards: newFlippedCards });
			}
		};

		canvasRef.addEventListener("mousemove", handleMouseMove);
		canvasRef.addEventListener("click", handleClick);
		canvasRef.style.cursor = "pointer";

		// Animation loop
		let animationFrameId: number;

		function render() {
			if (!canvasRef) return;

			const currentState = cardStates();

			// Update animations
			for (let i = 0; i < 16; i++) {
				const hoverValue = animator.update(i);
				if (hoverValue !== null) {
					currentState.hoverAmounts[i] = hoverValue;
				}
			}

			// Update uniform buffer with current state (pack into vec4 arrays)
			const uniformData = new Float32Array(32); // 4 vec4s * 2 arrays = 32 floats
			// Pack hover amounts into first 4 vec4s (16 floats)
			for (let i = 0; i < 16; i++) {
				uniformData[i] = currentState.hoverAmounts[i];
			}
			// Pack flip amounts into next 4 vec4s (16 floats)
			for (let i = 0; i < 16; i++) {
				uniformData[16 + i] = currentState.flipAmounts[i];
			}
			device.queue.writeBuffer(uniformBuffer, 0, uniformData);

			const commandEncoder = device.createCommandEncoder();
			if (!context) return;
			const textureView = context.getCurrentTexture().createView();

			const renderPassDescriptor: GPURenderPassDescriptor = {
				colorAttachments: [
					{
						view: textureView,
						clearValue: { r: 0.05, g: 0.05, b: 0.05, a: 1.0 },
						loadOp: "clear",
						storeOp: "store",
					},
				],
			};

			const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
			passEncoder.setPipeline(pipeline);
			passEncoder.setBindGroup(0, bindGroup);
			passEncoder.setVertexBuffer(0, vertexBuffer);
			passEncoder.setIndexBuffer(indexBuffer, "uint16");
			passEncoder.drawIndexed(indices.length);
			passEncoder.end();

			device.queue.submit([commandEncoder.finish()]);

			// Continue animation loop
			animationFrameId = requestAnimationFrame(render);
		}

		// Start render loop
		render();

		onCleanup(() => {
			cancelAnimationFrame(animationFrameId);
			canvasRef?.removeEventListener("mousemove", handleMouseMove);
			canvasRef?.removeEventListener("click", handleClick);
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
						height={800}
						style={{
							width: "800px",
							height: "800px",
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
							Interactive card board with 16 cards in a 4x4 grid. Each card has
							a unique gradient border color.
						</p>
						<p style={{ "font-size": "0.9rem" }}>
							<strong>Hover</strong> over cards to see them brighten.{" "}
							<strong>Click</strong> to flip cards. Features smooth animations
							and rounded corners.
						</p>
					</div>
				</>
			)}
		</div>
	);
}
