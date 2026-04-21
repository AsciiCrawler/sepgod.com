// Estado global del juego
let gameState = {
    level: 1,
    inventory: [],
    score: 0
};
// --- MOTOR DEL JUEGO: RUSHING WAVING ---
const playerEl = document.getElementById('player');
const gameBoard = document.getElementById('game-board');
const healthUi = document.getElementById('hud-health');

// Estado físico y de combate del jugador
let physics = {
    x: 20, y: 50, vx: 0, vy: 0,
    w: 40, h: 40, // Ancho y alto de colisión
    speed: 6, jumpPower: 14, gravity: 0.8,
    isGrounded: false,
    facing: 1, // 1 = derecha, -1 = izquierda
    hp: 3,
    invulnerable: false
};

// Entidades del juego
let enemies = [];
let projectiles = [];
let enemiesDefeated = 0;
let lastThrowTime = 0; // Para no spamear cuchillos

// Controles
let keys = { ArrowLeft: false, ArrowRight: false, Space: false, a: false };
let gameLoopId;

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.key === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') keys.Space = true;
    if (e.key.toLowerCase() === 'a') keys.a = true;
    if(['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.key === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
});

// --- SISTEMA DE ENTIDADES ---
function spawnEnemy(x, hp) {
    const el = document.createElement('div');
    el.className = 'enemy';
    el.innerText = '👾';
    gameBoard.appendChild(el);
    // Añadimos el enemigo al array
    enemies.push({ x: x, y: 50, w: 40, h: 40, vx: -1.5, hp: hp, el: el });
}

function throwKnife() {
    const now = Date.now();
    if (now - lastThrowTime < 300) return; // Cooldown de 300ms entre tiros
    lastThrowTime = now;

    const el = document.createElement('div');
    el.className = 'projectile';
    el.innerText = '🔪';
    // Si dispara a la izquierda, volteamos el cuchillo
    if (physics.facing === -1) el.style.transform = "scaleX(-1)";
    gameBoard.appendChild(el);

    projectiles.push({
        x: physics.x + 10, y: physics.y + 10, 
        w: 20, h: 20, 
        vx: 12 * physics.facing, // Va rápido hacia donde miras
        el: el
    });
}

