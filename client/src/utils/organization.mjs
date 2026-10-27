// Keep occupied posts and reconnect their children through any hidden vacancy.
export function occupiedHierarchy(positions, employees) {
  const occupied = new Set(
    employees.filter((e) => e.status === "ACTIVO").map((e) => e.position_id),
  );
  const byId = new Map(positions.map((p) => [p.id, p]));
  return positions
    .filter((p) => occupied.has(p.id))
    .map((position) => {
      const seen = new Set([position.id]);
      let parent = position.parent_position_id;
      let nearest = null;
      while (parent && byId.has(parent)) {
        if (seen.has(parent)) {
          nearest = null;
          break;
        }
        seen.add(parent);
        if (nearest === null && occupied.has(parent)) nearest = parent;
        parent = byId.get(parent).parent_position_id;
      }
      return { ...position, parent_position_id: nearest };
    });
}
