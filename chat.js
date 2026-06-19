/* =========================================================================
 * CHAT.JS: CLIENTE DE CHAT (WebSocket) PARA EL CANAL SEPGOD
 * Portado desde landing-page-v2 (ChatComponent.astro + ChatFunctions.ts)
 * a JavaScript plano, sin sistema de build. Se conecta al backend
 * webchat-go en producción y reutiliza su contrato REST + WebSocket.
 * ========================================================================= */
(function () {
    "use strict";

    // --- Configuración (sin sistema de env: valores fijos de producción) ---
    var BACKEND_URL = "https://chat.asciicrawler.com";
    var WS_BASE_URL = "wss://chat.asciicrawler.com";
    var RECONNECT_BASE_MS = 500;
    var RECONNECT_MAX_MS = 30000;
    var CONNECT_TIMEOUT_MS = 10000;
    var RECONNECT_JITTER = 0.2;
    var CHAT_SESSION_KEY = "CHAT_SESSION_KEY";
    var ERROR_GRACE_MS = 2000;
    var RECONNECT_GRACE_MS = 15000;

    // --- URLs por sala ---
    var roomPath = function (room) {
        return encodeURIComponent(room);
    };

    var roomAPIURL = function (room, path) {
        return BACKEND_URL + "/rooms/" + roomPath(room) + path;
    };

    var roomWSURL = function (room) {
        return WS_BASE_URL + "/rooms/" + roomPath(room) + "/ws";
    };

    var sessionKey = function (room) {
        return CHAT_SESSION_KEY + ":" + room;
    };

    // --- Helpers de datos ---
    var parseToDate = function (seconds) {
        var date = new Date(seconds * 1000);
        var pad = function (n) {
            return n.toString().padStart(2, "0");
        };
        var hours = pad(date.getHours());
        var minutes = pad(date.getMinutes());
        var day = pad(date.getDate());
        var month = pad(date.getMonth() + 1);
        var year = date.getFullYear().toString().slice(-2);
        return hours + ":" + minutes + " " + day + "/" + month + "/" + year;
    };

    var GetAllMessages = function (room) {
        return fetch(roomAPIURL(room, "/get-last-messages"))
            .then(function (response) {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .catch(function () {
                return [];
            });
    };

    var getChatState = function (room) {
        return fetch(roomAPIURL(room, "/chat-state"))
            .then(function (response) {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .catch(function () {
                return null;
            });
    };

    var getStats = function (room) {
        return fetch(roomAPIURL(room, "/stats"))
            .then(function (response) {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .catch(function () {
                return null;
            });
    };

    var getRandomUser = function (room) {
        return fetch(roomAPIURL(room, "/get-random-user"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "null"
        })
            .then(function (response) {
                return response.ok ? response.json() : null;
            })
            .catch(function () {
                return null;
            });
    };

    var validateUser = function (room, username, token) {
        return fetch(roomAPIURL(room, "/validate-user"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, token: token })
        })
            .then(function (response) {
                return response.ok ? response.json() : false;
            })
            .catch(function () {
                return false;
            });
    };

    var getUser = function (room) {
        var key = sessionKey(room);
        var storedUser = localStorage.getItem(key);
        var afterStored;

        if (storedUser) {
            try {
                var parsedUser = JSON.parse(storedUser);
                afterStored = validateUser(room, parsedUser.username, parsedUser.token).then(function (isValid) {
                    return isValid ? parsedUser : null;
                });
            } catch (e) {
                afterStored = Promise.resolve(null);
            }
        } else {
            afterStored = Promise.resolve(null);
        }

        return afterStored.then(function (validUser) {
            if (validUser) return validUser;
            return getRandomUser(room).then(function (user) {
                if (user) localStorage.setItem(key, JSON.stringify(user));
                else localStorage.removeItem(key);
                return user;
            });
        });
    };

    // --- Helpers de estilo ---
    var getUserColor = function (username) {
        var hash = 0;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        var h = Math.abs(hash) % 360;
        return "hsl(" + h + ", 70%, 60%)";
    };

    var getTextClass = function (text) {
        var words = text.split(" ");
        for (var i = 0; i < words.length; i++) {
            if (words[i].length >= 30) {
                return "chat__message-text chat__message-text--anywhere";
            }
        }
        return "chat__message-text";
    };

    // --- Cliente WebSocket ---
    function ChatClient(room, user, onMessage, onError, onClose, onOpen, onStatusChange) {
        this.ws = null;
        this.room = room;
        this.user = user;
        this.onMessage = onMessage;
        this.onError = onError;
        this.onClose = onClose;
        this.onOpen = onOpen || null;
        this.onStatusChange = onStatusChange || null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.connectTimeout = null;
        this.shouldReconnect = true;
        this.isConnecting = false;
    }

    ChatClient.prototype.connect = function () {
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.openSocket(false);
    };

    ChatClient.prototype.openSocket = function (isReconnect) {
        var self = this;
        if (this.isConnecting) return;
        this.isConnecting = true;
        if (!isReconnect && this.onStatusChange) this.onStatusChange("connecting");
        this.clearReconnectTimer();
        this.clearConnectTimeout();

        try {
            this.ws = new WebSocket(roomWSURL(this.room));
        } catch (e) {
            this.isConnecting = false;
            this.onError();
            this.scheduleReconnect();
            return;
        }

        this.connectTimeout = setTimeout(function () {
            if (self.ws && self.ws.readyState !== WebSocket.OPEN) {
                self.ws.close(4000, "connect timeout");
            }
        }, CONNECT_TIMEOUT_MS);

        this.ws.onopen = function () {
            self.isConnecting = false;
            self.clearConnectTimeout();
            self.reconnectAttempts = 0;
            if (self.ws) {
                self.ws.send(JSON.stringify({
                    username: self.user.username,
                    token: self.user.token
                }));
            }
            if (self.onOpen) self.onOpen();
            if (self.onStatusChange) self.onStatusChange("open");
        };

        this.ws.onmessage = function (event) {
            try {
                var msg = JSON.parse(event.data);
                self.onMessage(msg);
            } catch (e) {
                console.error("Failed to parse message", event.data);
            }
        };

        this.ws.onerror = function () {
            self.onError();
        };

        this.ws.onclose = function (event) {
            self.isConnecting = false;
            self.clearConnectTimeout();
            self.onClose();
            if (event.reason === "chat unavailable" || event.reason === "chat is currently unavailable") {
                self.shouldReconnect = false;
                if (self.onStatusChange) self.onStatusChange("unavailable");
                return;
            }
            if (self.shouldReconnect) {
                self.scheduleReconnect();
            } else if (self.onStatusChange) {
                self.onStatusChange("closed");
            }
        };
    };

    ChatClient.prototype.scheduleReconnect = function () {
        var self = this;
        if (!this.shouldReconnect) return;
        this.clearReconnectTimer();
        var attempt = Math.min(this.reconnectAttempts, 10);
        var backoff = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * Math.pow(2, attempt));
        var jitter = backoff * RECONNECT_JITTER * (Math.random() * 2 - 1);
        var delay = Math.max(0, backoff + jitter);
        this.reconnectAttempts += 1;
        if (this.onStatusChange) this.onStatusChange("reconnecting");
        this.reconnectTimer = setTimeout(function () {
            self.openSocket(true);
        }, delay);
    };

    ChatClient.prototype.clearReconnectTimer = function () {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    };

    ChatClient.prototype.clearConnectTimeout = function () {
        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
        }
    };

    ChatClient.prototype.sendMessage = function (text) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(text);
        }
    };

    ChatClient.prototype.disconnect = function () {
        this.shouldReconnect = false;
        this.clearReconnectTimer();
        this.clearConnectTimeout();
        if (this.ws) {
            this.ws.close();
        }
    };

    // =========================================================================
    // ORQUESTACIÓN DE LA INTERFAZ
    // =========================================================================
    var chatRoot = document.getElementById("chat");
    if (!chatRoot) return;

    var chatButton = document.getElementById("chat-button");
    var chatInput = document.getElementById("chat-input");
    var messageContainer = document.getElementById("chat-messages");
    var notificationAudio = document.getElementById("chat-notification-audio");
    var statsContainer = document.getElementById("chat-stats");
    var statsClients = document.getElementById("chat-stats-clients");
    var statsMessages = document.getElementById("chat-stats-messages");
    var statsUptime = document.getElementById("chat-stats-uptime");
    var statsDb = document.getElementById("chat-stats-db");
    var chatRoom = chatRoot.dataset.chatRoom || "sepgod";

    // Estado
    var chatClient = null;
    var isAutoScroll = true;
    var errorNode = null;
    var hasConnectedOnce = false;
    var isConnecting = false;
    var pendingErrorTimeout = null;

    var playNotification = function () {
        if (notificationAudio) {
            notificationAudio.volume = 0.3;
            var played = notificationAudio.play();
            if (played && typeof played.catch === "function") played.catch(function () {});
        }
    };

    var getLoadingNode = function () {
        if (!messageContainer) return null;
        return messageContainer.querySelector("#chat-loading");
    };

    var hasMessages = function () {
        if (!messageContainer) return false;
        return messageContainer.querySelector(".chat__message") !== null;
    };

    var updateLoadingVisibility = function () {
        var loadingNode = getLoadingNode();
        if (!loadingNode) return;
        var shouldShow = isConnecting && !hasMessages();
        loadingNode.classList.toggle("is-hidden", !shouldShow);
    };

    var showLoading = function () {
        updateLoadingVisibility();
    };

    var hideLoading = function () {
        updateLoadingVisibility();
    };

    var setChatControlsEnabled = function (enabled) {
        if (chatInput) chatInput.disabled = !enabled;
        if (chatButton) chatButton.disabled = !enabled;
    };

    var formatUptime = function (seconds) {
        if (seconds < 60) return seconds + "s";
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + "m";
        var hours = Math.floor(minutes / 60);
        return hours + "h " + (minutes % 60) + "m";
    };

    var renderStats = function (stats) {
        if (!statsContainer || !stats) {
            if (statsContainer) statsContainer.hidden = true;
            return;
        }
        if (statsClients) statsClients.textContent = String(stats.connected_clients);
        if (statsMessages) statsMessages.textContent = String(stats.total_messages);
        if (statsUptime) statsUptime.textContent = formatUptime(stats.uptime_seconds);
        if (statsDb) statsDb.textContent = stats.database && stats.database.healthy ? "ok" : "down";
        statsContainer.hidden = false;
    };

    var updateStats = function () {
        return getStats(chatRoom).then(renderStats);
    };

    var clearErrorTimer = function () {
        if (!pendingErrorTimeout) return;
        clearTimeout(pendingErrorTimeout);
        pendingErrorTimeout = null;
    };

    var clearMessages = function () {
        if (!messageContainer) return;
        var nodes = messageContainer.querySelectorAll(".chat__message, .chat__status");
        nodes.forEach(function (node) {
            node.remove();
        });
        updateLoadingVisibility();
    };

    var beginConnect = function () {
        isConnecting = true;
        clearErrorTimer();
        setChatControlsEnabled(false);
        showLoading();
    };

    var markConnected = function () {
        isConnecting = false;
        clearErrorTimer();
        setChatControlsEnabled(true);
        hideLoading();
        if (errorNode) {
            errorNode.remove();
            errorNode = null;
        }
    };

    var scheduleError = function (delay) {
        if (delay === undefined) delay = ERROR_GRACE_MS;
        clearErrorTimer();
        isConnecting = false;
        updateLoadingVisibility();
        pendingErrorTimeout = setTimeout(function () {
            pendingErrorTimeout = null;
            showErrorMessage();
        }, delay);
    };

    var insertMessage = function (message, isPrepend) {
        if (!messageContainer) return;

        var row = document.createElement("div");
        row.className = "chat__message";

        var userSpan = document.createElement("span");
        userSpan.textContent = "<" + message.username + ">";
        userSpan.className = "chat__message-user";
        userSpan.style.color = getUserColor(message.username);

        var textSpan = document.createElement("span");
        textSpan.textContent = message.text;
        textSpan.className = getTextClass(message.text);

        var timeSpan = document.createElement("span");
        timeSpan.className = "chat__message-time";
        timeSpan.textContent = parseToDate(message.created_at);

        row.appendChild(userSpan);
        row.appendChild(textSpan);
        row.appendChild(timeSpan);

        if (isPrepend) messageContainer.prepend(row);
        else messageContainer.appendChild(row);

        if (isAutoScroll) {
            messageContainer.scrollTo(0, messageContainer.scrollHeight);
        }
        updateLoadingVisibility();
    };

    var showStatusMessage = function (message, buttonText) {
        if (!messageContainer || errorNode) return;

        isConnecting = false;
        clearErrorTimer();
        setChatControlsEnabled(false);
        hideLoading();
        clearMessages();

        var container = document.createElement("div");
        container.className = "chat__status";

        var text = document.createElement("span");
        text.className = "chat__status-text";
        text.textContent = message;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chat__status-button";
        btn.textContent = buttonText;

        container.appendChild(text);
        container.appendChild(btn);

        messageContainer.appendChild(container);
        errorNode = container;

        btn.addEventListener("click", function () {
            errorNode = null;
            clearMessages();
            showLoading();
            init();
        });
    };

    var showErrorMessage = function () {
        showStatusMessage("ERROR: ENLACE INTERRUMPIDO.", "REINTENTAR_CONEXION");
    };

    var showUnavailableMessage = function () {
        showStatusMessage("CANAL FUERA DE LINEA.", "VERIFICAR_DE_NUEVO");
    };

    var handleSendMessage = function () {
        if (!chatClient || !chatInput || !chatInput.value.trim()) return;
        chatClient.sendMessage(chatInput.value);
        chatInput.value = "";
    };

    var resyncMessages = function () {
        return GetAllMessages(chatRoom).then(function (updates) {
            clearMessages();
            updates.forEach(function (msg) {
                insertMessage(msg, false);
            });
            updateStats();
        });
    };

    var handleStatusChange = function (status) {
        if (status === "connecting") {
            beginConnect();
            return;
        }
        if (status === "reconnecting") {
            beginConnect();
            scheduleError(RECONNECT_GRACE_MS);
            return;
        }
        if (status === "open") {
            var wasConnected = hasConnectedOnce;
            hasConnectedOnce = true;
            markConnected();
            if (wasConnected) {
                resyncMessages();
            }
            return;
        }
        if (status === "unavailable") {
            showUnavailableMessage();
            updateStats();
            return;
        }
        if (status === "closed") {
            scheduleError();
        }
    };

    var init = function () {
        if (chatClient) {
            chatClient.disconnect();
            chatClient = null;
        }
        hasConnectedOnce = false;
        clearMessages();
        beginConnect();

        updateStats();

        // 1. Disponibilidad
        getChatState(chatRoom).then(function (chatState) {
            if (!chatState) {
                scheduleError();
                return;
            }
            if (!chatState.accessible) {
                showUnavailableMessage();
                return;
            }

            // 2. Historial
            return GetAllMessages(chatRoom).then(function (updates) {
                updates.forEach(function (msg) {
                    insertMessage(msg, false);
                });

                // 3. Autenticación
                return getUser(chatRoom).then(function (user) {
                    if (!user) {
                        scheduleError();
                        return;
                    }

                    // 4. Conexión
                    chatClient = new ChatClient(
                        chatRoom,
                        user,
                        function (msg) {
                            insertMessage(msg);
                            playNotification();
                            updateStats();
                        },
                        function () {},
                        function () {},
                        undefined,
                        handleStatusChange
                    );
                    chatClient.connect();
                });
            });
        });
    };

    // --- Eventos ---
    if (chatButton) {
        chatButton.addEventListener("click", handleSendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") handleSendMessage();
        });
    }

    if (messageContainer) {
        messageContainer.addEventListener("scroll", function () {
            var scrollTop = messageContainer.scrollTop;
            var clientHeight = messageContainer.clientHeight;
            var scrollHeight = messageContainer.scrollHeight;
            isAutoScroll = scrollTop + clientHeight + 80 >= scrollHeight;
        });
    }

    // Arranque
    init();
})();
