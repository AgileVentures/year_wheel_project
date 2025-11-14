/**
 * These tests exercise the real dashboard routes while stubbing Supabase
 * network requests via cy.intercept. Auth is injected with visitWithMockAuth
 * so we can verify free-plan seat limits without exposing test-only UI.
 */

const TEST_USER = {
  id: '11111111-2222-3333-4444-555555555551', // Must match auth-user.json fixture
  email: 'test.user@example.com', // Must match auth-user.json fixture
};

const TEAM_ID = '11111111-2222-3333-4444-5555555555516'; // Must match team.json fixture
const TEAM_NAME = 'Test Team 1'; // Must match team.json fixture

const baseMembers = [
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

const seatLimitMembers = [
  ...baseMembers,
  {
    id: 'member-3',
    email: 'member3@example.com',
    role: 'member',
    user_id: '99999999-aaaa-bbbb-cccc-dddddddddddd',
  },
];

// Shared fixture data - loaded once before all tests
let fixtures = {};

function stubSupabaseForTeams({ members = baseMembers, invites = [], canAddMember = () => true } = {}) {
  let currentMembers = members;
  let currentInvites = invites;

  // Block external resources (Google Cast, analytics, etc.)
  cy.intercept('**/gstatic.com/**', { statusCode: 200, body: '' });
  cy.intercept('**/google-analytics.com/**', { statusCode: 200, body: '' });
  cy.intercept('**/googletagmanager.com/**', { statusCode: 200, body: '' });
  cy.intercept('**/analytics.google.com/**', { statusCode: 200, body: '' });

  // Auth endpoints - use pre-loaded fixtures
  cy.intercept('GET', '**/auth/v1/user**', (req) => {
    req.reply({
      statusCode: 200,
      body: { data: { user: fixtures.authUser }, error: null }, // Supabase auth format
    });
  }).as('getUser');

  cy.intercept('GET', '**/auth/v1/session**', (req) => {
    req.reply({
      statusCode: 200,
      body: fixtures.authSession,
    });
  }).as('getSession');

  // Subscription/Premium checks
  cy.intercept('GET', '**/rest/v1/subscriptions*', {
    statusCode: 200,
    body: [fixtures.subscription], // Supabase returns arrays for REST queries
  }).as('subscription');

  cy.intercept('POST', '**/rest/v1/rpc/is_premium_user', {
    statusCode: 200,
    body: false,
  }).as('isPremium');

  cy.intercept('POST', '**/rest/v1/rpc/is_admin', {
    statusCode: 200,
    body: false,
  }).as('isAdmin');

  cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', {
    statusCode: 200,
    body: 1,
  }).as('wheelCount');

  // Profiles table
  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    const url = new URL(req.url);
    // Return array of profiles for batch queries
    if (url.searchParams.has('id')) {
      const ids = url.searchParams.get('id').split(',');
      const profiles = ids.map((id) => ({
        ...fixtures.profile,
        id: id.trim(),
      }));
      req.reply(profiles);
    } else {
      req.reply([fixtures.profile]);
    }
  }).as('profiles');

  // User wheels (for dashboard)
  cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
    const url = new URL(req.url);
    // Check if querying for templates
    if (url.searchParams.get('is_template') === 'eq.true') {
      req.reply(fixtures.templateWheels);
    } else {
      req.reply(fixtures.userWheels);
    }
  }).as('userWheels');

  // Wheel pages (multi-year support)
  cy.intercept('GET', '**/rest/v1/wheel_pages*', (req) => {
    // Return empty array for any wheel page queries
    req.reply([]);
  }).as('wheelPages');

  // Activity groups (for wheel cards color preview)
  cy.intercept('GET', '**/rest/v1/activity_groups*', (req) => {
    // Return sample activity groups with colors
    req.reply([
      { color: '#3B82F6' },
      { color: '#10B981' },
      { color: '#F59E0B' }
    ]);
  }).as('activityGroups');

  // Organization membership (affiliate check)
  cy.intercept('GET', '**/rest/v1/organization_members*', (req) => {
    const url = new URL(req.url);
    // Check if querying for nested organizations.is_affiliate
    if (url.searchParams.get('select')?.includes('organizations')) {
      req.reply([]);
    } else {
      req.reply([]);
    }
  }).as('orgMembers');

  // Team membership check (for user's teams list)
  cy.intercept('GET', '**/rest/v1/team_members*user_id*', {
    statusCode: 200,
    body: [],
  }).as('teamMembersForUser');

  // Team invitations
  cy.intercept('GET', '**/rest/v1/team_invitations*', (req) => {
    const url = new URL(req.url);
    if (url.searchParams.has('team_id')) {
      req.reply(currentInvites);
      return;
    }
    // User's personal invites (for dashboard badge)
    req.reply([]);
  }).as('teamInvitations');

  cy.intercept('GET', '**/rest/v1/teams*', (req) => {
    const url = new URL(req.url);
    
    const teamResponse = {
      ...fixtures.team,
      team_members: currentMembers.map(({ id, role, user_id }) => ({
        id,
        role,
        user_id,
        joined_at: '2024-01-01T00:00:00.000Z',
      })),
    };

    if (url.searchParams.has('id')) {
      req.alias = 'getTeamDetails';
      req.reply(teamResponse);
      return;
    }

    req.alias = 'getUserTeams';
    req.reply([teamResponse]);
  });

  cy.intercept('POST', '**/rest/v1/rpc/get_team_members_with_emails', (req) => {
    req.alias = 'getTeamMembers';
    req.reply(currentMembers);
  });

  cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
    const url = new URL(req.url);
    // Skip user_id queries (handled above)
    if (url.searchParams.has('user_id')) {
      return;
    }
    // Team wheels query (for TeamDetails component)
    req.reply(fixtures.teamWheels);
  }).as('teamWheels');

  cy.intercept('POST', '**/rest/v1/team_invitations*', (req) => {
    const payload = Array.isArray(req.body) ? req.body[0] : req.body;
    const newInvite = {
      id: `invite-${Date.now()}`,
      email: payload.email,
      token: 'invite-token',
      team_id: TEAM_ID,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    currentInvites = [newInvite, ...currentInvites];
    req.reply({ statusCode: 201, body: newInvite });
  }).as('createInvite');

  cy.intercept('POST', '**/rest/v1/rpc/can_add_team_member', (req) => {
    const allowed = typeof canAddMember === 'function' ? canAddMember() : !!canAddMember;
    req.reply({ statusCode: 200, body: allowed });
  }).as('canAddTeamMember');
}

