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

// Verify activity rendered on canvas using visual regression testing
Cypress.Commands.add('verifyCanvasActivity', (activityName, options = {}) => {
	const { recurse } = require('cypress-recurse');
	
	cy.log(`🎨 Visual verification for activity: ${activityName}`);
	
	// Safe filename (replace spaces and special chars)
	const safeFilename = activityName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
	const beforeFilename = `canvas-before-${safeFilename}.png`;
	const afterFilename = `canvas-after-${safeFilename}.png`;
	
	// Wait for canvas to stabilize after activity creation
	cy.wait(2000);
	
	// Get both images and compare them
	return cy.wrap(null).then(() => {
		return recurse(
			() => {
				// Download current canvas state as PNG (after adding activity)
				return cy.get('canvas').then(($canvas) => {
					const url = $canvas[0].toDataURL('image/png');
					const data = url.replace(/^data:image\/png;base64,/, '');
					cy.writeFile(`cypress/downloads/${afterFilename}`, data, 'base64');
					return cy.wrap({ beforeFilename, afterFilename });
				}).then((filenames) => {
					// Compare before vs after - they should be DIFFERENT
					return cy.task('compareBeforeAfter', filenames);
				});
			},
			(result) => result.different === true,
			{
				limit: 10,
				delay: 1000,
				timeout: 15000,
				log: (result) => {
					if (result && result.different === false) {
						cy.log(`❌ Canvas unchanged - retrying...`);
					} else if (result && result.different === true) {
						cy.log(`✅ Canvas has changed! Activity rendered.`);
					}
				},
				error: 'Canvas did not change after adding activity (10 attempts)'
			}
		);
	}).then((result) => {
		// Assert that the canvas changed
		expect(result.different, 'Canvas should change after adding activity').to.be.true;
	});
});

// Capture empty canvas state (call this BEFORE adding activity)
Cypress.Commands.add('captureEmptyCanvas', (testName) => {
	const safeFilename = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
	const filename = `canvas-before-${safeFilename}.png`;
	
	cy.log(`📸 Capturing empty canvas state`);
	
	return cy.get('canvas').then(($canvas) => {
		const url = $canvas[0].toDataURL('image/png');
		const data = url.replace(/^data:image\/png;base64,/, '');
		cy.writeFile(`cypress/downloads/${filename}`, data, 'base64');
	});
});
