import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { useProxy } from "@vendetta/storage";
import { refreshFakeVoiceState, setFakeDeafenEnabled } from "./index";

const { FormSwitchRow, FormText } = Forms;

export default function Settings() {
    useProxy(storage);
    storage.enabled ??= false;
    storage.fakeMute ??= true;
    storage.fakeDeafen ??= true;

    return (
        <>
            <FormSwitchRow
                label="Fake Deafen Active"
                subLabel="Enable or disable fake mute/deafen. Your real microphone and audio stay live."
                value={storage.enabled}
                onValueChange={(v: boolean) => {
                    setFakeDeafenEnabled(v);
                    showToast(v ? "Fake Deafen enabled" : "Fake Deafen disabled");
                }}
            />
            <FormSwitchRow
                label="Broadcast as Muted"
                value={storage.fakeMute}
                onValueChange={(v: boolean) => { storage.fakeMute = v; refreshFakeVoiceState(); }}
            />
            <FormSwitchRow
                label="Broadcast as Deafened"
                value={storage.fakeDeafen}
                onValueChange={(v: boolean) => { storage.fakeDeafen = v; refreshFakeVoiceState(); }}
            />
            <FormText>
                You can toggle this here or use /fake in Discord. Changes are pushed immediately when you are connected to a voice channel.
            </FormText>
        </>
    );
}
