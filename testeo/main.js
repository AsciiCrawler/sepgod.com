// Estado global del juego
let gameState = {
    level: 1,
    inventory: [],
    score: 0
};
// --- MOTOR DEL JUEGO: RUSHING WAVING ---
const playerEl = document.getElementById('player');
const gameBoard = document.getElementById('game-board');

// Estado físico del jugador
let physics = {
    x: 20,
    y: 30, // 30px es la altura del suelo
    vx: 0,
    vy: 0,
    speed: 6,        // Velocidad horizontal
    jumpPower: 14,   // Fuerza de salto
    gravity: 0.8,    // Gravedad
    isGrounded: false
};

// Controles
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

let gameLoopId;

// Escuchar teclado
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') keys.Space = true;
    
    // Evitar que la barra espaciadora haga scroll en la página
    if(['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

function startGame() {
    // Resetear posición al iniciar
    physics.x = 20;
    physics.y = 30;
    physics.vx = 0;
    physics.vy = 0;
    
    // Cancelar cualquier loop anterior por seguridad
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    // Iniciar bucle
    gameLoop();
}

function stopGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function gameLoop() {
    // 1. Lógica Horizontal
    if (keys.ArrowLeft) {
        physics.vx = -physics.speed;
        playerEl.style.transform = "scaleX(-1)"; // Voltear emoji
    } else if (keys.ArrowRight) {
        physics.vx = physics.speed;
        playerEl.style.transform = "scaleX(1)"; // Emoji normal
    } else {
        physics.vx = 0; // Frenado instantáneo
    }

    // 2. Lógica de Salto
    if (keys.Space && physics.isGrounded) {
        physics.vy = physics.jumpPower;
        physics.isGrounded = false;
    }

    // 3. Aplicar Gravedad
    physics.vy -= physics.gravity;

    // 4. Actualizar Posición
    physics.x += physics.vx;
    physics.y += physics.vy;

    // 5. Colisiones Básicas
    // Colisión con el suelo (y = 30)
    if (physics.y <= 30) {
        physics.y = 30;
        physics.vy = 0;
        physics.isGrounded = true;
    }

    // Colisión con las paredes (límites del div)
    const maxRight = gameBoard.clientWidth - playerEl.clientWidth;
    if (physics.x < 0) physics.x = 0;
    if (physics.x > maxRight) physics.x = maxRight;

    // 6. Renderizar (dibujar en pantalla)
    playerEl.style.left = physics.x + 'px';
    playerEl.style.bottom = physics.y + 'px';

    // 7. Pedir el siguiente frame
    gameLoopId = requestAnimationFrame(gameLoop);
}

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
