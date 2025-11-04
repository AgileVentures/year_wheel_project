import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Home } from 'lucide-react';
import Footer from './Footer';

function QuickStartGuide() {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const isSwedish = i18n.language === 'sv';

  const steps = isSwedish ? [
    {
      title: "Skapa ditt konto",
      time: "1 minut",
      image: "/docs/guides/images/QUICK_START_01_landing_page.png",
      imageCaption: "YearWheels startsida - klicka på 'Kom igång gratis' för att börja",
      content: (
        <>
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">1</span>
              <span>Gå till <a href="https://yearwheel.se" className="text-[#00A4A6] hover:underline font-medium">yearwheel.se</a></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">2</span>
              <span>Klicka på <strong>"Kom igång gratis"</strong></span>
            </li>
          </ol>
          
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
            <img src="/docs/guides/images/QUICK_START_02_login_box.png" alt="Inloggningsformulär" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-blue-900 italic">Skapa konto med e-post eller använd Google-inloggning</p>
          </div>

          <ol className="space-y-3 mt-6" start="3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">3</span>
              <span>Ange din e-postadress och lösenord eller använd ditt Google-konto</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">4</span>
              <span>Kolla din e-post för verifieringslänk (valfritt för omedelbar användning)</span>
            </li>
          </ol>
        </>
      )
    },
    {
      title: "Skapa ditt första hjul",
      time: "30 sekunder",
      image: "/docs/guides/images/QUICK_START_03_dashboard.png",
      imageCaption: "Din instrumentpanel - här ser du alla dina årshjul",
      content: (
        <>
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">1</span>
              <span>Klicka på <strong>"Skapa nytt hjul"</strong> på din instrumentpanel</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
            <img src="/docs/guides/images/QUICK_START_04_create_wheel.png" alt="Skapa nytt hjul" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-blue-900 italic">Ge ditt hjul en titel och välj år</p>
          </div>

          <ol className="space-y-3 mt-6" start="2">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">2</span>
              <div>
                <span>Ditt hjul skapas automatiskt med:</span>
                <ul className="mt-2 ml-6 space-y-1 list-disc text-gray-700">
                  <li>En månadsring (Jan-Dec)</li>
                  <li>Standardringar</li>
                  <li>Innevarande år</li>
                </ul>
              </div>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
            <img src="/docs/guides/images/QUICK_START_05_wheel_created.png" alt="Hjul skapat" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-green-900 italic">Ditt nya årshjul har skapats och visas på instrumentpanelen</p>
          </div>
        </>
      )
    },
    {
      title: "Konfigurera dina ringar",
      time: "2 minuter",
      image: "/docs/guides/images/QUICK_START_06_editor.png",
      imageCaption: "Redigerarens vy med sidopanel där du konfigurerar ringar och aktivitetsgrupper",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">💡 Vad är ringar?</p>
            <p className="text-sm text-purple-800"><strong>Ringar</strong> är huvudkategorierna i ditt hjul - som avdelningar, projekt eller fokusområden. De visas som cirkulära band runt årshjulet där du placerar aktiviteter.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">1</span>
              <span>Öppna vänstra sidofältet (klicka på ☰ om det är stängt)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">2</span>
              <span>Hitta avsnittet <strong>"Inre ringar"</strong> - ditt nya hjul börjar med en standardring som heter "Ring 1"</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">3</span>
              <span><strong>Klicka direkt på "Ring 1"</strong> för att redigera namnet</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">4</span>
              <span>Skriv din första kategori (t.ex. "Marknadsföring") och tryck Tab eller klicka utanför</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">5</span>
              <span>Klicka på <strong>"+ Lägg till"</strong> för att lägga till fler ringar (sikta på 3-5 totalt)</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium mb-2">📚 Exempel på ringar:</p>
            <ul className="text-sm text-amber-800 space-y-2">
              <li><strong>För affärsplanering:</strong> Marknadsföring, Försäljning, Produkt, Drift</li>
              <li><strong>För personlig planering:</strong> Privat, Familj, Arbete, Hälsa</li>
              <li><strong>För projektfaser:</strong> Planering, Utveckling, Lansering, Utvärdering</li>
            </ul>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
            <img src="/docs/guides/images/QUICK_START_07_editor_with_changes_01.png" alt="Konfigurerade ringar" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-blue-900 italic">Hjulet nu med flera ringar konfigurerade - Försäljning, Produkt, Marknadsföring, Drift</p>
          </div>
        </>
      )
    },
    {
      title: "Skapa aktivitetsgrupper",
      time: "2 minuter",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">🎨 Vad är aktivitetsgrupper?</p>
            <p className="text-sm text-purple-800"><strong>Aktivitetsgrupper</strong> bestämmer färgen på dina aktiviteter. Tänk på dem som färgkodningskategorier - alla aktiviteter i samma grupp får samma färg på ditt hjul.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">1</span>
              <span>Scrolla till avsnittet <strong>"Aktivitetsgrupper"</strong> (under ringarna)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">2</span>
              <span>Klicka på <strong>"+ Lägg till aktivitetsgrupp"</strong></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">3</span>
              <span>Ange ett namn (t.ex. "Kampanjer")</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">4</span>
              <span>Välj en färg (t.ex. blå)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">5</span>
              <span>Upprepa för att skapa 3-4 fler grupper med olika färger</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium mb-2">📚 Exempel på grupper:</p>
            <ul className="text-sm text-amber-800 space-y-2">
              <li><strong>Efter typ:</strong> Kampanjer, Event, Återkommande uppgifter, Milstolpar</li>
              <li><strong>Efter status:</strong> Planerad, Pågående, Slutförd</li>
              <li><strong>Efter prioritet:</strong> Hög prioritet, Medel prioritet, Låg prioritet</li>
            </ul>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
            <p className="text-green-900 font-medium mb-2">💡 Varför färger är viktiga</p>
            <p className="text-sm text-green-800">När du har många aktiviteter på ditt hjul hjälper färger dig att omedelbart se mönster - som att se alla Q2-aktiviteter på en gång, eller identifiera alla högprioriterade objekt.</p>
          </div>
        </>
      )
    },
    {
      title: "Lägg till din första aktivitet",
      time: "1 minut",
      image: "/docs/guides/images/QUICK_START_08_create_new_activity.png",
      imageCaption: "Formulär för att skapa en ny aktivitet med alla nödvändiga fält",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">📅 Vad är en aktivitet?</p>
            <p className="text-sm text-purple-800">En <strong>aktivitet</strong> är vilken händelse, projekt, kampanj eller uppgift som helst du vill spåra under året. Den visas som en färgad båge på ditt hjul.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">1</span>
              <span>Klicka på <strong>"+ Lägg till objekt"</strong> högst upp i sidofältet</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">2</span>
              <div>
                <span>Fyll i formuläret:</span>
                <ul className="mt-2 ml-6 space-y-1 text-gray-700">
                  <li><strong>Namn:</strong> "Vårproduktlansering"</li>
                  <li><strong>Ring:</strong> Välj "Marknadsföring" <span className="text-sm text-gray-500">(bestämmer VILKEN ring)</span></li>
                  <li><strong>Aktivitetsgrupp:</strong> Välj "Kampanjer" <span className="text-sm text-gray-500">(bestämmer FÄRGEN)</span></li>
                  <li><strong>Startdatum:</strong> 15 januari 2025</li>
                  <li><strong>Slutdatum:</strong> 31 mars 2025</li>
                  <li><strong>Beskrivning:</strong> (valfritt) Lägg till detaljer</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">3</span>
              <span>Klicka på <strong>"Lägg till aktivitet"</strong></span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
            <img src="/docs/guides/images/QUICK_START_09_editor_with_changes_02.png" alt="Första aktiviteten" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-green-900 italic">🎉 Hjulet visar nu din första aktivitet - en blå båge i Produktringen för Vårproduktlansering</p>
          </div>
        </>
      )
    },
    {
      title: "Lägg till fler aktiviteter",
      time: "2 minuter",
      image: "/docs/guides/images/QUICK_START_10_create_recurring_activity.png",
      imageCaption: "Formulär för återkommande aktiviteter med frekvensval och förhandsgranskning",
      content: (
        <>
          <p className="text-gray-700 mb-6">Skapa 2-3 fler aktiviteter för att se hur hjulet byggs upp. Varje aktivitet staplas ovanpå andra i samma ring, vilket skapar en komplett visuell bild av ditt år.</p>

          <div className="space-y-6">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Aktivitet 2: Sommarkampanj</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Ring:</strong> Marknadsföring</li>
                <li><strong>Grupp:</strong> "Kampanjer"</li>
                <li><strong>Datum:</strong> 1 juni - 31 augusti 2025</li>
              </ul>
            </div>

            <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Aktivitet 3: Månatligt nyhetsbrev (återkommande)</h4>
              <ul className="text-sm text-purple-800 space-y-1 mb-3">
                <li><strong>Ring:</strong> Marknadsföring</li>
                <li><strong>Grupp:</strong> "Återkommande uppgifter"</li>
                <li><strong>Datum:</strong> 20 januari - 21 januari 2025</li>
                <li><strong>Återkommande:</strong> ✓ Markera checkbox</li>
                <li><strong>Frekvens:</strong> Varje månad</li>
              </ul>
              <img src="/docs/guides/images/QUICK_START_10_create_recurring_activity.png" alt="Återkommande aktivitet" className="w-full rounded-lg shadow-md" />
              <p className="text-sm text-purple-700 italic mt-2">Formulär för återkommande aktiviteter - välj frekvens och se förhandsgranskning</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
            <img src="/docs/guides/images/QUICK_START_11_editor_with_changes_03.png" alt="Flera aktiviteter" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-green-900 italic">Hjulet med flera aktiviteter - se hur återkommande aktiviteter visas som röda rutor varje månad</p>
          </div>
        </>
      )
    },
    {
      title: "Dra-och-släpp-redigering",
      time: "Prova själv!",
      image: "/docs/guides/images/QUICK_START_12_drag_and_drop.png",
      imageCaption: "När du hovrar över en aktivitet visas handikonen - klicka och dra för att flytta",
      content: (
        <>
          <p className="text-gray-700 mb-6 font-medium">🎯 Du kan flytta och ändra storlek på aktiviteter direkt på hjulet!</p>

          <div className="space-y-6">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">👆 Flytta en aktivitet:</h4>
              <ol className="text-sm text-blue-800 space-y-2">
                <li>1. <strong>Placera muspekaren</strong> över en aktivitet på hjulet</li>
                <li>2. <strong>Klicka och håll</strong> i mitten av aktiviteten</li>
                <li>3. <strong>Dra</strong> till en annan månad eller tidsperiod</li>
                <li>4. <strong>Släpp</strong> för att placera</li>
              </ol>
              <p className="mt-3 text-sm text-blue-900 font-medium">✨ Start- och slutdatumen uppdateras automatiskt!</p>
            </div>

            <div className="p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">↔️ Ändra storlek på en aktivitet:</h4>
              <ol className="text-sm text-purple-800 space-y-2">
                <li>1. <strong>Placera muspekaren</strong> över kanten på en aktivitet</li>
                <li>2. Vänta tills markören ändras till storleksändringsikoner</li>
                <li>3. <strong>Klicka och dra</strong> kanten för att göra den längre eller kortare</li>
                <li>4. <strong>Släpp</strong> när du är klar</li>
              </ol>
            </div>

            <div className="p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">🔄 Flytta mellan ringar:</h4>
              <p className="text-sm text-green-800">Du kan också dra en aktivitet <strong>radiellt</strong> (inåt/utåt) för att flytta den till en annan ring</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
            <img src="/docs/guides/images/QUICK_START_13_drag_and_drop_zoomed_in.png" alt="Zoom på dra-och-släpp" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-blue-900 italic">Närbild av dra-och-släpp-funktionen - se hur markören ändras vid kanterna för storleksändring</p>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium">💡 Pro tips:</p>
            <p className="text-sm text-amber-800 mt-1">Detta är mycket snabbare än att öppna formulär och ändra datum manuellt. De flesta användare gör alla sina planeringsändringar med dra-och-släpp!</p>
          </div>
        </>
      )
    }
  ] : [
    // English version
    {
      title: "Create Your Account",
      time: "1 minute",
      image: "/docs/guides/images/QUICK_START_01_landing_page.png",
      imageCaption: "YearWheel landing page - click 'Get Started Free' to begin",
      content: (
        <>
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">1</span>
              <span>Go to <a href="https://yearwheel.com" className="text-[#00A4A6] hover:underline font-medium">yearwheel.com</a></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">2</span>
              <span>Click <strong>"Get Started Free"</strong></span>
            </li>
          </ol>
          
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
            <img src="/docs/guides/images/QUICK_START_02_login_box.png" alt="Login form" className="w-full rounded-sm shadow-md mb-3" />
            <p className="text-sm text-blue-900 italic">Create account with email or use Google sign-in</p>
          </div>

          <ol className="space-y-3 mt-6" start="3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">3</span>
              <span>Enter your email and password or use your Google account</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full text-sm font-medium mr-3 mt-0.5">4</span>
              <span>Check your email for verification link (optional for immediate use)</span>
            </li>
          </ol>
        </>
      )
    },
    // Add more English steps here...
  ];

  const totalSteps = steps.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-8 w-auto" />
              </Link>
              <div className="hidden sm:block text-gray-400">|</div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isSwedish ? 'Snabbstartsguide' : 'Quick Start Guide'}
              </h1>
            </div>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-[#00A4A6] transition-colors"
            >
              <Home size={20} />
              <span className="hidden sm:inline">{isSwedish ? 'Hem' : 'Home'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {isSwedish ? 'Steg' : 'Step'} {currentStep + 1} {isSwedish ? 'av' : 'of'} {totalSteps}
            </span>
            <span className="text-sm text-gray-500">{steps[currentStep].time}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#00A4A6] to-[#2E9E97] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="bg-white rounded-sm shadow-lg overflow-hidden">
          {/* Hero Image */}
          {steps[currentStep].image && (
            <div className="relative">
              <img 
                src={steps[currentStep].image} 
                alt={steps[currentStep].title}
                className="w-full h-48 sm:h-64 md:h-80 object-cover object-top"
              />
              {steps[currentStep].imageCaption && (
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
                  <p className="text-gray-600 text-sm italic text-center">{steps[currentStep].imageCaption}</p>
                </div>
              )}
            </div>
          )}

          {/* Step Content */}
          <div className="p-4 sm:p-6 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#00A4A6] to-[#2E9E97] text-white rounded-full font-bold">
                {currentStep + 1}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {steps[currentStep].title}
              </h2>
            </div>

            <div className="prose max-w-none">
              {steps[currentStep].content}
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-sm font-medium transition-all ${
                currentStep === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-sm'
              }`}
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{isSwedish ? 'Föregående' : 'Previous'}</span>
            </button>

            {currentStep === totalSteps - 1 ? (
              <Link
                to="/auth"
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00A4A6] to-[#2E9E97] text-white rounded-sm font-medium hover:shadow-lg transition-all text-sm sm:text-base"
              >
                <Check size={18} className="sm:w-5 sm:h-5" />
                {isSwedish ? 'Kom igång!' : 'Get Started!'}
              </Link>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00A4A6] to-[#2E9E97] text-white rounded-sm font-medium hover:shadow-lg transition-all text-sm sm:text-base"
              >
                <span className="hidden sm:inline">{isSwedish ? 'Nästa' : 'Next'}</span>
                <ChevronRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 px-3">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-[#00A4A6] w-8 sm:w-10'
                  : index < currentStep
                  ? 'bg-[#2E9E97] w-2'
                  : 'bg-gray-300 w-2'
              }`}
              aria-label={`${isSwedish ? 'Steg' : 'Step'} ${index + 1}`}
            />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default QuickStartGuide;
