const CARTOON_CHARACTERS = [
    {
        name: "SpongeBob SquarePants",
        pass: "gary123",
        studyQuotes: ["I'm ready! 🍍", "Knowledge is power!"],
        relaxQuotes: ["Barnacles! Break time.", "Blowing bubbles... 🫧"],
    },
    {
        name: "Patrick Star",
        pass: "wumbo_forever",
        studyQuotes: ["Look, I'm using my brain! 🧠"],
        relaxQuotes: ["My brain hurts. Going to sleep. 💤", "Is there any burger left? 🍔"],
    },
    {
        name: "Squidward Tentacles",
        pass: "i_hate_everyone",
        studyQuotes: ["Silence! I am trying to study here."],
        relaxQuotes: ["Time for my clarinet practice. 🎷", "I hate working."],
    },
    {
        name: "Shrek",
        pass: "onion_layers",
        studyQuotes: ["Get out of my swamp, I'm reading!", "Studying has layers."],
        relaxQuotes: ["I need a mud bath. 🪵", "Time to find Donkey."],
    },
    {
        name: "Donkey",
        pass: "waffles55",
        studyQuotes: ["I'm doing science, Shrek!", "Look at me go!"],
        relaxQuotes: ["Are we smart yet? 🐴", "I'm making waffles! 🧇"],
    },
    {
        name: "Rick Sanchez",
        pass: "wubbalubbadubdub",
        studyQuotes: ["This exam is multi-dimensionally easy. 🧪"],
        relaxQuotes: ["I'm bored. Going to a sci-fi festival.", "Morty, grab your coat."],
    },
    {
        name: "Morty Smith",
        pass: "jessica_love",
        studyQuotes: ["Oh jeez, I'm understanding physics!"],
        relaxQuotes: ["Aw man, anxiety hitting. Break time. 🛋️"],
    },
    {
        name: "Homer Simpson",
        pass: "donut_king",
        studyQuotes: ["Mmm... forbidden knowledge... 🍩"],
        relaxQuotes: ["Woohoo! Break time! 📺", "D'oh! I read the wrong page!"],
    },
    {
        name: "Naruto Uzumaki",
        pass: "hokage2026",
        studyQuotes: ["Believe it! This book won't defeat me! 🦊"],
        relaxQuotes: ["RAMEN TIME! 🍜", "Shadow clone jutsu!"],
    },
    {
        name: "Saitama",
        pass: "one_punch_man",
        studyQuotes: ["100 pages read, every single day!"],
        relaxQuotes: ["I missed the supermarket sale! 🛒", "Playing video games."],
    },
];
const BOT_COLORS = [
    "#3498db",
    "#2ecc71",
    "#e67e22",
    "#e74c3c",
    "#9b59b6",
    "#f1c40f",
    "#1abc9c",
    "#e84393",
    "#ffeaa7",
    "#a29bfe",
];
const COFFEE_PRICE = 20,
    COINS_PER_MINUTE = 2,
    ENERGY_DRAIN_INTERVAL = 45,
    ENERGY_RECOVER_INTERVAL = 60,
    COFFEE_WAIT_SECONDS = 120;

// --- globals ---
let onlineBots = {},
    bannedBots = [],
    userStatus = "Studying",
    userSeconds = 0,
    myName = "Amir";
let configMaxMembers = 10,
    configSelectionMode = "random",
    configSelectedPool = [],
    configAllowOthers = true,
    configAllowLeave = true,
    configAllowRejoin = true,
    configAllowBotChat = true;
let userCoins = 0,
    coffeeStock = 0,
    lastSeenMessages = {},
    mpRoomMeta = null,
    seenMpCoffeeBots = new Set(),
    lastMpMembers = null,
    lastMpMyUserName = null,
    chatHistory = [];
let timerInterval = null,
    multiplayerSyncInterval = null,
    botSyncInterval = null,
    botTickInterval = null,
    simInterval = null,
    weatherInterval = null,
    botTimerUpdateInterval = null;

// --- helpers ---
function getAllCharacters() {
    try {
        return [...CARTOON_CHARACTERS, ...(JSON.parse(localStorage.getItem("cozy_custom_chars")) || [])];
    } catch (e) {
        return [...CARTOON_CHARACTERS];
    }
}
function formatTime(s) {
    s = Math.floor(s);
    return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function getEnergyColor(e) {
    return e > 60 ? "#2ecc71" : e > 30 ? "#f1c40f" : "#e74c3c";
}
function applyTheme(t) {
    const m = {
        magenta: "#ff007f",
        green: "#2ecc71",
        yellow: "#f1c40f",
        purple: "#9b59b6",
        orange: "#e67e22",
        red: "#e74c3c",
        white: "#f8fafc",
    };
    document.documentElement.style.setProperty("--theme-main", m[t] || "#00ffff");
}
const ROOM_THEMES = {
    default: { icon: "🏠", label: "Default", particle: null },
    library: { icon: "📚", label: "Library", particle: null },
    space: { icon: "🚀", label: "Space", particle: null },
    forest: { icon: "🌲", label: "Forest", particle: null },
};
let roomTheme = "default",
    roomParticleInterval = null;
function applyRoomTheme(t) {
    roomTheme = t;
    document.body.classList.remove("room-library", "room-space", "room-forest");
    if (t !== "default") document.body.classList.add("room-" + t);
    if (roomParticleInterval) {
        clearInterval(roomParticleInterval);
        roomParticleInterval = null;
    }
}
function sanitizeHTML(s) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
}
function addMsg(text, cls) {
    chatHistory.push({ text, cls: cls || "system-msg" });
    if (chatHistory.length > 30) chatHistory.shift();
    const c = document.getElementById("chat-messages");
    const m = document.createElement("div");
    m.className = `message ${cls || "system-msg"}`;
    m.innerHTML = text;
    c.appendChild(m);
    c.scrollTop = c.scrollHeight;
    if (c.children.length > 30) c.removeChild(c.children[0]);
    if (deskActive) renderDeskChat();
}
function restoreMsg(text, cls) {
    const c = document.getElementById("chat-messages");
    const m = document.createElement("div");
    m.className = `message ${cls || "system-msg"}`;
    m.innerHTML = text;
    c.appendChild(m);
    c.scrollTop = c.scrollHeight;
}
function updateShopDisplay() {
    document.getElementById("shop-coin-display").innerText = Math.floor(userCoins);
    document.getElementById("shop-coffee-display").innerText = coffeeStock;
}
function saveSession(d) {
    localStorage.setItem("cozy_session", JSON.stringify({ ...d, savedAt: Date.now() }));
}
function loadSession() {
    try {
        return JSON.parse(localStorage.getItem("cozy_session")) || null;
    } catch (e) {
        return null;
    }
}
function clearSession() {
    localStorage.removeItem("cozy_session");
}
function clearAllIntervals() {
    [
        timerInterval,
        multiplayerSyncInterval,
        botSyncInterval,
        botTickInterval,
        simInterval,
        weatherInterval,
        botTimerUpdateInterval,
        pomoInterval,
    ].forEach((i) => clearInterval(i));
    timerInterval =
        multiplayerSyncInterval =
        botSyncInterval =
        botTickInterval =
        simInterval =
        weatherInterval =
        botTimerUpdateInterval =
        pomoInterval =
            null;
    pomoRunning = false;
    pomoTimeLeft = 25 * 60;
}

// --- session restore ---
window.addEventListener("load", () => {
    loadStats();
    const sess = loadSession();
    if (sess?.mode === "solo" && sess.userName) restoreSoloSession(sess);
    else if (sess?.mode === "multi" && sess.roomId && sess.userName) restoreMultiSession(sess);
    else checkUrlRoom();
});
window.addEventListener("beforeunload", () => {
    if (typeof isInMultiplayer === "function" && isInMultiplayer()) {
        saveMultiSession(getCurrentRoomId(), null, getIsHost());
    } else if (
        document.getElementById("app-screen") &&
        !document.getElementById("app-screen").classList.contains("hidden")
    ) {
        saveSoloSession();
    }
});

function checkUrlRoom() {
    const r = new URLSearchParams(window.location.search).get("room");
    if (r)
        setTimeout(() => {
            const name = prompt("Enter your name to join this room:");
            if (!name || !name.trim()) return;
            document.getElementById("username").value = name.trim();
            const ji = document.getElementById("join-room-id");
            if (ji) ji.value = r;
            document.getElementById("btn-join-mode")?.click();
            document.getElementById("btn-study-friends")?.click();
        }, 400);
}

function restoreSoloSession(sess) {
    myName = sess.userName;
    userSeconds = sess.userSeconds || 0;
    userCoins = sess.userCoins || 0;
    coffeeStock = sess.coffeeStock || 0;
    configMaxMembers = sess.configMaxMembers || 10;
    configSelectionMode = sess.configSelectionMode || "random";
    configSelectedPool = sess.configSelectedPool || [];
    configAllowOthers = sess.configAllowOthers !== false;
    configAllowLeave = sess.configAllowLeave !== false;
    configAllowRejoin = sess.configAllowRejoin !== false;
    configAllowBotChat = sess.configAllowBotChat !== false;
    if (sess.bots && Object.keys(sess.bots).length > 0) {
        onlineBots = sess.bots;
    }
    chatHistory = sess.chatHistory || [];
    applyTheme(sess.theme || "cyan");
    applyRoomTheme(sess.roomTheme || "default");
    document.getElementById("theme-color").value = sess.theme || "cyan";
    document.getElementById("display-username").innerText = myName;
    document.getElementById("user-timer").innerText = formatTime(userSeconds);
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("btn-admin-panel").style.display = "block";
    document.getElementById("chat-messages").innerHTML = "";
    (sess.chatHistory || []).forEach((msg) => restoreMsg(msg.text, msg.cls));
    updateShopDisplay();
    initRoom(true);
}

