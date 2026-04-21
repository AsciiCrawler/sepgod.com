// --- ESTADO GLOBAL ---
let gameState = { level: 1, inventory: [], score: 0 };

// --- MOTOR DE AUDIO NATIVO (8-BIT SOUNDS) ---
// Creamos el contexto de audio. Se inicializa en el primer clic del usuario.
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playHitSound() {
    // Los navegadores bloquean el audio hasta que el usuario interactúa, esto lo desbloquea
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Creamos un oscilador (generador de tono) y un nodo de volumen
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Configuración 8-bit (Onda cuadrada)
    oscillator.type = 'square'; 
    
    // El sonido empieza agudo (400Hz) y cae rápido a grave (50Hz) en 0.1 segundos
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);

    // El volumen empieza al 30% y se desvanece rápido
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    // Conectamos todo a los altavoces
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Reproducimos
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}


// --- NAVEGACIÓN DE PANTALLAS ---
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });
    const targetScreen = document.getElementById(screenId);
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('active');
}

// --- MOTOR DEL JUEGO: RUSHING WAVING ---
const playerEl = document.getElementById('player');
const gameBoard = document.getElementById('game-board');
const healthUi = document.getElementById('hud-health');

let physics = {
    x: 20, y: 50, vx: 0, vy: 0,
    w: 40, h: 40,
    speed: 6, jumpPower: 14, gravity: 0.8,
    isGrounded: false, facing: 1,
    hp: 3, invulnerable: false
};

let enemies = [];
let projectiles = [];
let enemiesDefeated = 0;
let lastThrowTime = 0;
let keys = { ArrowLeft: false, ArrowRight: false, Space: false, a: false };
let gameLoopId;

// Controles Teclado
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

// Sistema de Entidades
function spawnEnemy(x, hp) {
    const el = document.createElement('div');
    el.className = 'enemy';
    el.innerText = '👾';
    el.style.left = x + 'px';
    el.style.bottom = '50px';
    gameBoard.appendChild(el);
    enemies.push({ x: x, y: 50, w: 40, h: 40, vx: -1.5, hp: hp, el: el });
}

function throwKnife() {
    const now = Date.now();
    if (now - lastThrowTime < 300) return;
    lastThrowTime = now;

    const el = document.createElement('div');
    el.className = 'projectile';
    el.innerText = '🔪';
    if (physics.facing === -1) el.style.transform = "scaleX(-1)";
    
    const startX = physics.x + 10;
    const startY = physics.y + 10;
    el.style.left = startX + 'px';
    el.style.bottom = startY + 'px';

    gameBoard.appendChild(el);
    projectiles.push({
        x: startX, y: startY, w: 20, h: 20, 
        vx: 12 * physics.facing, el: el
    });
}

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
    
    physics.invulnerable = true;
    playerEl.classList.add('damage-flash');
    
    setTimeout(() => {
        physics.invulnerable = false;
        playerEl.classList.remove('damage-flash');
    }, 1500);
}

// Bucle Principal
function initLevel(levelNumber) {
    enemies.forEach(e => e.el.remove());
    projectiles.forEach(p => p.el.remove());
    enemies = [];
    projectiles = [];
    enemiesDefeated = 0;

    gameState.level = levelNumber;
    document.getElementById('ui-level').innerText = levelNumber;

    if (levelNumber === 1) {
        spawnEnemy(600, 1);
        spawnEnemy(900, 1);
        spawnEnemy(1200, 1);
    } else {
        spawnEnemy(500, 2);
        spawnEnemy(800, 2);
        spawnEnemy(1100, 2);
    }
}

function startGame() {
    // 1. Reset jugador
    physics.x = 20; physics.y = 50; physics.vx = 0; physics.vy = 0;
    physics.hp = 3; physics.invulnerable = false; physics.facing = 1;
    playerEl.classList.remove('damage-flash');
    playerEl.style.transform = "scaleX(1)";
    updateHealthUI();
    
    // 2. FIX STICKY KEYS: Forzamos que todas las teclas estén sin pulsar al iniciar
    keys = { ArrowLeft: false, ArrowRight: false, Space: false, a: false };
    
    // Inicializar Audio si estaba suspendido (requerido por navegadores)
    if (audioCtx.state === 'suspended') audioCtx.resume();

    initLevel(gameState.level);
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function stopGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function gameLoop() {
    // 1. Jugador Físicas
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

    if (keys.a) throwKnife();

    physics.vy -= physics.gravity;
    physics.x += physics.vx;
    physics.y += physics.vy;

    const maxRight = gameBoard.clientWidth - physics.w;
    if (physics.x < 0) physics.x = 0;
    if (physics.x > maxRight) physics.x = maxRight;
    
    if (physics.y <= 50) {
        physics.y = 50; physics.vy = 0; physics.isGrounded = true;
    }

    playerEl.style.left = physics.x + 'px';
    playerEl.style.bottom = physics.y + 'px';

    // 2. Proyectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        p.el.style.left = p.x + 'px';
        p.el.style.bottom = p.y + 'px';

        if (p.x > gameBoard.clientWidth || p.x < -50) {
            p.el.remove();
            projectiles.splice(i, 1);
        }
    }

    // 3. Enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        
        if (e.x > physics.x) e.x -= 1.5;
        else e.x += 1.5;
        
        e.el.style.left = e.x + 'px';
        e.el.style.bottom = e.y + 'px';

        // Colisión Alien -> Jugador
        if (checkCollision(physics, e)) takeDamage();

        // Colisión Cuchillo -> Alien
        for (let j = projectiles.length - 1; j >= 0; j--) {
            let p = projectiles[j];
            if (checkCollision(p, e)) {
                e.hp -= 1;
                
                // --- SONIDO DE IMPACTO ---
                playHitSound(); 
                
                p.el.remove();
                projectiles.splice(j, 1);

                if (e.hp <= 0) {
                    e.el.remove();
                    enemies.splice(i, 1);
                    enemiesDefeated++;
                    break;
                }
            }
        }
    }

    // 4. Victoria de Nivel
    // NOTA: Ajustamos para que pueda seguir pasando niveles indefinidamente (como demo)
    if (enemiesDefeated === 3) {
        enemiesDefeated = 0;
        alert(`¡Nivel ${gameState.level} Completado!`);
        initLevel(gameState.level + 1); // Avanza al siguiente nivel
        keys = { ArrowLeft: false, ArrowRight: false, Space: false, a: false }; // Evita el bug pegajoso aquí también
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- INICIALIZACIÓN DE EVENTOS DE BOTONES ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-new').addEventListener('click', () => {
        gameState = { level: 1, inventory: [], score: 0 }; 
        switchScreen('screen-game');
        startGame();
    });

    document.getElementById('btn-load').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedState = JSON.parse(event.target.result);
                    if (loadedState.level !== undefined) {
                        gameState = loadedState;
                        switchScreen('screen-game');
                        startGame();
                        alert("💾 ¡Partida cargada!");
                    }
                } catch (err) {}
            };
            reader.readAsText(file);
        };
        fileInput.click();
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        const dataStr = JSON.stringify(gameState, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `partida_nivel_${gameState.level}.json`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    });

    document.getElementById('btn-credits').addEventListener('click', () => switchScreen('screen-credits'));
    document.getElementById('btn-back-menu').addEventListener('click', () => { stopGame(); switchScreen('screen-menu'); });
    document.getElementById('btn-back-from-credits').addEventListener('click', () => switchScreen('screen-menu'));
});
