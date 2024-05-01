from pyspark.sql import SparkSession
from pyspark.sql.functions import udf, from_json, col, lit, when, from_utc_timestamp, greatest
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, TimestampType

# Constantes
KAFKA_BOOTSTRAP_SERVERS = "kafka:29092"
KAFKA_READ_TOPIC = "raw_air_sensors_data"
KAFKA_WRITE_TOPIC = "processed_air_sensors_status_data"

# Funções UDF

# Função para calcular e gerar uma stringa representando a diferença entre duas datas
def time_difference(date1, date2):
    SECONDS_PER_MINUTE = 60
    SECONDS_PER_HOUR = SECONDS_PER_MINUTE * 60
    SECONDS_PER_DAY = SECONDS_PER_HOUR * 24

    difference = int((date1 - date2).total_seconds())

    days, difference = divmod(difference, SECONDS_PER_DAY)
    hours, difference = divmod(difference, SECONDS_PER_HOUR)
    minutes, seconds = divmod(difference, SECONDS_PER_MINUTE)

    return f"{days}d {hours}h {minutes}m {seconds}s"

time_difference_udf = udf(time_difference, StringType())

# Criação da sessão Spark
spark = SparkSession.builder \
    .appName("ProcessAirSensorsStatusData ") \
    .config("spark.sql.jsonGenerator.ignoreNullFields", "false") \
    .getOrCreate()

# Definição do esquema do arquivo JSONL
json_schema = StructType([
    StructField("id", IntegerType()),
    StructField("name", StringType()),
    StructField("municipality", StringType()),
    StructField("latitude", DoubleType()),
    StructField("longitude", DoubleType())
])

# Leitura do arquivo JSONL
json_df = spark.read.json("/src/data/immutable_air_sensors_status_data.jsonl", json_schema)

# Definição do esquema do tópico Kafka
kafka_schema = StructType([
    StructField("id", StringType()),
    StructField("last_seen", TimestampType()),
    StructField("rssi", IntegerType()),
    StructField("channel_status", IntegerType()),
    StructField("confidence", IntegerType()),
    StructField("date", TimestampType())
])

# Leitura do tópico Kafka
kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("subscribe", KAFKA_READ_TOPIC) \
    .option("startingOffsets", "earliest") \
    .load() \
    .selectExpr("CAST(value AS STRING)") \
    .select(from_json(col("value"), kafka_schema).alias("data")) \
    .select("data.*")

# Junção dos dados
joined_df = kafka_df.join(json_df, "id")

# Trasnforma o valor do rssi em um valor positivo no novo campo wifi, e apaga o rssi
transformed_df = joined_df \
    .withColumn(
        "wifi",
        greatest(lit(0), (lit(100) + col("rssi")))
    ) \
    .drop("rssi")


# Renomea o campo last_seen para last_reading_date
transformed_df = transformed_df \
    .withColumnRenamed("last_seen", "last_reading_date") 

# Cria o novo campo status e apaga o campo channel_status
transformed_df = transformed_df \
    .withColumn(
        "status",
        when(col('channel_status') == 0, "Normal")
        .when(col('channel_status') == 1, "Medidor A desativado")
        .when(col('channel_status') == 2, "Medidor B desativado")
        .otherwise("Desativado")
    ) \
    .drop("channel_status") 

# Transforma as datas para o fuso horário do Brasil
transformed_df = transformed_df \
    .withColumn(
        "date",
        from_utc_timestamp("date", "America/Sao_Paulo")
    ) \
    .withColumn(
        "last_reading_date",
        from_utc_timestamp("last_reading_date", "America/Sao_Paulo")
    )

# Cria campo time_since_last_reading, que é a diferença entre a data da coleta de dados do sensor e a data da última leitura
transformed_df = transformed_df.withColumn('last_reading_time_diff ', time_difference_udf(col('date'), col('last_reading_date')))

# Escrita no novo tópico Kafka
query = transformed_df \
    .selectExpr("to_json(struct(*)) AS value") \
    .writeStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("topic", KAFKA_WRITE_TOPIC) \
    .option("checkpointLocation", "data/checkpoint/process_air_sensors_status_data") \
    .start()

query.awaitTermination()