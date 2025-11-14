const TEST_AUTH_EVENT = 'yearwheel:test-auth';

function buildMockUser(overrides = {}) {
	const defaultUser = {
		id: '00000000-0000-0000-0000-000000000000',
		email: 'cypress.user@example.com',
		app_metadata: { provider: 'email' },
		user_metadata: {},
	};

	return { ...defaultUser, ...overrides };
}

Cypress.Commands.add('mockAuth', (userOverrides = {}) => {
	const mockUser = buildMockUser(userOverrides);

	cy.window().then((win) => {
		win.__YEARWHEEL_TEST_USER__ = mockUser;
		win.dispatchEvent(new CustomEvent(TEST_AUTH_EVENT, { detail: { user: mockUser } }));
	});
});

Cypress.Commands.add('visitWithMockAuth', (url, userOverrides = {}, options = {}) => {
	const mockUser = buildMockUser(userOverrides);
	const mergedOptions = {
		...options,
		onBeforeLoad(win) {
			win.__YEARWHEEL_TEST_USER__ = mockUser;
			
			// Set up a fake Supabase session in localStorage so supabase.auth.getUser() works
			// The Supabase client will return this cached user without making network calls
			// Use a valid JWT format (3 parts: header.payload.signature)
			const fakeSession = {
				access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkN5cHJlc3MgVGVzdCIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				token_type: 'bearer',
				expires_in: 3600,
				expires_at: Math.floor(Date.now() / 1000) + 3600,
				refresh_token: 'fake-refresh-token',
				user: mockUser,
			};
			
			// Supabase stores auth state in localStorage - project ID from URL
			win.localStorage.setItem('sb-mmysvuymzabstnobdfvo-auth-token', JSON.stringify(fakeSession));
			
			// Dismiss cookie consent to avoid blocking UI
			win.localStorage.setItem('cookieConsent', JSON.stringify({
				preferences: { necessary: true, preferences: false, statistics: false, marketing: false },
				timestamp: new Date().toISOString(),
			}));
			if (typeof options.onBeforeLoad === 'function') {
				options.onBeforeLoad(win);
			}
		},
	};

	cy.visit(url, mergedOptions).then((win) => {
		win.dispatchEvent(new CustomEvent(TEST_AUTH_EVENT, { detail: { user: mockUser } }));
	});
});

// Import team intercept helpers
import { 
	stubSupabaseForTeamsImpl,
	stubAuthEndpointsImpl,
	stubUserDataImpl,
	stubWheelDataImpl,
	stubOrganizationDataImpl,
	stubInvitationAcceptanceImpl,
	blockExternalResourcesImpl
} from './team-intercepts';

// Team intercept commands
Cypress.Commands.add('blockExternalResources', () => {
	blockExternalResourcesImpl();
});

Cypress.Commands.add('stubAuthEndpoints', (fixtures) => {
	stubAuthEndpointsImpl(fixtures);
});

Cypress.Commands.add('stubUserData', (fixtures) => {
	stubUserDataImpl(fixtures);
});

Cypress.Commands.add('stubWheelData', (fixtures) => {
	stubWheelDataImpl(fixtures);
});

Cypress.Commands.add('stubOrganizationData', () => {
	stubOrganizationDataImpl();
});

Cypress.Commands.add('stubSupabaseForTeams', (fixtures, options = {}) => {
	stubSupabaseForTeamsImpl(fixtures, options);
});

Cypress.Commands.add('stubInvitationAcceptance', (testInvitation) => {
	stubInvitationAcceptanceImpl(testInvitation);
});

// Load all common fixtures
Cypress.Commands.add('loadFixtures', () => {
	const fixtures = {};
	
	return cy.fixture('auth-user.json').then(data => { fixtures.authUser = data; })
		.then(() => cy.fixture('auth-session.json')).then(data => { fixtures.authSession = data; })
		.then(() => cy.fixture('subscription.json')).then(data => { fixtures.subscription = data; })
		.then(() => cy.fixture('user-wheels.json')).then(data => { fixtures.userWheels = data; })
		.then(() => cy.fixture('team.json')).then(data => { fixtures.team = data; })
		.then(() => cy.fixture('team-wheels.json')).then(data => { fixtures.teamWheels = data; })
		.then(() => cy.fixture('template-wheels.json')).then(data => { fixtures.templateWheels = data; })
		.then(() => cy.fixture('profile.json')).then(data => { fixtures.profile = data; })
		.then(() => fixtures);
});
