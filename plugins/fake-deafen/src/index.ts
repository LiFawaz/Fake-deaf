import { logger } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import { registerCommand } from "@vendetta/commands";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

let original_send: any = null;
let patched_socket: any = null;
let unregister_command: (() => void) | null = null;
let retryTimers: any[] = [];
let toggleGeneration = 0;

function probe(label: string, candidates: string[][]): any {
    for (const props of candidates) {
        const mod = findByProps(...props);
        if (mod) {
            logger.log(`[FakeDeafen] ${label}: matched on [${props.join(", ")}]`);
            return mod;
        }
    }
    logger.log(`[FakeDeafen] ${label}: no candidate matched — tried ${JSON.stringify(candidates)}`);
    return null;
}

function get_gateway() {
    return probe("gateway module", [
        ["getSocket"],
        ["getSocketProxy"],
        ["gatewaySocket"],
        ["socket", "send"],
    ]);
}

function get_voice_channel_store() {
    return probe("selected voice channel store", [
        ["getVoiceChannelId"],
        ["getCurrentVoiceChannelId"],
        ["getSelectedVoiceChannelId"],
    ]);
}

function get_channel_store() {
    return probe("channel store", [
        ["getChannel", "getDMFromUserId"],
        ["getChannel"],
    ]);
}

function get_media_engine_store() {
    return probe("media engine store", [
        ["isSelfMute", "isSelfDeaf"],
        ["isMute", "isDeaf"],
        ["isLocalMute", "isLocalDeaf"],
    ]);
}

function patch_socket_send() {
    const socket = get_gateway()?.getSocket?.();
    if (!socket || typeof socket.send !== "function") {
        logger.log("[FakeDeafen] socket unavailable or wrong shape — patch skipped");
        return;
    }
    if (patched_socket === socket && original_send) return;
    unpatch_socket_send();
    patched_socket = socket;
    original_send = socket.send;
    const sendOriginal = original_send;
    const wrappedSend = function (this: any, op: number, data: any, ...args: any[]) {
        if (op === 4 && storage.enabled && data && typeof data === "object") {
            const media = get_media_engine_store();
            const realMute = !!(media?.isSelfMute?.() ?? media?.isMute?.() ?? media?.isLocalMute?.() ?? false);
            const realDeaf = !!(media?.isSelfDeaf?.() ?? media?.isDeaf?.() ?? media?.isLocalDeaf?.() ?? false);
            // Always write both flags while enabled. Leaving a stale true value
            // untouched when an option is switched off caused rapid-toggle glitches.
            data.self_mute = !!storage.fakeMute || realMute;
            data.self_deaf = !!storage.fakeDeafen || realDeaf;
        }
        return sendOriginal.apply(this, [op, data, ...args]);
    };
    socket.send = wrappedSend;
    logger.log("[FakeDeafen] socket.send patched");
}

function unpatch_socket_send() {
    const socket = patched_socket;
    if (socket && original_send && socket.send !== original_send) {
        // Restore only our own wrapper; don't overwrite a patch installed later.
        const current = socket.send;
        if (current && current !== original_send) {
            socket.send = original_send;
        }
    }
    patched_socket = null;
    original_send = null;
}

function clear_retry_timers() {
    for (const timer of retryTimers) clearTimeout(timer);
    retryTimers = [];
}

function schedule_voice_state_refresh() {
    const generation = ++toggleGeneration;
    clear_retry_timers();
    // Short, finite retries handle Discord overwriting a voice-state update
    // during quick toggles. No continuous 10ms polling or gateway spam.
    for (const delay of [10, 30, 80, 160]) {
        retryTimers.push(setTimeout(() => {
            if (generation !== toggleGeneration || !storage.enabled) return;
            force_voice_state_push();
        }, delay));
    }
}

function force_voice_state_push() {
    const wsModule = get_gateway();
    const VoiceChannelStore = get_voice_channel_store();
    const ChannelStore = get_channel_store();
    const MediaEngineStore = get_media_engine_store();

    if (!wsModule || !VoiceChannelStore) {
        logger.log("[FakeDeafen] cannot force push — missing gateway or voice channel store");
        return;
    }

    const socket = wsModule.getSocket?.();
    const channelId =
        VoiceChannelStore.getVoiceChannelId?.() ??
        VoiceChannelStore.getCurrentVoiceChannelId?.() ??
        VoiceChannelStore.getSelectedVoiceChannelId?.();

    if (!socket || !channelId) {
        logger.log("[FakeDeafen] not in a voice channel, or socket missing — /fake needs an active call");
        return;
    }

    const channel = ChannelStore?.getChannel?.(channelId);
    const realMute = MediaEngineStore?.isSelfMute?.() ?? MediaEngineStore?.isMute?.() ?? MediaEngineStore?.isLocalMute?.() ?? false;
    const realDeaf = MediaEngineStore?.isSelfDeaf?.() ?? MediaEngineStore?.isDeaf?.() ?? MediaEngineStore?.isLocalDeaf?.() ?? false;

    socket.send(4, {
        guild_id: channel?.guild_id ?? null,
        channel_id: channelId,
        self_mute: storage.enabled ? (!!storage.fakeMute || realMute) : realMute,
        self_deaf: storage.enabled ? (!!storage.fakeDeafen || realDeaf) : realDeaf,
        self_video: false,
        flags: 0,
    });
    logger.log(`[FakeDeafen] pushed voice state, enabled=${storage.enabled}`);
}

export function setFakeDeafenEnabled(enabled: boolean): void {
    storage.enabled = enabled;
    // Refresh immediately, then retry briefly to win over any in-flight
    // Discord voice-state update. Retries always use the latest toggle state.
    force_voice_state_push();
    schedule_voice_state_refresh();
}

export function refreshFakeVoiceState(): void {
    force_voice_state_push();
    if (storage.enabled) schedule_voice_state_refresh();
}

function toggle() {
    setFakeDeafenEnabled(!storage.enabled);
    return storage.enabled
        ? "Fake Deafen ON — you appear deafened+muted, mic still live."
        : "Fake Deafen OFF — back to normal.";
}

export default {
    onLoad: () => {
        storage.enabled ??= false;
        storage.fakeMute ??= true;
        storage.fakeDeafen ??= true;
        logger.log("[FakeDeafen] loading — running module probes");
        patch_socket_send();

        unregister_command = registerCommand({
            name: "fake",
            displayName: "fake",
            description: "Instantly toggle fake deafen",
            displayDescription: "Instantly toggle fake deafen",
            options: [],
            applicationId: "-1",
            inputType: 1,
            type: 1,
            execute: (_args, ctx) => {
                const resultText = toggle();
                return {
                    send: false,
                    result: resultText,
                };
            },
        });
    },
    onUnload: () => {
        toggleGeneration++;
        clear_retry_timers();
        unpatch_socket_send();
        storage.enabled = false;
        unregister_command?.();
        unregister_command = null;
    },
    settings: Settings,
}
