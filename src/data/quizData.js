/**
 * Quiz configurations for different personas
 * Each quiz follows the framework:
 * 1. Best practices (3 questions)
 * 2. Current situation (2 questions)
 * 3. Desired outcome (2 questions)
 * 4. Obstacles (2 questions)
 * 5. Solution fit (1 question)
 */

export const marketingQuiz = {
  persona: 'marketing',
  questions: [
    // Best Practices (3 questions)
    {
      id: 'practice_1',
      category: 'Best Practice',
      question: 'Hur långt i förväg planerar du vanligtvis era marknadsföringskampanjer?',
      type: 'single',
      options: [
        { text: 'Hela året i förväg med kvartalsvis revidering', score: 5 },
        { text: '3-6 månader i förväg', score: 3 },
        { text: '1-2 månader i förväg', score: 2 },
        { text: 'Vecka för vecka eller ännu kortare', score: 1 }
      ]
    },
    {
      id: 'practice_2',
      category: 'Best Practice',
      question: 'Hur koordinerar ni innehåll mellan olika kanaler (sociala medier, blogg, nyhetsbrev)?',
      type: 'single',
      options: [
        { text: 'Vi har en central innehållskalender som alla följer', score: 5 },
        { text: 'Vi använder Excel/Sheets som delas mellan teamet', score: 3 },
        { text: 'Varje kanal planeras separat av ansvarig person', score: 1 },
        { text: 'Det är mest ad-hoc, vi planerar inte så mycket', score: 0 }
      ]
    },
    {
      id: 'practice_3',
      category: 'Best Practice',
      question: 'Hur ofta rapporterar ni marknadsplaner till ledning eller kunder?',
      type: 'single',
      options: [
        { text: 'Månadsvis med tydliga visuella rapporter', score: 5 },
        { text: 'Kvartalsvis vid uppföljningsmöten', score: 3 },
        { text: 'Vid behov, oftast muntligt', score: 1 },
        { text: 'Vi rapporterar sällan eller aldrig framåtblickande planer', score: 0 }
      ]
    },

    // Current Situation (2 questions)
    {
      id: 'pain_current_1',
      category: 'Din nuvarande situation',
      question: 'Vilka av dessa utmaningar upplever du mest? (välj alla som stämmer)',
      type: 'multiple',
      options: [
        { text: 'Svårt att få överblick över alla kampanjer och aktiviteter', score: 4 },
        { text: 'Teamet tappar koll på vad som händer när', score: 3 },
        { text: 'Tar för lång tid att skapa presentationer för ledningen', score: 3 },
        { text: 'Innehållskalendern i Excel blir snabbt oöverskådlig', score: 3 },
        { text: 'Dålig samordning mellan olika kanaler och kampanjer', score: 4 }
      ]
    },
    {
      id: 'pain_current_2',
      category: 'Din nuvarande situation',
      question: 'Hur mycket tid lägger du/teamet på att administrera marknadsplaner och kalendrar per vecka?',
      type: 'single',
      options: [
        { text: 'Mindre än 1 timme - vi har effektiva system', score: 1 },
        { text: '1-3 timmar - hanterbart men kunde vara bättre', score: 3 },
        { text: '4-6 timmar - tar för mycket tid', score: 5 },
        { text: 'Mer än 6 timmar - det är en stor tidsåtgång', score: 7 }
      ]
    },

    // Desired Outcome (2 questions)
    {
      id: 'outcome_1',
      category: 'Önskat resultat',
      question: 'Vad skulle vara det viktigaste resultatet för dig med ett bättre planeringsverktyg?',
      type: 'single',
      options: [
        { text: 'Bättre överblick och färre missade deadlines', score: 5 },
        { text: 'Enklare samarbete i teamet', score: 4 },
        { text: 'Snabbare och snyggare rapporter till ledning/kunder', score: 4 },
        { text: 'Mer tid till kreativt arbete istället för administration', score: 5 }
      ]
    },
    {
      id: 'outcome_2',
      category: 'Önskat resultat',
      question: 'Hur skulle framgång se ut för dig om 3 månader?',
      type: 'single',
      options: [
        { text: 'Hela teamet har samma bild av marknadsplanen', score: 5 },
        { text: 'Vi kan producera snygg årsöversikt på 10 minuter', score: 4 },
        { text: 'Alla kampanjer är koordinerade mellan kanaler', score: 4 },
        { text: 'Stakeholders är imponerade av våra presentationer', score: 3 }
      ]
    },

    // Obstacles (2 questions)
    {
      id: 'obstacle_1',
      category: 'Hinder',
      question: 'Vad hindrar er mest från att ha den perfekta marknadsplaneringen idag?',
      type: 'single',
      options: [
        { text: 'Vi har inget verktyg som passar våra behov', score: 5 },
        { text: 'Nuvarande verktyg är för komplicerade eller för enkla', score: 4 },
        { text: 'Teamet använder olika system och metoder', score: 4 },
        { text: 'Vi har inte tid att sätta upp något nytt', score: 3 }
      ]
    },
    {
      id: 'obstacle_2',
      category: 'Hinder',
      question: 'Hur viktigt är det att ett planeringsverktyg är visuellt och lätt att dela?',
      type: 'single',
      options: [
        { text: 'Kritiskt - vi behöver imponera på kunder/ledning', score: 5 },
        { text: 'Mycket viktigt - visuell kommunikation är key', score: 4 },
        { text: 'Ganska viktigt - skulle underlätta', score: 2 },
        { text: 'Inte så viktigt - funktion före form', score: 1 }
      ]
    },

    // Solution Fit (1 question)
    {
      id: 'readiness_solution',
      category: 'Lösning',
      question: 'Om du kunde få ett verktyg som visar hela årets marknadsplan i ett visuellt årshjul, med AI-assistans och enkel export - vad skulle du säga?',
      type: 'single',
      options: [
        { text: 'Vi behöver det NU - när kan vi börja?', score: 10 },
        { text: 'Låter perfekt för oss, skulle vilja testa', score: 7 },
        { text: 'Intressant, men måste se mer först', score: 4 },
        { text: 'Osäker om det passar oss', score: 1 }
      ]
    }
  ],
  resultMessages: {
    high: 'Baserat på dina svar ser vi att ni har stora möjligheter att förbättra er marknadsplanering! YearWheel kan spara er flera timmar i veckan och ge er den visuella översikt ni saknar.',
    medium: 'Ni är på rätt väg men det finns utrymme att effektivisera! YearWheel kan hjälpa er samordna kampanjer bättre och imponera på stakeholders.',
    low: 'Ni verkar ha en fungerande process redan! YearWheel kan ändå hjälpa er ta steget till nästa nivå med visuella presentationer och AI-assistans.'
  }
};

