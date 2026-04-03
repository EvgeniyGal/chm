/** Portaled list from `SearchableDropdownOptionField` — Dialog must not treat clicks here as "outside". */
export const SEARCHABLE_DROPDOWN_PORTAL_DATA_ATTR = "data-searchable-dropdown-portal";
const SEARCHABLE_DROPDOWN_PORTAL_SELECTOR = "[data-searchable-dropdown-portal]";

export function isSearchableDropdownPortalTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(SEARCHABLE_DROPDOWN_PORTAL_SELECTOR));
}
