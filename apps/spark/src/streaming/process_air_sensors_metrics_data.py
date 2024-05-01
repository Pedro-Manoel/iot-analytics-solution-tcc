from pyspark.sql import SparkSession
from pyspark.sql.functions import expr, from_json, col, when, from_utc_timestamp
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, TimestampType

# Constantes
KAFKA_BOOTSTRAP_SERVERS = "kafka:29092"
KAFKA_READ_TOPIC = "raw_air_sensors_data"
KAFKA_WRITE_TOPIC = "processed_air_sensors_metrics_data"

# Criação da sessão Spark
spark = SparkSession.builder \
    .appName("ProcessAirSensorsMetricsData") \
    .config("spark.sql.jsonGenerator.ignoreNullFields", "false") \
    .getOrCreate()

# Definição do esquema do arquivo JSONL
json_schema = StructType([
    StructField("id", IntegerType()),
    StructField("municipality", StringType())
])

# Leitura do arquivo JSONL
json_df = spark.read.json("/src/data/immutable_air_sensors_metrics_data.jsonl", json_schema)

# Definição do esquema do tópico Kafka
kafka_schema = StructType([
    StructField("id", StringType()),
    StructField("pm2_5", DoubleType()),
    StructField("humidity", IntegerType()),
    StructField("temperature", IntegerType()),
    StructField("pressure", DoubleType()),
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

# Aplica a equação de correção LRAPA no pm2_5
transformed_df = joined_df.withColumn(
    "pm2_5",
    when(col('pm2_5') == 0, 0)
    .otherwise(expr('round(0.5 * `pm2_5` - 0.66, 2)'))
)

# A umidade do sensor é, em média, 4% menor que a umidade do ambiente
transformed_df = transformed_df.withColumn(
    "humidity",
    expr('round(`humidity` * 1.04, 2)')
)

# Trasnforma a temperatura de Fahrenheit(F) para Celsius(C)
transformed_df = transformed_df.withColumn(
    "temperature",
    when(col('temperature') == 0, 0)
    .otherwise(expr('round(((`temperature` - 8) - 32) * 5/9, 2)'))
) 

# Realiza o arredondamento do valor da pressão
transformed_df = transformed_df.withColumn(
    "pressure",
    expr('round(pressure, 2)')
) 

# Transforma a data para o fuso horário do Brasil
transformed_df = transformed_df.withColumn(
    "date",
    from_utc_timestamp("date", "America/Sao_Paulo")
)

# Escrita no novo tópico Kafka
query = transformed_df \
    .selectExpr("to_json(struct(*)) AS value") \
    .writeStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("topic", KAFKA_WRITE_TOPIC) \
    .option("checkpointLocation", "data/checkpoint/processed_air_sensors_metrics_data") \
    .start()

query.awaitTermination()