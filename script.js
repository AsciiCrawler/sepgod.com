
/** * =========================================================================
 * JAVASCRIPT: EL CEREBRO LÓGICO Y MATEMÁTICO
 * ========================================================================= **/

const audioCtx = window.AudioContext ? new AudioContext() : null; 

const playBeep = (freq, type) => {
    if(!audioCtx || audioCtx.state !== 'running') return; 
    
    const osc = audioCtx.createOscillator(), gainNode = audioCtx.createGain(); 
    osc.type = type; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime); 
    
    gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); 
    
    osc.connect(gainNode); gainNode.connect(audioCtx.destination); 
    osc.start(); 
    osc.stop(audioCtx.currentTime + 0.05); 
};

// =========================================================================
// LÓGICA PARA MINIMIZAR/MAXIMIZAR EL ABOUT ME
// =========================================================================
const toggleAboutBtn = document.getElementById('toggle-about-btn');
const aboutContent = document.getElementById('about-me-content');

if (toggleAboutBtn && aboutContent) {
    toggleAboutBtn.addEventListener('click', function() {
        playBeep(450, 'sine');
        
        if (aboutContent.style.display === 'none') {
            aboutContent.style.display = 'block';
            this.innerText = 'MINIMIZAR';
            this.style.background = 'var(--neon-cyan)';
            this.style.color = 'var(--bg-dark)';
        } else {
            aboutContent.style.display = 'none';
            this.innerText = 'MAXIMIZAR';
            this.style.background = 'var(--neon-magenta)';
            this.style.color = '#fff';
        }
    });
}

// =========================================================================
// LÓGICA PARA EXPANDIR/CONTRAER POSTS CON EFECTO DE DESENCRIPTADO (GLITCH)
// =========================================================================
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>[]{}//\\";

function scrambleText(element, finalString) {
    let iteration = 0;
    clearInterval(element.glitchInterval);
    
    element.glitchInterval = setInterval(() => {
        element.innerText = finalString
            .split("")
            .map((char, index) => {
                if (char === " ") return " ";
                if (index < iteration) return finalString[index];
                return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            })
            .join("");
        
        if (iteration >= finalString.length) { 
            clearInterval(element.glitchInterval);
        }
        iteration += 1 / 3; 
    }, 30);
}

document.querySelectorAll('.js-toggle-post').forEach(btn => {
    btn.addEventListener('click', function(e) {
        playBeep(450, 'sawtooth');
        
        const contentDiv = this.nextElementSibling;
        const postCard = this.closest('.post-card');
        const titleEl = postCard.querySelector('.post-card__title');
        
        if (!titleEl.hasAttribute('data-orig')) {
            titleEl.setAttribute('data-orig', titleEl.innerText);
        }
        const originalTitle = titleEl.getAttribute('data-orig');
        
        const isOpen = contentDiv.style.display === 'block';

        if (isOpen) {
            contentDiv.style.display = 'none';
            contentDiv.classList.remove('is-decrypting');
            
            this.style.background = 'var(--neon-cyan)';
            this.style.color = 'var(--bg-dark)';
            
            scrambleText(this, this.getAttribute('data-text-open'));
            scrambleText(titleEl, originalTitle);
        } else {
            contentDiv.style.display = 'block';
            contentDiv.classList.add('is-decrypting');
            
            this.style.background = 'var(--neon-magenta)';
            this.style.color = '#fff';
            
            scrambleText(this, this.getAttribute('data-text-close'));
            scrambleText(titleEl, originalTitle);
        }
    });
});

// =========================================================================
// MÚSICA, TERMINAL Y EFECTOS DE FONDO
// =========================================================================
const bgm = document.getElementById('bgm'); 
const audioBtn = document.getElementById('audioBtn'); 

audioBtn.onclick = () => {
    if (bgm.paused) { 
        bgm.play(); 
        audioBtn.innerText = "SYS.AUDIO_MUTE()";
        audioBtn.classList.add('is-active');
    } else { 
        bgm.pause(); 
        audioBtn.innerText = "SYS.AUDIO_PLAY()";
        audioBtn.classList.remove('is-active');
    } 
};

const alienAscii = `[TEXTO ASCII OMITIDO PARA BREVEDAD, SE MANTIENE EL TUYO AQUÍ]`;

const terminalLogs = document.getElementById('sys-log-container'); 

const printLog = (txt, err = false) => {
    const d = new Date().toLocaleTimeString('en-US',{hour12:false}); 
    terminalLogs.innerHTML += `<div style="color:${err ? '#ff0055' : '#00f3ff'}">[${d}] ${txt}</div>`;
    terminalLogs.scrollTop = terminalLogs.scrollHeight; 
    if(terminalLogs.childElementCount > 35) terminalLogs.firstElementChild.remove(); 
};

