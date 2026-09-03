"use client";

import { cn } from "@/lib/utils";
import { generateContributionGrid } from "@/lib/utils";
import { useMemo } from "react";

const INTENSITY_COLORS = [
  "bg-surface-container-high",
  "bg-secondary-container/40",
  "bg-secondary-container/70",
  "bg-secondary-container",
  "bg-secondary",
];

const DAYS = ["Mon", "", "Wed", "", "Fri", "", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ContributionGraph({ totalContributions }: { totalContributions: number }) {
  const grid = useMemo(() => generateContributionGrid(totalContributions || 42), [totalContributions]);
  const weeks = [];
  for (let i = 0; i < 52; i++) {
    weeks.push(grid.slice(i * 7, i * 7 + 7));
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-manrope font-semibold text-base text-primary">
          {totalContributions.toLocaleString()} contributions in the last year
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <span>Less</span>
          {INTENSITY_COLORS.map((c, i) => (
            <div key={i} className={cn("w-3 h-3 rounded-sm", c)} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1">
            {DAYS.map((d, i) => (
              <div key={i} className="h-3 w-6 text-[10px] text-on-surface-variant/50 flex items-center">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((level, di) => (
                <div
                  key={di}
                  className={cn("contribution-cell rounded-sm transition-all hover:scale-125 hover:rounded-md cursor-pointer", INTENSITY_COLORS[level])}
                  title={`${level > 0 ? `${level * 3} contributions` : "No contributions"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 text-[10px] text-on-surface-variant/50 pl-7 overflow-x-auto no-scrollbar">
        {MONTHS.map((m) => (
          <span key={m} className="min-w-[3.5rem]">{m}</span>
        ))}
      </div>
    </div>
  );
}
