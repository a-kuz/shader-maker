# Shader Maker

An AI-powered shader generator that creates, evaluates, and improves GLSL shaders based on text descriptions with real-time visual feedback.

## Features

- 🎨 **Generate GLSL shaders** from natural language descriptions
- 🔍 **Real-time preview** with Three.js WebGL rendering
- 📸 **Automatic screenshot capture** during shader execution
- 🤖 **AI-powered evaluation** with scoring and detailed feedback
- 🔄 **Iterative improvement** system with version tracking
- 💾 **Prompt history** with reusable shader library
- 📱 **Responsive design** for desktop and mobile

## Recent Improvements

### Fixed Screenshot Capture
- ✅ Replaced HTML-to-image with direct WebGL canvas capture
- ✅ Fixed black screenshot issue by using `preserveDrawingBuffer: true`
- ✅ Added proper timing and validation for screenshot capture
- ✅ Improved image quality with better compression settings

### Enhanced Improvement Process Visibility
- ✅ Added real-time progress indicators during shader improvement
- ✅ Visual overlays showing recording status and generation progress
- ✅ Step-by-step improvement feedback ("Analyzing...", "Generating...", "Capturing...")
- ✅ Better iteration management with timestamps and version numbers

### Better User Experience
- ✅ Improved iteration navigation with visual indicators
- ✅ Click-to-view screenshots in full size
- ✅ Error handling with fallback shaders
- ✅ Loading states and progress animations
- ✅ Better responsive design for mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/shader-maker.git
   cd shader-maker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   npm run setup
   ```
   This will create a `.env.local` file for your OpenAI API key.

4. **Add your OpenAI API key to `.env.local**:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** to use the app.

## How to Use

1. **Enter a description** of the shader you want (e.g., "a colorful spiral that rotates")
2. **Click "Generate Shader"** to create your initial shader
3. **Watch the real-time preview** as screenshots are automatically captured
4. **Review the AI evaluation** with scoring and improvement suggestions
5. **Click "Improve Shader"** to create enhanced iterations
6. **Navigate between versions** using the iteration buttons
7. **Browse your prompt history** to reuse and modify previous shaders

## Example Prompts

- "A swirling galaxy with stars"
- "Ocean waves with foam and reflection"
- "Procedural fire with realistic flames"
- "Abstract geometric patterns that pulse with music"
- "A fractal mandelbrot set with colors"

## How It Works

1. **Shader Generation:** OpenAI GPT-4.1 generates GLSL code from your text prompt
2. **Real-time Rendering:** Three.js renders the shader using WebGL
3. **Screenshot Capture:** Direct canvas capture creates screenshots every 0.3 seconds for 3 seconds
4. **AI Evaluation:** OpenAI Vision API analyzes screenshots and provides scoring (0-100) with feedback
5. **Iterative Improvement:** AI generates improved versions based on evaluation feedback
6. **Version Management:** Track multiple iterations with timestamps and easy navigation

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better DX
- **Three.js & React Three Fiber** - WebGL 3D rendering
- **OpenAI GPT-4.1** - AI generation and evaluation
- **SQLite & Better-SQLite3** - Local data persistence
- **Tailwind CSS** - Utility-first styling
- **React Three Drei** - Three.js helpers and controls

## API Endpoints

- `POST /api/shader/generate` - Generate new shader from prompt
- `POST /api/shader/evaluate` - Evaluate shader quality with AI
- `POST /api/shader/improve` - Create improved shader iteration
- `POST /api/shader/save-history` - Save shader to history
- `GET /api/prompt-history` - Retrieve saved shader history

## Project Structure

```
src/
├── app/
│   ├── api/                # API routes
│   │   ├── shader/         # Shader operations
│   │   └── prompt-history/ # History management
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx           # Main application
├── components/
│   └── ShaderCanvas.tsx   # WebGL shader renderer
└── lib/
    ├── db.ts             # SQLite database
    ├── openai.ts         # OpenAI integration
    └── types.ts          # TypeScript types
```

## Contributing

We welcome contributions! Feel free to:
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📖 Improve documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