async function restoreMultiSession(sess) {
    myName = sess.userName;
    userSeconds = sess.userSeconds || 0;
    userCoins = sess.userCoins || 0;
    coffeeStock = sess.coffeeStock || 0;
    chatHistory = sess.chatHistory || [];
    if (sess.bots && Object.keys(sess.bots).length > 0) {
        onlineBots = sess.bots;
    }
    applyTheme(sess.theme || "cyan");
    applyRoomTheme(sess.roomTheme || "default");
    document.getElementById("theme-color").value = sess.theme || "cyan";
    document.getElementById("display-username").innerText = myName;
    document.getElementById("user-timer").innerText = formatTime(userSeconds);
    try {
        const meta = await getRoomMeta(sess.roomId);
        if (!meta) throw new Error("expired");
        mpRoomMeta = meta;
        await joinRoom(sess.roomId, sess.roomPassword, myName);
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app-screen").classList.remove("hidden");
        if (sess.isHost) document.getElementById("btn-admin-panel").style.display = "block";
        document.getElementById("chat-messages").innerHTML = "";
        (sess.chatHistory || []).forEach((msg) => restoreMsg(msg.text, msg.cls));
        updateShopDisplay();
        startMultiplayerTimers(sess.isHost, sess.roomId, sess.roomPassword);
        if (sess.isHost && meta.allowBots) {
            if (Object.keys(onlineBots).length === 0) setupBotsForMultiplayer(meta);
            else {
                botTickInterval = setInterval(tickBots, 1000);
                startSimulation();
            }
        }
    } catch (e) {
        clearSession();
        checkUrlRoom();
    }
}

// --- DOMContentLoaded wires ---
document.addEventListener("DOMContentLoaded", () => {
    loadPresetsFromStorage();
    const themeColors = {
        cyan: "#00ffff",
        magenta: "#ff007f",
        green: "#2ecc71",
        yellow: "#f1c40f",
        purple: "#9b59b6",
        orange: "#e67e22",
        red: "#e74c3c",
        white: "#f8fafc",
    };
    document.querySelectorAll("#theme-color option").forEach((o) => {
        if (themeColors[o.value]) o.style.color = themeColors[o.value];
    });
    updateWeatherBtnStyle(document.getElementById("weather-select").value);

    document
        .getElementById("toggle-advanced")
        .addEventListener("click", () => document.getElementById("advanced-panel").classList.toggle("hidden"));
    document
        .getElementById("toggle-host-advanced")
        .addEventListener("click", () => document.getElementById("host-advanced-panel").classList.toggle("hidden"));
    document.getElementById("char-selection-mode").addEventListener("change", (e) => {
        if (e.target.value === "custom") {
            document.getElementById("manual-chars-wrapper").classList.remove("hidden");
            renderCharacterCheckboxes();
        } else document.getElementById("manual-chars-wrapper").classList.add("hidden");
    });
    document
        .getElementById("btn-toggle-creator")
        .addEventListener("click", () => document.getElementById("character-creator-panel").classList.toggle("hidden"));
    document
        .getElementById("allow-leave")
        .addEventListener("change", (e) =>
            document.getElementById("rejoin-wrapper").classList.toggle("hidden", !e.target.checked)
        );
    document.getElementById("btn-clear-history").addEventListener("click", () => {
        if (confirm("Wipe all presets?")) {
            localStorage.removeItem("cozy_presets");
            loadPresetsFromStorage();
        }
    });
    document.getElementById("preset-history").addEventListener("change", applyPreset);
    document.getElementById("btn-save-custom-char").addEventListener("click", saveCustomChar);

    // START SIMULATION
    document.getElementById("btn-enter").addEventListener("click", () => {
        const name = document.getElementById("username").value.trim();
        if (!name) {
            alert("Enter your name!");
            return;
        }
        const theme = document.getElementById("theme-color").value;
        configMaxMembers = parseInt(document.getElementById("max-members").value) || 10;
        configSelectionMode = document.getElementById("char-selection-mode").value;
        configAllowOthers = document.getElementById("allow-others").checked;
        configAllowLeave = document.getElementById("allow-leave").checked;
        configAllowRejoin = document.getElementById("allow-rejoin").checked;
        if (configSelectionMode === "custom") {
            configSelectedPool = [];
            document.querySelectorAll(".bot-selector-check:checked").forEach((c) => configSelectedPool.push(c.value));
            if (!configSelectedPool.length) {
                alert("Pick at least one!");
                return;
            }
        } else configSelectedPool = getAllCharacters().map((c) => c.name);
        const presetName = document.getElementById("new-preset-name").value.trim();
        if (presetName) {
            try {
                var s = JSON.parse(localStorage.getItem("cozy_presets")) || {};
            } catch (e) {
                var s = {};
            }
            s[presetName] = {
                user: name,
                theme,
                max: configMaxMembers,
                mode: configSelectionMode,
                selectedPool: configSelectedPool,
                allowOthers: configAllowOthers,
                allowLeave: configAllowLeave,
                allowRejoin: configAllowRejoin,
            };
            localStorage.setItem("cozy_presets", JSON.stringify(s));
        }
        myName = name;
        userSeconds = 0;
        userCoins = 0;
        coffeeStock = 0;
        onlineBots = {};
        bannedBots = [];
        applyTheme(theme);
        document.getElementById("display-username").innerText = name;
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app-screen").classList.remove("hidden");
        document.getElementById("btn-admin-panel").style.display = "block";
        initRoom(false);
        saveSession({
            mode: "solo",
            userName: name,
            theme,
            userSeconds: 0,
            userCoins: 0,
            coffeeStock: 0,
            configMaxMembers,
            configSelectionMode,
            configSelectedPool,
            configAllowOthers,
            configAllowLeave,
            configAllowRejoin,
            configAllowBotChat,
            bots: sanitizeBotsForStorage(),
        });
    });

    document.getElementById("btn-pause").addEventListener("click", () => {
        userStatus = userStatus === "Studying" ? "Relaxing" : "Studying";
        const s = userStatus === "Studying";
        const btn = document.getElementById("btn-pause");
        if (s) {
            btn.textContent = "⏸ BREAK";
            btn.style.background = "#2a1a1a";
            btn.style.borderColor = "#e67e22";
            btn.style.color = "#e67e22";
        } else {
            btn.textContent = "▶ CONTINUE";
            btn.style.background = "#1a2a1a";
            btn.style.borderColor = "#2ecc71";
            btn.style.color = "#2ecc71";
        }
        document.getElementById("user-status-badge").innerText = s ? "Studying 📖" : "Relaxing ⏳";
        document.getElementById("user-status-badge").className = "status-badge " + (s ? "studying" : "relaxing");
        addMsg(s ? "📖 You resumed studying!" : "☕ You are taking a break.", "system-msg");
        if (typeof isInMultiplayer === "function" && isInMultiplayer()) syncMyStatus(myName, userStatus, userSeconds);
        updateMemberList();
    });

    document.getElementById("btn-power").addEventListener("click", async () => {
        if (typeof isInMultiplayer === "function" && isInMultiplayer()) {
            if (typeof getIsHost === "function" && getIsHost()) {
                if (!confirm("Leaving will DELETE the room for everyone. Sure?")) return;
                await leaveRoomGracefully(myName, true);
            } else await leaveRoomGracefully(myName, false);
        }
        clearAllIntervals();
        clearSession();
        resetUI();
    });

    document.getElementById("btn-shop").addEventListener("click", () => {
        updateShopDisplay();
        document.getElementById("shop-modal").classList.remove("hidden");
    });
    document
        .getElementById("btn-close-shop")
        .addEventListener("click", () => document.getElementById("shop-modal").classList.add("hidden"));
    document.getElementById("btn-buy-coffee").addEventListener("click", () => {
        if (userCoins < COFFEE_PRICE) {
            addMsg(`💰 Need ${COFFEE_PRICE} coins, have ${Math.floor(userCoins)}.`, "system-msg");
            return;
        }
        userCoins -= COFFEE_PRICE;
        coffeeStock++;
        updateShopDisplay();
        addMsg(`☕ Bought coffee! Stock: ${coffeeStock}`, "system-msg");
    });

    document.getElementById("btn-admin-panel").addEventListener("click", () => {
        document.getElementById("admin-modal").classList.remove("hidden");
        document.getElementById("allow-bot-chat").checked = configAllowBotChat;
        renderAdminPanelUsers();
    });
    document
        .getElementById("btn-close-admin")
        .addEventListener("click", () => document.getElementById("admin-modal").classList.add("hidden"));
    document.getElementById("allow-bot-chat").addEventListener("change", (e) => {
        configAllowBotChat = e.target.checked;
    });
    document.getElementById("btn-clear-chat").addEventListener("click", async () => {
        chatHistory = [];
        document.getElementById("chat-messages").innerHTML = "";
        addMsg("🗑️ Chat cleared by host.", "system-msg");
        if (typeof isInMultiplayer === "function" && isInMultiplayer() && typeof sendRoomMessage === "function") {
            const key = await sendRoomMessage("🗑️ Chat cleared by host.", "system-msg");
            if (key) lastSeenMessages[key] = true;
        }
    });
    document.getElementById("weather-select").addEventListener("change", (e) => changeWeather(e.target.value));
    initPomodoro();

    // friends modal
    document.getElementById("btn-study-friends").addEventListener("click", async () => {
        if (!document.getElementById("username").value.trim()) {
            alert("Enter your name first!");
            return;
        }
        await loadActiveRooms();
        document.getElementById("friends-modal").classList.remove("hidden");
    });
    document
        .getElementById("btn-close-friends")
        .addEventListener("click", () => document.getElementById("friends-modal").classList.add("hidden"));
    document.getElementById("btn-host-mode").addEventListener("click", () => {
        document.getElementById("host-panel").classList.remove("hidden");
        document.getElementById("join-panel").classList.add("hidden");
    });
    document.getElementById("btn-join-mode").addEventListener("click", () => {
        document.getElementById("join-panel").classList.remove("hidden");
        document.getElementById("host-panel").classList.add("hidden");
    });
    document.getElementById("btn-create-room").addEventListener("click", createRoom);
    document.getElementById("btn-copy-link").addEventListener("click", () =>
        navigator.clipboard.writeText(document.getElementById("room-link-display").innerText).then(() => {
            document.getElementById("btn-copy-link").innerText = "✅ COPIED!";
            setTimeout(() => (document.getElementById("btn-copy-link").innerText = "📋 COPY LINK"), 2000);
        })
    );
    document.getElementById("btn-enter-own-room").addEventListener("click", () => enterMultiplayerRoom(true));
    document.getElementById("btn-join-room").addEventListener("click", joinRoomHandler);

    // Add stats button to app bar
    const statsBtn = document.createElement("button");
    statsBtn.id = "btn-stats";
    statsBtn.className = "pixel-btn";
    statsBtn.style.cssText =
        "width:auto;padding:2px 8px;font-size:9px;margin:0;height:22px;background:#1a2a2a;border-color:#00ffff;color:#00ffff;";
    statsBtn.textContent = "📊 STATS";
    const powerBtn = document.getElementById("btn-power");
    powerBtn.parentNode.insertBefore(statsBtn, powerBtn);
    statsBtn.addEventListener("click", showStats);

    // Add Join Desk button between name and status badge
    const deskBtn = document.createElement("button");
    deskBtn.id = "btn-join-desk";
    deskBtn.className = "desk-join-btn";
    deskBtn.textContent = "🪑 JOIN DESK";
    const userMeta = document.querySelector(".user-meta");
    if (userMeta) {
        const statusBadge = document.getElementById("user-status-badge");
        userMeta.insertBefore(deskBtn, statusBadge);
    }
    deskBtn.addEventListener("click", joinDesk);

    // Room theme picker icon (top-right of login box)
    const loginBox = document.querySelector(".advanced-login");
    if (loginBox) {
        loginBox.style.position = "relative";
        const pickerBtn = document.createElement("button");
        pickerBtn.type = "button";
        pickerBtn.className = "theme-picker-icon";
        pickerBtn.textContent = "🎨";
        pickerBtn.title = "Room Theme";
        loginBox.appendChild(pickerBtn);
        pickerBtn.addEventListener("click", () => {
            const popup = document.createElement("div");
            popup.className = "theme-popup";
            let cardsHTML = "";
            Object.entries(ROOM_THEMES).forEach(([key, val]) => {
                cardsHTML += `<div class="theme-popup-card${key === roomTheme ? " active" : ""}" data-theme="${key}"><span class="tp-icon">${val.icon}</span><span class="tp-label">${val.label}</span></div>`;
            });
            popup.innerHTML = `<div class="theme-popup-box"><div class="theme-popup-title">🎨 Choose Room Theme</div><div class="theme-popup-grid">${cardsHTML}</div><button class="theme-popup-close" id="theme-popup-close">CLOSE</button></div>`;
            document.body.appendChild(popup);
            popup.querySelectorAll(".theme-popup-card").forEach((card) => {
                card.addEventListener("click", () => {
                    applyRoomTheme(card.dataset.theme);
                    popup.querySelectorAll(".theme-popup-card").forEach((c) => c.classList.remove("active"));
                    card.classList.add("active");
                });
            });
            popup.querySelector("#theme-popup-close").addEventListener("click", () => popup.remove());
            popup.addEventListener("click", (e) => {
                if (e.target === popup) popup.remove();
            });
        });
    }

    // coffee countdown ticker
    setInterval(() => {
        for (let n in onlineBots) {
            const b = onlineBots[n];
            if (b.coffeeWaiting && b.coffeeMessageId) {
                const r = Math.max(0, COFFEE_WAIT_SECONDS - b.coffeeWaitSeconds);
                const el = document.getElementById("coffee-timer-" + b.coffeeMessageId);
                if (el) el.innerText = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")} remaining`;
            }
        }
    }, 1000);

    setInterval(() => {
        if (typeof isInMultiplayer === "function" && isInMultiplayer()) {
            const myEl = document.getElementById("mp-time-me");
            if (myEl) myEl.innerText = formatTime(userSeconds);
        }
    }, 1000);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        const appVisible =
            document.getElementById("app-screen") &&
            !document.getElementById("app-screen").classList.contains("hidden");
        if (!appVisible) return;
        const anyModalOpen =
            !document.getElementById("shop-modal").classList.contains("hidden") ||
            !document.getElementById("admin-modal").classList.contains("hidden") ||
            !document.getElementById("friends-modal").classList.contains("hidden") ||
            !document.getElementById("stats-modal")?.classList.contains("hidden");
        if (e.key === "Escape") {
            document.getElementById("shop-modal").classList.add("hidden");
            document.getElementById("admin-modal").classList.add("hidden");
            document.getElementById("friends-modal").classList.add("hidden");
            const statsModal = document.getElementById("stats-modal");
            if (statsModal) statsModal.remove();
            return;
        }
        if (anyModalOpen) return;
        if (e.code === "Space" && !e.target.matches("input,textarea,select,button")) {
            e.preventDefault();
            document.getElementById("btn-pause").click();
        }
    });
});

