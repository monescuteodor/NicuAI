# Nicu AI

Primul AI românesc. Fără vrăjeală.

Nicu e un asistent cu personalitate de băiat de cartier care le știe pe toate: îți dă sfaturi radicale, are mereu „cazuri concrete” și îți amintește din când în când că abonamentul de 20 de lei e neplătit. E un personaj de comedie, inspirat din [videoclipul Nicu AI](https://youtu.be/NZ3KfBCriGc).

## Cum îl pornești în rețeaua de acasă

Nicu rulează pe un calculator din casă. Telefoanele și laptopurile conectate la același Wi-Fi intră în browser și vorbesc cu el.

### 1. Instalezi ce trebuie (o singură dată)

- **Node.js** 22.9 sau mai nou: descarci varianta „LTS” de pe https://nodejs.org și o instalezi.
- **Git**: de pe https://git-scm.com (pe macOS e deja instalat sau ți-l cere singur).
- **O cheie Groq** (gratuită): îți faci cont pe https://console.groq.com, intri la „API Keys” și apeși „Create API Key”. Arată ca `gsk_...`. Copiaz-o imediat, că nu ți-o mai arată a doua oară.

### 2. Descarci proiectul

Deschizi un terminal (Windows: „PowerShell”; macOS: „Terminal”) și rulezi:

```bash
git clone https://github.com/monescuteodor/NicuAI.git
cd NicuAI
git checkout claude/nice-einstein-sa22hs
npm install
```

### 3. Pui cheia API

Copiezi fișierul de configurare:

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Deschizi `.env` cu orice editor de text (Notepad, TextEdit) și pui cheia după egal:

```
GROQ_API_KEY=gsk_cheia-ta
```

Cheia stă doar pe calculatorul tău. Cei care intră din rețea nu o văd.

### 4. Pornești

```bash
npm start
```

Vei vedea ceva de genul:

```
Nicu AI a pornit.
  Pe calculatorul ăsta:  http://localhost:3000
  Din rețeaua locală:    http://192.168.1.23:3000
```

- Pe calculatorul ăsta deschizi http://localhost:3000.
- Pe telefon sau alt laptop, conectat la **același Wi-Fi**, deschizi adresa de la „Din rețeaua locală”.

Ca să-l oprești, apeși `Ctrl+C` în terminal. Data viitoare pornești doar cu `cd NicuAI` și `npm start`.

### Dacă nu merge de pe telefon

- **Windows**: la prima pornire apare o fereastră de la Windows Firewall. Bifezi „Rețele private” și apeși „Permite accesul”. Dacă ai închis-o, cauți „Permite o aplicație prin Windows Firewall” și bifezi Node.js la „Privat”. Verifică și că rețeaua Wi-Fi e setată ca „Privată”, nu „Publică”.
- **macOS**: dacă te întreabă dacă „node” poate accepta conexiuni, apeși „Permite”.
- Telefonul trebuie să fie pe același Wi-Fi, nu pe date mobile și nu pe rețeaua de „Oaspeți” a routerului.
- Adresa se poate schimba după ce repornești routerul. Uită-te din nou la ce scrie la pornire.

## Cum e făcut

| Fișier | Ce face |
|---|---|
| `src/nicu.js` | Personalitatea lui Nicu: salutul și instrucțiunile de caracter. Aici îl modifici. |
| `server.js` | Serverul Express. Ține conversațiile în memorie și trimite răspunsul către browser pe măsură ce e generat. |
| `public/` | Interfața de chat. |

Creierul lui Nicu e un model open-source care rulează pe serverele [Groq](https://groq.com), apelat prin API. Groq are un plan gratuit, cu o limită de mesaje pe minut și pe zi. Dacă ți se termină, Nicu zice că „e coadă mare” și merge din nou după un timp. Personajul e definit în întregime în `src/nicu.js`, deci poți schimba modelul din spate fără să-l pierzi pe Nicu.

Variabile opționale în `.env`:

- `PORT`: portul serverului (implicit 3000)
- `HOST`: `0.0.0.0` îl face accesibil din rețeaua locală (implicit); `127.0.0.1` îl lasă doar pe calculatorul tău
- `NICU_MODEL`: modelul de pe Groq (implicit `openai/gpt-oss-120b`). Lista completă e la https://console.groq.com/docs/models. Alte variante bune de încercat: `moonshotai/kimi-k2-instruct`, `llama-3.3-70b-versatile`.
- `NICU_REASONING`: cât „gândește” înainte să răspundă, doar pentru modelele `gpt-oss`: `low`, `medium` sau `high` (implicit `low`, că Nicu nu stă pe gânduri)

## Limite

Nicu glumește, dar nu face rău. Dacă cineva pare într-o urgență reală sau vorbește serios despre sinucidere ori violență, iese din personaj și îl trimite la 112. Nu dă instrucțiuni pentru lucruri periculoase sau ilegale.

Conversațiile stau doar în memoria serverului și se pierd la repornire.

Nicu e făcut pentru rețeaua de acasă. Nu-l expune direct pe internet (port forwarding pe router): oricine ar găsi adresa ar putea vorbi cu el pe banii tăi.