export const projectQuiz = {
  persona: 'project',
  questions: [
    // Best Practices (3 questions)
    {
      id: 'practice_1',
      category: 'Best Practice',
      question: 'Vilket projektledningsverktyg använder ni idag?',
      type: 'single',
      options: [
        { text: 'Asana, Monday eller liknande (känns för tungt)', score: 3 },
        { text: 'Excel/Google Sheets', score: 2 },
        { text: 'En blandning av olika verktyg', score: 1 },
        { text: 'Inget strukturerat system', score: 0 }
      ]
    },
    {
      id: 'practice_2',
      category: 'Best Practice',
      question: 'Hur många parallella projekt hanterar ni samtidigt?',
      type: 'single',
      options: [
        { text: '1-2 projekt', score: 1 },
        { text: '3-5 projekt', score: 3 },
        { text: '6-10 projekt', score: 4 },
        { text: 'Mer än 10 projekt', score: 5 }
      ]
    },
    {
      id: 'practice_3',
      category: 'Best Practice',
      question: 'Hur ofta visar ni projektöversikter för kunder eller ledning?',
      type: 'single',
      options: [
        { text: 'Varje vecka eller oftare', score: 5 },
        { text: 'Varje månad', score: 4 },
        { text: 'Kvartalsvis', score: 2 },
        { text: 'Sällan eller aldrig', score: 1 }
      ]
    },

    // Current Situation (2 questions)
    {
      id: 'pain_current_1',
      category: 'Din nuvarande situation',
      question: 'Vilka utmaningar har ni? (välj alla som stämmer)',
      type: 'multiple',
      options: [
        { text: 'Svårt att se alla projekt och deras tidslinjer samtidigt', score: 4 },
        { text: 'Resurser bokas dubbelt mellan projekt', score: 4 },
        { text: 'Kunder vill ha enkel översikt, inte Gantt-diagram', score: 3 },
        { text: 'Projektstatus-möten tar för lång tid', score: 3 },
        { text: 'Vi saknar verktyg mellan Excel och Asana', score: 5 }
      ]
    },
    {
      id: 'pain_current_2',
      category: 'Din nuvarande situation',
      question: 'Hur stor andel av er projekttid går åt till administration och planering?',
      type: 'single',
      options: [
        { text: 'Under 10% - vi är effektiva', score: 1 },
        { text: '10-20% - acceptabelt', score: 2 },
        { text: '20-30% - för mycket', score: 4 },
        { text: 'Över 30% - stort problem', score: 6 }
      ]
    },

    // Desired Outcome (2 questions)
    {
      id: 'outcome_1',
      category: 'Önskat resultat',
      question: 'Vad är viktigast för dig i ett projektplaneringsverktyg?',
      type: 'single',
      options: [
        { text: 'Enkel överblick över alla projekt samtidigt', score: 5 },
        { text: 'Snabb att uppdatera och dela med kunder', score: 4 },
        { text: 'Visuellt tilltalande presentationer', score: 3 },
        { text: 'Teamsamarbete utan komplexitet', score: 4 }
      ]
    },
    {
      id: 'outcome_2',
      category: 'Önskat resultat',
      question: 'Hur skulle framgång se ut för er om 3 månader?',
      type: 'single',
      options: [
        { text: 'Inga resurskrockar mellan projekt', score: 5 },
        { text: 'Kunder älskar våra projektpresentationer', score: 4 },
        { text: 'Mindre tid på administration, mer på leverans', score: 5 },
        { text: 'Teamet vet alltid vad som händer när', score: 4 }
      ]
    },

    // Obstacles (2 questions)
    {
      id: 'obstacle_1',
      category: 'Hinder',
      question: 'Varför har ni inte det perfekta projektplaneringsverktyget idag?',
      type: 'single',
      options: [
        { text: 'Asana/Monday är överdimensionerat för våra behov', score: 5 },
        { text: 'Excel är för simpelt och blir snabbt rörigt', score: 4 },
        { text: 'Vi har inte hittat något i mellanrummet', score: 5 },
        { text: 'Budget eller tid för implementation', score: 3 }
      ]
    },
    {
      id: 'obstacle_2',
      category: 'Hinder',
      question: 'Hur viktigt är det att verktyget är lätt att lära sig?',
      type: 'single',
      options: [
        { text: 'Kritiskt - vi har inte tid för omfattande onboarding', score: 5 },
        { text: 'Mycket viktigt - ska gå snabbt att komma igång', score: 4 },
        { text: 'Viktigt men vi kan lägga lite tid', score: 2 },
        { text: 'Inte så viktigt', score: 1 }
      ]
    },

    // Solution Fit (1 question)
    {
      id: 'readiness_solution',
      category: 'Lösning',
      question: 'Om du kunde visualisera alla dina projekt i ett årshjul, dra-och-släpp milstolpar, och exportera snygga presentationer - vad säger du?',
      type: 'single',
      options: [
        { text: 'Det är exakt vad vi behöver!', score: 10 },
        { text: 'Låter som drömverktyget, vill testa', score: 7 },
        { text: 'Intressant, men vill se demo först', score: 4 },
        { text: 'Osäker', score: 1 }
      ]
    }
  ],
  resultMessages: {
    high: 'Perfekt match! Baserat på dina svar verkar YearWheel vara exakt det mellanläge mellan Excel och Asana som ni saknar. Ni kan spara massor av tid på projektadministration.',
    medium: 'Ni skulle verkligen kunna ha nytta av YearWheel! Särskilt för att få bättre överblick och imponera på kunder med visuella projektplaner.',
    low: 'Era behov kanske inte är så stora just nu, men YearWheel kan ändå hjälpa er ta projektplaneringen till nästa nivå med minimal insats.'
  }
};

