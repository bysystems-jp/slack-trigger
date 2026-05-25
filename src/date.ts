export function today(): Temporal.PlainDate {
	return Temporal.Now.instant().toZonedDateTimeISO("Asia/Tokyo").toPlainDate();
}

export class HolidayDetector {
	static async instantiate(
		year: number,
		_fetch: (url: string) => Promise<Response> = fetch,
	): Promise<HolidayDetector> {
		const url = `https://holidays-jp.github.io/api/v1/${year}/date.json`;
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

function afterBusinessDay(
	date: Temporal.PlainDate,
	detector: HolidayDetector,
): Temporal.PlainDate {
	while (
		date.dayOfWeek === 6 ||
		date.dayOfWeek === 7 ||
		detector.isHoliday(date)
	) {
		date = date.add({ days: 1 });
	}

	return date;
}

export function isAfterBusinessDay(
	day: number,
	today: Temporal.PlainDate,
	detector: HolidayDetector,
): boolean {
	const target = afterBusinessDay(today.with({ day }), detector);
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

		const detecotr = await HolidayDetector.instantiate(2026);
		for (const t of tests) {
			expect(isAfterBusinessDay(t[0], t[1], detecotr)).toBe(t[2]);
		}
	});
}
