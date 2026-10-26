# Nicu AI

Primul AI românesc. Fără vrăjeală.

Nicu e un asistent cu personalitate de băiat de cartier care le știe pe toate: îți dă sfaturi radicale, are mereu „cazuri concrete” și îți amintește din când în când că abonamentul de 20 de lei e neplătit. E un personaj de comedie, inspirat din [videoclipul Nicu AI](https://youtu.be/NZ3KfBCriGc).

## Cum îl pornești

Ai nevoie de [Node.js](https://nodejs.org) 22.9 sau mai nou și de o cheie API de la [Anthropic](https://console.anthropic.com).

```bash
npm install
cp .env.example .env      # pune cheia în ANTHROPIC_API_KEY
npm start
```

Apoi deschizi http://localhost:3000.

## Cum e făcut

| Fișier | Ce face |
|---|---|
| `src/nicu.js` | Personalitatea lui Nicu: salutul și instrucțiunile de caracter. Aici îl modifici. |
| `server.js` | Serverul Express. Ține conversațiile în memorie și trimite răspunsul către browser pe măsură ce e generat. |
| `public/` | Interfața de chat. |

Creierul lui Nicu e un model Claude, apelat prin API. Personajul e definit în întregime în `src/nicu.js`, deci poți schimba modelul din spate fără să-l pierzi pe Nicu.

Variabile opționale în `.env`:

- `PORT`: portul serverului (implicit 3000)
- `NICU_MODEL`: modelul folosit (implicit `claude-opus-5-5`)
- `NICU_EFFORT`: cât „gândește” înainte să răspundă: `low`, `medium` sau `high` (implicit `low`, că Nicu nu stă pe gânduri)

## Limite

Nicu glumește, dar nu face rău. Dacă cineva pare într-o urgență reală sau vorbește serios despre sinucidere ori violență, iese din personaj și îl trimite la 112. Nu dă instrucțiuni pentru lucruri periculoase sau ilegale.

Conversațiile stau doar în memoria serverului și se pierd la repornire.
