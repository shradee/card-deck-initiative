import { MODULE_ID } from "./constants.js";
export class CardInitiativeUI {
    static init() {
        Hooks.on("renderCombatTracker", CardInitiativeUI.renderTracker);
        if (!document.getElementById("card-initiative-portal")) {
            const portal = document.createElement("img");
            portal.id = "card-initiative-portal";
            portal.className = "card-initiative-portal-img";
            portal.style.position = "fixed";
            portal.style.pointerEvents = "none";
            portal.style.zIndex = "1000000";
            document.body.appendChild(portal);
        }
        if (!document.getElementById("joker-splash-overlay")) {
            const overlay = document.createElement("div");
            overlay.id = "joker-splash-overlay";
            overlay.innerHTML = `
                <div class="joker-splash-bar">
                    <div class="joker-splash-content">
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        game.socket.on(`module.${MODULE_ID}`, data => {
            if (data.action === "jokerSplash") {
                CardInitiativeUI.showJokerSplash(data.jokers);
            }
        });
    }
    static showJokerSplash(jokers) {
        if (!game.settings.get(MODULE_ID, "enableSplash")) return;
        const overlay = document.getElementById("joker-splash-overlay");
        if (!overlay) return;
        if (this._splashTimeout) {
            clearTimeout(this._splashTimeout);
            this._splashTimeout = null;
        }
        overlay.classList.remove("active");
        requestAnimationFrame(() => {
            void overlay.offsetWidth;
            const contentContainer = overlay.querySelector(".joker-splash-content");
            contentContainer.innerHTML = "";
            const tokenContainer = document.createElement("div");
            tokenContainer.style.display = "flex";
            tokenContainer.style.gap = "15px";
            const jokersCopy = [...jokers];
            for (const joker of jokersCopy) {
                const img = document.createElement("img");
                img.className = "joker-splash-token";
                img.src = joker.img || "icons/svg/mystery-man.svg";
                tokenContainer.appendChild(img);
            }
            contentContainer.appendChild(tokenContainer);
            let namesText = "";
            const localizedAnd = game.i18n.localize("CARD_INITIATIVE.And");
            if (jokersCopy.length === 1) namesText = jokersCopy[0].name;
            else if (jokersCopy.length === 2) namesText = `${jokersCopy[0].name} ${localizedAnd} ${jokersCopy[1].name}`;
            else {
                const last = jokersCopy.pop();
                namesText = jokersCopy.map(j => j.name).join(", ") + ` ${localizedAnd} ${last.name}`;
            }
            const message = document.createElement("div");
            message.className = "joker-splash-message";
            const key = jokers.length > 1 ? "CARD_INITIATIVE.JokerDrawnPlural" : "CARD_INITIATIVE.JokerDrawnSingle";
            message.innerText = game.i18n.format(key, { name: namesText.toUpperCase() });
            contentContainer.appendChild(message);
            overlay.classList.add("active");
            this._splashTimeout = setTimeout(() => {
                overlay.classList.remove("active");
                this._splashTimeout = null;
            }, 4600);
            AudioHelper.play({src: game.settings.get(MODULE_ID, "sfxPath"), volume: 0.8}, false);
        });
    }
    static async renderTracker(app, html, data) {
        if (!game.combat) return;
        const jq = $(html);
        const portal = $("#card-initiative-portal");
        const isDaggerheart = game.system.id === "daggerheart";
        if (isDaggerheart && game.user.isGM) {
            const header = jq.find(".encounter-controls .inner-controls, .encounter-controls .control-buttons, .combat-tracker-header .encounter-controls").first();
            if (header.length && !header.find(".module-injected-roll-all").length) {
                const rollAllBtn = $(`
                    <button type="button" class="combat-control roll-all module-injected-roll-all initiative-card-button" 
                            data-action="rollAll" title="${game.i18n.localize('COMBAT.RollAll')}">
                        <img src="icons/svg/card-hand.svg">
                    </button>
                `);
                rollAllBtn.on("click", (e) => { 
                    e.preventDefault(); e.stopPropagation();
                    game.combat.rollAll(); 
                });
                header.prepend(rollAllBtn);
            }
        }
        if (isDaggerheart && game.user.isGM && game.combat.round > 0) {
            const footer = jq.find(".combat-controls").first();
            if (footer.length && !footer.find(".turn-controls.module-injected-nav").length) {
                const turnControls = $(`
                    <div class="turn-controls flexrow module-injected-nav" style="gap: 10px; margin-bottom: 5px;">
                        <button type="button" class="combat-control icon fa-solid fa-caret-left" data-action="prevTurn" title="${game.i18n.localize('COMBAT.TurnPrev')}"></button>
                        <button type="button" class="combat-control icon fa-solid fa-caret-right" data-action="nextTurn" title="${game.i18n.localize('COMBAT.TurnNext')}"></button>
                    </div>
                `);
                turnControls.find('[data-action="nextTurn"]').on("click", (e) => { e.preventDefault(); game.combat.nextTurn(); });
                turnControls.find('[data-action="prevTurn"]').on("click", (e) => { e.preventDefault(); game.combat.previousTurn(); });
                footer.prepend(turnControls);
            }
        }
        const combatantRows = jq.find('.combatant, [data-combatant-id]');
        const now = Date.now();
        const delay2s = -((now % 2000) / 1000);
        const delay3s = -((now % 3000) / 1000);
        combatantRows.each((i, el) => {
            if (!game.combat) return;
            const li = $(el);
            const combatantId = el.getAttribute('data-combatant-id') || li.attr('data-combatant-id');
            if (!combatantId) return;
            const combatant = game.combat.combatants.get(combatantId);
            if (!combatant) return;
            const hasInit = combatant.initiative !== null;
            li.toggleClass("has-initiative", hasInit);
            if (isDaggerheart) {
                li.find(".spotlight-control, [data-action*='Spotlight']").remove();
            }
            let container = li.find(".module-initiative-container");
            if (!container.length) {
                const systemArea = li.find(".token-initiative, .initiative, .combatant-initiative, .initiative-value, .initiative-roll").first();
                if (systemArea.length) {
                    systemArea.addClass("module-initiative-container");
                    container = systemArea;
                } else {
                    container = $('<div class="module-initiative-container initiative"></div>');
                    const controls = li.find(".combatant-controls, .token-controls, .controls").first();
                    if (controls.length) controls.before(container);
                    else li.append(container);
                }
            }
            container.empty();
            li.find(".roll, .combatant-control, .initiative-roll, [data-control='rollInitiative'], [data-action='rollInitiative'], .initiative-value, .initiative-text")
              .not('.module-injected-roll, .module-initiative-container')
              .css({ "display": "none", "visibility": "hidden" })
              .hide();
            li.find(".roll i, .roll svg, [data-action='rollInitiative'] i, [data-action='rollInitiative'] svg")
              .not('.module-injected-roll *')
              .hide();
            if (hasInit) {
                const cardImg = combatant.getFlag(MODULE_ID, "cardImg");
                const sortLabel = combatant.getFlag(MODULE_ID, "sortLabel");
                const isJoker = combatant.initiative >= 999;
                li.toggleClass("has-joker", isJoker);
                if (isJoker) {
                    el.style.setProperty("--anim-delay-2s", `${delay2s}s`);
                    el.style.setProperty("--anim-delay-3s", `${delay3s}s`);
                }
                if (sortLabel || cardImg) {
                    const wrapper = $(`
                        <div class="initiative-card-wrapper">
                            <span class="initiative-card-text">${sortLabel || "?"}</span>
                            <div class="initiative-card-container-inner">
                                ${cardImg ? `<img src="${cardImg}" class="initiative-card">` : ''}
                            </div>
                        </div>
                    `);
                    container.html(wrapper);
                    const cardIcon = wrapper.find(".initiative-card");
                    const trigger = wrapper.find(".initiative-card-container-inner");
                    trigger.on("mouseenter", (e) => {
                        if (!cardImg) return;
                        portal.attr("src", cardImg);
                        const rect = cardIcon[0].getBoundingClientRect();
                        const sidebarRect = document.getElementById("sidebar").getBoundingClientRect();
                        const scale = 6.0;
                        const width = rect.width * scale;
                        const height = rect.height * scale;
                        const leftPos = sidebarRect.right - width - 10;
                        const topPos = rect.top + (rect.height / 2) - (height / 2);
                        portal.css({ "top": `${topPos}px`, "left": `${leftPos}px`, "width": `${width}px`, "height": `${height}px` });
                        portal.addClass("active");
                        li.addClass("card-initiative-hover");
                    });
                    trigger.on("mouseleave", () => {
                        portal.removeClass("active");
                        li.removeClass("card-initiative-hover");
                    });
                    wrapper.css("pointer-events", "none");
                    trigger.css("pointer-events", "auto");
                }
            } else {
                if (combatant.isOwner || game.user.isGM) {
                    const rollBtn = $(`
                        <button type="button" class="combat-control module-injected-roll initiative-card-button" 
                                data-action="draw-initiative-card"
                                title="${game.i18n.localize('COMBAT.InitiativeRoll')}">
                            <img src="icons/svg/card-hand.svg">
                        </button>
                    `);
                    rollBtn.on("click", async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        console.log(`${MODULE_ID} | Individual roll clicked for ${combatantId}`);
                        await game.combat.rollInitiative([combatantId]);
                    });
                    container.empty().append(rollBtn);
                }
            }
        });
    }
}