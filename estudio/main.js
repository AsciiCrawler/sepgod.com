const btnEnter = document.getElementById('btn-enter');
const entryScreen = document.getElementById('entry-screen');
const puzzleScreen = document.getElementById('bust-puzzle');
const logicInput = document.getElementById('logic-input');
const crypticText = document.getElementById('cryptic-text');

// 1. Transición inicial
btnEnter.addEventListener('click', () => {
    entryScreen.classList.add('hidden');
    puzzleScreen.classList.remove('hidden');
});

// 2. Lógica del puzzle
// El texto "U0VOVElST04=" decodificado es "SENTIRON" (o lo que tú quieras)
logicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const val = logicInput.value.toUpperCase();
        
        // La lógica: Decodificar el Base64 que pusimos en el HTML
        if (val === atob(crypticText.innerText)) {
            alert("ACCESO CONCEDIDO. LA REALIDAD SE DISUELVE.");
            // Aquí disparas la siguiente fase
        } else {
            // Efecto LSD por fallo
            document.body.classList.add('lsd-trip');
            logicInput.value = "";
            setTimeout(() => {
                document.body.classList.remove('lsd-trip');
            }, 2000);
        }
    }
});
