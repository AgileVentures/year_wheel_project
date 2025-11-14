/**
 * Common intercepts for team-related tests
 * 
 * These are implementation functions called by Cypress custom commands.
 * Tests should use cy.stubSupabaseForTeams() etc. instead of importing these directly.
 */

import { TEST_USER, TEAM_ID, baseMembers } from './team-test-helpers';

/**
 * Block external resources that aren't needed for tests
 */
export function blockExternalResourcesImpl() {
  cy.intercept('**/gstatic.com/**', { statusCode: 200, body: '' });
  cy.intercept('**/google-analytics.com/**', { statusCode: 200, body: '' });
  cy.intercept('**/googletagmanager.com/**', { statusCode: 200, body: '' });
  cy.intercept('**/analytics.google.com/**', { statusCode: 200, body: '' });
}

/**
 * Set up authentication intercepts using fixture data
 */
export function stubAuthEndpointsImpl(fixtures) {
  cy.intercept('GET', '**/auth/v1/user**', (req) => {
    req.reply({
      statusCode: 200,
      body: { data: { user: fixtures.authUser }, error: null },
    });
  }).as('getUser');

  cy.intercept('GET', '**/auth/v1/session**', (req) => {
    req.reply({ statusCode: 200, body: fixtures.authSession });
  }).as('getSession');
}

/**
 * Set up subscription and profile intercepts
 */
export function stubUserDataImpl(fixtures) {
  cy.intercept('GET', '**/rest/v1/subscriptions*', {
    statusCode: 200,
    body: [fixtures.subscription],
  }).as('subscription');

  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    const url = new URL(req.url);
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

  cy.intercept('POST', '**/rest/v1/rpc/is_premium_user', { statusCode: 200, body: false }).as('isPremium');
  cy.intercept('POST', '**/rest/v1/rpc/is_admin', { statusCode: 200, body: false }).as('isAdmin');
  cy.intercept('POST', '**/rest/v1/rpc/get_user_wheel_count', { statusCode: 200, body: 1 }).as('wheelCount');
}

/**
 * Set up wheel-related intercepts
 */
export function stubWheelDataImpl(fixtures) {
  cy.intercept('GET', '**/rest/v1/year_wheels*user_id*', (req) => {
    const url = new URL(req.url);
    if (url.searchParams.get('is_template') === 'eq.true') {
      req.reply(fixtures.templateWheels || []);
    } else {
      req.reply(fixtures.userWheels || []);
    }
  }).as('userWheels');

  cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');
  
  cy.intercept('GET', '**/rest/v1/activity_groups*', {
    statusCode: 200,
    body: [
      { color: '#3B82F6' },
      { color: '#10B981' },
      { color: '#F59E0B' }
    ]
  }).as('activityGroups');

  cy.intercept('GET', '**/rest/v1/year_wheels*', (req) => {
    const url = new URL(req.url);
    if (url.searchParams.has('user_id')) {
      return;
    }
    req.reply(fixtures.teamWheels || []);
  }).as('teamWheels');
}

/**
 * Set up organization and membership intercepts
 */
export function stubOrganizationDataImpl() {
  cy.intercept('GET', '**/rest/v1/organization_members*', (req) => {
    const url = new URL(req.url);
    if (url.searchParams.get('select')?.includes('organizations')) {
      req.reply([]);
    } else {
      req.reply([]);
    }
  }).as('orgMembers');

  cy.intercept('GET', '**/rest/v1/team_members*user_id*', {
    statusCode: 200,
    body: [],
  }).as('teamMembersForUser');
}

/**
 * Set up team and invitation intercepts with customizable members and invites
 */
export function stubTeamDataImpl(fixtures, options = {}) {
  const { 
    members = baseMembers, 
    invites = [], 
    canAddMember = () => true 
  } = options;

  let currentMembers = members;
  let currentInvites = invites;

  cy.intercept('GET', '**/rest/v1/team_invitations*', (req) => {
    const url = new URL(req.url);
    if (url.searchParams.has('team_id')) {
      req.reply(currentInvites);
      return;
    }
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

/**
 * Set up all common intercepts for team tests
 */
export function stubSupabaseForTeamsImpl(fixtures, options = {}) {
  blockExternalResourcesImpl();
  stubAuthEndpointsImpl(fixtures);
  stubUserDataImpl(fixtures);
  stubWheelDataImpl(fixtures);
  stubOrganizationDataImpl();
  stubTeamDataImpl(fixtures, options);
}

/**
 * Set up intercepts for invitation acceptance flow
 */
export function stubInvitationAcceptanceImpl(testInvitation) {
  cy.intercept('GET', '**/rest/v1/team_invitations*email*', (req) => {
    req.reply([testInvitation]);
  }).as('getMyInvitations');

  cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] });

  cy.intercept('GET', `**/rest/v1/team_invitations*id=eq.${testInvitation.id}*`, (req) => {
    req.reply([testInvitation]);
  }).as('getInvitationById');

  cy.intercept('GET', '**/rest/v1/team_members*team_id=eq.*user_id=eq.*', (req) => {
    req.reply({ statusCode: 200, body: [] });
  }).as('checkExistingMembership');

  cy.intercept('POST', '**/rest/v1/rpc/can_add_team_member', (req) => {
    req.reply({ statusCode: 200, body: true });
  }).as('canAddTeamMember');

  cy.intercept('POST', '**/rest/v1/team_members*', (req) => {
    const newMember = {
      id: 'new-member-id',
      team_id: TEAM_ID,
      user_id: TEST_USER.id,
      role: 'member',
      joined_at: new Date().toISOString()
    };
    req.reply({ statusCode: 201, body: [newMember] });
  }).as('createTeamMember');

  cy.intercept('PATCH', '**/rest/v1/team_invitations*', (req) => {
    req.reply({ statusCode: 200, body: [{ ...testInvitation, status: 'accepted' }] });
  }).as('updateInvitation');
}
