import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, TrendingUp, Users, ThumbsUp, Minus, ThumbsDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getNPSResponses, getNPSStats } from '../../services/npsService';
import WheelLoader from '../WheelLoader';

export default function AdminNPSPage() {
  const { t } = useTranslation(['admin', 'common', 'nps']);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [responsesData, statsData] = await Promise.all([
        getNPSResponses({ page: currentPage, limit: 50 }),
        getNPSStats()
      ]);

      setResponses(responsesData.responses);
      setTotalPages(responsesData.totalPages);
      setTotalCount(responsesData.totalCount);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading NPS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreBadge = (score) => {
    if (score >= 9) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
          <ThumbsUp size={14} />
          {score}
        </span>
      );
    }
    if (score >= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
          <Minus size={14} />
          {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 font-medium">
        <ThumbsDown size={14} />
        {score}
      </span>
    );
  };

  const getScoreCategory = (score) => {
    if (score >= 9) return t('nps:promoter');
    if (score >= 7) return t('nps:passive');
    return t('nps:detractor');
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <WheelLoader size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">NPS Feedback</h2>
        <p className="text-gray-600 mt-1">Net Promoter Score responses from users</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NPS Score */}
          <div className="bg-white border border-gray-200 rounded-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={24} className="text-blue-600" />
              <span className={`text-3xl font-bold ${
                stats.npsScore >= 50 ? 'text-green-600' :
                stats.npsScore >= 0 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {stats.npsScore}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">NPS Score</h3>
            <p className="text-xs text-gray-500 mt-1">
              {stats.npsScore >= 50 ? 'Excellent' :
               stats.npsScore >= 30 ? 'Great' :
               stats.npsScore >= 0 ? 'Good' :
               'Needs Improvement'}
            </p>
          </div>

          {/* Total Responses */}
          <div className="bg-white border border-gray-200 rounded-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Users size={24} className="text-gray-600" />
              <span className="text-3xl font-bold text-gray-900">
                {stats.totalResponses}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total Responses</h3>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {stats.averageScore}/10
            </p>
          </div>

          {/* Promoters */}
          <div className="bg-white border border-gray-200 rounded-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <ThumbsUp size={24} className="text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {stats.promoterPercentage}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Promoters (9-10)</h3>
            <p className="text-xs text-gray-500 mt-1">
              {stats.promoters} users
            </p>
          </div>

          {/* Detractors */}
          <div className="bg-white border border-gray-200 rounded-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <ThumbsDown size={24} className="text-red-600" />
              <span className="text-3xl font-bold text-red-600">
                {stats.detractorPercentage}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Detractors (0-6)</h3>
            <p className="text-xs text-gray-500 mt-1">
              {stats.detractors} users
            </p>
          </div>
        </div>
      )}

      {/* Responses Table */}
      <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Comment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {responses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No NPS responses yet</p>
                    <p className="text-sm mt-1">Responses will appear here once users submit feedback</p>
                  </td>
                </tr>
              ) : (
                responses.map((response) => (
                  <tr key={response.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(response.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {response.profiles?.full_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {response.profiles?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getScoreBadge(response.score)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getScoreCategory(response.score)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      {response.comment ? (
                        <div className="line-clamp-2" title={response.comment}>
                          {response.comment}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No comment</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {responses.length} of {totalCount} responses
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
