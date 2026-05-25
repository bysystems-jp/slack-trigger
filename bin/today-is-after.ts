#!/usr/bin/env node

import { isAfterBusinessDay } from "../src/date.ts";

const [dayText] = process.argv.slice(2);
const day = Number.parseInt(dayText, 10);
if (!Number.isFinite(day)) {
	throw new Error("day must be integer");
}

if (!(await isAfterBusinessDay(day))) {
	process.exit(1);
}
