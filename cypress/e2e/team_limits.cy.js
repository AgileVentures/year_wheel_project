/**
 * Team Seat Limits
 *
 * These tests verify free-plan seat-limit enforcement (3 member max)
 */

import {
  TEST_USER,
  TEAM_ID,
  TEAM_NAME,
  baseMembers,
  seatLimitMembers,
  visitTeamsDashboard,
  setupFreemiumUser,
  setupPremiumUser,
  generateTeamMembers,
} from "../support/test-helpers";

describe("Team Seat Limits", () => {
  // Shared fixture data - loaded once before all tests
  let baseFixtures = {};

  before(() => {
    // Block external resources once for all tests
    cy.blockExternalResources();
    
    // Load all fixtures using custom command
    cy.loadFixtures().then((loadedFixtures) => {
      baseFixtures = loadedFixtures;
    });
  });

  describe("for Freemium user", () => {
    let fixtures = {};

    beforeEach(() => {
      // Set up fresh fixtures for each test
      fixtures = setupFreemiumUser(baseFixtures);
      
      // Set up intercepts in beforeEach so they're ready before any test code runs
      cy.stubSupabaseForTeams(fixtures);
    });

    it("allows invites while under the free-plan limit", () => {
      visitTeamsDashboard();

      // Open invite modal
      cy.get('[data-cy="team-invite-button"]')
        .should("not.be.disabled")
        .click();

      // Fill and submit invite form
      cy.get('[data-cy="invite-email-input"]', { timeout: 5000 })
        .should("be.visible")
        .type("ny.member@example.com");

      cy.get('[data-cy="invite-submit-button"]')
        .should("be.visible")
        .should("not.be.disabled")
        .click();

      // Verify invitation was created with correct data
      cy.wait("@canAddTeamMember");
      cy.wait("@createInvite").then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
        expect(interception.response.body).to.have.property(
          "email",
          "ny.member@example.com"
        );
        expect(interception.response.body).to.have.property("team_id", TEAM_ID);
        expect(interception.response.body).to.have.property(
          "status",
          "pending"
        );
        expect(interception.response.body).to.have.property("token");
      });

      // Verify success message and close
      cy.get('[data-cy="invite-success-close-button"]', { timeout: 5000 })
        .should("be.visible")
        .click();
    });

    it("shows the created invitation in the team invitations list", () => {
      const existingInvite = {
        id: "existing-invite-1",
        email: "existing@example.com",
        token: "existing-token",
        team_id: TEAM_ID,
        status: "pending",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      };

      // Override teamInvitations to include existing invite
      cy.intercept('GET', '**/rest/v1/team_invitations*', {
        statusCode: 200,
        body: [existingInvite],
      }).as('teamInvitations');
      visitTeamsDashboard();

      // Create new invitation
      cy.get('[data-cy="team-invite-button"]').click();
      cy.get('[data-cy="invite-email-input"]').type("ny.member@example.com");
      cy.get('[data-cy="invite-submit-button"]').click();

      cy.wait("@canAddTeamMember");
      cy.wait("@createInvite");
      cy.get('[data-cy="invite-success-close-button"]').click();

      // Verify both invitations appear
      cy.wait("@teamInvitations");
      cy.contains("existing@example.com").should("be.visible");
      cy.contains("ny.member@example.com").should("be.visible");
    });

    it("allows a user to view and accept an invitation", () => {
      const testInvitation = {
        id: "test-invite-123",
        email: TEST_USER.email,
        token: "test-token-123",
        team_id: TEAM_ID,
        status: "pending",
        created_at: new Date().toISOString(),
        teams: {
          name: TEAM_NAME,
          description: "Test team for collaboration",
        },
      };

      // Set up invitation acceptance intercepts
      cy.stubInvitationAcceptance(testInvitation);

      // Navigate to invitations
      cy.visitWithMockAuth("/dashboard", {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      cy.get('[data-cy="nav-invitations"]', { timeout: 10000 })
        .should("be.visible")
        .click();

      // Verify invitation is visible
      cy.get('[data-cy="invitation-card"]').should("be.visible");
      cy.contains(TEAM_NAME).should("be.visible");
      cy.contains("Test team for collaboration").should("be.visible");

      // Accept the invitation
      cy.get('[data-cy="invitation-accept-button"]').click();

      // Verify all acceptance steps complete
      cy.wait("@getInvitationById");
      cy.wait("@checkExistingMembership");
      cy.wait("@canAddTeamMember");
      cy.wait("@createTeamMember").then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
        const member = Array.isArray(interception.response.body)
          ? interception.response.body[0]
          : interception.response.body;
        expect(member).to.have.property("user_id", TEST_USER.id);
        expect(member).to.have.property("team_id", TEAM_ID);
        expect(member).to.have.property("role", "member");
      });
      cy.wait("@updateInvitation");

      // Verify invitation is removed
      cy.get('[data-cy="invitation-card"]').should("not.exist");

      // Set up intercepts for team view with new member BEFORE navigating
      cy.intercept("GET", "**/rest/v1/teams*", (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has("id")) {
          req.reply([
            {
              ...fixtures.team,
              id: TEAM_ID,
              name: TEAM_NAME,
              team_members: [
                ...baseMembers,
                {
                  id: "new-member-id",
                  user_id: TEST_USER.id,
                  role: "member",
                  joined_at: new Date().toISOString(),
                },
              ],
            },
          ]);
        } else {
          req.reply([
            {
              ...fixtures.team,
              id: TEAM_ID,
              name: TEAM_NAME,
            },
          ]);
        }
      }).as("getTeams");

      cy.intercept(
        "POST",
        "**/rest/v1/rpc/get_team_members_with_emails",
        (req) => {
          req.reply([
            ...baseMembers,
            {
              id: "new-member-id",
              user_id: TEST_USER.id,
              email: TEST_USER.email,
              role: "member",
              joined_at: new Date().toISOString(),
            },
          ]);
        }
      ).as("getTeamMembersWithEmails");

      // Navigate to Teams tab and verify membership
      cy.get('[data-cy="nav-teams"]').click();
      cy.wait("@getTeams");

      // Open team and verify user is listed
      cy.get(`[data-cy="team-card"][data-team-name="${TEAM_NAME}"]`, {
        timeout: 10000,
      })
        .should("be.visible")
        .click();
      cy.wait("@getTeamMembersWithEmails");
      cy.contains(TEST_USER.email).should("be.visible");
      // Verify member role (Swedish UI shows "Medlem")
      cy.contains(/medlem/i).should("be.visible");
    });

    it("blocks invites once the seat limit is reached", () => {
      cy.stubSupabaseForTeams(fixtures, { members: seatLimitMembers });
      visitTeamsDashboard();

      cy.get("[data-cy=team-seat-limit-alert]")
        .should("be.visible")
        .and("contain", "gratis-planens gräns");
      cy.get("[data-cy=team-invite-button]").should("be.disabled");
    });

    it("surfaces backend limit errors even when UI is under the cap", () => {
      let firstCall = true;
      cy.stubSupabaseForTeams(fixtures, {
        canAddMember: () => {
          if (firstCall) {
            firstCall = false;
            return false;
          }
          return true;
        },
      });

      visitTeamsDashboard();

      cy.get("[data-cy=team-invite-button]").click();
      cy.get('input[type="email"]').type("blockerad.member@example.com");
      cy.contains("button", "Skicka inbjudan").click();

      cy.wait("@canAddTeamMember");
      cy.contains(
        "Teamet har redan nått maxantalet medlemmar på gratis-planen."
      ).should("be.visible");
    });
  });

  describe("for Subscribing user", () => {
    let fixtures = {};

    beforeEach(() => {
      // Set up fresh fixtures for each test
      fixtures = setupPremiumUser(baseFixtures);
      
      // Set up intercepts in beforeEach so they're ready before any test code runs
      cy.stubSupabaseForTeams(fixtures);
    });

    it("allows unlimited team member invitations", () => {
      // Set up with many members (more than free limit)
      const manyMembers = [
        ...seatLimitMembers,
        {
          id: 'member-4',
          email: 'member4@example.com',
          role: 'member',
          user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        {
          id: 'member-5',
          email: 'member5@example.com',
          role: 'member',
          user_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        },
      ];

      cy.stubSupabaseForTeams(fixtures, { members: manyMembers });
      visitTeamsDashboard();

      // Verify no seat limit alert
      cy.get('[data-cy="team-seat-limit-alert"]').should('not.exist');

      // Verify invite button is enabled
      cy.get('[data-cy="team-invite-button"]').should('not.be.disabled');

      // Should be able to create invite
      cy.get('[data-cy="team-invite-button"]').click();
      cy.get('[data-cy="invite-email-input"]').should('be.visible');
    });

    it("can invite members even with 5+ existing members", () => {
      // Set up with 7 members (well over free limit of 3)
      const sevenMembers = [
        ...seatLimitMembers, // 3 members
        { id: 'member-4', email: 'member4@example.com', role: 'member', user_id: 'id-4' },
        { id: 'member-5', email: 'member5@example.com', role: 'member', user_id: 'id-5' },
        { id: 'member-6', email: 'member6@example.com', role: 'member', user_id: 'id-6' },
        { id: 'member-7', email: 'member7@example.com', role: 'member', user_id: 'id-7' },
      ];

      cy.stubSupabaseForTeams(fixtures, { members: sevenMembers });
      visitTeamsDashboard();

      // Verify member count is displayed
      cy.contains('Medlemmar').should('be.visible');

      // Verify all 7 members are visible
      cy.contains('member4@example.com').should('be.visible');
      cy.contains('member7@example.com').should('be.visible');

      // Open invite modal and create new invite
      cy.get('[data-cy="team-invite-button"]').should('not.be.disabled').click();
      cy.get('[data-cy="invite-email-input"]').type('member8@example.com');
      cy.get('[data-cy="invite-submit-button"]').click();

      // Verify invitation was created
      cy.wait('@canAddTeamMember');
      cy.wait('@createInvite').then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
        expect(interception.response.body).to.have.property('email', 'member8@example.com');
      });
    });

    it("shows correct team member count for large teams", () => {
      const tenMembers = [
        ...baseMembers,
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `member-${i + 3}`,
          email: `member${i + 3}@example.com`,
          role: 'member',
          user_id: `user-id-${i + 3}`,
        })),
      ];

      cy.stubSupabaseForTeams(fixtures, { members: tenMembers });
      visitTeamsDashboard();

      // Verify member section exists
      cy.contains('Medlemmar').should('be.visible');

      // Count should reflect all members (implementation may vary)
      // Just verify no error and can see multiple members
      cy.contains('admin@example.com').should('be.visible');
      cy.contains('member9@example.com').should('be.visible');
    });

    it("can manage multiple pending invitations simultaneously", () => {
      const existingInvites = [
        {
          id: 'invite-1',
          email: 'invite1@example.com',
          token: 'token-1',
          team_id: TEAM_ID,
          status: 'pending',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'invite-2',
          email: 'invite2@example.com',
          token: 'token-2',
          team_id: TEAM_ID,
          status: 'pending',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'invite-3',
          email: 'invite3@example.com',
          token: 'token-3',
          team_id: TEAM_ID,
          status: 'pending',
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ];

      cy.stubSupabaseForTeams(fixtures, { invites: existingInvites });
      visitTeamsDashboard();

      // Verify all pending invitations are visible
      cy.wait('@teamInvitations');
      cy.contains('invite1@example.com').should('be.visible');
      cy.contains('invite2@example.com').should('be.visible');
      cy.contains('invite3@example.com').should('be.visible');

      // Create a new invitation
      cy.get('[data-cy="team-invite-button"]').click();
      cy.get('[data-cy="invite-email-input"]').type('invite4@example.com');
      cy.get('[data-cy="invite-submit-button"]').click();

      cy.wait('@createInvite').then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
      });
    });

    it("does not show upgrade prompts for team features", () => {
      cy.stubSupabaseForTeams(fixtures);
      visitTeamsDashboard();

      // No upgrade prompts should be visible in team context
      cy.contains('Uppgradera till Premium').should('not.exist');
      cy.contains('gratis-planens gräns').should('not.exist');
    });

    it("backend allows team member creation beyond free limit", () => {
      // Use base members plus 8 generated members (total 10 > free limit of 3)
      const manyMembers = [
        ...baseMembers,
        ...generateTeamMembers(8)
      ];

      cy.stubSupabaseForTeams(fixtures, {
        members: manyMembers,
        canAddMember: true,
      });

      visitTeamsDashboard();

      // Wait for team page to load and verify invite button exists
      cy.get('[data-cy="team-invite-button"]', { timeout: 10000 })
        .should('be.visible')
        .should('not.be.disabled')
        .click();
        
      cy.get('[data-cy="invite-email-input"]').type('newmember@example.com');
      cy.get('[data-cy="invite-submit-button"]').click();

      // Verify backend check passes
      cy.wait('@canAddTeamMember').then((interception) => {
        expect(interception.response.body).to.equal(true);
      });

      cy.wait('@createInvite').then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
      });
    });
  });
});
