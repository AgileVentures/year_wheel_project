import InviteMemberModal from '../../src/components/teams/InviteMemberModal';
import { TEAM_LIMIT_ERROR_CODE } from '../../src/services/teamService';
import { withTestProviders } from '../../src/test-utils/TestProviders';

const mountModal = (props = {}) => {
  cy.mount(
    withTestProviders(
      <InviteMemberModal
        teamId="team-1"
        teamName="Marketing"
        onClose={cy.stub().as('onClose')}
        onInvitationSent={cy.stub().as('onInvitationSent')}
        {...props}
      />
    )
  );
};

describe('Invite Member Modal', () => {
  it('is expected to show the success state when an invitation is sent', () => {
    const sendInvitation = cy.stub().resolves({ token: 'invite-token' });

    mountModal({ sendInvitation });

    cy.get('input[type="email"]').type('anna@example.com');
    cy.contains('button', 'Skicka inbjudan').click();

    cy.wrap(sendInvitation).should('have.been.calledWith', 'team-1', 'anna@example.com');
    cy.contains('Inbjudan skapad!').should('be.visible');
    cy.contains('Dela länken nedan med anna@example.com').should('be.visible');
    cy.contains('Inbjudningslänk').should('be.visible');
  });

  it('is expected to show a seat-limit error when the free plan is full', () => {
    const limitError = Object.assign(new Error(TEAM_LIMIT_ERROR_CODE), { code: TEAM_LIMIT_ERROR_CODE });
    const sendInvitation = cy.stub().rejects(limitError);

    mountModal({ sendInvitation });

    cy.get('input[type="email"]').type('lisa@example.com');
    cy.contains('button', 'Skicka inbjudan').click();

    cy.contains('Teamet har redan nått maxantalet medlemmar på gratis-planen.').should('be.visible');
  });
});