// --- Study Stats ---
let totalStudySessions = 0,
    totalCharactersHelped = 0;
function loadStats() {
    try {
        const s = JSON.parse(localStorage.getItem("cozy_stats"));
        if (s) {
            (totalStudySessions = s.sessions || 0), (totalCharactersHelped = s.helped || 0);
        }
    } catch (e) {}
}
function incrementStat(type) {
    if (type === "session") totalStudySessions++;
    if (type === "helped") totalCharactersHelped++;
    localStorage.setItem("cozy_stats", JSON.stringify({ sessions: totalStudySessions, helped: totalCharactersHelped }));
}
function showStats() {
    const s = document.createElement("div");
    s.id = "stats-modal";
    s.className = "screen hidden";
    s.style.cssText = "position:fixed;top:0;left:0;background:rgba(0,0,0,0.85);z-index:999;";
    s.innerHTML = `<div class="login-box" style="width:360px;"><h2 class="neon-text" style="font-size:18px;color:#f1c40f;text-shadow:0 0 8px #f1c40f;">📊 Study Stats</h2><p class="subtitle">Your cozy room journey</p><div style="background:var(--bg-sub);border:1px solid var(--border-color);padding:12px;border-radius:4px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:11px;color:#8e81a0;">Total Study Time</span><span style="font-size:11px;color:#2ecc71;" id="stats-time">${formatTime(userSeconds)}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:11px;color:#8e81a0;">Sessions Completed</span><span style="font-size:11px;color:#3498db;" id="stats-sessions">${totalStudySessions}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:11px;color:#8e81a0;">Characters Helped</span><span style="font-size:11px;color:#e67e22;" id="stats-helped">${totalCharactersHelped}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:11px;color:#8e81a0;">Coins Earned</span><span style="font-size:11px;color:#f1c40f;">🪙 ${Math.floor(userCoins)}</span></div><div style="display:flex;justify-content:space-between;"><span style="font-size:11px;color:#8e81a0;">Coffee Stock</span><span style="font-size:11px;color:#fff;">☕ ${coffeeStock}</span></div></div><button id="btn-close-stats" class="pixel-btn">CLOSE</button></div>`;
    document.body.appendChild(s);
    s.classList.remove("hidden");
    document.getElementById("btn-close-stats").addEventListener("click", () => s.remove());
    s.addEventListener("click", (e) => {
        if (e.target === s) s.remove();
    });
}

// --- Join Desk ---
let deskTodos;
try {
    deskTodos = JSON.parse(localStorage.getItem("cozy_desk_todos")) || [];
} catch (e) {
    deskTodos = [];
}
let deskActive = false,
    deskUpdateInterval = null,
    pomoTimeLeft = 25 * 60,
    pomoRunning = false,
    pomoInterval = null;

function saveDeskTodos() {
    localStorage.setItem("cozy_desk_todos", JSON.stringify(deskTodos));
}

