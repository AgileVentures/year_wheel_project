# Swedish Language Audit - Remaining English Text

## Summary
This document tracks all English text found in the UI that should be translated to Swedish.

## Completed ✅
- "New wheel" → "Nytt hjul" (all instances)
- Dashboard create button
- CreateWheelModal title and default value
- App.jsx default state values

## To Review

Run this command to find remaining English UI text:
```bash
# Search for common English UI words
grep -r -n --include="*.jsx" --include="*.js" \
  -E "(Create|Delete|Edit|Save|Cancel|Close|Add|Remove|Update|Loading|Error|Success|Back|Next|Previous|Submit|Confirm|Reset|Export|Import|Share|Invite|Member|Team|Settings|Profile|Sign|Log)" \
  src/components/ | grep -v "// " | grep -v "console\." | grep -v "className" | grep -v "import"
```

## Quick Translation Reference
- Create → Skapa
- Delete → Radera / Ta bort
- Edit → Redigera
- Save → Spara
- Cancel → Avbryt
- Close → Stäng
- Add → Lägg till
- Remove → Ta bort
- Update → Uppdatera
- Loading → Laddar
- Error → Fel
- Success → Lyckades / Framgång
- Back → Tillbaka
- Next → Nästa
- Previous → Föregående
- Submit → Skicka
- Confirm → Bekräfta
- Reset → Återställ
- Export → Exportera
- Import → Importera
- Share → Dela
- Invite → Bjud in
- Member → Medlem
- Team → Team
- Settings → Inställningar
- Profile → Profil
- Sign in → Logga in
- Sign out → Logga ut
- Sign up → Registrera
- Log in → Logga in
- Log out → Logga ut

## Notes
- Icon component imports (Edit2, Trash2, etc.) should remain in English
- CSS classNames should remain in English
- Console logs can remain in English (developer-facing)
- Comments can remain in English
- Variable names should remain in English
