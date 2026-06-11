// ============================================================
// SUITE 2: COORDINADOR - Gestión de Transportistas
// Objetivo: Verificar el registro, edición, desactivación y
// eliminación de transportistas desde el panel del coordinador.
// ============================================================

// Función helper: simula login del coordinador via localStorage
const loginCoordinador = () => {
  cy.window().then((win) => {
    win.localStorage.setItem("access_token", "token-coordinador-fake");
    win.localStorage.setItem("user_rol", "COORDINADOR");
    win.localStorage.setItem("user_nombres", "Carlos Coordinador");
    win.localStorage.setItem("user_id", "2");
  });
};

describe("SUITE 2 - Coordinador: Gestión de Transportistas", () => {

  beforeEach(() => {
    cy.clearLocalStorage();

    // Interceptar verificación de auth
    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 200,
      body: { id: 2, rol: "COORDINADOR", nombres: "Carlos Coordinador" },
    }).as("authMe");

    // Interceptar lista de transportistas con datos de ejemplo
    cy.intercept("GET", "**/api/transportistas/**", {
      statusCode: 200,
      body: [
        {
          id: 10,
          nombres: "Pedro González",
          cedula: "1712345678",
          correo: "pedro@transcontrol.ec",
          placa_vehiculo: "ABC-1234",
          capacidad_ton: 5.0,
          activo: true,
          estado_documentacion: "APROBADO",
        },
        {
          id: 11,
          nombres: "Luis Méndez",
          cedula: "1798765432",
          correo: "luis@transcontrol.ec",
          placa_vehiculo: "XYZ-9999",
          capacidad_ton: 8.0,
          activo: false,
          estado_documentacion: "PENDIENTE",
        },
      ],
    }).as("getTransportistas");

    loginCoordinador();
    cy.visit("http://localhost:3000/views/coordinador_view.html");
  });

  // ----------------------------------------------------------
  // GRUPO A: Visualización del panel
  // ----------------------------------------------------------
  context("A) Vista del panel de Coordinador", () => {

    it("A1 - Debe mostrar el título 'Gestión de Transportistas'", () => {
      cy.contains("Gestión de Transportistas").should("be.visible");
    });

    it("A2 - Debe mostrar la tabla con los transportistas del sistema", () => {
      cy.wait("@getTransportistas");
      cy.get("#tbody-transportistas tr").should("have.length.gte", 1);
    });

    it("A3 - Debe mostrar el nombre de transportistas en la tabla", () => {
      cy.wait("@getTransportistas");
      cy.contains("Pedro González").should("be.visible");
    });

    it("A4 - Debe mostrar los botones de navegación del sidebar", () => {
      cy.contains("Gestión de Personal").should("be.visible");
      cy.contains("Monitoreo de Rutas").should("be.visible");
    });

    it("A5 - Debe navegar a la pestaña de Monitoreo de Rutas", () => {
      cy.get("#tab-btn-monitoreo").click();
      cy.get("#view-monitoreo").should("not.have.class", "hidden-view");
      cy.contains("Monitoreo de Viajes").should("be.visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO B: Modal de creación de transportista (VÁLIDO)
  // ----------------------------------------------------------
  context("B) Registro de nuevo Transportista - Casos VÁLIDOS", () => {

    beforeEach(() => {
      // Abre el modal de creación
      cy.contains("Nuevo Transportista").click();
      cy.get("#modal-transp").should("have.class", "active");
    });

    it("B1 - Debe abrir el modal con título 'Registrar Nuevo Transportista'", () => {
      cy.get("#modal-transp-title").should("contain", "Registrar Nuevo Transportista");
    });

    it("B2 - Debe generar automáticamente una contraseña al abrir", () => {
      cy.get("#transp-password").invoke("val").should("have.length.gte", 8);
    });

    it("B3 - Debe registrar un transportista con datos válidos correctamente", () => {
      // Cédula ecuatoriana VÁLIDA (provincia 17, pasa el algoritmo del dígito verificador)
      // Verificación: 1*2+7+1*2+3+1*2+7+5*2-9+0+7*2-9 = 2+7+2+3+2+7+1+0+5=29 → (10-9)%10=1 ✓
      cy.intercept("POST", "**/api/transportistas/", {
        statusCode: 201,
        body: {
          id: 12,
          nombres: "Ana Torres",
          cedula: "1713175071",
          correo: "ana@transcontrol.ec",
          placa_vehiculo: "DEF-5678",
          capacidad_ton: 3.0,
          activo: true,
          correo_enviado: "ana@transcontrol.ec",
        },
      }).as("crearTransportista");

      // Rellenar contraseña manualmente (>= 8 chars) para garantizar submit
      cy.get("#transp-password").invoke("prop", "readOnly", false);
      cy.get("#transp-password").clear().type("SecPass99!");

      cy.get("#transp-cedula").type("1713175071");
      cy.get("#transp-nombres").type("Ana Torres");
      cy.get("#transp-correo").type("ana@transcontrol.ec");
      cy.get("#transp-placa").type("DEF-5678");
      cy.get("#transp-capacidad").type("3.0");
      cy.get("#btn-guardar-transp").click();

      cy.wait("@crearTransportista");
      cy.get("#modal-credenciales").should("have.class", "active");
    });

    it("B4 - Debe mostrar las credenciales del transportista creado", () => {
      cy.intercept("POST", "**/api/transportistas/", {
        statusCode: 201,
        body: {
          id: 13,
          correo: "nuevo@transcontrol.ec",
          password_generada: "Pass9999X",
        },
      }).as("crearConCredenciales");

      // Cédula válida + contraseña forzada para evitar bloqueo por validación
      cy.get("#transp-password").invoke("prop", "readOnly", false);
      cy.get("#transp-password").clear().type("SecPass99!");

      cy.get("#transp-cedula").type("1713175071");
      cy.get("#transp-nombres").type("Ana Torres");
      cy.get("#transp-correo").type("nuevo@transcontrol.ec");
      cy.get("#btn-guardar-transp").click();

      cy.wait("@crearConCredenciales");
      cy.get("#cred-correo").should("not.be.empty");
    });

  });

  // ----------------------------------------------------------
  // GRUPO C: Validaciones al crear transportista (INVÁLIDO)
  // ----------------------------------------------------------
  context("C) Registro de Transportista - Casos INVÁLIDOS", () => {

    beforeEach(() => {
      cy.contains("Nuevo Transportista").click();
    });

    it("C1 - NO debe registrar con cédula de 10 dígitos inválida", () => {
      cy.get("#transp-cedula").type("1234567890"); // cédula no válida
      cy.get("#transp-cedula").blur();
      cy.get("#transp-cedula-error").should("have.class", "visible");
    });

    it("C2 - NO debe registrar con nombres que contengan números", () => {
      cy.get("#transp-nombres").type("Juan123");
      cy.get("#transp-nombres").blur();
      cy.get("#transp-nombres-error").should("have.class", "visible");
    });

    it("C3 - NO debe registrar con correo con formato inválido", () => {
      cy.get("#transp-correo").type("correosindominio");
      cy.get("#transp-correo").blur();
      cy.get("#transp-correo-error").should("have.class", "visible");
    });

    it("C4 - NO debe registrar con placa en formato incorrecto", () => {
      cy.get("#transp-placa").type("123ABC"); // formato incorrecto
      cy.get("#transp-placa").blur();
      cy.get("#transp-placa-error").should("have.class", "visible");
    });

    it("C5 - NO debe registrar con capacidad negativa", () => {
      cy.get("#transp-capacidad").type("-5");
      cy.get("#transp-capacidad").blur();
      cy.get("#transp-capacidad-error").should("have.class", "visible");
    });

    it("C6 - NO debe registrar con formulario completamente vacío", () => {
      cy.get("#btn-guardar-transp").click();
      cy.get("#transp-cedula-error").should("have.class", "visible");
      cy.get("#transp-nombres-error").should("have.class", "visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO D: Editar transportista
  // ----------------------------------------------------------
  context("D) Edición de Transportista", () => {

    it("D1 - Debe abrir el modal de edición con título 'Editar Transportista'", () => {
      cy.wait("@getTransportistas");

      cy.intercept("GET", "**/api/transportistas/10", {
        statusCode: 200,
        body: {
          id: 10,
          nombres: "Pedro González",
          cedula: "1712345678",
          correo: "pedro@transcontrol.ec",
          placa_vehiculo: "ABC-1234",
          capacidad_ton: 5.0,
        },
      }).as("getTransportista10");

      // Clic en el botón de editar del primer transportista
      cy.get('[title="Editar"]').first().click();
      cy.wait("@getTransportista10");

      cy.get("#modal-transp-title").should("contain", "Editar Transportista");
    });

    it("D2 - NO debe mostrar el campo de contraseña al editar", () => {
      cy.wait("@getTransportistas");

      cy.intercept("GET", "**/api/transportistas/10", {
        statusCode: 200,
        body: { id: 10, nombres: "Pedro González", cedula: "1712345678", correo: "pedro@transcontrol.ec" },
      }).as("getT10");

      cy.get('[title="Editar"]').first().click();
      cy.wait("@getT10");

      cy.get("#div-password").should("not.be.visible");
    });

  });

  // ----------------------------------------------------------
  // GRUPO E: Desactivar y eliminar transportista
  // ----------------------------------------------------------
  context("E) Desactivar y Eliminar Transportista", () => {

    it("E1 - Debe abrir modal de desactivación al hacer clic en 'Desactivar'", () => {
      cy.wait("@getTransportistas");
      cy.get('[title="Desactivar"]').first().click();
      cy.get("#modal-delete").should("have.class", "active");
      cy.contains("Desactivar Transportista").should("be.visible");
    });

    it("E2 - NO debe desactivar sin seleccionar una razón", () => {
      cy.wait("@getTransportistas");
      cy.get('[title="Desactivar"]').first().click();
      cy.get("#form-delete").submit();
      cy.get("#delete-razon-error").should("have.class", "visible");
    });

    it("E3 - Debe abrir modal de eliminación permanente con advertencia", () => {
      cy.wait("@getTransportistas");
      cy.get('[title="Eliminar permanentemente"]').first().click();
      cy.get("#modal-delete-permanente").should("have.class", "active");
      cy.contains("NO se puede deshacer").should("be.visible");
    });

    it("E4 - Debe cerrar modal de eliminación al cancelar", () => {
      cy.wait("@getTransportistas");
      cy.get('[title="Eliminar permanentemente"]').first().click();
      cy.contains("Cancelar").first().click();
      cy.get("#modal-delete-permanente").should("not.have.class", "active");
    });

    it("E5 - Debe cerrar sesión y redirigir al login", () => {
      cy.contains("Cerrar Sesión").click();
      cy.url().should("include", "index.html");
    });

  });

});