function pomoUpdateDisplay() {
    const mins = String(Math.floor(pomoTimeLeft / 60)).padStart(2, "0");
    const secs = String(Math.floor(pomoTimeLeft % 60)).padStart(2, "0");
    const pm = document.getElementById("pomo-minutes");
    const ps = document.getElementById("pomo-seconds");
    if (pm) pm.innerText = mins;
    if (ps) ps.innerText = secs;
    const cd = document.getElementById("desk-pomo-countdown");
    if (cd) {
        if (pomoRunning && pomoTimeLeft > 0) {
            cd.innerHTML = `<div style="font-size:20px;font-weight:bold;color:#e74c3c;margin-top:8px;">🍅 Pomodoro: ${mins}:${secs}</div>`;
        } else {
            cd.innerHTML = "";
        }
    }
    const dbtn = document.getElementById("desk-pomo-btn");
    if (dbtn) {
        if (pomoRunning) { dbtn.classList.add("active"); dbtn.innerText = "⏸ Stop"; }
        else { dbtn.classList.remove("active"); dbtn.innerText = "🍅 Pomodoro"; }
    }
    const bs = document.getElementById("btn-start-pomo");
    if (bs) {
        if (pomoRunning) { bs.innerText = "PAUSE"; bs.style.background = "#e67e22"; bs.style.color = "#fff"; }
        else { bs.innerText = "START"; bs.style.background = "var(--theme-main)"; bs.style.color = "#000"; }
    }
}

function pomoStart() {
    if (pomoRunning) return;
    pomoRunning = true;
    pomoUpdateDisplay();
    pomoInterval = setInterval(() => {
        if (pomoTimeLeft > 0) {
            pomoTimeLeft--;
            pomoUpdateDisplay();
        } else {
            pomoReset();
            alert("🍅 Pomodoro done! Time for a break.");
            addMsg("🎯 Pomodoro finished!", "system-msg");
        }
    }, 1000);
}

function pomoStop() {
    if (!pomoRunning) return;
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoRunning = false;
    pomoUpdateDisplay();
}

function pomoReset() {
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoRunning = false;
    pomoTimeLeft = 25 * 60;
    pomoUpdateDisplay();
}

function joinDesk() {
    if (deskActive) return;
    deskActive = true;
    const desk = document.createElement("div");
    desk.id = "desk-screen";
    desk.className = "desk-view";
    desk.innerHTML = `<div class="desk-left"><div class="desk-header"><span>📝 To-Do List</span><button class="leave-desk-btn" id="desk-leave-btn">🏠 Join Home</button></div><div class="desk-todo-list" id="desk-todo-list"></div><div class="desk-todo-add"><input type="text" id="desk-todo-input" placeholder="Add a task..." maxlength="100"><button id="desk-todo-add-btn">+</button></div></div><div class="desk-center"><div class="desk-achievements"><div class="ach-badge">🏆</div><div class="ach-title">Achievements</div><div class="ach-text">Coming Soon</div></div><div class="desk-timer-display" id="desk-timer">00:00:00</div><div class="desk-timer-label" id="desk-timer-label">Study Time</div><div class="desk-pomo-btns"><button class="desk-pomo-btn" id="desk-pomo-btn">🍅 Pomodoro</button><button class="desk-pomo-btn" id="desk-break-btn">☕ Break</button></div><div class="desk-pomo-countdown" id="desk-pomo-countdown"></div></div><div class="desk-right"><div class="desk-header"><span>💬 Chat</span><span class="desk-member-count" id="desk-member-count">👥 1 online</span></div><div class="desk-chat-messages" id="desk-chat-messages"></div><div class="desk-chat-input"><input type="text" id="desk-chat-input" placeholder="Type a message..."><button id="desk-chat-send">Send</button></div></div>`;
    document.body.appendChild(desk);

    renderDeskTodos();
    renderDeskChat();
    updateDeskTimer();
    updateDeskMemberCount();

    document.getElementById("desk-leave-btn").addEventListener("click", leaveDesk);
    document.getElementById("desk-todo-add-btn").addEventListener("click", addDeskTodo);
    document.getElementById("desk-todo-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") addDeskTodo();
    });
    document.getElementById("desk-chat-send").addEventListener("click", sendDeskChat);
    document.getElementById("desk-chat-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendDeskChat();
    });
    document.getElementById("desk-pomo-btn").addEventListener("click", toggleDeskPomodoro);
    document.getElementById("desk-break-btn").addEventListener("click", startDeskBreak);

    deskUpdateInterval = setInterval(() => {
        updateDeskTimer();
        updateDeskMemberCount();
    }, 1000);
}

function leaveDesk() {
    deskActive = false;
    const cd = document.getElementById("desk-pomo-countdown");
    if (cd) cd.innerHTML = "";
    const d = document.getElementById("desk-screen");
    if (d) d.remove();
}

function renderDeskTodos() {
    const list = document.getElementById("desk-todo-list");
    if (!list) return;
    list.innerHTML = "";
    deskTodos.forEach((todo, i) => {
        const item = document.createElement("div");
        item.className = "desk-todo-item" + (todo.done ? " done" : "");
        item.draggable = true;
        item.dataset.index = i;
        item.innerHTML = `<div class="desk-todo-check${todo.done ? " checked" : ""}" data-idx="${i}"></div><span class="desk-todo-text">${sanitizeHTML(todo.text)}</span><button class="desk-todo-delete" data-idx="${i}">✕</button>`;
        item.querySelector(".desk-todo-check").addEventListener("click", () => {
            deskTodos[i].done = !deskTodos[i].done;
            saveDeskTodos();
            renderDeskTodos();
        });
        item.querySelector(".desk-todo-delete").addEventListener("click", () => {
            deskTodos.splice(i, 1);
            saveDeskTodos();
            renderDeskTodos();
        });
        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", i);
            item.classList.add("dragging");
        });
        item.addEventListener("dragend", () => item.classList.remove("dragging"));
        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            item.style.borderColor = "var(--theme-main)";
        });
        item.addEventListener("dragleave", () => {
            item.style.borderColor = "";
        });
        item.addEventListener("drop", (e) => {
            e.preventDefault();
            item.style.borderColor = "";
            const from = parseInt(e.dataTransfer.getData("text/plain"));
            const to = i;
            if (from !== to) {
                const moved = deskTodos.splice(from, 1)[0];
                const adjustedTo = from < to ? to - 1 : to;
                deskTodos.splice(adjustedTo, 0, moved);
                saveDeskTodos();
                renderDeskTodos();
            }
        });
        list.appendChild(item);
    });
}

