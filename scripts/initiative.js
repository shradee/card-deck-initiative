import { MODULE_ID } from "./constants.js";
export class CardInitiative {
    static init() {
        const combatClass = CONFIG.Combat.documentClass;
        console.log(`${MODULE_ID} | Patching ${combatClass.name}`);
        const customRoll = async function(ids, ...args) {
             const combat = this; 
             console.log(`${MODULE_ID} | Custom roll function triggered on ${combat.id}`);
             return await CardInitiative.rollInitiative.call(combat, ids, ...args);
        };
        const customRollAll = async function(options) {
            const combat = this;
            const ids = combat.combatants.filter(c => c.initiative === null || c.initiative === undefined).map(c => c.id);
            if (ids.length > 0) {
                return await combat.rollInitiative(ids, options);
            }
            return combat;
        };
        const customRollNPC = async function(options) {
            const combat = this;
            const ids = combat.combatants.filter(c => c.isNPC && (c.initiative === null || c.initiative === undefined)).map(c => c.id);
            if (ids.length > 0) {
                return await combat.rollInitiative(ids, options);
            }
            return combat;
        };
        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register(MODULE_ID, "CONFIG.Combat.documentClass.prototype.rollInitiative", customRoll, "OVERRIDE");
            libWrapper.register(MODULE_ID, "CONFIG.Combat.documentClass.prototype.rollAll", customRollAll, "OVERRIDE");
            libWrapper.register(MODULE_ID, "CONFIG.Combat.documentClass.prototype.rollNPC", customRollNPC, "OVERRIDE");
            console.log(`${MODULE_ID} | Patched using libWrapper`);
        } else {
            const original = combatClass.prototype.rollInitiative;
            combatClass.prototype.rollInitiative = customRoll;
            combatClass.prototype.rollAll = customRollAll;
            combatClass.prototype.rollNPC = customRollNPC;
            console.log(`${MODULE_ID} | Patched using manual prototype override`);
        }
        const originalSort = combatClass.prototype._sortCombatants;
        combatClass.prototype._sortCombatants = function(a, b) {
            const ia = a.initiative;
            const ib = b.initiative;
            if (ia !== null || ib !== null) {
                const valA = ia ?? -9999;
                const valB = ib ?? -9999;
                if (valA !== valB) return valB - valA; 
            }
            return originalSort.call(this, a, b);
        };
        Hooks.on("updateCombat", CardInitiative.onUpdateCombat);
        Hooks.on("deleteCombat", CardInitiative.onDeleteCombat);
        Hooks.once("ready", CardInitiative.createDeck);
    }
    static async createDeck() {
        if (!game.user.isGM) return;
        const deckName = game.settings.get(MODULE_ID, "deckName");
        let deck = game.cards.getName(deckName);
        if (!deck) {
            console.log(`${MODULE_ID} | Initializing Deck on Ready`);
            const { DECK_DATA } = await import("./data.js");
            const data = JSON.parse(JSON.stringify(DECK_DATA));
            data.name = deckName;
            data.ownership = { default: 3 };
            deck = await Cards.create(data);
            await deck.shuffle({ chatNotification: false });
        } else if (deck.ownership.default !== 3) {
            await deck.update({ "ownership.default": 3 });
        }
        
        const discardName = `${deckName} Discard`;
        let discard = game.cards.getName(discardName);
        if (!discard) {
            console.log(`${MODULE_ID} | Initializing Discard on Ready`);
            discard = await Cards.create({ name: discardName, type: "pile", ownership: { default: 3 } });
        } else if (discard.ownership.default !== 3) {
            await discard.update({ "ownership.default": 3 });
        }
    }
    static async rollInitiative(ids, ...args) {
        const combat = this;
        const deckName = game.settings.get(MODULE_ID, "deckName");
        let deck = game.cards.getName(deckName);
        let combatantIds = [];
        if (Array.isArray(ids)) {
            combatantIds = ids;
        } 
        else if (typeof ids === "string") {
            combatantIds = [ids];
        } 
        else if (!ids) {
            combatantIds = combat.combatants.map(c => c.id);
        }
        else if (typeof ids === "object") {
            combatantIds = combat.combatants.map(c => c.id);
        }
        combatantIds = combatantIds.filter(id => combat.combatants.has(id));
        if (combatantIds.length === 0) {
            console.warn(`${MODULE_ID} | No valid combatants found to roll initiative for.`);
            return combat;
        }
        console.log(`${MODULE_ID} | Rolling initiative for:`, combatantIds);
        if (!deck) {
            const { DECK_DATA } = await import("./data.js");
            const data = JSON.parse(JSON.stringify(DECK_DATA));
            data.name = deckName;
            data.ownership = { default: 3 };
            deck = await Cards.create(data);
            await deck.shuffle({ chatNotification: false });
        }
        if (!deck) {
            ui.notifications.error(game.i18n.format("CARD_INITIATIVE.ErrorDeckNotFound", { deckName }));
            return combat;
        }
        
        if (game.user.isGM && deck.ownership.default !== 3) {
            await deck.update({ "ownership.default": 3 });
        }

        const discardName = `${deck.name} Discard`;
        let discard = game.cards.getName(discardName);
        if (!discard) {
            discard = await Cards.create({ name: discardName, type: "pile", ownership: { default: 3 } });
        }
        
        if (game.user.isGM && discard.ownership.default !== 3) {
            await discard.update({ "ownership.default": 3 });
        }
        
        let available = deck.cards.filter(c => !c.drawn);
        let isGlobalRoll = combatantIds.length >= combat.combatants.size;
        if (available.length < combatantIds.length) {
            console.log(`${MODULE_ID} | Triggering Reshuffle (Deck Empty)`);
            try {
                await CardInitiative.reshuffleDeck(combat);
                available = deck.cards.filter(c => !c.drawn);
            } catch (e) {
                console.error("Reshuffle failed:", e);
                return combat;
            }
        }
        if (available.length === 0) {
            ui.notifications.error(game.i18n.localize("CARD_INITIATIVE.ErrorDeckEmpty"));
            return combat;
        }
        const updates = [];
        const jokersDrawn = [];
        available = available.sort((a, b) => a.sort - b.sort);
        for (let id of combatantIds) {
            const combatant = combat.combatants.get(id);
            if (!combatant || available.length === 0) continue;
            const card = available.shift();
            await deck.pass(discard, [card.id], { chatNotification: false });
            const { value, sortLabel } = CardInitiative.evaluateCard(card);
            if (value >= 999) {
                console.log(`${MODULE_ID} | ${game.i18n.format("CARD_INITIATIVE.JokerDrawnSingle", { name: combatant.name })}`);
                jokersDrawn.push({
                    name: combatant.name,
                    img: combatant.img || combatant.token?.texture?.src || combatant.token?.img || "icons/svg/mystery-man.svg"
                });
            }
            updates.push({
                _id: id,
                initiative: value,
                [`flags.${MODULE_ID}`]: {
                    cardId: card.id,
                    cardName: card.name,
                    cardImg: card.img,
                    cardFace: card.faces?.[card.face || 0]?.img,
                    sortLabel: sortLabel
                }
            });
        }
        if (jokersDrawn.length > 0) {
            const splashData = { action: "jokerSplash", jokers: jokersDrawn };
            game.socket.emit(`module.${MODULE_ID}`, splashData);
            import("./ui.js").then(m => m.CardInitiativeUI.showJokerSplash(jokersDrawn));
        }
        if (updates.length > 0) await combat.updateEmbeddedDocuments("Combatant", updates);
        if (isGlobalRoll) {
            await combat.update({ turn: 0 });
        }
        return combat;
    }
    static async reshuffleDeck(combat) {
        console.log(`${MODULE_ID} | Reshuffling Deck`);
        const deckName = game.settings.get(MODULE_ID, "deckName");
        const deck = game.cards.getName(deckName);
        const discard = game.cards.getName(`${deckName} Discard`);
        if (!deck || !discard) return;
        const hookId = Hooks.on("preCreateChatMessage", (doc, data, options, userId) => {
            if (data.content && (data.content.includes("Returned all cards") || data.content.includes("Recalled all cards"))) {
                return false;
            }
        });
        try {
            const toRecall = discard.cards.map(c => c.id);
            if (toRecall.length > 0) {
                await discard.pass(deck, toRecall, { chatNotification: false });
            }
            await deck.shuffle(); 
        } finally {
            Hooks.off("preCreateChatMessage", hookId);
        }
    }
    static evaluateCard(card) {
        const name = (card.name || "").toLowerCase();
        let rank = 0, suit = 0.0, label = "?";
        if (name.includes("joker")) return { value: 999, sortLabel: "Joker" };
        if (name.includes("ace")) { rank = 14; label = "A"; }
        else if (name.includes("king")) { rank = 13; label = "K"; }
        else if (name.includes("queen")) { rank = 12; label = "Q"; }
        else if (name.includes("jack")) { rank = 11; label = "J"; }
        else {
            rank = parseInt(name.match(/\d+/)?.[0]) || 0;
            if (rank === 0) {
                const words = {"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,"nine":9,"ten":10};
                for (let [w, v] of Object.entries(words)) if (name.includes(w)) { rank = v; break; }
            }
            if (rank === 0) rank = 2;
            label = rank.toString();
        }
        if (name.includes("spades")) { suit = 0.4; label += "♠"; }
        else if (name.includes("hearts")) { suit = 0.3; label += "♥"; }
        else if (name.includes("diamonds")) { suit = 0.2; label += "♦"; }
        else if (name.includes("clubs")) { suit = 0.1; label += "♣"; }
        return { value: rank + suit, sortLabel: label };
    }
    static async onUpdateCombat(combat, updateData) {
        if (!game.user.isGM || updateData.round === undefined || updateData.round <= 1) return;
        if (game.settings.get(MODULE_ID, "autoRedraw")) {
            await CardInitiative.rollInitiative.call(combat, null, []);
            await combat.update({ turn: 0 });
        } 
        else if (game.settings.get(MODULE_ID, "resetInitiative")) {
            const ids = combat.combatants.map(c => c.id);
            await combat.updateEmbeddedDocuments("Combatant", ids.map(id => ({ _id: id, initiative: null })));
            await combat.update({ turn: 0 });
        }
    }
    static async onDeleteCombat(combat) {
        if (!game.settings.get(MODULE_ID, "resetOnEnd")) return;
        const hookId = Hooks.on("preCreateChatMessage", (doc, data, options, userId) => {
            if (data.content && (data.content.includes("Returned all cards") || data.content.includes("Recalled all cards"))) {
                return false;
            }
        });
        try {
            const deckName = game.settings.get(MODULE_ID, "deckName");
            const deck = game.cards.getName(deckName);
            const discard = game.cards.getName(`${deckName} Discard`);
            if (discard) await discard.delete();
            if (deck) await deck.delete();
        } finally {
            Hooks.off("preCreateChatMessage", hookId);
        }
    }
}