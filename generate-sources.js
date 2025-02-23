// TODO: refactor so this works in this repository, don't assume to be running in TurboWarp/desktop

const fsPromises = require('node:fs/promises');
const path = require('node:path');
const nodeCrypto = require('node:crypto');

const cacheDir = path.join(__dirname, 'cache');

/**
 * @template T
 * @param {T[]} destination modified in-place
 * @param {T[]} newItems not modified
 * @returns {void}
 */
const appendInPlace = (destination, newItems) => {
    for (const item of newItems) {
        destination.push(item);
    }
};

/**
 * @param {url} url
 * @returns {Promise<Response>}
 */
const fetchWithCache = async (url) => {
    const urlHash = nodeCrypto.createHash('sha256')
        .update(url)
        .digest('hex');
    const cachePath = path.join(cacheDir, urlHash);

    await fsPromises.mkdir(cacheDir, {
        recursive: true
    });

    let response;
    try {
        const data = await fsPromises.readFile(cachePath);
        response = new Response(data);
        console.log(`Cached: ${url}`);
    } catch (e) {
        console.log(`Fetching: ${url}`);

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} fetching ${url}`);
        }

        // Clone response to return
        response = res.clone();

        // But use the original response to cache
        const data = new Uint8Array(await res.arrayBuffer());

        // Write then rename so this is slightly more atomic
        await fsPromises.writeFile(`${cachePath}.temp`, data);
        await fsPromises.rename(`${cachePath}.temp`, cachePath);
    }

    return response;
}

const generateNodePackage = async (packagePath, package) => {
    if (!package.integrity.startsWith('sha512-')) {
        throw new Error(`Unknown integrity algorithm: ${package}`);
    }
    const destName = packagePath.replace(/\//g, '_');
    const sha512 = Buffer.from(package.integrity.substring(7), 'base64').toString('hex');
    return [
        {
            type: 'file',
            url: package.resolved,
            sha512,
            dest: 'flatpak-node/',
            'dest-filename': destName
        },
        {
            type: 'script',
            commands: [
                `mkdir -p "${packagePath}"`,
                `tar -xzf "flatpak-node/${destName}" -C "${packagePath}" --warning=no-unknown-keyword --strip-components=1`,
            ],
            dest: 'flatpak-node/shell',
            'dest-filename': destName
        }
    ];
};

const generateGitPackage = async (packagePath, package) => {
    const match = package.resolved.match(/^git\+ssh:\/\/git@github\.com\/([\w\d-]+)\/([\w\d-]+)\.git#([0-9a-f]{40})$/);
    const owner = match[1];
    const repository = match[2];
    const commit = match[3];

    let subsources;
    if (packagePath !== 'node_modules/@electron/node-gyp') {
        const packageLockResponse = await fetchWithCache(`https://raw.githubusercontent.com/${owner}/${repository}/${commit}/package-lock.json`)
        const packageLock = await packageLockResponse.json();
        subsources = await generatePackageLock({
            packageLock,
            devOnly: true,
            prefix: packagePath
        });
    } else {
        subsources = [];
    }

    return [
        {
            type: 'git',
            url: `https://github.com/${owner}/${repository}.git`,
            commit,
            dest: packagePath
        },
        ...subsources
    ];
};

/**
 * 
 * @param {{packageLock: object; devOnly: boolean; prefix: string;}} context 
 * @returns 
 */
const generatePackageLock = async (context) => {
    const sources = [];

    for (const [packagePath, package] of Object.entries(context.packageLock.packages)) {
        if (packagePath === '') {
            // Root package is already downloaded.
            continue;
        }

        if (context.devOnly && package.dev) {
            continue;
        }

        const prefixedPath = path.join(context.prefix, packagePath);

        if (!package.resolved) {
            console.warn(`Unresolved: ${prefixedPath}`);
            continue;
        }

        if (package.resolved.startsWith('https://')) {
            appendInPlace(sources, await generateNodePackage(prefixedPath, package));
        } else if (package.resolved.startsWith('git+ssh://')) {
            appendInPlace(sources, await generateGitPackage(prefixedPath, package));
        } else {
            throw new Error(`Unknown resolved: ${package.resolved}`);
        }
    }

    return sources;
}

const generateNodeDependencies = async () => {
    const rootPackageLock = require('../package-lock.json')
    return generatePackageLock({
        packageLock: rootPackageLock,
        devOnly: false,
        prefix: ''
    });
};

