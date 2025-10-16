import { useTranslation } from 'react-i18next';
import WheelVisualization from './WheelVisualization';

function PhilosophySection() {
  const { t } = useTranslation(['landing']);

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-5xl mx-auto text-center">
        {/* Mini Year Wheel - Upper Half */}
        <div className="inline-block mb-12">
          <WheelVisualization variant="half" className="max-w-3xl mx-auto" />
        </div>
        
        <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
          {t('landing:philosophy.text')}
        </p>
      </div>
    </section>
  );
}

export default PhilosophySection;
