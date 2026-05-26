package jp.bysystems.slacktrigger;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

class HolidayDetector {
    private final Set<String> data;

    HolidayDetector(Set<String> data) {
        this.data = data;
    }

    boolean isHoliday(LocalDate date) {
        return this.data.contains(date.toString());
    }

    static HolidayDetector instantiate(int year) throws IOException, InterruptedException {
        var client = HttpClient.newHttpClient();

        var url = "https://holidays-jp.github.io/api/v1/%d/date.json".formatted(year);
        var req = HttpRequest.newBuilder(URI.create(url)).build();

        var res = client.send(req, HttpResponse.BodyHandlers.ofInputStream());
        try (var stream = res.body()) {
            var mapper = new ObjectMapper();
            var data = mapper.readValue(stream, new TypeReference<Map<String, String>>() {});
            return new HolidayDetector(data.keySet());
        }
    }
}
