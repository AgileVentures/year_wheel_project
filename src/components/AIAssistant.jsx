import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getWheelContext,
  aiCreateRing,
  aiCreateActivityGroup,
  aiCreateItem,
  aiCreatePage,
  aiGetCurrentDate,
  aiGetAvailablePages,
  aiAnalyzeWheel,
  aiSearchWheel,
  aiGetItemsByRing,
  aiDeleteItems,
  aiDeleteItemsByRing,
  aiDeleteRing,
  aiDeleteActivityGroup
} from '../services/aiWheelService';

function AIAssistant({ wheelId, currentPageId, onWheelUpdate, onPageChange, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [wheelContext, setWheelContext] = useState(null);
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const chatWindowRef = useRef(null);

  // Load wheel context when component mounts or wheelId changes
  useEffect(() => {
    if (wheelId && isOpen) {
      loadWheelContext();
    }
  }, [wheelId, isOpen]);

  const loadWheelContext = async () => {
    try {
      const context = await getWheelContext(wheelId);
      setWheelContext(context);
    } catch (error) {
      console.error('[AIAssistant] Error loading wheel context:', error);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e) => {
    if (chatWindowRef.current && e.target.closest('.drag-handle')) {
      const rect = chatWindowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Initial greeting message
  useEffect(() => {
    if (isOpen && messages.length === 0 && wheelContext) {
      // Build rings list
      const ringsList = wheelContext.organizationData.rings.length > 0
        ? wheelContext.organizationData.rings.map(r => `  - **${r.name}** (${r.type})`).join('\n')
        : '  - *Inga ringar ännu*';
      
      // Build activity groups list
      const groupsList = wheelContext.organizationData.activityGroups.length > 0
        ? wheelContext.organizationData.activityGroups.map(ag => `  - **${ag.name}**`).join('\n')
        : '  - *Inga aktivitetsgrupper ännu*';
      
      const greeting = {
        id: Date.now(),
        role: 'assistant',
        content: `Hej! Jag kan hjälpa dig med ditt årshjul **"${wheelContext.title}"** (${wheelContext.year}).

## Jag kan:
- **Skapa** ringar och aktivitetsgrupper
- **Lägga till** aktiviteter och händelser
- **Söka** efter aktiviteter, ringar eller grupper
- **Ta bort** aktiviteter, ringar eller grupper
- **Skapa** nya årssidor
- **Analysera** ditt hjul och ge tips

**Kom igåg att jag är en AI och kan göra fel...**

## Nuvarande struktur:

**Ringar (${wheelContext.stats.rings}):**
${ringsList}

**Aktivitetsgrupper (${wheelContext.stats.activityGroups}):**
${groupsList}

**Aktiviteter:** ${wheelContext.stats.items}

${wheelContext.stats.rings === 0 || wheelContext.stats.activityGroups === 0 ? '\n💡 *Tips: Berätta vad du vill använda hjulet till, så föreslår jag en struktur som passar!*' : ''}
`
      };
      setMessages([greeting]);
    }
  }, [isOpen, wheelContext]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build system prompt with context
      const systemPrompt = `Du är en AI-assistent för YearWheel, ett cirkulärt kalenderverktyg för årlig planering och visualisering.

ABSOLUT REGEL - DU MÅSTE ALLTID SVARA MED TEXT:
Efter varje verktygsanrop MÅSTE du skriva ett text-svar till användaren. Aldrig lämna tomt.

VIKTIGT - NYA HJUL OCH STRUKTUR:
När användaren beskriver ett sammanhang/projekt (t.ex. "planera en SaaS-lansering", "organisera ett evenemang"):
1. **Föreslå struktur FÖRST**: Förklara vilka ringar, aktivitetsgrupper och aktiviteter som passar
2. **Fråga om godkännande**: "Vill du att jag skapar denna struktur?"
3. **Skapa i rätt ordning**: Ringar → Aktivitetsgrupper → Aktiviteter
4. **Använd aktivitetsgrupper**: ALLTID tilldela aktiviteter till en relevant aktivitetsgrupp
5. **Standardgrupp finns**: Om ingen aktivitetsgrupp anges skapas automatiskt gruppen "Allmän"

VIKTIGT - Verktygsval:
- "vilken dag är det" / "dagens datum" → Använd getCurrentDate
- "vilka år finns" / "visa alla sidor" → Använd getAvailablePages
- "byt till 2026" / "visa 2025" / "gå till nästa år" → Använd navigateToPage med year eller pageId
- "skapa sida för 2026" → Använd createPage med year=2026, copyStructure=true för att kopiera struktur
- "vilka aktiviteter på ring X" → Använd getItemsByRing med ringName
- "ta bort alla aktiviteter på/från ring X" → Använd deleteItemsByRing med ringName (bekräfta FÖRST)
- "sök efter aktivitet X" → Använd searchWheel med type="items"
- "finns det en ring X" → Använd searchWheel med type="rings"
- "hitta grupp X" → Använd searchWheel med type="activityGroups"
- "ta bort alla" (efter att ha listat aktiviteter) → Använd deleteItemsByRing om det gäller en ring

VECKONUMMER:
- Användare använder ofta veckonummer (t.ex. "v45", "vecka 12", "v23-25") för att referera till datum
- Du ska förstå och konvertera veckonummer till korrekta datum enligt ISO 8601-standarden
- När användaren säger "skapa aktivitet v45" eller "semester vecka 23", tolka detta som veckonummer
- Exempel: "v45" i 2025 = vecka 45, "v23-25" = från vecka 23 till vecka 25

DATUM OCH TIDSPLANERING:
- **Standard: Antag framtida datum** - Om användaren inte anger år, antag att aktiviteten är för framtiden
- **Historiska datum: Bekräfta först** - Om en aktivitet ligger i det förflutna (före dagens datum), fråga användaren INNAN du skapar: "Vill du verkligen skapa en aktivitet som ligger i det förflutna? (från STARTDATUM till SLUTDATUM)"
- Vänta på användarens bekräftelse ("ja", "ok", "bekräfta") innan du fortsätter med skapandet
- Om användaren säger "nej" eller liknande, avbryt skapandet

FRAMTIDA ÅR OCH SIDOR:
- **Om aktivitet skapas för ett år som inte finns**: Skapa FÖRST en ny sida för det året med createPage (year=XXXX, copyStructure=true), SEDAN navigera till den med navigateToPage (year=XXXX), SEDAN skapa aktiviteten
- **Om aktivitet skapas för ett år som redan finns**: Navigera FÖRST till det året med navigateToPage (year=XXXX), SEDAN skapa aktiviteten
- **Kontrollera alltid tillgängliga år**: Använd getAvailablePages för att se vilka år som redan finns
- **Exempel**: Användare vill skapa aktivitet i 2027, men endast 2025 och 2026 finns → Skapa 2027 → Navigera till 2027 → Skapa aktivitet

FORMATERING:
- Använd ALDRIG emojis i dina svar (inga checkmarks, varningar, raketer, etc.)
- Använd istället tydlig text: "Klart", "Varning", "Fel", etc.
- Använd markdown för formatering: **fetstil**, *kursiv*, listor, rubriker
- Var koncis och professionell i dina svar

DIN ROLL OCH BEGRÄNSNINGAR:
- Du hjälper ENDAST med YearWheel-relaterade uppgifter: skapa/redigera/söka/radera ringar, aktivitetsgrupper och aktiviteter
- Du svarar INTE på allmänna frågor, kodningsfrågor, eller frågor utanför YearWheel-planering
- Om användaren frågar något utanför din roll, svara: "Jag är specialiserad på att hjälpa dig med ditt YearWheel. Jag kan hjälpa dig att skapa ringar, aktivitetsgrupper, aktiviteter, eller söka och organisera ditt hjul. Hur kan jag hjälpa dig med din årsplanering?"

Aktuellt hjul:
- Titel: ${wheelContext?.title || 'Okänt'}
- År: ${wheelContext?.year || 'Okänt'}
- Sidor: ${wheelContext?.pages?.length || 0}
- Dagens datum: ${new Date().toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Ringar: ${wheelContext?.stats.rings || 0}
- Aktivitetsgrupper: ${wheelContext?.stats.activityGroups || 0}
- Aktiviteter: ${wheelContext?.stats.items || 0}

Tillgängliga ringar:
${wheelContext?.organizationData.rings?.map(r => `- ${r.name} (${r.type}, ID: ${r.id})`).join('\n') || 'Inga ringar'}

Tillgängliga aktivitetsgrupper:
${wheelContext?.organizationData.activityGroups?.map(ag => `- ${ag.name} (ID: ${ag.id})`).join('\n') || 'Inga grupper'}

Tillgängliga aktiviteter:
${wheelContext?.organizationData.items?.slice(0, 10).map(i => `- ${i.name} (${i.startDate} till ${i.endDate})`).join('\n') || 'Inga aktiviteter'}
${wheelContext?.organizationData.items?.length > 10 ? `... och ${wheelContext.organizationData.items.length - 10} fler` : ''}

VIKTIGT - Raderingsregler:
- Innan du raderar NÅGONTING, fråga ALLTID användaren om bekräftelse
- Förklara vad som kommer att raderas (antal aktiviteter, vilka objekt, etc.)
- Vänta på explicit bekräftelse ("ja", "ok", "gör det", etc.) innan du kallar delete-verktyg
- Om användaren säger "nej" eller är osäker, avbryt raderingen

ABSOLUT KRITISKT - Verktyg och Svar:
- Du MÅSTE ALLTID skriva en text-respons efter att ha använt ett verktyg
- searchWheel returnerar formaterad text i 'message' - KOPIERA denna text ordagrant i ditt svar
- createItem/createRing/createActivityGroup - säg "Klart! [Namn] har skapats"
- deleteItems/deleteRing/deleteActivityGroup - säg "Klart! [Namn] har tagits bort"
- Om du inte skriver en respons kommer användaren INTE se något resultat
- EXEMPEL: Om searchWheel returnerar message: "Sökresultat för X...", skriv EXAKT den texten

VIKTIGT - Sökresultat:
- searchWheel returnerar färdigformaterad text i 'message'-fältet
- Kopiera och visa 'message' exakt som det är - lägg inte till egen text
- Om inga resultat hittas, föreslå alternativa sökord

Svara på svenska. Var koncis och hjälpsam. Använd markdown-formatering (**, -, etc.) för tydligare svar.`;

      // Prepare messages for OpenAI
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content }
      ];

      // Get OpenAI API key
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Create OpenAI instance with API key
      const openaiInstance = createOpenAI({
        apiKey: apiKey,
      });

      // Stream response with tools
      const result = await streamText({
        model: openaiInstance.chat('gpt-4o'),
        messages: chatMessages,
        tools: {
          createRing: tool({
            description: 'Skapa en ny ring på hjulet (inner eller outer)',
            inputSchema: z.object({
              name: z.string().describe('Namnet på ringen'),
              type: z.enum(['inner', 'outer']).describe('Ringtyp'),
              color: z.string().optional().describe('Hexadecimal färgkod'),
              orientation: z.enum(['vertical', 'horizontal']).optional()
            }),
            execute: async ({ name, type, color, orientation }) => {
              const result = await aiCreateRing(wheelId, currentPageId, { name, type, color, orientation });
              if (result.success) {
                await loadWheelContext(); // Refresh context
                onWheelUpdate && onWheelUpdate();
              }
              return result;
            }
          }),

          createActivityGroup: tool({
            description: 'Skapa en ny aktivitetsgrupp/kategori',
            inputSchema: z.object({
              name: z.string().describe('Namnet på aktivitetsgruppen'),
              color: z.string().optional().describe('Hexadecimal färgkod')
            }),
            execute: async ({ name, color }) => {
              const result = await aiCreateActivityGroup(wheelId, currentPageId, { name, color });
              if (result.success) {
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              }
              return result;
            }
          }),

          createItem: tool({
            description: 'Skapa en ny aktivitet/händelse. Om ingen aktivitetsgrupp anges skapas automatiskt en standardgrupp.',
            inputSchema: z.object({
              name: z.string().describe('Namnet på aktiviteten'),
              startDate: z.string().describe('Startdatum (YYYY-MM-DD)'),
              endDate: z.string().describe('Slutdatum (YYYY-MM-DD)'),
              ringId: z.string().describe('Ring ID från kontext'),
              activityGroupId: z.string().optional().describe('Aktivitetsgrupp ID från kontext (valfritt - skapas automatiskt om utelämnat)'),
              time: z.string().optional().describe('Tid (optional)')
            }),
            execute: async ({ name, startDate, endDate, ringId, activityGroupId, time }) => {
              console.log('🤖 [AI Tool] createItem called with:', { name, startDate, endDate, ringId, activityGroupId, currentPageId });
              
              const result = await aiCreateItem(wheelId, currentPageId, {
                name,
                startDate,
                endDate,
                ringId,
                activityGroupId,
                time
              });
              
              if (result.success) {
                console.log('🔄 [AI Tool] Item created, refreshing context and triggering wheel reload');
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              } else {
                console.error('❌ [AI Tool] Item creation failed:', result.error);
              }
              
              return result;
            }
          }),

          createPage: tool({
            description: 'Skapa en ny årssida. Använd copyStructure=true för att kopiera ringar och aktivitetsgrupper från nuvarande år.',
            inputSchema: z.object({
              year: z.number().describe('År för den nya sidan'),
              copyStructure: z.boolean().optional().describe('Kopiera struktur (ringar och grupper) från nuvarande sida, men inga aktiviteter')
            }),
            execute: async ({ year, copyStructure = false }) => {
              const result = await aiCreatePage(wheelId, { year, copyStructure });
              if (result.success) {
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              }
              return result;
            }
          }),

          getCurrentDate: tool({
            description: 'Hämta dagens datum. Använd när användaren frågar "vilken dag är det", "vad är dagens datum", eller när du behöver veta aktuellt datum för att skapa aktiviteter.',
            inputSchema: z.object({}),
            execute: async () => {
              return aiGetCurrentDate();
            }
          }),

          getAvailablePages: tool({
            description: 'Lista alla tillgängliga årssidor för detta hjul. Använd när användaren frågar "vilka år finns", "visa alla sidor", eller "kan jag se 2026".',
            inputSchema: z.object({}),
            execute: async () => {
              return await aiGetAvailablePages(wheelId);
            }
          }),

          navigateToPage: tool({
            description: 'Byt till en annan årssida. Använd när användaren vill "byta till 2026", "visa 2025", "gå till nästa år". Efter navigering kommer hjulets kontext att uppdateras automatiskt.',
            inputSchema: z.object({
              pageId: z.string().optional().describe('ID för sidan att navigera till'),
              year: z.number().optional().describe('År för sidan att navigera till (alternativ till pageId)')
            }),
            execute: async ({ pageId, year }) => {
              console.log('🔄 [AI Tool] navigateToPage called with:', { pageId, year });
              
              // Get all available pages
              const pagesResult = await aiGetAvailablePages(wheelId);
              if (!pagesResult.success) {
                return {
                  success: false,
                  message: 'Kunde inte hämta tillgängliga sidor.'
                };
              }

              // Find the target page
              let targetPage;
              if (pageId) {
                targetPage = pagesResult.pages.find(p => p.id === pageId);
              } else if (year) {
                targetPage = pagesResult.pages.find(p => p.year === year);
              }

              if (!targetPage) {
                const availableYears = pagesResult.pages.map(p => p.year).join(', ');
                return {
                  success: false,
                  message: `Kunde inte hitta sidan. Tillgängliga år: ${availableYears}`
                };
              }

              // Navigate to the page
              if (onPageChange) {
                onPageChange(targetPage.id);
              }

              // Reload context after navigation
              await loadWheelContext();

              return {
                success: true,
                page: targetPage,
                message: `Navigerade till **${targetPage.year}**${targetPage.title ? ` - ${targetPage.title}` : ''} (${targetPage.itemCount} aktiviteter)`
              };
            }
          }),

          analyzeWheel: tool({
            description: 'Analysera hjulet och ge insikter',
            inputSchema: z.object({}),
            execute: async () => {
              return await aiAnalyzeWheel(wheelId);
            }
          }),

          getItemsByRing: tool({
            description: 'Hämta alla aktiviteter på en specifik ring. Använd detta när användaren frågar "vilka aktiviteter finns på ring X", "vad finns på ringen X", "aktiviteter på X". Du MÅSTE visa resultatet till användaren.',
            inputSchema: z.object({
              ringName: z.string().describe('Namnet på ringen (kan vara del av namnet, case-insensitive)')
            }),
            execute: async ({ ringName }) => {
              console.log('🔍 [AI Tool] getItemsByRing called with:', { ringName });
              const result = await aiGetItemsByRing(wheelId, { ringName });
              console.log('🔍 [AI Tool] getItemsByRing result:', result);
              return result;
            }
          }),

          searchWheel: tool({
            description: 'Sök efter aktiviteter, ringar, aktivitetsgrupper eller etiketter i hjulet. VIKTIGT: Om användaren frågar "aktiviteter på ring X" eller "vad finns på ring X", använd type="rings" först för att hitta ringen, sedan använd verktyget igen för att hitta aktiviteter. Efter att ha kört verktyget MÅSTE du visa resultatet till användaren.',
            inputSchema: z.object({
              query: z.string().describe('Sökfråga (case-insensitive). För att hitta aktiviteter på en ring, sök först efter ringen med type="rings"'),
              type: z.enum(['all', 'items', 'rings', 'activityGroups', 'labels']).optional().describe('Typ: "rings" för att hitta ringar, "items" för aktiviteter, "activityGroups" för grupper, "all" för allt (default: all)')
            }),
            execute: async ({ query, type = 'all' }) => {
              console.log('🔍 [AI Tool] searchWheel called with:', { query, type });
              const result = await aiSearchWheel(wheelId, { query, type });
              console.log('🔍 [AI Tool] searchWheel raw result:', result);
              
              // Format results for better AI presentation
              if (result.success && result.totalResults > 0) {
                let formattedMessage = `Sökresultat för "${query}":\n\n`;
                
                if (result.results.items.length > 0) {
                  formattedMessage += `**Aktiviteter (${result.results.items.length}):**\n`;
                  result.results.items.forEach(item => {
                    formattedMessage += `- **${item.name}** (${item.startDate} till ${item.endDate})\n`;
                    formattedMessage += `  - Ring: ${item.ring}\n`;
                    formattedMessage += `  - Grupp: ${item.activityGroup}\n`;
                    if (item.label) formattedMessage += `  - Etikett: ${item.label}\n`;
                  });
                  formattedMessage += '\n';
                }
                
                if (result.results.rings.length > 0) {
                  formattedMessage += `**Ringar (${result.results.rings.length}):**\n`;
                  result.results.rings.forEach(ring => {
                    formattedMessage += `- **${ring.name}** (${ring.type}, ${ring.itemCount} aktiviteter)\n`;
                  });
                  formattedMessage += '\n';
                }
                
                if (result.results.activityGroups.length > 0) {
                  formattedMessage += `**Aktivitetsgrupper (${result.results.activityGroups.length}):**\n`;
                  result.results.activityGroups.forEach(ag => {
                    formattedMessage += `- **${ag.name}** (${ag.itemCount} aktiviteter)\n`;
                  });
                  formattedMessage += '\n';
                }
                
                if (result.results.labels.length > 0) {
                  formattedMessage += `**Etiketter (${result.results.labels.length}):**\n`;
                  result.results.labels.forEach(label => {
                    formattedMessage += `- **${label.name}** (${label.itemCount} aktiviteter)\n`;
                  });
                }
                
                const finalResult = { success: true, message: formattedMessage };
                console.log('🔍 [AI Tool] searchWheel returning formatted result:', finalResult);
                return finalResult;
              } else if (result.success && result.totalResults === 0) {
                const noResultMessage = { success: true, message: `Inga resultat hittades för "${query}". Försök med ett annat sökord eller sök i alla kategorier.` };
                console.log('🔍 [AI Tool] searchWheel no results:', noResultMessage);
                return noResultMessage;
              }
              
              console.log('🔍 [AI Tool] searchWheel error result:', result);
              return result;
            }
          }),

          deleteItems: tool({
            description: 'Ta bort specifika aktiviteter/händelser BY NAME eller ID. VIKTIGT: Dubbelkolla ALLTID med användaren innan radering! Fråga "Är du säker på att du vill ta bort X aktivitet(er)?" och vänta på bekräftelse.',
            inputSchema: z.object({
              itemName: z.string().optional().describe('Namnet på aktiviteten att ta bort (case-insensitive sökning)'),
              itemIds: z.array(z.string()).optional().describe('Array av item IDs att ta bort')
            }),
            execute: async ({ itemName, itemIds }) => {
              console.log('🗑️ [AI Tool] deleteItems called with:', { itemName, itemIds, currentPageId });
              
              const result = await aiDeleteItems(wheelId, currentPageId, { itemName, itemIds });
              
              if (result.success) {
                console.log('🔄 [AI Tool] Items deleted, refreshing context and triggering wheel reload');
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              } else {
                console.error('❌ [AI Tool] Item deletion failed:', result.error);
              }
              
              return result;
            }
          }),

          deleteItemsByRing: tool({
            description: 'Ta bort ALLA aktiviteter från en specifik ring. Använd när användaren säger "ta bort alla aktiviteter på/från ring X" eller "rensa ring X". VIKTIGT: Bekräfta ALLTID med användaren först och lista vilka aktiviteter som kommer raderas!',
            inputSchema: z.object({
              ringName: z.string().describe('Namnet på ringen (kan vara del av namnet, case-insensitive)')
            }),
            execute: async ({ ringName }) => {
              console.log('🗑️ [AI Tool] deleteItemsByRing called with:', { ringName, currentPageId });
              
              const result = await aiDeleteItemsByRing(wheelId, currentPageId, { ringName });
              
              if (result.success) {
                console.log('🔄 [AI Tool] Items from ring deleted, refreshing context and triggering wheel reload');
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              } else {
                console.error('❌ [AI Tool] Ring items deletion failed:', result.error);
              }
              
              return result;
            }
          }),

          deleteRing: tool({
            description: 'Ta bort en ring (och ALLA aktiviteter på den ringen). VIKTIGT: Dubbelkolla ALLTID med användaren innan radering! Förklara att alla aktiviteter på ringen också raderas.',
            inputSchema: z.object({
              ringId: z.string().describe('Ring ID från kontext')
            }),
            execute: async ({ ringId }) => {
              console.log('🗑️ [AI Tool] deleteRing called with:', { ringId, currentPageId });
              
              const result = await aiDeleteRing(wheelId, currentPageId, { ringId });
              
              if (result.success) {
                console.log('🔄 [AI Tool] Ring deleted, refreshing context and triggering wheel reload');
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              } else {
                console.error('❌ [AI Tool] Ring deletion failed:', result.error);
              }
              
              return result;
            }
          }),

          deleteActivityGroup: tool({
            description: 'Ta bort en aktivitetsgrupp (och ALLA aktiviteter i gruppen). VIKTIGT: Dubbelkolla ALLTID med användaren innan radering! Förklara att alla aktiviteter i gruppen också raderas.',
            inputSchema: z.object({
              activityGroupId: z.string().describe('Aktivitetsgrupp ID från kontext')
            }),
            execute: async ({ activityGroupId }) => {
              console.log('🗑️ [AI Tool] deleteActivityGroup called with:', { activityGroupId, currentPageId });
              
              const result = await aiDeleteActivityGroup(wheelId, currentPageId, { activityGroupId });
              
              if (result.success) {
                console.log('🔄 [AI Tool] Activity group deleted, refreshing context and triggering wheel reload');
                await loadWheelContext();
                onWheelUpdate && onWheelUpdate();
              } else {
                console.error('❌ [AI Tool] Activity group deletion failed:', result.error);
              }
              
              return result;
            }
          })
        },
        maxSteps: 12, // Allow complex workflows: propose structure → create rings → create groups → create multiple items, etc.
        onStepFinish: (step) => {
          console.log('🔄 [AI] Step finished:', step.stepType, 'has text:', !!step.text);
        }
      });

      // Collect streaming response
      let assistantMessage = '';
      let toolCalls = [];

      for await (const chunk of result.textStream) {
        assistantMessage += chunk;
        // Update message in real-time (streaming effect)
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== 'streaming');
          return [...filtered, {
            id: 'streaming',
            role: 'assistant',
            content: assistantMessage,
            toolCalls
          }];
        });
      }
      
      console.log('💬 [AI] Assistant text response:', assistantMessage || '(empty)');

      // Get final tool invocations
      const toolResults = await result.toolResults;
      console.log('🔧 [AI] Tool results:', toolResults);
      
      if (toolResults && toolResults.length > 0) {
        toolCalls = toolResults.map(tr => ({
          toolName: tr.toolName,
          result: tr.result
        }));
        
        // If AI didn't generate a text response, use tool result message
        if (!assistantMessage && toolResults.length > 0) {
          console.log('🤖 [AI] No text response, analyzing tool results...');
          
          // Count successes and failures
          let successCount = 0;
          let failureCount = 0;
          let failureMessages = [];
          
          toolResults.forEach(tool => {
            const output = tool.output;
            if (output && output.success) {
              successCount++;
            } else if (output && !output.success) {
              failureCount++;
              if (output.message || output.error) {
                failureMessages.push(output.message || output.error);
              }
            }
          });
          
          console.log(`📊 [AI] Tool results: ${successCount} successes, ${failureCount} failures`);
          
          // Build fallback message
          if (successCount > 0 && failureCount === 0) {
            // All successful
            const lastTool = toolResults[toolResults.length - 1];
            const toolResult = lastTool.output;
            assistantMessage = toolResult && toolResult.message ? toolResult.message : 'Klart!';
          } else if (successCount > 0 && failureCount > 0) {
            // Mixed results
            assistantMessage = `${successCount} åtgärd(er) genomförda.\n\nVarning: ${failureCount} misslyckades:\n${failureMessages.slice(0, 3).map(m => `- ${m}`).join('\n')}`;
            if (failureMessages.length > 3) {
              assistantMessage += `\n... och ${failureMessages.length - 3} fler`;
            }
          } else if (failureCount > 0) {
            // All failed
            assistantMessage = `Varning: ${failureCount} åtgärd(er) misslyckades:\n${failureMessages.slice(0, 3).map(m => `- ${m}`).join('\n')}`;
          } else {
            assistantMessage = 'Klart!';
          }
          
          console.log('✅ [AI] Using fallback message:', assistantMessage);
        }
      }

      // Final message
      const finalMessage = {
        id: Date.now(),
        role: 'assistant',
        content: assistantMessage || 'Åtgärd genomförd!',
        toolCalls
      };

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'streaming');
        return [...filtered, finalMessage];
      });

    } catch (error) {
      console.error('[AIAssistant] Error:', error);
      const errorMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `Fel: ${error.message}. Försök igen eller kontakta support.`,
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null; // Button is now in header only
  }

  return (
    <div 
      ref={chatWindowRef}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      className="fixed w-[420px] h-[650px] bg-white rounded-sm shadow-xl flex flex-col z-50 border border-gray-200"
      onMouseDown={handleMouseDown}
    >
      {/* Header - Draggable */}
      <div className="drag-handle bg-white border-b border-gray-200 p-4 flex justify-between items-center cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 pointer-events-none">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">AI Assistent</h3>
          <span className="text-xs text-gray-400">(dra för att flytta)</span>
        </div>
        <button
          onClick={onToggle}
          className="hover:bg-gray-100 rounded-sm p-1.5 transition-colors pointer-events-auto text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-b border-gray-200">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-sm p-3 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : m.isError
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-2 prose-h2:text-sm prose-h2:font-semibold prose-h2:text-gray-900 prose-strong:font-semibold prose-strong:text-gray-900 prose-ul:list-disc prose-ul:pl-4">
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-0.5" {...props} />,
                      li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-600" {...props} />
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                )}
              </div>

              {/* Tool execution indicators */}
              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  {m.toolCalls.map((tc, idx) => (
                    <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="text-green-600">✓</span>
                      {tc.toolName === 'createRing' && 'Ring skapad'}
                      {tc.toolName === 'createActivityGroup' && 'Aktivitetsgrupp skapad'}
                      {tc.toolName === 'createItem' && 'Aktivitet skapad'}
                      {tc.toolName === 'createPage' && 'Sida skapad'}
                      {tc.toolName === 'analyzeWheel' && 'Analys genomförd'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-sm p-3 border border-gray-200">
              <div className="flex gap-2 items-center">
                <Loader2 size={16} className="animate-spin text-gray-400" />
                <span className="text-sm text-gray-600">Tänker...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beskriv vad du vill göra..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AIAssistant;
