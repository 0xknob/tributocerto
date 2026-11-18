# Build: docker build -f docker/simples-nacional.Dockerfile .   (contexto = raiz deste repo)
# Requer upstream/calculadora-rtc-simples-nacional clonado (scripts/clone-upstream.ps1)
# Mesmo padrão do regime-regular: banco SQLite via Flyway + JAR com perfil offline.

FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY upstream/calculadora-rtc-simples-nacional/ ./
# ADR009: os scripts Flyway ficam apenas no repo regime-regular (banco compartilhado)
COPY upstream/calculadora-rtc-regime-regular/flyway/ ./flyway/
RUN chmod +x mvnw && mkdir -p calculadora/db \
    && ./mvnw flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf --batch-mode --errors \
    && ./mvnw clean package -DskipTests --batch-mode

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
COPY --from=builder /build/calculadora/db ./calculadora/db
ENV SERVER_PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-Dspring.profiles.active=offline", "-jar", "app.jar"]
