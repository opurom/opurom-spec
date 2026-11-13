#!/usr/bin/env node
// CI entry point: the validate job runs this file. The checks live in
// validate-contracts.mjs so the test suite can import them without spawning.
import { runContracts } from './validate-contracts.mjs';

process.exitCode = runContracts(process.argv);
