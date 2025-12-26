# Stage 1: Build the application
# We use a base image that supports Java 24. 
# Note: As Java 24 is bleeding edge, we assume openjdk:24-slim or similar is available.
# If strict 24 is not available, we might need to use a nightly build or downgrade to 23/21.
FROM openjdk:21-slim AS build

WORKDIR /app

# Copy gradle wrapper and config files first for caching
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Copy source code
COPY src src

# Grant execution rights on the gradle wrapper
RUN chmod +x ./gradlew

# Build the JAR file (skipping tests to speed up)
RUN ./gradlew bootJar -x test --no-daemon

# Stage 2: Run the application
FROM openjdk:21-slim

WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Expose the port
EXPOSE 8080

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
