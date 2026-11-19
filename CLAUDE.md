# Cleary Health: notes for Claude

## Guardrails on every typed field (always)

Any new chat, AI feature or field where a person can type and save text (notes, events, visits, profile,
names, upload notes) runs the text through the guardrails in the same change:
- saved text: `checkText()` / `checkTexts()` (screen plus the Haiku health-purpose check) or `screenSaved()`
  (screen only, for names and short fields) from `lib/saved-text.ts`;
- chat: `screen()` from `lib/chat-guardrails.ts` before anything reaches the AI.

Add should-block and should-allow cases to `scripts/test-chat-guardrails.mts` and run
`npx tsx scripts/test-chat-guardrails.mts`. `lib/chat-guardrails.ts` has the GLOBAL rules (the same in every
Cleary app; Cleary Trading's `lib/assistant/guardrails.ts` is the reference) and the HEALTH rules (emergencies,
medicine doses, disordered eating). Medical body words stay allowed. The suite rules live in Cleary Trading's
`docs/CLEARY_SUITE.md`.
