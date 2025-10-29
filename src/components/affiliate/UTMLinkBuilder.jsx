import { useState } from 'react';
import { Copy, Check, Plus, X } from 'lucide-react';

const UTM_PRESETS = [
  {
    name: 'Facebook Post',
    source: 'facebook',
    medium: 'social',
    campaign: '',
  },
  {
    name: 'LinkedIn Post',
    source: 'linkedin',
    medium: 'social',
    campaign: '',
  },
  {
    name: 'Twitter/X Post',
    source: 'twitter',
    medium: 'social',
    campaign: '',
  },
  {
    name: 'Instagram Bio',
    source: 'instagram',
    medium: 'social',
    campaign: '',
  },
  {
    name: 'Email Newsletter',
    source: 'newsletter',
    medium: 'email',
    campaign: '',
  },
  {
    name: 'Blog Post',
    source: 'blog',
    medium: 'referral',
    campaign: '',
  },
  {
    name: 'YouTube Video',
    source: 'youtube',
    medium: 'video',
    campaign: '',
  },
  {
    name: 'Podcast',
    source: 'podcast',
    medium: 'audio',
    campaign: '',
  },
];

export default function UTMLinkBuilder({ baseUrl, refCode, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customUTM, setCustomUTM] = useState({
    source: '',
    medium: '',
    campaign: '',
    content: '',
  });
  const [savedVariants, setSavedVariants] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const buildURL = (utm) => {
    const params = new URLSearchParams();
    params.set('ref', refCode);
    
    if (utm.source) params.set('utm_source', utm.source);
    if (utm.medium) params.set('utm_medium', utm.medium);
    if (utm.campaign) params.set('utm_campaign', utm.campaign);
    if (utm.content) params.set('utm_content', utm.content);
    
    return `${baseUrl}?${params.toString()}`;
  };

  const addPresetVariant = (preset) => {
    const variant = {
      name: preset.name,
      ...preset,
      url: buildURL(preset),
    };
    setSavedVariants([...savedVariants, variant]);
    setSelectedPreset(null);
  };

  const addCustomVariant = () => {
    if (!customUTM.source || !customUTM.medium) {
      alert('Source and Medium are required');
      return;
    }

    const variant = {
      name: `${customUTM.source} - ${customUTM.medium}${customUTM.campaign ? ` (${customUTM.campaign})` : ''}`,
      ...customUTM,
      url: buildURL(customUTM),
    };
    
    setSavedVariants([...savedVariants, variant]);
    setCustomUTM({ source: '', medium: '', campaign: '', content: '' });
    setShowCustomForm(false);
  };

  const removeVariant = (index) => {
    setSavedVariants(savedVariants.filter((_, i) => i !== index));
  };

  const copyToClipboard = (url, index) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">UTM Link Builder</h2>
            <p className="text-sm text-gray-600 mt-1">Create trackable variants of your affiliate link</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Base Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Base Link</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
              <code className="flex-1 text-sm text-gray-800 font-mono break-all">
                {baseUrl}?ref={refCode}
              </code>
              <button
                onClick={() => copyToClipboard(`${baseUrl}?ref=${refCode}`, 'base')}
                className="text-blue-600 hover:text-blue-800"
              >
                {copiedIndex === 'base' ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {UTM_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => addPresetVariant(preset)}
                  className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom UTM Builder */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Custom UTM Parameters</h3>
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus size={16} />
                Create Custom
              </button>
            </div>

            {showCustomForm && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      UTM Source * <span className="text-gray-500">(e.g., facebook, newsletter)</span>
                    </label>
                    <input
                      type="text"
                      value={customUTM.source}
                      onChange={(e) => setCustomUTM({ ...customUTM, source: e.target.value })}
                      placeholder="facebook"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      UTM Medium * <span className="text-gray-500">(e.g., social, email)</span>
                    </label>
                    <input
                      type="text"
                      value={customUTM.medium}
                      onChange={(e) => setCustomUTM({ ...customUTM, medium: e.target.value })}
                      placeholder="social"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      UTM Campaign <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customUTM.campaign}
                      onChange={(e) => setCustomUTM({ ...customUTM, campaign: e.target.value })}
                      placeholder="summer-2025"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      UTM Content <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customUTM.content}
                      onChange={(e) => setCustomUTM({ ...customUTM, content: e.target.value })}
                      placeholder="banner-ad"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomUTM({ source: '', medium: '', campaign: '', content: '' });
                    }}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomVariant}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Variant
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Variants */}
          {savedVariants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Your Link Variants ({savedVariants.length})
              </h3>
              <div className="space-y-3">
                {savedVariants.map((variant, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{variant.name}</h4>
                        <div className="flex gap-4 text-xs text-gray-600 mt-1">
                          <span>Source: <span className="font-mono">{variant.source}</span></span>
                          <span>Medium: <span className="font-mono">{variant.medium}</span></span>
                          {variant.campaign && (
                            <span>Campaign: <span className="font-mono">{variant.campaign}</span></span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeVariant(index)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <code className="flex-1 text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">
                        {variant.url}
                      </code>
                      <button
                        onClick={() => copyToClipboard(variant.url, index)}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={16} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {savedVariants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No variants created yet. Use quick presets or create custom UTM parameters above.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
