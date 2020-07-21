# Current Song

This application allows users (probably streamers) to show the current playing song,
 without worrying too much about the setup. Ideally you'll install the extension, start 
 a service, and you are good to go. Now with Spotify you can't do this, you'll have to manually go in your browser and get the cookie.
 Maybe I'll change that.
 
# Currently supported:
 
 * Firefox, Chrome, new Safari (and other Browsers implementing the [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs))
 * Spotify (requires a Cookie to work, any device is supported)
 * VLC (`CTRL + P` > [bottom left] `Show Settings: All` > `Interface` > `Main Interfaces` > `RC`> `Command input: "localhost:234"`)

# How to set it up

_soon_

# TODO

- [ ] Better Config (json?)
- [ ] Top Level CSS Config
- [ ] Single Bundle Pipeline
- [ ] Serve Extension on `/server/` instead of `/extension/`
- [ ] Publish Extension to `addons.mozilla.com`
- [ ] Publish Extension to Chrome thing
- [ ] Setup GitHub Actions to bundle to ZIP
- [ ] Add Script (bat, ps1, sh) Files
- [ ] Import cookies from Spotify using extension (copy or auto? security?)
