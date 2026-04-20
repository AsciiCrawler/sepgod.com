
// main.js
import { buscarProductoPorSKU, buscarSugerencias } from './apiProductos.js';

window.jsPDF = window.jspdf.jsPDF;
const moneyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

function goToScreen(screenId) { 
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; }); 
    setTimeout(() => { let el = document.getElementById(screenId); el.style.display = el.id === 'home-screen' ? 'flex' : 'block'; el.classList.add('active'); }, 10);
}

function getCurrentDateTime() { return new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }); }
function readExcelAsync(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = function(e) { resolve(XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1})); }; reader.readAsArrayBuffer(file); }); }

// ==========================================
// MÓDULO 1: CONTEO CÍCLICO
// ==========================================
let inventoryData = []; let inventoryTitle = "INVENTARIO"; let startTimeString = ""; let operatorName = "";

function startNewInventory() { 
    operatorName = document.getElementById('inv-operator').value.trim() || "SIN FIRMA";
    if(operatorName === "SIN FIRMA") return alert('La firma es obligatoria.');
    const titleInput = document.getElementById('inv-title').value; if(!titleInput) return alert('Ingresa título.'); 
    inventoryTitle = titleInput.toUpperCase(); startTimeString = getCurrentDateTime(); 
    document.getElementById('display-title').innerText = "> " + inventoryTitle; 
    document.getElementById('display-operator').innerText = "AUDITOR: " + operatorName; goToScreen('workspace-screen'); 
}

function recalcPhys(item) { if(!item.locs) return 0; return item.locs.reduce((sum, l) => sum + l.qty, 0); }

function addItem() {
    let locName = document.getElementById('item-loc').value.trim().toUpperCase() || "GENERAL";
    const sku = document.getElementById('item-sku').value.trim(); const name = document.getElementById('item-name').value; 
    const cat = document.getElementById('item-cat').value.trim().toUpperCase() || "GENERAL";
    const expDateString = document.getElementById('item-exp').value;
    const price = parseFloat(document.getElementById('item-price').value) || 0; const teo = parseInt(document.getElementById('item-teo').value) || 0; const fis = parseInt(document.getElementById('item-fis').value);
    if(!sku || isNaN(fis)) return alert('SKU y Físico son obligatorios.');
    let item = inventoryData.find(i => i.sku === sku);
    if (item) {
        if(price > 0) item.price = price; if(document.getElementById('item-teo').value !== "") item.teo = teo; if(cat !== "GENERAL") item.cat = cat; if(expDateString) item.exp = expDateString;
        let existingLoc = item.locs.find(l => l.name === locName); if(existingLoc) existingLoc.qty += fis; else item.locs.push({ name: locName, qty: fis });
        item.fis = recalcPhys(item);
    } else { inventoryData.push({ sku, name: name || 'Sin Nombre', cat, exp: expDateString, price, teo, fis, prevDiff: null, locs: [{ name: locName, qty: fis }] }); }
    document.getElementById('item-sku').value = ''; document.getElementById('item-name').value = ''; document.getElementById('item-price').value = ''; document.getElementById('item-teo').value = ''; document.getElementById('item-fis').value = ''; document.getElementById('item-exp').value = ''; document.getElementById('item-sku').focus();
    renderTable();
}

function updateLocInline(sku, locName, val) { let item = inventoryData.find(i => i.sku === sku); let loc = item.locs.find(l => l.name === locName); if(loc) { loc.qty = parseInt(val) || 0; item.fis = recalcPhys(item); renderTable(); } }
function deleteLoc(sku, locName) { let item = inventoryData.find(i => i.sku === sku); item.locs = item.locs.filter(l => l.name !== locName); item.fis = recalcPhys(item); renderTable(); }
function addNewLocInline(sku) { let newLoc = prompt("Nueva ubicación:"); if(newLoc && newLoc.trim() !== "") { let item = inventoryData.find(i => i.sku === sku); let cleanLoc = newLoc.trim().toUpperCase(); if(!item.locs.find(l => l.name === cleanLoc)) { item.locs.push({ name: cleanLoc, qty: 0 }); renderTable(); } } }
function updateTeoInline(sku, val) { inventoryData.find(i => i.sku === sku).teo = parseInt(val)||0; renderTable(); }
function deleteItem(sku) { inventoryData = inventoryData.filter(i => i.sku !== sku); renderTable(); }

