# Petri Net Editor

A web-based Petri net modeling and simulation tool built with diagram-js. This editor allows you to create, edit, simulate, and export Petri nets using an intuitive visual interface.

## 📋 Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [How to Use](#how-to-use)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Development](#development)
- [Export & Import](#export--import)

## ✨ Features

### Core Functionality
- **Visual Editing**: Drag-and-drop interface for creating Petri nets
- **Element Types**:
  - Places (circles with token support)
  - Transitions (rectangles)
  - Empty Transitions (filled rectangles for silent transitions)
  - Arcs (connections between places and transitions)
- **Multi-line Labels**: Support for text labels on all elements
- **Token Management**: Visual representation of tokens (1-4 as dots, >4 as numbers)
- **Simulation**: Real-time simulation with visual feedback
  - Enabled transitions highlighted in green
  - Fired transitions highlighted in purple
  - Play triangle indicator on enabled transitions
- **PNML Export/Import**: Standard Petri Net Markup Language support
- **SVG Export**: Export diagrams as scalable vector graphics

### User Interface
- Context menu for element-specific actions
- Palette for creating new elements
- Direct editing of labels
- Keyboard shortcuts for common operations
- Element selection and multi-selection
- Resizing and moving elements
- Bendpoint editing for connections

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://gitlab.gbar.dtu.dk/s234657/diagram-js.git
cd diagram-js
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:8080
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📖 How to Use

### Creating a Petri Net

1. **Add Places**: 
   - Click the circle icon in the palette
   - Click on the canvas to place it
   - Double-click to edit the label

2. **Add Transitions**:
   - Click the rectangle icon in the palette
   - Choose between regular (empty) or filled (silent) transitions
   - Place on canvas

3. **Connect Elements**:
   - Click the connection icon or use the context menu
   - Click on source element, then target element
   - Connections automatically get arrow markers

4. **Add Tokens**:
   - Select a place
   - Use the context menu to add/remove tokens
   - Tokens display visually inside places

5. **Edit Labels**:
   - Double-click any element
   - Type your label (use Shift+Enter for multi-line)
   - Labels automatically position themselves

### Simulation

1. **Enable Simulation Mode**: Click the "Simulate" button
2. **Fire Transitions**: 
   - Enabled transitions show in green with a play triangle
   - Click an enabled transition to fire it
   - Tokens move according to Petri net rules
3. **Reset**: Use the reset button to return to initial marking

### Export & Import

#### Export PNML
1. Click "PNML Export" button
2. File downloads automatically as `petri-net.pnml`
3. Compatible with other Petri net tools

#### Import PNML
1. Click "PNML Import" button
2. Select a `.pnml` or `.xml` file
3. Diagram loads with all elements, labels, and tokens

#### Export SVG
1. Click "SVG Export" button
2. Downloads diagram as scalable vector graphic

## 🏗️ Architecture

### Design Principles

This project follows **SOLID principles** for maintainable, extensible code:

- **Single Responsibility**: Each class/module has one clear purpose
- **Open/Closed**: Easy to extend with new element types
- **Liskov Substitution**: Consistent interfaces throughout
- **Interface Segregation**: Focused, minimal interfaces
- **Dependency Inversion**: Depends on abstractions, not concrete implementations

### Key Architectural Decisions

#### 1. Rendering Architecture
- **Main Renderer** (`BaseRender.js`): Coordinates all rendering
- **Specialized Renderers**:
  - `LabelRenderer`: Handles all label rendering
  - `TokenRenderer`: Renders tokens in places
- **Shape Renderers**: Function-based renderers for each shape type
  - `PlaceRenderer`: Circle drawing and paths
  - `TransitionRenderer`: Rectangle drawing with simulation states
  - `EmptyTransitionRenderer`: Filled rectangle for silent transitions
- **Helpers**:
  - `ConnectionRenderer`: Arrow marker creation
  - `PlayTriangleHelper`: Play indicator for enabled transitions

#### 2. PNML Export/Import Architecture
- **PnmlExporter**: Main export coordinator
  - Uses specialized **builders** for each element type
  - `PlaceBuilder`, `TransitionBuilder`, `EmptyTransitionBuilder`, `ArcBuilder`
- **PnmlImporter**: Main import coordinator
  - Uses specialized **parsers** for each element type
  - `PlaceParser`, `TransitionParser`, `ArcParser`

**Benefits**: Adding new element types only requires creating new builder/parser modules, no changes to existing code.

#### 3. Service-Based Architecture
All functionality accessed through injected services:
- `canvas`: Drawing surface management
- `elementFactory`: Element creation
- `modeling`: Element manipulation
- `simulationService`: Simulation logic
- `idCounterService`: ID management

## 📁 Project Structure

```
diagram-js/
├── public/
│   ├── index.html          # Main HTML file
│   └── index.js            # Application initialization
├── src/
│   ├── draw/               # Rendering modules
│   │   ├── BaseRender.js   # Main renderer coordinator
│   │   ├── renderers/      # Specialized renderers
│   │   │   ├── LabelRenderer.js
│   │   │   └── TokenRenderer.js
│   │   ├── shapes/         # Shape-specific drawing
│   │   │   ├── PlaceRenderer.js
│   │   │   ├── TransitionRenderer.js
│   │   │   └── EmptyTransitionRenderer.js
│   │   └── helpers/        # Rendering utilities
│   │       ├── ConnectionRenderer.js
│   │       └── PlayTriangleHelper.js
│   ├── export/             # PNML import/export
│   │   ├── PnmlExporter.js
│   │   ├── PnmlImporter.js
│   │   ├── builders/       # XML generation
│   │   │   ├── PlaceBuilder.js
│   │   │   ├── TransitionBuilder.js
│   │   │   ├── EmptyTransitionBuilder.js
│   │   │   └── ArcBuilder.js
│   │   └── parsers/        # XML parsing
│   │       ├── PlaceParser.js
│   │       ├── TransitionParser.js
│   │       └── ArcParser.js
│   ├── providers/          # Context menus & palettes
│   │   ├── ContextPadProvider.js
│   │   ├── PaletteProvider.js
│   │   └── RuleProvider.js
│   ├── features/           # Additional functionality
│   │   ├── IdCounterService.js
│   │   └── SimulationService.js
│   ├── factory/            # Element creation
│   │   └── ElementFactory.js
│   └── Editor.js           # Main editor class
├── webpack.config.js       # Webpack configuration
└── package.json           # Dependencies
```

## 💻 Development

### Code Style
- ES6+ JavaScript
- Modular architecture with ES6 imports/exports
- Simple, clear comments explaining functionality
- Consistent naming conventions

### Adding New Element Types

Thanks to the SOLID architecture, adding new elements is straightforward:

1. **Add Renderer** in `src/draw/shapes/`:
```javascript
export function drawNewElement(parentGfx, element, styles) {
  // Drawing logic
}

export function getNewElementPath(shape) {
  // Path calculation for hit detection
}
```

2. **Add Builder** in `src/export/builders/`:
```javascript
export function buildNewElementXml(element) {
  // Generate PNML XML
}
```

3. **Add Parser** in `src/export/parsers/`:
```javascript
export default class NewElementParser {
  static parse(node, ...) {
    // Parse PNML XML
  }
}
```

4. **Update Main Files**:
   - Import and call in `BaseRender.js`
   - Import and call in `PnmlExporter.js`
   - Import and call in `PnmlImporter.js`

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## 📤 Export & Import

### PNML Format
This tool uses standard PNML (ISO/IEC 15909-2) with extensions:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pnml>
  <net id="ptnet1" type="http://www.pnml.org/version-2009/grammar/ptnet">
    <page id="top-level">
      <place id="p1">
        <graphics>
          <position x="100" y="100" />
          <dimension x="50" y="50" />
        </graphics>
        <name>
          <text>Place Name</text>
          <graphics>
            <offset x="0" y="0" />
          </graphics>
        </name>
        <initialMarking>
          <text>3</text>
        </initialMarking>
      </place>
      <!-- transitions and arcs -->
    </page>
  </net>
</pnml>
```

### Custom Extensions
- **Empty Transitions**: Marked with `toolspecific` tag
- **Label Offsets**: Custom positioning for labels
- **Waypoints**: Intermediate points for connections

## 🎯 Why This Architecture?

### Maintainability
- Clear separation of concerns
- Each file has one purpose
- Easy to locate and fix bugs

### Extensibility
- Add new shapes without modifying existing code
- Plug in new export formats easily
- Service-based architecture allows easy feature addition

### Testability
- Small, focused modules are easy to test
- Dependencies injected, easy to mock
- Clear interfaces between components

### Performance
- Function-based renderers for efficiency
- Minimal object creation during rendering
- Lazy evaluation where possible

## 📝 License

This project is part of a thesis project at DTU (Technical University of Denmark).

## 👥 Author

Ricardo Perez Marin (s234657)
Technical University of Denmark

## 🙏 Acknowledgments

Built on top of [diagram-js](https://github.com/bpmn-io/diagram-js) by bpmn.io.
