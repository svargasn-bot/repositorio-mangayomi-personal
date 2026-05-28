class DefaultExtension extends MProvider {
    async request(url) {
        var baseUrl = "https://animeav1.com";
        var finalUrl = url.trim();
        
        // Sanar URLs malformadas
        if (finalUrl.indexOf("https://animeav1.comhttps") === 0) {
            finalUrl = finalUrl.replace("https://animeav1.comhttps", "https");
        }
        if (finalUrl.indexOf("https//") === 0) {
            finalUrl = "https://" + finalUrl.substring(7);
        }

        if (finalUrl.indexOf("http") !== 0) {
            if (finalUrl.indexOf("//") === 0) {
                finalUrl = "https:" + finalUrl;
            } else {
                finalUrl = baseUrl + (finalUrl.indexOf("/") === 0 ? "" : "/") + finalUrl;
            }
        }
        
        return await new Client().get(finalUrl);
    }

    // Función definitiva para eliminar TODO rastro de tildes y arreglar errores de la web
    removeAccents(text) {
        if (!text) return "";
        var s = text;

        // 1. Convertir escapes literales \uXXXX que vienen en el texto (ej: \u2022 -> •)
        s = s.replace(/\\u([0-9a-fA-F]{4})/g, function(match, grp) {
            return String.fromCharCode(parseInt(grp, 16));
        });

        // 2. Mapeo de Mojibake (cuando la app lee mal el UTF-8) directamente a letras SIN tilde
        // Esto arregla "Ã³" -> "o", "Ã©" -> "e", etc.
        var mojibakeMap = [
            ["\u00C3\u00A1", "a"], ["\u00C3\u00A9", "e"], ["\u00C3\u00AD", "i"], ["\u00C3\u00B3", "o"], ["\u00C3\u00BA", "u"],
            ["\u00C3\u0081", "A"], ["\u00C3\u0089", "E"], ["\u00C3\u008D", "I"], ["\u00C3\u0093", "O"], ["\u00C3\u009A", "U"],
            ["\u00C3\u00B1", "n"], ["\u00C3\u0091", "N"], ["\u00C3\u00BC", "u"], ["\u00C3\u009C", "U"],
            ["\u00C2\xBF", ""], ["\u00C2\xA1", ""], ["\u00C2\xBA", "."], ["\u00C2\xAA", "."], ["\u00C3\u0082", ""]
        ];
        for (var i = 0; i < mojibakeMap.length; i++) {
            s = s.split(mojibakeMap[i][0]).join(mojibakeMap[i][1]);
        }

        // 3. Mapeo de caracteres acentuados reales a letras SIN tilde
        var accentMap = {
            'á':'a','é':'e','í':'i','ó':'o','ú':'u',
            'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U',
            'ñ':'n','Ñ':'N','ü':'u','Ü':'U',
            '¿':'','¡':'','º':'.','ª':'.','•':'-','\u2022':'-','·':'-'
        };
        for (var key in accentMap) {
            s = s.split(key).join(accentMap[key]);
        }

        // 4. Limpieza final de entidades HTML y espacios
        return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
                .replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\\t/g, " ")
                .replace(/\s+/g, " ").trim();
    }

    async getPopular(page) {
        var res = await this.request("/catalogo?page=" + page);
        var html = res.body;
        var list = [];
        var regex = /<article[\s\S]*?src="([^"]+?covers\/(\d+)\.jpg)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?href="([^"]+)"/g;
        var match;
        while ((match = regex.exec(html)) !== null) {
            list.push({
                name: this.removeAccents(match[3]),
                imageUrl: match[1],
                link: match[4]
            });
        }
        return { list: list, hasNextPage: list.length > 0 };
    }

    async getLatestUpdates(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var res = await this.request("/");
        var html = res.body;
        var list = [];
        var regex = /media:\{\s*id:(\d+),\s*slug:"([^"]+)",\s*title:"([^"]+)"\s*\},\s*number:(\d+)/g;
        var match;
        while ((match = regex.exec(html)) !== null) {
            list.push({
                name: this.removeAccents(match[3]) + " - Ep " + match[4],
                imageUrl: "https://cdn.animeav1.com/covers/" + match[1] + ".jpg",
                link: "/media/" + match[2] + "/" + match[4]
            });
        }
        return { list: list, hasNextPage: false };
    }

    async search(query, page, filters) {
        var res = await this.request("/catalogo?search=" + encodeURIComponent(query) + "&page=" + page);
        var html = res.body;
        var list = [];
        var regex = /<article[\s\S]*?src="([^"]+?covers\/(\d+)\.jpg)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?href="([^"]+)"/g;
        var match;
        while ((match = regex.exec(html)) !== null) {
            list.push({
                name: this.removeAccents(match[3]),
                imageUrl: match[1],
                link: match[4]
            });
        }
        return { list: list, hasNextPage: list.length > 0 };
    }

    async getDetail(url) {
        var res = await this.request(url);
        var html = res.body;
        var currentSlug = url.split("/").pop().split("?")[0];

        var getVal = function(text, key) {
            var m = text.match(new RegExp('(?:["\']' + key + '["\']|' + key + ')\\s*:\\s*["\']'));
            if (!m) return "";
            var start = m.index + m[0].length;
            var quote = m[0][m[0].length - 1];
            var end = start;
            while (end < text.length) {
                if (text[end] === quote) {
                    var backslashes = 0;
                    var j = end - 1;
                    while (j >= start && text[j] === '\\') {
                        backslashes++;
                        j--;
                    }
                    if (backslashes % 2 === 0) break;
                }
                end++;
            }
            var s = text.substring(start, end);
            return s.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
        };

        var extractBlock = function(text, startKey, openChar, closeChar) {
            var m = text.match(new RegExp(startKey + '\\s*:\\s*\\' + openChar));
            if (!m) return "";
            var start = m.index + m[0].length - 1;
            var depth = 0;
            var inQuote = false;
            var quoteChar = "";
            for (var i = start; i < text.length; i++) {
                var c = text[i];
                if (!inQuote) {
                    if (c === '"' || c === "'") {
                        inQuote = true;
                        quoteChar = c;
                    } else if (c === openChar) {
                        depth++;
                    } else if (c === closeChar) {
                        depth--;
                        if (depth === 0) return text.substring(start + 1, i);
                    }
                } else {
                    if (c === quoteChar) {
                        var backslashes = 0;
                        var j = i - 1;
                        while (j >= 0 && text[j] === '\\') {
                            backslashes++;
                            j--;
                        }
                        if (backslashes % 2 === 0) inQuote = false;
                    }
                }
            }
            return "";
        };

        var mainTitle = this.removeAccents(getVal(html, "title")) || "Anime";
        var description = getVal(html, "synopsis");
        
        if (!description || description.length < 50) {
            var pMatch = html.match(/<div[^>]*class="entry[^"]*"[^>]*><p>([\s\S]*?)<\/p>/);
            if (pMatch) description = pMatch[1].replace(/<[^>]*>/g, "").trim();
        }

        var episodes = [];
        var seenEps = {};
        var addEps = function(targetHtml, targetSlug, prefix) {
            var content = extractBlock(targetHtml, "episodes", "[", "]");
            if (!content) content = targetHtml;
            var eRegex = /number\s*:\s*(\d+)/g;
            var eMatch;
            var cleanPrefix = prefix.replace(/[\[\]]/g, "");
            while ((eMatch = eRegex.exec(content)) !== null) {
                var num = eMatch[1];
                var key = targetSlug + "_" + num;
                if (!seenEps[key]) {
                    seenEps[key] = true;
                    episodes.push({
                        name: "[" + cleanPrefix + "] Ep " + num,
                        url: "/media/" + targetSlug + "/" + num
                    });
                }
            }
        };

        addEps(html, currentSlug, mainTitle);

        var relTypes = { 1: "Precuela", 2: "Secuela", 3: "Historia Principal", 4: "Relacionado", 5: "Alternativo", 6: "Spin-off", 7: "Adaptación", 8: "Resumen", 9: "Otro", 10: "Especial/Peli", 11: "Historia Paralela" };
        var relInfo = "";
        
        var relationsContent = extractBlock(html, "relations", "[", "]");
        if (relationsContent) {
            var rEntryRegex = /type\s*:\s*(\d+)\s*,\s*destination\s*:\s*\{([\s\S]*?)\}/g;
            var rMatch;
            while ((rMatch = rEntryRegex.exec(relationsContent)) !== null) {
                var tNum = rMatch[1];
                var chunk = rMatch[2];
                var rSlug = getVal(chunk, "slug");
                var rTitle = getVal(chunk, "title");
                
                if (rSlug && rSlug !== currentSlug) {
                    var label = relTypes[tNum] || "Relacionado";
                    relInfo += "- [" + label + "] " + this.removeAccents(rTitle.replace(/[\[\]]/g, "")) + "\n";
                    
                    if ((tNum == 1 || tNum == 2 || tNum == 3) && episodes.length < 500) {
                        try {
                            var rRes = await this.request("/media/" + rSlug);
                            addEps(rRes.body, rSlug, rTitle);
                        } catch(e){}
                    }
                }
            }
        }

        if (relInfo) {
            description = "RELACIONADOS:\n" + relInfo + "\n---\n" + description;
        }

        // Eliminación TOTAL de tildes y corrección de Mojibake
        description = this.removeAccents(description);

        var statusMatch = html.match(/status\s*:\s*(\d+)/);
        var status = statusMatch ? (parseInt(statusMatch[1]) === 1 ? 1 : 0) : 5;

        var genres = [];
        var genresContent = extractBlock(html, "genres", "[", "]");
        if (genresContent) {
            var gRegex = /name\s*:\s*"(.*?)"/g;
            var gMatch;
            while((gMatch = gRegex.exec(genresContent)) !== null) {
                var gName = this.removeAccents(gMatch[1]);
                if(genres.indexOf(gName) === -1) genres.push(gName);
            }
        }
        if (genres.length === 0) genres = ["Anime"];

        return {
            description: description,
            status: status,
            genre: genres,
            episodes: episodes.reverse()
        };
    }

    async getVideoList(url) {
        var res = await this.request(url);
        var html = res.body;
        var videos = [];
        var subSection = html.match(/SUB\s*:\s*\[(.*?)\]/);
        var dubSection = html.match(/DUB\s*:\s*\[(.*?)\]/);

        var parseServers = async function(sectionText, languagePrefix) {
            var localVideos = [];
            var sRegex = /\{\s*server\s*:\s*"?(.*?)"?\s*,\s*url\s*:\s*"?(.*?)"?\s*\}/g;
            var sMatch;
            while ((sMatch = sRegex.exec(sectionText)) !== null) {
                var server = sMatch[1];
                var videoUrl = sMatch[2].replace(/\\/g, "");
                if (videoUrl.indexOf("http") === 0) {
                    var qualityLabel = languagePrefix + " " + server;
                    if (videoUrl.indexOf("zilla-networks.com/play/") !== -1) {
                        var m3u8Url = videoUrl.replace("play/", "m3u8/");
                        localVideos.push({ url: m3u8Url, quality: qualityLabel + " (HLS)", originalUrl: m3u8Url });
                    } else if (videoUrl.indexOf("mp4upload.com") !== -1) {
                        try {
                            var mp4Videos = await mp4UploadExtractor(videoUrl);
                            for (var j = 0; j < mp4Videos.length; j++) {
                                var v = mp4Videos[j];
                                v.quality = languagePrefix + " " + v.quality;
                                localVideos.push(v);
                            }
                        } catch (e) {}
                    } else if (videoUrl.indexOf("streamwish") !== -1 || videoUrl.indexOf("strwish") !== -1) {
                        try {
                            var swVideos = await streamWishExtractor(videoUrl, languagePrefix + " StreamWish:");
                            for (var k = 0; k < swVideos.length; k++) localVideos.push(swVideos[k]);
                        } catch (e) {}
                    } else {
                        localVideos.push({ url: videoUrl, quality: qualityLabel, originalUrl: videoUrl });
                    }
                }
            }
            return localVideos;
        };

        if (subSection) {
            var subVideos = await parseServers(subSection[1], "[SUB]");
            for (var i = 0; i < subVideos.length; i++) videos.push(subVideos[i]);
        }
        if (dubSection) {
            var dubVideos = await parseServers(dubSection[1], "[DUB]");
            for (var i = 0; i < dubVideos.length; i++) videos.push(dubVideos[i]);
        }
        if (videos.length === 0) {
            var fallbackVideos = await parseServers(html, "");
            for (var i = 0; i < fallbackVideos.length; i++) videos.push(fallbackVideos[i]);
        }
        return videos;
    }

    getSourcePreferences() { return []; }
}
