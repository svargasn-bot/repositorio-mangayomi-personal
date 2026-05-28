/**
 * Extension de ManhwaWeb para Mangayomi
 * Basada en el patron MProvider
 * 
 * CONFIGURACION REQUERIDA EN MANGAYOMI:
 * Name: ManhwaWeb
 * Base URL: https://manhwaweb.com
 * API URL: https://manhwawebbackend-production.up.railway.app
 * Icon URL: https://manhwaweb.com/assets/favicon-32x32.png
 */
class DefaultExtension extends MProvider {
    // Funcion interna para asegurar que usamos la API correcta
    getApiUrl() {
        let url = this.source.apiUrl;
        // Si la URL esta vacia o es la del sitio web, forzamos la de la API real
        if (!url || url.includes("manhwaweb.com") || url.length < 5) {
            return "https://manhwawebbackend-production.up.railway.app";
        }
        return url;
    }

    async getPopular(page) {
        const apiUrl = this.getApiUrl();
        const res = await new Client().get(`${apiUrl}/manhwa/library?page=${page - 1}`, {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        });
        
        if (res.body.trim().startsWith("<!DOCTYPE")) {
            throw new Error("La API devolvio HTML en lugar de datos. Verifica la conexion a Railway.");
        }
        
        const data = JSON.parse(res.body);
        const list = data.data.map(item => ({
            name: item.the_real_name,
            link: item.real_id || item._id,
            imageUrl: item._imagen
        }));

        return { list: list, hasNextPage: list.length > 0 };
    }

    async getLatestUpdates(page) {
        return await this.getPopular(page);
    }

    async search(query, page, filters) {
        const apiUrl = this.getApiUrl();
        const res = await new Client().get(`${apiUrl}/manhwa/library?buscar=${encodeURIComponent(query)}&page=${page - 1}`);
        const data = JSON.parse(res.body);
        const list = data.data.map(item => ({
            name: item.the_real_name,
            link: item.real_id || item._id,
            imageUrl: item._imagen
        }));
        return { list: list, hasNextPage: list.length > 0 };
    }

    async getDetail(url) {
        const apiUrl = this.getApiUrl();
        const res = await new Client().get(`${apiUrl}/manhwa/see/${url}`);
        const data = JSON.parse(res.body);
        const statusMap = {"publicandose": 0, "finalizado": 1, "hiatus": 2};
        const genre = data._categoris.map(cat => Object.values(cat)[0]);
        const chapterList = data.chapters.map(ch => ({
            name: `Capitulo ${ch.chapter}`,
            url: ch.link.split('/').pop()
        })).reverse();

        return {
            description: data._sinopsis,
            status: statusMap[data._status] || 5,
            genre: genre,
            chapters: chapterList
        };
    }

    async getPageList(url) {
        const apiUrl = this.getApiUrl();
        const res = await new Client().get(`${apiUrl}/chapters/see/${url}`);
        const data = JSON.parse(res.body);
        return data.chapter.img;
    }
}
