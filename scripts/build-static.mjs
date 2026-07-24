import { spawn } from "node:child_process";
import { access, cp, mkdtemp, rename, rm, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const needsLocalStaging = process.platform === "win32" && /(?:^|[\\/])OneDrive(?:\s|[\\/]|$)/i.test(projectRoot);

if (!needsLocalStaging) {
  process.exitCode = await runNext(projectRoot, nextCli);
} else {
  process.exitCode = await buildOutsideOneDrive();
}

async function buildOutsideOneDrive() {
  const stageRoot = await mkdtemp(join(tmpdir(), "olympus-ai-next-"));
  const stageNodeModules = join(stageRoot, "node_modules");
  let preserveStage = false;

  try {
    process.stdout.write(`OneDrive detectado; preparando build local em ${stageRoot}\n`);
    for (const directory of ["src", "public"]) {
      await cp(join(projectRoot, directory), join(stageRoot, directory), {
        recursive: true,
        force: true,
        dereference: true,
      });
    }

    for (const file of [
      "package.json",
      "package-lock.json",
      "next.config.ts",
      "next-env.d.ts",
      "postcss.config.mjs",
      "tsconfig.json",
    ]) {
      try {
        await access(join(projectRoot, file));
        await cp(join(projectRoot, file), join(stageRoot, file), {
          force: true,
          dereference: true,
        });
      } catch {
        if (file === "package.json" || file === "next.config.ts" || file === "tsconfig.json") {
          throw new Error(`Arquivo obrigatório ausente para o build: ${file}`);
        }
      }
    }

    await symlink(join(projectRoot, "node_modules"), stageNodeModules, "junction");
    const exitCode = await runNext(stageRoot, join(stageNodeModules, "next", "dist", "bin", "next"));
    if (exitCode !== 0) {
      preserveStage = true;
      process.stderr.write(`Build falhou; workspace temporário preservado para diagnóstico: ${stageRoot}\n`);
      return exitCode;
    }

    const stagedOutput = await findStaticOutput(stageRoot);
    const projectOutput = join(projectRoot, ".next-build");
    await replaceStaticOutput(stagedOutput, projectOutput, stageRoot);
    process.stdout.write(`Build estático copiado para ${projectOutput}\n`);
    return 0;
  } catch (error) {
    preserveStage = true;
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.stderr.write(`Workspace temporário preservado para diagnóstico: ${stageRoot}\n`);
    return 1;
  } finally {
    try {
      await unlink(stageNodeModules);
    } catch {
      // O junction pode já ter sido removido ou nunca ter sido criado.
    }
    if (!preserveStage) {
      try {
        await rm(stageRoot, { recursive: true, force: true, maxRetries: 3 });
      } catch {
        // A limpeza temporária não deve invalidar um build que já foi copiado.
      }
    }
  }
}

async function findStaticOutput(stageRoot) {
  const candidates = [join(stageRoot, ".next-build"), join(stageRoot, "out")];
  for (const candidate of candidates) {
    try {
      await access(join(candidate, "index.html"));
      return candidate;
    } catch {
      // Continue procurando o diretório configurado pelo Next.
    }
  }
  throw new Error(`O Next concluiu sem gerar um index.html em ${candidates.map(basename).join(" ou ")}.`);
}

async function replaceStaticOutput(stagedOutput, projectOutput, stageRoot) {
  const previousOutput = join(stageRoot, ".next-build-previous");
  const failedOutput = join(stageRoot, ".next-build-failed");
  let hadPreviousOutput = false;

  try {
    await access(projectOutput);
    await rename(projectOutput, previousOutput);
    hadPreviousOutput = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    await cp(stagedOutput, projectOutput, {
      recursive: true,
      force: true,
      dereference: true,
    });
    await access(join(projectOutput, "index.html"));
  } catch (error) {
    if (hadPreviousOutput) {
      try {
        await rename(projectOutput, failedOutput);
      } catch (moveError) {
        if (moveError?.code !== "ENOENT") throw moveError;
      }
      await rename(previousOutput, projectOutput);
    }
    throw error;
  }
}

function runNext(cwd, cli) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "build"], {
      cwd,
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Next build interrompido pelo sinal ${signal}.`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}
