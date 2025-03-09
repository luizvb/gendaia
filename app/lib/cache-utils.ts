export enum CacheTags {
  APPOINTMENTS = "appointments",
  DASHBOARD = "dashboard",
}

export function invalidateCacheTags(tags: CacheTags[]) {
  // Implement cache invalidation logic here
  console.log("Invalidating cache tags:", tags);
}
