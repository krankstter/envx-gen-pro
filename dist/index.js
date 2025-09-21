#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const semver = __importStar(require("semver"));
const chalk_1 = __importDefault(require("chalk"));
/* ----------------------------- helpers ------------------------------ */
const log = {
    info: (m) => console.log(chalk_1.default.cyan("ℹ ") + m),
    ok: (m) => console.log(chalk_1.default.green("✔ ") + m),
    warn: (m) => console.log(chalk_1.default.yellow("⚠ ") + m),
    err: (m) => console.log(chalk_1.default.red("✖ ") + m),
};
const posix = (p) => p.split(path.sep).join("/");
const relFromCwd = (p) => posix(path.relative(process.cwd(), p));
function backupFile(absPath, doBackup) {
    if (!doBackup || !fs.existsSync(absPath))
        return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = absPath + `.bak.${stamp}`;
    fs.copyFileSync(absPath, bak);
    log.info(`Backup created: ${relFromCwd(bak)}`);
}
const looksLikeNumber = (v) => /^-?\d+(\.\d+)?$/.test(v);
function parseValue(v) {
    const t = v.trim();
    if (t === "true")
        return true;
    if (t === "false")
        return false;
    if (looksLikeNumber(t))
        return Number(t);
    if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
        try {
            return JSON.parse(t);
        }
        catch { /* ignore */ }
    }
    return t;
}
function parseKVPairs(pairs) {
    const out = {};
    if (!pairs)
        return out;
    for (const p of pairs) {
        const i = p.indexOf("=");
        if (i === -1)
            continue;
        const k = p.slice(0, i).trim();
        const v = p.slice(i + 1).trim();
        if (k)
            out[k] = v;
    }
    return out;
}
function sanitizeFolder(input) {
    if (!input)
        return undefined;
    const cleaned = input.replace(/^[\\/]+/, "").replace(/\.\./g, "").trim();
    return cleaned ? cleaned : undefined;
}
function loadEnvFile(envName, explicitPath) {
    const candidates = explicitPath
        ? [path.resolve(process.cwd(), explicitPath)]
        : [path.resolve(process.cwd(), `.env.${envName}`), path.resolve(process.cwd(), `.env`)];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            const file = fs.readFileSync(p, "utf8");
            const parsed = dotenv.parse(file);
            log.info(`Loaded env file: ${relFromCwd(p)}`);
            return parsed;
        }
    }
    return {};
}
function readPackageJson() {
    const p = path.resolve(process.cwd(), "package.json");
    if (!fs.existsSync(p))
        return null;
    try {
        return fs.readJSONSync(p);
    }
    catch {
        return null;
    }
}
function detectProjectKind() {
    const angularJson = path.resolve(process.cwd(), "angular.json");
    const ngCliJson = path.resolve(process.cwd(), ".angular-cli.json");
    const pkg = readPackageJson();
    const deps = Object.assign({}, pkg?.dependencies, pkg?.devDependencies);
    const hasAngularJS = deps && typeof deps["angular"] === "string";
    const ngCore = deps && deps["@angular/core"];
    if (fs.existsSync(angularJson))
        return "angular-modern";
    if (fs.existsSync(ngCliJson))
        return "ng-cli-legacy";
    if (ngCore) {
        const v = semver.coerce(ngCore);
        return v && semver.gte(v, "6.0.0") ? "angular-modern" : "ng-cli-legacy";
    }
    return hasAngularJS ? "angularjs" : "angular-modern";
}
function resolveProjectInfo(projectFlag) {
    const abs = path.resolve(process.cwd(), "angular.json");
    if (!fs.existsSync(abs))
        throw new Error("angular.json not found");
    const data = fs.readJSONSync(abs);
    const allProjects = Object.keys(data.projects || {});
    if (!allProjects.length)
        throw new Error("No projects found in angular.json");
    let projectName = projectFlag || data.defaultProject || allProjects[0];
    if (!data.projects[projectName]) {
        throw new Error(`Project "${projectName}" not found. Available: ${allProjects.join(", ")}`);
    }
    const project = data.projects[projectName];
    const usesTargets = !!project.targets;
    const targets = (project.targets || project.architect || {});
    const projectRoot = project.root ? posix(project.root) : "";
    const sourceRoot = project.sourceRoot
        ? posix(project.sourceRoot)
        : (projectRoot ? `${projectRoot}/src` : "src");
    return { projectName, sourceRoot, targets, data, usesTargets };
}
/* --------------------------- path helpers --------------------------- */
function envDir(sourceRoot, folder) {
    return path.resolve(process.cwd(), sourceRoot, "environments", ...(folder ? [folder] : []));
}
function envFilePath(sourceRoot, env, folder) {
    const dir = envDir(sourceRoot, folder);
    return path.resolve(dir, env ? `environment.${env}.ts` : "environment.ts");
}
function findCloneSource(sourceRoot, folder) {
    const tryPaths = [
        envFilePath(sourceRoot, "prod", folder),
        envFilePath(sourceRoot, undefined, folder),
        envFilePath(sourceRoot, "prod", undefined),
        envFilePath(sourceRoot, undefined, undefined),
    ];
    for (const p of tryPaths) {
        if (fs.existsSync(p))
            return p;
    }
    return null;
}
/* ------------------------ Angular config writers -------------------- */
function updateAngularJson(envName, envFileAbs, projectName, sourceRoot, data, usesTargets, doBackup, dryRun) {
    const abs = path.resolve(process.cwd(), "angular.json");
    const baseReplace = `${posix(sourceRoot)}/environments/environment.ts`;
    const withReplace = posix(path.relative(process.cwd(), envFileAbs));
    const project = data.projects[projectName];
    const targets = project.targets || project.architect || {};
    const build = targets.build || {};
    const serve = targets.serve || {};
    build.configurations = build.configurations || {};
    serve.configurations = serve.configurations || {};
    build.configurations[envName] = build.configurations[envName] || {};
    const bcfg = build.configurations[envName];
    const fr = Array.isArray(bcfg.fileReplacements) ? bcfg.fileReplacements : [];
    const idx = fr.findIndex((x) => x?.replace === baseReplace);
    const entry = { replace: baseReplace, with: withReplace };
    if (idx >= 0)
        fr[idx] = entry;
    else
        fr.push(entry);
    bcfg.fileReplacements = fr;
    serve.configurations[envName] = { browserTarget: `${projectName}:build:${envName}` };
    if (dryRun) {
        log.info(`[dry-run] angular.json would be updated:`);
        log.info(`  replace: ${baseReplace}`);
        log.info(`  with:    ${withReplace}`);
        return;
    }
    backupFile(abs, doBackup);
    if (usesTargets) {
        project.targets.build = build;
        project.targets.serve = serve;
    }
    else {
        project.architect.build = build;
        project.architect.serve = serve;
    }
    data.projects[projectName] = project;
    fs.writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
    log.ok(`angular.json updated with configuration "${envName}"`);
}
function updateNgCliLegacy(envName, envFileAbs, doBackup, dryRun) {
    const abs = path.resolve(process.cwd(), ".angular-cli.json");
    if (!fs.existsSync(abs))
        throw new Error(".angular-cli.json not found");
    const data = fs.readJSONSync(abs);
    const apps = data.apps || data.project?.apps || [];
    if (!apps.length)
        throw new Error("No apps found in .angular-cli.json");
    const app0 = apps[0];
    app0.environments = app0.environments || {};
    const relFromSrc = posix(path.relative(path.resolve(process.cwd(), "src"), envFileAbs));
    const mapped = relFromSrc.startsWith("environments/")
        ? relFromSrc
        : "environments/" + path.basename(envFileAbs);
    if (dryRun) {
        log.info(`[dry-run] .angular-cli.json would be updated:`);
        log.info(`  environments["${envName}"] = "${mapped}"`);
        return;
    }
    backupFile(abs, doBackup);
    app0.environments[envName] = mapped;
    fs.writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
    log.ok(`.angular-cli.json updated: environments["${envName}"] = "${mapped}"`);
}
/* --------------------- file generators (Angular) -------------------- */
function ensureBaselineEnvironmentTs(sourceRoot, doBackup, dryRun) {
    const baseline = envFilePath(sourceRoot); // environment.ts in root environments
    if (fs.existsSync(baseline))
        return baseline;
    // Try cloning from prod in root environments
    const prod = envFilePath(sourceRoot, "prod");
    if (fs.existsSync(prod)) {
        if (dryRun) {
            log.info(`[dry-run] clone ${relFromCwd(prod)} → ${relFromCwd(baseline)}`);
            return baseline;
        }
        fs.mkdirpSync(path.dirname(baseline));
        fs.copyFileSync(prod, baseline);
        log.ok(`Created baseline: ${relFromCwd(baseline)} (cloned from environment.prod.ts)`);
        return baseline;
    }
    // Minimal stub
    const content = `export const environment = { production: false };` + "\n";
    if (dryRun) {
        log.info(`[dry-run] create ${relFromCwd(baseline)}`);
        return baseline;
    }
    fs.mkdirpSync(path.dirname(baseline));
    fs.writeFileSync(baseline, content, "utf8");
    log.ok(`Created baseline: ${relFromCwd(baseline)}`);
    return baseline;
}
function toEnvironmentTs(envName, kv) {
    // pretty-print values and coerce booleans/numbers/JSON
    const entries = Object.entries(kv).map(([k, v]) => `  ${k}: ${JSON.stringify(parseValue(v))},`);
    // prod/production => production: true
    const isProd = /^(prod|production)$/i.test(envName);
    return `export const environment = {
  production: ${isProd},
${entries.join("\n")}
};
`;
}
function writeEnvironmentTs(envName, kv, sourceRoot, folder, dryRun) {
    const dir = envDir(sourceRoot, folder);
    const target = path.resolve(dir, `environment.${envName}.ts`);
    const content = toEnvironmentTs(envName, kv);
    if (dryRun) {
        log.info(`[dry-run] create ${relFromCwd(target)}`);
        return target;
    }
    fs.mkdirpSync(dir);
    fs.writeFileSync(target, content, "utf8");
    log.ok(`Created ${relFromCwd(target)}`);
    return target;
}
function cloneEnvironmentFile(sourceRoot, destEnv, folder, explicitFrom, dryRun) {
    const preferred = explicitFrom ? envFilePath(sourceRoot, explicitFrom, folder) : null;
    const src = (preferred && fs.existsSync(preferred) && preferred) ||
        findCloneSource(sourceRoot, folder);
    if (!src)
        return null;
    const dest = envFilePath(sourceRoot, destEnv, folder);
    if (dryRun) {
        log.info(`[dry-run] clone ${relFromCwd(src)} → ${relFromCwd(dest)}`);
        return dest;
    }
    fs.mkdirpSync(path.dirname(dest));
    fs.copyFileSync(src, dest);
    log.ok(`Cloned ${relFromCwd(src)} → ${relFromCwd(dest)}`);
    return dest;
}
/* --------------------------- AngularJS path ------------------------- */
function generateAngularJsEnv(envName, kv, dryRun) {
    const outDir = path.resolve(process.cwd(), "src", "assets");
    const target = path.resolve(outDir, `env.${envName}.js`);
    const obj = {};
    for (const [k, v] of Object.entries(kv))
        obj[k] = parseValue(v);
    const content = `// generated by envx
(function(w){ w.__ENV = ${JSON.stringify(obj, null, 2)}; })(window);
`;
    if (dryRun) {
        log.info(`[dry-run] create ${relFromCwd(target)}`);
        return target;
    }
    fs.mkdirpSync(outDir);
    fs.writeFileSync(target, content, "utf8");
    log.ok(`AngularJS env file created: ${relFromCwd(target)}`);
    log.info(`Include it in index.html: <script src="assets/env.${envName}.js"></script>`);
    return target;
}
/* ------------------------------ CLI -------------------------------- */
const program = new commander_1.Command();
program
    .name("envx")
    .description("Smart env manager for Angular projects (AngularJS 1.x to Angular 21)")
    .version("0.2.0");
