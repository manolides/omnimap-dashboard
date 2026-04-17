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

---

## How to Secure Your API Keys for GitHub Pages

Since your app is statically hosted, your `config.js` file is publicly readable. To prevent malicious users from stealing your API keys to run up billing charges, you must apply **HTTP Referrer Restrictions** to each key. 

This tells the map providers to immediately reject any API request that does not originate from your specific `manolides.github.io` domain.

### Google Maps
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/projectselector2/apis/credentials).
2. Select your project and click on your OmniMap API Key.
3. Under **Application restrictions**, select **Websites**.
4. In the Website restrictions box, click **Add Item** and enter `*manolides.github.io/*`.
5. Click Save. Note: It may take up to 5 minutes to propagate.

### Mapbox
1. Go to your [Mapbox Tokens Dashboard](https://account.mapbox.com/access-tokens/).
2. You cannot restrict the 'Default Public Token', so click **Create a token**.
3. Under **Token restrictions > URLs**, enter `https://manolides.github.io/`.
4. Click **Create token** and copy this *new* token.
5. Update your `app.js` or `config.js` with this restricted token and push to GitHub!

### Azure Maps
1. Go to your [Azure Portal](https://portal.azure.com/).
2. Search for **Azure Maps accounts** and click your resource.
3. On the left navigation bar, go to **Authentication** (or CORS).
4. For stricter security, go to **CORS (Cross-Origin Resource Sharing)**.
5. Under **Allowed origins**, add `https://manolides.github.io` and click **Save**. 
*(Azure uses a shared key approach, so CORS is your first line of defense for web applications).*

### Yandex Maps
1. In the [Yandex Developer Portal](https://developer.tech.yandex.com/), go to your API key.
2. Select **Restrictions** for your specific key.
3. Find the section for **HTTP Referrers** and add `https://manolides.github.io/*`.
4. Save the changes.

### Apple Maps (MapKit JS)
1. MapKit JS security works differently. The Apple Maps token generated via Python natively embeds an **Origin** verification if programmed directly, but the generic JWT we built doesn't implicitly restrict by domain natively unless we added an `origin` claim during generation. 
2. Because the script generates a 1-year JWT token instead of raw dynamic secret keys, the risk is lower than usage-based billing APIs if you use an isolated team identifier, but it's still best to rotate the `.p8` key if you suspect compromise. To completely lock this down, you can update the Python generator to include a custom `"origin": "https://manolides.github.io"` property in the JWT payload!
