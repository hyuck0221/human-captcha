# Stage 1: Build the application
FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /app

# Copy gradle wrapper and config files
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Ensure gradlew has correct permissions and line endings
RUN chmod +x ./gradlew

# Copy source code
COPY src src

# Build the JAR (clean then bootJar)
RUN ./gradlew clean bootJar -x test --no-daemon

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

# Copy only the executable jar
# Build result is usually at build/libs/human-captcha-0.0.1-SNAPSHOT.jar
COPY --from=build /app/build/libs/human-captcha-*.jar app.jar

EXPOSE 8080

# Recommended memory settings for container
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
