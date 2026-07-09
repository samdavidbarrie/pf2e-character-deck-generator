# PF2e Character Deck Generator

A local-first tool for turning a Pathfinder 2e character export into printable character cards.

**[Try it live →](https://samdavidbarrie.github.io/pf2e-character-deck-generator/)**

The goal is to let a Pathfinder 2e character be represented by a small physical “deck” of cards: combat summaries, skill references, actions, feats, spells, equipment, and other table-use reminders. Cards are designed to be printed on A4 paper, cut out, sleeved, and filled in with pencil where values change during play.

## What it does

- Imports Pathbuilder 2e JSON exports
- Generates printable A4 card sheets
- Creates summary, skill, combat, action, feat, spell, and equipment cards
- Provides blank writable fields for values like HP, attack bonuses, damage, spell DCs, class DCs, resources, and notes
- Lets users review and edit generated cards before printing
- Processes character files locally in the browser

## Current status

This project is currently in early development.

Working or in progress:

- Pathbuilder JSON import
- Character data parsing
- Card generation
- Printable card layouts
- A4 print support
- Editable/play-focused card formats

Planned:

- Level-up changelog showing which cards are new, changed, or removed
- Better card editing tools
- Improved Pathbuilder import coverage
- Archives of Nethys reference link support
- Foundry actor import support
- More card templates for feats, spells, actions, and equipment

## How to use

1. Export your character from Pathbuilder 2e as JSON.
2. Open the app.
3. Upload or paste the JSON export.
4. Review the generated cards.
5. Edit, hide, reorder, or add cards as needed.
6. Print the cards on A4 paper at 100% scale.
7. Cut them out and sleeve them.

## Privacy

Your character JSON is processed locally in your browser.

The app does not upload your character file to a server. Any imported character data, generated cards, or saved deck data should remain local unless you explicitly export or share it yourself.

## Known limitations

- Pathbuilder JSON is not an official stable public API, so imports may break if its export format changes.
- Custom feats, custom items, homebrew content, and variant rules may import imperfectly.
- Generated cards are play aids, not official rules references.
- The app currently avoids bundling full rules text from Archives of Nethys or Paizo publications.
- Print layout may vary slightly by browser and printer. Use 100% scale when printing.
- Some generated cards may need manual editing before they are useful at the table.

## Design goals

The cards are intended to be table-facing play aids, not miniaturised character sheets.

The layout should prioritise information that is checked or changed frequently during play, such as:

- Current HP
- Max HP
- Temp HP
- AC
- Saves
- Perception
- Spell DCs
- Attack bonuses
- Damage
- Action costs
- Limited-use resources

Lower-priority reference information, such as languages, ancestry details, background, and long-form notes, should be placed on separate reference cards rather than competing with combat-critical values.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm install
npm run dev
```

## Contributing

Contributions, bug reports, and feedback are welcome.

Useful reports include:

- Character class and level
- Whether Free Archetype, Dual Class, or other variant rules are enabled
- Whether the issue is with importing, card generation, editing, or printing
- Browser and printer details for print layout problems
- A redacted or synthetic Pathbuilder JSON example, where possible

## Legal and attribution

This project is an independent, unofficial fan utility.

It is not affiliated with, endorsed by, sponsored by, or approved by Paizo Inc., Archives of Nethys, or Pathbuilder.

Pathfinder and related marks are owned by Paizo Inc. Pathbuilder is owned by its respective creator. Archives of Nethys is an independent rules reference site.

This tool should not scrape, bundle, store, or redistribute full rules text from Archives of Nethys or Paizo publications. Where rules references are needed, the intended approach is to link users to appropriate reference sources rather than copying full rules content into this project.

Generated cards are intended for personal table use as play aids and should not be treated as official rules material.

## License

Code is licensed under MIT unless otherwise stated.

Game rules, names, trademarks, and related intellectual property belong to their respective owners.
