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
} from "../support/team-test-helpers";

describe("Team Seat Limits", () => {
  // Shared fixture data - loaded once before all tests
  let fixtures = {};
  describe("for Freemium user", () => {
    before(() => {
      // Load all fixtures using custom command
      cy.loadFixtures().then((loadedFixtures) => {
        fixtures = loadedFixtures;
      });
    });

    beforeEach(() => {
      // Verify fixtures are loaded
      expect(fixtures.authUser, "authUser fixture should be loaded").to.exist;
      expect(fixtures.authSession, "authSession fixture should be loaded").to
        .exist;
      expect(fixtures.subscription, "subscription fixture should be loaded").to
        .exist;

      // Set up common intercepts using Cypress command
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

      cy.stubSupabaseForTeams(fixtures, { invites: [existingInvite] });
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

      // Set up all necessary intercepts using Cypress commands
      cy.blockExternalResources();
      cy.stubAuthEndpoints(fixtures);
      cy.stubUserData(fixtures);
      cy.stubWheelData(fixtures);
      cy.stubOrganizationData();
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
});
