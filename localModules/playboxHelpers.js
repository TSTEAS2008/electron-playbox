//localmodules/playboxHelpers.js
import path from "path";
import fsp from "fs/promises";

// ----- Config Validation Helpers -----
export function validateConfigStructure(config) {
    if (typeof config !== "object" || config === null) {
        return { valid: false, error: "Config must be an object" };
    }

    if (!("defaultAssembly" in config)) {
        return { valid: false, error: "Missing defaultAssembly field" };
    }

    if (typeof config.defaultAssembly !== "boolean") {
        return { valid: false, error: "defaultAssembly must be boolean" };
    }

    // Validate each top-level folder
    for (const [key, value] of Object.entries(config)) {
        if (key === "defaultAssembly") continue;

        if (!Array.isArray(value)) {
            return { valid: false, error: `Folder '${key}' must be an array` };
        }

        for (const item of value) {
            if (typeof item !== "object" || item === null) {
                return { valid: false, error: `Invalid item in folder '${key}'` };
            }

            if (!item.output || typeof item.output !== "string") {
                return { valid: false, error: `Missing or invalid 'output' in '${key}'` };
            }

            if (!Array.isArray(item.components) || item.components.length === 0) {
                return { valid: false, error: `Invalid or empty 'components' for '${item.output}'` };
            }

            if (!item.components.every(c => typeof c === "string")) {
                return { valid: false, error: `All components must be strings for '${item.output}'` };
            }
        }
    }

    return { valid: true };
}

// ----- Assembly Helper Functions -----
export async function assembleFile(outputPath, componentDir, components) {
    const contentParts = await Promise.all(
        components.map(async (comp) => {
            const componentFilePath = path.join(componentDir, comp);
            return await fsp.readFile(componentFilePath, "utf-8");
        })
    );
    const assembledContent = contentParts.join("\n");
    await fsp.writeFile(outputPath, assembledContent, "utf-8");
}

export async function copyFile(outputPath, componentDir, component) {
    const sourceFilePath = path.join(componentDir, component);
    await fsp.copyFile(sourceFilePath, outputPath);
}

// ----- Standardized Error Response -----
export function errorResponse(message) {
    return { success: false, message };
}

export function successResponse(data = {}) {
    return { success: true, ...data };
}
