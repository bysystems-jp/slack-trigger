function _today(): Temporal.PlainDate {
	return Temporal.Now.instant().toZonedDateTimeISO("Asia/Tokyo").toPlainDate();
}

export class HolidayDetector {
	static async instantiate(
		date: Temporal.PlainDate,
		_fetch: (url: string) => Promise<Response> = fetch,
	): Promise<HolidayDetector> {
		const url = `https://holidays-jp.github.io/api/v1/${date.year}/date.json`;
		const response = await _fetch(url);
		if (!response.ok) {
			throw new Error(`failed to fetch: ${response.status}`);
		}

		const raw = await response.json();
		if (typeof raw !== "object") {
			throw new Error(`Unexpected type: ${typeof raw}`);
		}
		if (Object.keys(raw).some((k) => typeof k !== "string")) {
			throw new Error(`Unexpected type: ${typeof raw}`);
		}
		return new HolidayDetector(raw);
	}

	#data: Record<string, unknown>;

	constructor(data: Record<string, unknown>) {
		this.#data = data;
	}

	isHoliday(date: Temporal.PlainDate): boolean {
		return date.toString() in this.#data;
	}
}

async function isHoliday(date: Temporal.PlainDate): Promise<boolean> {
	// https://holidays-jp.github.io/
	const { default: holidays } = await import(`./date/${date.year}.json`, {
		with: { type: "json" },
	});
	return date.toString() in holidays;
}

async function afterBusinessDay(
	date: Temporal.PlainDate,
): Promise<Temporal.PlainDate> {
	while (
		date.dayOfWeek === 6 ||
		date.dayOfWeek === 7 ||
		(await isHoliday(date))
	) {
		date = date.add({ days: 1 });
	}

	return date;
}

export async function isAfterBusinessDay(
	day: number,
	today: Temporal.PlainDate = _today(),
): Promise<boolean> {
	const target = await afterBusinessDay(today.with({ day }));
	return target.equals(today);
}

if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	it("is okay", async () => {
		const tests: [number, Temporal.PlainDate, boolean][] = [
			[21, new Temporal.PlainDate(2026, 5, 20), false],
			[21, new Temporal.PlainDate(2026, 5, 21), true],
			[21, new Temporal.PlainDate(2026, 5, 22), false],

			[21, new Temporal.PlainDate(2026, 6, 20), false],
			[21, new Temporal.PlainDate(2026, 6, 21), false], // Sunday
			[21, new Temporal.PlainDate(2026, 6, 22), true],
			[21, new Temporal.PlainDate(2026, 6, 23), false],

			[21, new Temporal.PlainDate(2026, 9, 20), false],
			[21, new Temporal.PlainDate(2026, 9, 21), false], // Holiday
			[21, new Temporal.PlainDate(2026, 9, 22), false], // Holiday
			[21, new Temporal.PlainDate(2026, 9, 23), false], // Holiday
			[21, new Temporal.PlainDate(2026, 9, 24), true],
			[21, new Temporal.PlainDate(2026, 9, 25), false],
		];

		for (const t of tests) {
			await expect(isAfterBusinessDay(t[0], t[1])).resolves.toBe(t[2]);
		}
	});
}
