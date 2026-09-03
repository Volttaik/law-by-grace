/**
 * WhatsApp Channel — centralized configuration.
 *
 * Every course on the platform carries a "Join WhatsApp Channel" button that
 * points at this single source of truth, so the channel link can be updated in
 * one place instead of being duplicated across the codebase.
 *
 * Client-safe: this module never reads process.env, so it can be imported from
 * client components ("use client") as well as server components.
 */
export const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbB5b4tH5JLvbBPfHt2Z";

/** Default call-to-action shown on the WhatsApp Channel button. */
export const WHATSAPP_CHANNEL_LABEL = "Join WhatsApp Channel";
