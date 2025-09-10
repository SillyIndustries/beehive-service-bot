import { mkdirSync } from 'fs';
import { join } from 'path';
import { isMainThread, Worker, parentPort, workerData } from 'worker_threads';

type JobFunction = (
  workingDir: string,
  env: NodeJS.ProcessEnv,
  ...args: any[]
) => Promise<any> | any;

function createWorkingDir() {
  const id = Math.random().toString(36).slice(2);
  const path = join(process.cwd(), 'jobs', 'job_' + id);
  mkdirSync(path, { recursive: true });
  return path;
}

export function defineJob(func: JobFunction) {
  if (isMainThread) {
    // hacky way to get the caller file path
    const err = new Error();
    const stack = err.stack?.split('\n')[2];
    const match = stack?.match(/at file:\/\/(.*):\d+:\d+/);
    const filePath = (match ? match[1] : 'unknown').replace(/\.ts$/, '.js');
    if (filePath === 'unknown')
      throw new Error('Could not determine file path of the job.');

    return (...args: any[]) => {
      const workingDir = createWorkingDir();
      return new Promise<any>((resolve, reject) => {
        const worker = new Worker(filePath, {
          workerData: { workingDir, args },
        });

        worker.once('message', (value) => {
          if (value?.error)
            reject(new Error(value.error))
          else
            resolve(value);
        });

        worker.once('error', reject);
        worker.once('exit', (code) => {
          if (code !== 0)
            reject(new Error(`Worker exited with code ${code}`));
        });
      });
    };
  }

  (async () => {
    try {
      const { workingDir, args } = workerData as {
        workingDir: string;
        args: any[];
      };
      const res = await func(workingDir, process.env, ...args);
      parentPort?.postMessage(res);
    } catch (e: any) {
      parentPort?.postMessage({ error: e?.stack || String(e) });
    }
  })();

  return () => {};
}
