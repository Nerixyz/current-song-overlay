import { SpotifyTrackResponse } from "./http.types.ts";
import { USER_AGENT, APP_VERSION } from "./constants.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import { jsonFetch, logFetchError } from "../utilities.ts";

export class SpotifyHttpApi {
  protected deviceId: string = new Array(20)
    .fill(0)
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

  protected get baseHeaders() {
    return {
      authorization: `Bearer ${this.accessToken}`,
    };
  }

  protected connectionId?: string;
  accessToken?: string;
  dealer = "gew-dealer.spotify.com:443";
  spClient = "gew-spclient.spotify.com:443";

  constructor(protected cookies: string) {}

  trackInfos(tracks: string[]): Promise<SpotifyTrackResponse> {
    return jsonFetch(
      `https://api.spotify.com/v1/tracks?market=from_token&ids=${tracks.join()}`,
      {
        headers: this.baseHeaders,
      }
    ).catch(logFetchError(log.error, "fetch track infos"));
  }

  async updateDealerAndSpClient() {
    const res = await jsonFetch(
      "https://apresolve.spotify.com/?type=dealer&type=spclient"
    ).catch(logFetchError(log.error, "get dealer"));
    this.dealer = res.dealer?.[0] || this.dealer;
    this.spClient = res.spclient?.[0] || this.spClient;
  }

  updateConnectionId(conn: string) {
    if (this.connectionId === conn) return;
    this.connectionId = conn;
  }

  async updateAccessToken() {
    this.accessToken = await this.getAccessToken();
  }

  protected async getAccessToken(): Promise<string> {
    log.debug("Getting access token");
    const { accessToken } = await jsonFetch(
      "https://open.spotify.com/get_access_token?reason=transport&productType=web_player",
      {
        headers: {
          "User-Agent": USER_AGENT,
          "spotify-app-version": APP_VERSION,
          "app-platform": "WebPlayer",
          Cookie: this.cookies,
          Referer: "https://open.spotify.com/",
        },
        method: "GET",
      }
    ).catch(logFetchError(log.error, "get access token"));
    log.debug("Got access token");
    return accessToken;
  }

  putConnectState() {
    return jsonFetch(
      `https://${this.spClient}/connect-state/v1/devices/hobs_${this.deviceId}`,
      {
        headers: {
          ...this.baseHeaders,
          "x-spotify-connection-id": this.connectionId ?? "",
        },
        method: "PUT",
        body: JSON.stringify({
          member_type: "CONNECT_STATE",
          device: {
            device_info: {
              capabilities: {
                can_be_player: false,
                hidden: true,
              },
            },
          },
        }),
      }
    ).catch(logFetchError(log.error, "put client state"));
  }

}
