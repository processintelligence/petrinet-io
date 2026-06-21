export const REGION_TYPE = {
  BRANCH: "branch",
  COMPLEX: "complex",
  CYCLE: "cycle"
};

export function isOpaqueRegionType(type) {
  return type === REGION_TYPE.CYCLE || type === REGION_TYPE.COMPLEX;
}

export function isLayoutBoundaryRegionType(type) {
  return type === REGION_TYPE.BRANCH || isOpaqueRegionType(type);
}

export function opaqueRegionPriority(type) {
  return type === REGION_TYPE.CYCLE ? 0 : 1;
}

export function compareNodeIds(first, second) {
  return String(first).localeCompare(String(second));
}

export function uniqueInOrder(items) {
  return [...new Set(items)];
}

export function uniqueSorted(items) {
  return uniqueInOrder(items).sort(compareNodeIds);
}