function renderTable() {
    const tbody = document.getElementById('table-body'); tbody.innerHTML = '';
    const search = document.getElementById('search-filter').value.trim().toLowerCase(); const sortMode = document.getElementById('sort-filter').value;
    let displayData = [...inventoryData];
    if (search) displayData = displayData.filter(i => i.sku.toLowerCase().includes(search) || i.name.toLowerCase().includes(search));
    if (sortMode === 'missing') displayData.sort((a, b) => (a.fis - a.teo) - (b.fis - b.teo));
    else if (sortMode === 'surplus') displayData.sort((a, b) => (b.fis - b.teo) - (a.fis - a.teo));
    else if (sortMode === 'prev-missing') displayData.sort((a, b) => (a.prevDiff || 0) - (b.prevDiff || 0));
    else if (sortMode === 'prev-surplus') displayData.sort((a, b) => (b.prevDiff || 0) - (a.prevDiff || 0));
    else if (sortMode === 'alpha') displayData.sort((a, b) => a.name.localeCompare(b.name));

    let tMissQ=0, tMissM=0, tSurpQ=0, tSurpM=0;
    inventoryData.forEach(i => { let d = i.fis - i.teo, imp = d * i.price; if(d>0){tSurpQ+=d; tSurpM+=imp;} else if(d<0){tMissQ+=Math.abs(d); tMissM+=Math.abs(imp);} });

    let today = new Date(); today.setHours(0,0,0,0);
    // DENTRO DE renderTable() en main.js

displayData.forEach(i => {
    let d = i.fis - i.teo, imp = d * i.price; 
    let st = d===0 ? `<span class="diff-exact">0</span>` : d>0 ? `<span class="diff-surplus">+${d}</span>` : `<span class="diff-missing">${d}</span>`;
    let pD = i.prevDiff===null ? `--` : i.prevDiff===0 ? `<span class="diff-ghost">0</span>` : i.prevDiff>0 ? `<span class="diff-ghost">+${i.prevDiff}</span>` : `<span class="diff-ghost">${i.prevDiff}</span>`;
    
    let locsHTML = ''; 
    if (i.locs && i.locs.length > 0) { 
        locsHTML = `<div class="loc-list">`; 
        i.locs.forEach(l => { 
            // 🛡️ Sanitizamos el nombre de la locación por si viene sucia del Excel
            let safeLocName = DOMPurify.sanitize(l.name);
            locsHTML += `<div class="loc-row"><span class="loc-name" title="${safeLocName}">${safeLocName}:</span><input type="number" class="loc-input" value="${l.qty}" onchange="updateLocInline('${i.sku}', '${safeLocName}', this.value)"><button class="loc-del" onclick="deleteLoc('${i.sku}', '${safeLocName}')">×</button></div>`; 
        }); 
        locsHTML += `</div>`; 
    }
    locsHTML += `<button class="btn-cyan btn-add-loc" onclick="addNewLocInline('${i.sku}')">+ Zona</button>`;
    
    let expAlert = '';
    if(i.exp && i.exp !== "undefined" && i.exp !== "") {
        let expD = new Date(i.exp + 'T00:00:00'); let diffDays = Math.ceil((expD - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
        if(diffDays < 0) expAlert = `<div style="...estilos...">⚠️ CADUCADO HACE ${Math.abs(diffDays)} DÍAS</div>`;
        // ... (resto de tu lógica de expAlert) ...
    }

    // 🛡️ AQUÍ ESTÁ LA MAGIA: Sanitizamos las variables peligrosas ANTES de inyectarlas
    let safeSku = DOMPurify.sanitize(i.sku);
    let safeName = DOMPurify.sanitize(i.name);
    let safeCat = DOMPurify.sanitize(i.cat || 'GENERAL');

    // Ahora inyectas con total confianza usando las variables "safe"
    tbody.innerHTML += `<tr>
        <td style="color: var(--neon-cyan);">${safeSku}</td>
        <td style="text-align:left;"><strong>${safeName}</strong><br>${expAlert}</td>
        <td style="font-size:0.8em; color:var(--neon-yellow);">${safeCat}</td>
        <td>${moneyFormatter.format(i.price)}</td>
        <td><input type="number" class="inline-teo" value="${i.teo}" onchange="updateTeoInline('${safeSku}', this.value)"></td>
        <td><span style="font-size: 1.4em; font-weight:bold;">${i.fis}</span>${locsHTML}</td>
        <td style="font-size: 1.1em;">${st}</td>
        <td>${pD}</td>
        <td style="color:${d>0?'var(--neon-yellow)':d<0?'var(--neon-pink)':'rgba(255,255,255,0.5)'}">${moneyFormatter.format(imp)}</td>
        <td><button onclick="deleteItem('${safeSku}')" style="color:red; border-color:red; padding:2px 8px;">X</button></td>
    </tr>`;
});
    document.getElementById('qty-missing').innerText = `${tMissQ} perdidos`; document.getElementById('sum-missing').innerText = `-${moneyFormatter.format(tMissM)}`;
    document.getElementById('qty-surplus').innerText = `${tSurpQ} extra`; document.getElementById('sum-surplus').innerText = `+${moneyFormatter.format(tSurpM)}`;
    document.getElementById('sum-balance').innerText = moneyFormatter.format(tSurpM - tMissM); document.getElementById('sum-balance').style.color = (tSurpM - tMissM) >= 0 ? (tSurpM===tMissM && tMissQ===0 ? 'var(--neon-cyan)' : 'var(--neon-yellow)') : 'var(--neon-pink)';
}

function loadExcel(event) {
    const file = event.target.files[0]; if (!file) return;
    operatorName = document.getElementById('inv-operator').value.trim() || "SIN FIRMA";
    if(operatorName === "SIN FIRMA") return alert('La firma es obligatoria.');
    inventoryTitle = file.name.replace(/\.[^/.]+$/, "").toUpperCase(); startTimeString = getCurrentDateTime();
    document.getElementById('display-title').innerText = "> " + inventoryTitle; document.getElementById('display-operator').innerText = "AUDITOR: " + operatorName;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1});
        inventoryData = []; 
        let start = rows.findIndex(r => r[0] === "SKU");
        if(start !== -1) { 
            let head = rows[start];
            let iCat = head.findIndex(h => typeof h==='string' && h.includes("CATEGOR")); let iExp = head.findIndex(h => typeof h==='string' && h.includes("CADUCIDAD")); let iPrice = head.findIndex(h => typeof h==='string' && h.includes("PRECIO")); let iPrev = head.findIndex(h => typeof h==='string' && h.includes("VARIANZA ACTUAL")); 
            
            for(let i=start+1; i<rows.length; i++) { 
                if(!rows[i] || !rows[i][0]) continue; 
                if(String(rows[i][0]).toUpperCase().includes("RESUMEN")) break;

                let cat = iCat !== -1 ? String(rows[i][iCat]||'GENERAL') : 'GENERAL'; let expRaw = iExp !== -1 ? String(rows[i][iExp]||'') : ''; if(expRaw === "undefined") expRaw = '';
                let price = iPrice !== -1 ? parseFloat(rows[i][iPrice])||0 : 0; let prevDiff = iPrev !== -1 ? parseInt(rows[i][iPrev])||0 : 0;
                inventoryData.push({ sku: String(rows[i][0]), name: String(rows[i][1]||''), cat, exp: expRaw, price, teo: 0, fis: 0, prevDiff, locs: [] }); 
            } 
        }
        goToScreen('workspace-screen'); renderTable();
    }; reader.readAsArrayBuffer(file);
}

