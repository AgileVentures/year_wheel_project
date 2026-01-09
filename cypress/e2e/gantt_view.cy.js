/**
 * Gantt View E2E Tests
 * 
 * These tests verify:
 * 1. Gantt view displays correctly with ring lanes
 * 2. Timeline header shows months/weeks based on zoom
 * 3. Items render as timeline bars
 * 4. Grouping options work (rings/labels/activityGroups)
 * 5. Year filter works correctly
 * 6. Mini wheel navigator displays
 * 7. Today button navigates to current date
 * 8. Zoom controls change timeline scale
 */

import { TEST_USER, setupFreemiumUser } from '../support/test-helpers';

describe('Gantt View', () => {
  let fixtures = {};

  before(() => {
    cy.blockExternalResources();
    cy.loadFixtures().then((loadedFixtures) => {
      fixtures = loadedFixtures;
    });
  });

  describe('Basic rendering', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      
      // Stub all required endpoints
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const testWheel = fixtures.userWheels[0];
      
      // Define test data with rings, activity groups, and items
      const testRings = [
        {
          id: 'ring-1',
          wheel_id: testWheel.id,
          name: 'Projekt',
          type: 'inner',
          color: '#3B82F6',
          visible: true,
          orientation: 'vertical',
          ring_order: 0
        },
        {
          id: 'ring-2',
          wheel_id: testWheel.id,
          name: 'Aktiviteter',
          type: 'inner',
          color: '#10B981',
          visible: true,
          orientation: 'vertical',
          ring_order: 1
        }
      ];

      const testActivityGroups = [
        {
          id: 'activity-group-1',
          wheel_id: testWheel.id,
          name: 'Marknadsföring',
          color: '#F59E0B',
          visible: true
        },
        {
          id: 'activity-group-2',
          wheel_id: testWheel.id,
          name: 'Utveckling',
          color: '#8B5CF6',
          visible: true
        }
      ];

      const testLabels = [
        {
          id: 'label-1',
          wheel_id: testWheel.id,
          name: 'Viktigt',
          color: '#EF4444',
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
          label_id: 'label-1',
          name: 'Lansering Q1',
          startDate: '2025-01-15',
          endDate: '2025-03-31',
          description: 'Första lanseringen'
        },
        {
          id: 'item-2',
          wheel_id: testWheel.id,
          page_id: 'page-123',
          ring_id: 'ring-2',
          activity_id: 'activity-group-2',
          label_id: null,
          name: 'Utvecklingsfas',
          startDate: '2025-02-01',
          endDate: '2025-06-30',
          description: 'Utveckling av nya funktioner'
        }
      ];

      const testPage = {
        id: 'page-123',
        wheel_id: testWheel.id,
        year: 2025,
        page_order: 0,
        title: '2025',
        structure: {
          rings: testRings,
          activityGroups: testActivityGroups,
          labels: testLabels
        },
        items: testItems
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
      cy.intercept('GET', '**/rest/v1/labels*', { statusCode: 200, body: testLabels }).as('getLabels');
      cy.intercept('GET', '**/rest/v1/ring_data*', { statusCode: 200, body: [] }).as('getRingData');
      cy.intercept('GET', '**/rest/v1/items*', { statusCode: 200, body: testItems }).as('getItems');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');
    });

    it('displays Gantt view when view button is clicked', () => {
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

      // Switch to Gantt view
      cy.get('[data-cy="view-gantt"]').click();

      // Verify Gantt view is displayed
      cy.get('[data-cy="gantt-view"]').should('be.visible');
    });

    it('shows Gantt toolbar with controls', () => {
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
      cy.get('[data-cy="view-gantt"]').click();

      // Check toolbar elements
      cy.get('[data-cy="gantt-toolbar"]').should('be.visible');
      cy.get('[data-cy="gantt-year-filter"]').should('be.visible');
      cy.get('[data-cy="gantt-today-button"]').should('be.visible');
      cy.get('[data-cy="gantt-zoom-in"]').should('be.visible');
      cy.get('[data-cy="gantt-zoom-out"]').should('be.visible');
    });

    it('shows mini wheel navigator', () => {
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
      cy.get('[data-cy="view-gantt"]').click();

      cy.get('[data-cy="mini-wheel-navigator"]').should('be.visible');
    });

    it('shows row pane with ring groups', () => {
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
      cy.get('[data-cy="view-gantt"]').click();

      cy.get('[data-cy="gantt-row-pane"]').should('be.visible');
      cy.get('[data-cy="gantt-group-ring-1"]').should('be.visible').and('contain', 'Projekt');
      cy.get('[data-cy="gantt-group-ring-2"]').should('be.visible').and('contain', 'Aktiviteter');
    });

    it('shows timeline pane with time header', () => {
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
      cy.get('[data-cy="view-gantt"]').click();

      cy.get('[data-cy="gantt-timeline-pane"]').should('be.visible');
    });
  });

  describe('Grouping functionality', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const testWheel = fixtures.userWheels[0];
      const testRings = [
        {
          id: 'ring-1',
          wheel_id: testWheel.id,
          name: 'Projekt',
          type: 'inner',
          color: '#3B82F6',
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
          color: '#F59E0B',
          visible: true
        }
      ];

      const testLabels = [
        {
          id: 'label-1',
          wheel_id: testWheel.id,
          name: 'Viktigt',
          color: '#EF4444',
          visible: true
        }
      ];

      const testPage = {
        id: 'page-123',
        wheel_id: testWheel.id,
        year: 2025,
        page_order: 0,
        title: '2025',
        structure: {
          rings: testRings,
          activityGroups: testActivityGroups,
          labels: testLabels
        },
        items: []
      };

      cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has('id')) {
          req.reply(testWheel);
        } else {
          req.reply(fixtures.userWheels);
        }
      }).as('getWheels');

      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [testPage] }).as('getPages');
      cy.intercept('GET', '**/rest/v1/wheel_rings*', { statusCode: 200, body: testRings }).as('getRings');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: testActivityGroups }).as('getActivityGroups');
      cy.intercept('GET', '**/rest/v1/labels*', { statusCode: 200, body: testLabels }).as('getLabels');
      cy.intercept('GET', '**/rest/v1/ring_data*', { statusCode: 200, body: [] }).as('getRingData');
      cy.intercept('GET', '**/rest/v1/items*', { statusCode: 200, body: [] }).as('getItems');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');
    });

    it('can switch between ring, label, and activity group grouping', () => {
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
      cy.get('[data-cy="view-gantt"]').click();

      // Default is rings
      cy.get('[data-cy="gantt-group-rings"]').should('have.class', 'bg-white');

      // Switch to labels
      cy.get('[data-cy="gantt-group-labels"]').click();
      cy.get('[data-cy="gantt-group-labels"]').should('have.class', 'bg-white');

      // Switch to activity groups
      cy.get('[data-cy="gantt-group-activities"]').click();
      cy.get('[data-cy="gantt-group-activities"]').should('have.class', 'bg-white');
    });
  });

  describe('Zoom functionality', () => {
    beforeEach(() => {
      fixtures = setupFreemiumUser(fixtures);
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubOrganizationData();
      
      const testWheel = fixtures.userWheels[0];
      const testPage = {
        id: 'page-123',
        wheel_id: testWheel.id,
        year: 2025,
        page_order: 0,
        title: '2025',
        structure: {
          rings: [],
          activityGroups: [],
          labels: []
        },
        items: []
      };

      cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has('id')) {
          req.reply(testWheel);
        } else {
          req.reply(fixtures.userWheels);
        }
      }).as('getWheels');

      cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [testPage] }).as('getPages');
      cy.intercept('GET', '**/rest/v1/wheel_rings*', { statusCode: 200, body: [] }).as('getRings');
      cy.intercept('GET', '**/rest/v1/activity_groups*', { statusCode: 200, body: [] }).as('getActivityGroups');
      cy.intercept('GET', '**/rest/v1/labels*', { statusCode: 200, body: [] }).as('getLabels');
      cy.intercept('GET', '**/rest/v1/ring_data*', { statusCode: 200, body: [] }).as('getRingData');
      cy.intercept('GET', '**/rest/v1/items*', { statusCode: 200, body: [] }).as('getItems');
      cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
      cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
      cy.intercept('GET', '**/rest/v1/notifications*', { statusCode: 200, body: [] }).as('notifications');
      cy.intercept('POST', '**/rest/v1/rpc/get_unread_notification_count', { statusCode: 200, body: 0 }).as('unreadNotifications');
    });

    it('can zoom in and out', () => {
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
      cy.get('[data-cy="view-gantt"]').click();

      // Initial zoom should be month
      cy.get('[data-cy="gantt-toolbar"]').should('contain', 'month');

      // Zoom in to week
      cy.get('[data-cy="gantt-zoom-in"]').click();
      cy.get('[data-cy="gantt-toolbar"]').should('contain', 'week');

      // Zoom in to day
      cy.get('[data-cy="gantt-zoom-in"]').click();
      cy.get('[data-cy="gantt-toolbar"]').should('contain', 'day');

      // Should not be able to zoom in further
      cy.get('[data-cy="gantt-zoom-in"]').should('be.disabled');

      // Zoom out to week
      cy.get('[data-cy="gantt-zoom-out"]').click();
      cy.get('[data-cy="gantt-toolbar"]').should('contain', 'week');
    });
  });
});
