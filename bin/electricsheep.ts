#!/usr/bin/env node

import { program } from "../src/cli.js";

program.parseAsync(process.argv);