function exportInventoryToExcel() {
    if(!inventoryData.length) return alert('No hay datos.');
    let tMissQ=0, tMissM=0, tSurpQ=0, tSurpM=0; inventoryData.forEach(i => { let d = i.fis - i.teo, imp = d * i.price; if(d>0){tSurpQ+=d; tSurpM+=imp;} else if(d<0){tMissQ+=Math.abs(d); tMissM+=Math.abs(imp);} });
    let ws_data = [ ["REPORTE DE AUDITORÍA LOGÍSTICA"], ["ZONA / TÍTULO:", inventoryTitle, "", "AUDITOR / FIRMA:", operatorName], ["INICIADO:", startTimeString, "", "FINALIZADO:", getCurrentDateTime()], [], ["SKU", "NOMBRE", "CATEGORÍA", "CADUCIDAD", "PRECIO", "TEÓRICO", "FÍSICO GLOBAL", "DESGLOSE ZONAS", "VARIANZA ACTUAL", "VARIANZA ANTERIOR", "IMPACTO ($)"] ];
    inventoryData.forEach(i => { let locsExport = (i.locs || []).map(l => `${l.name}: ${l.qty}`).join(' | '); ws_data.push([ i.sku, i.name, i.cat||"GENERAL", i.exp||"", Number(i.price), Number(i.teo), Number(i.fis), locsExport, Number(i.fis-i.teo), Number(i.prevDiff||0), Number((i.fis-i.teo)*i.price) ]); });
    ws_data.push([]); ws_data.push([]); ws_data.push(["RESUMEN FINANCIERO"]); ws_data.push(["Artículos Faltantes:", tMissQ, "", "Fuga (Pérdida):", -tMissM]); ws_data.push(["Artículos Sobrantes:", tSurpQ, "", "Excedente Extra:", tSurpM]); ws_data.push(["", "", "", "BALANCE NETO:", tSurpM - tMissM]);
    let wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(ws_data); const borderAll = { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} };
    for (let cell in ws) {
        if (cell[0] === '!') continue; let col = cell.replace(/[0-9]/g, ''); let row = parseInt(cell.replace(/\D/g, '')); let val = ws[cell].v; ws[cell].s = { font: { name: "Calibri", sz: 11 }, alignment: { vertical: "center" } };
        if (row === 1) { ws[cell].s.font = { bold: true, sz: 14, color: {rgb:"FFFFFF"} }; ws[cell].s.fill = { fgColor: {rgb:"203764"} }; } if (row === 2 || row === 3) { ws[cell].s.font.bold = true; }
        if (row === 5) { ws[cell].s.font = { bold: true, color: {rgb:"FFFFFF"} }; ws[cell].s.fill = { fgColor: {rgb:"000000"} }; ws[cell].s.border = borderAll; ws[cell].s.alignment.horizontal = "center"; }
        if (row >= 6 && row < 6 + inventoryData.length) {
            ws[cell].s.border = borderAll; if(col === 'E' || col === 'K') ws[cell].z = '"$"#,##0.00'; 
            if (col === 'I' || col === 'K') { if (val < 0) { ws[cell].s.font.color = {rgb:"9C0006"}; ws[cell].s.font.bold = true; ws[cell].s.fill = { fgColor: {rgb:"FFC7CE"} }; } else if (val > 0) { ws[cell].s.font.color = {rgb:"006100"}; ws[cell].s.font.bold = true; ws[cell].s.fill = { fgColor: {rgb:"C6EFCE"} }; } }
        }
        if (row >= 6 + inventoryData.length + 2) { ws[cell].s.font.bold = true; if(row === 6 + inventoryData.length + 2) { ws[cell].s.font.sz = 13; ws[cell].s.border = {bottom:{style:"medium"}}; } if((col === 'B' || col === 'F') && typeof val === 'number') { if (col === 'F') ws[cell].z = '"$"#,##0.00'; } }
    }
    ws['!cols'] = [{wch:15},{wch:40},{wch:18},{wch:12},{wch:10},{wch:15},{wch:30},{wch:16},{wch:18},{wch:18}]; XLSX.utils.book_append_sheet(wb, ws, "Auditoria"); XLSX.writeFile(wb, `${inventoryTitle.replace(/ /g, '_')}_REPORTE.xlsx`);
}

// ==========================================
// MÓDULO 2: CONSOLIDADOR GLOBAL
// ==========================================
let unifyFiles = []; let unifiedFinalData = []; let paretoData = {};
function addFileToUnify(event) { const file = event.target.files[0]; if (!file) return; unifyFiles.push(file); const listEl = document.getElementById('unify-file-list'); const id = unifyFiles.length - 1; listEl.innerHTML += `<div class="file-item" id="ufile-${id}"><span>📄 ${file.name}</span><button onclick="removeFileToUnify(${id})">X</button></div>`; event.target.value = ''; }
function removeFileToUnify(index) { unifyFiles[index] = null; document.getElementById(`ufile-${index}`).style.display = 'none'; }

