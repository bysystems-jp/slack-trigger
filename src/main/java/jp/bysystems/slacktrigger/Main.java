package jp.bysystems.slacktrigger;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoField;
import java.util.concurrent.Callable;
import picocli.CommandLine;

@CommandLine.Command(name = "is-businessday")
class Main implements Callable<Void> {
    @CommandLine.Parameters(index = "0")
    private Kind kind;

    @CommandLine.Parameters(index = "1")
    private int day;

    @CommandLine.Parameters(index = "2")
    private URI uri;

    LocalDate afterBusinessDay(LocalDate date, HolidayDetector detector) {
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY
                || date.getDayOfWeek() == DayOfWeek.SUNDAY
                || detector.isHoliday(date)) {
            date = date.plusDays(1);
        }

        return date;
    }

    boolean isAfterBusinessDay(int day, LocalDate today, HolidayDetector detector) {
        var target = afterBusinessDay(today.with(ChronoField.DAY_OF_MONTH, day), detector);
        return target.equals(today);
    }

    LocalDate beforeBusinessDay(LocalDate date, HolidayDetector detector) {
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY
                || date.getDayOfWeek() == DayOfWeek.SUNDAY
                || detector.isHoliday(date)) {
            date = date.plusDays(-1);
        }

        return date;
    }

    boolean isBeforeBusinessDay(int day, LocalDate today, HolidayDetector detector) {
        var target =
                beforeBusinessDay(
                        today.with(ChronoField.DAY_OF_MONTH, Math.min(day, today.lengthOfMonth())),
                        detector);
        return target.equals(today);
    }

    @Override
    public Void call() throws IOException, InterruptedException {
        var today = LocalDate.now(ZoneId.of("Asia/Tokyo"));
        var detector = HolidayDetector.instantiate(today.getYear());

        switch (this.kind) {
            case Before:
                if (!isBeforeBusinessDay(this.day, today, detector)) {
                    return null;
                }
                break;

            case After:
                if (!isAfterBusinessDay(this.day, today, detector)) {
                    return null;
                }
                break;
        }

        var client = HttpClient.newHttpClient();
        var req = HttpRequest.newBuilder(this.uri).build();
        var res = client.send(req, HttpResponse.BodyHandlers.ofString());
        System.out.println("Response: " + res.body());

        return null;
    }

    public static void main(String[] args) throws IOException, InterruptedException {
        int ret =
                new CommandLine(new Main()).setCaseInsensitiveEnumValuesAllowed(true).execute(args);

        if (ret != 0) {
            System.exit(ret);
        }
    }
}

enum Kind {
    Before,
    After,
}
