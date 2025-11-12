import { describe, expect, it } from 'bun:test';

import {
  buildScaffoldArguments,
  cleanupProject,
  installDependencies,
  runCommand,
  scaffoldProject,
  startServer
} from './index';

describe('behavioural test harness', () => {
  it('exposes scaffold helpers', () => {
    expect(scaffoldProject).toBeInstanceOf(Function);
    expect(installDependencies).toBeInstanceOf(Function);
    expect(cleanupProject).toBeInstanceOf(Function);
  });

  it('exposes runtime helpers', () => {
    expect(startServer).toBeInstanceOf(Function);
    expect(runCommand).toBeInstanceOf(Function);
    expect(buildScaffoldArguments('example', {})).toBeInstanceOf(Array);
  });
});