async function processUnification() {
    const activeFiles = unifyFiles.filter(f => f !== null); if(activeFiles.length === 0) return alert('Agrega Excel.'); document.getElementById('unify-file-count').innerText = `Archivos unificados: ${activeFiles.length}`; let masterMap = {}; paretoData = {}; 
    for(let file of activeFiles) {
        const rows = await readExcelAsync(file); let start = rows.findIndex(r => r[0] === "SKU");
        if(start !== -1) {
            let head = rows[start]; let iCat = head.findIndex(h => typeof h==='string' && h.includes("CATEGOR")); let iPrice = head.findIndex(h => typeof h==='string' && h.includes("PRECIO")); let iTeo = head.findIndex(h => typeof h==='string' && h.includes("TEÓRICO")); if(iTeo===-1) iTeo = 3; let iFis = head.findIndex(h => typeof h==='string' && h.includes("FÍSICO GLOBAL")); if(iFis===-1) iFis = 4;
            for(let i = start + 1; i < rows.length; i++) {
                if(!rows[i] || !rows[i][0]) continue;
                if(String(rows[i][0]).toUpperCase().includes("RESUMEN")) break;

                let sku = String(rows[i][0]).trim(); let name = String(rows[i][1] || '').trim(); let cat = iCat !== -1 ? String(rows[i][iCat]||'GENERAL') : 'GENERAL'; let price = iPrice !== -1 ? parseFloat(rows[i][iPrice])||0 : 0; let teo = parseInt(rows[i][iTeo]) || 0; let fis = parseInt(rows[i][iFis]) || 0;
                if(!masterMap[sku]) masterMap[sku] = { sku, name, cat, price, teo: 0, fis: 0 };
                masterMap[sku].teo += teo; masterMap[sku].fis += fis; if(price > 0) masterMap[sku].price = price;
            }
        }
    }
    let filteredArray = Object.values(masterMap).filter(item => (item.fis - item.teo) !== 0);
    filteredArray.forEach(item => { let diff = item.fis - item.teo; if(diff < 0) { let impactoPerdida = Math.abs(diff * item.price); if(!paretoData[item.cat]) paretoData[item.cat] = 0; paretoData[item.cat] += impactoPerdida; } });
    filteredArray.sort((a, b) => ((a.fis - a.teo) * a.price) - ((b.fis - b.teo) * b.price)); unifiedFinalData = filteredArray; renderUnifiedTable(); goToScreen('unify-workspace-screen');
}

function renderUnifiedTable() {
    const tbody = document.getElementById('unify-table-body'); tbody.innerHTML = ''; let tMissQ=0, tMissM=0, tSurpQ=0, tSurpM=0;
    unifiedFinalData.forEach(i => {
        let d = i.fis - i.teo; let imp = d * i.price;
        if(d>0){tSurpQ+=d; tSurpM+=imp;} else if(d<0){tMissQ+=Math.abs(d); tMissM+=Math.abs(imp);}
        let st = d>0?`<span class="diff-surplus">+${d}</span>`:`<span class="diff-missing">${d}</span>`; let colorImp = d>0?'var(--neon-yellow)':'var(--neon-pink)';
        tbody.innerHTML += `<tr><td style="color: #fff; font-weight:bold;">${i.sku}</td><td style="text-align:left;">${i.name}</td><td style="color:var(--neon-yellow);">${i.cat}</td><td>${moneyFormatter.format(i.price)}</td><td>${i.teo}</td><td style="font-weight:bold; color:var(--neon-cyan);">${i.fis}</td><td style="font-size: 1.1em;">${st}</td><td style="color:${colorImp}; font-weight:bold;">${moneyFormatter.format(imp)}</td></tr>`;
    });
    document.getElementById('u-qty-missing').innerText = `${tMissQ} faltantes netos`; document.getElementById('u-sum-missing').innerText = `-${moneyFormatter.format(tMissM)}`; document.getElementById('u-qty-surplus').innerText = `${tSurpQ} sobrantes netos`; document.getElementById('u-sum-surplus').innerText = `+${moneyFormatter.format(tSurpM)}`; document.getElementById('u-sum-balance').innerText = moneyFormatter.format(tSurpM - tMissM); document.getElementById('u-sum-balance').style.color = (tSurpM - tMissM) >= 0 ? 'var(--neon-cyan)' : 'var(--neon-pink)';

    const paretoEl = document.getElementById('pareto-dashboard'); paretoEl.innerHTML = ''; let paretoSorted = Object.entries(paretoData).sort((a,b) => b[1] - a[1]);
    if(paretoSorted.length === 0) { paretoEl.innerHTML = `<span style="color:var(--neon-green);">0 FUGAS DETECTADAS. EXCELENTE.</span>`; } else { paretoSorted.forEach(([cat, monto]) => { paretoEl.innerHTML += `<div class="pareto-box"><span>${cat}</span><h4>-${moneyFormatter.format(monto)}</h4></div>`; }); }
}

