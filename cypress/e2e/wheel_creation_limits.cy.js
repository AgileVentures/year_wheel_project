/**
 * Wheel Creation and Limits E2E Tests
 * 
 * These tests verify:
 * 1. Users can create wheels
 * 2. Free-plan limit of 2 wheels is enforced
 */

import { TEST_USER } from '../support/test-helpers';

describe('Wheel Creation and Limits', () => {
  let fixtures = {};

  before(() => {
    cy.loadFixtures().then((loadedFixtures) => {
      fixtures = loadedFixtures;
    });
  });

  beforeEach(() => {
    // Verify fixtures are loaded
    expect(fixtures.authUser, 'authUser fixture should be loaded').to.exist;
    expect(fixtures.subscription, 'subscription fixture should be loaded').to.exist;

    // Set up common intercepts
    cy.blockExternalResources();
    cy.stubAuthEndpoints(fixtures);
    cy.stubUserData(fixtures);
    cy.stubOrganizationData();
    
    // Intercept team invitations (dashboard checks for pending invites)
    cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
    
    // Intercept activity groups (wheel cards query for colors)
    cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: [] }).as('activityGroups');
  });

  it('allows a free user to create a wheel when under the limit', () => {
    // Set up with 1 existing wheel (under the limit of 2)
    const oneWheel = [fixtures.userWheels[0]];
    
    cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get('is_template') === 'eq.true') {
        req.reply(fixtures.templateWheels || []);
      } else {
        req.reply(oneWheel);
      }
    }).as('userWheels');

    cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { 
      statusCode: 200, 
      body: 1 
    }).as('wheelCount');

    cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');

    // Intercept wheel pages
    cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');

    // Intercept wheel creation
    const newWheelId = '11111111-2222-3333-4444-999999999999';
    
    // First intercept: can_create_wheel check before creation
    cy.intercept('POST', '**/rest/v1/rpc/can_create_wheel', {
      statusCode: 200,
      body: true
    }).as('canCreateWheelCheck');
    
    cy.intercept('POST', '**/rest/v1/year_wheels*', (req) => {
      const payload = Array.isArray(req.body) ? req.body[0] : req.body;
      req.reply({
        statusCode: 201,
        body: [{
          id: newWheelId,
          title: payload.title,
          year: payload.year,
          user_id: TEST_USER.id,
          team_id: payload.team_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          colors: ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"],
          show_week_ring: true,
          show_month_ring: true,
          show_ring_names: true,
          is_public: false,
          share_token: null,
          show_labels: false,
          week_ring_display_mode: "dates",
          is_template: false,
          show_on_landing: false
        }]
      });
    }).as('createWheel');

    // Intercept page creation
    cy.intercept('POST', '**/rest/v1/wheel_pages*', (req) => {
      req.reply({
        statusCode: 201,
        body: [{
          id: 'page-' + newWheelId,
          wheel_id: newWheelId,
          year: 2025,
          page_order: 0,
          organization_data: { rings: [], activityGroups: [], labels: [], items: [] }
        }]
      });
    }).as('createPage');
    
    // Intercept get_next_page_order RPC
    cy.intercept('POST', '**/rest/v1/rpc/get_next_page_order', {
      statusCode: 200,
      body: 0
    }).as('getNextPageOrder');

    // Intercept rings/groups creation
    cy.intercept('POST', '**/rest/v1/wheel_rings*', { statusCode: 201, body: [] }).as('createRings');
    cy.intercept('POST', '**/rest/v1/activity_groups*', { statusCode: 201, body: [] }).as('createGroups');
    cy.intercept('GET', '**/rest/v1/wheel_rings*', { statusCode: 200, body: [] }).as('getRings');
    cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: [] }).as('getGroups');
    
    // Intercept DELETE operations (in case of cleanup/rollback)
    cy.intercept('DELETE', '**/rest/v1/wheel_pages*', { statusCode: 204, body: null }).as('deletePages');
    cy.intercept('DELETE', '**/rest/v1/year_wheels*', { statusCode: 204, body: null }).as('deleteWheel');

    // Visit dashboard
    cy.visitWithMockAuth('/dashboard', {
      id: TEST_USER.id,
      email: TEST_USER.email,
    });

    cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');

    // Click create wheel card
    cy.get('[data-cy="create-wheel-card"]').should('be.visible').click();

    // Fill in modal form
    cy.get('[data-cy="create-wheel-title-input"]', { timeout: 5000 })
      .should('be.visible')
      .clear()
      .type('My Test Wheel');
    cy.get('[data-cy="create-wheel-year-input"]').clear().type('2025');

    // Submit form
    cy.get('[data-cy="create-wheel-submit-button"]').click();

    // Verify wheel was created
    cy.wait('@createWheel').then((interception) => {
      expect(interception.response.statusCode).to.equal(201);
      const wheel = Array.isArray(interception.response.body) 
        ? interception.response.body[0] 
        : interception.response.body;
      expect(wheel).to.have.property('title', 'My Test Wheel');
      expect(wheel).to.have.property('year', 2025);
      expect(wheel).to.have.property('user_id', TEST_USER.id);
    });

    // Verify page creation
    cy.wait('@createPage');
  });

  it('blocks creation when free user has reached the 2-wheel limit', () => {
    // Set up with 2 existing wheels (at the limit)
    const twoWheels = [fixtures.userWheels[0], fixtures.userWheels[1]];
    
    cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get('is_template') === 'eq.true') {
        req.reply(fixtures.templateWheels || []);
      } else {
        req.reply(twoWheels);
      }
    }).as('userWheels');

    cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { 
      statusCode: 200, 
      body: 2 
    }).as('wheelCount');

    cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');

    // Intercept wheel pages
    cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');

    // Visit dashboard
    cy.visitWithMockAuth('/dashboard', {
      id: TEST_USER.id,
      email: TEST_USER.email,
    });

    cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');

    // Verify create wheel card shows limit message
    cy.get('[data-cy="create-wheel-card"]').should('be.visible');
    cy.contains('Nått gränsen för hjul').should('be.visible');
    cy.contains('Uppgradera till Premium för fler hjul').should('be.visible');

    // Verify clicking doesn't open modal (card should be disabled)
    cy.get('[data-cy="create-wheel-card"]').click();
    
    // Modal should not appear
    cy.get('[data-cy="create-wheel-title-input"]').should('not.exist');
  });

  it('shows upgrade prompt when user tries to create beyond limit', () => {
    // Set up with 2 wheels but allow modal to open
    const twoWheels = [fixtures.userWheels[0], fixtures.userWheels[1]];
    
    cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get('is_template') === 'eq.true') {
        req.reply(fixtures.templateWheels || []);
      } else {
        req.reply(twoWheels);
      }
    }).as('userWheels');

    cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { 
      statusCode: 200, 
      body: 2 
    }).as('wheelCount');

    cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');

    // Intercept wheel pages
    cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');

    // Intercept creation attempt - simulate backend rejection
    cy.intercept('POST', '**/rest/v1/rpc/can_create_wheel', {
      statusCode: 200,
      body: false
    }).as('canCreateWheel');

    // Visit dashboard
    cy.visitWithMockAuth('/dashboard', {
      id: TEST_USER.id,
      email: TEST_USER.email,
    });

    cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');

    // The card should show limit reached
    cy.get('[data-cy="create-wheel-card"]').should('be.visible');
    cy.contains('Nått gränsen för hjul').should('be.visible');
  });
});
