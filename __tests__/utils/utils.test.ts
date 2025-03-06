import { cn } from "@/lib/utils"
import { describe, expect, test } from "vitest"

describe("cn utility function", () => {
  test("should merge class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2")
    expect(cn("class1", undefined, "class2")).toBe("class1 class2")
    expect(cn("class1", false && "class2", true && "class3")).toBe("class1 class3")
    expect(cn("class1", { class2: true, class3: false })).toBe("class1 class2")
  })
})

