import 'dotenv/config'
import { JSDOM } from 'jsdom'

const GENIUS_HOST = "api.genius.com"
const CRAWL_HOST = "genius.com"

const SONGS_PATH = "/artists/1177/songs"
const LYRICS_PATH_PATTERN = /taylor-swift.*lyrics/i

const VISITED = {}

const ALBUMS = [
    "Taylor Swift",
    "Fearless",
    "Fearless (Platinum Edition)",
    "Speak Now",
    "Speak Now (Deluxe)",
    "Red",
    "Red (Deluxe Version)",
    "1989",
    "1989 (Deluxe)",
    "Lover",
    "reputation",
    "folklore",
    "evermore",
    "Midnights",
    "Midnights (3am Edition)",
    "Midnights (The Til Dawn Edition)"
]

class SongDTO {
    constructor(title, album, releaseDate, featuredArtists, writers, lyricsUrl) {
        this.title = title
        this.album = album
        this.release_date = releaseDate
        this.featured_artists = featuredArtists
        this.writers = writers
        this.lyricsUrl = lyricsUrl
    }
}

class Song {
    constructor(title, album, albumVariant, releaseDate, featuredArtists, writers, lyrics) {
        this.title = title
        this.album = album
        this.album_variant = albumVariant
        this.release_date = releaseDate
        this.featured_artists = featuredArtists
        this.writers = writers
        this.lyrics = lyrics
    }
}

async function main() {
    let page = 1

    while (true) {
        const songPaths = await getSongPaths(page++, 20)
    
        if (!songPaths) break

        const songDTOs = await Promise.all(songPaths.map(l => getSong(l)))
        const songs = await Promise.all(songDTOs.filter(s => s).map(s => buildSong(s)))

        songs.filter(s => s).map(s => indexSong(s))

        // rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
}

async function getSongPaths(page, perPage) {
    let url = `https://${GENIUS_HOST}${SONGS_PATH}` + "?" + new URLSearchParams({ page: page, per_page: perPage }).toString()

    console.log(`GET ${url}`)

    const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` } })
    const responseJson = await response.json()

    if (responseJson?.meta?.status == '200' && responseJson.response.songs.length > 0) return responseJson.response.songs.map(song => song.api_path)
}

async function getSong(path) {
    const url = `https://${GENIUS_HOST}${path}`

    if (url in VISITED) {
        return
    }
    VISITED[url] = 1

    console.log(`GET ${url}`)

    const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` } })
    const responseJson = await response.json()

    const song = responseJson.response.song

    if (song && ALBUMS.includes(song.album?.name) && isValidURL(song.url)) {
        return new SongDTO(
            song.title,
            song.album.name,
            song.release_date,
            song.featured_artist?.map(a => a.name),
            song.writer_artists?.map(a => a.name),
            song.url)
    }
}

async function buildSong(songDTO) {
    const lyrics = await getLyrics(songDTO.lyricsUrl)

    if (!lyrics) return

    const parsedAlbumName = songDTO.album.split("(").map(s => s.trim())

    return new Song(
        songDTO.title,
        parsedAlbumName[0],
        parsedAlbumName?.[1] ? parsedAlbumName[1].replace(")", "") : "",
        songDTO.release_date,
        songDTO.featured_artists,
        songDTO.writers,
        lyrics)
}

async function getLyrics(url) {
    if (url in VISITED) return
    VISITED[url] = 1

    console.log(`GET ${url}`)

    const response = await fetch(url)
    const responseText = await response.text()

    return parseLyricsHtml(responseText)
}

async function indexSong(song) {
    console.log(`Indexing: ${song.title}`)

    const resp = await fetch(
        `https://${process.env.ELASTIC_HOST}/taylor-swift-songs/_doc`,
        {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                'Authorization': 'Basic ' + btoa('elastic:changeme')
            },
            body: JSON.stringify(song)
        })

    const respJson = await resp.json()

    if (respJson.status < 200 || respJson.status >= 300) {
        console.log("Indexing failure:: song: ${song}, response: ${respJson}")
    }
    
}

async function parseLyricsHtml(lyricsHtml) {
    const newline_regex = /<br\s*[\/]?>/gi
    const structure_regex = /\[[Verse|Pre\-Chorus|Chorus|Bridge].*\]/gi

    const cleanedResponse = lyricsHtml.replaceAll(newline_regex, "\n").replaceAll(structure_regex, "")

    const dom = new JSDOM(cleanedResponse);

    const lyrics = []
    dom.window.document.querySelectorAll('[data-lyrics-container=true]').forEach(d => lyrics.push(d.textContent))

    return lyrics.join("\n")
}

function isValidURL(url) {
    if (!url) return false
    try {
        let parsedUrl = new URL(url)
        return !(url in VISITED) && parsedUrl.host == CRAWL_HOST && parsedUrl.pathname.match(LYRICS_PATH_PATTERN) != null
    } catch (e) {
        return false
    }
}

await main()