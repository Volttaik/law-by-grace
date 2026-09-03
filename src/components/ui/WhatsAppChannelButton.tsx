import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import {
  WHATSAPP_CHANNEL_LABEL,
  WHATSAPP_CHANNEL_URL,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppChannelButtonProps {
  /** Call-to-action text (hidden when iconOnly). */
  label?: string;
  /** Icon-only affordance for compact/dark toolbars. */
  iconOnly?: boolean;
  /** Extra classes appended after the base style. */
  className?: string;
}

/**
 * "Join WhatsApp Channel" button attached to courses.
 *
 * Links to the centralized WHATSAPP_CHANNEL_URL — no per-course setup needed,
 * so every existing and newly uploaded course automatically carries the
 * channel. Opens in a new tab and works identically on mobile and desktop.
 */
export default function WhatsAppChannelButton({
  label = WHATSAPP_CHANNEL_LABEL,
  iconOnly = false,
  className,
}: WhatsAppChannelButtonProps) {
  return (
    <a
      href={WHATSAPP_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]",
        iconOnly
          ? "p-1.5 text-white/50 hover:text-white hover:bg-white/10"
          : "px-4 py-2 text-white bg-[#25D366] hover:bg-[#1DA851] active:scale-[0.98]",
        className
      )}
    >
      <WhatsAppIcon className="w-4 h-4 shrink-0" />
      {!iconOnly && <span>{label}</span>}
    </a>
  );
}
