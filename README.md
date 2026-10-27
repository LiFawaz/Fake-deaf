# Fake-deaf

A Revenge plugin that lets you **broadcast yourself as muted and/or deafened when joining a voice channel**, while keeping your actual microphone and audio active locally.

## Install

Add this URL in Revenge → Plugins → Install from URL:

```
https://LiFawaz.github.io/Fake-deaf/fake-deafen/
```

Plugin page: https://LiFawaz.github.io/Fake-deaf/fake-deafen/

## Use

1. Install and enable **FakeDeafen** in Revenge.
2. Open its settings and turn on **Fake Deafen Active**.
3. Choose **Broadcast as Muted** and/or **Broadcast as Deafened**.
4. You can enable it **before joining a voice channel**. When Discord sends the next voice-state update as you join, the plugin adds the selected flags to that outgoing update.
5. You can also toggle it with `/fake`.

The fake flags affect what is sent in the voice-state update; they do not physically mute your microphone or stop your audio locally. Discord/server behavior can change, so verify the result in your client.

## Notes

- If you are already in a voice channel when enabling it, the plugin attempts to send an updated voice state immediately.
- If the flags do not update, toggle Fake Deafen off and on or rejoin the channel.
- This is a client-side behavior and is not a server-side permission bypass.
