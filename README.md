# envx-gen-pro

[![npm version](https://img.shields.io/npm/v/envx-gen-pro.svg)](https://www.npmjs.com/package/envx-gen-pro)
[![npm downloads](https://img.shields.io/npm/dm/envx-gen-pro.svg)](https://www.npmjs.com/package/envx-gen-pro)

Smart environment manager for Angular.  
Create `environment.*.ts` files and automatically update `angular.json` or `.angular-cli.json` with safe defaults.

> Built for teams that do not want to hand edit fileReplacements every time a new environment appears.

---

## Install

```bash
# Recommended
npm i -g envx-gen-pro

# One-off usage without global install
# npx will install the package then run the binary
npx -p envx-gen-pro envx --help

# pnpm users
pnpm dlx envx-gen-pro envx --help

# yarn (classic) users
yarn dlx envx-gen-pro envx --help
```

**Requirements**: Node 16 or newer. Works with Angular projects that use `angular.json`. Also supports older `.angular-cli.json` files.

---

## Quick start

```bash
# 1) Create the default environment.ts under src/environments
envx gen

# 2) Create environment.sit.ts under src/environments/f1 and update angular.json
envx gen sit --folder=f1

# 3) Create environment.prod.ts and wire fileReplacements for the production configuration
envx gen prod
```

---

## Why envx-gen-pro

- Stop copy pasting environment files and editing JSON by hand
- Reuse an existing environment as a template
- Keep a predictable structure that works across teams and CI

---

## Usage

```bash
envx [command] [options]
```

### Commands

#### `gen [name]`

Create an environment file and update Angular config.

- `name` is optional. If omitted, generates `environment.ts`
- If provided, generates `environment.<name>.ts`

**Default source when cloning**

- If `src/environments/environment.ts` exists, new files are cloned from it
- Else if `src/environments/environment.prod.ts` exists, clone from that
- Else a minimal boilerplate is created

**Angular config update**

- For `angular.json` (Angular 6 and newer): adds or updates `projects.<project>.architect.build.configurations.<name>.fileReplacements`
- For `.angular-cli.json` (Angular 5 and older): adds or updates the `apps[0].environments` map

---

## Options

```
--folder <relativePath>   Folder under src/environments for the new file
                          Default: "."
                          Example result: src/environments/<folder>/environment[.<name>].ts

--project <name>          Angular project name to update
                          If omitted, tries "defaultProject" from angular.json

--angular-json <path>     Path to angular.json or .angular-cli.json
                          Default: ./angular.json if present, otherwise ./.angular-cli.json

--no-update-angular       Only write the file. Skip changes to Angular config

--clone-from <path|alias> Explicit source file for cloning
                          Examples:
                          --clone-from=src/environments/environment.prod.ts
                          --clone-from=prod
                          --clone-from=default

--force                   Overwrite if the target file already exists
--dry-run                 Show changes without writing
--yes, -y                 Assume yes for prompts
--json                    Machine readable result output
--verbose                 Extra logs
--version                 Print version
--help                    Show help
```

---

## Examples

Create the default env file in a feature folder:

```bash
envx gen --folder=mobile
# -> src/environments/mobile/environment.ts
# -> updates angular.json default build input when applicable
```

Create a UAT env and wire replacements:

```bash
envx gen uat
# -> src/environments/environment.uat.ts
# -> adds configurations.uat.fileReplacements
#    from environment.ts -> environment.uat.ts
```

Create SIT under a subfolder and copy from prod:

```bash
envx gen sit --folder=f1 --clone-from=prod
# -> src/environments/f1/environment.sit.ts
# -> adds configurations.sit.fileReplacements to point at the new file
```

Monorepo example with a named project and a custom angular.json path:

```bash
envx gen qa --project=dashboard-app --angular-json=apps/dashboard/angular.json
```

Skip Angular updates if you only want the file:

```bash
envx gen stage --no-update-angular
```

---

## What gets written

**File path**  
`src/environments[/<folder>]/environment[.<name>].ts`

**File content**  
Exports a plain `environment` object. If cloning, the entire source file content is copied then normalized. If bootstrapping, a minimal template is created like:

```ts
export const environment = {
  production: false,
};
```

---

## How angular.json is updated

When you create or reference a custom environment name, `envx` adds or updates the `fileReplacements` entry for that configuration.

**Before**

```json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

**After running** `envx gen sit`

```json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ]
            },
            "sit": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.sit.ts"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

For `.angular-cli.json` the `apps[0].environments` map gets a new key and path.

---

## Exit codes

- `0` success
- `1` fatal error
- `2` invalid input or conflicts without `--force`

---

## Troubleshooting

- Target file already exists and you did not pass `--force`  
  The command will refuse to overwrite. Rerun with `--force` if you are sure.

- Project could not be resolved  
  Use `--project <name>` or set `defaultProject` in `angular.json`.

- Using very old Angular without `angular.json`  
  Pass `--angular-json .angular-cli.json`. The tool will update the `environments` section.

- Windows shebang issues  
  npm creates platform shims for the binary, so it works across OS by default.

---

## Compatibility

- Node 16 or newer
- Angular CLI 6 and newer for `angular.json`
- Angular CLI 1.x or 5.x supported via `.angular-cli.json`

---

## Uninstall

```bash
npm uninstall -g envx-gen-pro
```

---

## Contributing

Issues and PRs are welcome. Please include a failing case or a before and after snippet so it is easy to reproduce.

---

## License

MIT © 2025 Krishna Saathvik Katari
