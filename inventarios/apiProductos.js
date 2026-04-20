// apiProductos.js
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
