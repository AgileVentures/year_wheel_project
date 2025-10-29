import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../utils/dialogs';
import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AFFILIATE_TERMS = `# YearWheel Affiliate Program Terms & Conditions

**Last Updated: October 29, 2025**

## 1. Introduction

Welcome to the YearWheel Affiliate Program ("Program"). By applying to become an affiliate and accepting these terms, you agree to promote YearWheel in accordance with these Terms & Conditions.

## 2. Eligibility

To participate in the Program, you must:
- Be at least 18 years old
- Have a legitimate website, blog, social media presence, or other promotional channel
- Comply with all applicable laws and regulations
- Not engage in prohibited promotion methods (see Section 5)

## 3. Commission Structure

### Free Account Signups
- **€2.00** per qualified free account signup
- Payment made monthly for conversions from the previous month

### Premium Upgrades
- **50%** of the first payment amount
- Applies to monthly or yearly subscriptions
- One-time commission per user upgrade

### Payment Terms
- Minimum payout threshold: **€50**
- Payments processed within 30 days of month end
- All commissions subject to verification and fraud prevention checks

## 4. Affiliate Responsibilities

You agree to:
- Accurately represent YearWheel's features and pricing
- Clearly disclose your affiliate relationship when promoting YearWheel
- Use only approved marketing materials or create original content
- Not make false or misleading claims about YearWheel
- Not engage in spam, unsolicited emails, or intrusive advertising
- Not bid on YearWheel-related keywords in paid search campaigns
- Comply with GDPR, CCPA, and all applicable privacy regulations

## 5. Prohibited Activities

The following activities are **strictly prohibited**:
- Cookie stuffing or manipulation of tracking mechanisms
- Self-referrals or incentivized signups
- Promotion through content related to:
  - Adult/sexual content
  - Weapons or violence
  - Illegal activities
  - Political extremism
  - Misleading health/medical claims
  - Get-rich-quick schemes
- Trademark infringement or brand confusion
- Using YearWheel trademarks in domain names

## 6. Tracking & Attribution

- Conversions tracked via secure cookie technology
- **90-day** cookie attribution window
- Last-click attribution model
- Commission credited only for genuine, verifiable conversions
- YearWheel reserves the right to reject fraudulent or suspicious conversions

## 7. Payment Terms

- Payments made via bank transfer (SEPA) or PayPal
- Affiliates must provide valid payment details
- Tax compliance is the affiliate's responsibility
- Chargebacks or refunded orders will void associated commissions
- Unpaid balances below €50 roll over to the following month

## 8. Termination

YearWheel may terminate your affiliate account:
- For violation of these terms
- For fraudulent activity or abuse
- At any time with 30 days' notice
- Immediately for serious violations

Upon termination:
- All pending commissions will be forfeited unless already approved
- Access to the affiliate dashboard will be revoked
- You must cease all promotional activities

## 9. Intellectual Property

- YearWheel retains all rights to trademarks, logos, and brand assets
- Limited license granted for promotional purposes only
- You may not modify or create derivative works from YearWheel materials
- License terminates immediately upon program termination

## 10. Limitation of Liability

YearWheel is not liable for:
- Loss of commissions due to technical issues
- Inaccurate tracking caused by third-party interference
- Changes to commission rates (with 30 days' notice)
- Losses resulting from program changes or termination

## 11. Confidentiality

You agree to keep confidential:
- Commission rates and payment terms (unless publicly disclosed)
- Tracking mechanisms and conversion data
- Any non-public information about YearWheel's business

## 12. Modifications

YearWheel reserves the right to modify these terms at any time. Material changes will be communicated via email with 30 days' notice. Continued participation constitutes acceptance of updated terms.

## 13. Governing Law

These terms are governed by the laws of Sweden. Any disputes shall be resolved in Swedish courts.

## 14. Contact

For questions about the Affiliate Program:
- Email: hey@communitaslabs.io
- Dashboard: https://yearwheel.com/affiliate-dashboard

---

By clicking "I Accept These Terms," you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
`;