// Función matemática PRO para detectar choques entre rectángulos
function checkCollision(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function updateHealthUI() {
    healthUi.innerText = '❤️'.repeat(physics.hp) + '🖤'.repeat(3 - physics.hp);
    if (physics.hp <= 0) {
        alert("💀 ¡GAME OVER! Te atraparon los aliens vaporwave.");
        stopGame();
        switchScreen('screen-menu');
    }
}

function takeDamage() {
    if (physics.invulnerable) return;
    physics.hp -= 1;
    updateHealthUI();
    
    // Frames de invulnerabilidad
    physics.invulnerable = true;
    playerEl.classList.add('damage-flash');
    
    setTimeout(() => {
        physics.invulnerable = false;
        playerEl.classList.remove('damage-flash');
    }, 1500); // 1.5 segundos a salvo
}

// --- GESTIÓN DE NIVELES ---
function initLevel(levelNumber) {
    // Limpiar entidades viejas del DOM
    enemies.forEach(e => e.el.remove());
    projectiles.forEach(p => p.el.remove());
    enemies = [];
    projectiles = [];
    enemiesDefeated = 0;

    gameState.level = levelNumber;
    document.getElementById('ui-level').innerText = levelNumber;

    if (levelNumber === 1) {
        // Spawneamos 3 enemigos fuera de la pantalla por la derecha
        spawnEnemy(600, 1);
        spawnEnemy(900, 1);
        spawnEnemy(1200, 1);
    }
}

function startGame() {
    physics.x = 20; physics.y = 50; physics.vx = 0; physics.vy = 0;
    physics.hp = 3; physics.invulnerable = false;
    playerEl.classList.remove('damage-flash');
    updateHealthUI();
    
    initLevel(gameState.level);
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function stopGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function gameLoop() {
    // 1. INPUT DEL JUGADOR
    if (keys.ArrowLeft) {
        physics.vx = -physics.speed;
        playerEl.style.transform = "scaleX(-1)";
        physics.facing = -1;
    } else if (keys.ArrowRight) {
        physics.vx = physics.speed;
        playerEl.style.transform = "scaleX(1)";
        physics.facing = 1;
    } else {
        physics.vx = 0;
    }

    if (keys.Space && physics.isGrounded) {
        physics.vy = physics.jumpPower;
        physics.isGrounded = false;
    }

    if (keys.a) {
        throwKnife();
    }

    // Gravedad y Posición
    physics.vy -= physics.gravity;
    physics.x += physics.vx;
    physics.y += physics.vy;

    // Colisiones con paredes y suelo
    const maxRight = gameBoard.clientWidth - physics.w;
    if (physics.x < 0) physics.x = 0;
    if (physics.x > maxRight) physics.x = maxRight;
    
    if (physics.y <= 50) {
        physics.y = 50; physics.vy = 0; physics.isGrounded = true;
    }

    playerEl.style.left = physics.x + 'px';
    playerEl.style.bottom = physics.y + 'px';

    // 2. ACTUALIZAR PROYECTILES
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        p.el.style.left = p.x + 'px';
        p.el.style.bottom = p.y + 'px';

        // Destruir si sale de pantalla
        if (p.x > gameBoard.clientWidth || p.x < -50) {
            p.el.remove();
            projectiles.splice(i, 1);
        }
    }

    // 3. ACTUALIZAR ENEMIGOS Y COLISIONES
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        
        // IA básica: Caminar hacia el jugador
        if (e.x > physics.x) e.x -= 1.5;
        else e.x += 1.5;
        
        e.el.style.left = e.x + 'px';
        e.el.style.bottom = e.y + 'px';

        // Choque: Enemigo toca al Jugador
        if (checkCollision(physics, e)) {
            takeDamage();
        }

        // Choque: Cuchillo toca al Enemigo
        for (let j = projectiles.length - 1; j >= 0; j--) {
            let p = projectiles[j];
            if (checkCollision(p, e)) {
                // Daño al enemigo
                e.hp -= 1;
                // Destruir cuchillo
                p.el.remove();
                projectiles.splice(j, 1);

                // Si muere el enemigo
                if (e.hp <= 0) {
                    e.el.remove();
                    enemies.splice(i, 1);
                    enemiesDefeated++;
                    break; // Salimos del loop interno de proyectiles
                }
            }
        }
    }

    // 4. CONDICIÓN DE VICTORIA DE NIVEL
    if (enemiesDefeated === 3) {
        enemiesDefeated = 0; // Reset rápido
        alert("¡Nivel 1 Completado! Pasando al Nivel 2...");
        initLevel(2); // Iniciaríamos el Nivel 2 (actualmente vacío)
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

// IMPORTANTE: Asegúrate que tus listeners de los botones del menú sigan llamando a startGame() y stopGame() como configuramos antes.

// --- ACTUALIZACIÓN DE EVENT LISTENERS ANTERIORES ---
// Busca donde definimos el evento de 'btn-new' y añade startGame()
document.getElementById('btn-new').addEventListener('click', () => {
    gameState = { level: 1, inventory: [], score: 0 }; 
    updateGameUI();
    switchScreen('screen-game');
    startGame(); // <--- INICIA EL JUEGO AQUÍ
});

// Busca el evento de 'btn-load' y asegúrate de añadir startGame() 
// justo después de alert("💾 ¡Partida cargada con éxito!");

// Busca el evento de 'btn-back-menu' y añade stopGame()
document.getElementById('btn-back-menu').addEventListener('click', () => {
    stopGame(); // <--- PAUSA EL JUEGO AQUÍ
    switchScreen('screen-menu');
});

// --- GESTIÓN DE PANTALLAS ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });
    const targetScreen = document.getElementById(screenId);
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('active');
}

// --- ACTUALIZAR UI ---
function updateGameUI() {
    document.getElementById('ui-level').innerText = gameState.level;
    // Aquí actualizaremos el resto de la interfaz cuando el juego crezca
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    
    // NUEVA PARTIDA
    document.getElementById('btn-new').addEventListener('click', () => {
        gameState = { level: 1, inventory: [], score: 0 }; 
        updateGameUI();
        switchScreen('screen-game');
    });

    // CARGAR PARTIDA (Leer archivo físico)
    document.getElementById('btn-load').addEventListener('click', () => {
        // Creamos un input de archivo invisible dinámicamente
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json'; // Solo aceptamos archivos JSON
        
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // Parseamos el texto del archivo a un objeto JavaScript
                    const loadedState = JSON.parse(event.target.result);
                    
                    // Validación rápida para asegurar que es nuestro archivo
                    if (loadedState.level !== undefined) {
                        gameState = loadedState;
                        updateGameUI();
                        switchScreen('screen-game');
                        alert("💾 ¡Partida cargada con éxito!");
                    } else {
                        alert("⚠️ El archivo no parece ser una partida válida.");
                    }
                } catch (err) {
                    alert("❌ Archivo corrupto o formato incorrecto.");
                }
            };
            reader.readAsText(file);
        };
        
        // Disparamos el clic en el input invisible
        fileInput.click();
    });

    document.getElementById('btn-credits').addEventListener('click', () => {
        switchScreen('screen-credits');
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
        switchScreen('screen-menu');
    });

    document.getElementById('btn-back-from-credits').addEventListener('click', () => {
        switchScreen('screen-menu');
    });

    // GUARDAR PARTIDA (Generar archivo físico)
    document.getElementById('btn-save').addEventListener('click', () => {
        // Convertimos el estado del juego a un string JSON con formato bonito
        const dataStr = JSON.stringify(gameState, null, 2);
        
        // Creamos un Blob (archivo binario) con el contenido
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        // Creamos un enlace invisible para forzar la descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `partida_nivel_${gameState.level}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiamos el DOM y la memoria
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("💾 ¡Partida guardada en tus descargas!");
    });
});
