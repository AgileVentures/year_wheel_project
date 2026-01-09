import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import AIAssistantDemo from './AIAssistantDemo';
import ManualEditorDemo from './ManualEditorDemo';
import ListViewDemo from './ListViewDemo';
import TimelineDemo from './TimelineDemo';

function InteractiveDemo({ demoRef }) {
  const { t } = useTranslation(['landing']);
  const [activeDemo, setActiveDemo] = useState('wheel'); // 'wheel' | 'ai' | 'list' | 'timeline'

  // Auto-rotate between all 4 demos
  useEffect(() => {
    // Timing: Manual=24s, AI=15s, List=12s, Timeline=12s
    let duration;
    switch (activeDemo) {
      case 'wheel':
        duration = 24000;
        break;
      case 'ai':
        duration = 15000;
        break;
      case 'list':
        duration = 12000;
        break;
      case 'timeline':
        duration = 12000;
        break;
      default:
        duration = 15000;
    }

    const timer = setTimeout(() => {
      setActiveDemo(prev => {
        switch (prev) {
          case 'wheel': return 'ai';
          case 'ai': return 'list';
          case 'list': return 'timeline';
          case 'timeline': return 'wheel';
          default: return 'wheel';
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [activeDemo]);

  // Get demo title and description based on active demo
  const getDemoContent = () => {
    switch (activeDemo) {
      case 'wheel':
        return {
          title: t('landing:demo.manualTitle'),
          description: t('landing:demo.manualDescription')
        };
      case 'ai':
        return {
          title: t('landing:demo.aiTitle'),
          description: t('landing:demo.aiDescription')
        };
      case 'list':
        return {
          title: t('landing:demo.listTitle', 'List View - Find Anything Instantly'),
          description: t('landing:demo.listDescription', 'Search, filter, and manage all your activities in a structured list format.')
        };
      case 'timeline':
        return {
          title: t('landing:demo.timelineTitle', 'Timeline View - Visualize Your Schedule'),
          description: t('landing:demo.timelineDescription', 'See all your activities on a horizontal timeline with zoom and pan controls.')
        };
      default:
        return { title: '', description: '' };
    }
  };

  const { title, description } = getDemoContent();

  return (
    <section id="demo-section" ref={demoRef} className="hidden md:block py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {title}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {description}
          </p>
        </div>

        {/* Demo Content */}
        <div className="bg-gray-800 rounded-sm overflow-hidden shadow-2xl border border-gray-700">
          {activeDemo === 'wheel' && <ManualEditorDemo />}
          {activeDemo === 'ai' && <AIAssistantDemo />}
          {activeDemo === 'list' && <ListViewDemo />}
          {activeDemo === 'timeline' && <TimelineDemo />}
        </div>
      </div>
    </section>
  );
}

export default memo(InteractiveDemo);