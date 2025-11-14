import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Home } from 'lucide-react';
import Footer from './Footer';

function QuickStartGuide() {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const isSwedish = i18n.language === 'sv';
  const contentRef = useRef(null);

  // Scroll to top when step changes
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

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
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Gå till <a href="https://yearwheel.se" className="text-[#00A4A6] hover:underline font-medium">yearwheel.se</a></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <span>Klicka på <strong>"Kom igång gratis"</strong></span>
            </li>
          </ol>
          
          <img src="/docs/guides/images/QUICK_START_02_login_box.png" alt="Inloggningsformulär" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Skapa konto med e-post eller använd Google-inloggning</p>

          <ol className="space-y-3 mt-6" start="3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span>Ange din e-postadress och lösenord eller använd ditt Google-konto</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">4</span>
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
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Klicka på <strong>"Skapa nytt hjul"</strong> på din instrumentpanel</span>
            </li>
          </ol>

          <img src="/docs/guides/images/QUICK_START_04_create_wheel.png" alt="Skapa nytt hjul" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Ge ditt hjul en titel och välj år</p>

          <ol className="space-y-3 mt-6" start="2">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
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

          <img src="/docs/guides/images/QUICK_START_05_wheel_created.png" alt="Hjul skapat" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Ditt nya årshjul har skapats och visas på instrumentpanelen</p>
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
            <p className="text-purple-900 font-medium mb-2">Vad är ringar?</p>
            <p className="text-purple-800"><strong>Ringar</strong> är huvudkategorierna i ditt hjul - som avdelningar, projekt eller fokusområden. De visas som cirkulära band runt årshjulet där du placerar aktiviteter.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Öppna vänstra sidofältet (klicka på ☰ om det är stängt)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <span>Hitta avsnittet <strong>"Inre ringar"</strong> - ditt nya hjul börjar med en standardring som heter "Ring 1"</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span><strong>Klicka direkt på "Ring 1"</strong> för att redigera namnet</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">4</span>
              <span>Skriv din första kategori (t.ex. "Marknadsföring") och tryck Tab eller klicka utanför</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">5</span>
              <span>Klicka på <strong>"+ Lägg till"</strong> för att lägga till fler ringar (sikta på 3-5 totalt)</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium mb-2">Exempel på ringar:</p>
            <ul className="text-amber-800 space-y-2">
              <li><strong>För affärsplanering:</strong> Marknadsföring, Försäljning, Produkt, Drift</li>
              <li><strong>För personlig planering:</strong> Privat, Familj, Arbete, Hälsa</li>
              <li><strong>För projektfaser:</strong> Planering, Utveckling, Lansering, Utvärdering</li>
            </ul>
          </div>

          <img src="/docs/guides/images/QUICK_START_07_editor_with_changes_01.png" alt="Konfigurerade ringar" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Hjulet nu med flera ringar konfigurerade - Försäljning, Produkt, Marknadsföring, Drift</p>
        </>
      )
    },
    {
      title: "Skapa aktivitetsgrupper",
      time: "2 minuter",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">Vad är aktivitetsgrupper?</p>
            <p className="text-purple-800"><strong>Aktivitetsgrupper</strong> bestämmer färgen på dina aktiviteter. Tänk på dem som färgkodningskategorier - alla aktiviteter i samma grupp får samma färg på ditt hjul.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Scrolla till avsnittet <strong>"Aktivitetsgrupper"</strong> (under ringarna)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <span>Klicka på <strong>"+ Lägg till aktivitetsgrupp"</strong></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span>Ange ett namn (t.ex. "Kampanjer")</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">4</span>
              <span>Välj en färg (t.ex. blå)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">5</span>
              <span>Upprepa för att skapa 3-4 fler grupper med olika färger</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium mb-2">Exempel på grupper:</p>
            <ul className="text-amber-800 space-y-2">
              <li><strong>Efter typ:</strong> Kampanjer, Event, Återkommande uppgifter, Milstolpar</li>
              <li><strong>Efter status:</strong> Planerad, Pågående, Slutförd</li>
              <li><strong>Efter prioritet:</strong> Hög prioritet, Medel prioritet, Låg prioritet</li>
            </ul>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
            <p className="text-green-900 font-medium mb-2">Varför färger är viktiga</p>
            <p className="text-green-800">När du har många aktiviteter på ditt hjul hjälper färger dig att omedelbart se mönster - som att se alla Q2-aktiviteter på en gång, eller identifiera alla högprioriterade objekt.</p>
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
            <p className="text-purple-900 font-medium mb-2">Vad är en aktivitet?</p>
            <p className="text-purple-800">En <strong>aktivitet</strong> är vilken händelse, projekt, kampanj eller uppgift som helst du vill spåra under året. Den visas som en färgad båge på ditt hjul.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Klicka på <strong>"+ Lägg till objekt"</strong> högst upp i sidofältet</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <div>
                <span>Fyll i formuläret:</span>
                <ul className="mt-2 ml-6 space-y-1 text-gray-700">
                  <li><strong>Namn:</strong> "Vårproduktlansering"</li>
                  <li><strong>Ring:</strong> Välj "Marknadsföring" <span className="text-gray-500">(bestämmer VILKEN ring)</span></li>
                  <li><strong>Aktivitetsgrupp:</strong> Välj "Kampanjer" <span className="text-gray-500">(bestämmer FÄRGEN)</span></li>
                  <li><strong>Startdatum:</strong> 15 januari 2025</li>
                  <li><strong>Slutdatum:</strong> 31 mars 2025</li>
                  <li><strong>Beskrivning:</strong> (valfritt) Lägg till detaljer</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span>Klicka på <strong>"Lägg till aktivitet"</strong></span>
            </li>
          </ol>

          <img src="/docs/guides/images/QUICK_START_09_editor_with_changes_02.png" alt="Första aktiviteten" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Hjulet visar nu din första aktivitet - en blå båge i Produktringen för Vårproduktlansering</p>
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
            <div className="p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Aktivitet 2: Sommarkampanj</h4>
              <ul className="text-blue-800 space-y-1">
                <li><strong>Ring:</strong> Marknadsföring</li>
                <li><strong>Grupp:</strong> "Kampanjer"</li>
                <li><strong>Datum:</strong> 1 juni - 31 augusti 2025</li>
              </ul>
            </div>

            <div className="p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Aktivitet 3: Månatligt nyhetsbrev (återkommande)</h4>
              <ul className="text-purple-800 space-y-1 mb-3">
                <li><strong>Ring:</strong> Marknadsföring</li>
                <li><strong>Grupp:</strong> "Återkommande uppgifter"</li>
                <li><strong>Datum:</strong> 20 januari - 21 januari 2025</li>
                <li><strong>Återkommande:</strong> Markera checkbox</li>
                <li><strong>Frekvens:</strong> Varje månad</li>
              </ul>
              <img src="/docs/guides/images/QUICK_START_10_create_recurring_activity.png" alt="Återkommande aktivitet" className="w-full" />
              <p className="text-purple-700 italic mt-2">Formulär för återkommande aktiviteter - välj frekvens och se förhandsgranskning</p>
            </div>
          </div>

          <img src="/docs/guides/images/QUICK_START_11_editor_with_changes_03.png" alt="Flera aktiviteter" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Hjulet med flera aktiviteter - se hur återkommande aktiviteter visas som röda rutor varje månad</p>
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
          <p className="text-gray-700 mb-6 font-medium">Du kan flytta och ändra storlek på aktiviteter direkt på hjulet!</p>

          <div className="space-y-6">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Flytta en aktivitet:</h4>
              <ol className="text-blue-800 space-y-2">
                <li>1. <strong>Placera muspekaren</strong> över en aktivitet på hjulet</li>
                <li>2. <strong>Klicka och håll</strong> i mitten av aktiviteten</li>
                <li>3. <strong>Dra</strong> till en annan månad eller tidsperiod</li>
                <li>4. <strong>Släpp</strong> för att placera</li>
              </ol>
              <p className="mt-3 text-blue-900 font-medium">✨ Start- och slutdatumen uppdateras automatiskt!</p>
            </div>

            <div className="p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">Ändra storlek på en aktivitet:</h4>
              <ol className="text-purple-800 space-y-2">
                <li>1. <strong>Placera muspekaren</strong> över kanten på en aktivitet</li>
                <li>2. Vänta tills markören ändras till storleksändringsikoner</li>
                <li>3. <strong>Klicka och dra</strong> kanten för att göra den längre eller kortare</li>
                <li>4. <strong>Släpp</strong> när du är klar</li>
              </ol>
            </div>

            <div className="p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Flytta mellan ringar:</h4>
              <p className="text-green-800">Du kan också dra en aktivitet <strong>radiellt</strong> (inåt/utåt) för att flytta den till en annan ring</p>
            </div>
          </div>

          <img src="/docs/guides/images/QUICK_START_13_drag_and_drop_zoomed_in.png" alt="Zoom på dra-och-släpp" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Närbild av dra-och-släpp-funktionen - se hur markören ändras vid kanterna för storleksändring</p>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium">Pro tips:</p>
            <p className="text-amber-800 mt-1">Detta är mycket snabbare än att öppna formulär och ändra datum manuellt. De flesta användare gör alla sina planeringsändringar med dra-och-släpp!</p>
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
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Go to <a href="https://yearwheel.com" className="text-[#00A4A6] hover:underline font-medium">yearwheel.com</a></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <span>Click <strong>"Get Started Free"</strong></span>
            </li>
          </ol>
          
          <img src="/docs/guides/images/QUICK_START_02_login_box.png" alt="Login form" className="mt-4 sm:mt-6 w-full" />

          
          <p className="text-gray-600 italic text-center">Create account with email or use Google sign-in</p>

          <ol className="space-y-3 mt-6" start="3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span>Enter your email and password or use your Google account</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">4</span>
              <span>Check your email for verification link (optional for immediate use)</span>
            </li>
          </ol>
        </>
      )
    },
    {
      title: "Create Your First Wheel",
      time: "30 seconds",
      image: "/docs/guides/images/QUICK_START_03_dashboard.png",
      imageCaption: "Your dashboard - here you see all your year wheels",
      content: (
        <>
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Click <strong>"Create New Wheel"</strong> on your dashboard</span>
            </li>
          </ol>

          <img src="/docs/guides/images/QUICK_START_04_create_wheel.png" alt="Create new wheel" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Give your wheel a title and select year</p>

          <ol className="space-y-3 mt-6" start="2">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <div>
                <span>Your wheel is created automatically with:</span>
                <ul className="mt-2 ml-6 space-y-1 list-disc text-gray-700">
                  <li>A month ring (Jan-Dec)</li>
                  <li>Default rings</li>
                  <li>The current year</li>
                </ul>
              </div>
            </li>
          </ol>

          <img src="/docs/guides/images/QUICK_START_05_wheel_created.png" alt="Wheel created" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Your new year wheel has been created and appears on the dashboard</p>
        </>
      )
    },
    {
      title: "Set Up Your Rings",
      time: "2 minutes",
      image: "/docs/guides/images/QUICK_START_06_editor.png",
      imageCaption: "Editor view with side panel where you configure rings and activity groups",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">What are rings?</p>
            <p className="text-purple-800"><strong>Rings</strong> are the main categories in your wheel - like departments, projects, or focus areas. They appear as circular bands around the year wheel where you place activities.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Open the left sidebar (click ☰ if closed)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <span>Find the <strong>"Inner Rings"</strong> section - your new wheel starts with one default ring called "Ring 1"</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span><strong>Click directly on "Ring 1"</strong> to edit the name</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">4</span>
              <span>Type your first category (e.g., "Marketing") and press Tab or click outside</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">5</span>
              <span>Click <strong>"+ Add"</strong> to add more rings (aim for 3-5 total)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">6</span>
              <span>Name each ring for your main categories</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium mb-2">Example rings:</p>
            <ul className="text-amber-800 space-y-2">
              <li><strong>For business planning:</strong> Marketing, Sales, Product, Operations</li>
              <li><strong>For personal planning:</strong> Personal, Family, Work, Health</li>
              <li><strong>For project phases:</strong> Planning, Development, Launch, Review</li>
            </ul>
          </div>

          <img src="/docs/guides/images/QUICK_START_07_editor_with_changes_01.png" alt="Configured rings" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">The wheel now with multiple rings configured - Sales, Product, Marketing, Operations</p>
        </>
      )
    },
    {
      title: "Create Activity Groups",
      time: "2 minutes",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">What are activity groups?</p>
            <p className="text-purple-800"><strong>Activity Groups</strong> determine the color of your activities. Think of them as color-coding categories - all activities in the same group will have the same color on your wheel.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Scroll to the <strong>"Activity Groups"</strong> section (below the rings)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <span>Click <strong>"+ Add Activity Group"</strong></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span>Enter a name (e.g., "Campaigns")</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">4</span>
              <span>Choose a color (e.g., blue)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">5</span>
              <span>Click <strong>"Add"</strong></span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">6</span>
              <span>Repeat to create 3-4 more groups with different colors</span>
            </li>
          </ol>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium mb-2">Example groups:</p>
            <ul className="text-amber-800 space-y-2">
              <li><strong>By type:</strong> Campaigns, Events, Recurring Tasks, Milestones</li>
              <li><strong>By status:</strong> Planned, In Progress, Completed</li>
              <li><strong>By priority:</strong> High Priority, Medium Priority, Low Priority</li>
            </ul>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
            <p className="text-green-900 font-medium mb-2">Why colors matter</p>
            <p className="text-green-800">When you have many activities on your wheel, colors help you instantly recognize patterns - like seeing all Q2 activities at a glance, or spotting all high-priority items.</p>
          </div>
        </>
      )
    },
    {
      title: "Add Your First Activity",
      time: "1 minute",
      image: "/docs/guides/images/QUICK_START_08_create_new_activity.png",
      imageCaption: "Form for creating a new activity with all necessary fields",
      content: (
        <>
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
            <p className="text-purple-900 font-medium mb-2">What is an activity?</p>
            <p className="text-purple-800">An <strong>activity</strong> is any event, project, campaign, or task you want to track during the year. It appears as a colored arc on your wheel.</p>
          </div>

          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">1</span>
              <span>Click <strong>"+ Add Activity"</strong> at the top of the sidebar</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">2</span>
              <div>
                <span>Fill in the form:</span>
                <ul className="mt-2 ml-6 space-y-1 text-gray-700">
                  <li><strong>Name:</strong> "Spring Product Launch"</li>
                  <li><strong>Ring:</strong> Select "Marketing" <span className="text-gray-500">(determines WHICH ring)</span></li>
                  <li><strong>Activity Group:</strong> Select "Campaigns" <span className="text-gray-500">(determines COLOR)</span></li>
                  <li><strong>Start Date:</strong> January 15, 2025</li>
                  <li><strong>End Date:</strong> March 31, 2025</li>
                  <li><strong>Description:</strong> (optional) Add details</li>
                </ul>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-medium mr-3 mt-0.5">3</span>
              <span>Click <strong>"Add Activity"</strong></span>
            </li>
          </ol>

          <img src="/docs/guides/images/QUICK_START_09_editor_with_changes_02.png" alt="First activity" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">The wheel now shows your first activity - a blue arc in the Product ring for Spring Product Launch</p>
        </>
      )
    },
    {
      title: "Add More Activities",
      time: "2 minutes",
      image: "/docs/guides/images/QUICK_START_10_create_recurring_activity.png",
      imageCaption: "Form for recurring activities with frequency selection and preview",
      content: (
        <>
          <p className="text-gray-700 mb-6">Create 2-3 more activities to see how the wheel builds up. Each activity will stack on top of others in the same ring, creating a complete visual of your year.</p>

          <div className="space-y-6">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Activity 2: Summer Campaign</h4>
              <ul className="text-blue-800 space-y-1">
                <li><strong>Ring:</strong> Marketing</li>
                <li><strong>Group:</strong> "Campaigns"</li>
                <li><strong>Dates:</strong> June 1 - August 31, 2025</li>
              </ul>
            </div>

            <div className="p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Activity 3: Monthly Newsletter (recurring)</h4>
              <ul className="text-purple-800 space-y-1 mb-3">
                <li><strong>Ring:</strong> Marketing</li>
                <li><strong>Group:</strong> "Recurring Tasks"</li>
                <li><strong>Dates:</strong> January 20 - January 21, 2025</li>
                <li><strong>Recurring:</strong> Check the checkbox</li>
                <li><strong>Frequency:</strong> Every month</li>
              </ul>
              <img src="/docs/guides/images/QUICK_START_10_create_recurring_activity.png" alt="Recurring activity" className="w-full" />
              <p className="text-purple-700 italic mt-2">Recurring activity form - select frequency and see preview</p>
            </div>
          </div>

          <img src="/docs/guides/images/QUICK_START_11_editor_with_changes_03.png" alt="Multiple activities" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">The wheel with multiple activities - see how recurring activities appear as red boxes each month</p>
        </>
      )
    },
    {
      title: "Try Drag & Drop Editing",
      time: "Try it yourself!",
      image: "/docs/guides/images/QUICK_START_12_drag_and_drop.png",
      imageCaption: "When you hover over an activity, the hand icon appears - click and drag to move",
      content: (
        <>
          <p className="text-gray-700 mb-6 font-medium">You can move and resize activities directly on the wheel!</p>

          <div className="space-y-6">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-sm border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Move an activity:</h4>
              <ol className="text-blue-800 space-y-2">
                <li>1. <strong>Hover</strong> over an activity on the wheel</li>
                <li>2. <strong>Click and hold</strong> in the middle of the activity</li>
                <li>3. <strong>Drag</strong> to a different month or time period</li>
                <li>4. <strong>Release</strong> to drop</li>
              </ol>
              <p className="mt-3 text-blue-900 font-medium">✨ Start and end dates update automatically!</p>
            </div>

            <div className="p-3 sm:p-4 bg-purple-50 rounded-sm border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">Resize an activity:</h4>
              <ol className="text-purple-800 space-y-2">
                <li>1. <strong>Hover</strong> over the edge of an activity</li>
                <li>2. Wait for the cursor to change to resize arrows</li>
                <li>3. <strong>Click and drag</strong> the edge to make it longer or shorter</li>
                <li>4. <strong>Release</strong> when done</li>
              </ol>
            </div>

            <div className="p-3 sm:p-4 bg-green-50 rounded-sm border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Move between rings:</h4>
              <p className="text-green-800">You can also drag an activity <strong>radially</strong> (inward/outward) to move it to a different ring</p>
            </div>
          </div>

          <img src="/docs/guides/images/QUICK_START_13_drag_and_drop_zoomed_in.png" alt="Drag and drop zoom" className="mt-4 sm:mt-6 w-full" />
          <p className="text-gray-600 italic text-center">Close-up of the drag and drop feature - see how the cursor changes at the edges for resizing</p>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-amber-50 rounded-sm border border-amber-200">
            <p className="text-amber-900 font-medium">Pro tip:</p>
            <p className="text-amber-800 mt-1">This is much faster than opening forms and changing dates manually. Most users do all their planning adjustments with drag and drop!</p>
          </div>
        </>
      )
    }
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
            <span className="font-medium text-gray-700">
              {isSwedish ? 'Steg' : 'Step'} {currentStep + 1} {isSwedish ? 'av' : 'of'} {totalSteps}
            </span>
            <span className="text-gray-500">{steps[currentStep].time}</span>
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
      <main ref={contentRef} className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
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
                  <p className="text-gray-600 italic text-center">{steps[currentStep].imageCaption}</p>
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
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00A4A6] to-[#2E9E97] text-white rounded-sm font-medium hover:shadow-lg transition-all sm:text-base"
              >
                <Check size={18} className="sm:w-5 sm:h-5" />
                {isSwedish ? 'Kom igång!' : 'Get Started!'}
              </Link>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00A4A6] to-[#2E9E97] text-white rounded-sm font-medium hover:shadow-lg transition-all sm:text-base"
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
