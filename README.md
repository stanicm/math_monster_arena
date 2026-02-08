# Math Monster Arena

A Space Invaders-style math game where you fly a creature through space, solve math problems, and evolve into increasingly powerful forms.

Built with vanilla JavaScript, HTML5 Canvas, and CSS — no dependencies, no build step.

## How to Play

Open `index.html` in any modern web browser. That's it.

### Controls

| Key | Action |
|---|---|
| Arrow Keys / WASD | Move your creature |
| Space | Shoot beams |
| Escape | Pause / Resume |

### Gameplay

- Math problems appear at the top of the screen (addition and subtraction).
- Answer bubbles fall from above — shoot the **correct answer** to earn XP.
- Avoid **asteroids** and **wrong answers** — they cost you health.
- Answer **10 questions** to level up. Difficulty scales with your level.

### Creature Evolution

As you level up, your creature evolves through 5 stages:

1. **Hatchling** — where every math monster begins
2. **Sparky** — gaining energy and confidence
3. **Blazer** — fire-powered and fast
4. **Stormclaw** — lightning strikes twice
5. **Legendragon** — the ultimate math beast

Your weapon also upgrades through 5 tiers as you progress.

### Achievements

| Badge | Name | Requirement |
|---|---|---|
| ⚡5 | Hot Streak | 5 correct answers in a row |
| 🌟10 | Super Streak | 10 correct answers in a row |
| 💨 | Speed Demon | 10 fast answers |
| 💎 | Perfect 10 | 10 correct, 0 wrong in a level |
| 💯 | Century Club | 100 total problems solved |

### Save & Load

Press **Escape** to pause, then use the **Save Game** / **Load Game** buttons. Progress is stored in your browser's localStorage.

## Project Structure

```
├── index.html      — Main HTML entry point
├── game.js         — Game engine, logic, and state management
├── creatures.js    — Canvas rendering for creatures and entities
├── style.css       — UI styling
└── .gitignore
```

## License

This project is provided as-is for educational and personal use.