function exportUnifiedToExcel() {
    if(!unifiedFinalData.length) return alert('No hay datos.');
    let tMissQ=0, tMissM=0, tSurpQ=0, tSurpM=0; unifiedFinalData.forEach(i => { let d = i.fis - i.teo, imp = d * i.price; if(d>0){tSurpQ+=d; tSurpM+=imp;} else if(d<0){tMissQ+=Math.abs(d); tMissM+=Math.abs(imp);} });
    let ws_data = [ ["REPORTE GLOBAL UNIFICADO"], ["FECHA:", getCurrentDateTime()], [], ["SKU", "NOMBRE", "CATEGORÍA", "PRECIO", "TEÓRICO GLOBAL", "FÍSICO GLOBAL", "VARIANZA NETA", "IMPACTO TOTAL ($)"] ];
    unifiedFinalData.forEach(i => ws_data.push([i.sku, i.name, i.cat, Number(i.price), Number(i.teo), Number(i.fis), Number(i.fis-i.teo), Number((i.fis-i.teo)*i.price)]));
    ws_data.push([]); ws_data.push([]); ws_data.push(["RESUMEN FINANCIERO GLOBAL"]); ws_data.push(["Faltantes Totales:", tMissQ, "", "Fuga Neta:", -tMissM]); ws_data.push(["Sobrantes Totales:", tSurpQ, "", "Excedente Neto:", tSurpM]); ws_data.push(["", "", "", "BALANCE NETO:", tSurpM - tMissM]);
    let wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(ws_data); const borderAll = { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} };
    for (let cell in ws) {
        if (cell[0] === '!') continue; let col = cell.replace(/[0-9]/g, ''); let row = parseInt(cell.replace(/\D/g, '')); let val = ws[cell].v; ws[cell].s = { font: { name: "Calibri", sz: 11 }, alignment: { vertical: "center" } };
        if (row === 1) { ws[cell].s.font = { bold: true, sz: 14, color: {rgb:"FFFFFF"} }; ws[cell].s.fill = { fgColor: {rgb:"9C0059"} }; } if (row === 4) { ws[cell].s.font = { bold: true, color: {rgb:"FFFFFF"} }; ws[cell].s.fill = { fgColor: {rgb:"000000"} }; ws[cell].s.border = borderAll; }
        if (row >= 5 && row < 5 + unifiedFinalData.length) { ws[cell].s.border = borderAll; if(col === 'D' || col === 'H') ws[cell].z = '"$"#,##0.00'; if (col === 'G' || col === 'H') { if (val < 0) { ws[cell].s.font.color = {rgb:"9C0006"}; ws[cell].s.font.bold = true; ws[cell].s.fill = { fgColor: {rgb:"FFC7CE"} }; } else if (val > 0) { ws[cell].s.font.color = {rgb:"006100"}; ws[cell].s.font.bold = true; ws[cell].s.fill = { fgColor: {rgb:"C6EFCE"} }; } } }
        if (row >= 5 + unifiedFinalData.length + 2) { ws[cell].s.font.bold = true; if(row === 5 + unifiedFinalData.length + 2) { ws[cell].s.font.sz = 13; ws[cell].s.border = {bottom:{style:"medium"}}; } if((col === 'B' || col === 'E') && typeof val === 'number') { if (col === 'E') ws[cell].z = '"$"#,##0.00'; } }
    }
    ws['!cols'] = [{wch:15},{wch:45},{wch:18},{wch:12},{wch:15},{wch:15},{wch:16},{wch:20}]; XLSX.utils.book_append_sheet(wb, ws, "Master"); XLSX.writeFile(wb, `INVENTARIO_GLOBAL_UNIFICADO.xlsx`);
}

// ==========================================
// MÓDULO 3: VENTAS Y RESURTIDO
// ==========================================
let salesFile1 = null; let salesFile2 = null; let salesData = [];

function setSalesFile(event, num) {
    if(num === 1) salesFile1 = event.target.files[0]; if(num === 2) salesFile2 = event.target.files[0];
    document.getElementById(`sales-btn-${num}`).innerText = `✔️ ARCHIVO ${num} CARGADO`; document.getElementById(`sales-btn-${num}`).style.borderColor = "var(--neon-green)"; document.getElementById(`sales-btn-${num}`).style.color = "var(--neon-green)";
}

async function processSalesAnalysis() {
    if(!salesFile1 || !salesFile2) return alert("Sube los archivos de la Semana 1 y la Semana 2.");
    let rows1 = await readExcelAsync(salesFile1); let rows2 = await readExcelAsync(salesFile2);
    let map1 = {}, map2 = {};
    
    let start1 = rows1.findIndex(r => r[0] === "SKU");
    if(start1 !== -1) {
        let iPrice=rows1[start1].findIndex(h=>typeof h==='string'&&h.includes("PRECIO")); let iTeo=rows1[start1].findIndex(h=>typeof h==='string'&&h.includes("TEÓRICO")); let iFis=rows1[start1].findIndex(h=>typeof h==='string'&&h.includes("FÍSICO"));
        if(iTeo===-1) iTeo=3; if(iFis===-1) iFis=4;
        for(let i=start1+1; i<rows1.length; i++) {
            if(!rows1[i][0]) continue; 
            if(String(rows1[i][0]).toUpperCase().includes("RESUMEN")) break;
            let sku = String(rows1[i][0]);
            map1[sku] = { teo: parseInt(rows1[i][iTeo])||0, fis: parseInt(rows1[i][iFis])||0, price: iPrice!==-1?parseFloat(rows1[i][iPrice])||0:0, name: String(rows1[i][1])||"" };
        }
    }

    let start2 = rows2.findIndex(r => r[0] === "SKU");
    if(start2 !== -1) {
        let iPrice=rows2[start2].findIndex(h=>typeof h==='string'&&h.includes("PRECIO")); let iTeo=rows2[start2].findIndex(h=>typeof h==='string'&&h.includes("TEÓRICO")); let iFis=rows2[start2].findIndex(h=>typeof h==='string'&&h.includes("FÍSICO"));
        if(iTeo===-1) iTeo=3; if(iFis===-1) iFis=4;
        for(let i=start2+1; i<rows2.length; i++) {
            if(!rows2[i][0]) continue; 
            if(String(rows2[i][0]).toUpperCase().includes("RESUMEN")) break;
            let sku = String(rows2[i][0]);
            map2[sku] = { teo: parseInt(rows2[i][iTeo])||0, fis: parseInt(rows2[i][iFis])||0, price: iPrice!==-1?parseFloat(rows2[i][iPrice])||0:0, name: String(rows2[i][1])||"" };
        }
    }

    salesData = []; let allSkus = new Set([...Object.keys(map1), ...Object.keys(map2)]);
    allSkus.forEach(sku => {
        let d1 = map1[sku] || {teo:0, fis:0, price:0, name:"Desconocido"}; let d2 = map2[sku] || {teo:0, fis:0, price: d1.price, name: d1.name};
        let price = d2.price > 0 ? d2.price : d1.price; let name = d2.name !== "Desconocido" ? d2.name : d1.name;
        salesData.push({ sku, name, price, t1: d1.teo, f1: d1.fis, t2: d2.teo, f2: d2.fis, entradas: 0 });
    });

    salesData = salesData.filter(i => !(i.f1 === 0 && i.f2 === 0 && i.t1 === 0 && i.t2 === 0));
    salesData.sort((a, b) => ((b.f1 + b.entradas - b.f2) * b.price) - ((a.f1 + a.entradas - a.f2) * a.price));
    renderSalesTable(); goToScreen('sales-workspace-screen');
}

