import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Users,
  Link as LinkIcon,
  ExternalLink,
  Search,
  Filter,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showConfirmDialog, showToast } from '../../utils/dialogs';
import PromptDialog from '../PromptDialog';

export default function AdminAffiliates() {
  const { t, i18n } = useTranslation(['admin', 'common', 'affiliate']);
  const [activeSubTab, setActiveSubTab] = useState('organizations');
  const [loading, setLoading] = useState(true);
  const [expandedOrgId, setExpandedOrgId] = useState(null);
  
  // Format date according to current language
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = i18n.language === 'sv' ? 'sv-SE' : 'en-US';
    return date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = i18n.language === 'sv' ? 'sv-SE' : 'en-US';
    return date.toLocaleString(locale, { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Prompt dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectOrgData, setRejectOrgData] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetOrgData, setResetOrgData] = useState(null);
  
  // Organizations data
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Commissions data
  const [commissions, setCommissions] = useState([]);
  const [commissionStats, setCommissionStats] = useState(null);
  
  // Conversions data
  const [conversions, setConversions] = useState([]);
  const [conversionStats, setConversionStats] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadAffiliateData();
  }, [activeSubTab, statusFilter]);

  const loadAffiliateData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'organizations') {
        await loadOrganizations();
      } else if (activeSubTab === 'commissions') {
        await loadCommissions();
      } else if (activeSubTab === 'conversions') {
        await loadConversions();
      }
    } catch (error) {
      console.error('Error loading affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(count),
        affiliate_links(count),
        affiliate_conversions(count),
        affiliate_commissions(sum:commission_amount)
      `)
      .eq('is_affiliate', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading organizations:', error);
      return;
    }

    setOrganizations(data || []);
  };

  const loadCommissions = async () => {
    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        organization:organizations(name, contact_email),
        conversion:affiliate_conversions(
          user_id,
          conversion_type,
          subscription_plan,
          signed_up_at,
          upgraded_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading commissions:', error);
      return;
    }

    setCommissions(data || []);

    // Calculate stats
    const stats = {
      total: data?.length || 0,
      pending: data?.filter(c => c.status === 'pending').length || 0,
      approved: data?.filter(c => c.status === 'approved').length || 0,
      paid: data?.filter(c => c.status === 'paid').length || 0,
      totalAmount: data?.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0,
      pendingAmount: data?.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0,
    };
    setCommissionStats(stats);
  };

  const loadConversions = async () => {
    const { data, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        *,
        organization:organizations(name),
        affiliate_link:affiliate_links(code, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading conversions:', error);
      return;
    }

    setConversions(data || []);

    // Calculate stats
    const stats = {
      total: data?.length || 0,
      clicks: data?.filter(c => c.clicked_at).length || 0,
      signups: data?.filter(c => c.signed_up_at).length || 0,
      upgrades: data?.filter(c => c.upgraded_at).length || 0,
      conversionRate: data?.filter(c => c.clicked_at).length > 0
        ? ((data?.filter(c => c.signed_up_at).length / data?.filter(c => c.clicked_at).length) * 100).toFixed(1)
        : 0,
    };
    setConversionStats(stats);
  };

  const updateCommissionStatus = async (commissionId, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'paid') {
      updates.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('affiliate_commissions')
      .update(updates)
      .eq('id', commissionId);

    if (error) {
      console.error('Error updating commission:', error);
      alert('Failed to update commission status');
      return;
    }

    loadCommissions();
  };

  const toggleAffiliateStatus = async (orgId, currentStatus) => {
    const { error } = await supabase
      .from('organizations')
      .update({ affiliate_active: !currentStatus })
      .eq('id', orgId);

    if (error) {
      console.error('Error toggling affiliate status:', error);
      showToast(t('affiliate:admin.dialogs.toggleStatus.error'), 'error');
      return;
    }

    loadOrganizations();
  };

  const verifyPaymentDetails = async (orgId, verified) => {
    const { error } = await supabase
      .from('organizations')
      .update({ payment_details_verified: verified })
      .eq('id', orgId);

    if (error) {
      console.error('Error verifying payment details:', error);
      showToast(t('affiliate:admin.dialogs.toggleStatus.error'), 'error');
      return;
    }

    const status = verified 
      ? t('affiliate:admin.dialogs.verifyPayment.verified') 
      : t('affiliate:admin.dialogs.verifyPayment.unverified');
    showToast(t('affiliate:admin.dialogs.verifyPayment.success', { status }), 'success');
    loadOrganizations();
  };

  const approveAffiliate = async (orgId, orgName) => {
    const confirmed = await showConfirmDialog({
      title: t('affiliate:admin.dialogs.approve.title'),
      message: t('affiliate:admin.dialogs.approve.message', { orgName }),
      confirmText: t('affiliate:admin.dialogs.approve.confirmText'),
      cancelText: t('common:cancel'),
      confirmButtonClass: 'bg-green-600 hover:bg-green-700 text-white'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc('approve_affiliate_application', {
        p_org_id: orgId,
        p_admin_id: (await supabase.auth.getUser()).data.user.id,
      });

      if (error) throw error;

      showToast(t('affiliate:admin.dialogs.approve.success', { orgName }), 'success');
      loadOrganizations();
    } catch (error) {
      console.error('Error approving affiliate:', error);
      showToast(`${t('affiliate:admin.dialogs.approve.error')}: ${error.message}`, 'error');
    }
  };

  const rejectAffiliate = (orgId, orgName) => {
    setRejectOrgData({ orgId, orgName });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason) => {
    if (!reason || reason.trim() === '') {
      showToast(t('affiliate:admin.dialogs.reject.reasonRequired'), 'error');
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_affiliate_application', {
        p_org_id: rejectOrgData.orgId,
        p_admin_id: (await supabase.auth.getUser()).data.user.id,
        p_reason: reason.trim(),
      });

      if (error) throw error;

      showToast(t('affiliate:admin.dialogs.reject.success'), 'success');
      setRejectDialogOpen(false);
      setRejectOrgData(null);
      loadOrganizations();
    } catch (error) {
      console.error('Error rejecting affiliate:', error);
      showToast(`${t('affiliate:admin.dialogs.reject.error')}: ${error.message}`, 'error');
    }
  };

  const resetAffiliate = (orgId, orgName) => {
    setResetOrgData({ orgId, orgName });
    setResetDialogOpen(true);
  };

  const handleResetConfirm = async (confirmText) => {
    if (confirmText !== 'RESET') {
      showToast(t('affiliate:admin.dialogs.reset.cancelled'), 'error');
      setResetDialogOpen(false);
      setResetOrgData(null);
      return;
    }

    try {
      // Delete in correct order (foreign key constraints)
      // 1. Delete commissions first (references conversions)
      const { error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .delete()
        .eq('organization_id', resetOrgData.orgId);

      if (commissionsError) throw commissionsError;

      // 2. Delete conversions (references links)
      const { error: conversionsError } = await supabase
        .from('affiliate_conversions')
        .delete()
        .eq('organization_id', resetOrgData.orgId);

      if (conversionsError) throw conversionsError;

      // 3. Delete links
      const { error: linksError } = await supabase
        .from('affiliate_links')
        .delete()
        .eq('organization_id', resetOrgData.orgId);

      if (linksError) throw linksError;

      showToast(t('affiliate:admin.dialogs.reset.success'), 'success');
      setResetDialogOpen(false);
      setResetOrgData(null);
      loadAffiliateData();
    } catch (error) {
      console.error('Error resetting affiliate:', error);
      showToast(`${t('affiliate:admin.dialogs.reset.error')}: ${error.message}`, 'error');
    }
  };

  if (loading && !organizations.length && !commissions.length && !conversions.length) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('affiliate:admin.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('organizations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'organizations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={16} className="inline mr-2" />
          {t('affiliate:admin.organizations')}
        </button>
        <button
          onClick={() => setActiveSubTab('commissions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'commissions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <DollarSign size={16} className="inline mr-2" />
          {t('affiliate:admin.commissions')}
        </button>
        <button
          onClick={() => setActiveSubTab('conversions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'conversions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={16} className="inline mr-2" />
          {t('affiliate:admin.conversions')}
        </button>
      </div>

      {/* Organizations Tab */}
      {activeSubTab === 'organizations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-sm shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('affiliate:admin.title')}</h3>
              
              {organizations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('affiliate:admin.noOrganizations')}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.organization')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.links')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.conversions')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.status.label')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.status.active')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common:labels.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {organizations.map((org) => (
                          <React.Fragment key={org.id}>
                            <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">{expandedOrgId === org.id ? '▼' : '▶'}</span>
                                  <div>
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                      {org.name}
                                      {org.payment_details_verified && (
                                        <CheckCircle size={14} className="text-green-600" title={t('affiliate:admin.tooltips.paymentVerified')} />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            <td className="px-4 py-4 text-sm text-gray-600">{org.affiliate_links?.[0]?.count || 0}</td>
                            <td className="px-4 py-4 text-sm text-gray-600">{org.affiliate_conversions?.[0]?.count || 0}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                org.affiliate_status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : org.affiliate_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {org.affiliate_status === 'approved' 
                                  ? `✓ ${t('affiliate:admin.status.approved')}` 
                                  : org.affiliate_status === 'pending' 
                                  ? `⏳ ${t('affiliate:admin.status.pending')}` 
                                  : `✗ ${t('affiliate:admin.status.rejected')}`}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                org.affiliate_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {org.affiliate_active ? t('affiliate:admin.status.active') : t('common:inactive')}
                              </span>
                            </td>
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-1">
                                {org.affiliate_status === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => approveAffiliate(org.id, org.name)}
                                      className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                                      title={t('affiliate:admin.actions.approve')}
                                    >
                                      <CheckCircle size={14} />
                                      {t('affiliate:admin.actions.approve')}
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      onClick={() => rejectAffiliate(org.id, org.name)}
                                      className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                                      title={t('affiliate:admin.actions.reject')}
                                    >
                                      <XCircle size={14} />
                                      {t('affiliate:admin.actions.reject')}
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => toggleAffiliateStatus(org.id, org.affiliate_active)}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    disabled={org.affiliate_status !== 'approved'}
                                    title={org.affiliate_status !== 'approved' ? t('affiliate:admin.dialogs.approve.message', { orgName: '' }) : ''}
                                  >
                                    {org.affiliate_active ? t('affiliate:admin.actions.deactivate') : t('affiliate:admin.actions.activate')}
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={() => resetAffiliate(org.id, org.name)}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                                    title={t('affiliate:admin.dialogs.reset.message', { orgName: org.name })}
                                  >
                                    {t('affiliate:admin.actions.reset')}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {expandedOrgId === org.id && (
                            <tr className="bg-gray-50">
                              <td colSpan="6" className="px-4 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Organization Info */}
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">{t('affiliate:admin.details.organizationInfo')}</h4>
                                    <dl className="space-y-2 text-sm">
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.website')}</dt>
                                        <dd className="font-medium text-gray-900">
                                          {org.website ? (
                                            <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                              {org.website}
                                            </a>
                                          ) : '-'}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.contactName')}</dt>
                                        <dd className="font-medium text-gray-900">{org.contact_name || '-'}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.contactEmail')}</dt>
                                        <dd className="font-medium text-gray-900">{org.contact_email || '-'}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.created')}</dt>
                                        <dd className="font-medium text-gray-900">{formatDate(org.created_at)}</dd>
                                      </div>
                                      {org.application_notes && (
                                        <div>
                                          <dt className="text-gray-500">{t('affiliate:admin.details.notes')}</dt>
                                          <dd className="font-medium text-gray-900 whitespace-pre-line">{org.application_notes}</dd>
                                        </div>
                                      )}
                                      {org.application_rejection_reason && (
                                        <div>
                                          <dt className="text-gray-500">{t('affiliate:admin.details.rejectionReason')}</dt>
                                          <dd className="font-medium text-red-600">{org.application_rejection_reason}</dd>
                                        </div>
                                      )}
                                    </dl>
                                  </div>

                                  {/* Application Details */}
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">{t('affiliate:admin.details.application')}</h4>
                                    <dl className="space-y-2 text-sm">
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.status.label')}</dt>
                                        <dd className="font-medium text-gray-900 flex items-center gap-2">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            org.affiliate_status === 'approved'
                                              ? 'bg-green-100 text-green-800'
                                              : org.affiliate_status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {org.affiliate_status === 'approved' 
                                              ? t('affiliate:admin.status.approved') 
                                              : org.affiliate_status === 'pending' 
                                              ? t('affiliate:admin.status.pending') 
                                              : t('affiliate:admin.status.rejected')}
                                          </span>
                                        </dd>
                                      </div>
                                      {org.application_promotion_plan && (
                                        <div>
                                          <dt className="text-gray-500">{t('affiliate:admin.details.promotionPlan')}</dt>
                                          <dd className="font-medium text-gray-900 whitespace-pre-line">{org.application_promotion_plan}</dd>
                                        </div>
                                      )}
                                      {org.application_submitted_at && (
                                        <div>
                                          <dt className="text-gray-500">{t('affiliate:admin.details.submitted')}</dt>
                                          <dd className="font-medium text-gray-900">{formatDateTime(org.application_submitted_at)}</dd>
                                        </div>
                                      )}
                                      {org.application_reviewed_at && (
                                        <div>
                                          <dt className="text-gray-500">{t('affiliate:admin.details.reviewed')}</dt>
                                          <dd className="font-medium text-gray-900">{formatDateTime(org.application_reviewed_at)}</dd>
                                        </div>
                                      )}
                                      {org.terms_accepted && (
                                        <div>
                                          <dt className="text-gray-500">{t('affiliate:admin.details.termsAccepted')}</dt>
                                          <dd className="font-medium text-green-600">✓ {formatDate(org.terms_accepted_at)}</dd>
                                        </div>
                                      )}
                                    </dl>
                                  </div>
                                  
                                  {/* Payment Details */}
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">{t('affiliate:admin.details.paymentDetails')}</h4>
                                    <dl className="space-y-2 text-sm">
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.paymentMethod')}</dt>
                                        <dd className="font-medium text-gray-900">{org.payment_method || t('affiliate:admin.details.notSet')}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.accountHolder')}</dt>
                                        <dd className="font-medium text-gray-900 font-mono">{org.bank_account_holder || t('affiliate:admin.details.notSet')}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">IBAN</dt>
                                        <dd className="font-medium text-gray-900 font-mono">{org.iban || t('affiliate:admin.details.notSet')}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">BIC/SWIFT</dt>
                                        <dd className="font-medium text-gray-900 font-mono">{org.bic || t('affiliate:admin.details.notSet')}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-gray-500">{t('affiliate:admin.details.bankName')}</dt>
                                        <dd className="font-medium text-gray-900">{org.bank_name || t('affiliate:admin.details.notSet')}</dd>
                                      </div>
                                    </dl>
                                  </div>
                                </div>
                                
                                <div className="mt-6">
                                  <h4 className="font-semibold text-gray-900 mb-3">{t('affiliate:admin.details.billing')}</h4>
                                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <dt className="text-gray-500">{t('affiliate:admin.details.taxId')}</dt>
                                      <dd className="font-medium text-gray-900">{org.tax_id || t('affiliate:admin.details.notSet')}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-500">{t('affiliate:admin.details.address')}</dt>
                                      <dd className="font-medium text-gray-900">
                                        {org.address_line1 && (
                                          <>
                                            {org.address_line1}<br />
                                            {org.address_line2 && <>{org.address_line2}<br /></>}
                                            {org.postal_code} {org.city}<br />
                                            {org.country}
                                          </>
                                        )}
                                        {!org.address_line1 && t('affiliate:admin.details.notSet')}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-500">{t('affiliate:admin.details.paymentEmail')}</dt>
                                      <dd className="font-medium text-gray-900">{org.payment_email || t('affiliate:admin.details.notSet')}</dd>
                                    </div>
                                  </dl>
                                  <div className="mt-4">
                                    <button
                                      onClick={() => verifyPaymentDetails(org.id, !org.payment_details_verified)}
                                      className={`text-sm px-4 py-2 rounded font-medium ${
                                        org.payment_details_verified
                                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                                      }`}
                                    >
                                      {org.payment_details_verified ? t('affiliate:admin.actions.unverify') : t('affiliate:admin.actions.verify')}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {organizations.map((org) => (
                    <div key={org.id} className="bg-white border border-gray-200 rounded-sm shadow-sm">
                      {/* Card Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium text-gray-900">
                              <span className="text-gray-600">{expandedOrgId === org.id ? '▼' : '▶'}</span>
                              {org.name}
                              {org.payment_details_verified && (
                                <CheckCircle size={14} className="text-green-600" title={t('affiliate:admin.tooltips.paymentVerified')} />
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{org.contact_email}</div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              org.affiliate_status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : org.affiliate_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {org.affiliate_status === 'approved' 
                                ? `✓ ${t('affiliate:admin.status.approved')}` 
                                : org.affiliate_status === 'pending' 
                                ? `⏳ ${t('affiliate:admin.status.pending')}` 
                                : `✗ ${t('affiliate:admin.status.rejected')}`}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              org.affiliate_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {org.affiliate_active ? t('affiliate:admin.status.active') : t('common:inactive')}
                            </span>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div>
                            <div className="text-gray-500">{t('affiliate:admin.links')}</div>
                            <div className="font-medium text-gray-900">{org.affiliate_links?.[0]?.count || 0}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">{t('affiliate:admin.conversions')}</div>
                            <div className="font-medium text-gray-900">{org.affiliate_conversions?.[0]?.count || 0}</div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          {org.affiliate_status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveAffiliate(org.id, org.name)}
                                className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                              >
                                <CheckCircle size={14} />
                                {t('affiliate:admin.actions.approve')}
                              </button>
                              <button
                                onClick={() => rejectAffiliate(org.id, org.name)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                              >
                                <XCircle size={14} />
                                {t('affiliate:admin.actions.reject')}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => toggleAffiliateStatus(org.id, org.affiliate_active)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            disabled={org.affiliate_status !== 'approved'}
                          >
                            {org.affiliate_active ? t('affiliate:admin.actions.deactivate') : t('affiliate:admin.actions.activate')}
                          </button>
                          <button
                            onClick={() => resetAffiliate(org.id, org.name)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            {t('affiliate:admin.actions.reset')}
                          </button>
                          <button
                            onClick={() => togglePaymentVerification(org.id, org.payment_details_verified)}
                            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                          >
                            {org.payment_details_verified ? t('affiliate:admin.actions.unverify') : t('affiliate:admin.actions.verify')}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedOrgId === org.id && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="space-y-3 text-sm">
                            {/* Organization Details */}
                            <div>
                              <div className="font-medium text-gray-900 mb-2">{t('affiliate:admin.details.organizationInfo')}</div>
                              <div className="space-y-1 text-gray-600">
                                <div><span className="font-medium">{t('affiliate:admin.details.website')}:</span> {org.website || '-'}</div>
                                <div><span className="font-medium">{t('affiliate:admin.details.contactName')}:</span> {org.contact_name || '-'}</div>
                                <div><span className="font-medium">{t('affiliate:admin.details.contactEmail')}:</span> {org.contact_email || '-'}</div>
                                <div><span className="font-medium">{t('affiliate:admin.details.created')}:</span> {formatDate(org.created_at)}</div>
                                {org.application_notes && (
                                  <div><span className="font-medium">{t('affiliate:admin.details.notes')}:</span> {org.application_notes}</div>
                                )}
                                {org.rejection_reason && (
                                  <div className="text-red-600"><span className="font-medium">{t('affiliate:admin.details.rejectionReason')}:</span> {org.rejection_reason}</div>
                                )}
                              </div>
                            </div>

                            {/* Payment Details */}
                            {org.payment_details && (
                              <div>
                                <div className="font-medium text-gray-900 mb-2">{t('affiliate:admin.details.paymentDetails')}</div>
                                <div className="space-y-1 text-gray-600">
                                  <div><span className="font-medium">{t('affiliate:admin.details.accountName')}:</span> {org.payment_details.accountName || '-'}</div>
                                  <div><span className="font-medium">{t('affiliate:admin.details.bank')}:</span> {org.payment_details.bankName || '-'}</div>
                                  <div><span className="font-medium">{t('affiliate:admin.details.iban')}:</span> {org.payment_details.iban || '-'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Commissions Tab */}
      {activeSubTab === 'commissions' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          {commissionStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600">{t('affiliate:admin.stats.totalCommissions')}</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{commissionStats.total}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-sm shadow-sm border border-yellow-200">
                <div className="text-sm text-yellow-700">{t('affiliate:admin.stats.pendingAmount')}</div>
                <div className="text-2xl font-bold text-yellow-900 mt-1">
                  €{commissionStats.pendingAmount.toFixed(2)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-sm shadow-sm border border-green-200">
                <div className="text-sm text-green-700">{t('affiliate:admin.stats.paidCount')}</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{commissionStats.paid}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-sm shadow-sm border border-blue-200">
                <div className="text-sm text-blue-700">{t('affiliate:admin.stats.totalAmount')}</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  €{commissionStats.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 text-sm rounded ${
                  statusFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('affiliate:admin.status.all')}
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 text-sm rounded ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('affiliate:admin.status.pending')}
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 text-sm rounded ${
                  statusFilter === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('affiliate:admin.status.approved')}
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-4 py-2 text-sm rounded ${
                  statusFilter === 'paid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('affiliate:admin.status.paid')}
              </button>
            </div>
          </div>

          {/* Commissions Table */}
          <div className="bg-white rounded-sm shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('affiliate:admin.tables.commissionPayouts')}</h3>
              
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('affiliate:admin.tables.noCommissions')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.organization')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.type')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.amount')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.status.label')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.date')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common:labels.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {commissions.map((commission) => (
                        <tr key={commission.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">{commission.organization?.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {commission.commission_type === 'free_signup' ? 'Free Signup' : 'Premium Upgrade'}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            €{parseFloat(commission.commission_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              commission.status === 'approved' ? 'bg-green-100 text-green-800' :
                              commission.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {formatDate(commission.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              {commission.status === 'pending' && (
                                <button
                                  onClick={() => updateCommissionStatus(commission.id, 'approved')}
                                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                                >
                                  Approve
                                </button>
                              )}
                              {commission.status === 'approved' && (
                                <button
                                  onClick={() => updateCommissionStatus(commission.id, 'paid')}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {commission.status !== 'cancelled' && commission.status !== 'paid' && (
                                <button
                                  onClick={() => updateCommissionStatus(commission.id, 'cancelled')}
                                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversions Tab */}
      {activeSubTab === 'conversions' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          {conversionStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600">{t('affiliate:admin.stats.totalConversions')}</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{conversionStats.total}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-sm shadow-sm border border-blue-200">
                <div className="text-sm text-blue-700">{t('affiliate:admin.stats.clicks')}</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{conversionStats.clicks}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-sm shadow-sm border border-green-200">
                <div className="text-sm text-green-700">{t('affiliate:admin.stats.signups')}</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{conversionStats.signups}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-sm shadow-sm border border-purple-200">
                <div className="text-sm text-purple-700">{t('affiliate:admin.stats.upgrades')}</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">{conversionStats.upgrades}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-sm shadow-sm border border-yellow-200">
                <div className="text-sm text-yellow-700">{t('affiliate:admin.stats.conversionRate')}</div>
                <div className="text-2xl font-bold text-yellow-900 mt-1">{conversionStats.conversionRate}%</div>
              </div>
            </div>
          )}

          {/* Conversions Table */}
          <div className="bg-white rounded-sm shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('affiliate:admin.tables.conversionTracking')}</h3>
              
              {conversions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('affiliate:admin.tables.noConversions')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.organization')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.tables.link')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.type')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.tables.landingPage')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.tables.utmSource')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('affiliate:admin.date')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {conversions.map((conversion) => (
                        <tr key={conversion.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">{conversion.organization?.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {conversion.affiliate_link?.name || conversion.affiliate_link?.code || 'N/A'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              conversion.conversion_type === 'premium_upgrade'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {conversion.conversion_type === 'premium_upgrade' ? t('affiliate:admin.tables.premium') : t('affiliate:admin.tables.free')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{conversion.landing_page || '/'}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{conversion.utm_source || 'N/A'}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {formatDate(conversion.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Reject Dialog */}
    <PromptDialog
      isOpen={rejectDialogOpen}
      onClose={() => {
        setRejectDialogOpen(false);
        setRejectOrgData(null);
      }}
      onConfirm={handleRejectConfirm}
      title={t('affiliate:admin.dialogs.reject.title')}
      message={rejectOrgData ? t('affiliate:admin.dialogs.reject.message', { orgName: rejectOrgData.orgName }) : ''}
      placeholder={t('affiliate:admin.dialogs.reject.placeholder')}
      confirmText={t('affiliate:admin.dialogs.reject.confirmText')}
      cancelText={t('affiliate:admin.dialogs.reject.cancelText')}
      confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      multiline={true}
      required={true}
    />

    {/* Reset Dialog */}
    <PromptDialog
      isOpen={resetDialogOpen}
      onClose={() => {
        setResetDialogOpen(false);
        setResetOrgData(null);
      }}
      onConfirm={handleResetConfirm}
      title={t('affiliate:admin.dialogs.reset.title')}
      message={resetOrgData ? t('affiliate:admin.dialogs.reset.message', { orgName: resetOrgData.orgName }) : ''}
      placeholder={t('affiliate:admin.dialogs.reset.confirmPlaceholder')}
      confirmText={t('affiliate:admin.dialogs.reset.confirmText')}
      cancelText={t('common:cancel')}
      confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      multiline={false}
      required={true}
    />
    </>
  );
}
