"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({ label, value, suffix, icon, className }: StatCardProps) {
  return (
    <div className={cn("card p-6 flex flex-col gap-2", className)}>
      {icon && (
        <div className="w-10 h-10 bg-secondary-container rounded-xl flex items-center justify-center text-on-secondary-container mb-1">
          {icon}
        </div>
      )}
      <p className="font-manrope font-bold text-3xl text-primary">
        {value}
        {suffix && <span className="text-secondary">{suffix}</span>}
      </p>
      <p className="text-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
