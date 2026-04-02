/** Allowed welding consumable coating types (alphabetical for UI selects). */
export const WELDING_COATING_TYPES = ["A", "B", "C", "R", "RA", "RB", "RC", "S"] as const;

export type WeldingCoatingType = (typeof WELDING_COATING_TYPES)[number];