const AFFILIATE_TERMS_SV = `# YearWheel Affiliateprogram - Villkor

**Senast uppdaterad: 29 oktober 2025**

## 1. Introduktion

Välkommen till YearWheel Affiliateprogram ("Programmet"). Genom att ansöka om att bli affiliate och acceptera dessa villkor, godkänner du att marknadsföra YearWheel i enlighet med dessa Villkor.

## 2. Behörighet

För att delta i Programmet måste du:
- Vara minst 18 år gammal
- Ha en legitim webbplats, blogg, närvaro på sociala medier eller annan marknadsföringskanal
- Följa alla tillämpliga lagar och förordningar
- Inte ägna dig åt förbjudna marknadsföringsmetoder (se Avsnitt 5)

## 3. Provisionsstruktur

### Gratis Kontoregistreringar
- **€2,00** per kvalificerad gratis kontoregistrering
- Betalning görs månadsvis för konverteringar från föregående månad

### Premiumuppgraderingar
- **50%** av första betalningsbeloppet
- Gäller månads- eller årsprenumerationer
- Engångsprovision per användaruppgradering

### Betalningsvillkor
- Minsta utbetalningsgräns: **€50**
- Betalningar behandlas inom 30 dagar efter månadens slut
- All provision föremål för verifiering och bedrägerikontroll

## 4. Affiliates Ansvar

Du godkänner att:
- Korrekt representera YearWheels funktioner och prissättning
- Tydligt avslöja din affiliaterelation när du marknadsför YearWheel
- Endast använda godkänt marknadsföringsmaterial eller skapa originalinnehåll
- Inte göra falska eller vilseledande påståenden om YearWheel
- Inte ägna dig åt spam, oönskade e-postmeddelanden eller påträngande reklam
- Inte bjuda på YearWheel-relaterade nyckelord i betalda sökkampanjer
- Följa GDPR, CCPA och alla tillämpliga integritetsbestämmelser

## 5. Förbjudna Aktiviteter

Följande aktiviteter är **strängt förbjudna**:
- Cookie stuffing eller manipulering av spårningsmekanismer
- Självreferenser eller incitamentsbaserade registreringar
- Marknadsföring genom innehåll relaterat till:
  - Vuxen/sexuellt innehåll
  - Vapen eller våld
  - Olagliga aktiviteter
  - Politisk extremism
  - Vilseledande hälso-/medicinska påståenden
  - Bli-rik-snabbt-system
- Varumärkesintrång eller varumärkesförvirring
- Användning av YearWheels varumärken i domännamn

## 6. Spårning & Tillskrivning

- Konverteringar spåras via säker cookie-teknologi
- **90-dagars** cookie-tillskrivningsfönster
- Sista-klick-tillskrivningsmodell
- Provision krediteras endast för genuina, verifierbara konverteringar
- YearWheel förbehåller sig rätten att avvisa bedrägliga eller misstänkta konverteringar

## 7. Betalningsvillkor

- Betalningar görs via banköverföring (SEPA) eller PayPal
- Affiliates måste tillhandahålla giltiga betalningsuppgifter
- Skatteefterlevnad är affiliatens ansvar
- Återbetalningar eller återbetalda beställningar annullerar tillhörande provisioner
- Obetalda saldon under €50 överförs till följande månad

## 8. Uppsägning

YearWheel kan säga upp ditt affiliatekonto:
- För brott mot dessa villkor
- För bedräglig aktivitet eller missbruk
- När som helst med 30 dagars varsel
- Omedelbart för allvarliga överträdelser

Vid uppsägning:
- All väntande provision förverkas om inte redan godkänd
- Åtkomst till affiliatepanelen återkallas
- Du måste upphöra med all marknadsföringsaktivitet

## 9. Immateriell Egendom

- YearWheel behåller alla rättigheter till varumärken, logotyper och varumärkestillgångar
- Begränsad licens beviljas endast för marknadsföringsändamål
- Du får inte modifiera eller skapa härledda verk från YearWheel-material
- Licensen upphör omedelbart vid programmets uppsägning

## 10. Ansvarsbegränsning

YearWheel är inte ansvarigt för:
- Förlust av provisioner på grund av tekniska problem
- Felaktig spårning orsakad av tredjepartsinblandning
- Ändringar av provisionssatser (med 30 dagars varsel)
- Förluster till följd av programändringar eller uppsägning

## 11. Konfidentialitet

Du godkänner att hålla konfidentiellt:
- Provisionssatser och betalningsvillkor (om inte offentligt avslöjade)
- Spårningsmekanismer och konverteringsdata
- All icke-offentlig information om YearWheels verksamhet

## 12. Ändringar

YearWheel förbehåller sig rätten att ändra dessa villkor när som helst. Väsentliga ändringar kommer att kommuniceras via e-post med 30 dagars varsel. Fortsatt deltagande utgör godkännande av uppdaterade villkor.

## 13. Tillämplig Lag

Dessa villkor styrs av svensk lag. Eventuella tvister ska lösas i svenska domstolar.

## 14. Kontakt

För frågor om Affiliateprogrammet:
- E-post: hey@communitaslabs.io
- Panel: https://yearwheel.com/affiliate-dashboard

---

Genom att klicka på "Jag accepterar" bekräftar du att du har läst, förstått och godkänner att vara bunden av dessa Villkor.
`;

