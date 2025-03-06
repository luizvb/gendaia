import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/clients/route"
import { supabase } from "@/lib/supabase"
import { describe, beforeEach, test, expect, jest } from "@jest/globals"

// Mock the supabase client
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe("Clients API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/clients", () => {
    test("should return clients", async () => {
      // Mock the supabase response
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            name: "John Doe",
            phone: "123456789",
            email: "john@example.com",
            business_id: "1",
          },
        ],
        error: null,
      })

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request
      const request = new NextRequest("http://localhost:3000/api/clients")

      // Call the API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe("1")
      expect(data[0].name).toBe("John Doe")
      expect(supabase.from).toHaveBeenCalledWith("clients")
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockOrder).toHaveBeenCalledWith("name")
    })

    test("should filter clients by phone", async () => {
      // Mock the supabase response
      const mockOrder = jest.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            name: "John Doe",
            phone: "123456789",
            email: "john@example.com",
            business_id: "1",
          },
        ],
        error: null,
      })

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request with phone query parameter
      const request = new NextRequest("http://localhost:3000/api/clients?phone=123456789")

      // Call the API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].phone).toBe("123456789")
      expect(mockEq).toHaveBeenCalledWith("phone", "123456789")
    })
  })

  describe("POST /api/clients", () => {
    test("should create a new client", async () => {
      // Mock the client check
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const mockEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      // Mock the client insert
      const mockInsertSelect = jest.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            name: "John Doe",
            phone: "123456789",
            email: "john@example.com",
            business_id: "1",
          },
        ],
        error: null,
      })

      const mockInsert = jest.fn().mockReturnValue({
        select: mockInsertSelect,
      })

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === "clients") {
          return {
            select: mockSelect,
            insert: mockInsert,
          }
        }
        return {}
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request
      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: "John Doe",
          phone: "123456789",
          email: "john@example.com",
          business_id: "1",
        }),
      })

      // Call the API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(201)
      expect(data.id).toBe("1")
      expect(data.name).toBe("John Doe")
      expect(data.phone).toBe("123456789")
    })

    test("should handle existing client", async () => {
      // Mock the client check to return an existing client
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: "1",
          name: "John Doe",
          phone: "123456789",
          email: "john@example.com",
          business_id: "1",
        },
        error: null,
      })

      const mockEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === "clients") {
          return {
            select: mockSelect,
          }
        }
        return {}
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request
      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: "John Doe",
          phone: "123456789",
          business_id: "1",
        }),
      })

      // Call the API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(409)
      expect(data.error).toBe("Cliente com este telefone já existe")
      expect(data.client.id).toBe("1")
    })
  })
})

