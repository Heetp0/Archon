import os
import lancedb
import pyarrow as pa
import logging

logger = logging.getLogger("schema_migration")

def migrate_database(db_path: str) -> None:
    """
    Scans all tables in the LanceDB database and adds a user_id column
    with default value 'default_user' to support multi-user scoping.
    """
    logger.info(f"Connecting to database at '{db_path}' for schema migration check...")
    try:
        db = lancedb.connect(db_path)
    except Exception as e:
        logger.error(f"Cannot connect to database: {e}")
        return
        
    table_names = db.table_names()
    logger.info(f"Database contains tables: {table_names}")
    
    for name in table_names:
        try:
            table = db.open_table(name)
            schema = table.schema
            
            # Check if user_id is already in schema
            if "user_id" in schema.names:
                logger.debug(f"Table '{name}' already has user_id column. Skipping.")
                continue
                
            logger.info(f"Migrating table '{name}' to add 'user_id' column...")
            
            # Fetch existing records
            records = table.search().to_list()
            
            # Add user_id to existing records
            for r in records:
                r["user_id"] = "default_user"
                
            # Recreate table with new records and updated schema
            # 1. Capture old schema fields
            fields = list(schema)
            # 2. Append user_id field
            fields.append(pa.field("user_id", pa.string()))
            new_schema = pa.schema(fields)
            
            # 3. Recreate table
            # Delete old table
            db.drop_table(name)
            # Re-create with new schema
            new_table = db.create_table(name, schema=new_schema)
            if records:
                new_table.add(records)
                
            logger.info(f"Successfully migrated table '{name}' with {len(records)} records.")
            
        except Exception as e:
            logger.error(f"Failed to migrate table '{name}': {e}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
    WORKSPACE_ROOT = os.path.dirname(DAEMON_DIR)
    db_path = os.path.join(WORKSPACE_ROOT, ".lancedb")
    migrate_database(db_path)
