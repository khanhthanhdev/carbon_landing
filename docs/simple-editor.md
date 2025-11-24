# Simple Editor

## Setup

- Install the project dependencies (for example, `pnpm install`) and run `pnpm dev` to preview the editor at `/simple`.
- The `SimpleEditor` component is a fully client-side Tiptap experience (`"use client"`) that you can drop into any React or Next.js component.
- Once the app is running, import the component from the template folder shown below, then render it inside a client component of your choice.

## Usage

After installing the project, drop the `SimpleEditor` component into any client component within your React or Next.js app:

```tsx
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

export default function App() {
  return <SimpleEditor />;
}
```

This renders the fully themed tiptap-powered editor along with the toolbar, toolbar popovers, and helper nodes that ship with the template.

## Features

- Fully responsive layout that adapts to desktop and mobile breakpoints.
- Light and dark mode support via the built-in `ThemeToggle`.
- Text formatting controls (bold, italic, underline, strike, code, subscript, superscript).
- List controls (bullets, ordered, task lists with nested items).
- Text alignment options for left/center/right/justify.
- Heading dropdown supporting multiple levels (H1–H4).
- Inline color highlighting with popover and mobile-friendly fallback.
- Link editing UI with a dedicated popover.
- Image upload via a dedicated button and node extension.
- Blockquote and code-block helpers plus undo/redo history management.
- Custom nodes for images, horizontal rules, code blocks, and structured lists.

## Composition

### Hooks
- `use-is-breakpoint` + `use-window-size` – coordinate toolbar layout across breakpoints.
- `use-cursor-visibility` – keep the floating toolbar anchored while typing.

### Icons
- `arrow-left-icon`, `highlighter-icon`, `link-icon` – used inside toolbar buttons and mobile controls.

### Extensions
- `selection-extension`, `link-extension`, `trailing-node-extension` – used by the toolbar components to control editor behavior.

### Lib helpers
- `tiptap-utils` – handles image upload (including file-size limits) and shared helpers.

### UI components
- `blockquote-button`, `code-block-button`, `color-highlight-button`, `color-highlight-popover`, `heading-button`, `heading-dropdown-menu`, `image-upload-button`, `link-popover`, `list-button`, `list-dropdown-menu`, `mark-button`, `text-align-button`, `undo-redo-button` – toolbar controls that connect back to `SimpleEditor`.

### Node components
- `code-block-node`, `image-node`, `image-upload-node`, `list-node`, `paragraph-node` – provide structured rendering for the editor content.

### Primitives
- `button`, `spacer`, `toolbar` – lightweight building blocks used by the toolbar and mobile views.

## Customization notes

- Override SCSS variables or extend `simple-editor.scss` when customizing layout/spacing.
- Swap data/content payloads by supplying a different `content` JSON object or calling `editor.commands`.
- Extend the toolbar by composing existing primitives (`Toolbar`, `ToolbarGroup`, `ToolbarSeparator`) together with new buttons.
