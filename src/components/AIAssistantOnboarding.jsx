import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { driver } from 'driver.js';

/**
 * AIAssistantOnboarding - Interactive tour for AI Assistant features
 * Shows how to drag, resize, and use the AI assistant
 */
function AIAssistantOnboarding({ shouldStart = false, onComplete, onSkip }) {
  const { t } = useTranslation(['editor', 'common']);
  const driverRef = useRef(null);

  useEffect(() => {
    if (!shouldStart) return;

    // Initialize driver.js with custom styling and smooth animations
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      smoothScroll: true,
      allowClose: true,
      disableActiveInteraction: false,
      steps: [
        // Step 1: Welcome to AI Assistant
        {
          popover: {
            title: t('editor:aiOnboarding.welcome.title'),
            description: t('editor:aiOnboarding.welcome.description'),
            showButtons: ['next', 'close'],
            nextBtnText: t('editor:aiOnboarding.buttons.startTour'),
            closeBtnText: t('editor:aiOnboarding.buttons.skip'),
          }
        },
        // Step 2: AI Assistant Window
        {
          element: '[data-onboarding="ai-assistant-window"]',
          popover: {
            title: t('editor:aiOnboarding.window.title'),
            description: t('editor:aiOnboarding.window.description'),
            side: 'left',
            align: 'start'
          }
        },
        // Step 3: Drag to Move
        {
          element: '[data-onboarding="ai-drag-handle"]',
          popover: {
            title: t('editor:aiOnboarding.drag.title'),
            description: t('editor:aiOnboarding.drag.description'),
            side: 'left',
            align: 'center'
          }
        },
        // Step 4: Resize Window
        {
          element: '[data-onboarding="ai-resize-handle"]',
          popover: {
            title: t('editor:aiOnboarding.resize.title'),
            description: t('editor:aiOnboarding.resize.description'),
            side: 'top',
            align: 'center'
          }
        },
        // Step 5: Completion
        {
          popover: {
            title: t('editor:aiOnboarding.complete.title'),
            description: t('editor:aiOnboarding.complete.description'),
            showButtons: ['close'],
            closeBtnText: t('editor:aiOnboarding.buttons.startUsing')
          }
        }
      ],
      nextBtnText: t('common:actions.next'),
      prevBtnText: t('common:actions.previous'),
      doneBtnText: t('common:actions.done'),
      onDestroyed: (element, step, options) => {
        // Called when tour is closed/completed
        if (step.index === 4) {
          // Completed all steps
          onComplete && onComplete();
        } else {
          // Skipped
          onSkip && onSkip();
        }
      }
    });

    driverRef.current = driverObj;
    driverObj.drive();

    // Cleanup on unmount
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [shouldStart, t, onComplete, onSkip]);

  return null;
}

export default AIAssistantOnboarding;
