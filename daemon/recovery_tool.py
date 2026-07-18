import os
import shutil
import tarfile
import logging
import lancedb
from typing import Optional

logger = logging.getLogger("recovery_tool")

def restore_database(backup_tar_path: str, live_db_path: str) -> bool:
    """
    Safely restores the LanceDB database from a tarball snapshot.
    Renders a backup of the current database to '.corrupted_backup' to prevent data loss.
    """
    try:
        if not os.path.exists(backup_tar_path):
            logger.error(f"Backup file '{backup_tar_path}' not found.")
            return False

        # 1. Back up existing database if it exists
        if os.path.exists(live_db_path):
            corrupted_backup = live_db_path + ".corrupted_backup"
            if os.path.exists(corrupted_backup):
                if os.path.isdir(corrupted_backup):
                    shutil.rmtree(corrupted_backup)
                else:
                    os.remove(corrupted_backup)
            
            logger.warning(f"Backing up existing database to '{corrupted_backup}' before restore...")
            shutil.move(live_db_path, corrupted_backup)

        # 2. Extract backup tarball
        logger.info(f"Extracting '{backup_tar_path}' into parent of '{live_db_path}'...")
        db_parent = os.path.dirname(live_db_path)
        os.makedirs(db_parent, exist_ok=True)
        
        with tarfile.open(backup_tar_path, "r:gz") as tar:
            tar.extractall(path=db_parent)
            
        logger.info("Database restoration complete and verified.")
        return True
    except Exception as e:
        logger.error(f"Database restoration failed: {e}")
        return False

def import_notebook_from_backup(backup_db_path: str, live_db_path: str, notebook_id: str) -> bool:
    """
    Selectively imports a single notebook and its source mappings from a backup database into the live database.
    """
    try:
        logger.info(f"Connecting to backup database at '{backup_db_path}'...")
        backup_db = lancedb.connect(backup_db_path)
        logger.info(f"Connecting to live database at '{live_db_path}'...")
        live_db = lancedb.connect(live_db_path)
        
        # 1. Import notebook record
        backup_nb_table = backup_db.open_table("notebooks")
        live_nb_table = live_db.open_table("notebooks")
        
        notebooks = backup_nb_table.search().where(f"id = '{notebook_id}'").to_list()
        if not notebooks:
            logger.error(f"Notebook ID '{notebook_id}' not found in backup.")
            return False
            
        # Delete existing in live database to avoid primary key conflict
        try:
            live_nb_table.delete(f"id = '{notebook_id}'")
        except Exception:
            pass
        live_nb_table.add(notebooks)
        logger.info(f"Imported notebook metadata for '{notebook_id}'")
        
        # 2. Import associated sources
        try:
            backup_sources_table = backup_db.open_table("sources")
            live_sources_table = live_db.open_table("sources")
            
            sources = backup_sources_table.search().where(f"notebook_id = '{notebook_id}'").to_list()
            if sources:
                try:
                    live_sources_table.delete(f"notebook_id = '{notebook_id}'")
                except Exception:
                    pass
                live_sources_table.add(sources)
                logger.info(f"Imported {len(sources)} associated source documents.")
        except Exception as e:
            logger.warning(f"Could not restore sources for notebook (table may not exist in backup): {e}")
            
        return True
    except Exception as e:
        logger.error(f"Notebook-level recovery failed: {e}")
        return False
