# -*- coding: utf-8 -*-
from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

SAAVN_API = "https://saavn.sumit.co/api"

# ------------------------------------------------------------
# PÁGINA PRINCIPAL
# ------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# ------------------------------------------------------------
# PESQUISA ÁLBUNS
# ------------------------------------------------------------
@app.route("/search/albums")
def search_albums():
    q = request.args.get("query", "")
    return jsonify(
        requests.get(f"{SAAVN_API}/search/albums?query={q}&page=0&limit=20").json()
    )


# ------------------------------------------------------------
# PESQUISA PLAYLISTS
# ------------------------------------------------------------
@app.route("/search/playlists")
def search_playlists():
    q = request.args.get("query", "")
    return jsonify(
        requests.get(f"{SAAVN_API}/search/playlists?query={q}&page=0&limit=20").json()
    )


# ------------------------------------------------------------
# PÁGINA ÁLBUM
# ------------------------------------------------------------
@app.route("/album/<album_id>")
def album_page(album_id):
    return render_template("album.html", album_id=album_id)


@app.route("/api/album/<album_id>")
def api_album(album_id):
    return jsonify(
        requests.get(f"{SAAVN_API}/albums?id={album_id}").json()
    )


# ------------------------------------------------------------
# PÁGINA PLAYLIST
# ------------------------------------------------------------
@app.route("/playlist/<playlist_id>")
def playlist_page(playlist_id):
    return render_template("playlist.html", playlist_id=playlist_id)


@app.route("/api/playlist/<playlist_id>")
def api_playlist(playlist_id):
    return jsonify(
        requests.get(f"{SAAVN_API}/playlists?id={playlist_id}").json()
    )


# ------------------------------------------------------------
# TOP GLOBAL — Apple/iTunes RSS
# ------------------------------------------------------------
ITUNES_TOP_GLOBAL = "https://itunes.apple.com/us/rss/topsongs/limit=50/json"

@app.route("/charts/global")
def charts_global_page():
    return render_template("charts_global.html")


@app.route("/api/charts/global")
def charts_global_api():
    try:
        data = requests.get(ITUNES_TOP_GLOBAL, timeout=10).json()
        entries = data["feed"]["entry"]

        songs = []
        for item in entries:
            songs.append({
                "track": item["im:name"]["label"],
                "artist": item["im:artist"]["label"],
                "cover": item["im:image"][-1]["label"],  # maior resolucao
            })

        return jsonify({"success": True, "songs": songs})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ------------------------------------------------------------
# CONVERTER MÚSICA DO TOP → MP3 DO SAAVN
# ------------------------------------------------------------
@app.route("/api/to_saavn")
def convert_to_saavn():
    track = request.args.get("track", "")
    artist = request.args.get("artist", "")

    query = f"{track} {artist}"

    r = requests.get(f"{SAAVN_API}/search/songs?query={query}&page=0&limit=1").json()

    results = r.get("data", {}).get("results", [])
    if not results:
        return jsonify({"success": False})

    song = results[0]

    # escolher MP3 com melhor qualidade
    dls = song.get("downloadUrl") or []
    best = dls[-1]["url"] if dls else ""

    cover = song.get("image", [{}])[-1].get("url", "")

    return jsonify({
        "success": True,
        "title": song["name"],
        "artist": song["primaryArtists"],
        "mp3": best,
        "cover": cover
    })


# ------------------------------------------------------------
# RUN
# ------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
