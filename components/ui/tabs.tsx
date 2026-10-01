"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  label: string;
  tabs: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Prefix for tab/panel ids so consumers can wire `aria-controls`. */
  idPrefix: string;
  className?: string;
}

/** Id of the panel a tab controls; give your `role="tabpanel"` this id. */
export const tabPanelId = (idPrefix: string, id: string) =>
  `${idPrefix}-panel-${id}`;

/** Accessible tablist with roving tabindex and arrow-key navigation. */
export function Tabs({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
  className,
}: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === value);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex gap-1 rounded-md border border-line bg-surface p-1",
        className,
      )}
    >
      {tabs.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-8 cursor-pointer rounded-sm px-3 text-sm font-medium transition-colors duration-150",
              selected
                ? "bg-raised text-fg"
                : "text-subtle hover:text-fg",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
