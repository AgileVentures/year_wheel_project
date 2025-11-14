/**
 * Test data and constants for team-related tests
 */

export const TEST_USER = {
  id: '11111111-2222-3333-4444-555555555551', // Must match auth-user.json fixture
  email: 'test.user@example.com', // Must match auth-user.json fixture
};

export const TEAM_ID = '11111111-2222-3333-4444-5555555555516'; // Must match team.json fixture
export const TEAM_NAME = 'Test Team 1'; // Must match team.json fixture

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