const visitTeamsDashboard = () => {
  cy.visitWithMockAuth('/dashboard', {
    id: TEST_USER.id,
    email: TEST_USER.email,
  });

  // Wait for dashboard to load, then navigate to Teams
  cy.get('[data-cy="nav-teams"]', { timeout: 10000 }).should('be.visible').click();
  
  // Verify we're in the Teams view
  cy.contains('Mina team').should('be.visible');
  
  // Click on the specific team using data-cy selector
  cy.get(`[data-cy="team-card"][data-team-name="${TEAM_NAME}"]`).click();
  
  // Wait for team details to load
  cy.contains('Medlemmar', { timeout: 10000 }).should('be.visible');
};

describe('Team Seat Limits', () => {
  before(() => {
    // Load all fixtures once before any tests run (chained to ensure completion)
    cy.fixture('auth-user.json').then(data => { fixtures.authUser = data; })
      .then(() => cy.fixture('auth-session.json')).then(data => { fixtures.authSession = data; })
      .then(() => cy.fixture('subscription.json')).then(data => { fixtures.subscription = data; })
      .then(() => cy.fixture('user-wheels.json')).then(data => { fixtures.userWheels = data; })
      .then(() => cy.fixture('team.json')).then(data => { fixtures.team = data; })
      .then(() => cy.fixture('team-wheels.json')).then(data => { fixtures.teamWheels = data; })
      .then(() => cy.fixture('template-wheels.json')).then(data => { fixtures.templateWheels = data; })
      .then(() => cy.fixture('profile.json')).then(data => { fixtures.profile = data; });
  });

  beforeEach(() => {
    // Verify fixtures are loaded
    expect(fixtures.authUser, 'authUser fixture should be loaded').to.exist;
    expect(fixtures.authSession, 'authSession fixture should be loaded').to.exist;
    expect(fixtures.subscription, 'subscription fixture should be loaded').to.exist;
    
    // Set up intercepts BEFORE each test runs
    stubSupabaseForTeams();
  });

  it.only('allows invites while under the free-plan limit', () => {
    visitTeamsDashboard();

    // Open invite modal
    cy.get('[data-cy="team-invite-button"]').should('not.be.disabled').click();
    
    // Wait for modal to appear and fill email
    cy.get('[data-cy="invite-email-input"]', { timeout: 5000 })
      .should('be.visible')
      .type('ny.member@example.com');
    
    // Click submit button
    cy.get('[data-cy="invite-submit-button"]').should('be.visible').should('not.be.disabled').click();

    // Wait for backend calls
    cy.wait('@canAddTeamMember');
    cy.wait('@createInvite');

    // Verify success state
    cy.get('[data-cy="invite-success-close-button"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-cy="invite-success-close-button"]').click();
  });

  it('blocks invites once the seat limit is reached', () => {
    // Override the default stubs for this specific test
    stubSupabaseForTeams({ members: seatLimitMembers });
    
    visitTeamsDashboard();

    cy.get('[data-cy=team-seat-limit-alert]')
      .should('be.visible')
      .and('contain', 'gratis-planens gräns');
    cy.get('[data-cy=team-invite-button]').should('be.disabled');
  });

  it('surfaces backend limit errors even when UI is under the cap', () => {
    let firstCall = true;
    stubSupabaseForTeams({
      canAddMember: () => {
        if (firstCall) {
          firstCall = false;
          return false;
        }
        return true;
      },
    });

    visitTeamsDashboard();

    cy.get('[data-cy=team-invite-button]').click();
    cy.get('input[type="email"]').type('blockerad.member@example.com');
    cy.contains('button', 'Skicka inbjudan').click();

    cy.wait('@canAddTeamMember');
    cy.contains('Teamet har redan nått maxantalet medlemmar på gratis-planen.').should('be.visible');
  });
});
