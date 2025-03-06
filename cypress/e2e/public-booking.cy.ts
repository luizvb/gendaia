import { describe, beforeEach, it, expect } from "cypress"

describe("Public Booking Page", () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept("GET", "/api/services", { fixture: "services.json" }).as("getServices")
    cy.intercept("GET", "/api/professionals", { fixture: "professionals.json" }).as("getProfessionals")
    cy.intercept("POST", "/api/appointments", { fixture: "appointment.json" }).as("createAppointment")
    cy.intercept("GET", "/api/appointments*", { fixture: "appointments.json" }).as("getAppointments")

    // Visit the booking page
    cy.visit("/booking")
  })

  it("should display the booking form", () => {
    // Check if the page title is displayed
    cy.contains("h1", "Agendamento Online").should("be.visible")

    // Check if the tabs are displayed
    cy.contains("button", "Novo Agendamento").should("be.visible")
    cy.contains("button", "Meus Agendamentos").should("be.visible")

    // Check if the form fields are displayed
    cy.contains("label", "Nome Completo").should("be.visible")
    cy.contains("label", "Telefone").should("be.visible")
    cy.contains("label", "Serviço").should("be.visible")
    cy.contains("label", "Profissional").should("be.visible")
    cy.contains("label", "Data").should("be.visible")
    cy.contains("label", "Horário").should("be.visible")
  })

  it("should create a new appointment", () => {
    // Fill in the form
    cy.get("#name").type("John Doe")
    cy.get("#phone").type("123456789")

    // Select a service
    cy.contains("label", "Serviço").parent().find("button").click()
    cy.contains("Corte de Cabelo").click()

    // Select a professional
    cy.contains("label", "Profissional").parent().find("button").click()
    cy.contains("Carlos Silva").click()

    // Select a date
    cy.contains("label", "Data").parent().find("button").click()
    cy.get(".rdp-day").not(".rdp-day_disabled").first().click()

    // Select a time
    cy.contains("label", "Horário").parent().find("button").click()
    cy.contains("10:00").click()

    // Submit the form
    cy.contains("button", "Agendar Horário").click()

    // Wait for the API call
    cy.wait("@createAppointment")

    // Check if success message is displayed
    cy.contains("Agendamento realizado com sucesso!").should("be.visible")

    // Check if the phone is saved in localStorage
    cy.window().then((win) => {
      expect(win.localStorage.getItem("barbershop_user_phone")).to.eq("123456789")
    })
  })

  it("should view existing appointments", () => {
    // Set phone in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem("barbershop_user_phone", "123456789")
    })

    // Go to the appointments tab
    cy.contains("button", "Meus Agendamentos").click()

    // Check if the phone is pre-filled
    cy.get('input[placeholder="(00) 00000-0000"]').should("have.value", "123456789")

    // Click the search button
    cy.contains("button", "Buscar").click()

    // Wait for the API call
    cy.wait("@getAppointments")

    // Check if appointments are displayed
    cy.contains("Corte de Cabelo").should("be.visible")
    cy.contains("Carlos Silva").should("be.visible")
    cy.contains("Agendado").should("be.visible")
  })

  it("should cancel an appointment", () => {
    // Mock the delete API call
    cy.intercept("DELETE", "/api/appointments/*", { statusCode: 200, body: { success: true } }).as("cancelAppointment")

    // Set phone in localStorage
    cy.window().then((win) => {
      win.localStorage.setItem("barbershop_user_phone", "123456789")
    })

    // Go to the appointments tab
    cy.contains("button", "Meus Agendamentos").click()

    // Click the search button
    cy.contains("button", "Buscar").click()

    // Wait for the API call
    cy.wait("@getAppointments")

    // Click the cancel button
    cy.contains("button", "Cancelar").click()

    // Confirm the cancellation
    cy.on("window:confirm", () => true)

    // Wait for the API call
    cy.wait("@cancelAppointment")

    // Check if success message is displayed
    cy.contains("Agendamento cancelado com sucesso!").should("be.visible")
  })
})

