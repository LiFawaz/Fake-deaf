# Fake-deaf

A Revenge plugin that makes your Discord voice status appear muted and deafened while your actual microphone and audio can remain live.

## Install

1. Open the [Fake-deaf install page](https://LiFawaz.github.io/Fake-deaf/fake-deafen/).
2. Copy the plugin URL shown there.
3. In Revenge, open **Plugins** and choose **Install from URL**.
4. Paste the URL and install the plugin.
5. Open the plugin settings and turn on **Fake Deafen Active**. You can also use `/fake` to toggle it.

Direct manifest URL:  
`https://raw.githubusercontent.com/LiFawaz/Fake-deaf/main/dist/fake-deafen/manifest.json`

## Important: enable it before joining voice

Discord only sends your voice-state update when you connect to a voice channel. If you enable Fake-deaf while you are **not in a voice channel**, there is no active voice state to update yet. Join a voice channel after enabling it; the plugin will apply the fake muted/deafened flags when the voice connection is established.

If you enable it while already connected, the plugin tries to push an updated voice state immediately. If the status does not change, toggle the setting off and on once, or leave and rejoin the voice channel.

## Settings

- **Fake Deafen Active** — turns the feature on or off.
- **Broadcast as Muted** — makes your outgoing voice state report muted.
- **Broadcast as Deafened** — makes your outgoing voice state report deafened.

The plugin changes the voice-state data sent by the client. It does not physically mute your microphone or stop your audio playback. Behavior can vary across Discord/Revenge builds, and this is not a server-side mute or deafen.

## Command

Use `/fake` in Discord to toggle Fake-deaf.

## Credits

Made by Li Fawaz.