const generateLibrary = async () => {
    const costumes = require('../node_modules/scratch-gui/src/lib/libraries/costumes.json');
    const backdrops = require('../node_modules/scratch-gui/src/lib/libraries/backdrops.json');
    const sounds = require('../node_modules/scratch-gui/src/lib/libraries/sounds.json');
    const sprites = require('../node_modules/scratch-gui/src/lib/libraries/sprites.json');

    const md5exts = new Set();
    for (const asset of [...costumes, ...backdrops, ...sounds]) {
        md5exts.add(asset.md5ext);
    }
    for (const sprite of [...sprites]) {
        for (const asset of [...sprite.costumes, ...sprite.sounds]) {
            md5exts.add(asset.md5ext);
        }
    }

    const sources = [];
    for (const md5ext of [...md5exts].sort()) {
        const match = md5ext.match(/^([0-9a-f]{32})\.([\w\d]+)$/);
        const expectedMd5 = match[1];

        const url = `https://assets.scratch.mit.edu/${md5ext}`;
        const response = await fetchWithCache(url);
        const data = new Uint8Array(await response.arrayBuffer());

        const realMd5 = nodeCrypto.createHash('md5').update(data).digest('hex');
        const sha256 = nodeCrypto.createHash('sha256').update(data).digest('hex');

        if (realMd5 !== expectedMd5) {
            throw new Error(`Hash mismatch: expected ${expectedMd5} got ${realMd5}`);
        }

        sources.push({
            type: 'file',
            url,
            sha256,
            dest: 'uncompressed-library-files',
            'dest-filename': md5ext
        });
    }

    return sources;
};

const generatePackager = async () => {
    const data = require('../scripts/packager.json');
    return [
        {
            type: 'file',
            url: data.src,
            sha256: data.sha256,
            dest: 'src-renderer/packager',
            'dest-filename': 'standalone.html'
        }
    ];
};

const generateMicrobitHex = async () => {
    return [
        {
            type: 'file',
            url: 'https://packagerdata.turbowarp.org/scratch-microbit-1.2.0.hex.zip',
            sha256: 'dfd574b709307fe76c44dbb6b0ac8942e7908f4d5c18359fae25fbda3c9f4399',
            dest: 'microbit',
            'dest-filename': 'hex.zip'
        }
    ];
};

const generateElectron = async () => {
    const packageLock = require('../package-lock.json');
    const version = packageLock.packages['node_modules/electron'].version;

    const sumsRequest = await fetch(`https://github.com/electron/electron/releases/download/v${version}/SHASUMS256.txt`);
    const sumsText = await sumsRequest.text();
    const sums = {};
    for (const match of sumsText.matchAll(/^([a-f0-9]{64}) \*?(.+)$/gm)) {
        sums[match[2]] = match[1];
    }

    const x64 = `electron-v${version}-linux-x64.zip`;
    const arm64 = `electron-v${version}-linux-arm64.zip`;

    return [
        {
            type: 'file',
            url: `https://github.com/electron/electron/releases/download/v${version}/${x64}`,
            sha256: sums[x64],
            dest: 'electron',
            'dest-filename': x64,
            'only-arches': ['x86_64']
        },
        {
            type: 'file',
            url: `https://github.com/electron/electron/releases/download/v${version}/${arm64}`,
            sha256: sums[arm64],
            dest: 'electron',
            'dest-filename': arm64,
            'only-arches': ['aarch64']
        }
    ];
};

const run = async () => {
    if (process.argv.length !== 3) {
        console.log(`Run as node flatpak/generate-sources.js <path to org.turbowarp.TurboWarp>`);
        process.exit(1);
    }

    const format = (json) => JSON.stringify(json, null, 2);
    const outDir = process.argv[2];

    await fsPromises.writeFile(path.join(outDir, 'electron-sources.json'), format(await generateElectron()));
    await fsPromises.writeFile(path.join(outDir, 'node-sources.json'), format(await generateNodeDependencies()));
    await fsPromises.writeFile(path.join(outDir, 'library-sources.json'), format(await generateLibrary()));
    await fsPromises.writeFile(path.join(outDir, 'packager-sources.json'), format(await generatePackager()));
    await fsPromises.writeFile(path.join(outDir, 'microbit-sources.json'), format(await generateMicrobitHex()));

    console.log(`Generated to ${outDir}`);
};

run()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
