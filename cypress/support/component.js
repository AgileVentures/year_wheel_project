import './commands';
import { mount } from 'cypress/react18';

// Make mount available globally in component tests
Cypress.Commands.add('mount', mount);
