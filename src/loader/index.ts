/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
//loader/index.ts
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { loader as loaderFunction } from '../main/utils/Index.js';

// Loader sub-classes (Forge, NeoForge, etc.)
// Adjust the import paths based on your project's actual file structure.
import LegacyFabric from './legacyfabric/legacyFabric.js';
import Quilt from './quilt/quilt.js';

/**
 * Represents the user's selected loader type (Forge, Fabric, etc.).
 * Extend or refine as your application requires.
 */
export type LoaderType = 'forge' | 'neoforge' | 'fabric' | 'legacyfabric' | 'quilt';

/**
 * Configuration for the loader (build, version, etc.).
 * For instance: { type: "forge", version: "1.19.2", build: "latest" }
 */
export interface LoaderConfig {
	type: LoaderType;
	version: string;    // Minecraft version
	build: string;      // e.g., "latest", "recommended", or a specific numeric build
	config: {
		javaPath: string;
		minecraftJar: string;
		minecraftJson: string;
	};
	// Feel free to add additional fields if needed
}

/**
 * The overall options passed to our Loader class,
 * containing path information and loader configuration.
 */
export interface LoaderOptions {
	path: string;        // Base directory for storing version files, etc.
	loader: LoaderConfig;
	[key: string]: any;  // Allow additional fields as necessary
}

/**
 * A generic type to represent the JSON objects returned by
 * Forge, NeoForge, Fabric, etc., after an installation.
 */
export interface LoaderResult {
	id?: string;         // For example, "1.19.2-Forge" or "fabric-loader-1.14"
	error?: string;      // If an error occurs, we store a message here
	[key: string]: any;  // Additional fields depending on the loader
}

/**
 * The main Loader class that orchestrates installation of different
 * Minecraft mod loaders (Forge, Fabric, LegacyFabric, Quilt, etc.).
 * It extends EventEmitter to provide "check", "progress", "extract", "patch", and "error" events.
 */
export default class Loader extends EventEmitter {
	private readonly options: LoaderOptions;

	constructor(options: LoaderOptions) {
		super();
		this.options = options;
	}

	/**
	 * Main entry point for installing the selected loader.  
	 * Checks the loader type from `this.options.loader.type` and delegates to the appropriate method.
	 * Emits:
	 *  - "error" if the loader is not found or if an installation step fails
	 *  - "json" upon successful completion, returning the version JSON or loader info
	 */
	public async install(): Promise<void> {
		// Retrieve a loader definition from your `loaderFunction`
		// (Presumably a function that returns metadata URLs, etc. based on the type.)
		const LoaderData = loaderFunction(this.options.loader.type);
		if (!LoaderData) {
			this.emit('error', { error: `Loader ${this.options.loader.type} not found` });
			return;
		}

		const loaderType = this.options.loader.type;
		let result: LoaderResult | undefined;

		switch (loaderType) {
			

			case 'legacyfabric': {
				result = await this.legacyFabric(LoaderData);
				break;
			}
			case 'quilt': {
				result = await this.quilt(LoaderData);
				break;
			}
			default: {
				this.emit('error', { error: `Loader ${loaderType} not found` });
				return;
			}
		}

		// If there's an error property, emit it. Otherwise, emit the final JSON.
		if (result && result.error) {
			this.emit('error', result);
		} else if (result) {
			this.emit('json', result);
		}
	}

	/**
	 * Handles Forge installation by:
	 *  1. Downloading the installer
	 *  2. Depending on installer type, extracting an install profile or creating a merged Jar
	 *  3. Downloading required libraries
	 *  4. Patching Forge if necessary
	 *  5. Returns the final version JSON object or an error
	 */
	

	/**
	 * Manages installation flow for NeoForge:
	 *  1. Download the installer
	 *  2. Extract the install profile
	 *  3. Extract the universal jar
	 *  4. Download libraries
	 *  5. Patch if needed
	 */
	

	/**
	 * Installs Fabric:
	 *  1. Download the loader JSON
	 *  2. Save it as a version .json
	 *  3. Download required libraries
	 */
	

	/**
	 * Installs Legacy Fabric:
	 *  1. Download JSON
	 *  2. Save version .json
	 *  3. Download libraries
	 */
	private async legacyFabric(LoaderData: any): Promise<LoaderResult> {
		const legacyFabric = new LegacyFabric(this.options);

		// Forward events
		legacyFabric.on('check', (progress: number, size: number, element: string) => {
			this.emit('check', progress, size, element);
		});
		legacyFabric.on('progress', (progress: number, size: number, element: string) => {
			this.emit('progress', progress, size, element);
		});

		const json = await legacyFabric.downloadJson(LoaderData);
		if (json.error) return json;

		if ("id" in json) {
			const destination = path.resolve(this.options.path, 'versions', json.id);
			if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
			fs.writeFileSync(path.resolve(destination, `${json.id}.json`), JSON.stringify(json, null, 4));
			fs.cpSync(path.resolve(this.options.loader.config.minecraftJar), path.resolve(destination, `${json.id}.jar`));
		}
		if ("libraries" in json) {
			await legacyFabric.downloadLibraries(json);
		}
		return json;
	}

	/**
	 * Installs Quilt:
	 *  1. Download the loader JSON
	 *  2. Write to a version file
	 *  3. Download required libraries
	 */
	private async quilt(LoaderData: any): Promise<LoaderResult> {
		const quilt = new Quilt(this.options);

		// Forward events
		quilt.on('check', (progress: number, size: number, element: string) => {
			this.emit('check', progress, size, element);
		});
		quilt.on('progress', (progress: number, size: number, element: string) => {
			this.emit('progress', progress, size, element);
		});

		const json = await quilt.downloadJson(LoaderData);
		if (json.error) return json;

		if ("id" in json) {
			const destination = path.resolve(this.options.path, 'versions', json.id);
			if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
			fs.writeFileSync(path.resolve(destination, `${json.id}.json`), JSON.stringify(json, null, 4));
			fs.cpSync(path.resolve(this.options.loader.config.minecraftJar), path.resolve(destination, `${json.id}.jar`));
		}
		if ("libraries" in json) {
			await quilt.downloadLibraries(json);
		}

		return json;
	}
}
