export const userRoles = ["OWNER", "ADMIN", "MANAGER"] as const;
export type UserRole = (typeof userRoles)[number];

export const documentTypes = ["CONTRACT", "INVOICE", "ACCEPTANCE_ACT"] as const;
export type DocumentType = (typeof documentTypes)[number];

export const workTypes = ["WORKS", "SERVICES"] as const;
export type WorkType = (typeof workTypes)[number];

