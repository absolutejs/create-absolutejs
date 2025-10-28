import { spawn } from 'bun';

type ExecResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

export async function exec(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs?: number,
): Promise<ExecResult> {
  const fullCmd = `${cmd} ${args.join(' ')}`;
  console.log(`\x1b[90m$ ${fullCmd}\x1b[0m`);

  const proc = spawn({
    cmd: [cmd, ...args],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeoutMs)
    : undefined;

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;

  if (timer) clearTimeout(timer);

  if (timedOut) {
    return {
      ok: false,
      code: 124, 
      stdout,
      stderr: `Command timed out after ${timeoutMs}ms\n${stderr}`,
    };
  }

  return {
    ok: code === 0,
    code,
    stdout,
    stderr,
  };
}

export function runCLI(
  cliPath: string,
  flags: string[],
  projectName: string,
  timeout: number,
): Promise<ExecResult> {
  return exec('bun', ['run', cliPath, ...flags, projectName], process.cwd(), timeout);
}