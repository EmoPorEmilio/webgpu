# WebGPU Triangle Demo

A simple demonstration of rendering a triangle using WebGPU with **Vite**, **Bun**, and **Solid.js**.

## 🚀 Features

- **WebGPU Rendering**: Uses the modern WebGPU API to render a colored triangle
- **Solid.js**: Reactive UI framework with minimal overhead
- **SolidJS Router**: Client-side routing between pages
- **TypeScript**: Full type safety including WebGPU types
- **Bun**: Fast JavaScript runtime and package manager
- **Vite**: Lightning-fast development server with HMR
- **Biome**: Fast linter and formatter

## 🛠️ Tech Stack

- [Solid.js](https://www.solidjs.com/) - Reactive JavaScript library
- [WebGPU](https://www.w3.org/TR/webgpu/) - Modern graphics API
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Biome](https://biomejs.dev/) - Fast linter and formatter

## 📋 Prerequisites

- **Bun** v1.2.13 or higher
- **Chrome 113+** or **Edge 113+** (for WebGPU support)

## 🎯 Getting Started

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

This will start the development server at http://localhost:3000

### Build

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

## 📁 Project Structure

```
webgpu/
├── src/
│   ├── components/
│   │   └── WebGPUTriangle.tsx   # WebGPU rendering component
│   ├── pages/
│   │   ├── Home.tsx              # Home page with navigation
│   │   └── Shader.tsx            # Shader demo page
│   ├── App.tsx                   # Root app component with routing
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Global styles
├── index.html                    # HTML template
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── biome.json                    # Biome linter/formatter config
└── package.json                  # Project dependencies
```

## 🎨 How It Works

### WebGPU Triangle Component

The `WebGPUTriangle` component demonstrates:

1. **GPU Adapter & Device Setup**: Requests a WebGPU adapter and device
2. **Canvas Configuration**: Configures the canvas for WebGPU rendering
3. **Shader Creation**: 
   - **Vertex Shader**: Defines triangle vertices in clip space (WGSL)
   - **Fragment Shader**: Defines the color for each pixel (WGSL)
4. **Render Pipeline**: Creates a rendering pipeline with the shaders
5. **Rendering**: Draws the triangle to the canvas

### WGSL Shaders

The project uses **WGSL** (WebGPU Shading Language) for shaders:

```wgsl
// Vertex Shader - defines triangle position
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
    var positions = array<vec2f, 3>(
        vec2f(0.0, 0.5),    // Top
        vec2f(-0.5, -0.5),  // Bottom-left
        vec2f(0.5, -0.5)    // Bottom-right
    );
    return vec4f(positions[vertexIndex], 0.0, 1.0);
}

// Fragment Shader - defines triangle color
@fragment
fn main() -> @location(0) vec4f {
    return vec4f(0.6, 0.4, 0.9, 1.0); // Purple
}
```

## 🌐 Browser Compatibility

WebGPU is currently supported in:

- ✅ Chrome 113+ (Stable)
- ✅ Edge 113+ (Stable)
- ✅ Safari 18+ (with some limitations)
- ❌ Firefox (In development, behind flag)

## 📝 Routes

- `/` - Home page with project description and navigation button
- `/shader` - WebGPU triangle shader demo page

## 🔧 Linting & Formatting

The project uses Biome for fast linting and formatting:

```bash
# Check code
bun biome check .

# Fix issues
bun biome check --write .
```

## 🐛 Troubleshooting

### "WebGPU is not supported" Error

- Make sure you're using Chrome 113+ or Edge 113+
- Check that hardware acceleration is enabled in browser settings
- Try visiting `chrome://gpu` to verify WebGPU is available

### Build Errors with Bun

- Ensure you're using Bun v1.2.13 or higher
- Try removing `node_modules` and `bun.lock` and reinstalling
- Some packages may have postinstall scripts that fail - use `bun install --ignore-scripts` if needed

## 📚 Resources

- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WGSL Specification](https://www.w3.org/TR/WGSL/)
- [Solid.js Documentation](https://www.solidjs.com/docs/latest)
- [Bun Documentation](https://bun.sh/docs)

## 📄 License

MIT

## 👨‍💻 Contributing

Feel free to submit issues and pull requests!

---

Built with ❤️ using WebGPU, Solid.js, and Bun