function addDeskTodo() {
    const input = document.getElementById("desk-todo-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text || deskTodos.length >= 20) return;
    deskTodos.push({ text, done: false });
    saveDeskTodos();
    renderDeskTodos();
    input.value = "";
}

function renderDeskChat() {
    const c = document.getElementById("desk-chat-messages");
    if (!c) return;
    c.innerHTML = "";
    chatHistory
        .filter((msg) => msg.cls !== "system-msg")
        .forEach((msg) => {
            const m = document.createElement("div");
            m.className = "message " + msg.cls;
            m.innerHTML = msg.text;
            c.appendChild(m);
        });
    c.scrollTop = c.scrollHeight;
}

async function sendDeskChat() {
    const input = document.getElementById("desk-chat-input");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addMsg(`<b>${sanitizeHTML(myName)}:</b> ${sanitizeHTML(text)}`, "user-msg");
    if (typeof isInMultiplayer === "function" && isInMultiplayer() && typeof sendRoomMessage === "function") {
        const key = await sendRoomMessage(`<b>${sanitizeHTML(myName)}:</b> ${sanitizeHTML(text)}`, "user-msg");
        if (key) lastSeenMessages[key] = true;
    }
    input.value = "";
}

function updateDeskTimer() {
    const el = document.getElementById("desk-timer");
    if (!el) return;
    el.innerText = formatTime(userSeconds);
}

function updateDeskMemberCount() {
    const el = document.getElementById("desk-member-count");
    if (!el) return;
    const count = Object.keys(onlineBots).length + 1;
    el.innerText = `👥 ${count} online`;
}

function toggleDeskPomodoro() {
    if (pomoRunning) {
        pomoStop();
        document.getElementById("desk-timer-label").innerText = "Study Time";
    } else {
        pomoStart();
        addMsg("🍅 Pomodoro started! Focus for 25 minutes.", "system-msg");
        document.getElementById("desk-timer-label").innerText = "🍅 Pomodoro Focus";
    }
}

function startDeskBreak() {
    const btn = document.getElementById("desk-break-btn");
    if (!btn) return;
    if (btn.innerText.includes("Stop")) {
        btn.classList.remove("active");
        btn.innerText = "☕ Break";
        document.getElementById("desk-timer-label").innerText = "Study Time";
        document.getElementById("desk-pomo-countdown").innerHTML = "";
        if (userStatus !== "Studying") {
            userStatus = "Studying";
            document.getElementById("user-status-badge").innerText = "Studying 📖";
            document.getElementById("user-status-badge").className = "status-badge studying";
            document.getElementById("btn-pause").textContent = "⏸ BREAK";
            document.getElementById("btn-pause").style.background = "#2a1a1a";
            document.getElementById("btn-pause").style.borderColor = "#e67e22";
            document.getElementById("btn-pause").style.color = "#e67e22";
            addMsg("📖 You resumed studying!", "system-msg");
        }
        updateMemberList();
        return;
    }
    if (pomoRunning) pomoStop();
    btn.classList.add("active");
    btn.innerText = "⏸ Stop";
    document.getElementById("desk-timer-label").innerText = "☕ Break Time";
    if (userStatus !== "Relaxing") {
        userStatus = "Relaxing";
        document.getElementById("user-status-badge").innerText = "Relaxing ⏳";
        document.getElementById("user-status-badge").className = "status-badge relaxing";
        document.getElementById("btn-pause").textContent = "▶ CONTINUE";
        document.getElementById("btn-pause").style.background = "#1a2a1a";
        document.getElementById("btn-pause").style.borderColor = "#2ecc71";
        document.getElementById("btn-pause").style.color = "#2ecc71";
    }
    addMsg("☕ Break time! Relax for 5 minutes.", "system-msg");
    updateMemberList();
}

// --- reset UI ---
function resetUI() {
    onlineBots = {};
    bannedBots = [];
    userStatus = "Studying";
    userSeconds = 0;
    userCoins = 0;
    coffeeStock = 0;
    lastSeenMessages = {};
    seenMpCoffeeBots = new Set();
    lastMpMembers = null;
    lastMpMyUserName = null;
    chatHistory = [];
    if (roomParticleInterval) {
        clearInterval(roomParticleInterval);
        roomParticleInterval = null;
    }
    applyRoomTheme("default");
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("btn-admin-panel").style.display = "none";
    document.getElementById("user-status-badge").innerText = "Studying 📖";
    document.getElementById("user-status-badge").className = "status-badge studying";
    const pauseBtn = document.getElementById("btn-pause");
    pauseBtn.textContent = "⏸ BREAK";
    pauseBtn.style.background = "#2a1a1a";
    pauseBtn.style.borderColor = "#e67e22";
    pauseBtn.style.color = "#e67e22";
    document.getElementById("user-timer").innerText = "00:00:00";
    document.getElementById("chat-messages").innerHTML =
        '<div class="message system-msg">ℹ️ Room initialized. Welcome!</div>';
    document.getElementById("member-list").innerHTML = "";
    updateShopDisplay();
}

window.onRoomDeleted = function () {
    clearAllIntervals();
    if (typeof leaveRoomGracefully === "function" && getCurrentRoomId()) {
        leaveRoomGracefully(myName, false);
    }
    clearSession();
    alert("⚠️ Room was deleted by host.");
    resetUI();
};

// --- SOLO initRoom ---
// skipGenerate=true when restoring session (bots already loaded)
function initRoom(skipGenerate) {
    clearAllIntervals();
    if (!skipGenerate) {
        onlineBots = {};
        const allChars = getAllCharacters();
        const pool = configSelectedPool.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const count = Math.min(configMaxMembers - 1, pool.length, 6);
        pool.slice(0, count).forEach((name) => {
            const fd = allChars.find((c) => c.name === name);
            onlineBots[name] = {
                status: Math.random() > 0.3 ? "Studying" : "Relaxing",
                timeSpent: Math.floor(Math.random() * 45) + 5,
                energy: Math.floor(Math.random() * 40) + 60,
                energyTickStudy: 0,
                energyTickRelax: 0,
                coffeeWaiting: false,
                coffeeWaitSeconds: 0,
                coffeeMessageId: null,
                quotes: fd || null,
                pass: fd ? fd.pass : "pass_" + Math.floor(Math.random() * 999),
                isFrozen: false,
                isLocked: false,
                color: BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)],
            };
        });
    } else {
        // ensure colors exist after JSON restore
        for (let n in onlineBots) {
            if (!onlineBots[n].color) onlineBots[n].color = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
        }
    }
    updateMemberList();
    timerInterval = setInterval(() => {
        if (userStatus === "Studying") {
            userSeconds++;
            userCoins += COINS_PER_MINUTE / 60;
            document.getElementById("user-timer").innerText = formatTime(userSeconds);
        }
        tickBots();
        if (userSeconds % 10 === 0) {
            updateMemberList();
        } else updateMemberTimesOnly();
    }, 1000);
    startSimulation();
}

function saveSoloSession() {
    saveSession({
        mode: "solo",
        userName: myName,
        theme: document.getElementById("theme-color")?.value || "cyan",
        roomTheme,
        userSeconds,
        userCoins,
        coffeeStock,
        configMaxMembers,
        configSelectionMode,
        configSelectedPool,
        configAllowOthers,
        configAllowLeave,
        configAllowRejoin,
        configAllowBotChat,
        bots: sanitizeBotsForStorage(),
        chatHistory,
    });
}
function saveMultiSession(roomId, pw, asHost) {
    saveSession({
        mode: "multi",
        userName: myName,
        theme: document.getElementById("theme-color")?.value || "cyan",
        roomTheme,
        roomId: roomId || getCurrentRoomId(),
        roomPassword: pw,
        isHost: asHost,
        userSeconds,
        userCoins,
        coffeeStock,
        chatHistory,
        bots: sanitizeBotsForStorage(),
    });
}

// strip non-serializable fields before saving
function sanitizeBotsForStorage() {
    const out = {};
    for (let n in onlineBots) {
        const b = onlineBots[n];
        out[n] = {
            status: b.status,
            timeSpent: b.timeSpent,
            energy: b.energy,
            energyTickStudy: b.energyTickStudy || 0,
            energyTickRelax: b.energyTickRelax || 0,
            coffeeWaiting: false,
            coffeeWaitSeconds: 0,
            coffeeMessageId: null,
            pass: b.pass,
            isFrozen: b.isFrozen,
            isLocked: b.isLocked,
            color: b.color,
            quotes: b.quotes,
        };
    }
    return out;
}

function tickBots() {
    for (let bot in onlineBots) {
        const b = onlineBots[bot];
        if (b.isFrozen) continue;
        if (b.status === "Studying" && !b.coffeeWaiting) {
            b.timeSpent += 1 / 60;
            b.energyTickStudy = (b.energyTickStudy || 0) + 1;
            if (b.energyTickStudy >= ENERGY_DRAIN_INTERVAL) {
                b.energy = Math.max(0, b.energy - 1);
                b.energyTickStudy = 0;
                if (b.energy === 0) triggerCoffeeRequest(bot);
            }
        } else if (b.status === "Relaxing" && !b.coffeeWaiting) {
            b.energyTickRelax = (b.energyTickRelax || 0) + 1;
            if (b.energyTickRelax >= ENERGY_RECOVER_INTERVAL) {
                b.energy = Math.min(100, b.energy + 1);
                b.energyTickRelax = 0;
                if (b.energy >= 30) b.status = "Studying";
            }
        }
        if (b.coffeeWaiting) {
            b.coffeeWaitSeconds++;
            if (b.coffeeWaitSeconds >= COFFEE_WAIT_SECONDS) expireCoffeeRequest(bot);
        }
    }
}

function triggerCoffeeRequest(name) {
    const b = onlineBots[name];
    if (!b || b.coffeeWaiting) return;
    b.coffeeWaiting = true;
    b.coffeeWaitSeconds = 0;
    b.status = "Relaxing";
    const msgId = "coffee-" + name.replace(/[^a-zA-Z0-9]/g, "-") + "-" + Date.now();
    b.coffeeMessageId = msgId;
    addMsg(
        `😩 <b>${sanitizeHTML(name)}:</b> I'm completely drained... I need coffee!<br><span class="coffee-btn waiting" data-coffee-name="${sanitizeHTML(name)}" title="Give Coffee">☕</span> <span style="font-size:9px;color:#665b75;" id="coffee-timer-${msgId}">2:00 remaining</span>`,
        "bot-msg-relax"
    );
    const c = document.getElementById("chat-messages");
    if (c && c.lastChild) {
        c.lastChild.id = msgId;
        c.lastChild.querySelector(".coffee-btn").addEventListener("click", () => giveCoffee(name));
    }
    updateMemberList();
    if (typeof isInMultiplayer === "function" && isInMultiplayer() && typeof sendRoomMessage === "function")
        sendRoomMessage(`😩 <b>${sanitizeHTML(name)}</b> needs coffee! Click ☕ to help.`, "bot-msg-relax");
}

function expireCoffeeRequest(name) {
    const b = onlineBots[name];
    if (!b) return;
    if (b.coffeeMessageId) {
        const el = document.getElementById(b.coffeeMessageId);
        if (el) {
            const btn = el.querySelector(".coffee-btn");
            if (btn) {
                btn.classList.remove("waiting");
                btn.classList.add("expired");
                btn.onclick = null;
            }
            const te = document.getElementById("coffee-timer-" + b.coffeeMessageId);
            if (te) te.innerText = "⏰ Too late!";
        }
    }
    if (!configAllowLeave) {
        addMsg(`☕ <b>${name}</b> missed coffee but stays (leave disabled).`, "system-msg");
        b.coffeeWaiting = false;
        b.coffeeWaitSeconds = 0;
        b.coffeeMessageId = null;
        b.status = "Studying";
        b.energy = Math.max(10, b.energy + 20);
    } else {
        addMsg(`🚪 <b>${name}</b> left — no coffee in time.`, "bot-msg-leave");
        delete onlineBots[name];
    }
    updateMemberList();
}

