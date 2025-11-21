/* ============================================================
   script.js — Pesquisa + Navegação + Charts
   ============================================================ */

let CURRENT_TYPE = "albums";

/* ============================
   MENU: Navegação rápida
   ============================ */

function openSearchAlbums() {
    CURRENT_TYPE = "albums";
    document.getElementById("query").value = "";
    document.getElementById("results").innerHTML = "";
}

function openSearchPlaylists() {
    CURRENT_TYPE = "playlists";
    document.getElementById("query").value = "";
    document.getElementById("results").innerHTML = "";
}

function openTopGlobal() {
    location.href = "/charts/global";
}


/* ============================================================
   SISTEMA DE PESQUISA
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const q = document.getElementById("query");

    if (q) {
        q.addEventListener("keypress", (e) => {
            if (e.key === "Enter") search();
        });
    }
});

function searchType(type) {
    CURRENT_TYPE = type;
    search();
}

function search() {
    const q = document.getElementById("query").value.trim();
    const container = document.getElementById("results");

    if (!q) {
        container.innerHTML = "<p>Digite algo para pesquisar…</p>";
        return;
    }

    const url =
        CURRENT_TYPE === "albums"
            ? `/search/albums?query=${q}`
            : `/search/playlists?query=${q}`;

    fetch(url)
        .then((r) => r.json())
        .then((data) => {
            const items = data.data?.results || [];
            renderResults(items);
        })
        .catch(() => {
            container.innerHTML = "<p>Erro ao carregar pesquisa.</p>";
        });
}

/* ============================================================
   DESENHAR RESULTADOS DA PESQUISA
   ============================================================ */

function renderResults(items) {
    const container = document.getElementById("results");
    container.innerHTML = "";

    if (!items.length) {
        container.innerHTML = "<p>Nenhum resultado encontrado.</p>";
        return;
    }

    items.forEach((item) => {
        const id = item.id;
        const title = item.name;

        const img =
            item.image?.find((i) => i.quality === "150x150")?.url ||
            item.image?.[0]?.url ||
            "/static/default.png";

        const url =
            CURRENT_TYPE === "albums"
                ? `/album/${id}`
                : `/playlist/${id}`;

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <img src="${img}" class="cover">
            <h3>${title}</h3>
            <button onclick="location.href='${url}'">Abrir</button>
        `;

        container.appendChild(card);
    });
}

/* ============================================================
   FUNÇÕES GLOBAIS (para HTML chamar diretamente)
   ============================================================ */

window.openSearchAlbums = openSearchAlbums;
window.openSearchPlaylists = openSearchPlaylists;
window.openTopGlobal = openTopGlobal;
window.searchType = searchType;
window.search = search;
