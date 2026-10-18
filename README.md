# My Planner

A personal planner that runs in the browser with no build step.

- **Calendar** with colour-coded categories (birthday, travel, bills, work, health, other)
- **Yearly, monthly and weekly repeats**, so a birthday appears every year
- **Checklists** per event, and a **day-by-day itinerary** for multi-day trips
- **Daily tasks** with a calendar that shows done, partly done and missed days
- **Weekly review** with stats and an optional friendly summary from OpenAI
- **Ask friend**: an AI chat that asks questions, then suggests events, checklists and itineraries
- **Reminders**: a banner in the app, plus browser notifications while the page is open
- **Backup**: download and restore your data as a JSON file

## Run it

Open `index.html` in a browser. That is all.

## Put it on GitHub

```bash
cd my-planner
git init
git add .
git commit -m "Add personal planner"
git branch -M main
git remote add origin https://github.com/<your-username>/my-planner.git
git push -u origin main
```

Create the empty repository `my-planner` on github.com first (no README, no .gitignore).

### Host it free with GitHub Pages

Repository, Settings, Pages, Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`, Save.
After a minute your planner is live at `https://<your-username>.github.io/my-planner/`.

## AI setup

Open ⚙️ Settings and paste your OpenAI API key. It is saved only in your browser (localStorage) and sent only to `api.openai.com`.
Never put the key in the code or commit it. Because this is a browser-only app, anyone with access to your browser profile can read it, so use a key with a low spending limit.

## Good to know

- Data is stored per browser. To move to another device, use Settings, Download backup, then Restore backup.
- Notifications only fire while the page is open. Reliable alerts when the page is closed need a backend or a mobile app.
- The AI helper plans from what you tell it. It does not browse the web.

## Ideas for next steps

Cloud sync (Supabase or Firebase), installable PWA with offline support, push reminders, web search for the AI.