// FIX: use correct variable names (coffeeStock, onlineBots, COFFEE_PRICE, userCoins)
window.giveCoffee = function (name) {
    if (!onlineBots[name] || !onlineBots[name].coffeeWaiting) return;
    if (coffeeStock <= 0) {
        addMsg("☕ No coffee! Buy from 🛒 SHOP.", "system-msg");
        return;
    }
    coffeeStock--;
    onlineBots[name].energy = Math.min(100, onlineBots[name].energy + 70);
    onlineBots[name].coffeeWaiting = false;
    onlineBots[name].coffeeWaitSeconds = 0;
    onlineBots[name].status = "Studying";
    const mid = onlineBots[name].coffeeMessageId;
    if (mid) {
        const el = document.getElementById(mid);
        if (el) {
            const btn = el.querySelector(".coffee-btn");
            if (btn) {
                btn.classList.remove("waiting");
                btn.onclick = null;
                btn.style.cursor = "default";
            }
            const te = document.getElementById("coffee-timer-" + mid);
            if (te) te.innerText = "✅ Delivered!";
        }
    }
    onlineBots[name].coffeeMessageId = null;
    addMsg(`☕✅ <b>${sanitizeHTML(name)}</b> got coffee and is back! (Stock: ${coffeeStock})`, "bot-msg-study");
    incrementStat("helped");
    updateShopDisplay();
    updateMemberList();
};

function startSimulation() {
    if (simInterval) clearInterval(simInterval);
    simInterval = setInterval(
        () => {
            const botNames = Object.keys(onlineBots);
            if (botNames.length === 0) return;
            const n = botNames[Math.floor(Math.random() * botNames.length)];
            const b = onlineBots[n];
            if (b.isFrozen || b.coffeeWaiting) return;
            if (b.status === "Studying") {
                if (configAllowBotChat && Math.random() > 0.4 && b.quotes) {
                    addMsg(
                        `💬 <b>${sanitizeHTML(n)}:</b> "${b.quotes.studyQuotes[Math.floor(Math.random() * b.quotes.studyQuotes.length)]}"`,
                        "bot-msg-study"
                    );
                } else {
                    b.status = "Relaxing";
                    if (configAllowBotChat)
                        addMsg(
                            `⏳ <b>${sanitizeHTML(n)}:</b> ${b.quotes ? '"' + b.quotes.relaxQuotes[Math.floor(Math.random() * b.quotes.relaxQuotes.length)] + '"' : "Going to take a quick break."}`,
                            "bot-msg-relax"
                        );
                    updateMemberList();
                }
            } else {
                if (b.energy > 10) {
                    b.status = "Studying";
                    if (configAllowBotChat)
                        addMsg(
                            `📖 <b>${sanitizeHTML(n)}:</b> ${b.quotes ? '"' + b.quotes.studyQuotes[Math.floor(Math.random() * b.quotes.studyQuotes.length)] + '"' : "Back to my books!"}`,
                            "bot-msg-study"
                        );
                    updateMemberList();
                }
            }
        },
        Math.floor(Math.random() * 10000) + 12000
    );
}

function updateMemberList() {
    const ml = document.getElementById("member-list");
    ml.innerHTML = "";
    if (typeof isInMultiplayer === "function" && isInMultiplayer()) return;
    document.getElementById("member-count").innerText =
        `👥 Active Leaders (${Object.keys(onlineBots).length + 1}/${configMaxMembers})`;
    let list = Object.keys(onlineBots).map((n) => ({ name: n, ...onlineBots[n], isUser: false }));
    list.push({
        name: myName + " (YOU)",
        timeSpent: userSeconds / 60,
        status: userStatus,
        isUser: true,
        isFrozen: false,
        isLocked: false,
        energy: 100,
        coffeeWaiting: false,
        color: "var(--theme-main)",
    });
    list.sort((a, b) => b.timeSpent - a.timeSpent);
    list.forEach((m) => {
        const card = document.createElement("div");
        card.className = "member-card";
        const cid = m.name.replace(/[^a-zA-Z0-9]/g, "-");
        const icon = m.coffeeWaiting
            ? "☕"
            : m.isLocked
              ? "🔒"
              : m.isFrozen
                ? "❄️"
                : m.status === "Studying"
                  ? "📖"
                  : "⏳";
        const eBar = m.isUser
            ? ""
            : `<div class="energy-bar-wrap"><div class="energy-bar-fill" style="width:${m.energy}%;background:${getEnergyColor(m.energy)};"></div></div>`;
        card.innerHTML = `<div class="member-info"><span class="m-name" style="color:${m.color};font-weight:bold;text-shadow:0 0 6px ${m.color};">${m.name}${m.isFrozen ? '<span style="color:#3498db;font-size:8px;">[❄]</span>' : ""}${m.isLocked ? '<span style="color:#e74c3c;font-size:8px;">[🔒]</span>' : ""}${m.coffeeWaiting ? '<span style="color:#f39c12;font-size:8px;">[☕]</span>' : ""}</span><span class="m-time" id="time-${cid}">${formatTime(Math.floor(m.timeSpent * 60))}</span>${eBar}</div><span class="m-status-icon">${icon}</span>`;
        ml.appendChild(card);
    });
}

function updateMemberTimesOnly() {
    for (let n in onlineBots) {
        const el = document.getElementById("time-" + n.replace(/[^a-zA-Z0-9]/g, "-"));
        if (el && onlineBots[n].status === "Studying" && !onlineBots[n].isFrozen)
            el.innerText = formatTime(Math.floor(onlineBots[n].timeSpent * 60));
    }
    const myEl = document.getElementById("time-" + (myName + " (YOU)").replace(/[^a-zA-Z0-9]/g, "-"));
    if (myEl && userStatus === "Studying") myEl.innerText = formatTime(userSeconds);
}

// --- ADMIN ---
function renderAdminPanelUsers() {
    const list = document.getElementById("admin-users-list");
    list.innerHTML = "";
    for (let name in onlineBots) {
        const b = onlineBots[name];
        const row = document.createElement("div");
        row.className = "admin-row";
        const credentials = document.createElement("div");
        credentials.className = "credentials";
        credentials.innerHTML = `<span style="color:#fff;font-weight:bold;">👤 ${sanitizeHTML(name)}${b.isFrozen ? " (❄)" : ""}${b.isLocked ? " (🔒)" : ""}${b.coffeeWaiting ? " ☕" : ""}</span><span>🔑 ${sanitizeHTML(b.pass)}</span><span>⚡ <span style="color:${getEnergyColor(b.energy)}">${Math.floor(b.energy)}%</span></span>`;
        const actions = document.createElement("div");
        actions.className = "admin-actions";
        const lockBtn = document.createElement("button");
        lockBtn.className = b.isLocked ? "admin-btn unlock" : "admin-btn lock";
        lockBtn.textContent = b.isLocked ? "UNLOCK" : "LOCK";
        lockBtn.addEventListener("click", () => adminToggleLock(name));
        const freezeBtn = document.createElement("button");
        freezeBtn.className = b.isFrozen ? "admin-btn unfreeze" : "admin-btn freeze";
        freezeBtn.textContent = b.isFrozen ? "UNFREEZE" : "FREEZE";
        freezeBtn.addEventListener("click", () => adminToggleFreeze(name));
        const resetBtn = document.createElement("button");
        resetBtn.className = "admin-btn reset";
        resetBtn.textContent = "RESET";
        resetBtn.addEventListener("click", () => adminResetTime(name));
        const banBtn = document.createElement("button");
        banBtn.className = "admin-btn ban";
        banBtn.textContent = "BAN";
        banBtn.addEventListener("click", () => adminBan(name));
        actions.append(lockBtn, freezeBtn, resetBtn, banBtn);
        row.append(credentials, actions);
        list.appendChild(row);
    }
}
window.adminToggleFreeze = function (n) {
    if (onlineBots[n]) {
        onlineBots[n].isFrozen = !onlineBots[n].isFrozen;
        addMsg(`${onlineBots[n].isFrozen ? "❄️" : "🔥"} ${n}`, "system-msg");
        updateMemberList();
        renderAdminPanelUsers();
    }
};
window.adminToggleLock = function (n) {
    if (onlineBots[n]) {
        onlineBots[n].isLocked = !onlineBots[n].isLocked;
        addMsg(`${onlineBots[n].isLocked ? "🔒" : "🔓"} ${n}`, "system-msg");
        updateMemberList();
        renderAdminPanelUsers();
    }
};
window.adminResetTime = function (n) {
    if (onlineBots[n]) {
        onlineBots[n].timeSpent = 0;
        addMsg(`🧹 ${n} time reset.`, "system-msg");
        updateMemberList();
        renderAdminPanelUsers();
    }
};
window.adminBan = function (n) {
    if (onlineBots[n]) {
        bannedBots.push(n);
        delete onlineBots[n];
        addMsg(`🚫 ${n} banned.`, "bot-msg-leave");
        updateMemberList();
        renderAdminPanelUsers();
    }
};

