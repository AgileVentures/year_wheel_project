import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { submitNPSResponse, recordNPSShown } from '../services/npsService';

/**
 * NPSModal Component
 * 
 * Displays Net Promoter Score (NPS) survey to active users
 * Collects score (0-10) and optional comment
 * 
 * @param {Function} onClose - Close callback
 * @param {Function} onSubmit - Submit callback (optional)
 */
export default function NPSModal({ onClose, onSubmit }) {
  const { t } = useTranslation(['nps', 'common']);
  const [selectedScore, setSelectedScore] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScoreClick = (score) => {
    setSelectedScore(score);
    setError('');
  };

  const handleSubmit = async () => {
    if (selectedScore === null) {
      setError(t('nps:pleaseSelectScore'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await submitNPSResponse(selectedScore, comment);
      
      if (onSubmit) {
        onSubmit(selectedScore, comment);
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting NPS:', err);
      setError(t('nps:submitError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    // Record that modal was shown (dismissed without submission)
    await recordNPSShown();
    onClose();
  };

  const getScoreColor = (score) => {
    if (score <= 6) return 'bg-red-500 hover:bg-red-600';
    if (score <= 8) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getScoreLabel = () => {
    if (selectedScore === null) return '';
    if (selectedScore <= 6) return t('nps:detractor');
    if (selectedScore <= 8) return t('nps:passive');
    return t('nps:promoter');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('nps:title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('nps:subtitle')}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label={t('common:close')}
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Question */}
          <div className="mb-6">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {t('nps:question')}
            </p>
            <p className="text-sm text-gray-600">
              {t('nps:description')}
            </p>
          </div>

          {/* Score Buttons */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => handleScoreClick(score)}
                  className={`
                    w-12 h-12 rounded-sm font-bold text-white transition-all
                    ${selectedScore === score 
                      ? `${getScoreColor(score)} ring-4 ring-offset-2 ring-gray-900` 
                      : 'bg-gray-300 hover:bg-gray-400'}
                  `}
                  aria-label={`${t('nps:score')} ${score}`}
                >
                  {score}
                </button>
              ))}
            </div>
            
            {/* Score Labels */}
            <div className="flex justify-between text-xs text-gray-600 px-1">
              <span>{t('nps:notLikely')}</span>
              <span>{t('nps:veryLikely')}</span>
            </div>

            {/* Category Label */}
            {selectedScore !== null && (
              <div className="mt-3 text-center">
                <span className="inline-block px-4 py-2 rounded-full bg-gray-100 text-gray-800 font-medium">
                  {getScoreLabel()}
                </span>
              </div>
            )}
          </div>

          {/* Comment (optional) */}
          <div className="mb-4">
            <label htmlFor="nps-comment" className="block text-sm font-medium text-gray-900 mb-2">
              {t('nps:commentLabel')}
            </label>
            <textarea
              id="nps-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('nps:commentPlaceholder')}
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/1000 {t('nps:characters')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors font-medium"
            disabled={loading}
          >
            {t('nps:maybeLater')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedScore === null}
            className="px-6 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {t('common:submitting')}
              </>
            ) : (
              <>
                <Send size={16} />
                {t('nps:submit')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
