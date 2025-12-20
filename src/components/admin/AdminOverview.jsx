import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminStats from './AdminStats';
import AdminEmailStats from './AdminEmailStats';
import {
  getAdminStats,
  getUserGrowthData,
  getWheelGrowthData,
  getSubscriptionStats,
  getQuizLeadsStats,
  getNewsletterStats,
} from '../../services/adminService';

export default function AdminOverview() {
  const { t } = useTranslation(['admin', 'common']);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [quizLeadsStats, setQuizLeadsStats] = useState(null);
  const [newsletterStats, setNewsletterStats] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, subStats, quizStats, emailStats] = await Promise.all([
        getAdminStats(),
        getSubscriptionStats(),
        getQuizLeadsStats(),
        getNewsletterStats(),
      ]);
      
      setStats(statsData);
      setSubscriptionStats(subStats);
      setQuizLeadsStats(quizStats);
      setNewsletterStats(emailStats);
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Laddar statistik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('overview')}</h2>
        <p className="text-gray-600 text-sm">Översikt över plattformens nyckeltal</p>
      </div>
      <AdminStats stats={stats} subscriptionStats={subscriptionStats} />
      <AdminEmailStats quizLeadsStats={quizLeadsStats} newsletterStats={newsletterStats} />
    </div>
  );
}
