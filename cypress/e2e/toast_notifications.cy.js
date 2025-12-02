/**
 * Toast Notifications E2E Tests
 * 
 * These tests verify:
 * 1. Toast notifications appear with correct messages
 * 2. Toast messages are properly translated (Swedish and English)
 * 3. Toast styling matches the type (success, error, info)
 */

import { TEST_USER, setupFreemiumUser } from '../support/test-helpers';

describe('Toast Notifications', () => {
  let fixtures = {};

  before(() => {
    cy.blockExternalResources();
    cy.loadFixtures().then((loadedFixtures) => {
      fixtures = loadedFixtures;
    });
  });

  describe('Error Toast on Wheel Creation Failure', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const oneWheel = [fixtures.userWheels[0]];
      
      cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.get('is_template') === 'eq.true') {
          req.reply(fixtures.templateWheels || []);
        } else {
          req.reply(oneWheel);
        }
      }).as('userWheels');

      cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { statusCode: 200, body: 1 }).as('wheelCount');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: [] }).as('activityGroups');
      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');
      cy.intercept('POST', '**/rest/v1/rpc/can_create_wheel', { statusCode: 200, body: true }).as('canCreateWheelCheck');
    });

    it('shows error toast in Swedish when wheel creation fails', () => {
      // Force wheel creation to fail
      cy.intercept('POST', '**/rest/v1/year_wheels*', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('createWheelFail');

      cy.visitWithMockAuth('/dashboard', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_language', 'sv');
        }
      });

      cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy="create-wheel-card"]').should('be.visible').click();
      cy.get('[data-cy="create-wheel-title-input"]', { timeout: 5000 })
        .should('be.visible')
        .clear()
        .type('Test Wheel');
      cy.get('[data-cy="create-wheel-year-input"]').clear().type('2025');
      cy.get('[data-cy="create-wheel-submit-button"]').click();

      cy.wait('@createWheelFail');

      // Verify error toast appears with Swedish message
      cy.get('[data-cy="toast-error"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain.text', 'Kunde inte skapa hjul');
    });

    it('shows error toast in English when wheel creation fails', () => {
      // Force wheel creation to fail
      cy.intercept('POST', '**/rest/v1/year_wheels*', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('createWheelFail');

      cy.visitWithMockAuth('/dashboard', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');
      
      // Switch to English using the language switcher
      cy.get('[data-cy="language-switcher"]').click();

      cy.get('[data-cy="create-wheel-card"]').should('be.visible').click();
      cy.get('[data-cy="create-wheel-title-input"]', { timeout: 5000 })
        .should('be.visible')
        .clear()
        .type('Test Wheel');
      cy.get('[data-cy="create-wheel-year-input"]').clear().type('2025');
      cy.get('[data-cy="create-wheel-submit-button"]').click();

      cy.wait('@createWheelFail');

      // Verify error toast appears with English message
      cy.get('[data-cy="toast-error"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain.text', 'Could not create wheel');
    });
  });

  describe('Success Toast on Wheel Deletion', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      // Set up with 1 wheel that can be deleted
      const testWheel = {
        ...fixtures.userWheels[0],
        id: 'wheel-to-delete',
        title: 'Wheel To Delete'
      };
      
      cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.get('is_template') === 'eq.true') {
          req.reply(fixtures.templateWheels || []);
        } else {
          req.reply([testWheel]);
        }
      }).as('userWheels');

      cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { statusCode: 200, body: 1 }).as('wheelCount');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: [] }).as('activityGroups');
      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');
      cy.intercept('POST', '**/rest/v1/rpc/can_create_wheel', { statusCode: 200, body: true }).as('canCreateWheelCheck');
      
      // Stub successful deletion
      cy.intercept('DELETE', '**/rest/v1/year_wheels*', { statusCode: 204 }).as('deleteWheel');
    });

    it('shows success toast in Swedish when wheel is deleted', () => {
      cy.visitWithMockAuth('/dashboard', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_language', 'sv');
        }
      });

      cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');
      
      // Click on the wheel card's menu and delete
      cy.get('[data-cy="wheel-card-menu"]').first().click();
      cy.get('[data-cy="wheel-delete-button"]').click();
      
      // Confirm deletion in dialog
      cy.get('[data-cy="confirm-dialog-confirm"]').click();

      cy.wait('@deleteWheel');

      // Verify success toast appears with Swedish message
      cy.get('[data-cy="toast-success"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain.text', 'Hjul raderat!');
    });

    it('shows success toast in English when wheel is deleted', () => {
      cy.visitWithMockAuth('/dashboard', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');
      
      // Switch to English using the language switcher
      cy.get('[data-cy="language-switcher"]').click();
      
      // Click on the wheel card's menu and delete
      cy.get('[data-cy="wheel-card-menu"]').first().click();
      cy.get('[data-cy="wheel-delete-button"]').click();
      
      // Confirm deletion in dialog
      cy.get('[data-cy="confirm-dialog-confirm"]').click();

      cy.wait('@deleteWheel');

      // Verify success toast appears with English message
      cy.get('[data-cy="toast-success"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain.text', 'Wheel deleted!');
    });
  });

  describe('Toast auto-dismiss', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const oneWheel = [fixtures.userWheels[0]];
      
      cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.get('is_template') === 'eq.true') {
          req.reply(fixtures.templateWheels || []);
        } else {
          req.reply(oneWheel);
        }
      }).as('userWheels');

      cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { statusCode: 200, body: 1 }).as('wheelCount');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: [] }).as('activityGroups');
      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');
      cy.intercept('POST', '**/rest/v1/rpc/can_create_wheel', { statusCode: 200, body: true }).as('canCreateWheelCheck');
    });

    it('error toast disappears after 3 seconds', () => {
      // Force wheel creation to fail
      cy.intercept('POST', '**/rest/v1/year_wheels*', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('createWheelFail');

      cy.visitWithMockAuth('/dashboard', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      cy.get('[data-cy="nav-wheels"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy="create-wheel-card"]').should('be.visible').click();
      cy.get('[data-cy="create-wheel-title-input"]', { timeout: 5000 }).should('be.visible').clear().type('Test Wheel');
      cy.get('[data-cy="create-wheel-year-input"]').clear().type('2025');
      cy.get('[data-cy="create-wheel-submit-button"]').click();

      cy.wait('@createWheelFail');

      // Toast should appear
      cy.get('[data-cy="toast-error"]', { timeout: 5000 }).should('be.visible');

      // Wait for toast to auto-dismiss (3 seconds + buffer)
      cy.wait(4000);

      // Toast should no longer be visible
      cy.get('[data-cy="toast-error"]').should('not.exist');
    });
  });
});
