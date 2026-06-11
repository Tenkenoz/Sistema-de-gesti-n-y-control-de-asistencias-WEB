// ============================================================
// SUITE 1: AUTENTICACIÓN - Login de TransControl
// Objetivo: Verificar que el sistema de login funciona
// correctamente para todos los roles y casos inválidos.
// ============================================================

describe("SUITE 1 - Autenticación y Login", () => {

  beforeEach(() => {
    // Limpiamos sesión previa y visitamos la página de login
    cy.clearLocalStorage();
    cy.visit("http://localhost:3000");
    cy.wait(2000); // Espera visual para ver la página cargando
  });

  // ----------------------------------------------------------
  // GRUPO A: Estructura visual del formulario de login
  // ----------------------------------------------------------
  context("A) Estructura del formulario de Login", () => {

    it("A1 - Debe mostrar el título TransControl en la página", () => {
      cy.contains("h1", "TransControl").should("be.visible");
      cy.wait(2000);
    });

    it("A2 - Debe mostrar el formulario de login con sus campos", () => {
      cy.get("#login-username").should("be.visible");
      cy.wait(2000);
      cy.get("#login-password").should("be.visible");
      cy.wait(2000);
      cy.get("#login-btn").should("be.visible");
      cy.wait(2000);
      cy.contains("Iniciar Sesión").should("be.visible");
    });

    it("A3 - Debe mostrar el enlace de recuperación de contraseña", () => {
      cy.contains("¿Olvidaste tu contraseña?").should("be.visible").click();
      cy.wait(2000);
      cy.contains("Recuperar Contraseña").should("be.visible");
    });

    it("A4 - Debe poder regresar desde recuperación al login", () => {
      cy.contains("¿Olvidaste tu contraseña?").click();
      cy.wait(2000);
      cy.contains("Volver al login").click();
      cy.wait(2000);
      cy.get("#login-username").should("be.visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO B: Validaciones de campos vacíos e inválidos
  // ----------------------------------------------------------
  context("B) Validaciones del formulario - Casos INVÁLIDOS", () => {

    it("B1 - NO debe iniciar sesión con campos completamente vacíos", () => {
      cy.get("#login-btn").click();
      cy.wait(2000);
      // Debe mostrar errores de validación
      cy.get("#login-username-error").should("have.class", "visible");
      cy.wait(2000);
      cy.get("#login-password-error").should("have.class", "visible");
    });

    it("B2 - NO debe aceptar un correo con formato inválido", () => {
      cy.get("#login-username").type("usuariosindominio");
      cy.wait(2000);
      cy.get("#login-password").type("Admin1234!");
      cy.wait(2000);
      cy.get("#login-btn").click();
      cy.wait(2000);
      cy.get("#login-username-error").should("have.class", "visible");
    });

    it("B3 - NO debe aceptar contraseña menor a 8 caracteres", () => {
      cy.get("#login-username").type("secretaria@transcontrol.ec");
      cy.wait(2000);
      cy.get("#login-password").type("1234");
      cy.wait(2000);
      cy.get("#login-btn").click();
      cy.wait(2000);
      cy.get("#login-password-error").should("have.class", "visible");
    });

    it("B4 - NO debe aceptar credenciales inexistentes en el sistema", () => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 401,
        body: { detail: "Credenciales incorrectas" },
      }).as("loginFallido");

      cy.get("#login-username").type("noexiste@fake.com");
      cy.wait(2000);
      cy.get("#login-password").type("Password999!");
      cy.wait(2000);
      cy.get("#login-btn").click();

      cy.wait("@loginFallido");
      cy.wait(2000);
      cy.contains("Credenciales incorrectas").should("be.visible");
    });

    it("B5 - Debe mostrar error de validación al tipear correo sin '@'", () => {
      cy.get("#login-username").type("correosindominio.com");
      cy.wait(2000);
      cy.get("#login-username").blur();
      cy.wait(2000);
      cy.get("#login-username-error").should("have.class", "visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO C: Login exitoso para cada rol del sistema
  // ----------------------------------------------------------
  context("C) Login exitoso - Casos VÁLIDOS por rol", () => {

    it("C1 - SECRETARIA debe iniciar sesión y ser redirigida correctamente", () => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 200,
        body: {
          access_token: "token-secretaria-fake",
          id: 1,
          rol: "SECRETARIA",
          nombres: "María Secretaria",
        },
      }).as("loginSecretaria");

      cy.get("#login-username").type("secretaria@transcontrol.ec", { delay: 120 });
      cy.get("#login-password").type("Admin1234!", { delay: 120 });
      cy.get("#login-btn").click();

      cy.wait("@loginSecretaria");
     
      cy.contains("¡Bienvenido María Secretaria!").should("be.visible");
     
      cy.url().should("include", "secretaria_view.html");
    });

    it("C2 - COORDINADOR debe iniciar sesión y ser redirigido correctamente", () => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 200,
        body: {
          access_token: "token-coordinador-fake",
          id: 2,
          rol: "COORDINADOR",
          nombres: "Carlos Coordinador",
        },
      }).as("loginCoordinador");

      cy.get("#login-username").type("coordinador@transcontrol.ec", { delay: 120 });
      cy.get("#login-password").type("Admin1234!", { delay: 120 });
      cy.get("#login-btn").click();

      cy.wait("@loginCoordinador");
   
      cy.contains("¡Bienvenido Carlos Coordinador!").should("be.visible");
      
      cy.url().should("include", "coordinador_view.html");
    });

    it("C3 - TRANSPORTISTA debe iniciar sesión y ser redirigido correctamente", () => {
      cy.intercept("POST", "**/api/auth/login", {
        statusCode: 200,
        body: {
          access_token: "token-transportista-fake",
          id: 3,
          rol: "TRANSPORTISTA",
          nombres: "Juan Transportista",
        },
      }).as("loginTransportista");

      cy.get("#login-username").type("transportista@transcontrol.ec", { delay: 120 });
      cy.get("#login-password").type("Admin1234!", { delay: 120 });
      cy.get("#login-btn").click();

      cy.wait("@loginTransportista");
  
      cy.contains("¡Bienvenido Juan Transportista!").should("be.visible");
   
      cy.url().should("include", "transportista_view.html");
    });

  });



});