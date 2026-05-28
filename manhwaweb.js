/**
 * Extensión de ManhwaWeb para Mangayomi
 * Basada en el patrón MProvider (Referencia AnimeFLV)
 */

class DefaultExtension extends MProvider {
    /**
     * Obtiene la lista de obras populares/biblioteca.
     */
    async getPopular(page) {
        const apiUrl = this.source.apiUrl;
        // ManhwaWeb usa paginación desde 0
        const res = await new Client().get(`${apiUrl}/manhwa/library?page=${page - 1}`);
        const data = JSON.parse(res.body);
        
        const list = data.data.map(item => ({
            name: item.the_real_name,
            link: item.real_id || item._id,
            imageUrl: item._imagen
        }));

        return {
            list: list,
            hasNextPage: list.length > 0
        };
    }

    /**
     * Obtiene las actualizaciones más recientes.
     */
    async getLatestUpdates(page) {
        return await this.getPopular(page);
    }

    /**
     * Realiza una búsqueda por texto.
     */
    async search(query, page, filters) {
        const apiUrl = this.source.apiUrl;
        const res = await new Client().get(`${apiUrl}/manhwa/library?buscar=${encodeURIComponent(query)}&page=${page - 1}`);
        const data = JSON.parse(res.body);
        
        const list = data.data.map(item => ({
            name: item.the_real_name,
            link: item.real_id || item._id,
            imageUrl: item._imagen
        }));

        return {
            list: list,
            hasNextPage: list.length > 0
        };
    }

    /**
     * Obtiene los detalles de una obra y su lista de capítulos.
     */
    async getDetail(url) {
        const apiUrl = this.source.apiUrl;
        // El link guardado es el ID de la obra
        const res = await new Client().get(`${apiUrl}/manhwa/see/${url}`);
        const data = JSON.parse(res.body);
        
        const statusMap = {
            "publicandose": 0, // Ongoing
            "finalizado": 1,   // Completed
            "hiatus": 2        // Hiatus
        };

        const genre = data._categoris.map(cat => Object.values(cat)[0]);
        const chapterList = data.chapters.map(ch => ({
            name: `Capítulo ${ch.chapter}`,
            url: ch.link.split('/').pop(),
            dateUpload: ch.create ? ch.create.toString() : ""
        })).reverse();

        return {
            description: data._sinopsis,
            status: statusMap[data._status] || 5,
            genre: genre,
            chapters: chapterList
        };
    }

    /**
     * Obtiene las imágenes de un capítulo específico.
     */
    async getPageList(url) {
        const apiUrl = this.source.apiUrl;
        const res = await new Client().get(`${apiUrl}/chapters/see/${url}`);
        const data = JSON.parse(res.body);
        
        return data.chapter.img;
    }
}
