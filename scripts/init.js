import { CardInitiative } from "./initiative.js";
import { CardInitiativeUI } from "./ui.js";
import { DECK_DATA } from "./data.js";
import { MODULE_ID } from "./constants.js";
Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing Card Deck Initiative`);
    game.settings.register(MODULE_ID, "deckName", {
        name: "CARD_INITIATIVE.SettingDeckNameName",
        hint: "CARD_INITIATIVE.SettingDeckNameHint",
        scope: "world",
        config: true,
        type: String,
        default: "Initiative Deck"
    });
    game.settings.register(MODULE_ID, "autoRedraw", {
        name: "CARD_INITIATIVE.SettingAutoRedrawName",
        hint: "CARD_INITIATIVE.SettingAutoRedrawHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MODULE_ID, "resetInitiative", {
        name: "CARD_INITIATIVE.SettingResetInitiativeName",
        hint: "CARD_INITIATIVE.SettingResetInitiativeHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MODULE_ID, "resetOnEnd", {
        name: "CARD_INITIATIVE.SettingResetOnEndName",
        hint: "CARD_INITIATIVE.SettingResetOnEndHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MODULE_ID, "enableSplash", {
        name: "CARD_INITIATIVE.SettingEnableSplashName",
        hint: "CARD_INITIATIVE.SettingEnableSplashHint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MODULE_ID, "sfxPath", {
        name: "CARD_INITIATIVE.SettingSfxPathName",
        hint: "CARD_INITIATIVE.SettingSfxPathHint",
        scope: "world",
        config: true,
        type: String,
        default: `modules/${MODULE_ID}/sounds/sfx.mp3`,
        filePicker: "audio"
    });
});
Hooks.once("setup", () => {
});
Hooks.once("ready", async () => {
    CardInitiative.init();
    CardInitiativeUI.init();
});