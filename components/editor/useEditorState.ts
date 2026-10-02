"use client";

import { useReducer } from "react";
import { OPERATIONS_BY_ID } from "@/lib/editor/operations";
import { MAX_RECIPE_STEPS } from "@/lib/editor/recipe";

export type Step = {
  uid: string;
  opId: string;
  params: Record<string, unknown>;
};

type State = {
  steps: Step[];
  selected: string | null;
  past: Step[][];
  future: Step[][];
  /** uid of the step last edited; consecutive edits to it share one undo entry. */
  lastEdit: string | null;
};

type Action =
  | { type: "add"; opId: string }
  | { type: "update"; uid: string; params: Record<string, unknown> }
  | { type: "remove"; uid: string }
  | { type: "move"; uid: string; by: -1 | 1 }
  | { type: "select"; uid: string | null }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" };

const HISTORY_LIMIT = 100;

function commit(state: State, steps: Step[], extra: Partial<State> = {}): State {
  return {
    ...state,
    past: [...state.past, state.steps].slice(-HISTORY_LIMIT),
    future: [],
    lastEdit: null,
    ...extra,
    steps,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const op = OPERATIONS_BY_ID[action.opId];
      if (!op || state.steps.length >= MAX_RECIPE_STEPS) return state;
      const step: Step = {
        uid: crypto.randomUUID(),
        opId: op.id,
        params: structuredClone(op.defaults) as Record<string, unknown>,
      };
      return commit(state, [...state.steps, step], { selected: step.uid });
    }
    case "update": {
      const steps = state.steps.map((s) =>
        s.uid === action.uid ? { ...s, params: action.params } : s,
      );
      // Coalesce a run of edits to the same step (e.g. a slider drag) into one undo.
      if (state.lastEdit === action.uid) return { ...state, steps };
      return commit(state, steps, { lastEdit: action.uid });
    }
    case "remove": {
      const steps = state.steps.filter((s) => s.uid !== action.uid);
      const selected =
        state.selected === action.uid ? (steps.at(-1)?.uid ?? null) : state.selected;
      return commit(state, steps, { selected });
    }
    case "move": {
      const i = state.steps.findIndex((s) => s.uid === action.uid);
      const j = i + action.by;
      if (i < 0 || j < 0 || j >= state.steps.length) return state;
      const steps = [...state.steps];
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return commit(state, steps);
    }
    case "select":
      return { ...state, selected: action.uid, lastEdit: null };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        steps: previous,
        past: state.past.slice(0, -1),
        future: [state.steps, ...state.future],
        lastEdit: null,
        selected: previous.some((s) => s.uid === state.selected) ? state.selected : null,
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        steps: next,
        past: [...state.past, state.steps],
        future: state.future.slice(1),
        lastEdit: null,
        selected: next.some((s) => s.uid === state.selected) ? state.selected : null,
      };
    }
    case "reset":
      if (state.steps.length === 0) return state;
      return commit(state, [], { selected: null });
  }
}

const INITIAL: State = { steps: [], selected: null, past: [], future: [], lastEdit: null };

/** The recipe being edited, with undo/redo history. */
export function useEditorState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  return {
    steps: state.steps,
    selected: state.steps.find((s) => s.uid === state.selected) ?? null,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    dispatch,
  };
}
