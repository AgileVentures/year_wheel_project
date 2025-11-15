/**
 * Shared test data, helpers, and data generators
 * 
 * This file provides:
 * - Constants for test users, teams, and subscriptions
 * - Helper functions for setting up test scenarios
 * - Data generation functions using Faker.js for realistic test data
 */

import { faker } from '@faker-js/faker';

export const TEST_USER = {
  id: '11111111-2222-3333-4444-555555555551', // Must match auth-user.json fixture
  email: 'test.user@example.com', // Must match auth-user.json fixture
};

export const TEAM_ID = '11111111-2222-3333-4444-5555555555516'; // Must match team.json fixture
export const TEAM_NAME = 'Test Team 1'; // Must match team.json fixture

/**
 * Subscription configurations for different user types
 */
export const FREEMIUM_SUBSCRIPTION = {
  id: '11111111-2222-3333-4444-555555555555',
  user_id: TEST_USER.id,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  plan_type: 'free',
  status: 'inactive',
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const PREMIUM_SUBSCRIPTION = {
  id: '11111111-2222-3333-4444-555555555555',
  user_id: TEST_USER.id,
  stripe_customer_id: 'cus_test123',
  stripe_subscription_id: 'sub_test123',
  stripe_price_id: 'price_test123',
  plan_type: 'monthly',
  status: 'active',
  current_period_start: new Date(Date.now() - 86400000 * 30).toISOString(),
  current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
  cancel_at_period_end: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const baseMembers = [
  {
    id: 'member-owner',
    email: TEST_USER.email,
    role: 'owner',
    user_id: TEST_USER.id,
  },
  {
    id: 'member-admin',
    email: 'admin@example.com',
    role: 'admin',
    user_id: '44444444-5555-6666-7777-888888888888',
  },
];

export const seatLimitMembers = [
  ...baseMembers,
  {
    id: 'member-3',
    email: 'member3@example.com',
    role: 'member',
    user_id: '99999999-aaaa-bbbb-cccc-dddddddddddd',
  },
];

/**
 * Navigate to team dashboard and open specific team
 */
export function visitTeamsDashboard(teamName = TEAM_NAME) {
  cy.visitWithMockAuth('/dashboard', {
    id: TEST_USER.id,
    email: TEST_USER.email,
  });

  cy.get('[data-cy="nav-teams"]', { timeout: 10000 }).should('be.visible').click();
  cy.contains('Mina team').should('be.visible');
  cy.get(`[data-cy="team-card"][data-team-name="${teamName}"]`).click();
  cy.contains('Medlemmar', { timeout: 10000 }).should('be.visible');
}

/**
 * Set up fixtures for a freemium user
 * @param {Object} baseFixtures - The loaded fixture data
 * @returns {Object} Modified fixtures with freemium subscription
 */
export function setupFreemiumUser(baseFixtures) {
  return {
    ...baseFixtures,
    subscription: FREEMIUM_SUBSCRIPTION
  };
}

/**
 * Set up fixtures for a premium subscriber
 * @param {Object} baseFixtures - The loaded fixture data
 * @returns {Object} Modified fixtures with premium subscription
 */
export function setupPremiumUser(baseFixtures) {
  return {
    ...baseFixtures,
    subscription: PREMIUM_SUBSCRIPTION
  };
}

// =============================================================================
// DATA GENERATION FUNCTIONS (using Faker.js)
// =============================================================================

/**
 * Generate a realistic team member object
 * @param {Object} overrides - Optional field overrides
 * @returns {Object} Team member object with id, email, role, user_id
 */
export function generateTeamMember(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    role: 'member',
    user_id: faker.string.uuid(),
    ...overrides
  };
}

/**
 * Generate multiple team members
 * @param {number} count - Number of members to generate
 * @param {Object} overrides - Optional field overrides applied to all members
 * @returns {Array} Array of team member objects
 */
export function generateTeamMembers(count, overrides = {}) {
  return Array.from({ length: count }, () => generateTeamMember(overrides));
}

/**
 * Generate a realistic team invitation object
 * @param {Object} overrides - Optional field overrides
 * @returns {Object} Team invitation object
 */
export function generateInvitation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    token: faker.string.alphanumeric(32),
    team_id: TEAM_ID,
    status: 'pending',
    created_at: faker.date.recent({ days: 7 }).toISOString(),
    ...overrides
  };
}

/**
 * Generate multiple team invitations
 * @param {number} count - Number of invitations to generate
 * @param {Object} overrides - Optional field overrides applied to all invitations
 * @returns {Array} Array of invitation objects
 */
export function generateInvitations(count, overrides = {}) {
  return Array.from({ length: count }, () => generateInvitation(overrides));
}

/**
 * Generate a realistic wheel object
 * @param {Object} overrides - Optional field overrides
 * @returns {Object} Wheel object
 */
export function generateWheel(overrides = {}) {
  const year = faker.date.future().getFullYear();
  return {
    id: faker.string.uuid(),
    user_id: TEST_USER.id,
    team_id: null,
    title: faker.company.catchPhrase(),
    year: year,
    colors: {
      monthRing: '#334155',
      weekRing: '#94A3B8',
      centerYear: '#1E293B',
      centerTitle: '#475569'
    },
    show_week_ring: true,
    show_month_ring: true,
    show_ring_names: true,
    week_ring_display_mode: 'week-numbers',
    show_labels: true,
    is_public: false,
    is_template: false,
    show_on_landing: false,
    share_token: null,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    updated_at: faker.date.recent({ days: 7 }).toISOString(),
    ...overrides
  };
}

/**
 * Generate multiple wheels
 * @param {number} count - Number of wheels to generate
 * @param {Object} overrides - Optional field overrides applied to all wheels
 * @returns {Array} Array of wheel objects
 */
export function generateWheels(count, overrides = {}) {
  return Array.from({ length: count }, () => generateWheel(overrides));
}
