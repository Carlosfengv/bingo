import { createContext } from "react";

// Only renderers whose visible controls depend on selection subscribe here.
// Ordinary element trees keep their cached JSX when the selection changes.
export const CanvasSelectionContext = createContext<Set<string> | null>(null);
