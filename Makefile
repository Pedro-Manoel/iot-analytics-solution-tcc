# -----------------------------------------------
# Constantes 
# -----------------------------------------------

# Usuário no docker hub
DOCKER_USER = 

# Nome da rede
NETWORK = iot_analytics

# Lista de serviços
APPS_SERVICES = nifi kafka spark druid superset
APIS_SERVICES = historical simulator token

# Portas dos APPS
NIFI_PORT = 8443
KAFKA_PORT = 8086
DRUID_PORT = 18888
DRUID_MINIO_PORT = 9000
SUPERSET_PORT = 8088
SPARK_PORT = 4040

# Portas das APIS
HISTORICAL_PORT = 3001
SIMULATOR_PORT = 3002
TOKEN_PORT = 3003

# Detecta o sistema operacional para definir o comando de abrir o navegador
ifeq ($(OS),Windows_NT)
    OPEN_CMD = cmd /C start
else
    UNAME_S := $(shell uname -s)
    ifeq ($(UNAME_S),Linux)
        OPEN_CMD = xdg-open
    endif
    ifeq ($(UNAME_S),Darwin)
        OPEN_CMD = open
    endif
endif

# -----------------------------------------------
# Defines 
# -----------------------------------------------

# Template para cada serviço, de app, no docker
define DOCKER_APPS_SERVICE_TEMPLATE
.PHONY: $(1)-up $(1)-down $(1)-start $(1)-stop $(1)-logs $(1)-clean $(1)-open $(1)-push

# Cria o serviço $(1) e o inicia
$(1)-up:
	docker compose -p $(1) -f ./apps/$(1)/setup/docker-compose.yml up -d

# Para o serviço $(1) e o remove
$(1)-down:
	docker compose -p $(1) -f ./apps/$(1)/setup/docker-compose.yml down

# Inicia o serviço $(1)
$(1)-start:
	docker compose -p $(1) -f ./apps/$(1)/setup/docker-compose.yml start

# Para o serviço $(1)
$(1)-stop:
	docker compose -p $(1) -f ./apps/$(1)/setup/docker-compose.yml stop

# Mostra os logs do serviço $(1)
$(1)-logs:
	docker compose -p $(1) -f ./apps/$(1)/setup/docker-compose.yml logs

# Para o serviço $(1) o remove e apaga os volumes
$(1)-clean:
	docker compose -p $(1) -f ./apps/$(1)/setup/docker-compose.yml down -v

# Abre o serviço $(1) no navegador
$(1)-open:
	$(OPEN_CMD) http://localhost:$(2)

# Faz o push da imagem do serviço $(2) para o docker hub
$(1)-push:
	docker push $(DOCKER_USER)/$(1):latest
endef

# Template para cada serviço, de api, no docker
define DOCKER_APIS_SERVICE_TEMPLATE
.PHONY: $(1)-build $(1)-run $(1)-start $(1)-stop $(1)-logs $(1)-rm $(1)-rmi $(1)-push

# Cria a imagem do serviço $(2)
$(1)-build:
	docker build -t $(2) ./apis/$(2)

# Cria o container do serviço $(2)
$(1)-run:
	docker run -d --name $(2) --network $(NETWORK) -p $(3):$(3) $(2)

# Inicia o serviço $(2)
$(1)-start:
	docker start $(2)

# Para o serviço $(2)
$(1)-stop:
	docker stop $(2)

# Mostra os logs do serviço $(2)
$(1)-logs:
	docker logs $(2) -f

# Para e Remove o serviço $(2)
$(1)-rm:
	docker rm $(2)

# Apaga a imagem do serviço $(2)
$(1)-rmi:
	docker rmi $(2)

# Faz o push da imagem do serviço $(2) para o docker hub
$(1)-push:
	docker push $(DOCKER_USER)/$(2):latest
endef

# -----------------------------------------------
# Comandos e Regas
# -----------------------------------------------

# Cria a rede docker
create-network:
	docker network create $(NETWORK)

# Exclui a rede docker
delete-network:
	docker network rm $(NETWORK)
	
# Gera as regras para cada serviço, de app, no docker
$(eval $(call DOCKER_APPS_SERVICE_TEMPLATE,nifi,${NIFI_PORT}/nifi))
$(eval $(call DOCKER_APPS_SERVICE_TEMPLATE,kafka,${KAFKA_PORT}))
$(eval $(call DOCKER_APPS_SERVICE_TEMPLATE,druid,${DRUID_PORT}))
$(eval $(call DOCKER_APPS_SERVICE_TEMPLATE,superset,${SUPERSET_PORT}))
$(eval $(call DOCKER_APPS_SERVICE_TEMPLATE,spark,${SPARK_PORT}))

# Gera as regras para cada serviço, de api, no docker
$(eval $(call DOCKER_APIS_SERVICE_TEMPLATE,historical,air-quality-sensors-historical,${HISTORICAL_PORT}))
$(eval $(call DOCKER_APIS_SERVICE_TEMPLATE,simulator,purpleair-simulator,${SIMULATOR_PORT}))
$(eval $(call DOCKER_APIS_SERVICE_TEMPLATE,token,purpleair-token,${TOKEN_PORT}))

# Gera regras gerais para todos os serviços, de app, no docker
apps-up: $(addsuffix -up, $(APPS_SERVICES)) # Cria e inicia todos os serviços
apps-down: $(addsuffix -down, $(APPS_SERVICES)) # Para e remove todos os serviços
apps-start: $(addsuffix -start, $(APPS_SERVICES)) # Inicia todos os serviços
apps-stop: $(addsuffix -stop, $(APPS_SERVICES)) # Para todos os serviços
apps-clean: $(addsuffix -clean, $(APPS_SERVICES)) # Para e remove todos os serviços e apaga os volumes
apps-open: $(addsuffix -open, $(APPS_SERVICES)) # Abre todos os serviços no navegador

# Gera regras gerais para todos os serviços, de api, no docker
apis-build: $(addsuffix -build, $(APIS_SERVICES)) # Cria as imagens de todos os serviços
apis-run: $(addsuffix -run, $(APIS_SERVICES)) # Cria os containers de todos os serviços
apis-start: $(addsuffix -start, $(APIS_SERVICES)) # Inicia todos os serviços
apis-stop: $(addsuffix -stop, $(APIS_SERVICES)) # Para todos os serviços
apis-logs: $(addsuffix -logs, $(APIS_SERVICES)) # Mostra os logs de todos os serviços
apis-rm: $(addsuffix -rm, $(APIS_SERVICES)) # Para e Remove todos os serviços
apis-rmi: $(addsuffix -rmi, $(APIS_SERVICES)) # Apaga as imagens de todos os serviços

# -----------------------------------------------
# Comandos e Regas Extras
# -----------------------------------------------

# Comando para abrir o Minio do Druid no navegador
open-druid-minio:
	$(OPEN_CMD) http://localhost:${DRUID_MINIO_PORT}

# Comando para iniciar algum job no Spark
spark-submit:
	docker exec -it spark-master spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0 /src/streaming/$(job).py

# Comando para limpar o checkpoint do Spark
spark-clean-checkpoint:
	docker exec -it spark-master rm -r data/checkpoint

# Comando para criar uma imagem docker do superset
superset-build:
	docker build -t ${DOCKER_USER}/superset:latest  ./apps/superset/setup/project

# Comando para apagar a imagem docker do superset
superset-rmi:
	docker rmi superset