export const educationQuiz = {
  persona: 'education',
  questions: [
    // Best Practices (3 questions)
    {
      id: 'practice_1',
      category: 'Best Practice',
      question: 'Hur planerar ni läsåret idag?',
      type: 'single',
      options: [
        { text: 'Vi har en tydlig digital kalender som alla följer', score: 5 },
        { text: 'Vi använder Excel/Sheets eller Word-dokument', score: 3 },
        { text: 'Blandat mellan olika system och papper', score: 1 },
        { text: 'Mest baserat på förra årets planering', score: 2 }
      ]
    },
    {
      id: 'practice_2',
      category: 'Best Practice',
      question: 'Hur stor är din organisation?',
      type: 'single',
      options: [
        { text: 'Jag är ensam lärare', score: 1 },
        { text: 'Ett arbetslag (2-5 lärare)', score: 2 },
        { text: 'En hel skola som rektor/ledare', score: 4 },
        { text: 'Flera skolor/kommunal förvaltning', score: 5 }
      ]
    },
    {
      id: 'practice_3',
      category: 'Best Practice',
      question: 'Hur ofta kommunicerar ni läsårsplanen med föräldrar?',
      type: 'single',
      options: [
        { text: 'Vid terminsstart och vid behov', score: 3 },
        { text: 'Varje termin med uppdateringar', score: 4 },
        { text: 'Kontinuerligt via digitala kanaler', score: 5 },
        { text: 'Sällan, mest vid föräldramöten', score: 1 }
      ]
    },

    // Current Situation (2 questions)
    {
      id: 'pain_current_1',
      category: 'Din nuvarande situation',
      question: 'Vilka utmaningar upplever ni? (välj alla som stämmer)',
      type: 'multiple',
      options: [
        { text: 'Svårt att få helhetsbild av hela läsåret', score: 4 },
        { text: 'Utvecklingsdagar krockar med andra aktiviteter', score: 3 },
        { text: 'Olika lärare har olika system', score: 3 },
        { text: 'Föräldrar vill ha tydligare översikt', score: 4 },
        { text: 'Tidskrävande att kommunicera planen', score: 4 }
      ]
    },
    {
      id: 'pain_current_2',
      category: 'Din nuvarande situation',
      question: 'Hur mycket tid lägger ni på att planera och kommunicera läsåret?',
      type: 'single',
      options: [
        { text: 'Några timmar per läsår', score: 1 },
        { text: 'En dag eller två per läsår', score: 3 },
        { text: 'Flera dagar och löpande uppdateringar', score: 5 },
        { text: 'Det känns som ett ständigt pågående arbete', score: 7 }
      ]
    },

    // Desired Outcome (2 questions)
    {
      id: 'outcome_1',
      category: 'Önskat resultat',
      question: 'Vad skulle vara viktigast för dig med bättre läsårsplanering?',
      type: 'single',
      options: [
        { text: 'Tydlig helhetsbild för alla i arbetslaget', score: 5 },
        { text: 'Enkelt att dela med föräldrar', score: 4 },
        { text: 'Mindre administrativa uppgifter', score: 4 },
        { text: 'Professionell presentation för skolledning', score: 3 }
      ]
    },
    {
      id: 'outcome_2',
      category: 'Önskat resultat',
      question: 'Hur skulle framgång se ut nästa läsår?',
      type: 'single',
      options: [
        { text: 'Alla lärare och föräldrar vet vad som händer när', score: 5 },
        { text: 'Inga krockar mellan prov, utvecklingsdagar och aktiviteter', score: 5 },
        { text: 'Snabbt ta fram uppdaterad översikt när behov uppstår', score: 4 },
        { text: 'Föräldrar och elever känner sig trygga med planen', score: 4 }
      ]
    },

    // Obstacles (2 questions)
    {
      id: 'obstacle_1',
      category: 'Hinder',
      question: 'Vad hindrar er från att ha perfekt läsårsplanering idag?',
      type: 'single',
      options: [
        { text: 'Vi har inget bra verktyg för visuell planering', score: 5 },
        { text: 'Olika lärare använder olika metoder', score: 4 },
        { text: 'Svårt att få alla att uppdatera samma system', score: 3 },
        { text: 'Budget eller tekniska begränsningar', score: 3 }
      ]
    },
    {
      id: 'obstacle_2',
      category: 'Hinder',
      question: 'Hur viktigt är det att verktyget är enkelt nog för alla lärare?',
      type: 'single',
      options: [
        { text: 'Kritiskt - vi har olika teknisk mognad', score: 5 },
        { text: 'Mycket viktigt - måste vara intuitivt', score: 4 },
        { text: 'Ganska viktigt', score: 2 },
        { text: 'Vi är vana vid digitala verktyg', score: 1 }
      ]
    },

    // Solution Fit (1 question)
    {
      id: 'readiness_solution',
      category: 'Lösning',
      question: 'Om ni kunde få hela läsåret visuellt i ett årshjul, enkelt dela med föräldrar och samarbeta i arbetslaget - vad säger du?',
      type: 'single',
      options: [
        { text: 'Det vore perfekt! Var skriver jag på?', score: 10 },
        { text: 'Låter som precis vad vi behöver', score: 7 },
        { text: 'Intressant, skulle vilja se det i praktiken', score: 4 },
        { text: 'Osäker om det passar oss', score: 1 }
      ]
    }
  ],
  resultMessages: {
    high: 'Fantastiskt! Baserat på dina svar ser vi att YearWheel kan spara er massor av tid och ge både lärare, elever och föräldrar den tydlighet ni saknar.',
    medium: 'Ni skulle verkligen ha nytta av YearWheel! Särskilt för att få bättre överblick och enklare kommunikation med föräldrar.',
    low: 'Er planering verkar fungera ganska bra redan, men YearWheel kan ändå hjälpa er ta steget till mer visuell och professionell läsårsplanering.'
  }
};
