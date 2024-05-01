from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

# Constantes
KAFKA_BOOTSTRAP_SERVERS = "kafka:29092"
KAFKA_READ_TOPIC = "raw_air_sensors_historical_data"
KAFKA_WRITE_TOPIC = "processed_air_sensors_historical_data"

# Criação da sessão Spark
spark = SparkSession.builder \
    .appName("ProcessAirSensorsHistoricalData") \
    .config("spark.sql.jsonGenerator.ignoreNullFields", "false") \
    .getOrCreate()

# Definição do esquema do tópico Kafka
kafka_schema = StructType([
    StructField("municipality", StringType()),
    StructField("pm2_5", DoubleType()),
    StructField("date", TimestampType())
])

# Leitura do tópico Kafka
kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("subscribe", KAFKA_READ_TOPIC) \
    .load() \
    .selectExpr("CAST(value AS STRING)") \
    .select(from_json(col("value"), kafka_schema).alias("data")) \
    .select("data.*")

# Escrita no novo tópico Kafka
query = kafka_df \
    .selectExpr("to_json(struct(*)) AS value") \
    .writeStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
    .option("topic", KAFKA_WRITE_TOPIC) \
    .option("checkpointLocation", "data/checkpoint/process_historical_air_sensor_data") \
    .start()

query.awaitTermination()