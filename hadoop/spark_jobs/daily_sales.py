"""
Spark Analytics Job: Daily Sales Report
Processes orders from HDFS and generates daily sales aggregates
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum as _sum, count, avg
from datetime import datetime, timedelta
import sys

def create_spark_session():
    """Create Spark session"""
    return SparkSession.builder \
        .appName("DailySalesReport") \
        .config("spark.sql.warehouse.dir", "/user/hive/warehouse") \
        .enableHiveSupport() \
        .getOrCreate()

def process_daily_sales(spark, date_str):
    """
    Process orders for a specific date and generate sales report
    
    Args:
        spark: SparkSession
        date_str: Date string in YYYY-MM-DD format
    """
    print(f"📊 Processing sales for {date_str}")
    
    # Read orders from HDFS (JSON Lines format)
    hdfs_path = f"hdfs://namenode:9000/data/orders/{date_str}/orders.jsonl"
    
    try:
        # Read JSON Lines
        df = spark.read.json(hdfs_path)
        
        # Explode items array to get individual products
        from pyspark.sql.functions import explode
        items_df = df.select(
            col("order_id"),
            col("user_id"),
            col("total"),
            col("status"),
            col("created_at"),
            explode("items").alias("item")
        )
        
        # Extract item fields
        sales_df = items_df.select(
            col("order_id"),
            col("user_id"),
            col("status"),
            col("item.product_id").alias("product_id"),
            col("item.product_name").alias("product_name"),
            col("item.category_id").alias("category_id"),
            col("item.shop_id").alias("shop_id"),
            col("item.quantity").alias("quantity"),
            col("item.price").alias("price"),
            (col("item.quantity") * col("item.price")).alias("item_total")
        )
        
        # 1. Sales by Category
        category_sales = sales_df.groupBy("category_id").agg(
            _sum("item_total").alias("total_sales"),
            count("order_id").alias("order_count"),
            _sum("quantity").alias("total_quantity"),
            avg("price").alias("avg_price")
        ).orderBy(col("total_sales").desc())
        
        print("\n📈 Sales by Category:")
        category_sales.show()
        
        # 2. Sales by Shop
        shop_sales = sales_df.groupBy("shop_id").agg(
            _sum("item_total").alias("total_sales"),
            count("order_id").alias("order_count"),
            _sum("quantity").alias("total_quantity")
        ).orderBy(col("total_sales").desc())
        
        print("\n🏪 Sales by Shop:")
        shop_sales.show()
        
        # 3. Top Products
        product_sales = sales_df.groupBy("product_id", "product_name").agg(
            _sum("item_total").alias("total_sales"),
            _sum("quantity").alias("total_quantity")
        ).orderBy(col("total_sales").desc()).limit(10)
        
        print("\n🔥 Top 10 Products:")
        product_sales.show()
        
        # 4. Order Status Distribution
        status_dist = sales_df.groupBy("status").agg(
            count("order_id").alias("count")
        )
        
        print("\n📦 Order Status Distribution:")
        status_dist.show()
        
        # Save results to HDFS (Parquet format for efficient querying)
        output_base = f"hdfs://namenode:9000/analytics/daily_sales/{date_str}"
        
        category_sales.write.mode("overwrite").parquet(f"{output_base}/by_category")
        shop_sales.write.mode("overwrite").parquet(f"{output_base}/by_shop")
        product_sales.write.mode("overwrite").parquet(f"{output_base}/top_products")
        status_dist.write.mode("overwrite").parquet(f"{output_base}/status_distribution")
        
        print(f"\n✅ Results saved to {output_base}")
        
        return {
            "date": date_str,
            "total_orders": sales_df.select("order_id").distinct().count(),
            "total_items": sales_df.count(),
            "total_revenue": sales_df.agg(_sum("item_total")).collect()[0][0]
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
    
    print(f"🚀 Starting Spark job for {date_str}")
    
    # Create Spark session
    spark = create_spark_session()
    
    try:
        # Process sales
        result = process_daily_sales(spark, date_str)
        
        print(f"\n✅ Job completed successfully!")
        print(f"   Date: {result['date']}")
        print(f"   Orders: {result['total_orders']}")
        print(f"   Items: {result['total_items']}")
        print(f"   Revenue: ${result['total_revenue']:.2f}")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()
