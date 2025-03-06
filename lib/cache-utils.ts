import { revalidateTag, revalidatePath } from "next/cache";

/**
 * Invalidate cache by tag
 *
 * @param tag The cache tag to invalidate
 */
export function invalidateCache(tag: string) {
  revalidateTag(tag);
}

/**
 * Invalidate multiple cache tags
 *
 * @param tags Array of cache tags to invalidate
 */
export function invalidateCacheTags(tags: string[]) {
  tags.forEach((tag) => revalidateTag(tag));
}

/**
 * Invalidate cache by path
 *
 * @param path The path to invalidate
 */
export function invalidateCachePath(path: string) {
  revalidatePath(path);
}

/**
 * Common cache tags used in the application
 */
export const CacheTags = {
  DASHBOARD: "dashboard",
  APPOINTMENTS: "appointments",
  CLIENTS: "clients",
  SERVICES: "services",
  PROFESSIONALS: "professionals",
  BUSINESS: "business",
  USER: "user",
  ALL: "all",
};
