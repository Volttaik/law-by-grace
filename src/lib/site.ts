/**
 * Law by Grace · public site constants.
 *
 * Server components only — this module reads process.env and must never be
 * imported from a client component ("use client").
 */
export const SITE_NAME = "Law by Grace";
export const SITE_URL = "https://lawbygrace.app";

/** Support/contact address used on public Contact & Support pages. */
export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL?.trim() || "hello@lawbygrace.app";
