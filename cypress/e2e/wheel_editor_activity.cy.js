/**
 * Wheel Editor - Activity Management E2E Tests
 * 
 * These tests verify:
 * 1. Users can add activities to a wheel
 * 2. Activities appear on the canvas after creation
 * 3. Activity data is correctly rendered
 */

import { TEST_USER, setupFreemiumUser } from '../support/test-helpers';

describe('Wheel Editor - Activity Management', () => {
  let fixtures = {};

  before(() => {
    cy.blockExternalResources();
    cy.loadFixtures().then((loadedFixtures) => {
      fixtures = loadedFixtures;
    });
  });

  describe('for Freemium user', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      
      // Stub all required endpoints
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      // Define test data structures - rings, activityGroups, labels
      const testRings = [
        {
          id: 'ring-1',
          wheel_id: fixtures.userWheels[0].id,
          name: 'Projekt',
          type: 'inner',
          visible: true,
          orientation: 'vertical',
          ring_order: 0
        }
      ];

      const testActivityGroups = [
        {
          id: 'activity-group-1',
          wheel_id: fixtures.userWheels[0].id,
          name: 'Marknadsföring',
          color: '#3B82F6',
          visible: true
        }
      ];

      const testLabels = [
        {
          id: 'label-1',
          wheel_id: fixtures.userWheels[0].id,
          name: 'Viktigt',
          color: '#EF4444',
          visible: true
        }
      ];

      const testWheel = {
        ...fixtures.userWheels[0]
      };

      // Page structure contains ONLY structural data (no items)
      const testPage = {
        id: 'page-123',
        wheel_id: testWheel.id,
        year: 2025,
        page_order: 0,
        title: 'Test Page',
        structure: {
          rings: testRings,
          activityGroups: testActivityGroups,
          labels: testLabels
        }
      };

      // Intercept wheel data - return single object when querying by ID
      cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has('id')) {
          req.reply(testWheel); // Return single object, not array
        } else if (url.searchParams.get('is_template') === 'eq.true') {
          req.reply(fixtures.templateWheels || []);
        } else {
          req.reply(fixtures.userWheels);
        }
      }).as('getWheels');

      // Intercept pages
      cy.intercept('GET', '**/rest/v1/wheel_pages*', (req) => {
        req.reply({
          statusCode: 200,
          body: [testPage]
        });
      }).as('getPages');

      // Intercept rings - use wildcard to catch query params
      cy.intercept('GET', '**/rest/v1/wheel_rings*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.get('wheel_id')?.includes(testWheel.id)) {
          req.reply({
            statusCode: 200,
            body: testRings
          });
        } else {
          req.reply({ statusCode: 200, body: [] });
        }
      }).as('getRings');

      // Intercept activity groups - use wildcard
      cy.intercept('GET', '**/rest/v1/activity_groups*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.get('wheel_id')?.includes(testWheel.id)) {
          req.reply({
            statusCode: 200,
            body: testActivityGroups
          });
        } else {
          req.reply({ statusCode: 200, body: [] });
        }
      }).as('getActivityGroups');

      // Intercept labels - use wildcard
      cy.intercept('GET', '**/rest/v1/labels*', (req) => {
        req.reply({
          statusCode: 200,
          body: testLabels
        });
      }).as('getLabels');

      // Intercept ring_data (month-specific content for inner rings)
      cy.intercept('GET', '**/rest/v1/ring_data*', { 
        statusCode: 200, 
        body: [] 
      }).as('getRingData');

      // Intercept items (empty initially - catch all items queries)
      cy.intercept('GET', '**/rest/v1/items*', (req) => {
        // Handle any items query
        req.reply({
          statusCode: 200,
          body: []
        });
      }).as('getItems');

      // Intercept teams
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      
      // Intercept team invitations
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');

      // Intercept notifications
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      
      // Intercept unread notification count
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');

      // Stub auto-save PATCH requests for rings, activity groups, and labels
      cy.intercept('PATCH', '**/rest/v1/wheel_rings?id=eq.*', (req) => {
        req.reply({ statusCode: 200, body: [] });
      }).as('updateRings');

      cy.intercept('DELETE', '**/rest/v1/ring_data?ring_id=eq.*', (req) => {
        req.reply({ statusCode: 200, body: [] });
      }).as('deleteRingData');

      cy.intercept('PATCH', '**/rest/v1/activity_groups?id=eq.*', (req) => {
        req.reply({ statusCode: 200, body: [] });
      }).as('updateActivityGroups');

      cy.intercept('PATCH', '**/rest/v1/labels?id=eq.*', (req) => {
        req.reply({ statusCode: 200, body: [] });
      }).as('updateLabels');

      // Stub wheel_pages updates (auto-save)
      cy.intercept('PATCH', '**/rest/v1/wheel_pages?id=eq.*', (req) => {
        req.reply({ 
          statusCode: 200, 
          body: [{
            id: 'page-123',
            wheel_id: testWheel.id,
            year: 2025,
            page_order: 0,
            title: 'Test Page',
            updated_at: new Date().toISOString()
          }]
        });
      }).as('updatePage');

      // Stub item creation (this is what we'll verify happens)
      cy.intercept('POST', '**/rest/v1/items*', (req) => {
        const payload = Array.isArray(req.body) ? req.body[0] : req.body;
        req.reply({
          statusCode: 201,
          body: [{
            ...payload,
            id: `item-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });
      }).as('createItem');

      // Stub wheel update (for saving structure)
      cy.intercept('PATCH', `**/rest/v1/year_wheels?id=eq.${testWheel.id}`, (req) => {
        req.reply({
          statusCode: 200,
          body: [{
            ...testWheel,
            updated_at: new Date().toISOString()
          }]
        });
      }).as('updateWheel');
    });

    it('allows adding an activity and displays it on the wheel', () => {
      const testWheel = fixtures.userWheels[0];
      const activityName = 'Mars Kampanj';
      
      // Navigate to wheel editor and skip onboarding
      cy.visitWithMockAuth(`/wheel/${testWheel.id}`, {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_onboarding_completed', 'true');
        }
      });

      // Wait for initial data load
      cy.wait('@getWheels');
      cy.wait('@getPages');
      cy.wait('@getRings');
      cy.wait('@getActivityGroups');
      cy.wait('@getLabels');
      cy.wait('@getItems');

      // Wait for canvas to render
      cy.get('canvas', { timeout: 10000 }).should('be.visible');
      cy.wait(1000);

      // Capture empty canvas state (before adding activity)
      cy.captureEmptyCanvas(activityName);

      // Open activity modal
      cy.get('[data-onboarding="add-activity"]').click();
      cy.get('[data-cy="add-activity-modal"]').should('be.visible');

      // Fill in activity form (ring and activity group are pre-selected)
      cy.get('[data-cy="activity-name-input"]').type(activityName, { force: true });
      cy.get('[data-cy="activity-start-date-input"]').type('2025-03-10', { force: true });
      cy.get('[data-cy="activity-end-date-input"]').type('2025-03-30', { force: true });

      // Save and wait for modal to close
      cy.get('[data-cy="activity-save-button"]').click();
      cy.get('[data-cy="add-activity-modal"]').should('not.exist');
      
      // Wait for canvas to re-render
      cy.wait(2000);

      /**
       * VISUAL ASSERTION: Compare before/after canvas
       * Expects canvas to be DIFFERENT after adding activity
       * Retries up to 10 times if canvas hasn't changed yet
       */
      cy.verifyCanvasActivity(activityName);
    });

    it('shows validation errors for invalid activity data', () => {
      const testWheel = fixtures.userWheels[0];
      
      cy.visitWithMockAuth(`/wheel/${testWheel.id}`, {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_onboarding_completed', 'true');
        }
      });

      cy.wait('@getWheels');
      cy.wait('@getPages');

      // Wait for canvas to ensure page is fully loaded
      cy.get('canvas', { timeout: 10000 }).should('be.visible');

      // Open activity modal and wait for form to be ready
      cy.get('[data-onboarding="add-activity"]').click();
      cy.get('[data-cy="add-activity-modal"]').should('be.visible');
      
      // Wait for name input to be ready (has autofocus)
      cy.get('[data-cy="activity-name-input"]').should('be.visible');
      
      // Try to save without filling name (dates have defaults so won't error)
      cy.get('[data-cy="activity-save-button"]').click();

      // Should show validation error for name only (dates are pre-filled)
      cy.contains('Namn är obligatoriskt').should('be.visible');

      // Modal should still be open
      cy.get('[data-cy="add-activity-modal"]').should('be.visible');
    });
  });
});
