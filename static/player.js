/* ============================================================
   player.js — Spotify Neon Premium Player (VERSÃO FINAL)
   Totalmente compatível com TOP GLOBAL + Saavn
   ============================================================ */

/* ELEMENTOS DOM */
const audio      = document.getElementById("player");
const eqCanvas   = document.getElementById("eqCanvas");
const ctx        = eqCanvas.getContext("2d");

const spCover    = document.getElementById("sp-cover");
const spTitle    = document.getElementById("sp-title");
const spArtist   = document.getElementById("sp-artist");

const spPlayBtn  = document.getElementById("sp-play");

const spBar      = document.getElementById("sp-bar");
const spCurrent  = document.getElementById("sp-current");
const spDuration = document.getElementById("sp-duration");

const volIcon    = document.getElementById("volIcon");
const spVolume   = document.getElementById("sp-volume");

/* ============================================================
   VARIÁVEIS DO PLAYER
   ============================================================ */

let queue = [];      // lista de músicas
let index = 0;       // índice atual
let isPlaying = false;

/* Equalizador */
let audioCtx    = null;
let analyser    = null;
let dataArray   = null;
let sourceNode  = null;
let eqStarted   = false;

/* ============================================================
   HELPERS
   ============================================================ */

function log(e) { console.log("[PLAYER]", e); }

function formatTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    let s = Math.floor(sec % 60);
    if (s < 10) s = "0" + s;
    return `${m}:${s}`;
}

function getBestUrl(song) {
    const arr = song.downloadUrl || song.download_url || [];
    if (!arr || !arr.length) return "";
    let last = arr[arr.length - 1];
    return last.url || last.link || "";
}

function getBestImage(arr, fallback) {
    if (!arr || !arr.length) return fallback;
    const last = arr[arr.length - 1];
    return last.url || fallback;
}

/* ============================================================
   CARREGAR ÁLBUM / PLAYLIST (API_URL definido no HTML)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    if (typeof API_URL === "undefined") return;

    fetch(API_URL)
        .then(r => r.json())
        .then(data => {
            const info = data.data;
            const cover =
                getBestImage(info.image, "/static/default.png");

            document.getElementById("page-cover").src = cover;
            document.getElementById("page-title").textContent = info.name;

            queue = (info.songs || []).map(s => ({
                title:  s.name,
                artist: s.primaryArtists,
                url:    getBestUrl(s),
                cover:  getBestImage(s.image, cover)
            }));

            renderTracks(queue);
        })
        .catch(err => log("Erro ao carregar página: " + err));
});

/* ============================================================
   DESENHAR LISTA DE FAIXAS
   ============================================================ */

function renderTracks(list) {
    const ul = document.getElementById("tracks");
    if (!ul) return;

    ul.innerHTML = "";

    list.forEach((song, i) => {
        const li = document.createElement("li");
        li.className = "track";

        li.innerHTML = `
            <img src="${song.cover}" class="track-cover">
            <div>
                <strong>${song.title}</strong><br>
                <span>${song.artist}</span>
            </div>
            <button style="margin-left:auto" onclick="playSingle(${i})">▶</button>
        `;

        ul.appendChild(li);
    });
}

/* ============================================================
   TOCAR MÚSICA + FALHAS + FALLBACK
   ============================================================ */

function safePlay() {
    audio.play().then(() => {
        isPlaying = true;
        spPlayBtn.textContent = "⏸";
        startEqualizer();
    }).catch(err => {
        console.warn("Erro ao tentar tocar:", err);
        nextSong();
    });
}

function loadSong(i) {
    if (!queue.length) return;

    index = i;
    const song = queue[index];

    if (!song.url) {
        log("Sem URL — saltar música");
        nextSong();
        return;
    }

    audio.src = song.url;

    spCover.src = song.cover;
    spTitle.textContent = song.title;
    spArtist.textContent = song.artist;

    safePlay();
}

function playSingle(i) {
    loadSong(i);
}

function playAll() {
    if (queue.length) loadSong(0);
}

/* GLOBAL → HTML onclick */
window.playAll = playAll;
window.playSingle = playSingle;

/* ============================================================
   CONTROLOS (Play/Pause/Next/Prev)
   ============================================================ */

function togglePlay() {
    if (!audio.src) return;

    if (isPlaying) {
        audio.pause();
        spPlayBtn.textContent = "▶";
    } else {
        safePlay();
    }
    isPlaying = !isPlaying;
}

function nextSong() {
    if (index < queue.length - 1) {
        loadSong(index + 1);
    } else {
        isPlaying = false;
        spPlayBtn.textContent = "▶";
    }
}

function prevSong() {
    if (index > 0) {
        loadSong(index - 1);
    }
}

window.togglePlay = togglePlay;
window.nextSong = nextSong;
window.prevSong = prevSong;

/* ============================================================
   PROGRESSO + BARRA + TEMPOS
   ============================================================ */

audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;

    spBar.value = (audio.currentTime / audio.duration) * 100;

    spCurrent.textContent = formatTime(audio.currentTime);
    spDuration.textContent = formatTime(audio.duration);
});

spBar.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (spBar.value / 100) * audio.duration;
});

audio.addEventListener("ended", () => {
    nextSong();
});

/* ============================================================
   VOLUME + ÍCONES
   ============================================================ */

audio.volume = spVolume.value;

spVolume.addEventListener("input", () => {
    const v = Number(spVolume.value);
    audio.volume = v;

    if (v === 0) volIcon.textContent = "🔇";
    else if (v < 0.5) volIcon.textContent = "🔈";
    else volIcon.textContent = "🔊";
});

volIcon.addEventListener("click", () => {
    if (audio.volume > 0) {
        audio._last = audio.volume;
        audio.volume = 0;
        spVolume.value = 0;
        volIcon.textContent = "🔇";
    } else {
        const v = audio._last || 1;
        audio.volume = v;
        spVolume.value = v;
        volIcon.textContent = v < 0.5 ? "🔈" : "🔊";
    }
});

/* ============================================================
   EQUALIZADOR — 1 AudioContext global
   ============================================================ */

function startEqualizer() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            sourceNode = audioCtx.createMediaElementSource(audio);
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
        }

        if (!eqStarted) {
            eqStarted = true;
            audioCtx.resume();
            drawEq();
        }
    } catch (e) {
        console.warn("EQ error:", e);
    }
}

function drawEq() {
    requestAnimationFrame(drawEq);

    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, eqCanvas.width, eqCanvas.height);

    const barWidth = (eqCanvas.width / dataArray.length) * 1.4;

    for (let i = 0; i < dataArray.length; i++) {
        const h = (dataArray[i] / 255) * eqCanvas.height;

        ctx.fillStyle = "#00e5ff";
        ctx.fillRect(
            i * barWidth,
            eqCanvas.height - h,
            barWidth - 2,
            h
        );
    }
}
