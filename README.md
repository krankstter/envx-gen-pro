# envx-gen-pro

[![npm version](https://img.shields.io/npm/v/envx-gen-pro.svg)](https://www.npmjs.com/package/envx-gen-pro)
[![npm downloads](https://img.shields.io/npm/dm/envx-gen-pro.svg)](https://www.npmjs.com/package/envx-gen-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/krankstter/envx-gen-pro.svg)](https://github.com/krankstter/envx-gen-pro/stargazers)

Smart environment manager for Angular.  
Create `environment.*.ts` files and automatically update `angular.json` or `.angular-cli.json` with safe and predictable defaults.

👉 **View on npm:** https://www.npmjs.com/package/envx-gen-pro

**What it is**  
`envx-gen-pro` is an **Angular environment file generator** CLI. It helps you create and manage `environment.ts`, `environment.prod.ts`, and custom files such as `environment.uat.ts` or `environment.sit.ts`. It also updates **angular.json** fileReplacements or the legacy **.angular-cli.json** environments map. Ideal for multi environment Angular apps, CI pipelines, and enterprise Angular projects that want a repeatable workflow.

---

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Why envx-gen-pro](#why-envx-gen-pro)
- [Usage](#usage)
  - [Commands](#commands)
  - [Options](#options)
- [Examples](#examples)
- [What gets written](#what-gets-written)
- [How angular.json is updated](#how-angularjson-is-updated)
- [Use cases](#use-cases)
- [Exit codes](#exit-codes)
- [Troubleshooting](#troubleshooting)
- [Compatibility](#compatibility)
- [Uninstall](#uninstall)
- [Contributing](#contributing)
- [Related searches](#related-searches)
- [License](#license)

---

## Install

```bash
# Recommended
npm i -g envx-gen-pro

# One-off without global install
# npx installs the package then runs the binary
npx -p envx-gen-pro envx --help

# pnpm users
pnpm dlx envx-gen-pro envx --help

# yarn classic users
yarn dlx envx-gen-pro envx --help
```

**Requirements**: Node 16 or newer. Works with Angular projects that use `angular.json`. Also supports older `.angular-cli.json` projects.

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

- No more manual JSON edits for fileReplacements
- Reuse an existing environment as a template
- Consistent structure across teams and CI
- Works with modern Angular CLI and legacy `.angular-cli.json`
- Safe by default, refuses to overwrite unless you ask for it

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

- For `angular.json` Angular 6 and newer, updates `projects.<project>.architect.build.configurations.<name>.fileReplacements`
- For `.angular-cli.json` Angular 5 and older, updates `apps[0].environments` map

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
  production: false
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

## Use cases

- Generate Angular `environment.ts` and `environment.prod.ts`
- Create custom environments like `environment.uat.ts`, `environment.sit.ts`, `environment.qa.ts`
- Automate `angular.json` fileReplacements
- Support for Angular workspaces and monorepos
- Useful for CI or CD pipelines that create build specific environment files

---

## Exit codes

- `0` success
- `1` fatal error
- `2` invalid input or conflicts without `--force`

---

## Troubleshooting

- Target file already exists and you did not pass `--force`  
  The command refuses to overwrite. Rerun with `--force` if you are sure.

- Project could not be resolved  
  Use `--project <name>` or set `defaultProject` in `angular.json`.

- Using a very old Angular project without `angular.json`  
  Pass `--angular-json .angular-cli.json`. The tool updates the `environments` section.

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

Issues and PRs are welcome. Please include a failing case or a before and after snippet that makes it easy to reproduce.

---

## Related searches

angular environment generator, angular.json fileReplacements automation, angular multiple environment files, angular CLI environment management, environment.ts vs environment.prod.ts, angular environments cli, angular config environments, angular create environment file, angular workspace environments

---

## License

MIT © 2025 Krishna Saathvik Katari
