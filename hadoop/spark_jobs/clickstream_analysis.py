"""
Spark Analytics Job: Clickstream Analysis
Analyzes user behavior patterns from clickstream data
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, avg, sum as _sum, min as _min, max as _max
from pyspark.sql.functions import unix_timestamp, from_unixtime, window, lag, lead
from pyspark.sql.window import Window
from datetime import datetime, timedelta
import sys

def create_spark_session():
    """Create Spark session"""
    return SparkSession.builder \
        .appName("ClickstreamAnalysis") \
        .config("spark.sql.warehouse.dir", "/user/hive/warehouse") \
        .enableHiveSupport() \
        .getOrCreate()

def analyze_clickstream(spark, date_str):
    """
    Analyze clickstream data for a specific date
    
    Args:
        spark: SparkSession
        date_str: Date string in YYYY-MM-DD format
    """
    print(f"📊 Processing clickstream for {date_str}")
    
    # Read clickstream from HDFS
    hdfs_path = f"hdfs://namenode:9000/data/clickstream/{date_str}/events.jsonl"
    
    try:
        # Read JSON Lines
        df = spark.read.json(hdfs_path)
        
        # 1. Session Analysis
        # Define session window (30 minutes of inactivity = new session)
        window_spec = Window.partitionBy("visitor_id").orderBy("timestamp")
        
        df_with_session = df.withColumn(
            "prev_timestamp",
            lag("timestamp").over(window_spec)
        )
        
        # Calculate time difference and session boundaries
        from pyspark.sql.functions import when, unix_timestamp
        df_sessions = df_with_session.withColumn(
            "time_diff_seconds",
            when(
                col("prev_timestamp").isNotNull(),
                unix_timestamp("timestamp") - unix_timestamp("prev_timestamp")
            ).otherwise(0)
        ).withColumn(
            "new_session",
            when(col("time_diff_seconds") > 1800, 1).otherwise(0)  # 30 min = 1800 sec
        )
        
        # 2. Session Metrics
        session_metrics = df_sessions.groupBy("visitor_id").agg(
            count("*").alias("total_events"),
            count(when(col("event_type") == "pageview", 1)).alias("pageviews"),
            count(when(col("event_type") == "add_to_cart", 1)).alias("add_to_cart_events"),
            count(when(col("event_type") == "purchase", 1)).alias("purchases"),
            (unix_timestamp(_max("timestamp")) - unix_timestamp(_min("timestamp"))).alias("session_duration_seconds")
        )
        
        # Calculate bounce rate (single page sessions)
        bounce_rate = session_metrics.filter(col("pageviews") == 1).count() / session_metrics.count() * 100
        
        print(f"\n📈 Session Metrics:")
        print(f"   Bounce Rate: {bounce_rate:.2f}%")
        session_metrics.show(10)
        
        # 3. Page Flow Analysis (Top Entry and Exit Pages)
        entry_pages = df_sessions.groupBy("visitor_id").agg(
            _min("timestamp").alias("first_event_time")
        ).join(
            df_sessions,
            (df_sessions.visitor_id == col("visitor_id")) & (df_sessions.timestamp == col("first_event_time")),
            "inner"
        ).groupBy("page_url").agg(
            count("*").alias("entry_count")
        ).orderBy(col("entry_count").desc()).limit(10)
        
        print("\n🚪 Top Entry Pages:")
        entry_pages.show()
        
        # 4. Event Type Distribution
        event_dist = df.groupBy("event_type").agg(
            count("*").alias("count")
        ).orderBy(col("count").desc())
        
        print("\n📊 Event Type Distribution:")
        event_dist.show()
        
        # 5. Conversion Funnel
        funnel_data = df.groupBy("visitor_id").agg(
            count(when(col("event_type") == "pageview", 1)).alias("viewed"),
            count(when(col("event_type") == "add_to_cart", 1)).alias("added_to_cart"),
            count(when(col("event_type") == "purchase", 1)).alias("purchased")
        )
        
        total_visitors = funnel_data.count()
        viewers = funnel_data.filter(col("viewed") > 0).count()
        cart_users = funnel_data.filter(col("added_to_cart") > 0).count()
        purchasers = funnel_data.filter(col("purchased") > 0).count()
        
        print(f"\n🔄 Conversion Funnel:")
        print(f"   Total Visitors: {total_visitors}")
        print(f"   Viewers: {viewers} ({viewers/total_visitors*100:.2f}%)")
        print(f"   Cart Users: {cart_users} ({cart_users/total_visitors*100:.2f}%)")
        print(f"   Purchasers: {purchasers} ({purchasers/total_visitors*100:.2f}%)")
        
        # 6. User Engagement Scores
        engagement_scores = session_metrics.withColumn(
            "engagement_score",
            (col("pageviews") * 1.0 + 
             col("add_to_cart_events") * 3.0 + 
             col("purchases") * 10.0 +
             col("session_duration_seconds") / 60.0)  # Duration in minutes
        )
        
        print("\n⭐ Top Engaged Users:")
        engagement_scores.orderBy(col("engagement_score").desc()).show(10)
        
        # Save results to HDFS (Parquet format)
        output_base = f"hdfs://namenode:9000/analytics/user_behavior/{date_str}"
        
        session_metrics.write.mode("overwrite").parquet(f"{output_base}/session_metrics")
        entry_pages.write.mode("overwrite").parquet(f"{output_base}/entry_pages")
        event_dist.write.mode("overwrite").parquet(f"{output_base}/event_distribution")
        engagement_scores.write.mode("overwrite").parquet(f"{output_base}/engagement_scores")
        
        # Save funnel as JSON for easy consumption
        funnel_result = spark.createDataFrame([
            ("visitors", total_visitors),
            ("viewers", viewers),
            ("cart_users", cart_users),
            ("purchasers", purchasers)
        ], ["stage", "count"])
        funnel_result.write.mode("overwrite").json(f"{output_base}/funnel_analysis")
        
        print(f"\n✅ Results saved to {output_base}")
        
        return {
            "date": date_str,
            "total_events": df.count(),
            "total_visitors": total_visitors,
            "bounce_rate": bounce_rate,
            "conversion_rate": (purchasers / total_visitors * 100) if total_visitors > 0 else 0
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
    
    print(f"🚀 Starting Clickstream Analysis for {date_str}")
    
    # Create Spark session
    spark = create_spark_session()
    
    try:
        # Process clickstream
        result = analyze_clickstream(spark, date_str)
        
        print(f"\n✅ Job completed successfully!")
        print(f"   Date: {result['date']}")
        print(f"   Total Events: {result['total_events']}")
        print(f"   Total Visitors: {result['total_visitors']}")
        print(f"   Bounce Rate: {result['bounce_rate']:.2f}%")
        print(f"   Conversion Rate: {result['conversion_rate']:.2f}%")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()
