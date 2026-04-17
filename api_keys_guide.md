# How to get API Keys for OmniMap

Since OmniMap loads 6 different mapping APIs, you'll need API credentials for most of them. Here is a quick guide on how to get them.

Once you have a key, paste it into the `config.js` file at the root of the project.

### 1. Google Maps
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Maps JavaScript API**.
4. Go to API & Services > Credentials and "Create Credentials" (API Key).
5. Paste it into `config.keys.googleMaps`.

### 2. Mapbox
1. Create a free account at [Mapbox.com](https://www.mapbox.com/).
2. Go to your Account Dashboard.
3. You will see a "Default public token" sitting right there!
4. Paste it into `config.keys.mapbox`.

### 3. Bing Maps
1. Create an account at the [Bing Maps Dev Center](https://www.bingmapsportal.com/).
2. Click on "My Account" > "My Keys".
3. Click "Create a new key".
4. Copy the Key.
5. Paste it into `config.keys.bingMaps`.

### 4. Yandex Maps
1. Go to the [Yandex Developer Portal for Maps JS API](https://developer.tech.yandex.com/services/3).
2. Get an API key for JS API & HTTP Geocoder.
3. Paste it into `config.keys.yandexMaps`.

### 5. Apple Maps (MapKit JS)
*This is the most complex one as it requires you to be enrolled in the Apple Developer Program.*
1. Go to your [Apple Developer Account](https://developer.apple.com/).
2. Create a **Maps ID**.
3. Create a **Private Key** for MapKit JS.
4. You'll need to generate a JWT (JSON Web Token) with your Team ID, Key ID, and Private Key. You can use online tools or programmatic scripts to mint this token. It usually lasts a set period or can be made non-expiring.
5. Paste the final generated JWT string into `config.keys.appleJwtToken`.

### 6. OpenStreetMap
You're in luck! OpenStreetMap combined with Leaflet requires zero API keys to use the default tiles. However, heavy usage is frowned upon, so if you deploy this to production, you'll want to use your own tile server or a paid provider.
