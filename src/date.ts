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

function beforeBusinessDay(
	date: Temporal.PlainDate,
	detector: HolidayDetector,
): Temporal.PlainDate {
	while (
		date.dayOfWeek === 6 ||
		date.dayOfWeek === 7 ||
		detector.isHoliday(date)
	) {
		date = date.add({ days: -1 });
	}

	return date;
}

export function isBeforeBusinessDay(
	day: number,
	today: Temporal.PlainDate,
	detector: HolidayDetector,
): boolean {
	const target = beforeBusinessDay(today.with({ day }), detector);
	return target.equals(today);
}

if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	const detecotr = new HolidayDetector({
		"2026-01-01": "元日",
		"2026-01-12": "成人の日",
		"2026-02-11": "建国記念の日",
		"2026-02-23": "天皇誕生日",
		"2026-03-20": "春分の日",
		"2026-04-29": "昭和の日",
		"2026-05-03": "憲法記念日",
		"2026-05-04": "みどりの日",
		"2026-05-05": "こどもの日",
		"2026-05-06": "憲法記念日 振替休日",
		"2026-07-20": "海の日",
		"2026-08-11": "山の日",
		"2026-09-21": "敬老の日",
		"2026-09-22": "国民の休日",
		"2026-09-23": "秋分の日",
		"2026-10-12": "スポーツの日",
		"2026-11-03": "文化の日",
		"2026-11-23": "勤労感謝の日",
	});

	it.each([
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
	])("isAfterBusinessDay(%s, %s) -> %s", (a, b, c) => {
		expect(isAfterBusinessDay(a, b, detecotr)).toBe(c);
	});

	it.each([
		[31, new Temporal.PlainDate(2026, 1, 29), false],
		[31, new Temporal.PlainDate(2026, 1, 30), true],
		[31, new Temporal.PlainDate(2026, 1, 31), false], // Saturday

		[31, new Temporal.PlainDate(2026, 2, 26), false],
		[31, new Temporal.PlainDate(2026, 2, 27), true],
		[31, new Temporal.PlainDate(2026, 2, 28), false], // Saturday

		[31, new Temporal.PlainDate(2026, 3, 30), false],
		[31, new Temporal.PlainDate(2026, 3, 31), true],

		[31, new Temporal.PlainDate(2026, 5, 28), false],
		[31, new Temporal.PlainDate(2026, 5, 29), true],
		[31, new Temporal.PlainDate(2026, 5, 30), false], // Saturday

		[31, new Temporal.PlainDate(2026, 12, 30), false],
		[31, new Temporal.PlainDate(2026, 12, 31), true],
	])("isBeforeBusinessDay(%s, %s) -> %s", (a, b, c) => {
		expect(isBeforeBusinessDay(a, b, detecotr)).toBe(c);
	});
}
