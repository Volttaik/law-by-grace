"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColorSwatch {
  name: string;
  value: string | null; // null = default / remove color
}

export const TEXT_COLOR_SWATCHES: ColorSwatch[] = [
  { name: "Default", value: null },
  { name: "Black", value: "#14161a" },
  { name: "Gray", value: "#6b7280" },
  { name: "Brown", value: "#8b4513" },
  { name: "Maroon", value: "#8b0000" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Gold", value: "#c8860a" },
  { name: "Olive", value: "#735b25" },
  { name: "Green", value: "#15803d" },
  { name: "Dark green", value: "#1a472a" },
  { name: "Teal", value: "#0f766e" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Navy", value: "#1e3a5f" },
  { name: "Indigo", value: "#4b0082" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
];

interface ColorPickerContentProps {
  /** Currently applied color (hex) or null when the default color is active. */
  current: string | null;
  onPick: (color: string | null) => void;
  /** Large touch targets (mobile bottom sheet). */
  large?: boolean;
}

export function ColorPickerContent({ current, onPick, large = false }: ColorPickerContentProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-2.5">
        Text color
      </p>
      <div className={cn("grid gap-2", large ? "grid-cols-5" : "grid-cols-8")}>
        {TEXT_COLOR_SWATCHES.map(swatch => {
          const isActive = swatch.value === null ? current === null || !current : current?.toLowerCase() === swatch.value.toLowerCase();
          const isDefault = swatch.value === null;
          return (
            <button
              key={swatch.name}
              type="button"
              onClick={() => onPick(swatch.value)}
              aria-label={`Text color: ${swatch.name}`}
              aria-pressed={isActive}
              title={swatch.name}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-xl transition-all",
                large ? "py-2" : "py-1.5"
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full border transition-all",
                  large ? "w-11 h-11 border-[2.5px]" : "w-8 h-8 border-2",
                  isActive
                    ? "border-primary ring-2 ring-primary/30 scale-105"
                    : "border-outline-variant/50 hover:scale-110 hover:border-outline"
                )}
                style={isDefault ? { background: "transparent" } : { background: swatch.value as string }}
              >
                {isDefault ? (
                  <span
                    className={cn("text-on-surface-variant", large ? "h-4 w-4" : "h-3.5 w-3.5")}
                    aria-hidden
                  >
                    <Minus className="h-full w-full" />
                  </span>
                ) : (
                  isActive && <Check className={cn("text-white drop-shadow", large ? "h-5 w-5" : "h-3.5 w-3.5")} aria-hidden />
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-none text-center",
                  isActive ? "text-on-surface font-semibold" : "text-on-surface-variant/80 group-hover:text-on-surface"
                )}
              >
                {swatch.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-on-surface-variant/70 leading-relaxed">
        {current ? "Choose “Default” to return the text to its normal color." : "No custom color applied."}
      </p>
    </div>
  );
}