// =========================================================================
// SISTEMA DE TERMINAL CON EASTER EGG DE LAIN (THE WIRED)
// =========================================================================
let isWiredConnected = false;
const lainQuotes = [
    "No matter where you are, everyone is always connected.",
    "The Wired isn't a different world.",
    "Presences are just scattered data.",
    "Close the world, Open the nExt.",
    "If you're not remembered, then you never existed.",
    "Are you God?",
    "Me? I'm Lain. Who are you?",
    "Everybody is connected.",
    "I don't need a physical body."
];

document.getElementById('cmd-input').onkeydown = e => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const cmd = e.target.value.trim().toLowerCase();
        e.target.value = ''; // Limpiamos el input
        
        // --- ESTADO 1: MODO WIRED (MINI CHATBOT) ---
        if (isWiredConnected) {
            printLog(`[TÚ]: ${cmd}`, false);
            
            // Comando para salir del easter egg
            if (cmd === 'disconnect' || cmd === 'exit') {
                isWiredConnected = false;
                printLog("> CERRANDO PROTOCOLO NAVI...", true);
                setTimeout(() => printLog("> DESCONECTADO DEL WIRED.", false), 1000);
                return;
            }
            
            // Si escribe cualquier otra cosa, Lain responde después de un pequeño retraso
            setTimeout(() => {
                const randomQuote = lainQuotes[Math.floor(Math.random() * lainQuotes.length)];
                // Usamos un color especial (morado neón) para que se distinga que es Lain
                const time = new Date().toLocaleTimeString('en-US',{hour12:false}); 
                terminalLogs.innerHTML += `<div style="color: #b142ff">[${time}] [LAIN]: ${randomQuote}</div>`;
                terminalLogs.scrollTop = terminalLogs.scrollHeight; 
                playBeep(250, 'sine'); // Sonidito misterioso
            }, 800);
            return;
        }

        // --- ESTADO 2: TERMINAL NORMAL ---
        printLog(`> ${cmd}`, false);
        
        if (cmd === 'help') {
            printLog("CMDS: clear, reboot, hack, navi"); // Agregamos 'navi' como pista
        } 
        else if (cmd === 'clear') {
            terminalLogs.innerHTML = ''; 
        } 
        else if (cmd === 'reboot') {
            location.reload(); 
        } 
        // --> AQUI ESTÁ EL TRIGGER DEL EASTER EGG <--
        else if (cmd === 'navi' || cmd === 'wired' || cmd === 'lain') {
            printLog("> INICIANDO PROTOCOLO NAVI...", false);
            
            setTimeout(() => {
                isWiredConnected = true;
                
                // Efecto de glitch global al entrar
                const crt = document.getElementById('crt-screen');
                if(crt) {
                    crt.classList.add('is-glitching');
                    setTimeout(() => crt.classList.remove('is-glitching'), 600);
                }
                
                printLog("================================", false);
                printLog(" CONEXIÓN AL WIRED ESTABLECIDA", false);
                printLog(" USUARIO: LAIN DETECTADA", false);
                printLog(" (Escribe 'disconnect' para salir)", true);
                printLog("================================", false);
                playBeep(400, 'square'); 
            }, 1200);
        }
        else if (cmd === 'hack') { 
            // Tu lógica de hack actual se mantiene intacta
            document.getElementById('crt-screen').classList.add('is-glitching'); 
            const pre = document.createElement('pre'); 
            pre.className = 'hack-art-output'; 
            pre.textContent = alienAscii; 
            terminalLogs.appendChild(pre); 
            terminalLogs.scrollTop = terminalLogs.scrollHeight; 
            setTimeout(() => { document.getElementById('crt-screen').classList.remove('is-glitching'); }, 2000);
        }
        else {
            printLog("COMANDO_NO_RECONOCIDO", true); 
        }
    }
};
document.querySelectorAll('.js-sfx-hover').forEach(btn => btn.onmouseenter = () => playBeep(800, 'square'));

document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.onclick = e => {
        playBeep(150, 'sawtooth');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('is-active'));
        e.target.classList.add('is-active');
        
        const cat = e.target.dataset.filter; 
        
        document.getElementById('crt-screen').classList.add('is-glitching');
        setTimeout(() => document.getElementById('crt-screen').classList.remove('is-glitching'), 200);

        document.querySelectorAll('.post-group').forEach(c => {
            c.style.display = (cat === 'ALL' || c.id === `cat-${cat}`) ? 'block' : 'none';
        });
    };
});

