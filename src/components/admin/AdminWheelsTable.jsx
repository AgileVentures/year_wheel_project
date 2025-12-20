import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, ExternalLink, Users, Globe, Star, Calendar, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminWheelsTable({ 
  wheels = [], 
  currentPage, 
  totalPages, 
  searchQuery, 
  onSearch, 
  onSort, 
  onPageChange,
  loading = false
}) {
  const { t } = useTranslation(['admin']);
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('sv-SE');
  };

  const handleSort = (column) => {
    const newOrder = sortColumn === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortColumn(column);
    setSortOrder(newOrder);
    onSort?.(column, newOrder);
  };

  const handlePreview = (wheelId) => {
    // Open in new tab for preview
    window.open(`/wheel/${wheelId}`, '_blank');
  };

  const SortHeader = ({ column, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <span className="text-gray-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Alla hjul</h2>
          <p className="text-sm text-gray-500 mt-1">
            Totalt {wheels.length > 0 ? `${(currentPage - 1) * 50 + 1}-${Math.min(currentPage * 50, wheels.length)} av` : ''} alla hjul i systemet
          </p>
        </div>
        
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sök på titel..."
            value={searchQuery}
            onChange={(e) => onSearch?.(e)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader column="title">Titel</SortHeader>
                <SortHeader column="year">År</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ägare
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sidor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <SortHeader column="created_at">Skapad</SortHeader>
                <SortHeader column="updated_at">Uppdaterad</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                      <p className="text-gray-500 text-sm">Laddar hjul...</p>
                    </div>
                  </td>
                </tr>
              ) : wheels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    {searchQuery ? 'Inga hjul hittades för sökningen' : 'Inga hjul i systemet'}
                  </td>
                </tr>
              ) : (
                wheels.map((wheel) => (
                  <tr key={wheel.id} className="hover:bg-gray-50">
                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate max-w-[200px]" title={wheel.title}>
                          {wheel.title || 'Namnlöst hjul'}
                        </span>
                      </div>
                    </td>
                    
                    {/* Year */}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {wheel.year || '-'}
                      </span>
                    </td>
                    
                    {/* Owner */}
                    <td className="px-4 py-3">
                      {wheel.owner ? (
                        <div className="text-sm">
                          <div className="text-gray-900 truncate max-w-[150px]" title={wheel.owner.full_name || wheel.owner.email}>
                            {wheel.owner.full_name || wheel.owner.email?.split('@')[0]}
                          </div>
                          <div className="text-gray-500 text-xs truncate max-w-[150px]" title={wheel.owner.email}>
                            {wheel.owner.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    
                    {/* Team */}
                    <td className="px-4 py-3">
                      {wheel.team ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          <Users size={12} />
                          {wheel.team.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    
                    {/* Page count */}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="flex items-center gap-1">
                        <FileText size={14} className="text-gray-400" />
                        {wheel.page_count || 0}
                      </span>
                    </td>
                    
                    {/* Status badges */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {wheel.is_public && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                            <Globe size={12} />
                            Publik
                          </span>
                        )}
                        {wheel.is_template && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                            <Star size={12} />
                            Mall
                          </span>
                        )}
                        {wheel.show_on_landing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                            Landing
                          </span>
                        )}
                        {!wheel.is_public && !wheel.is_template && (
                          <span className="text-gray-400 text-xs">Privat</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Created */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span title={formatDate(wheel.created_at)}>
                        {formatDate(wheel.created_at)}
                      </span>
                    </td>
                    
                    {/* Updated */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span title={formatDate(wheel.updated_at)}>
                        {formatRelativeTime(wheel.updated_at)}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handlePreview(wheel.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        title="Förhandsgranska hjul"
                      >
                        <ExternalLink size={14} />
                        Visa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Sida {currentPage} av {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Föregående
              </button>
              <button
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Nästa
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
