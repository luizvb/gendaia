import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/appointments/route"
import { supabase } from "@/lib/supabase"
import { describe, beforeEach, test, expect, jest } from "@jest/globals"

// Mock the supabase client
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe("Appointments API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/appointments", () => {
    test("should return appointments", async () => {
      // Mock the supabase response
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: "1",
              start_time: "2023-01-01T10:00:00Z",
              end_time: "2023-01-01T11:00:00Z",
              status: "scheduled",
              professional_id: "1",
              service_id: "1",
              client_id: "1",
              business_id: "1",
              professionals: { id: "1", name: "John Doe" },
              services: { id: "1", name: "Haircut", duration: 60, price: 50 },
            },
          ],
          error: null,
        }),
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request
      const request = new NextRequest("http://localhost:3000/api/appointments")

      // Call the API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe("1")
      expect(supabase.from).toHaveBeenCalledWith("appointments")
      expect(mockSelect).toHaveBeenCalledWith(`
      *,
      professionals:professional_id (id, name),
      services:service_id (id, name, duration, price)
    `)
    })

    test("should handle errors", async () => {
      // Mock the supabase response with an error
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request
      const request = new NextRequest("http://localhost:3000/api/appointments")

      // Call the API
      const response = await GET(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })

  describe("POST /api/appointments", () => {
    test("should create a new appointment", async () => {
      // Mock the client check
      const mockClientSingle = jest.fn().mockResolvedValue({
        data: { id: "1" },
        error: null,
      })

      const mockClientEq = jest.fn().mockReturnValue({
        single: mockClientSingle,
      })

      const mockClientSelect = jest.fn().mockReturnValue({
        eq: mockClientEq,
      })

      const mockClientFrom = jest.fn().mockReturnValue({
        select: mockClientSelect,
      })

      // Mock the appointment insert
      const mockAppointmentSelect = jest.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            start_time: "2023-01-01T10:00:00Z",
            end_time: "2023-01-01T11:00:00Z",
            status: "scheduled",
            professional_id: "1",
            service_id: "1",
            client_id: "1",
            business_id: "1",
            professionals: { id: "1", name: "John Doe" },
            services: { id: "1", name: "Haircut", duration: 60, price: 50 },
            clients: { id: "1", name: "Jane Doe", phone: "123456789" },
          },
        ],
        error: null,
      })

      const mockAppointmentInsert = jest.fn().mockReturnValue({
        select: mockAppointmentSelect,
      })

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === "clients") {
          return {
            select: mockClientSelect,
          }
        }
        if (table === "appointments") {
          return {
            insert: mockAppointmentInsert,
          }
        }
        return {}
      })
      ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

      // Create a mock request
      const request = new NextRequest("http://localhost:3000/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Jane Doe",
          client_phone: "123456789",
          start_time: "2023-01-01T10:00:00Z",
          end_time: "2023-01-01T11:00:00Z",
          professional_id: "1",
          service_id: "1",
          business_id: "1",
        }),
      })

      // Call the API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(201)
      expect(data.id).toBe("1")
      expect(data.professionals.name).toBe("John Doe")
      expect(data.services.name).toBe("Haircut")
      expect(data.clients.name).toBe("Jane Doe")
    })

    test("should handle validation errors", async () => {
      // Create a mock request with missing required fields
      const request = new NextRequest("http://localhost:3000/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          client_name: "Jane Doe",
          client_phone: "123456789",
        }),
      })

      // Call the API
      const response = await POST(request)
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(400)
      expect(data.error).toContain("Dados incompletos")
    })
  })
})

