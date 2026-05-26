FROM amazoncorretto:26 AS builder

RUN dnf install -y findutils

COPY . /build
WORKDIR /build
RUN ./gradlew shadowJar

FROM amazoncorretto:26-alpine

COPY --from=builder /build/build/libs/slack-trigger-all.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
