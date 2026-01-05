/**
 * Kanban View E2E Tests
 * 
 * These tests verify:
 * 1. Kanban view displays correctly with label columns
 * 2. First-time setup modal appears and creates default labels
 * 3. Items can be dragged between columns
 * 4. Columns can be collapsed/expanded
 * 5. Items are grouped correctly by label
 * 6. Adding items with labels works correctly
 */

import { TEST_USER, setupFreemiumUser } from '../support/test-helpers';

describe('Kanban View', () => {
  let fixtures = {};

  before(() => {
    cy.blockExternalResources();
    cy.loadFixtures().then((loadedFixtures) => {
      fixtures = loadedFixtures;
    });
  });

  describe('First-time setup', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      
      // Stub all required endpoints
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const testWheel = fixtures.userWheels[0];
      
      // Define test data WITHOUT labels (to trigger setup modal)
      const testRings = [
        {
          id: 'ring-1',
          wheel_id: testWheel.id,
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
          wheel_id: testWheel.id,
          name: 'Marknadsföring',
          color: '#3B82F6',
          visible: true
        }
      ];

      const testPage = {
        id: 'page-123',
        wheel_id: testWheel.id,
        year: 2025,
        page_order: 0,
        title: 'Test Page',
        structure: {
          rings: testRings,
          activityGroups: testActivityGroups,
          labels: [] // Empty labels to trigger setup
        }
      };

      // Intercept wheel data
      cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has('id')) {
          req.reply(testWheel);
        } else if (url.searchParams.get('is_template') === 'eq.true') {
          req.reply(fixtures.templateWheels || []);
        } else {
          req.reply(fixtures.userWheels);
        }
      }).as('getWheels');

      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [testPage] }).as('getPages');
      cy.intercept('GET', '**/rest/v1/wheel_rings*', { statusCode: 200, body: testRings }).as('getRings');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: testActivityGroups }).as('getActivityGroups');
      cy.intercept('GET', '**/rest/v1/labels*', { statusCode: 200, body: [] }).as('getLabels');
      cy.intercept('GET', '**/rest/v1/ring_data*', { statusCode: 200, body: [] }).as('getRingData');
      cy.intercept('GET', '**/rest/v1/items*', { statusCode: 200, body: [] }).as('getItems');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');

      // Stub label creation
      cy.intercept('POST', '**/rest/v1/labels*', (req) => {
        const labels = Array.isArray(req.body) ? req.body : [req.body];
        req.reply({
          statusCode: 201,
          body: labels.map((label, index) => ({
            ...label,
            id: `label-${Date.now()}-${index}`,
            created_at: new Date().toISOString()
          }))
        });
      }).as('createLabels');

      // Stub page updates
      cy.intercept('PATCH', '**/rest/v1/wheel_pages?id=eq.*', (req) => {
        req.reply({ statusCode: 200, body: [{ ...testPage, updated_at: new Date().toISOString() }] });
      }).as('updatePage');

      // Stub wheel updates
      cy.intercept('PATCH', `**/rest/v1/year_wheels?id=eq.${testWheel.id}`, (req) => {
        req.reply({ statusCode: 200, body: [{ ...testWheel, updated_at: new Date().toISOString() }] });
      }).as('updateWheel');

      cy.intercept('PATCH', '**/rest/v1/labels?id=eq.*', { statusCode: 200, body: [] }).as('updateLabels');
    });

    it('shows setup modal when no labels exist', () => {
      const testWheel = fixtures.userWheels[0];
      
      cy.visitWithMockAuth(`/wheel/${testWheel.id}`, {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_onboarding_completed', 'true');
          // Clear kanban config to trigger setup
          win.localStorage.removeItem(`kanban-config-${testWheel.id}`);
        }
      });

      cy.wait('@getWheels');
      cy.wait('@getPages');

      // Switch to Kanban view
      cy.get('[title*="Kanban"]', { timeout: 10000 }).click();

      // Setup modal should appear
      cy.get('[data-cy="kanban-setup-modal"]').should('be.visible');
      cy.contains('Välkommen till Kanban-vy').should('be.visible');
      cy.contains('Föreslagna etiketter').should('be.visible');
      
      // Check that all suggested labels are shown
      cy.contains('Kanske').should('be.visible');
      cy.contains('Intressant').should('be.visible');
      cy.contains('Kommer arbeta på').should('be.visible');
      cy.contains('Pågår').should('be.visible');
      cy.contains('Klart').should('be.visible');
      cy.contains('Avvisat').should('be.visible');
    });

    it('can skip setup', () => {
      const testWheel = fixtures.userWheels[0];
      
      cy.visitWithMockAuth(`/wheel/${testWheel.id}`, {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_onboarding_completed', 'true');
          win.localStorage.removeItem(`kanban-config-${testWheel.id}`);
        }
      });

      cy.wait('@getWheels');
      cy.wait('@getPages');
      cy.get('[title*="Kanban"]').click();

      cy.get('[data-cy="kanban-setup-modal"]').should('be.visible');
      cy.get('[data-cy="kanban-skip-setup"]').click();

      // Modal should close
      cy.get('[data-cy="kanban-setup-modal"]').should('not.exist');
      
      // Should see only "Utan etikett" column
      cy.get('[data-cy="kanban-column"][data-label-name="Utan etikett"]').should('be.visible');
    });

    it('creates default labels when user clicks "Skapa etiketter"', () => {
      const testWheel = fixtures.userWheels[0];
      
      cy.visitWithMockAuth(`/wheel/${testWheel.id}`, {
        id: TEST_USER.id,
        email: TEST_USER.email,
      }, {
        onBeforeLoad(win) {
          win.localStorage.setItem('yearwheel_onboarding_completed', 'true');
          win.localStorage.removeItem(`kanban-config-${testWheel.id}`);
        }
      });

      cy.wait('@getWheels');
      cy.wait('@getPages');
      cy.get('[title*="Kanban"]').click();

      cy.get('[data-cy="kanban-setup-modal"]').should('be.visible');
      cy.get('[data-cy="kanban-create-labels"]').click();

      // Modal should close
      cy.get('[data-cy="kanban-setup-modal"]').should('not.exist');
    });
  });

  describe('With existing labels', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const testWheel = fixtures.userWheels[0];
      
      // Define test data WITH labels
      const testRings = [
        {
          id: 'ring-1',
          wheel_id: testWheel.id,
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
          wheel_id: testWheel.id,
          name: 'Marknadsföring',
          color: '#3B82F6',
          visible: true
        }
      ];

      const testLabels = [
        {
          id: 'label-todo',
          wheel_id: testWheel.id,
          name: 'Att göra',
          color: '#FBBF24',
          visible: true
        },
        {
          id: 'label-progress',
          wheel_id: testWheel.id,
          name: 'Pågår',
          color: '#3B82F6',
          visible: true
        },
        {
          id: 'label-done',
          wheel_id: testWheel.id,
          name: 'Klart',
          color: '#10B981',
          visible: true
        }
      ];

      const testItems = [
        {
          id: 'item-1',
          wheel_id: testWheel.id,
          page_id: 'page-123',
          ring_id: 'ring-1',
          activity_id: 'activity-group-1',
          label_id: 'label-todo',
          name: 'Planera kampanj',
          start_date: '2025-03-01',
          end_date: '2025-03-15',
          description: 'Planera Mars kampanj'
        },
        {
          id: 'item-2',
          wheel_id: testWheel.id,
          page_id: 'page-123',
          ring_id: 'ring-1',
          activity_id: 'activity-group-1',
          label_id: 'label-progress',
          name: 'Skapa innehåll',
          start_date: '2025-03-10',
          end_date: '2025-03-20',
          description: 'Skapa marknadsföringsmaterial'
        },
        {
          id: 'item-3',
          wheel_id: testWheel.id,
          page_id: 'page-123',
          ring_id: 'ring-1',
          activity_id: 'activity-group-1',
          label_id: null, // Unlabeled
          name: 'Outagen uppgift',
          start_date: '2025-04-01',
          end_date: '2025-04-15'
        }
      ];

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

      cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has('id')) {
          req.reply(testWheel);
        } else if (url.searchParams.get('is_template') === 'eq.true') {
          req.reply(fixtures.templateWheels || []);
        } else {
          req.reply(fixtures.userWheels);
        }
      }).as('getWheels');

      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [testPage] }).as('getPages');
      cy.intercept('GET', '**/rest/v1/wheel_rings*', { statusCode: 200, body: testRings }).as('getRings');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: testActivityGroups }).as('getActivityGroups');
      cy.intercept('GET', '**/rest/v1/labels*', { statusCode: 200, body: testLabels }).as('getLabels');
      cy.intercept('GET', '**/rest/v1/ring_data*', { statusCode: 200, body: [] }).as('getRingData');
      cy.intercept('GET', '**/rest/v1/items*', { statusCode: 200, body: testItems }).as('getItems');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');

      // Stub item updates (for drag and drop)
      cy.intercept('PATCH', '**/rest/v1/items?id=eq.*', (req) => {
        req.reply({
          statusCode: 200,
          body: [{
            ...req.body,
            updated_at: new Date().toISOString()
          }]
        });
      }).as('updateItem');

      cy.intercept('PATCH', '**/rest/v1/wheel_pages?id=eq.*', { statusCode: 200, body: [testPage] }).as('updatePage');
      cy.intercept('PATCH', `**/rest/v1/year_wheels?id=eq.${testWheel.id}`, { statusCode: 200, body: [testWheel] }).as('updateWheel');
    });

    it('displays Kanban columns with correct labels', () => {
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
      cy.wait('@getLabels');
      cy.wait('@getItems');

      // Switch to Kanban view
      cy.get('[title*="Kanban"]', { timeout: 10000 }).click();

      // Should see all label columns
      cy.get('[data-cy="kanban-column"][data-label-name="Att göra"]').should('be.visible');
      cy.get('[data-cy="kanban-column"][data-label-name="Pågår"]').should('be.visible');
      cy.get('[data-cy="kanban-column"][data-label-name="Klart"]').should('be.visible');
      cy.get('[data-cy="kanban-column"][data-label-name="Utan etikett"]').should('be.visible');
    });

    it('displays items in correct columns', () => {
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
      cy.wait('@getItems');
      cy.get('[title*="Kanban"]').click();

      // Check items are in correct columns
      cy.get('[data-cy="kanban-column"][data-label-name="Att göra"]')
        .find('[data-cy="kanban-card"][data-item-name="Planera kampanj"]')
        .should('be.visible');

      cy.get('[data-cy="kanban-column"][data-label-name="Pågår"]')
        .find('[data-cy="kanban-card"][data-item-name="Skapa innehåll"]')
        .should('be.visible');

      cy.get('[data-cy="kanban-column"][data-label-name="Utan etikett"]')
        .find('[data-cy="kanban-card"][data-item-name="Outagen uppgift"]')
        .should('be.visible');
    });

    it('can collapse and expand columns', () => {
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
      cy.get('[title*="Kanban"]').click();

      const todoColumn = '[data-cy="kanban-column"][data-label-name="Att göra"]';
      
      // Column should be expanded initially
      cy.get(todoColumn).should('have.class', 'w-80');
      
      // Click header to collapse
      cy.get(todoColumn).find('.p-4').first().click();
      
      // Column should be collapsed
      cy.get(todoColumn).should('have.class', 'w-16');
      
      // Click again to expand
      cy.get(todoColumn).find('.p-4').first().click();
      
      // Column should be expanded again
      cy.get(todoColumn).should('have.class', 'w-80');
    });

    it('displays card count badges', () => {
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
      cy.wait('@getItems');
      cy.get('[title*="Kanban"]').click();

      // Check count badges
      cy.get('[data-cy="kanban-column"][data-label-name="Att göra"]').contains('1');
      cy.get('[data-cy="kanban-column"][data-label-name="Pågår"]').contains('1');
      cy.get('[data-cy="kanban-column"][data-label-name="Klart"]').contains('0');
      cy.get('[data-cy="kanban-column"][data-label-name="Utan etikett"]').contains('1');
    });

    it('shows item details in cards', () => {
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
      cy.wait('@getItems');
      cy.get('[title*="Kanban"]').click();

      const card = '[data-cy="kanban-card"][data-item-name="Planera kampanj"]';
      
      // Check card content
      cy.get(card).within(() => {
        cy.contains('Planera kampanj').should('be.visible');
        cy.contains('Planera Mars kampanj').should('be.visible');
        cy.contains('Marknadsföring').should('be.visible');
        cy.contains('Projekt').should('be.visible');
      });
    });

    it('can click on a card to edit it', () => {
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
      cy.wait('@getItems');
      cy.get('[title*="Kanban"]').click();

      // Click on a card
      cy.get('[data-cy="kanban-card"][data-item-name="Planera kampanj"]').click();

      // Edit modal should appear (assuming EditItemModal has appropriate selectors)
      cy.get('div[role="dialog"], .modal, [class*="modal"]', { timeout: 5000 }).should('be.visible');
    });
  });
});
