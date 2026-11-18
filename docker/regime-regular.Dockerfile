# Build: docker build -f docker/regime-regular.Dockerfile .   (contexto = raiz deste repo)
# Requer upstream/calculadora-rtc-regime-regular clonado (scripts/clone-upstream.ps1)
#
# Estágio 1: gera o banco SQLite (Flyway, scripts SQL oficiais) + empacota o JAR
# Estágio 2: JRE enxuto com JAR + banco somente leitura

FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY upstream/calculadora-rtc-regime-regular/ ./
RUN chmod +x mvnw && mkdir -p calculadora/db \
    && ./mvnw flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf --batch-mode --errors \
    && ./mvnw clean package -DskipTests --batch-mode

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
COPY --from=builder /build/calculadora/db ./calculadora/db
ENV SERVER_PORT=8080
EXPOSE 8080
# Perfil offline: lê ./calculadora/db em modo somente leitura
ENTRYPOINT ["java", "-Dspring.profiles.active=offline", "-jar", "app.jar"]
