# Taylor Swift Song Scraper

Finds and indexes songs from Taylor Swift's 10 studio albums including Taylor Swift, Fearless, Fearless (Platinum Edition), Speak Now, Speak Now (Deluxe), Red, Red (Deluxe Version), 1989, 1989 (Deluxe), Lover, reputation, folklore, evermore, Midnights, Midnights (3am Edition), and Midnights (The Til Dawn Edition).

## Requirements

* Docker
* NodeJS

## Running
 
2. Create `.env` file containing `ELASTIC_HOST` and `GENIUS_ACCESS_TOKEN`:

```
ELASTIC_HOST="localhost:9200"
GENIUS_ACCESS_TOKEN="myAccessToken" 
```

2. Run `npm install`
3. Run with `NODE_EXTRA_CA_CERTS="<path_to_elastic_ca.crt>" node scraper.js`