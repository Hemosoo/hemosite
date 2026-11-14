import { createContext, useContext } from "react";

/**
 * Which of the five is being pointed at, from either end: hovering a word in
 * the bio lifts its photograph in the strip, and hovering a photograph marks
 * its word. About owns the state; the words and the strip only share it.
 */
export interface Lit {
  lit: string | null;
  setLit: (id: string | null) => void;
}

export const LitContext = createContext<Lit>({ lit: null, setLit: () => {} });

export const useLit = () => useContext(LitContext);
