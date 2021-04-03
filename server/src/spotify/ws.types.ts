export interface SpotifyWsMessage {
  type: "message" | "pong" | string;
  headers?: {
    "content-type"?: "application/json" | string;
    "Spotify-Connection-Id": string;
  };
  payloads?: Array<SpotifyWsPayload>;
  method?: "PUT" | string;
  uri?: string;
}

export interface SpotifyWsPayload {
  cluster: SpotifyWsCluster;
  update_reason: "DEVICE_STATE_CHANGED" | string;
  devices_that_changed: string[];
}

export interface SpotifyWsCluster {
  timestamp: string;
  active_device_id: string;
  player_state: SpotifyWsPlayerState;
  devices: Record<string, SpotifyWsDevice>;
  transfer_data_timestamp: string;
}

export interface SpotifyWsPlayerState {
  timestamp: string;
  context_uri: string;
  context_url: string;
  context_restrictions: {};
  play_origin: SpotifyWsPlayOrigin;
  index: {
    page: number;
    track: number;
  };
  track: SpotifyWsTrack;
  playback_id: string;
  playback_speed: number;
  position_as_of_timestamp: string;
  duration: string;
  is_playing: boolean;
  is_paused: boolean;
  is_system_initiated: boolean;
  options: {
    shuffling_context: boolean;
    repeating_context: boolean;
    repeating_track: boolean;
  };
  restrictions: {
    disallow_pausing_reasons: string[];
  };
  suppressions: {};
  prev_tracks: Array<SpotifyWsSimpleTrack>;
  next_tracks: Array<SpotifyWsSimpleTrack>;
  page_metadata: {};
  session_id: string;
  queue_revision: string;
}

export interface SpotifyWsPlayOrigin {
  feature_identifier: string;
  feature_version: string;
  view_uri: string;
  referrer_identifier: string;
}

export interface SpotifyWsTrack extends SpotifyWsSimpleTrack {
  metadata: SpotifyWsTrackMetadata;
}

export interface SpotifyWsTrackMetadata extends SpotifyWsSimpleMetadata {
  context_uri: string;
  album_title: string;
  "actions.skipping_prev_past_track": string;
  album_uri: string;
  image_small_url: string;
  image_url: string;
  entity_uri: string;
  "actions.skipping_next_past_track": string;
  image_xlarge_url: string;
  artist_uri: string;
  iteration: string;
  track_player: string;
  image_large_url: string;
  title?: string;
  artist?: string;
}

export interface SpotifyWsSimpleTrack {
  uri: string;
  uid: string;
  metadata: SpotifyWsSimpleMetadata;
  provider: string;
}

export interface SpotifyWsSimpleMetadata {
  track_player: string;
  iteration: string;
  entity_uri: string;
  context_uri: string;
}

export interface SpotifyWsDevice {
  can_play: boolean;
  volume: number;
  name: string;
  capabilities: SpotifyWsDeviceCapabilities;
  metadata: Array<{ type: "client_id" | string; metadata: string }>;
  device_software_version: string;
  device_type: string;
  spirc_version: string;
  device_id: string;
  client_id: string;
  brand: string;
  model: string;
  metadata_map?: { device_address_mask: string; tier1_port: string };
}

export interface SpotifyWsDeviceCapabilities {
  can_be_player: boolean;
  gaia_eq_connect_id: boolean;
  supports_logout: boolean;
  is_observable: boolean;
  volume_steps: number;
  supported_types: Array<"audio/track" | "audio/episode" | "video/episode">;
  command_acks: boolean;
  is_controllable: boolean;
  supports_external_episodes: boolean;
  supports_command_request: boolean;
}
