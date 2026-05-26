package jp.bysystems.slacktrigger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

public class MainTest {
    HolidayDetector detector() {
        return new HolidayDetector(
                Set.of(
                        "2026-01-01",
                        "2026-01-12",
                        "2026-02-11",
                        "2026-02-23",
                        "2026-03-20",
                        "2026-04-29",
                        "2026-05-03",
                        "2026-05-04",
                        "2026-05-05",
                        "2026-05-06",
                        "2026-07-20",
                        "2026-08-11",
                        "2026-09-21",
                        "2026-09-22",
                        "2026-09-23",
                        "2026-10-12",
                        "2026-11-03",
                        "2026-11-23"));
    }

    @ParameterizedTest
    @MethodSource("testAfterBusinessDayParams")
    void testAfterBusinessDay(int day, LocalDate today, boolean match) {
        assertEquals(new Main().isAfterBusinessDay(day, today, detector()), match);
    }

    @ParameterizedTest
    @MethodSource("testBeforeBusinessDayParams")
    void testBeforeBusinessDay(int day, LocalDate today, boolean match) {
        assertEquals(new Main().isBeforeBusinessDay(day, today, detector()), match);
    }

    static Stream<Arguments> testAfterBusinessDayParams() {
        return Stream.of(
                arguments(21, LocalDate.of(2026, 5, 20), false),
                arguments(21, LocalDate.of(2026, 5, 21), true),
                arguments(21, LocalDate.of(2026, 5, 22), false),
                arguments(21, LocalDate.of(2026, 6, 20), false),
                arguments(21, LocalDate.of(2026, 6, 21), false), // Sunday
                arguments(21, LocalDate.of(2026, 6, 22), true),
                arguments(21, LocalDate.of(2026, 6, 23), false),
                arguments(21, LocalDate.of(2026, 9, 20), false),
                arguments(21, LocalDate.of(2026, 9, 21), false), // Holiday
                arguments(21, LocalDate.of(2026, 9, 22), false), // Holiday
                arguments(21, LocalDate.of(2026, 9, 23), false), // Holiday
                arguments(21, LocalDate.of(2026, 9, 24), true),
                arguments(21, LocalDate.of(2026, 9, 25), false));
    }

    static Stream<Arguments> testBeforeBusinessDayParams() {
        return Stream.of(
                arguments(31, LocalDate.of(2026, 1, 29), false),
                arguments(31, LocalDate.of(2026, 1, 30), true),
                arguments(31, LocalDate.of(2026, 1, 31), false), // Saturday
                arguments(31, LocalDate.of(2026, 2, 26), false),
                arguments(31, LocalDate.of(2026, 2, 27), true),
                arguments(31, LocalDate.of(2026, 2, 28), false), // Saturday
                arguments(31, LocalDate.of(2026, 3, 30), false),
                arguments(31, LocalDate.of(2026, 3, 31), true),
                arguments(31, LocalDate.of(2026, 5, 28), false),
                arguments(31, LocalDate.of(2026, 5, 29), true),
                arguments(31, LocalDate.of(2026, 5, 30), false), // Saturday
                arguments(31, LocalDate.of(2026, 12, 30), false),
                arguments(31, LocalDate.of(2026, 12, 31), true));
    }
}
