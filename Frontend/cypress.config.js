const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // URL base del sistema TransControl (Frontend corriendo en localhost)
    baseUrl: "http://localhost:3000",

    // Ubicación de los archivos de prueba E2E
    specPattern: "cypress/E2E/**/*.cy.{js,jsx,ts,tsx}",

    // Carpeta de soporte
    supportFile: "cypress/support/e2e.js",

    // Tiempo de espera para las aserciones (en ms)
    defaultCommandTimeout: 8000,

    // Tiempo de espera para peticiones de red
    requestTimeout: 10000,

    // Viewport para las pruebas
    viewportWidth: 1280,
    viewportHeight: 720,

    // Video de las pruebas (desactivado para ejecución más rápida)
    video: false,

    // Captura de pantalla en caso de fallo
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
