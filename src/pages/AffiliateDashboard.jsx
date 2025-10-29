// AffiliateDashboard.jsx
// Dashboard for affiliate partners to view their performance and manage links

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../utils/dialogs';
import OrganizationSettings from '../components/affiliate/OrganizationSettings';
import UTMLinkBuilder from '../components/affiliate/UTMLinkBuilder';

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalSignups: 0,
    totalUpgrades: 0,
    pendingCommission: 0,
    approvedCommission: 0,
    paidCommission: 0,
  });
  const [links, setLinks] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [newLink, setNewLink] = useState({ code: '', name: '', target_url: '/' });
  const [generatingCode, setGeneratingCode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'links', 'commissions', 'settings'
  const [showUTMBuilder, setShowUTMBuilder] = useState(false);
  const [selectedLinkForUTM, setSelectedLinkForUTM] = useState(null);

  useEffect(() => {
    loadAffiliateData();
  }, [user]);

  const loadAffiliateData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's affiliate organization
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', user.id)
        .single();

      if (memberError) throw memberError;

      if (!memberData?.organizations?.is_affiliate) {
        showToast('You are not a member of an affiliate organization', 'error');
        navigate('/dashboard');
        return;
      }

      setOrganization(memberData.organizations);

      // Check application status - only load data if approved
      if (memberData.organizations.affiliate_status === 'approved') {
        // Load stats
        await loadStats(memberData.organization_id);

        // Load links
        await loadLinks(memberData.organization_id);

        // Load commissions
        await loadCommissions(memberData.organization_id);
      }

    } catch (error) {
      console.error('Error loading affiliate data:', error);
      showToast('Failed to load affiliate data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (orgId) => {
    // Get all conversions for this organization
    const { data: conversions, error } = await supabase
      .from('affiliate_conversions')
      .select('*')
      .eq('organization_id', orgId);

    if (error) throw error;

    // Calculate stats
    const totalClicks = conversions.filter(c => c.clicked_at).length;
    const totalSignups = conversions.filter(c => c.signed_up_at).length;
    const totalUpgrades = conversions.filter(c => c.upgraded_at).length;

    // Get commission totals
    const { data: commissionsData, error: commError } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount, status')
      .eq('organization_id', orgId);

    if (commError) throw commError;

    const pendingCommission = commissionsData
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

    const approvedCommission = commissionsData
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

    const paidCommission = commissionsData
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

    setStats({
      totalClicks,
      totalSignups,
      totalUpgrades,
      pendingCommission,
      approvedCommission,
      paidCommission,
    });
  };

  const loadLinks = async (orgId) => {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setLinks(data || []);
  };

  const loadCommissions = async (orgId) => {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select(`
        *,
        affiliate_conversions(user_id, signed_up_at, upgraded_at, subscription_plan)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setCommissions(data || []);
  };

  const generateUniqueCode = async () => {
    if (!organization) return;

    setGeneratingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/generate-affiliate-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            organizationId: organization.id,
            baseName: '', // Empty to get fully random code
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate code');
      }

      const { code } = await response.json();
      setNewLink(prev => ({ ...prev, code }));
    } catch (error) {
      console.error('Error generating code:', error);
      showToast('Failed to generate unique code', 'error');
    } finally {
      setGeneratingCode(false);
    }
  };

  const openCreateLinkModal = async () => {
    setShowCreateLinkModal(true);
    setNewLink({ code: '', name: '', target_url: '/' });
    // Auto-generate code when modal opens
    await generateUniqueCode();
  };

  const createLink = async () => {
    if (!organization || !newLink.name || !newLink.code) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      // Use the already generated code
      const { data, error } = await supabase
        .from('affiliate_links')
        .insert({
          organization_id: organization.id,
          code: newLink.code,
          name: newLink.name,
          target_url: newLink.target_url,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const suggestedUrl = `${window.location.origin}/?ref=${newLink.code}`;
      setLinks([data, ...links]);
      setShowCreateLinkModal(false);
      setNewLink({ code: '', name: '', target_url: '/' });
      showToast(`Link created! URL: ${suggestedUrl}`, 'success');
    } catch (error) {
      console.error('Error creating link:', error);
      showToast(error.message || 'Failed to create link', 'error');
    }
  };

  const regenerateCode = async () => {
    await generateUniqueCode();
    showToast('New code generated', 'success');
  };

  const toggleLinkStatus = async (linkId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('affiliate_links')
        .update({ is_active: !currentStatus })
        .eq('id', linkId);

      if (error) throw error;

      setLinks(links.map(link => 
        link.id === linkId ? { ...link, is_active: !currentStatus } : link
      ));
      showToast(`Link ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
    } catch (error) {
      console.error('Error toggling link:', error);
      showToast('Failed to update link', 'error');
    }
  };

  const deleteLink = async (linkId, linkName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${linkName}"?\n\nThis will permanently remove the link, but all tracking data and commissions will be preserved.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('affiliate_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      setLinks(links.filter(link => link.id !== linkId));
      showToast('Link deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting link:', error);
      showToast('Failed to delete link', 'error');
    }
  };

  const copyLinkToClipboard = (code) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const conversionRate = stats.totalClicks > 0 
    ? ((stats.totalSignups / stats.totalClicks) * 100).toFixed(1)
    : '0.0';

  const upgradeRate = stats.totalSignups > 0
    ? ((stats.totalUpgrades / stats.totalSignups) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">{organization?.name}</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Application Status Banners */}
        {organization?.affiliate_status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900">Application Under Review</h3>
                <p className="mt-2 text-yellow-800">
                  Thank you for applying to the YearWheel Affiliate Program! Your application is currently being reviewed by our team. 
                  You will receive an email notification within <strong>24 hours</strong> with the decision.
                </p>
                <p className="mt-3 text-sm text-yellow-700">
                  Submitted: {new Date(organization.application_submitted_at).toLocaleDateString('sv-SE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {organization?.affiliate_status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900">Application Not Approved</h3>
                <p className="mt-2 text-red-800">
                  Unfortunately, your affiliate application was not approved at this time.
                </p>
                {organization.application_rejection_reason && (
                  <div className="mt-3 p-3 bg-red-100 rounded text-sm text-red-900">
                    <strong>Reason:</strong> {organization.application_rejection_reason}
                  </div>
                )}
                <p className="mt-3 text-sm text-red-700">
                  You may reapply after 90 days. For questions, please contact affiliates@yearwheel.com
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Only show tabs and content if approved */}
        {organization?.affiliate_status === 'approved' && (
          <>
        {/* Tabs */}
        <div className="bg-white rounded-sm shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('links')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'links'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Affiliate Links ({links.length})
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'commissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Commissions ({commissions.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 rounded-sm p-6">
                    <div className="text-sm font-medium text-blue-600 mb-2">Total Clicks</div>
                    <div className="text-3xl font-bold text-blue-900">{stats.totalClicks}</div>
                  </div>
                  <div className="bg-green-50 rounded-sm p-6">
                    <div className="text-sm font-medium text-green-600 mb-2">Sign-ups</div>
                    <div className="text-3xl font-bold text-green-900">{stats.totalSignups}</div>
                    <div className="text-xs text-green-600 mt-1">{conversionRate}% conversion</div>
                  </div>
                  <div className="bg-purple-50 rounded-sm p-6">
                    <div className="text-sm font-medium text-purple-600 mb-2">Upgrades</div>
                    <div className="text-3xl font-bold text-purple-900">{stats.totalUpgrades}</div>
                    <div className="text-xs text-purple-600 mt-1">{upgradeRate}% upgrade rate</div>
                  </div>
                  <div className="bg-yellow-50 rounded-sm p-6">
                    <div className="text-sm font-medium text-yellow-600 mb-2">Total Earned</div>
                    <div className="text-3xl font-bold text-yellow-900">
                      {formatCurrency(stats.pendingCommission + stats.approvedCommission + stats.paidCommission)}
                    </div>
                  </div>
                </div>

                {/* Commission Breakdown */}
                <div className="bg-gray-50 rounded-sm p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Pending Review</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pendingCommission)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Approved</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.approvedCommission)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Paid Out</div>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.paidCommission)}</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setActiveTab('links');
                        openCreateLinkModal();
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium"
                    >
                      Create New Link
                    </button>
                    <button
                      onClick={() => setActiveTab('commissions')}
                      className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 font-medium"
                    >
                      View All Commissions
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Your Affiliate Links</h3>
                  <button
                    onClick={openCreateLinkModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium text-sm"
                  >
                    + Create New Link
                  </button>
                </div>

                {links.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No affiliate links yet</p>
                    <button
                      onClick={openCreateLinkModal}
                      className="px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium"
                    >
                      Create Your First Link
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div key={link.id} className="bg-white border border-gray-200 rounded-sm p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{link.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                                {window.location.origin}{link.target_url}?ref={link.code}
                              </code>
                              <button
                                onClick={() => copyLinkToClipboard(link.code)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              link.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {link.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedLinkForUTM(link);
                                setShowUTMBuilder(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                            >
                              UTM Builder
                            </button>
                            <button
                              onClick={() => toggleLinkStatus(link.id, link.is_active)}
                              className="text-gray-600 hover:text-gray-900 text-sm px-2 py-1"
                            >
                              {link.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteLink(link.id, link.name)}
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm text-gray-600 mt-3">
                          <div>
                            <span className="font-medium">{link.clicks}</span> clicks
                          </div>
                          <div>
                            Created {formatDate(link.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Commissions Tab */}
            {activeTab === 'commissions' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Commission History</h3>
                
                {commissions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No commissions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {commissions.map((commission) => (
                          <tr key={commission.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(commission.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {commission.commission_type === 'free_signup' ? 'Free Sign-up' : 'Premium Upgrade'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(commission.commission_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded ${
                                commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                commission.status === 'approved' ? 'bg-green-100 text-green-800' :
                                commission.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {commission.affiliate_conversions?.subscription_plan && (
                                <span>{commission.affiliate_conversions.subscription_plan} plan</span>
                              )}
                              {commission.paid_at && (
                                <span className="ml-2 text-xs">
                                  (Paid {formatDate(commission.paid_at)})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <OrganizationSettings 
                organization={organization} 
                onUpdate={loadAffiliateData}
              />
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* Create Link Modal */}
      {showCreateLinkModal && organization?.affiliate_status === 'approved' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Affiliate Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Name *
                </label>
                <input
                  type="text"
                  value={newLink.name}
                  onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  placeholder="e.g., Summer Campaign 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLink.code}
                    readOnly
                    disabled={generatingCode}
                    placeholder={generatingCode ? "Generating..." : "Auto-generated code"}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={regenerateCode}
                    disabled={generatingCode}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-sm hover:bg-gray-200 font-medium text-sm disabled:opacity-50"
                  >
                    {generatingCode ? '...' : '🔄'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Will be used as: ?ref={newLink.code || 'your-code'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Page
                </label>
                <select
                  value={newLink.target_url}
                  onChange={(e) => setNewLink({ ...newLink, target_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="/">Landing Page</option>
                  <option value="/pricing">Pricing Page</option>
                  <option value="/hr-planering">HR Planning Page</option>
                  <option value="/marknadsplanering">Marketing Planning Page</option>
                  <option value="/skola-och-utbildning">School & Education Page</option>
                  <option value="/projektplanering">Project Planning Page</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createLink}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium"
              >
                Create Link
              </button>
              <button
                onClick={() => {
                  setShowCreateLinkModal(false);
                  setNewLink({ code: '', name: '', target_url: '/' });
                }}
                className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UTM Link Builder Modal */}
      {showUTMBuilder && selectedLinkForUTM && (
        <UTMLinkBuilder
          baseUrl={`${window.location.origin}${selectedLinkForUTM.target_url}`}
          refCode={selectedLinkForUTM.code}
          onClose={() => {
            setShowUTMBuilder(false);
            setSelectedLinkForUTM(null);
          }}
        />
      )}
    </div>
  );
}
