import { readFile, writeFile, readdir } from "fs/promises";
import { extname } from "path";
import { createHash } from "crypto";

import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@swc/core";

const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];

/** @type import("rollup").InputPluginOption */
const plugins = [
    nodeResolve(),
    commonjs(),
    {
        name: "swc",
        async transform(code, id) {
            const ext = extname(id);
            if (!extensions.includes(ext)) return null;

            const ts = ext.includes("ts");
            const tsx = ts ? ext.endsWith("x") : undefined;
            const jsx = !ts ? ext.endsWith("x") : undefined;

            const result = await swc.transform(code, {
                filename: id,
                jsc: {
                    externalHelpers: true,
                    parser: {
                        syntax: ts ? "typescript" : "ecmascript",
                        tsx,
                        jsx,
                    },
                },
                env: {
                    targets: "defaults",
                    include: [
                        "transform-classes",
                        "transform-arrow-functions",
                    ],
                },
            });
            return result.code;
        },
    },
    esbuild({ minify: true }),
];


const sitePage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ffffff">
<title>Fake-deaf · Install in Revenge</title>
<style>
:root{color-scheme:light;--ink:#18181b;--muted:#71717a;--line:#e4e4e7;--accent:#5865f2}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff;color:var(--ink);font:16px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{width:min(100%,560px);text-align:center}
.icon{width:88px;height:88px;display:grid;place-items:center;margin:0 auto 24px;border:1px solid var(--line);border-radius:26px;background:#f8f8fb;font-size:42px}
h1{font-size:clamp(30px,7vw,44px);line-height:1.1;letter-spacing:-.04em;margin:0 0 14px}
p{color:var(--muted);margin:0 auto 22px;max-width:430px}
.url{padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:#fafafa;overflow-wrap:anywhere;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:left}
button{margin-top:12px;width:100%;padding:13px 18px;border:0;border-radius:12px;background:var(--accent);color:white;font:600 15px system-ui;cursor:pointer}
.note{font-size:13px;margin-top:20px}
</style>
</head>
<body>
<main>
<div class="icon" aria-hidden="true">🎧</div>
<h1>Put this into Revenge</h1>
<p>Fake-deaf is a Revenge plugin, not a web app. Copy the plugin URL below and paste it into Revenge’s Plugins page using Install from URL.</p>
<div class="url" id="plugin-url">https://LiFawaz.github.io/Fake-deaf/fake-deafen/</div>
<button id="copy" type="button">Copy plugin URL</button>
<p class="note" id="status">You can enable Fake-deaf before joining a voice channel. When Discord sends the voice-state update as you join, the plugin adds your selected muted/deafened flags. Your real mic and audio stay live locally. If it does not update, toggle it off and on or rejoin.</p>
<div class="url" style="margin-top:8px">https://LiFawaz.github.io/Fake-deaf/fake-deafen/manifest.json</div>
</main>
<script>
document.getElementById("copy").addEventListener("click",async()=>{const text=document.getElementById("plugin-url").textContent;try{await navigator.clipboard.writeText(text);document.getElementById("status").textContent="Copied. Paste it into Revenge → Plugins → Install from URL."}catch{document.getElementById("status").textContent="Copy the URL above manually, then paste it into Revenge → Plugins → Install from URL."}});
</script>
</body>
</html>`;

for (let plug of await readdir("./plugins")) {
    const manifest = JSON.parse(await readFile(`./plugins/${plug}/manifest.json`));
    const outPath = `./dist/${plug}/index.js`;

    try {
        const bundle = await rollup({
            input: `./plugins/${plug}/${manifest.main}`,
            onwarn: () => {},
            plugins,
        });
    
        await bundle.write({
            file: outPath,
            globals(id) {
                if (id.startsWith("@vendetta")) return id.substring(1).replace(/\//g, ".");
                const map = {
                    react: "window.React",
                };

                return map[id] || null;
            },
            format: "iife",
            compact: true,
            exports: "named",
        });
        await bundle.close();
    
        const toHash = await readFile(outPath);
        manifest.hash = createHash("sha256").update(toHash).digest("hex");
        manifest.main = "index.js";
        await writeFile(`./dist/${plug}/manifest.json`, JSON.stringify(manifest));
    
        console.log(`Successfully built ${manifest.name}!`);
    } catch (e) {
        console.error("Failed to build plugin...", e);
        process.exit(1);
    }
}

await writeFile("./dist/fake-deafen/index.html", sitePage);