// --- WEATHER ---
function changeWeather(type) {
    clearInterval(weatherInterval);
    const ov = document.getElementById("weather-overlay");
    ov.innerHTML = "";
    document.body.className = document.body.className.replace(/weather-\w+/g, "");
    if (type === "clear") {
        document.body.classList.add("weather-clear");
    } else if (type === "rainy") {
        document.body.classList.add("weather-rainy");
        weatherInterval = setInterval(() => {
            for (let i = 0; i < 3; i++) {
                const d = document.createElement("div");
                d.className = "drop";
                d.style.left = Math.random() * 100 + "vw";
                d.style.animationDuration = Math.random() * 0.5 + 0.5 + "s";
                d.style.opacity = Math.random() * 0.4 + 0.2;
                ov.appendChild(d);
                setTimeout(() => d.remove(), 1000);
            }
        }, 60);
    } else if (type === "snowy") {
        document.body.classList.add("weather-snowy");
        weatherInterval = setInterval(() => {
            for (let i = 0; i < 2; i++) {
                const f = document.createElement("div");
                f.className = "flake";
                f.style.left = Math.random() * 100 + "vw";
                f.style.animationDuration = Math.random() * 2 + 2 + "s";
                f.style.width = Math.random() * 3 + 2 + "px";
                f.style.height = f.style.width;
                f.style.opacity = Math.random() * 0.6 + 0.3;
                ov.appendChild(f);
                setTimeout(() => f.remove(), 4000);
            }
        }, 150);
    }
    updateWeatherBtnStyle(type);
}
function updateWeatherBtnStyle(type) {
    const el = document.getElementById("weather-select");
    if (!el) return;
    const styles = {
        clear: { bg: "#2a2a1a", border: "#f1c40f" },
        rainy: { bg: "#1a1a2a", border: "#3498db" },
        snowy: { bg: "#1a2a2a", border: "#a29bfe" },
    };
    const s = styles[type] || styles.clear;
    el.style.background = s.bg;
    el.style.borderColor = s.border;
    el.style.color = s.border;
}

// --- POMODORO ---
function initPomodoro() {
    document.getElementById("btn-start-pomo").addEventListener("click", () => {
        if (pomoRunning) {
            pomoStop();
        } else {
            pomoStart();
        }
    });
    document.getElementById("btn-reset-pomo").addEventListener("click", () => {
        pomoReset();
    });
    pomoUpdateDisplay();
}

// --- PRESETS ---
function loadPresetsFromStorage() {
    try {
        var s = JSON.parse(localStorage.getItem("cozy_presets")) || {};
    } catch (e) {
        var s = {};
    }
    const sel = document.getElementById("preset-history");
    sel.innerHTML = '<option value="default">✨ Default Cozy Room</option>';
    for (let n in s) {
        const o = document.createElement("option");
        o.value = n;
        o.innerText = `⏳ [History] ${n}`;
        sel.appendChild(o);
    }
}
function applyPreset(e) {
    if (e.target.value === "default") return;
    try {
        var presets = JSON.parse(localStorage.getItem("cozy_presets")) || {};
    } catch (e) {
        var presets = {};
    }
    const p = presets[e.target.value];
    if (!p) return;
    document.getElementById("username").value = p.user || "";
    document.getElementById("theme-color").value = p.theme || "cyan";
    document.getElementById("max-members").value = p.max;
    document.getElementById("char-selection-mode").value = p.mode;
    document.getElementById("allow-others").checked = p.allowOthers;
    document.getElementById("allow-leave").checked = p.allowLeave;
    document.getElementById("allow-rejoin").checked = p.allowRejoin;
    if (p.mode === "custom") {
        document.getElementById("manual-chars-wrapper").classList.remove("hidden");
        renderCharacterCheckboxes();
        document.querySelectorAll(".bot-selector-check").forEach((c) => {
            c.checked = p.selectedPool.includes(c.value);
        });
    }
    document.getElementById("advanced-panel").classList.remove("hidden");
}
function renderCharacterCheckboxes() {
    const l = document.getElementById("chars-checkbox-list");
    l.innerHTML = "";
    getAllCharacters().forEach((c) => {
        const r = document.createElement("div");
        r.className = "checkbox-item-row";
        const label = document.createElement("label");
        label.className = "pixel-checkbox";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "bot-selector-check";
        cb.value = c.name;
        cb.checked = true;
        const span = document.createElement("span");
        span.className = "checkmark";
        label.append(cb, span, " " + c.name);
        r.appendChild(label);
        if (c.isCustom) {
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn-delete-char";
            delBtn.textContent = "❌";
            delBtn.addEventListener("click", () => deleteCustomCharacter(c.name));
            r.appendChild(delBtn);
        }
        l.appendChild(r);
    });
}
window.deleteCustomCharacter = function (name) {
    if (confirm(`Delete "${name}"?`)) {
        try {
            var p = JSON.parse(localStorage.getItem("cozy_custom_chars")) || [];
        } catch (e) {
            var p = [];
        }
        localStorage.setItem("cozy_custom_chars", JSON.stringify(p.filter((c) => c.name !== name)));
        renderCharacterCheckboxes();
    }
};
function saveCustomChar() {
    const name = document.getElementById("new-char-name").value.trim();
    if (!name) {
        alert("Enter a name!");
        return;
    }
    const pass = document.getElementById("new-char-pass").value.trim() || "pass123";
    const sq = document.getElementById("new-char-study").value.trim();
    const rq = document.getElementById("new-char-relax").value.trim();
    const obj = {
        name,
        pass,
        studyQuotes: sq ? sq.split("|").map((q) => q.trim()) : ["Let's study! 📖"],
        relaxQuotes: rq ? rq.split("|").map((q) => q.trim()) : ["Taking a break ☕"],
        isCustom: true,
    };
    try {
        var p = JSON.parse(localStorage.getItem("cozy_custom_chars")) || [];
    } catch (e) {
        var p = [];
    }
    p = p.filter((c) => c.name.toLowerCase() !== name.toLowerCase());
    p.push(obj);
    localStorage.setItem("cozy_custom_chars", JSON.stringify(p));
    ["new-char-name", "new-char-pass", "new-char-study", "new-char-relax"].forEach(
        (id) => (document.getElementById(id).value = "")
    );
    document.getElementById("character-creator-panel").classList.add("hidden");
    renderCharacterCheckboxes();
}

// --- MULTIPLAYER ---
async function loadActiveRooms() {
    const container = document.getElementById("active-rooms-list");
    container.innerHTML = "";
    try {
        var saved = JSON.parse(localStorage.getItem("cozy_my_rooms")) || [];
    } catch (e) {
        var saved = [];
    }
    if (!saved.length) return;
    const active = await getActiveRooms(saved);
    if (!active.length) return;
    container.innerHTML = '<div style="font-size:9px;color:#8e81a0;margin-bottom:6px;">🟢 YOUR ACTIVE ROOMS:</div>';
    active.forEach((r) => {
        const div = document.createElement("div");
        div.style.cssText =
            "background:#0d1a0d;border:1px solid #2ecc71;padding:8px 12px;border-radius:4px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:10px;";
        div.innerHTML = `<span style="color:#2ecc71;">🏠 <b>${r.id}</b> — <b>${r.memberCount}</b> online</span><span style="color:#8e81a0;font-size:9px;">host: ${r.host}</span>`;
        div.onclick = () => {
            document.getElementById("join-room-id").value = r.id;
            document.getElementById("btn-join-mode").click();
        };
        container.appendChild(div);
    });
}

async function createRoom() {
    const pw = document.getElementById("host-password").value.trim();
    if (!pw) {
        alert("Set a password!");
        return;
    }
    const name = document.getElementById("username").value.trim();
    const maxM = parseInt(document.getElementById("host-max-members").value) || 10;
    const allowBots = document.getElementById("host-allow-bots").checked;
    const st = document.getElementById("friends-status-msg");
    st.style.color = "#f1c40f";
    st.innerText = "Creating room...";
    try {
        const roomId = await hostRoom(name, pw, maxM, allowBots);
        try {
            var mr = JSON.parse(localStorage.getItem("cozy_my_rooms")) || [];
        } catch (e) {
            var mr = [];
        }
        if (!mr.includes(roomId)) mr.push(roomId);
        localStorage.setItem("cozy_my_rooms", JSON.stringify(mr));
        const link = `${location.href.split("?")[0]}?room=${roomId}`;
        document.getElementById("room-link-display").innerText = link;
        document.getElementById("room-id-display").innerText = roomId;
        document.getElementById("room-created-info").classList.remove("hidden");
        // store pw for restore
        try {
            var pwS = JSON.parse(localStorage.getItem("cozy_room_pw")) || {};
        } catch (e) {
            var pwS = {};
        }
        pwS[roomId] = pw;
        localStorage.setItem("cozy_room_pw", JSON.stringify(pwS));
        st.style.color = "#2ecc71";
        st.innerText = "✅ Room created!";
        mpRoomMeta = { maxMembers: maxM, allowBots };
    } catch (e) {
        st.style.color = "#e74c3c";
        st.innerText = "Error: " + e.message;
    }
}

async function joinRoomHandler() {
    let input = document.getElementById("join-room-id").value.trim();
    const pw = document.getElementById("join-password").value.trim();
    const name = document.getElementById("username").value.trim();
    if (!input || !pw) {
        alert("Fill Room ID and password!");
        return;
    }
    if (input.includes("?room=")) input = input.split("?room=")[1];
    const roomId = input.toUpperCase();
    const st = document.getElementById("friends-status-msg");
    st.style.color = "#f1c40f";
    st.innerText = "Joining room...";
    try {
        const meta = await joinRoom(roomId, pw, name);
        mpRoomMeta = meta;
        st.style.color = "#2ecc71";
        st.innerText = "✅ Joined! Entering...";
        setTimeout(() => enterMultiplayerRoom(false, roomId, pw), 800);
    } catch (e) {
        st.style.color = "#e74c3c";
        st.innerText = "Error: " + e.message;
    }
}

