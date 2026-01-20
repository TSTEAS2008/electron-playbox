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
            (key) => key !== "defaultAssembly" && isPathSafe(key, playboxBase)
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

        const defaultAssembly = config.defaultAssembly;
        const playboxRoot = servedPaths.playbox;
        const componentsRoot = servedPaths.components;

        for (const topLevelKey of Object.keys(config)) {
            if (topLevelKey === "defaultAssembly") continue;

            if (!isPathSafe(topLevelKey, playboxRoot)) {
                errorLog(`Unsafe top-level folder name: ${topLevelKey}`);
                continue;
            }

            const targetBaseFolder = path.join(playboxRoot, topLevelKey);

            for (const obj of config[topLevelKey]) {
                const {
                    output,
                    outputPath = "",
                    components,
                    componentPath = "",
                    assembly,
                } = obj;

                if (
                    !isPathSafe(output, targetBaseFolder) ||
                    !isPathSafe(outputPath, targetBaseFolder) ||
                    !isPathSafe(componentPath, componentsRoot) ||
                    !components.every((c) => isPathSafe(c, componentsRoot))
                ) {
                    errorLog(`Unsafe paths in config: ${JSON.stringify(obj)}`);
                    continue;
                }

                const outputDir = path.join(targetBaseFolder, outputPath);
                const componentDir = path.join(componentsRoot, componentPath);
                await fsp.mkdir(outputDir, { recursive: true });

                const outputFilePath = path.join(outputDir, output);
                const useAssembly = assembly !== undefined ? assembly : defaultAssembly;

                if (useAssembly) {
                    await assembleFile(outputFilePath, componentDir, components);
                } else {
                    if (components.length !== 1) {
                        errorLog(`Assembly false but multiple components for ${output}`);
                        continue;
                    }
                    await copyFile(outputFilePath, componentDir, components[0]);
                }
            }
        }

        return successResponse({ message: "Playbox assembly complete." });
    } catch (err) {
        errorLog(`AssemblePlaybox Error: ${err?.message ?? err}`);
        return errorResponse("Failed to assemble playbox.");
    }
}