function updateEntradas(sku, val) { let item = salesData.find(i => i.sku === sku); if(item) { item.entradas = parseInt(val) || 0; renderSalesTable(); } }

function renderSalesTable() {
    let tbody = document.getElementById('sales-table-body'); tbody.innerHTML = ''; let totalVentas = 0; let totalRobo = 0; let periodDays = parseInt(document.getElementById('sales-days').value) || 7;

    salesData.forEach(i => {
        let var1 = i.f1 - i.t1; let var2 = i.f2 - i.t2; let fugaNueva = -(var2 - var1); let salidaTotal = i.f1 + i.entradas - i.f2; let ventaEstimada = salidaTotal - fugaNueva;
        if(ventaEstimada > 0) totalVentas += ventaEstimada * i.price; if(fugaNueva > 0) totalRobo += fugaNueva * i.price;
        
        let rotacion = (i.f1 + i.entradas) > 0 ? (ventaEstimada / (i.f1 + i.entradas)) * 100 : 0;
        i.rotacion = rotacion; 
        
        let diasVidaHTML = ''; let diasVidaExcel = '';
        if(ventaEstimada > 0) {
            let ventaDiaria = ventaEstimada / periodDays; let diasRestantes = Math.round(i.f2 / ventaDiaria); diasVidaExcel = diasRestantes;
            if(diasRestantes <= 3) diasVidaHTML = `<span style="color:var(--neon-pink); font-weight:bold; font-size: 0.85em;">⚠️ ${diasRestantes} días (CRÍTICO)</span>`;
            else if(diasRestantes > 30) diasVidaHTML = `<span style="color:var(--neon-cyan); font-size: 0.85em;">🧊 ${diasRestantes} días (SOBRESTOCK)</span>`;
            else diasVidaHTML = `<span style="color:var(--neon-green); font-size: 0.85em;">✅ ${diasRestantes} días</span>`;
        } else { diasVidaHTML = `<span style="color:rgba(255,255,255,0.3); font-size: 0.8em;">Sin Rotación</span>`; diasVidaExcel = "Sin Rotación"; }
        i.diasExcel = diasVidaExcel; i.ventaRealSugerida = ventaEstimada;
        let fontFuga = fugaNueva > 0 ? 'var(--neon-pink)' : (fugaNueva < 0 ? 'var(--neon-green)' : 'rgba(255,255,255,0.5)');

        tbody.innerHTML += `<tr>
            <td>${i.sku}</td><td style="text-align:left;">${i.name}</td><td style="color:var(--neon-cyan); font-weight:bold; font-size:1.1em;">${i.f1}</td>
            <td><input type="number" class="inline-teo" value="${i.entradas}" onchange="updateEntradas('${i.sku}', this.value)" style="background: #fff; color: #000; border: none; font-size: 1.1em;"></td>
            <td style="color:var(--neon-pink); font-weight:bold; font-size:1.1em;">${i.f2}</td><td style="color:${fontFuga}; font-weight:bold;">${fugaNueva}</td>
            <td style="color:var(--neon-yellow); font-weight:bold; font-size:1.2em;">${ventaEstimada}</td>
            <td style="color:var(--neon-cyan); font-weight:bold;">${rotacion.toFixed(1)}%</td>
            <td>${diasVidaHTML}</td>
        </tr>`;
    });
    document.getElementById('s-sum-ventas').innerText = moneyFormatter.format(totalVentas); document.getElementById('s-sum-robo').innerText = `-${moneyFormatter.format(totalRobo)}`;
}