function enterMultiplayerRoom(asHost, roomId, pw) {
    const name = document.getElementById("username").value.trim();
    const theme = document.getElementById("theme-color").value;
    myName = name;
    userSeconds = 0;
    userCoins = 0;
    coffeeStock = 0;
    onlineBots = {};
    bannedBots = [];
    applyTheme(theme);
    document.getElementById("theme-color").value = theme;
    document.getElementById("display-username").innerText = name;
    document.getElementById("user-timer").innerText = "00:00:00";
    document.getElementById("friends-modal").classList.add("hidden");
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    if (asHost) document.getElementById("btn-admin-panel").style.display = "block";
    const rid = roomId || getCurrentRoomId();
    const rpw = pw || document.getElementById("host-password").value || document.getElementById("join-password").value;
    try {
        var saved = JSON.parse(localStorage.getItem("cozy_mp_session")) || {};
    } catch (e) {
        var saved = {};
    }
    delete saved[rid];
    localStorage.setItem("cozy_mp_session", JSON.stringify(saved));
    addMsg(`🌐 <b>Multiplayer Room: ${rid}</b>`, "system-msg");
    saveSession({
        mode: "multi",
        userName: name,
        theme,
        roomId: rid,
        roomPassword: rpw,
        isHost: asHost,
        userSeconds: 0,
        userCoins: 0,
        coffeeStock: 0,
    });
    startMultiplayerTimers(asHost, rid, rpw);
    if (asHost && mpRoomMeta && mpRoomMeta.allowBots) setupBotsForMultiplayer(mpRoomMeta);
}

function startMultiplayerTimers(asHost, roomId, pw) {
    clearAllIntervals();
    timerInterval = setInterval(() => {
        if (userStatus === "Studying") {
            userSeconds++;
            userCoins += COINS_PER_MINUTE / 60;
            document.getElementById("user-timer").innerText = formatTime(userSeconds);
        }
    }, 1000);
    syncMyStatus(myName, userStatus, userSeconds);
    multiplayerSyncInterval = setInterval(() => {
        syncMyStatus(myName, userStatus, userSeconds);
        saveMultiSession(roomId, pw, asHost);
    }, 10000);
    botTimerUpdateInterval = setInterval(() => {
        const bots = typeof getIsHost === "function" && getIsHost() ? onlineBots : window._mpBots || {};
        for (const n in bots) {
            const cid = n.replace(/[^a-zA-Z0-9]/g, "-");
            const el = document.getElementById("mp-bot-time-" + cid);
            if (el) el.innerText = formatTime(Math.floor((bots[n].timeSpent || 0) * 60));
        }
    }, 60000);
}

// FIX: properly init bots and sync to Firebase so all users see them
function setupBotsForMultiplayer(meta) {
    configMaxMembers = meta.maxMembers || 10;
    configSelectedPool = getAllCharacters().map((c) => c.name);
    configAllowOthers = true;
    configAllowLeave = true;
    configAllowRejoin = true;
    // generate initial bots
    const allChars = getAllCharacters();
    const pool = configSelectedPool.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const count = Math.min(3, pool.length);
    pool.slice(0, count).forEach((name) => {
        const fd = allChars.find((c) => c.name === name);
        onlineBots[name] = {
            status: Math.random() > 0.3 ? "Studying" : "Relaxing",
            timeSpent: Math.floor(Math.random() * 20) + 1,
            energy: Math.floor(Math.random() * 40) + 60,
            energyTickStudy: 0,
            energyTickRelax: 0,
            coffeeWaiting: false,
            coffeeWaitSeconds: 0,
            coffeeMessageId: null,
            quotes: fd || null,
            pass: fd ? fd.pass : "pass_" + Math.floor(Math.random() * 999),
            isFrozen: false,
            isLocked: false,
            color: BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)],
        };
    });
    // tick bots locally (host only)
    botTickInterval = setInterval(tickBots, 1000);
    startSimulation();
    // sync bots to Firebase immediately + every 60s so ALL users see them
    if (typeof syncBotState === "function") {
        const toSync = {};
        for (let n in onlineBots) {
            const b = onlineBots[n];
            toSync[n] = {
                status: b.status,
                timeSpent: b.timeSpent,
                energy: b.energy,
                coffeeWaiting: b.coffeeWaiting,
                color: b.color,
            };
        }
        syncBotState(toSync);
    }
    botSyncInterval = setInterval(() => {
        if (typeof syncBotState === "function") {
            const toSync = {};
            for (let n in onlineBots) {
                const b = onlineBots[n];
                toSync[n] = {
                    status: b.status,
                    timeSpent: b.timeSpent,
                    energy: b.energy,
                    coffeeWaiting: b.coffeeWaiting,
                    color: b.color,
                };
            }
            syncBotState(toSync);
        }
    }, 60000);
}

// --- Multiplayer callbacks ---
function renderMpBots(ml) {
    const bots = typeof getIsHost === "function" && getIsHost() ? onlineBots : window._mpBots || {};
    Object.entries(bots).forEach(([n, b]) => {
        const card = document.createElement("div");
        card.className = "member-card bot-mp-card";
        const icon = b.coffeeWaiting ? "☕" : b.status === "Studying" ? "📖" : "⏳";
        const cid = n.replace(/[^a-zA-Z0-9]/g, "-");
        const eBar = `<div class="energy-bar-wrap"><div class="energy-bar-fill" style="width:${b.energy || 0}%;background:${getEnergyColor(b.energy || 0)};"></div></div>`;
        card.innerHTML = `<div class="member-info"><span class="m-name" style="color:${b.color || "#aaa"};font-weight:bold;">🤖 ${n}${b.coffeeWaiting ? ' <span style="color:#f39c12;font-size:8px;">[☕]</span>' : ""}</span><span class="m-time" id="mp-bot-time-${cid}">${formatTime(Math.floor((b.timeSpent || 0) * 60))}</span>${eBar}</div><span class="m-status-icon">${icon}</span>`;
        ml.appendChild(card);
    });
}

function renderMpMemberList(members, myUserName) {
    const ml = document.getElementById("member-list");
    ml.innerHTML = "";
    document.getElementById("member-count").innerText = `👥 Online (${Object.keys(members).length})`;
    Object.entries(members).forEach(([name, data]) => {
        const card = document.createElement("div");
        card.className = "member-card";
        const isMe = name === myUserName;
        const icon = data.status === "Studying" ? "📖" : "⏳";
        const color = isMe ? "var(--theme-main)" : "#a29bfe";
        const timeDisplay = isMe
            ? `<span class="m-time" id="mp-time-me">${formatTime(userSeconds)}</span>`
            : `<span class="m-time">${formatTime(data.timeSpent || 0)}</span>`;
        card.innerHTML = `<div class="member-info"><span class="m-name" style="color:${color};font-weight:bold;text-shadow:0 0 6px ${color};">${name}${isMe ? " (YOU)" : ""}${data.isHost ? " 👑" : ""}</span>${timeDisplay}</div><span class="m-status-icon">${icon}</span>`;
        ml.appendChild(card);
    });
    renderMpBots(ml);
}

window.onMultiplayerMembersUpdate = function (members, myUserName) {
    lastMpMembers = members;
    lastMpMyUserName = myUserName;
    renderMpMemberList(members, myUserName);
};

window.onMultiplayerBotsUpdate = function (bots) {
    window._mpBots = bots;
    if (lastMpMembers) renderMpMemberList(lastMpMembers, lastMpMyUserName);
    Object.entries(bots).forEach(([n, b]) => {
        if (b.coffeeWaiting) {
            if (!seenMpCoffeeBots.has(n)) {
                seenMpCoffeeBots.add(n);
                const mid = "mp-coffee-" + n.replace(/[^a-zA-Z0-9]/g, "-");
                if (!document.getElementById(mid)) {
                    addMsg(
                        `😩 <b>${sanitizeHTML(n)}:</b> I need coffee!<br><span class="coffee-btn waiting" data-coffee-mp="${sanitizeHTML(n)}" title="Give Coffee">☕</span>`,
                        "bot-msg-relax"
                    );
                    const c = document.getElementById("chat-messages");
                    if (c && c.lastChild) {
                        c.lastChild.id = mid;
                        c.lastChild.querySelector(".coffee-btn").addEventListener("click", () => giveCoffeeMp(n));
                    }
                }
            }
        } else {
            seenMpCoffeeBots.delete(n);
        }
    });
};

window.giveCoffeeMp = async function (name) {
    if (coffeeStock <= 0) {
        addMsg("☕ No coffee! Buy from 🛒 SHOP.", "system-msg");
        return;
    }
    coffeeStock--;
    updateShopDisplay();
    addMsg(`☕ You gave coffee to <b>${sanitizeHTML(name)}</b>! (Stock: ${coffeeStock})`, "bot-msg-study");
    if (typeof sendRoomMessage === "function") {
        const key = await sendRoomMessage(
            `☕ <b>${sanitizeHTML(myName)}</b> gave coffee to <b>${sanitizeHTML(name)}</b>!`,
            "bot-msg-study"
        );
        if (key) lastSeenMessages[key] = true;
    }
};

window.onMultiplayerMessagesUpdate = function (msgs) {
    Object.entries(msgs).forEach(([k, m]) => {
        if (!lastSeenMessages[k]) {
            lastSeenMessages[k] = true;
            addMsg(m.text, m.type || "system-msg");
        }
    });
    const keys = Object.keys(lastSeenMessages);
    if (keys.length > 500) keys.slice(0, keys.length - 500).forEach((k) => delete lastSeenMessages[k]);
};
