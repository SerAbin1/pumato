import fs from "fs";
import path from "path";

let _env = null;

export function loadTestEnv() {
    if (_env) return _env;

    const envPath = path.resolve(process.cwd(), ".env.test");
    if (!fs.existsSync(envPath)) {
        throw new Error(`.env.test not found at ${envPath}`);
    }

    const content = fs.readFileSync(envPath, "utf-8");
    _env = {};

    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        _env[key] = value;
    }

    return _env;
}
