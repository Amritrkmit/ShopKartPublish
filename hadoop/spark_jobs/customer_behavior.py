"""
Spark Analytics Job: Customer Behavior Analysis
Performs RFM segmentation and customer lifetime value analysis
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum as _sum, avg, max as _max, min as _min, datediff, current_date
from datetime import datetime, timedelta
import sys

def create_spark_session():
    """Create Spark session"""
    return SparkSession.builder \
        .appName("CustomerBehaviorAnalysis") \
        .config("spark.sql.warehouse.dir", "/user/hive/warehouse") \
        .enableHiveSupport() \
        .getOrCreate()

def analyze_customer_behavior(spark, date_str):
    """
    Analyze customer behavior using RFM (Recency, Frequency, Monetary) analysis
    
    Args:
        spark: SparkSession
        date_str: Date string in YYYY-MM-DD format
    """
    print(f"📊 Processing customer behavior for {date_str}")
    
    # Read orders from HDFS (last 90 days for RFM analysis)
    start_date = (datetime.strptime(date_str, '%Y-%m-%d') - timedelta(days=90)).strftime('%Y-%m-%d')
    
    # Read all order files from the date range
    hdfs_path = f"hdfs://namenode:9000/data/orders/*/orders.jsonl"
    
    try:
        # Read JSON Lines
        df = spark.read.json(hdfs_path)
        
        # Filter to last 90 days
        df_filtered = df.filter(
            (col("created_at") >= start_date) & 
            (col("created_at") <= date_str)
        )
        
        print(f"✅ Loaded {df_filtered.count()} orders from last 90 days")
        
        # 1. RFM Analysis
        from pyspark.sql.functions import to_date, lit
        
        # Calculate Recency (days since last purchase)
        recency_df = df_filtered.groupBy("user_id").agg(
            datediff(lit(date_str), _max("created_at")).alias("recency_days")
        )
        
        # Calculate Frequency (number of orders)
        frequency_df = df_filtered.groupBy("user_id").agg(
            count("order_id").alias("frequency")
        )
        
        # Calculate Monetary (total spend)
        monetary_df = df_filtered.groupBy("user_id").agg(
            _sum("total").alias("monetary_value")
        )
        
        # Combine RFM metrics
        rfm_df = recency_df \
            .join(frequency_df, "user_id") \
            .join(monetary_df, "user_id")
        
        # 2. RFM Scoring (1-5 scale, 5 being best)
        from pyspark.sql.functions import ntile
        from pyspark.sql.window import Window
        
        window_spec = Window.orderBy(col("recency_days"))
        rfm_scored = rfm_df.withColumn(
            "r_score",
            6 - ntile(5).over(window_spec)  # Reverse: lower recency = higher score
        )
        
        window_spec = Window.orderBy(col("frequency"))
        rfm_scored = rfm_scored.withColumn(
            "f_score",
            ntile(5).over(window_spec)
        )
        
        window_spec = Window.orderBy(col("monetary_value"))
        rfm_scored = rfm_scored.withColumn(
            "m_score",
            ntile(5).over(window_spec)
        )
        
        # Calculate RFM score
        rfm_scored = rfm_scored.withColumn(
            "rfm_score",
            col("r_score") + col("f_score") + col("m_score")
        )
        
        # 3. Customer Segmentation
        from pyspark.sql.functions import when
        
        rfm_segmented = rfm_scored.withColumn(
            "segment",
            when((col("r_score") >= 4) & (col("f_score") >= 4) & (col("m_score") >= 4), "Champions")
            .when((col("r_score") >= 3) & (col("f_score") >= 3), "Loyal Customers")
            .when((col("r_score") >= 4) & (col("f_score") <= 2), "Promising")
            .when((col("r_score") <= 2) & (col("f_score") >= 3), "At Risk")
            .when((col("r_score") <= 2) & (col("f_score") <= 2), "Lost")
            .otherwise("Potential Loyalists")
        )
        
        print("\n📊 Customer Segments:")
        segment_dist = rfm_segmented.groupBy("segment").agg(
            count("*").alias("customer_count"),
            avg("monetary_value").alias("avg_spend")
        ).orderBy(col("customer_count").desc())
        segment_dist.show()
        
        # 4. Customer Lifetime Value (CLV) Estimation
        # Simple CLV = Avg Order Value × Purchase Frequency × Customer Lifespan
        clv_df = rfm_segmented.withColumn(
            "avg_order_value",
            col("monetary_value") / col("frequency")
        ).withColumn(
            "estimated_clv",
            col("avg_order_value") * col("frequency") * 12  # Assume 1 year lifespan
        )
        
        print("\n💰 Top 10 Customers by CLV:")
        clv_df.orderBy(col("estimated_clv").desc()).select(
            "user_id", "segment", "frequency", "monetary_value", "estimated_clv"
        ).show(10)
        
        # 5. Churn Risk Analysis
        churn_risk = rfm_segmented.withColumn(
            "churn_risk",
            when(col("recency_days") > 60, "High")
            .when(col("recency_days") > 30, "Medium")
            .otherwise("Low")
        )
        
        print("\n⚠️  Churn Risk Distribution:")
        churn_dist = churn_risk.groupBy("churn_risk").agg(
            count("*").alias("customer_count")
        ).orderBy(col("customer_count").desc())
        churn_dist.show()
        
        # 6. Purchase Pattern Analysis
        # Explode items to analyze product preferences
        from pyspark.sql.functions import explode
        items_df = df_filtered.select(
            col("user_id"),
            col("order_id"),
            explode("items").alias("item")
        )
        
        category_preferences = items_df.groupBy("user_id", "item.category_id").agg(
            count("*").alias("purchase_count"),
            _sum("item.quantity").alias("total_quantity")
        )
        
        # Save results to HDFS
        output_base = f"hdfs://namenode:9000/analytics/user_behavior/{date_str}"
        
        rfm_segmented.write.mode("overwrite").parquet(f"{output_base}/rfm_segments")
        clv_df.write.mode("overwrite").parquet(f"{output_base}/customer_clv")
        churn_risk.write.mode("overwrite").parquet(f"{output_base}/churn_risk")
        category_preferences.write.mode("overwrite").parquet(f"{output_base}/category_preferences")
        segment_dist.write.mode("overwrite").parquet(f"{output_base}/segment_distribution")
        
        print(f"\n✅ Results saved to {output_base}")
        
        return {
            "date": date_str,
            "total_customers": rfm_df.count(),
            "champions": rfm_segmented.filter(col("segment") == "Champions").count(),
            "at_risk": rfm_segmented.filter(col("segment") == "At Risk").count(),
            "lost": rfm_segmented.filter(col("segment") == "Lost").count()
        }
        
    except Exception as e:
        print(f"❌ Error processing {date_str}: {str(e)}")
        raise

def main():
    """Main function"""
    # Get date from command line or use yesterday
    if len(sys.argv) > 1:
        date_str = sys.argv[1]
    else:
        yesterday = datetime.now() - timedelta(days=1)
        date_str = yesterday.strftime('%Y-%m-%d')
    
    print(f"🚀 Starting Customer Behavior Analysis for {date_str}")
    
    # Create Spark session
    spark = create_spark_session()
    
    try:
        # Process customer behavior
        result = analyze_customer_behavior(spark, date_str)
        
        print(f"\n✅ Job completed successfully!")
        print(f"   Date: {result['date']}")
        print(f"   Total Customers: {result['total_customers']}")
        print(f"   Champions: {result['champions']}")
        print(f"   At Risk: {result['at_risk']}")
        print(f"   Lost: {result['lost']}")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()
