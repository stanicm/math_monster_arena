# Math Monster Arena

A Space Invaders-style math game where you pilot a spaceship through space, solve math problems, and upgrade into increasingly powerful ships.

Built with vanilla JavaScript, Three.js (3D), and CSS — no build step required.

## How to Play

Open `index.html` in any modern web browser. That's it.

### Controls

| Key | Action |
|---|---|
| Arrow Keys / WASD | Move your spaceship |
| Space | Shoot beams |
| Escape | Pause / Resume |

### Gameplay

- Math problems appear at the top of the screen.
- **Levels 1-4:** addition and subtraction.
- **Level 5+:** multiplication is added to the mix.
- **Level 10+:** division joins in (integer results only).
- All answers stay within 0-100.
- Answer bubbles fall from above — shoot the **correct answer** to earn XP.
- Avoid **asteroids** and **wrong answers** — they cost you health.
- Answer **10 questions** to level up. Difficulty scales with your level.

### Spaceship Upgrades

As you level up, your spaceship upgrades through 5 classes:

1. **Scout Pod** — where every pilot begins
2. **Viper** — fast and nimble interceptor
3. **Phantom** — stealth-class fighter
4. **Dreadnought** — heavy assault warship
5. **Celestial Titan** — the ultimate flagship

Your weapons also upgrade through 5 tiers, with progressively cooler visuals and multi-shot patterns at higher levels.

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
├── creatures.js    — Three.js 3D mesh factories for ships and entities
├── style.css       — UI styling
└── .gitignore
```

## License

This project is provided as-is for educational and personal use.