program
    .command("gen")
    .argument("<env>", "environment name, e.g., dev | sit | uat | prod")
    .option("-f, --folder <name>", "subfolder under environments/, e.g., f1")
    .option("--project <name>", "Angular project name (defaults to defaultProject or first)")
    .option("--source-root <path>", "override detected sourceRoot (e.g., apps/myapp/src)")
    .option("-e, --env-file <path>", "path to an env file (optional)")
    .option("-s, --set <kv...>", "inline key=value pairs to write (optional)")
    .option("--copy-from <env>", "clone from an existing environment file first (optional)")
    .option("--dry-run", "show plan without writing files", false)
    .option("--no-backup", "do not create timestamped backups of angular configs")
    .description("Generate environment file and update Angular config")
    .action((envName, opts) => {
    try {
        const kind = detectProjectKind();
        const folder = sanitizeFolder(opts.folder);
        const inlineKV = parseKVPairs(opts.set);
        const fileKV = loadEnvFile(envName, opts.envFile);
        const kv = { ...fileKV, ...inlineKV };
        log.info(`Detected project type: ${kind}`);
        if (kind === "angularjs") {
            log.info(`Plan:
  • Create assets/${folder ? folder + "/" : ""}env.${envName}.js from provided values (${Object.keys(kv).length} keys)
  • No angular.json updates for AngularJS`);
            generateAngularJsEnv(envName, kv, !!opts.dryRun);
            return;
        }
        // Modern or legacy Angular
        let sourceRoot = opts.sourceRoot || "src";
        let projectName = "app";
        if (kind === "angular-modern") {
            const { projectName: pn, sourceRoot: sr, data, targets, usesTargets } = resolveProjectInfo(opts.project);
            projectName = pn;
            sourceRoot = opts.sourceRoot || sr;
            log.info(`Using project: ${projectName}`);
            log.info(`sourceRoot: ${sourceRoot}`);
            // 1) Ensure baseline environment.ts exists at root environments
            ensureBaselineEnvironmentTs(sourceRoot, !!opts.backup, !!opts.dryRun);
            // 2) Decide target env file location
            const targetPath = envFilePath(sourceRoot, envName, folder);
            let finalEnvFile = targetPath;
            const alreadyExists = fs.existsSync(targetPath);
            const plan = [];
            if (alreadyExists) {
                plan.push(`Use existing ${relFromCwd(targetPath)}`);
            }
            else if (Object.keys(kv).length) {
                plan.push(`Create ${relFromCwd(targetPath)} from provided values (${Object.keys(kv).length} keys)`);
            }
            else {
                const cloned = cloneEnvironmentFile(sourceRoot, envName, folder, opts.copyFrom, true);
                if (cloned) {
                    plan.push(`Clone into ${relFromCwd(targetPath)} (see dry-run line above)`);
                }
                else {
                    plan.push(`Create minimal ${relFromCwd(targetPath)} (production flag only)`);
                }
            }
            // Print plan
            log.info("Plan:");
            for (const p of plan)
                log.info(`  • ${p}`);
            // 3) Execute file creation
            if (!alreadyExists) {
                if (Object.keys(kv).length) {
                    finalEnvFile = writeEnvironmentTs(envName, kv, sourceRoot, folder, !!opts.dryRun);
                }
                else {
                    const cloned = cloneEnvironmentFile(sourceRoot, envName, folder, opts.copyFrom, !!opts.dryRun);
                    if (cloned)
                        finalEnvFile = cloned;
                    else
                        finalEnvFile = writeEnvironmentTs(envName, {}, sourceRoot, folder, !!opts.dryRun);
                }
            }
            // 4) Wire angular.json
            updateAngularJson(envName, finalEnvFile, projectName, sourceRoot, resolveProjectInfo(projectName).data, resolveProjectInfo(projectName).usesTargets, !!opts.backup, !!opts.dryRun);
            if (!opts.dryRun) {
                log.ok(`Done. Run with:
  ng build -c ${envName}
  ng serve -c ${envName}`);
            }
            return;
        }
        // Legacy Angular 2–5
        sourceRoot = opts.sourceRoot || "src";
        log.info(`Legacy Angular CLI detected (.angular-cli.json). Using sourceRoot: ${sourceRoot}`);
        // Ensure baseline
        ensureBaselineEnvironmentTs(sourceRoot, !!opts.backup, !!opts.dryRun);
        const targetPath = envFilePath(sourceRoot, envName, folder);
        let finalEnvFile = targetPath;
        if (fs.existsSync(targetPath)) {
            log.info(`Plan:\n  • Use existing ${relFromCwd(targetPath)}`);
        }
        else if (Object.keys(kv).length) {
            log.info(`Plan:\n  • Create ${relFromCwd(targetPath)} from provided values (${Object.keys(kv).length} keys)`);
            finalEnvFile = writeEnvironmentTs(envName, kv, sourceRoot, folder, !!opts.dryRun);
        }
        else {
            const cloned = cloneEnvironmentFile(sourceRoot, envName, folder, opts.copyFrom, !!opts.dryRun);
            if (cloned)
                finalEnvFile = cloned;
            else
                finalEnvFile = writeEnvironmentTs(envName, {}, sourceRoot, folder, !!opts.dryRun);
        }
        updateNgCliLegacy(envName, finalEnvFile, !!opts.backup, !!opts.dryRun);
        if (!opts.dryRun) {
            log.ok(`Done. Run with:
  ng build --env=${envName}
  ng serve --env=${envName}`);
        }
    }
    catch (e) {
        log.err(e.message || String(e));
        process.exitCode = 1;
    }
});
program
    .command("list")
    .option("--project <name>", "Angular project name")
    .option("--source-root <path>", "override detected sourceRoot")
    .description("List discovered environment files under environments/ (recursively)")
    .action((opts) => {
    try {
        const kind = detectProjectKind();
        if (kind === "angularjs") {
            log.info("AngularJS project: environment files are not used the same way.");
            return;
        }
        let sourceRoot = opts.sourceRoot || "src";
        if (kind === "angular-modern") {
            const info = resolveProjectInfo(opts.project);
            sourceRoot = opts.sourceRoot || info.sourceRoot;
            log.info(`Project: ${info.projectName}`);
        }
        const base = envDir(sourceRoot);
        if (!fs.existsSync(base)) {
            log.warn(`No environments folder found at ${relFromCwd(base)}`);
            return;
        }
        const files = [];
        (function walk(dir) {
            for (const entry of fs.readdirSync(dir)) {
                const full = path.join(dir, entry);
                const stat = fs.statSync(full);
                if (stat.isDirectory())
                    walk(full);
                else if (/environment\.[^.]+\.ts$/.test(entry) || entry === "environment.ts") {
                    files.push(relFromCwd(full));
                }
            }
        })(base);
        if (!files.length) {
            log.warn("No environment files found.");
            return;
        }
        log.ok(`Found ${files.length} file(s):`);
        files.sort().forEach(f => console.log("  - " + f));
    }
    catch (e) {
        log.err(e.message || String(e));
        process.exitCode = 1;
    }
});
program.parse(process.argv);
