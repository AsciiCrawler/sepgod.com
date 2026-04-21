// Estado global del juego
let gameState = {
    level: 1,
    inventory: [],
    score: 0
};

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
