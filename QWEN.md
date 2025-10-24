# flat-json-tree Project Context

## Project Overview

`flat-json-tree` is a TypeScript library that provides a simple way to manipulate JSON tree objects. The core idea is to transform a JSON tree object into a flat array, allowing standard array operations like `find`, `findIndex`, `filter`, `map`, and others. It's built as a Vue 3 composable function.

The library is published as `@vuebro/flat-json-tree` with the current version being 2.1.14. It's designed to work with tree structures where each element has a unique identifier field.

## Architecture and Implementation

The library transforms a JSON tree into a flat array while preserving the tree structure through computed properties added to each child object:

- `branch`: Array of objects representing the path from root to current node
- `index`: Index of the object in the sibling array
- `next`: Next object in the sibling array
- `parent`: Parent object
- `prev`: Previous object in the sibling array
- `siblings`: Array of sibling objects

The main implementation is in `src/index.ts` as a default export function that takes a tree and optional configuration object, returning a composable with reactive properties and manipulation functions.

## Building and Running

### Prerequisites

- Node.js and npm

### Build Process

To build the project:

```bash
npm run build
```

This command uses TypeScript compiler (tsc) to compile the source code.

### Linting

To lint the code:

```bash
npm run lint
```

### Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the project

## Key Features and API

### Main Function

`useFlatJsonTree(tree, options?)` - The main composable function with the following return value:

- `nodes`: ComputedRef with the flat array of objects
- `nodesMap`: ComputedRef with an object mapping unique IDs to objects
- Manipulation functions: `add`, `addChild`, `remove`, `down`, `left`, `right`, `up`

### Manipulation Functions

- `add`: Add an empty object to the siblings
- `addChild`: Add an empty object to the children
- `remove`: Remove an object from the tree
- `down`: Move an object down by one position
- `left`: Move an object left by one position
- `right`: Move an object right by one position
- `up`: Move an object up by one position

## Development Conventions

### Coding Style

- The project uses TypeScript with Vue 3 reactivity
- Follows ESLint linting rules defined in `@vuebro/configs/eslint`
- TypeScript configuration extends `@vuebro/configs/tsconfig`
- Uses Prettier formatting with `@vuebro/configs/prettierrc` configuration

### File Structure

- `src/index.ts`: Main implementation file
- `dist/`: Compiled output directory
- Configuration files at root level (eslint.config.ts, tsconfig.json, etc.)

### Dependencies

- Vue 3 (reactivity system) as main dependency
- Development dependencies include TypeScript, Node types, and VueBro configuration packages
