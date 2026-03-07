#!/usr/bin/env node

import { program } from "../src/cli.js";

void program.parseAsync(process.argv);
