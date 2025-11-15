/**
 * Visual regression testing utilities for canvas testing
 * Based on Gleb Bahmutov's canvas testing approach
 */

/**
 * Download canvas as PNG file for visual comparison
 * @param {string} filename - Name for the PNG file (saved to cypress/downloads)
 * @returns {Cypress.Chainable<string>} The filename for chaining
 */
export const downloadPng = (filename) => {
  return cy.get('canvas').then(($canvas) => {
    const url = $canvas[0].toDataURL('image/png');
    const data = url.replace(/^data:image\/png;base64,/, '');
    cy.writeFile(`cypress/downloads/${filename}`, data, 'base64');
    return cy.wrap(filename);
  });
};
