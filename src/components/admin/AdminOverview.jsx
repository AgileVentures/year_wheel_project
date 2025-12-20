import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminDashboardStats from './AdminDashboardStats';
import AdminEmailStats from './AdminEmailStats';
import {
  getQuizLeadsStats,
  getNewsletterStats,
} from '../../services/adminService';

export default function AdminOverview() {
  const { t } = useTranslation(['admin', 'common']);
  const [quizLeadsStats, setQuizLeadsStats] = useState(null);
  const [newsletterStats, setNewsletterStats] = useState(null);

  useEffect(() => {
    loadEmailStats();
  }, []);

  const loadEmailStats = async () => {
    try {
      const [quizStats, emailStats] = await Promise.all([
        getQuizLeadsStats(),
        getNewsletterStats(),
      ]);
      setQuizLeadsStats(quizStats);
      setNewsletterStats(emailStats);
    } catch (error) {
      console.error('Error loading email stats:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('overview')}</h2>
        <p className="text-gray-600 text-sm">Översikt över plattformens nyckeltal</p>
      </div>
      <AdminDashboardStats />
      <AdminEmailStats quizLeadsStats={quizLeadsStats} newsletterStats={newsletterStats} />
    </div>
  );
}
