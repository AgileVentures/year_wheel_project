import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../utils/dialogs';
import { Save, AlertCircle, CheckCircle, Building2, CreditCard, FileText, MapPin } from 'lucide-react';

export default function OrganizationSettings({ organization, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_email: '',
    payment_email: '',
    payment_method: 'bank_transfer',
    bank_account_holder: '',
    iban: '',
    bic: '',
    bank_name: '',
    tax_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'SE', // Default to Sweden
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        description: organization.description || '',
        contact_email: organization.contact_email || '',
        payment_email: organization.payment_email || '',
        payment_method: organization.payment_method || 'bank_transfer',
        bank_account_holder: organization.bank_account_holder || '',
        iban: organization.iban || '',
        bic: organization.bic || '',
        bank_name: organization.bank_name || '',
        tax_id: organization.tax_id || '',
        address_line1: organization.address_line1 || '',
        address_line2: organization.address_line2 || '',
        city: organization.city || '',
        postal_code: organization.postal_code || '',
        country: organization.country || 'SE',
      });
    }
  }, [organization]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update(formData)
        .eq('id', organization.id);

      if (error) throw error;

      showToast('Organization settings updated successfully', 'success');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating organization:', error);
      showToast('Failed to update settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatIBAN = (value) => {
    // Remove spaces and convert to uppercase
    const clean = value.replace(/\s/g, '').toUpperCase();
    // Add space every 4 characters
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  };

  const handleIBANChange = (e) => {
    const formatted = formatIBAN(e.target.value);
    setFormData({ ...formData, iban: formatted });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Payment Verification Status */}
        {organization?.payment_details_verified ? (
          <div className="bg-green-50 border border-green-200 rounded-sm p-4 flex items-start gap-3">
            <CheckCircle className="text-green-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-green-900">Payment Details Verified</h4>
              <p className="text-sm text-green-700 mt-1">
                Your payment information has been verified by our team. Commissions will be paid to these details.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-yellow-900">Payment Details Pending Verification</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please complete all payment information below. Our team will verify your details before processing payments.
              </p>
            </div>
          </div>
        )}

        {/* Organization Info */}
        <div className="bg-white rounded-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={20} className="text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Organization Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Notification Email *
              </label>
              <input
                type="email"
                value={formData.payment_email}
                onChange={(e) => setFormData({ ...formData, payment_email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Where we'll send payment confirmations</p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bank_transfer">Bank Transfer (SEPA)</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.payment_method === 'bank_transfer' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.bank_account_holder}
                    onChange={(e) => setFormData({ ...formData, bank_account_holder: e.target.value })}
                    required={formData.payment_method === 'bank_transfer'}
                    placeholder="Full name or company name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IBAN *
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={handleIBANChange}
                    required={formData.payment_method === 'bank_transfer'}
                    placeholder="SE00 0000 0000 0000 0000 0000"
                    maxLength={34}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">International Bank Account Number</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BIC/SWIFT *
                  </label>
                  <input
                    type="text"
                    value={formData.bic}
                    onChange={(e) => setFormData({ ...formData, bic: e.target.value.toUpperCase() })}
                    required={formData.payment_method === 'bank_transfer'}
                    placeholder="AAAAAABBCCC"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bank Identifier Code</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g., Swedbank, SEB, Nordea"
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tax & Billing Address */}
        <div className="bg-white rounded-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Tax & Billing Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT/Tax ID
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="SE123456789001 or equivalent"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">For EU VAT or local tax identification</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="Street address"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Apartment, suite, etc. (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SE">Sweden</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="DE">Germany</option>
                <option value="UK">United Kingdom</option>
                <option value="US">United States</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
