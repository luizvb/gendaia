import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AppointmentModal } from "@/components/appointment-modal"

// Mock data
const mockProfessionals = [
  { id: 1, name: "John Doe", color: "#3b82f6" },
  { id: 2, name: "Jane Smith", color: "#10b981" },
]

const mockSelectedSlot = {
  date: new Date("2023-01-01T10:00:00Z"),
  professionalId: 1,
}

describe("AppointmentModal", () => {
  test("renders correctly when open", () => {
    render(
      <AppointmentModal
        isOpen={true}
        onClose={() => {}}
        selectedSlot={mockSelectedSlot}
        professionals={mockProfessionals}
      />,
    )

    // Check if modal title is rendered
    expect(screen.getByText("Novo Agendamento")).toBeInTheDocument()

    // Check if form fields are rendered
    expect(screen.getByLabelText(/Data/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Horário/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Profissional/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Serviço/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome do Cliente/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Telefone/i)).toBeInTheDocument()

    // Check if buttons are rendered
    expect(screen.getByText("Cancelar")).toBeInTheDocument()
    expect(screen.getByText("Agendar")).toBeInTheDocument()
  })

  test("does not render when closed", () => {
    render(
      <AppointmentModal
        isOpen={false}
        onClose={() => {}}
        selectedSlot={mockSelectedSlot}
        professionals={mockProfessionals}
      />,
    )

    // Modal should not be in the document
    expect(screen.queryByText("Novo Agendamento")).not.toBeInTheDocument()
  })

  test("calls onClose when cancel button is clicked", () => {
    const onCloseMock = jest.fn()

    render(
      <AppointmentModal
        isOpen={true}
        onClose={onCloseMock}
        selectedSlot={mockSelectedSlot}
        professionals={mockProfessionals}
      />,
    )

    // Click the cancel button
    fireEvent.click(screen.getByText("Cancelar"))

    // Check if onClose was called
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  test("pre-fills form with selected slot data", () => {
    render(
      <AppointmentModal
        isOpen={true}
        onClose={() => {}}
        selectedSlot={mockSelectedSlot}
        professionals={mockProfessionals}
      />,
    )

    // Check if date is pre-filled
    expect(screen.getByText("01 de janeiro, 2023")).toBeInTheDocument()

    // Check if time is pre-filled
    expect(screen.getByText("10:00")).toBeInTheDocument()

    // Check if professional is pre-selected
    const professionalSelect = screen.getByLabelText(/Profissional/i)
    expect(professionalSelect).toHaveValue("1")
  })

  test("handles form submission", async () => {
    const onCloseMock = jest.fn()

    render(
      <AppointmentModal
        isOpen={true}
        onClose={onCloseMock}
        selectedSlot={mockSelectedSlot}
        professionals={mockProfessionals}
      />,
    )

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Nome do Cliente/i), {
      target: { value: "Test Client" },
    })

    fireEvent.change(screen.getByLabelText(/Telefone/i), {
      target: { value: "123456789" },
    })

    // Select a service
    fireEvent.change(screen.getByLabelText(/Serviço/i), {
      target: { value: "1" },
    })

    // Submit the form
    fireEvent.click(screen.getByText("Agendar"))

    // Wait for the submission to complete
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1)
    })
  })
})

