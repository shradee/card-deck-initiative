# Card Deck Initiative

**Card Deck Initiative** replaces the standard d20-based initiative system in Foundry VTT with a card-based draw system, inspired by **Savage Worlds (SWADE)**. It utilizes Foundry's core **Cards API** to manage a deck, discard pile, and hand distribution for initiative.

![Foundry Version](https://img.shields.io/badge/Foundry-v13-orange)

## Features

-   **Card-Based Initiative**: Combatants draw cards from a configurable deck instead of rolling dice.
-   **Deck Management**: Automatically creates a standard 52-card deck (including Jokers) if one doesn't exist. Handles shuffling automatically when the deck runs out.
-   **Joker Mechanics**:
    -   **Joker Splash**: Displays a visual splash screen and plays a sound effect when a Joker is drawn.
    -   **Customizable**: Toggle the splash screen on/off and upload your own custom sound effect via settings.
-   **Round Management**:
    -   **Auto-Redraw**: Option to automatically redraw cards for all combatants at the start of a new round.
    -   **Reset on New Round**: Option to clear initiative (recall cards) at the start of a new round if not auto-redrawing.
    -   **Cleanup**: Automatically deletes the initiative deck and discard pile when the combat encounter ends (configurable).
-   **Visuals**:
    -   Displays the drawn card suit and value on the Combat Tracker.
    -   **Hover Preview**: Hover over the card icon in the tracker to see a large preview of the card.
    -   **Sorting**: Sorts combatants based on card value (King > Queen > ... > 2). Suits are used as tiebreakers (Spades > Hearts > Diamonds > Clubs).

## System Support

### General
Works with most systems that use the standard Combat Tracker. It overrides the default `rollInitiative` function.

### Daggerheart (Special Support)
This module includes specific enhancements for the **Daggerheart** system:
-   **Roll All Button**: Adds a "Roll All" button to the combat tracker header for GMs.
-   **Turn Navigation**: Adds Previous/Next Turn buttons to the footer for easier flow control.
-   **UI Cleanup**: Hides system-specific "Spotlight" buttons to reduce clutter.

## Settings

| Setting | Description |
| :--- | :--- |
| **Initiative Deck Name** | The exact name of the Cards deck to use. Defaults to "Initiative Deck". |
| **Auto-Redraw Every Round** | If enabled, automatically draws new cards for everyone when the round advances. |
| **Reset Initiative on New Round** | If enabled, clears all initiative cards when the round advances (useful if you want manual draws each round). |
| **Delete Deck on Combat End** | Automatically deletes the created Deck and Discard pile when the combat is deleted to keep your Cards sidebar clean. |
| **Enable Joker Splash** | Toggles the visual splash screen and sound effect for Jokers. |
| **Joker Splash Sound Path** | File path to the audio file played when a Joker is drawn. |

## Installation

1.  Inside Foundry VTT, go to the **Add-on Modules** tab.
2.  Click **Install Module**.
3.  Search for "Card Deck Initiative" or paste the Manifest URL (if manually installing).
4.  Enable the module in your game world.