function exportSalesToExcel() {
    if(!salesData.length) return alert('No hay datos.');
    let periodDays = parseInt(document.getElementById('sales-days').value) || 7;
    let ws_data = [ ["REPORTE DE ANÁLISIS PREDICTIVO Y ROTACIÓN"], ["FECHA:", getCurrentDateTime(), "", `DÍAS EVALUADOS: ${periodDays}`], [], ["SKU", "NOMBRE", "PRECIO", "FÍSICO VIEJO", "ENTRADAS", "FÍSICO NUEVO", "ROBO DETECTADO", "VENTA REAL ESTIMADA", "% ROTACIÓN", "DÍAS DE INVENTARIO (VIDA)"] ];
    let tVen=0, tRob=0;
    salesData.forEach(i => {
        let var1 = i.f1 - i.t1; let var2 = i.f2 - i.t2; let fugaNueva = -(var2 - var1); let salidaTotal = i.f1 + i.entradas - i.f2; let ventaEstimada = salidaTotal - fugaNueva;
        if(ventaEstimada > 0) tVen += ventaEstimada * i.price; if(fugaNueva > 0) tRob += fugaNueva * i.price;
        ws_data.push([i.sku, i.name, Number(i.price), Number(i.f1), Number(i.entradas), Number(i.f2), Number(fugaNueva), Number(ventaEstimada), Number((i.rotacion||0).toFixed(2)), i.diasExcel]);
    });

    ws_data.push([]); ws_data.push(["RESUMEN DE ROTACIÓN"]); ws_data.push(["VENTA REAL ($) para Resurtir:", tVen]); ws_data.push(["FUGA POR ROBO ($):", -tRob]);
    let wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(ws_data); const borderAll = { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} };
    for (let cell in ws) {
        if (cell[0] === '!') continue; let col = cell.replace(/[0-9]/g, ''); let row = parseInt(cell.replace(/\D/g, '')); let val = ws[cell].v; ws[cell].s = { font: { name: "Calibri", sz: 11 }, alignment: { vertical: "center" } };
        if (row === 1) { ws[cell].s.font = { bold: true, sz: 14, color: {rgb:"000000"} }; ws[cell].s.fill = { fgColor: {rgb:"FFD700"} }; } 
        if (row === 4) { ws[cell].s.font = { bold: true, color: {rgb:"000000"} }; ws[cell].s.fill = { fgColor: {rgb:"FFD700"} }; ws[cell].s.border = borderAll; }
        if (row >= 5 && row < 5 + salesData.length) { 
            ws[cell].s.border = borderAll; if(col === 'C') ws[cell].z = '"$"#,##0.00'; if(col === 'I') ws[cell].z = '0.00"%"';
            if(col === 'G') { if(val > 0) { ws[cell].s.font.color = {rgb:"9C0006"}; ws[cell].s.fill = { fgColor: {rgb:"FFC7CE"} }; } }
            if(col === 'H') { ws[cell].s.font.bold = true; ws[cell].s.fill = { fgColor: {rgb:"FFF2CC"} }; }
            if(col === 'J') { if(val <= 3) { ws[cell].s.font.color = {rgb:"9C0006"}; ws[cell].s.font.bold = true; } }
        }
        if (row >= 5 + salesData.length + 2) { ws[cell].s.font.bold = true; if((col === 'B') && typeof val === 'number') { ws[cell].z = '"$"#,##0.00'; } }
    }
    ws['!cols'] = [{wch:15},{wch:40},{wch:12},{wch:15},{wch:15},{wch:15},{wch:18},{wch:20},{wch:15},{wch:25}]; XLSX.utils.book_append_sheet(wb, ws, "Analisis_Rotacion"); XLSX.writeFile(wb, `ANALISIS_PREDICTIVO.xlsx`);
}

function exportSupplierOrder() {
    if(!salesData.length) return alert('No hay datos.');
    let ws_data = [ ["ORDEN DE COMPRA SUGERIDA"], ["FECHA GENERACIÓN:", getCurrentDateTime()], [], ["SKU", "NOMBRE DEL PRODUCTO", "% ROTACIÓN DEL ITEM", "CANTIDAD A PEDIR (UNIDADES)"] ];
    let orderHasItems = false;
    salesData.forEach(i => { if(i.ventaRealSugerida > 0) { ws_data.push([i.sku, i.name, Number((i.rotacion||0).toFixed(2)), Number(i.ventaRealSugerida)]); orderHasItems = true; } });
    if(!orderHasItems) return alert("No tienes ventas reales registradas. No hay nada que pedir.");

    let wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(ws_data); const borderAll = { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} };
    for (let cell in ws) {
        if (cell[0] === '!') continue; let col = cell.replace(/[0-9]/g, ''); let row = parseInt(cell.replace(/\D/g, '')); ws[cell].s = { font: { name: "Calibri", sz: 12 }, alignment: { vertical: "center" } };
        if (row === 1) { ws[cell].s.font = { bold: true, sz: 14, color: {rgb:"FFFFFF"} }; ws[cell].s.fill = { fgColor: {rgb:"008000"} }; } 
        if (row === 4) { ws[cell].s.font = { bold: true, color: {rgb:"FFFFFF"} }; ws[cell].s.fill = { fgColor: {rgb:"000000"} }; ws[cell].s.border = borderAll; }
        if (row >= 5) { ws[cell].s.border = borderAll; if(col==='C') ws[cell].z = '0.00"%"'; if(col==='D') { ws[cell].s.font.bold = true; ws[cell].s.fill = { fgColor: {rgb:"E2EFDA"} }; } }
    }
    ws['!cols'] = [{wch:15},{wch:45},{wch:20},{wch:30}]; XLSX.utils.book_append_sheet(wb, ws, "Pedido"); XLSX.writeFile(wb, `PEDIDO_PROVEEDOR.xlsx`);
}

// ==========================================
// MÓDULO 4: CREADOR DE PDF UNIVERSAL 
// ==========================================
async function processExcelToPDF(event) {
    const file = event.target.files[0]; if (!file) return;
    document.getElementById('pdf-status-text').innerHTML = `<span style="color: var(--neon-yellow);">Procesando archivo...</span>`;

    try {
        const rows = await readExcelAsync(file);
        let headerIdx = rows.findIndex(r => r && r[0] && r[0].toString().toUpperCase().includes("SKU"));
        if (headerIdx === -1) { alert("Error: El archivo no fue generado por esta Suite."); document.getElementById('pdf-status-text').innerText = "Esperando archivo..."; event.target.value = ''; return; }

        let title = rows[0] && rows[0][0] ? rows[0][0] : "REPORTE LOGÍSTICO"; let headers = rows[headerIdx]; let bodyData = []; let summaryData = []; let inSummary = false;

        for(let i = headerIdx + 1; i < rows.length; i++) {
            if (!rows[i] || rows[i].length === 0 || !rows[i][0]) continue; 
            let firstCell = String(rows[i][0]).toUpperCase();
            if (firstCell.includes("RESUMEN")) { inSummary = true; continue; }
            if(inSummary) { summaryData.push(rows[i]); } else { bodyData.push(rows[i]); }
        }

        const doc = new jsPDF('landscape', 'pt', 'a4'); 
        doc.setFontSize(16); doc.setTextColor(40, 40, 40); doc.text(title, 40, 40);
        doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.text(`Generado el: ${getCurrentDateTime()}`, 40, 55);

        doc.autoTable({ startY: 70, head: [headers], body: bodyData, theme: 'grid', styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [40, 55, 100], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [245, 245, 245] }, margin: { left: 40, right: 40 } });

        if (summaryData.length > 0) { let finalY = doc.lastAutoTable.finalY || 70; doc.autoTable({ startY: finalY + 30, body: summaryData, theme: 'plain', styles: { fontSize: 10, fontStyle: 'bold', textColor: [50,50,50] }, margin: { left: 40 } }); }

        doc.save(`${file.name.replace(/\.[^/.]+$/, "")}_PDF.pdf`);
        document.getElementById('pdf-status-text').innerHTML = `<span style="color: var(--neon-green);">¡PDF Generado con Éxito! ✅</span>`;
    } catch (error) { console.error(error); document.getElementById('pdf-status-text').innerHTML = `<span style="color: var(--neon-pink);">Error al procesar el archivo.</span>`; }
    event.target.value = ''; 
}

