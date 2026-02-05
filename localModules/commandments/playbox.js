// localModules/commandments/playbox.js
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { isPathSafe, servedPaths } from "../appProtocol.js";
import {
    validateConfigStructure,
    assembleFile,
    copyFile,
    errorResponse,
    successResponse,
} from "../playboxHelpers.js";
import { errorLog } from "../loggers.js";

/**
 * Clear the playbox or a specific folder.
 * args: { folder = "all" }
 */
export async function clearPlaybox(args = {}) {
    const { folder = "all" } = args;
    const base = servedPaths.playbox;

    try {
        if (folder === "all") {
            const entries = await fsp.readdir(base);
            await Promise.all(
                entries.map((e) => fsp.rm(path.join(base, e), { recursive: true, force: true }))
            );
            return successResponse({ message: "Playbox fully cleared." });
        }

        if (!isPathSafe(folder, base)) {
            return errorResponse("Invalid folder path.");
        }

        const target = path.join(base, folder);
        const entries = await fsp.readdir(target).catch(() => []);
        await Promise.all(
            entries.map((e) => fsp.rm(path.join(target, e), { recursive: true, force: true }))
        );
        return successResponse({ message: `Folder '${folder}' cleared.` });
    } catch (err) {
        errorLog(`ClearPlaybox Error: ${err?.message ?? err}`);
        return errorResponse("Failed to clear playbox.");
    }
}

/**
 * Prepare the playbox folders according to the config file.
 * args: { configPath }
 */
export async function preparePlaybox(args = {}) {
    const { configPath } = args;

    try {
        if (!isPathSafe(configPath, servedPaths.configs)) {
            return errorResponse("Invalid or missing config path");
        }

        const configFullPath = path.join(servedPaths.configs, configPath);
        if (!fs.existsSync(configFullPath)) {
            return errorResponse("Config file does not exist");
        }

        const configRaw = await fsp.readFile(configFullPath, "utf-8");
        const config = JSON.parse(configRaw);

        const validation = validateConfigStructure(config);
        if (!validation.valid) {
            return errorResponse(validation.error);
        }

        const playboxBase = servedPaths.playbox;
        const foldersToPrepare = Object.keys(config).filter(
            (key) => isPathSafe(key, playboxBase)
        );

        for (const folder of foldersToPrepare) {
            const folderPath = path.join(playboxBase, folder);
            await fsp.mkdir(folderPath, { recursive: true });

            const contents = await fsp.readdir(folderPath).catch(() => []);
            await Promise.all(
                contents.map((item) =>
                fsp.rm(path.join(folderPath, item), { recursive: true, force: true })
                )
            );
        }

        return successResponse({ prepared: foldersToPrepare });
    } catch (err) {
        errorLog(`PreparePlaybox Error: ${err?.message ?? err}`);
        return errorResponse("Failed to prepare playbox.");
    }
}

/**
 * Assemble the playbox according to the config.
 * Behavior is inferred from component count:
 * - 0 components: creates empty file
 * - 1 component: copies file
 * - 2+ components: concatenates files
 *
 * Config format:
 * {
 *   "folderName": [
 *     {
 *       "output": "path/to/file.ext",  // Full path including subdirs and filename
 *       "components": ["comp1.js", "comp2.js"],  // Array of component filenames
 *       "componentPath": "subfolder"  // Optional: subdirectory in components root
 *     }
 *   ]
 * }
 *
 * args: { configPath }
 */
export async function assemblePlaybox(args = {}) {
    const { configPath } = args;

    try {
        if (!isPathSafe(configPath, servedPaths.configs)) {
            return errorResponse("Invalid or missing config path");
        }

        const configFullPath = path.join(servedPaths.configs, configPath);
        if (!fs.existsSync(configFullPath)) {
            return errorResponse("Config file does not exist");
        }

        const configRaw = await fsp.readFile(configFullPath, "utf-8");
        const config = JSON.parse(configRaw);

        const validation = validateConfigStructure(config);
        if (!validation.valid) {
            return errorResponse(validation.error);
        }

        const playboxRoot = servedPaths.playbox;
        const componentsRoot = servedPaths.components;

        for (const topLevelKey of Object.keys(config)) {
            if (!isPathSafe(topLevelKey, playboxRoot)) {
                errorLog(`Unsafe top-level folder name: ${topLevelKey}`);
                continue;
            }

            const targetBaseFolder = path.join(playboxRoot, topLevelKey);

            for (const obj of config[topLevelKey]) {
                const {
                    output,
                    components,
                    componentPath = "",
                } = obj;

                // Validate output path safety
                if (!isPathSafe(output, targetBaseFolder)) {
                    errorLog(`Unsafe output path in config: ${JSON.stringify(obj)}`);
                    continue;
                }

                // Validate component path safety
                if (!isPathSafe(componentPath, componentsRoot)) {
                    errorLog(`Unsafe componentPath in config: ${JSON.stringify(obj)}`);
                    continue;
                }

                // Validate all component names are safe
                if (!components.every((c) => isPathSafe(c, componentsRoot))) {
                    errorLog(`Unsafe component paths in config: ${JSON.stringify(obj)}`);
                    continue;
                }

                // Build full output path and ensure directory exists
                const outputFilePath = path.join(targetBaseFolder, output);
                const outputDir = path.dirname(outputFilePath);
                await fsp.mkdir(outputDir, { recursive: true });

                // Build component directory path
                const componentDir = path.join(componentsRoot, componentPath);

                // Infer behavior from component count
                if (components.length === 0) {
                    // Create empty file
                    await fsp.writeFile(outputFilePath, "", "utf-8");
                } else if (components.length === 1) {
                    // Copy single file
                    await copyFile(outputFilePath, componentDir, components[0]);
                } else {
                    // Concatenate multiple files
                    await assembleFile(outputFilePath, componentDir, components);
                }
            }
        }

        return successResponse({ message: "Playbox assembly complete." });
    } catch (err) {
        errorLog(`AssemblePlaybox Error: ${err?.message ?? err}`);
        return errorResponse("Failed to assemble playbox.");
    }
}
