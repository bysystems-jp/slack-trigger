#!/usr/bin/env node

import { HolidayDetector, isAfterBusinessDay, today } from "../src/date.ts";

const [dayText] = process.argv.slice(2);
if (typeof dayText === "undefined") {
	throw new Error("%prog day");
}
const day = Number.parseInt(dayText, 10);
if (!Number.isFinite(day)) {
	throw new Error("day must be integer");
}

const detector = await HolidayDetector.instantiate(day);
const t = today();
if (!isAfterBusinessDay(day, t, detector)) {
	process.exit(1);
}
