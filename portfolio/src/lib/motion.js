// Shared spring presets so every tilting/floating element in the
// scene obeys consistent physics instead of scattered ad-hoc numbers.
// Heavier objects (the hero chassis, a full project showcase) settle
// slower and with more resistance; lighter ones (a small card, the
// cursor) react faster and snappier.

export const HEAVY_OBJECT = { stiffness: 120, damping: 24, mass: 0.9 };
export const MEDIUM_OBJECT = { stiffness: 180, damping: 24, mass: 0.6 };
export const LIGHT_OBJECT = { stiffness: 300, damping: 28, mass: 0.4 };
export const CURSOR = { stiffness: 400, damping: 30, mass: 0.2 };

export const EASE_OUT = [0.16, 1, 0.3, 1];
// Heavier, longer-tailed ease for big structural reveals (pinned
// headline, section-scale entrances), ~0.6-0.9s. EASE_OUT stays the
// default for small UI: hovers, buttons, card lifts.
export const EASE_REVEAL = [0.075, 0.82, 0.165, 1];
