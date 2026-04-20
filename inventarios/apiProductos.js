// apiProductos.js

// 1. La función que ya tenías (búsqueda exacta por código)
export async function buscarProductoPorSKU(sku) {
    if (!sku) return null;
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${sku}.json`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        if (data.status === 1 && data.product) {
            return {
                nombre: data.product.product_name || '',
                categoria: data.product.categories ? data.product.categories.split(',')[0].trim().toUpperCase() : 'GENERAL'
            };
        }
        return null;
    } catch (error) {
        console.error("Error consultando API:", error);
        return null;
    }
}

// 2. NUEVA FUNCIÓN: Búsqueda predictiva (Top 5)
export async function buscarSugerencias(query) {
    // Solo buscamos si hay 3 o más caracteres
    if (!query || query.length < 3) return [];
    
    try {
        // Usamos el endpoint de búsqueda y limitamos a 5 resultados (page_size=5)
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        if (data.products && data.products.length > 0) {
            // Mapeamos los datos feos de la API a un formato limpio para nuestra app
            return data.products.map(p => ({
                sku: p.code || '',
                nombre: p.product_name || 'Sin Nombre',
                categoria: p.categories ? p.categories.split(',')[0].trim().toUpperCase() : 'GENERAL'
            })).filter(p => p.sku !== ''); // Filtramos los que no tengan SKU
        }
        return [];
    } catch (error) {
        console.error("Error buscando sugerencias:", error);
        return [];
    }
}
