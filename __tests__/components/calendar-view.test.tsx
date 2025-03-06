import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CalendarView } from "@/components/calendar-view"

// Mock the AppointmentModal component
jest.mock("@/components/appointment-modal", () => ({
  AppointmentModal: jest.fn(() => <div data-testid="appointment-modal" />),
}))

describe("CalendarView", () => {
  test("renders correctly", () => {
    render(<CalendarView />)

    // Check if the calendar header is rendered
    expect(screen.getByText(/Agenda/i)).toBeInTheDocument()

    // Check if navigation buttons are rendered
    expect(screen.getByText(/Hoje/i)).toBeInTheDocument()
    expect(screen.getByText(/Novo Agendamento/i)).toBeInTheDocument()

    // Check if view tabs are rendered
    expect(screen.getByText(/Dia/i)).toBeInTheDocument()
    expect(screen.getByText(/Semana/i)).toBeInTheDocument()

    // Check if time slots are rendered
    expect(screen.getByText("09:00")).toBeInTheDocument()
    expect(screen.getByText("10:00")).toBeInTheDocument()

    // Check if professionals legend is rendered
    expect(screen.getByText("Carlos Silva")).toBeInTheDocument()
    expect(screen.getByText("André Santos")).toBeInTheDocument()
    expect(screen.getByText("Marcos Oliveira")).toBeInTheDocument()
  })

  test("changes view when tabs are clicked", () => {
    render(<CalendarView />)

    // Default view should be week
    expect(screen.getByRole("tab", { name: /Semana/i })).toHaveAttribute("data-state", "active")

    // Click on day tab
    fireEvent.click(screen.getByRole("tab", { name: /Dia/i }))

    // Day tab should be active
    expect(screen.getByRole("tab", { name: /Dia/i })).toHaveAttribute("data-state", "active")
    expect(screen.getByRole("tab", { name: /Semana/i })).toHaveAttribute("data-state", "inactive")
  })

  test("navigates to previous and next periods", () => {
    render(<CalendarView />)

    // Get the current date title
    const initialDateTitle = screen.getByText(/de/i).textContent

    // Click on previous button
    fireEvent.click(screen.getByLabelText(/Anterior/i))

    // Date title should change
    const newDateTitle = screen.getByText(/de/i).textContent
    expect(newDateTitle).not.toBe(initialDateTitle)

    // Click on next button
    fireEvent.click(screen.getByLabelText(/Próximo/i))

    // Date title should change back to initial
    const finalDateTitle = screen.getByText(/de/i).textContent
    expect(finalDateTitle).toBe(initialDateTitle)
  })

  test("navigates to today when today button is clicked", () => {
    render(<CalendarView />)

    // Click on previous button to change the date
    fireEvent.click(screen.getByLabelText(/Anterior/i))

    // Click on today button
    fireEvent.click(screen.getByText(/Hoje/i))

    // Current date should be highlighted
    const today = new Date()
    const currentDay = today.getDate().toString().padStart(2, "0")

    // Find the element with the current day
    const currentDayElement = screen.getAllByText(currentDay)[0]
    expect(currentDayElement).toBeInTheDocument()
  })

  test("opens appointment modal when clicking on a time slot", async () => {
    render(<CalendarView />)

    // Find a time slot and click on it
    const timeSlots = screen.getAllByText("+")
    fireEvent.click(timeSlots[0])

    // Appointment modal should be rendered
    await waitFor(() => {
      expect(screen.getByTestId("appointment-modal")).toBeInTheDocument()
    })
  })

  test("opens appointment modal when clicking on new appointment button", async () => {
    render(<CalendarView />)

    // Click on new appointment button
    fireEvent.click(screen.getByText(/Novo Agendamento/i))

    // Appointment modal should be rendered
    await waitFor(() => {
      expect(screen.getByTestId("appointment-modal")).toBeInTheDocument()
    })
  })
})

