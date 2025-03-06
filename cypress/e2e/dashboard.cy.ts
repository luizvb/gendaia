import { describe, beforeEach, it } from "cypress"

describe("Dashboard", () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept("POST", "/api/auth/session", {
      statusCode: 200,
      body: {
        user: {
          id: "1",
          email: "admin@example.com",
          name: "Admin User",
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    }).as("session")

    // Mock API responses
    cy.intercept("GET", "/api/appointments*", { fixture: "dashboard-appointments.json" }).as("getAppointments")
    cy.intercept("GET", "/api/services*", { fixture: "services.json" }).as("getServices")
    cy.intercept("GET", "/api/professionals*", { fixture: "professionals.json" }).as("getProfessionals")
    cy.intercept("GET", "/api/clients*", { fixture: "clients.json" }).as("getClients")

    // Visit the dashboard
    cy.visit("/dashboard")
  })

  it("should display the dashboard overview", () => {
    // Check if the dashboard title is displayed
    cy.contains("h1", "Dashboard").should("be.visible")

    // Check if the stats cards are displayed
    cy.contains("Agendamentos Hoje").should("be.visible")
    cy.contains("Clientes Atendidos").should("be.visible")
    cy.contains("Serviços Realizados").should("be.visible")
    cy.contains("Faturamento").should("be.visible")

    // Check if the recent appointments section is displayed
    cy.contains("Agendamentos Recentes").should("be.visible")

    // Check if the professionals section is displayed
    cy.contains("Profissionais").should("be.visible")
  })

  it("should navigate to the calendar page", () => {
    // Click on the calendar link in the sidebar
    cy.contains("a", "Agenda").click()

    // Check if the calendar page is displayed
    cy.url().should("include", "/dashboard/calendar")
    cy.contains("h1", "Agenda").should("be.visible")

    // Check if the calendar view is displayed
    cy.get(".rounded-md.border").should("be.visible")
  })

  it("should navigate to the services page and create a new service", () => {
    // Mock the create service API call
    cy.intercept("POST", "/api/services", {
      statusCode: 201,
      body: {
        id: "5",
        name: "New Service",
        description: "Description of the new service",
        duration: 45,
        price: 60,
        business_id: "1",
      },
    }).as("createService")

    // Click on the services link in the sidebar
    cy.contains("a", "Serviços").click()

    // Check if the services page is displayed
    cy.url().should("include", "/dashboard/services")
    cy.contains("h1", "Serviços").should("be.visible")

    // Click on the new service button
    cy.contains("button", "Novo Serviço").click()

    // Fill in the form
    cy.get("#name").type("New Service")
    cy.get("#description").type("Description of the new service")
    cy.get("#duration").type("45")
    cy.get("#price").type("60")

    // Submit the form
    cy.contains("button", "Adicionar").click()

    // Wait for the API call
    cy.wait("@createService")

    // Check if the new service is displayed
    cy.contains("New Service").should("be.visible")
  })

  it("should navigate to the professionals page and create a new professional", () => {
    // Mock the create professional API call
    cy.intercept("POST", "/api/professionals", {
      statusCode: 201,
      body: {
        id: "4",
        name: "New Professional",
        specialty: "Hair Styling",
        color: "#6366f1",
        business_id: "1",
      },
    }).as("createProfessional")

    // Click on the professionals link in the sidebar
    cy.contains("a", "Profissionais").click()

    // Check if the professionals page is displayed
    cy.url().should("include", "/dashboard/professionals")
    cy.contains("h1", "Profissionais").should("be.visible")

    // Click on the new professional button
    cy.contains("button", "Novo Profissional").click()

    // Fill in the form
    cy.get("#name").type("New Professional")
    cy.get("#specialty").type("Hair Styling")
    cy.get("#color").invoke("val", "#6366f1").trigger("change")

    // Submit the form
    cy.contains("button", "Adicionar").click()

    // Wait for the API call
    cy.wait("@createProfessional")

    // Check if the new professional is displayed
    cy.contains("New Professional").should("be.visible")
  })

  it("should navigate to the clients page and search for a client", () => {
    // Click on the clients link in the sidebar
    cy.contains("a", "Clientes").click()

    // Check if the clients page is displayed
    cy.url().should("include", "/dashboard/clients")
    cy.contains("h1", "Clientes").should("be.visible")

    // Type in the search box
    cy.get('input[placeholder="Buscar cliente..."]').type("John")

    // Check if the filtered clients are displayed
    cy.contains("John Doe").should("be.visible")
    cy.contains("Jane Smith").should("not.exist")
  })

  it("should navigate to the settings page and update business information", () => {
    // Mock the update settings API call
    cy.intercept("POST", "/api/settings", {
      statusCode: 200,
      body: {
        business: {
          id: "1",
          name: "Updated Barbershop",
          address: "New Address",
          phone: "987654321",
          email: "updated@example.com",
          description: "Updated description",
        },
        businessHours: [],
      },
    }).as("updateSettings")

    // Click on the settings link in the sidebar
    cy.contains("a", "Configurações").click()

    // Check if the settings page is displayed
    cy.url().should("include", "/dashboard/settings")
    cy.contains("h1", "Configurações").should("be.visible")

    // Update the business information
    cy.get("#name").clear().type("Updated Barbershop")
    cy.get("#address").clear().type("New Address")
    cy.get("#phone").clear().type("987654321")
    cy.get("#email").clear().type("updated@example.com")
    cy.get("#description").clear().type("Updated description")

    // Save the changes
    cy.contains("button", "Salvar Alterações").click()

    // Wait for the API call
    cy.wait("@updateSettings")

    // Check if the success message is displayed
    cy.contains("Configurações salvas com sucesso!").should("be.visible")
  })
})