export default function AffiliateApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('affiliate');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    description: '',
    website: '',
    promotionPlan: '',
    contactEmail: user?.email || '',
    termsAccepted: false,
  });

  // Get terms in current language
  const getTerms = () => {
    return i18n.language === 'sv' ? AFFILIATE_TERMS_SV : AFFILIATE_TERMS;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      showToast(t('application.messages.termsRequired'), 'error');
      return;
    }

    setLoading(true);

    try {
      // Create organization with affiliate application
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          description: formData.description,
          owner_id: user.id,
          is_affiliate: true,
          affiliate_status: 'pending',
          affiliate_active: false,
          contact_email: formData.contactEmail,
          payment_email: formData.contactEmail,
          application_website: formData.website,
          application_promotion_plan: formData.promotionPlan,
          application_submitted_at: new Date().toISOString(),
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      showToast(t('application.messages.success'), 'success');
      navigate('/affiliate');
    } catch (error) {
      console.error('Error submitting application:', error);
      showToast(error.message || t('application.messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('application.title')}</h1>
          <p className="text-gray-600">
            {t('application.subtitle')}
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">{t('application.benefits.title')}</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span><strong>€2</strong> {t('application.benefits.perSignup')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span><strong>50%</strong> {t('application.benefits.commissionFirst')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{t('application.benefits.cookieTracking')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{t('application.benefits.monthlyPayouts')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{t('application.benefits.realtimeDashboard')}</span>
            </li>
          </ul>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('application.form.orgName.label')} *
              </label>
              <input
                type="text"
                required
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                placeholder={t('application.form.orgName.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('application.form.description.label')} *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('application.form.description.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('application.form.website.label')} *
              </label>
              <input
                type="url"
                required
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder={t('application.form.website.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('application.form.website.help')}
              </p>
            </div>

            {/* Promotion Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('application.form.promotionPlan.label')} *
              </label>
              <textarea
                required
                rows={5}
                value={formData.promotionPlan}
                onChange={(e) => setFormData({ ...formData, promotionPlan: e.target.value })}
                placeholder={t('application.form.promotionPlan.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('application.form.email.label')} *
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Prohibited Content Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>{t('application.form.prohibitedWarning.title')}</strong> {t('application.form.prohibitedWarning.message')}
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 flex-1">
                  {t('application.form.terms.label')}{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t('application.form.terms.link')}
                  </button>
                  {' '}{t('application.form.terms.required')}
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-sm hover:bg-gray-200 font-medium"
              >
                {t('application.buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !formData.termsAccepted}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('application.buttons.submitting') : t('application.buttons.submit')}
              </button>
            </div>
          </form>
        </div>

        {/* Expected Timeline */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{t('application.timeline.review')}</p>
          <p>{t('application.timeline.notification')}</p>
          <p>{t('application.timeline.access')}</p>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t('application.termsModal.title')}</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-ul:list-disc prose-ol:list-decimal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {getTerms()}
                </ReactMarkdown>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setFormData({ ...formData, termsAccepted: true });
                  setShowTerms(false);
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium"
              >
                {t('application.buttons.acceptTerms')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
