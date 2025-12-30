# Privacy Policy

**Last updated: December 30, 2025**

## 1. Introduction

Welcome to YearWheel ("we", "us", "our"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, share, and protect your information when you use our service.

YearWheel is provided by **CommunitasLabs Inc**, registered in the United States.

## 2. Information We Collect

### 2.1 Information You Provide
- **Account Information**: Name, email address, password (encrypted)
- **Profile Information**: Optional information you choose to share
- **Content**: Year wheels, activities, notes, and other data you create
- **Payment Information**: Processed securely through Stripe (we don't store full card details)

### 2.2 Automatically Collected Information
- **Usage Data**: How you interact with the service
- **Device Data**: IP address, browser type, operating system
- **Cookies**: See our Cookie Policy for details

### 2.3 Third-Party Services
- **Google Calendar & Sheets**: If you choose to integrate these services
- **Authentication Information**: Via secure OAuth 2.0 protocols

## 3. How We Use Your Information

We use your information to:
- Provide and improve our service
- Create and manage your account
- Process payments and manage subscriptions
- Send you service-related communications
- Provide customer support
- Prevent fraud and security threats
- Comply with legal obligations

## 4. Legal Basis for Processing (GDPR)

We process your personal data based on:
- **Contract**: To fulfill our agreement with you
- **Legitimate Interest**: To improve our service and security
- **Consent**: For specific features like marketing (can be withdrawn)
- **Legal Obligation**: To comply with laws and regulations

## 5. Data Sharing and Third Parties

We NEVER sell your information for marketing purposes. We only share data with:

### 5.1 Third-Party Services Overview

Our application uses minimal third-party services, primarily for infrastructure, authentication, and analytics. Below is a comprehensive overview of all third-party domains and services we use:

| Service | Domain(s) | Purpose | Used By | Data Shared |
|---------|-----------|---------|---------|-------------|
| Monday.com | api.monday.com, auth.monday.com | Board data, authentication | Both apps | Context, board data (read-only) |
| Supabase | mmysvuymzabstnobdfvo.supabase.co | Backend infrastructure, database | Both apps | User profile, OAuth data |
| Google Analytics | www.google-analytics.com, www.googletagmanager.com | Usage analytics | Main app only | Page views, sessions (anonymized) |
| Google Auth | accounts.google.com, oauth2.googleapis.com | User authentication | Main app only | Email, name, profile (with consent) |
| Google Tag Manager | www.googletagmanager.com | Tag management | Main app only | Event tracking data |
| Netlify | yearwheel.se | Static hosting | Main app | None (hosting provider) |
| Stripe | stripe.com | Payment processing | Main app | Payment information (PCI DSS certified) |

**Important Distinction:**
- **Monday.com Board View App**: Uses only Monday.com API and Supabase (no analytics)
- **Main YearWheel.se App**: Uses all services above

### 5.2 Monday.com API (First-Party Integration)

**Domains:**
- `https://api.monday.com/v2` - GraphQL API
- `https://auth.monday.com/oauth2/authorize` - OAuth authorization
- `https://auth.monday.com/oauth2/token` - OAuth token exchange

**Purpose:**
- Board Data Access: Fetch board groups, items, columns (read-only)
- User Authentication: OAuth flow for main app
- Context Management: Board view SDK context

**Data Sent to Monday.com:**
- GraphQL Queries: Board ID, item queries (no PII)
- OAuth Requests: Client ID, redirect URI, state parameter
- Context Requests: Board context from SDK

**Data Received from Monday.com:**
- Board Data: Groups, items, column values
- User Info: Email, name, account details (OAuth only)
- Context: Board ID, user session

**Why This Is Necessary:**
Monday.com API is the core functionality of the integration, required to display board data in year wheel visualization and OAuth required for main app user linking.

**Privacy Policy:** https://monday.com/l/legal/privacy-policy

### 5.3 Supabase (Backend Infrastructure)

**Domains:**
- `https://mmysvuymzabstnobdfvo.supabase.co` - Supabase project URL
- `https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/*` - Edge Functions
- `*.supabase.co` - Supabase infrastructure

**Purpose:**
- Database: PostgreSQL for user profiles and monday_users table
- Edge Functions: Webhook handler, OAuth init/callback
- Authentication: OAuth state storage
- Storage: User data persistence

**Data Sent to Supabase:**
- User Profiles: Email, name (from OAuth or registration)
- Monday Users: monday_user_id, account_id, email, name
- Webhook Data: Monday.com webhook payloads (install, subscription events)

**Data Received from Supabase:**
- User Records: User profile data, monday_users records
- OAuth State: CSRF protection state parameter

**Data Security:**
- Encryption: AES-256 at rest, TLS 1.3 in transit
- Row-Level Security: Database access controls
- Environment Variables: Secrets not in code
- JWT Verification: Webhook payload verification

**Hosting Location:** Frankfurt, Germany (eu-central-1)

**Privacy Policy:** https://supabase.com/privacy

### 5.4 Google Analytics & Google Tag Manager (Main App Only)

**Domains:**
- `https://www.google-analytics.com` - Analytics JavaScript
- `https://www.googletagmanager.com` - Tag Manager
- `https://analytics.google.com` - Analytics backend

**Purpose:**
- Usage Statistics: Page views, session duration, device types
- User Behavior: Feature usage, navigation patterns
- Performance Monitoring: Load times, error rates
- Event Tracking: User interactions, feature usage
- Tag Management: Centralized tracking configuration

**Data Sent to Google:**
- Page Views: URL, page title, referrer
- Device Info: Browser, OS, screen resolution (anonymized)
- Session Data: Session ID, timestamp
- No PII: IP addresses anonymized, no names/emails

**Data Received from Google:**
- None: One-way data flow (app → Google)

**Cookie Consent Integration:**
- Consent Required: Google Analytics loads only after user acceptance
- Cookie Banner: Industry-standard consent mechanism
- Opt-Out Available: Users can reject analytics cookies
- GDPR Compliant: Cookie policy disclosure

**Why This Is Necessary:**
Product improvement, understanding user interactions, bug detection, identifying errors and performance issues, and data-driven development decisions. Not used for ads, remarketing or advertising.

**Important:** Google Analytics is NOT used in the Monday.com Board View App iframe (zero tracking in board view).

**Privacy Policy:** https://policies.google.com/privacy

### 5.5 Google Authentication (Main App Only)

**Domains:**
- `https://accounts.google.com` - OAuth authorization
- `https://oauth2.googleapis.com` - Token exchange
- `https://www.googleapis.com/oauth2/v3/userinfo` - User profile

**Purpose:**
- User Authentication: Sign in with Google account
- Identity Verification: Email verification
- Profile Data: Name and profile picture

**Data Sent to Google:**
- OAuth Requests: Client ID, redirect URI, scope, state parameter
- Token Requests: Authorization code, client credentials

**Data Received from Google:**
- User Profile: Email, name, profile picture URL
- Access Token: For API access (if needed)
- ID Token: JWT with user identity

**User Consent:**
- OAuth Consent Screen: Users explicitly approve data sharing
- Scope Disclosure: Clearly states what data is requested (email, profile)
- Revocable: Users can revoke access via Google Account settings

**Data Security:**
- OAuth 2.0: Industry-standard authentication protocol
- State Parameter: CSRF protection
- HTTPS Only: Encrypted communication
- No Password Storage: Google handles authentication

**Privacy Considerations:**
- Optional: Users can also create accounts with email/password
- Limited Scope: Only request necessary data (email, name, profile)
- No Google APIs: Don't access Gmail, Drive, or other Google services
- Data Control: Users control what data they share

**Important:** Google Auth is NOT used in the Monday.com Board View App (board view uses Monday.com SDK authentication).

**Privacy Policy:** https://policies.google.com/privacy

### 5.6 Netlify (Hosting Provider)

**Domain:**
- `https://yearwheel.se` - Custom domain on Netlify

**Purpose:**
- Static Hosting: Main YearWheel.se app hosting
- CDN: Global content delivery network
- SSL Certificates: Automatic Let's Encrypt certificates
- HTTPS: Automatic redirect and HSTS

**Data Sent to Netlify:**
- Static Assets: HTML, CSS, JavaScript files (no user data)
- Build Artifacts: Compiled application code

**Data Received from Netlify:**
- None: Netlify is hosting provider (no data exchange)

**Data Security:**
- HTTPS Only: All traffic encrypted
- HSTS Enabled: Force HTTPS
- No Data Storage: Netlify doesn't store user data

**Privacy Policy:** https://www.netlify.com/privacy/

### 5.7 Stripe (Payment Processing)

**Purpose:**
- Payment processing (PCI DSS certified)
- Secure handling of payment information

**Data Shared:**
- Payment information processed securely through Stripe
- We don't store full card details

**Privacy Policy:** https://stripe.com/privacy

### 5.8 Services We Do NOT Use

We explicitly do **NOT** use:
- Facebook Pixel or Facebook Login: No social media tracking
- Google Ads: No advertising or remarketing
- Hotjar/FullStory: No session replay or heatmaps
- Amplitude/Mixpanel: No advanced analytics (beyond Google Analytics)
- Third-Party Ad Networks: No advertising
- Twitter/LinkedIn/Apple Login: No other social logins (only Google Auth and Monday.com OAuth)

### 5.9 Legal Requirements

We may share information if required by law or to:
- Comply with legal processes
- Protect our rights
- Prevent fraud or security threats

### 5.10 Data Flow Diagram

Our data flows between different services as follows:

```
┌─────────────────────────────────────────────────────────────┐
│                    Monday.com Board View                     │
│                  (ZIP hosted on Monday.com)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌──────────┐ ┌──────────────┐
│ Monday.com API│ │ Supabase │ │ (No Analytics│
│ api.monday.com│ │ Backend  │ │  in iframe)  │
└───────────────┘ └──────────┘ └──────────────┘
        │
┌───────────────────────────────────────────────────────────────┐
│                    Main YearWheel.se App                       │
│                    (Netlify hosted)                           │
└───────────────────────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┬──────────┐
        │               │               │               │          │
        ▼               ▼               ▼               ▼          ▼
┌───────────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────┐ ┌────────────┐
│ Monday.com API│ │ Supabase │ │Google Analytics│ │ Netlify │ │Google Auth │
│ (OAuth)       │ │ Backend  │ │& Tag Manager   │ │  CDN    │ │(Sign-in)   │
└───────────────┘ └──────────┘ └──────────────┘ └─────────┘ └────────────┘
```

**Data Flow Summary:**
- User → Monday.com Board View: Context only
- Board View → Monday.com API: Board queries (read-only)
- Board View → Supabase: No direct calls (webhook only)
- Main App → Monday.com API: OAuth authentication
- Main App → Supabase: User profile, OAuth data
- Main App → Google Analytics & Tag Manager: Page views, events (with consent)
- Main App → Google Auth: User sign-in (with consent)
- Main App → Netlify: Static asset requests only

### 5.11 Compliance Summary

All third-party services we use are compliant with major data protection standards:

| Service | GDPR Compliant | Data Processing Agreement | SOC 2 | ISO 27001 |
|---------|----------------|---------------------------|-------|-----------|
| Monday.com | ✓ | ✓ | ✓ | ✓ |
| Supabase | ✓ | ✓ | ✓ | ✓ |
| Google | ✓ | ✓ | ✓ | ✓ |
| Netlify | ✓ | ✓ | ✓ | ✓ |
| Stripe | ✓ | ✓ | ✓ | ✓ |

**All third-party services:**
- GDPR compliant
- Provide Data Processing Agreements (DPA)
- Certified for security compliance
- Maintain transparent privacy policies
- Allow user data deletion upon request

## 6. Data Storage and Security

### 6.1 Where We Store Data
- Primary storage: EU-based servers (via Supabase)
- Backups: Encrypted backups in EU region

### 6.2 Security Measures
- End-to-end encryption for sensitive data
- HTTPS/TLS for all data transmission
- Regular security audits
- Access control and authentication
- Automated backups

### 6.3 Retention Period
- Active accounts: Data stored while your account is active
- Inactive accounts: Data deleted after 24 months of inactivity
- Deleted accounts: Data permanently deleted within 30 days

## 7. Your Rights (GDPR)

You have the right to:
- **Access**: Request a copy of your personal data
- **Rectification**: Correct inaccurate information
- **Erasure**: Delete your account and all data
- **Data Portability**: Export your data in machine-readable format
- **Object**: Object to certain data processing
- **Restriction**: Restrict processing of your data
- **Withdraw Consent**: At any time

To exercise your rights, contact us at: hey@communitaslabs.io

## 8. International Data Transfers

If you're located outside the EU, your data may be transferred to EU servers. We ensure adequate protection through:
- EU Standard Contractual Clauses
- Data protection agreements with all third-party providers
- GDPR-compliant data processing agreements

## 9. Children and Minors

YearWheel is not intended for children under 16. We do not knowingly collect information from children. If you're a parent and discover your child has provided us with information, contact us immediately.

## 10. Cookies and Tracking

We use cookies for:
- **Essential cookies**: For the service to function
- **Functional cookies**: To remember your preferences
- **Analytics cookies**: To understand how the service is used (can be declined)

You can manage cookies in your browser settings or via our cookie banner.

## 11. Changes to This Policy

We may update this policy from time to time. For significant changes:
- Notification banner on next login
- Email notification to registered users
- 30 days notice before changes take effect

## 12. Contact Us

For privacy questions or concerns about this policy:

**Email**: hey@communitaslabs.io  
**Postal Address**: CommunitasLabs Inc, [Address]

**EU Representative**: [Name and address if applicable]

## 13. Supervisory Authority

You have the right to lodge a complaint with your local data protection authority:
- **Sweden**: Swedish Authority for Privacy Protection (IMY)
- **EU**: Your national data protection authority

---

*Last reviewed: December 30, 2025*
