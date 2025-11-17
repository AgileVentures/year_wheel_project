import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Target, CheckCircle, Lightbulb, TrendingUp } from 'lucide-react';
import Footer from '../components/Footer';

function ArshjulGuide() {
  useEffect(() => {
    // Set page title and meta tags
    document.title = 'Guide: Så skapar du ett årshjul - Steg för steg | YearWheel';
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Lär dig skapa ett årshjul för din verksamhet. Komplett guide med praktiska tips för föreningar, skolor, företag och kommuner.');
    }
    
    // Set Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Guide: Så skapar du ett årshjul - Steg för steg | YearWheel');
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', 'Lär dig skapa ett årshjul för din verksamhet. Komplett guide med praktiska tips för föreningar, skolor, företag och kommuner.');
    
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', 'https://yearwheel.se/banner.webp');
    
    let ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
      ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      document.head.appendChild(ogType);
    }
    ogType.setAttribute('content', 'article');
    
    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://yearwheel.se/guide/arshjul');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} />
              <span>Tillbaka till startsidan</span>
            </Link>
          </div>
        </header>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Introduktion till årshjul och Yearwheel.se
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              En komplett guide för att skapa struktur och överblick i din verksamhet genom visuell årsplanering.
            </p>
          </div>

          {/* Featured Image */}
          <div className="mb-12 rounded-sm overflow-hidden shadow-xl">
            <img 
              src="/docs/guides/images/QUICK_START_06_editor.png" 
              alt="Årshjul med aktiviteter visualiserade i cirkulärt format"
              className="w-full h-auto"
            />
          </div>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Calendar className="text-[#00A4A6]" size={32} />
              Vad är ett årshjul och vem använder det?
            </h2>
            
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Ett årshjul är ett visuellt planeringsverktyg som hjälper organisationer att få struktur på återkommande aktiviteter genom hela året. Det används av många olika typer av verksamheter – från ideella föreningar och kommunala verksamheter till företag och utbildningsinstitutioner. Gemensamt för alla är behovet av att skapa tydlighet, fördela ansvar och säkerställa att ingenting faller mellan stolarna.
            </p>

            <div className="bg-blue-50 border-l-4 border-[#00A4A6] p-6 rounded-r-lg mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="text-[#00A4A6]" size={24} />
                Hur olika verksamheter använder årshjul
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Ideella föreningar</h4>
                  <p className="text-gray-700">Håller koll på medlemsträffar, årsmöten, styrelsemöten och andra återkommande evenemang.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Förskolor och skolor</h4>
                  <p className="text-gray-700">Strukturerar sitt kvalitetsarbete systematiskt och ger föräldrar insyn i vad som händer under året.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Företag och organisationer</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li><strong>Kundserviceavdelningar:</strong> Planerar kompetensutveckling och teamaktiviteter</li>
                    <li><strong>HR-funktioner:</strong> Organiserar medarbetarsamtal, löneprocesser och utbildningsinsatser</li>
                    <li><strong>Tekniska förvaltningar:</strong> Följer upp lagkrav, planerar underhåll och säkerställer kontinuitet</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Kommunal verksamhet</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Ser till att uppfylla lagstadgade krav och tidsfrister</li>
                    <li>Ger både chefer och medarbetare överblick över högtrycksperioder och viktiga deadlines</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-6 rounded-sm">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Generella fördelar
              </h4>
              <p className="text-gray-700">
                Oavsett verksamhet skapar årshjulet en samlad bild av vad som behöver göras och när. Det blir särskilt värdefullt när medarbetare slutar eller börjar – kunskapen finns kvar i strukturen.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Target className="text-[#00A4A6]" size={32} />
              Hur ett årshjul förbättrar er planering
            </h2>
            
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Ett årshjul visualiserar ert år i ett cirkulärt format där ni enkelt ser hur aktiviteter fördelar sig över tid. Detta ger er möjlighet att planera proaktivt istället för att reaktivt hantera uppgifter när de dyker upp.
            </p>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              När allt finns samlat på ett ställe blir det lättare att se helheten, förstå prioriteringar och kommunicera tydligt om vad som ska hända och varför.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-sm shadow-md border border-gray-200">
                <TrendingUp className="text-[#00A4A6] mb-4" size={28} />
                <h3 className="font-semibold text-gray-900 mb-2">Se helheten</h3>
                <p className="text-gray-600">Behåll perspektivet i intensiva perioder och fatta klokare beslut om prioriteringar.</p>
              </div>

              <div className="bg-white p-6 rounded-sm shadow-md border border-gray-200">
                <Users className="text-[#00A4A6] mb-4" size={28} />
                <h3 className="font-semibold text-gray-900 mb-2">Engagera teamet</h3>
                <p className="text-gray-600">När alla får bidra till planeringen ökar både förståelsen och engagemanget.</p>
              </div>

              <div className="bg-white p-6 rounded-sm shadow-md border border-gray-200">
                <Calendar className="text-[#00A4A6] mb-4" size={28} />
                <h3 className="font-semibold text-gray-900 mb-2">Kommunicera i tid</h3>
                <p className="text-gray-600">Förbered och kommunicera i god tid istället för att stressa fram information.</p>
              </div>
            </div>

            <div className="rounded-sm overflow-hidden shadow-lg mb-8">
              <img 
                src="/docs/guides/images/QUICK_START_03_dashboard.png" 
                alt="Dashboard med översikt över årshjul"
                className="w-full h-auto"
              />
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Lightbulb className="text-[#00A4A6]" size={32} />
              Skapa ert årshjul – steg för steg
            </h2>

            {/* Förberedelsefasen */}
            <div className="mb-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 bg-gray-100 p-4 rounded-sm">
                Förberedelsefasen
              </h3>

              <div className="space-y-6 ml-4">
                <div className="border-l-4 border-[#00A4A6] pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">1. Klargör syftet</h4>
                  <p className="text-gray-700">
                    Vad vill ni åstadkomma med ert årshjul? Handlar det om projektplanering, resursoptimering eller kanske kvalitetssäkring? Ett tydligt syfte ger riktning åt arbetet.
                  </p>
                </div>

                <div className="border-l-4 border-[#00A4A6] pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">2. Enas om nivå och metod</h4>
                  <p className="text-gray-700">
                    Hur detaljerat ska årshjulet vara? Hur vill ni arbeta med det? Bestäm detta tillsammans innan ni börjar – det sparar mycket diskussion och omarbete senare.
                  </p>
                </div>

                <div className="border-l-4 border-[#00A4A6] pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">3. Skapa förståelse och engagemang</h4>
                  <p className="text-gray-700">
                    Ta tid att förklara varför ni skapar årshjulet och hur det kommer underlätta vardagen för alla inblandade. När människor förstår nyttan blir de naturligt mer delaktiga.
                  </p>
                </div>

                <div className="border-l-4 border-[#00A4A6] pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">4. Ta tillvara på tidigare erfarenheter</h4>
                  <p className="text-gray-700">
                    Finns det gamla planeringar, mallar eller dokument ni kan utgå från? Använd det som redan fungerar som grund.
                  </p>
                </div>

                <div className="border-l-4 border-[#00A4A6] pl-6">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">5. Hitta rätt verktyg</h4>
                  <p className="text-gray-700">
                    Välj ett digitalt verktyg som är enkelt att både skapa i och uppdatera löpande. Yearwheel.se är byggt just för detta ändamål. Kontrollera att ni har budget för eventuella verktyg ni behöver.
                  </p>
                </div>
              </div>
            </div>

            {/* Genomförandefasen */}
            <div className="mb-10">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 bg-gray-100 p-4 rounded-sm">
                Genomförandefasen
              </h3>

              <div className="space-y-8 ml-4">
                <div className="bg-white p-6 rounded-sm shadow-md border-2 border-[#00A4A6]">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">Steg 1: Planera kickoffen</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Förklara för alla berörda varför ni gör detta</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Samla gruppen för att diskutera hur årshjulet ska struktureras</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Boka in själva workshopen där aktiviteterna ska identifieras</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-sm overflow-hidden shadow-lg">
                  <img 
                    src="/docs/guides/images/QUICK_START_08_create_new_activity.png" 
                    alt="Skapa nya aktiviteter i årshjulet"
                    className="w-full h-auto"
                  />
                </div>

                <div className="bg-white p-6 rounded-sm shadow-md border-2 border-[#00A4A6]">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">Steg 2: Samla in aktiviteter tillsammans</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Genomför en workshop där alla bidrar med sina aktiviteter</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Arbeta visuellt med post-it-lappar eller digitala whiteboards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Placera aktiviteterna på en tidslinje så ni ser fördelningen över året</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Diskutera vilka aktiviteter som påverkar varandra</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Gå igenom resultatet tillsammans och kolla att ni inte missat något väsentligt</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-sm overflow-hidden shadow-lg">
                  <img 
                    src="/docs/guides/images/QUICK_START_12_drag_and_drop.png" 
                    alt="Dra och släpp aktiviteter i årshjulet"
                    className="w-full h-auto"
                  />
                </div>

                <div className="bg-white p-6 rounded-sm shadow-md border-2 border-[#00A4A6]">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">Steg 3: Färdigställ årshjulet</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>För in alla aktiviteter i ert valda verktyg</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Dela det färdiga årshjulet med alla som ska använda det</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                      <span>Ge tydlig vägledning om hur det ska användas i det dagliga arbetet</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Hålla årshjulet levande
            </h2>

            <div className="space-y-6">
              <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Utvärdera och anpassa</h3>
                <p className="text-gray-700">
                  Ett årshjul är aldrig färdigt. Fundera regelbundet över om det speglar verkligheten och gör justeringar när behov uppstår.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Inkludera nya medarbetare</h3>
                <p className="text-gray-700">
                  Gör årshjulet till en naturlig del av introduktionen för nyanställda. Det ger dem snabbt en förståelse för verksamhetens rytm.
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-r-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Skapa levande rutiner</h3>
                <p className="text-gray-700">
                  Påminn er själva och varandra om att använda årshjulet aktivt. Lyft det på möten, hänvisa till det i planering och gör det till en självklar del av hur ni arbetar.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-[#00A4A6] to-[#36C2C6] rounded-sm p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Redo att komma igång?</h2>
            <p className="text-xl mb-6 opacity-90">
              Yearwheel.se ger er verktygen ni behöver för att skapa och underhålla ett årshjul som verkligen används.
            </p>
            <Link 
              to="/auth"
              className="inline-block bg-white text-[#00A4A6] px-8 py-4 rounded-sm font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Skapa ditt första årshjul gratis
            </Link>
            <p className="mt-4 text-sm opacity-80">Ingen bindningstid • Inga kreditkort • Kom igång direkt</p>
          </section>
        </article>

        <Footer />
      </div>
  );
}

export default ArshjulGuide;
