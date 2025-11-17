/**
 * Subscription Purchase E2E Tests
 * 
 * Tests:
 * - Monthly/yearly billing toggle
 * - Correct price IDs sent to Stripe
 * - Checkout session creation
 */

import { TEST_USER, setupFreemiumUser } from '../support/test-helpers';

describe('Subscription Purchase Flow', () => {
  let fixtures = {};
  
  // Stripe price IDs from env
  const MONTHLY_PRICE_ID = 'price_1SGeonACrZsA8k1EK9WAVcxW';
  const YEARLY_PRICE_ID = 'price_1SGepNACrZsA8k1EDB9yCYnS';
  
  // Mock Stripe checkout session
  const mockCheckoutSession = {
    sessionId: 'cs_test_mock_session_id_123456',
    url: 'https://checkout.stripe.com/pay/cs_test_mock_session_id_123456'
  };

  before(() => {
    cy.blockExternalResources();
    cy.loadFixtures().then((loadedFixtures) => {
      fixtures = loadedFixtures;
    });
  });

  beforeEach(function() {
    // Skip setup for unauthenticated test
    if (this.currentTest.title === 'redirects to auth page when not logged in') {
      return;
    }

    // Set up freemium user (free plan)
    const freemiumFixtures = setupFreemiumUser(fixtures);
    
    // Set up common intercepts
    cy.stubAuthEndpoints(freemiumFixtures);
    cy.stubUserData(freemiumFixtures);
    cy.stubWheelData(freemiumFixtures);
    cy.stubOrganizationData();
    
    // Stub team data
    cy.intercept('GET', '**/rest/v1/teams*', { statusCode: 200, body: [] }).as('teams');
    cy.intercept('GET', '**/rest/v1/team_invitations*', { statusCode: 200, body: [] }).as('teamInvitations');
    cy.intercept('GET', '**/rest/v1/wheel_pages*', { statusCode: 200, body: [] }).as('wheelPages');
    
    // Mock _ga cookie for GA tracking
    cy.on('window:before:load', (win) => {
      win.document.cookie = '_ga=GA1.2.1234567890.9876543210';
    });
  });


  describe('Monthly Subscription Purchase', () => {
    it('sends correct monthly price ID when purchasing', () => {
      // Stub Stripe Edge Function call
      cy.intercept('POST', '**/functions/v1/create-checkout-session', (req) => {
        // Verify request payload has correct monthly price ID
        expect(req.body).to.have.property('priceId', MONTHLY_PRICE_ID);
        expect(req.body).to.have.property('successUrl');
        expect(req.body.successUrl).to.include('plan=monthly');
        expect(req.body).to.have.property('cancelUrl');
        
        // Return mock checkout session
        req.reply({
          statusCode: 200,
          body: mockCheckoutSession
        });
      }).as('createCheckoutSession');

      // Visit pricing page
      cy.visitWithMockAuth('/pricing', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      // Wait for page to load
      cy.contains('Enkel prissättning', { timeout: 10000 }).should('be.visible');

      // Ensure monthly billing is selected (toggle off if yearly)
      cy.get('[data-cy="billing-cycle-toggle"]').then($toggle => {
        const isYearly = $toggle.attr('aria-checked') === 'true';
        if (isYearly) {
          cy.wrap($toggle).scrollIntoView().click({ force: true });
          cy.wait(500);
        }
      });

      // Click premium CTA to open modal
      cy.get('[data-cy="premium-plan-cta"]')
        .scrollIntoView()
        .click({ force: true });

      // Modal should open
      cy.contains('Välj din plan', { timeout: 5000 }).should('be.visible');

      // Click monthly upgrade button
      cy.get('[data-cy="upgrade-monthly-button"]').click();

      // Verify correct price ID was sent
      cy.wait('@createCheckoutSession').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.request.body.priceId).to.equal(MONTHLY_PRICE_ID);
        expect(interception.request.body.planType).to.equal('monthly');
      });
    });
  });

  describe('Yearly Subscription Purchase', () => {
    it('sends correct yearly price ID when purchasing', () => {
      // Stub Stripe Edge Function call
      cy.intercept('POST', '**/functions/v1/create-checkout-session', (req) => {
        // Verify request payload has correct yearly price ID
        expect(req.body).to.have.property('priceId', YEARLY_PRICE_ID);
        expect(req.body.successUrl).to.include('plan=yearly');
        
        // Return mock checkout session
        req.reply({
          statusCode: 200,
          body: mockCheckoutSession
        });
      }).as('createCheckoutSessionYearly');

      cy.visitWithMockAuth('/pricing', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      cy.contains('Enkel prissättning', { timeout: 10000 }).should('be.visible');

      // Toggle to yearly billing
      cy.get('[data-cy="billing-cycle-toggle"]').then($toggle => {
        const isYearly = $toggle.attr('aria-checked') === 'true';
        if (!isYearly) {
          cy.wrap($toggle).scrollIntoView().click({ force: true });
          cy.wait(500);
        }
      });

      // Verify yearly discount badge is visible
      cy.contains(/Spara 19%/i, { timeout: 5000 }).should('be.visible');

      // Click CTA to open modal
      cy.get('[data-cy="premium-plan-cta"]').scrollIntoView().click({ force: true });

      // Modal should open
      cy.contains('Välj din plan', { timeout: 5000 }).should('be.visible');

      // Click yearly upgrade button
      cy.get('[data-cy="upgrade-yearly-button"]').click();

      // Verify correct price ID was sent
      cy.wait('@createCheckoutSessionYearly').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.request.body.priceId).to.equal(YEARLY_PRICE_ID);
        expect(interception.request.body.planType).to.equal('yearly');
      });
    });
  });

  describe('Billing Cycle Toggle', () => {
    it('toggles between monthly and yearly pricing', () => {
      cy.visitWithMockAuth('/pricing', {
        id: TEST_USER.id,
        email: TEST_USER.email,
      });

      cy.contains('Enkel prissättning', { timeout: 10000 }).should('be.visible');

      // Should start with yearly selected (default)
      cy.get('[data-cy="billing-cycle-toggle"]')
        .should('have.attr', 'aria-checked', 'true');
      
      // Yearly price should be visible
      cy.contains('768').should('be.visible');

      // Toggle to monthly
      cy.get('[data-cy="billing-cycle-toggle"]').scrollIntoView().click({ force: true });
      cy.wait(500);

      // Should now be monthly
      cy.get('[data-cy="billing-cycle-toggle"]')
        .should('have.attr', 'aria-checked', 'false');
      
      // Monthly price should be visible
      cy.contains('79').should('be.visible');

      // Toggle back to yearly
      cy.get('[data-cy="billing-cycle-toggle"]').click({ force: true });
      cy.wait(500);

      // Should be yearly again
      cy.get('[data-cy="billing-cycle-toggle"]')
        .should('have.attr', 'aria-checked', 'true');
      
      cy.contains('768').should('be.visible');
    });
  });

  describe('Unauthenticated User', () => {
    it('redirects to auth page when not logged in', () => {
      // Block external resources
      cy.blockExternalResources();
      
      // Visit pricing page with unauthenticated state (no beforeEach setup)
      cy.visit('/pricing', {
        onBeforeLoad(win) {
          // Dismiss cookie consent
          win.localStorage.setItem('cookieConsent', JSON.stringify({
            preferences: { necessary: true, preferences: false, statistics: false, marketing: false },
            timestamp: new Date().toISOString(),
          }));
          
          // Clear any existing auth tokens
          win.localStorage.removeItem('sb-mmysvuymzabstnobdfvo-auth-token');
          
          // Set test user to null (unauthenticated)
          win.__YEARWHEEL_TEST_USER__ = null;
          
          // Dispatch test auth event
          win.dispatchEvent(new CustomEvent('yearwheel:test-auth', {
            detail: { user: null }
          }));
        }
      });

      // Verify pricing page loaded
      cy.url().should('include', '/pricing');
      
      // Wait for premium CTA button to appear
      cy.get('[data-cy="premium-plan-cta"]', { timeout: 10000 }).should('be.visible');

      // Click CTA - should redirect to /auth since user is not logged in
      cy.get('[data-cy="premium-plan-cta"]').scrollIntoView().click({ force: true });

      // Verify redirect to auth page
      cy.url({ timeout: 5000 }).should('include', '/auth');
      
      // Verify auth page elements are visible
      cy.contains(/Logga in|Skapa konto/i).should('be.visible');
    });
  });
});
