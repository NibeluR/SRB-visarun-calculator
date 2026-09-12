# Serbia Visarun Calculator

A small static web tool that helps travelers (mainly from Russia and Belarus) track their 30-day visa-free stay in Serbia and know exactly when they need to do a "visarun" (leave and re-enter the country to reset the clock).

Live at: serbiavisarun (see repo/site for current domain)

## What it does

- **Date picker** — enter the date of your last entry into Serbia (via [Flatpickr](https://flatpickr.js.org/), Russian locale).
- **Day counter** — calculates how many of your 30 visa-free days remain, or how many days you've overstayed.
- **Deadline display** — shows the exact date (with weekday) by which you must leave the country.
- **Calendar reminder** — once a valid date is calculated, a bell button lets you download an `.ics` file with a reminder event for your departure date, importable into any calendar app.
- **FAQ section** — brief explainer (in Russian) on the 30-day visa-free rule for Russian/Belarusian citizens and the "Beli Karton" (White Card) police registration requirement.
- **Donate section** — an overlay with donation links (RUB via T-Bank, foreign currency via DonationAlerts) to support the author.
- **Mini-game ("8-Bit Визаранщик")** — a bonus Canvas-based endless-runner game (jump over obstacles, collect stars) accessible via a joystick button, lazy-loaded only when opened. Landscape orientation is recommended on mobile.
- **Social links** — Telegram, GitHub, LinkedIn icons in the footer.

## Tech stack

- Plain HTML/CSS/JavaScript, no build step or framework — everything runs client-side.
- [Flatpickr](https://flatpickr.js.org/) (via CDN) for the date input.
- [Bootstrap Icons](https://icons.getbootstrap.com/) (via CDN) for the notification bell icon.
- Native Canvas API for the mini-game (no external game engine).
- Native `.ics` file generation for calendar export (no calendar API dependency).

## File structure

```
index.html          Main page: calculator, FAQ, donate overlay, calendar export, game loader
landing.css          Styles for the landing page
background.jpg       Page background image
favicon.png          Site favicon
github.png / linkedin.png / telegram.png   Social icon images
notify.png           Notification-related image asset
BingSiteAuth.xml     Bing Webmaster Tools verification
google2694d2c610100c78.html   Google Search Console verification

game/                Bonus mini-game ("Визаранщик" runner)
  gamescript.js      Game logic (Canvas-based endless runner)
  gamestyles.css     Game overlay/canvas styling
  bottle1.png, bottle2.png, bottle3.png   Obstacle/collectible sprites
  car1.png, car2.png, car3.png            Player character variants
  human.png, box.png, cloud.png, star.png Sprites
  rotate.png           "Rotate your phone" prompt icon
  jump.wav, star.wav, fail.wav   Sound effects
```

## Running locally

No build tools required — just open `index.html` in a browser, or serve the folder with any static file server, e.g.:

```
npx serve .
```

## Author

Created by Denis Bykovski, 2023–present.
- Telegram: [@nibelur](https://t.me/nibelur)
- GitHub: [NibeluR](https://github.com/NibeluR)
- LinkedIn: [denisbykovski](https://www.linkedin.com/in/denisbykovski/)