// ==========================================
// INICIALIZACIÓN Y EVENTOS DOM
// ==========================================

// Función Debounce (El guardián anti-saturación de API)
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

document.addEventListener("DOMContentLoaded", () => {
    const skuInput = document.getElementById('item-sku');
    const nameInput = document.getElementById('item-name');
    const catInput = document.getElementById('item-cat');
    const priceInput = document.getElementById('item-price');

    // 1. Lógica del Input de Nombre (Predictivo)
    if(nameInput) {
        nameInput.parentNode.style.position = 'relative';
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        nameInput.parentNode.appendChild(dropdown);

        const handleAutocomplete = debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 3) {
                dropdown.style.display = 'none';
                return;
            }
            dropdown.innerHTML = `<div class="autocomplete-item" style="color:var(--neon-yellow);">Cargando red...</div>`;
            dropdown.style.display = 'block';

            // Nota: Asume que tienes importada buscarSugerencias arriba en tu main.js
            try {
                const sugerencias = await buscarSugerencias(query);
                if (sugerencias.length > 0) {
                    dropdown.innerHTML = '';
                    sugerencias.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        div.innerHTML = `<span class="auto-sku">SKU: ${item.sku}</span><span class="auto-name">${item.nombre}</span>`;
                        div.addEventListener('click', () => {
                            if(skuInput) skuInput.value = item.sku;
                            nameInput.value = item.nombre;
                            catInput.value = item.categoria;
                            dropdown.style.display = 'none';
                            priceInput.focus(); 
                        });
                        dropdown.appendChild(div);
                    });
                } else {
                    dropdown.innerHTML = `<div class="autocomplete-item" style="color:var(--neon-pink);">0 Coincidencias en DB</div>`;
                }
            } catch (err) {
                dropdown.innerHTML = `<div class="autocomplete-item" style="color:red;">API desconectada de momento</div>`;
            }
        }, 400); 

        nameInput.addEventListener('input', handleAutocomplete);
        document.addEventListener('click', (e) => {
            if (e.target !== nameInput && e.target !== dropdown) {
                dropdown.style.display = 'none';
            }
        });
    }

    // 2. ESCÁNER DE CÁMARA NATIVO (MODAL FULLSCREEN)
    const btnScan = document.getElementById('btn-scan');
    const btnCloseScan = document.getElementById('btn-close-scan');
    const readerModal = document.getElementById('reader-modal'); 
    let html5QrCode; 

    if (btnScan && readerModal) {
        btnScan.addEventListener('click', () => {
            readerModal.style.display = 'flex';
            
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("reader", { 
                    formatsToSupport: [ 
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39
                    ] 
                });
            }

            const config = { 
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0 
            };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    if (skuInput) {
                        skuInput.value = decodedText;
                        html5QrCode.stop().then(() => {
                            readerModal.style.display = 'none'; 
                            skuInput.dispatchEvent(new Event('blur')); // Dispara la búsqueda
                            if (nameInput) {
                                nameInput.placeholder = "Buscando...";
                                nameInput.focus();
                            }
                        }).catch(err => console.error(err));
                    }
                },
                (errorMessage) => { /* Ignorar errores por cuadros vacíos */ }
            ).catch((err) => {
                alert("Error al iniciar cámara. Da permisos en tu navegador.");
                readerModal.style.display = 'none';
            });
        });

        if (btnCloseScan) {
            btnCloseScan.addEventListener('click', () => {
                if (html5QrCode) {
                    html5QrCode.stop().then(() => {
                        readerModal.style.display = 'none';
                    }).catch(err => console.error(err));
                } else {
                    readerModal.style.display = 'none';
                }
            });
        }
    }
}); // <--- ESTA ES LA LLAVE Y PARÉNTESIS QUE SE TE HABÍAN BORRADO

// ==========================================
// PREVENCIÓN DE IMPLOSIONES EN HTML
// ==========================================
window.goToScreen = goToScreen;
window.startNewInventory = startNewInventory;
window.loadExcel = loadExcel;
window.exportInventoryToExcel = exportInventoryToExcel;
window.addItem = addItem;
window.updateLocInline = updateLocInline;
window.deleteLoc = deleteLoc;
window.addNewLocInline = addNewLocInline;
window.updateTeoInline = updateTeoInline;
window.deleteItem = deleteItem;
window.renderTable = renderTable;
window.addFileToUnify = addFileToUnify;
window.removeFileToUnify = removeFileToUnify;
window.processUnification = processUnification;
window.exportUnifiedToExcel = exportUnifiedToExcel;
window.setSalesFile = setSalesFile;
window.processSalesAnalysis = processSalesAnalysis;
window.updateEntradas = updateEntradas;
window.exportSalesToExcel = exportSalesToExcel;
window.exportSupplierOrder = exportSupplierOrder;
window.processExcelToPDF = processExcelToPDF;