const canvas = document.getElementById('matrix-canvas'); 
const ctx = canvas.getContext('2d'); 
let w, h, drops; 
const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); 

const initMatrix = () => {
    w = canvas.width = window.innerWidth; 
    h = canvas.height = window.innerHeight;
    drops = Array(Math.floor(w / 14)).fill(1); 
};
window.onresize = initMatrix; 
initMatrix(); 

let lastDrawTime = 0;

const drawMatrix = (timestamp) => {
    // Pedimos el siguiente frame al navegador automáticamente
    requestAnimationFrame(drawMatrix);
    
    // Mantenemos tu velocidad de ~50ms para la estética retro,
    // pero sin bloquear el procesador de forma forzada.
    if (timestamp - lastDrawTime < 50) return; 
    lastDrawTime = timestamp;

    ctx.fillStyle = 'rgba(2, 2, 2, 0.1)'; 
    ctx.fillRect(0, 0, w, h); 
    ctx.fillStyle = '#00ff41'; 
    ctx.font = '14px monospace'; 
    
    drops.forEach((y, i) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
        if (y * 14 > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++; 
    });
};

// Arrancamos el motor de animación delegando el trabajo al navegador/GPU
requestAnimationFrame(drawMatrix);

// Bloqueamos el scroll mientras la splash ocupa toda la pantalla.
document.documentElement.classList.add('splash-active');
document.body.classList.add('splash-active');

const bootSeq = ["> CARGANDO SEPGOD_KERNEL...", "> MEMORIA ASIGNADA...", "> SISTEMA LISTO."];
let bIdx = 0;

const boot = setInterval(() => {
    if(bIdx < bootSeq.length) { document.getElementById('boot-text').innerHTML += bootSeq[bIdx++] + "<br>"; } 
    else { 
        clearInterval(boot); 
        document.getElementById('enter-btn').style.display = 'inline-block'; 
    }
}, 300);

document.getElementById('enter-btn').onclick = () => {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => document.getElementById('splash').style.display = 'none', 300);

    // Liberamos el scroll: vuelve el comportamiento normal de la página.
    document.documentElement.classList.remove('splash-active');
    document.body.classList.remove('splash-active');
    
    printLog("ENLACE ESTABLECIDO."); 
    
    // --> AQUÍ LLAMAMOS A LA NUEVA FUNCIÓN <--
    sysGeoTrack();
    
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); 
    bgm.play().catch(e => printLog("AUTO-PLAY RESTRINGIDO", true)); 
};

setInterval(() => {
    document.getElementById('cpu-val').innerText = (document.getElementById('cpu-meter').style.width = Math.floor(Math.random()*40+10)+'%');
    document.getElementById('ram-val').innerText = (document.getElementById('ram-meter').style.width = Math.floor(Math.random()*30+40)+'%');
    document.getElementById('ping-ms').innerText = Math.floor(Math.random()*20+10);
}, 2000);
// =========================================================================
// SYS.GEO_TRACK(): RASTREO DE IP Y BANDERA
// =========================================================================
async function sysGeoTrack() {
    try {
        printLog("> EJECUTANDO RASTREO DE IP...", false);
        
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('ERR_CONNECTION');

        const data = await response.json();
        const countryCode = data.country_code.toLowerCase();
        const flagUrl = `https://flagcdn.com/w40/${countryCode}.png`; // Tamaño más pequeño para que encaje
        
        printLog(`> UBICACIÓN CONFIRMADA: ${data.country_name.toUpperCase()}`, false);

        // Creamos la imagen de la bandera
        const flagImg = document.createElement('img');
        flagImg.src = flagUrl;
        flagImg.alt = data.country_name;
        flagImg.title = `Conexión detectada desde: ${data.country_name}`;
        
        // Estilos en línea rápidos para que no rompa tu maquetación (ajústalos a tu gusto)
        flagImg.style.height = '15px';
        flagImg.style.width = '20px'; // Reserva el ancho (~4:3) para evitar salto de layout al cargar.
        flagImg.style.verticalAlign = 'middle';
        flagImg.style.marginLeft = '10px';
        flagImg.style.borderRadius = '2px';
        flagImg.style.boxShadow = '0 0 5px var(--neon-cyan)'; // Asumiendo que tienes esta variable CSS

        // Inyectamos la bandera al lado del Ping
        const pingElement = document.getElementById('ping-ms');
        if (pingElement && pingElement.parentElement) {
            pingElement.parentElement.appendChild(flagImg);
        }

    } catch (error) {
        printLog("> FALLO AL ESTABLECER TRIANGULACIÓN", true);
    }
}
