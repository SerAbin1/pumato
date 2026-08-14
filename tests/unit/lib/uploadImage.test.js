"use strict";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const ARTIFACTS_DIR = new URL("../../artifacts/", import.meta.url);
const SOURCE_IMAGE = new URL("../../artifacts/testWithOG.jpeg", import.meta.url);

let browser;
let page;

beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();

    await page.setContent('<input type="file" id="f">');
    await page.setInputFiles("#f", SOURCE_IMAGE.pathname);

    const source = await readFile(new URL("../../../lib/uploadImage.js", import.meta.url), "utf8");
    const clientSource = source.replaceAll(/^import .*;$/gm, "").replaceAll("export ", "");
    await page.addScriptTag({ content: clientSource });
});

afterAll(async () => {
    await browser.close();
});

describe("optimizeImage", () => {
    it("produces a smaller image and saves it to tests/artifacts", async () => {
        const result = await page.evaluate(async () => {
            const file = document.querySelector("#f").files[0];
            const optimized = await optimizeImage(file);

            const bytes = new Uint8Array(await optimized.arrayBuffer());
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

            return {
                name: optimized.name,
                type: optimized.type,
                size: optimized.size,
                originalSize: file.size,
                base64: btoa(binary),
            };
        });

        console.log(
            `Original size: ${result.originalSize} bytes -> Optimized size: ${result.size} bytes ` +
                `(${Math.round((1 - result.size / result.originalSize) * 100)}% smaller)`
        );

        expect(result.type).toBe("image/webp");
        expect(result.name).toBe("testWithOG.webp");
        expect(result.size).toBeLessThan(result.originalSize);

        await writeFile(new URL(result.name, ARTIFACTS_DIR), Buffer.from(result.base64, "base64"));
    });
});
