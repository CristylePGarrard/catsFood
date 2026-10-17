# catsFood
A site for my partner and I to record our food experiences and work towards our goal of trying foods from all over the world 😃😋 

[Go to App](https://cristylepgarrard.github.io/catsFood/) 

---
## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open:

http://localhost:8000

Do not open `index.html` directly with `file://` because the browser will block the map data request.

---

---

                         ┌──────────────┐
                         │    FOOD      │
                         └──────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    ↓                       ↓
             ┌──────────────┐        ┌──────────────┐
             │   CUISINE    │        │    REGION    │
             │              │        │              │
             │ Indian       │        │ South India  │
             │ Vietnamese   │        │ Thailand     │
             │ Salvadoran   │        │ NYC          │
             └──────────────┘        └──────┬───────┘
                                            │
                                            ↓
                                  ┌──────────────────┐
                                  │ REGION GEOMETRY  │
                                  │                  │
                                  │ polygon          │
                                  │ multipolygon     │
                                  │ GeoJSON           │
                                  └────────┬─────────┘
                                           │
                                           ↓
                                    ┌────────────┐
                                    │   LEAFLET  │
                                    │    MAP     │
                                    └────────────┘

```
What food did we try?
→ Dosa
What cuisine?
→ Indian
Where is this food associated with?
→ South India
Does that region already exist?
→ Yes → reuse it
If not?
→ Create region → draw/save geometry
Restaurant?
→ Separate location information
```

---

```
🍜 Foods Tried
→ What have we eaten?
🌎 Countries
→ Where in the world have we explored?
🗺️ Regions
→ What cultural/geographic areas have we explored?
🥢 Cuisines
→ What culinary traditions have we explored?
```

---
````
                  GOOGLE SHEETS
                       │
                       │
                       ▼
              GOOGLE APPS SCRIPT
                 "tiny API"
                       │
                       │ JSON
                       ▼
              ┌─────────────────┐
              │                 │
              │  JAVASCRIPT     │
              │  APPLICATION    │
              │                 │
              └────────┬────────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        LEAFLET MAP          JOURNAL UI
             │                   │
             │                   │
             └─────────┬─────────┘
                       ▼
                  GITHUB PAGES
````
---
| Part            | Technology                   |         Cost |
| --------------- | ---------------------------- | -----------: |
| Website         | HTML/CSS/JavaScript          |           $0 |
| Hosting         | GitHub Pages                 |           $0 |
| Interactive map | Leaflet + GeoJSON            |           $0 |
| Database        | Google Sheets                |           $0 |
| API/backend     | Google Apps Script           |           $0 |
| Photos          | Google Drive                 | $0 initially |
| Food research   | Free web APIs/search sources | $0 initially |
| Python          | Optional local tools         |           $0 |
| Custom domain   | **Don't buy one yet**        |           $0 |
