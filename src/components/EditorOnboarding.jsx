import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/**
 * EditorOnboarding - Interactive onboarding tour for the Year Wheel editor
 * Uses driver.js to guide new users through key features
 */
function EditorOnboarding({ shouldStart = false, onComplete, onSkip }) {
  const { t, i18n } = useTranslation(['editor', 'common']);
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
      disableActiveInteraction: false, // Allow interaction with highlighted elements
      steps: [
        // Step 1: Welcome
        {
          popover: {
            title: t('editor:onboarding.welcome.title'),
            description: t('editor:onboarding.welcome.description'),
            showButtons: ['next', 'close'],
            nextBtnText: t('editor:onboarding.buttons.startTour'),
            closeBtnText: t('editor:onboarding.buttons.skip'),
          }
        },
        // Step 2: Inner Rings - Add Button
        {
          element: '[data-onboarding="add-inner-ring"]',
          popover: {
            title: t('editor:onboarding.innerRing.title'),
            description: t('editor:onboarding.innerRing.description'),
            side: 'right',
            align: 'start'
          }
        },
        // Step 3: Outer Rings - Add Button
        {
          element: '[data-onboarding="add-outer-ring"]',
          popover: {
            title: t('editor:onboarding.outerRing.title'),
            description: t('editor:onboarding.outerRing.description'),
            side: 'right',
            align: 'start'
          }
        },
        // Step 4: Activity Groups Section
        {
          element: '[data-onboarding="activity-groups"]',
          popover: {
            title: t('editor:onboarding.activityGroups.title'),
            description: t('editor:onboarding.activityGroups.description'),
            side: 'right',
            align: 'start'
          }
        },
        // Step 5: Add Activity Button
        {
          element: '[data-onboarding="add-activity"]',
          popover: {
            title: t('editor:onboarding.addActivity.title'),
            description: t('editor:onboarding.addActivity.description'),
            side: 'bottom',
            align: 'center'
          }
        },
        // Step 6: Export & Share
        {
          element: '[data-onboarding="export-share"]',
          popover: {
            title: t('editor:onboarding.exportShare.title'),
            description: t('editor:onboarding.exportShare.description'),
            side: 'bottom',
            align: 'end'
          }
        },
        // Step 7: Completion
        {
          popover: {
            title: t('editor:onboarding.complete.title'),
            description: t('editor:onboarding.complete.description'),
            showButtons: ['close'],
            closeBtnText: t('editor:onboarding.buttons.startCreating')
          }
        }
      ],
      nextBtnText: t('common:actions.next'),
      prevBtnText: t('common:actions.previous'),
      doneBtnText: t('common:actions.done'),
      onDestroyed: (element, step, options) => {
        // Called when tour is closed/completed
        if (step.index === 6) {
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

  return null; // No visual component needed
}

export default EditorOnboarding;
