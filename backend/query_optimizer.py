import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("query_optimizer")

def create_vector_index(table, column_name: str = "vector") -> bool:
    """
    Creates an IVF-PQ vector index on a LanceDB table to accelerate semantic searches.
    Note: LanceDB requires at least 256 rows in the table to build an index.
    """
    try:
        row_count = len(table)
        if row_count >= 256:
            logger.info(f"Building IVF-PQ vector index on table '{table.name}' ({row_count} rows)...")
            table.create_index(
                num_partitions=16,
                num_sub_vectors=96,
                vector_column_name=column_name,
                replace=True
            )
            logger.info("Vector index successfully created.")
            return True
        else:
            logger.debug(f"Table '{table.name}' has only {row_count} rows. Skipping index creation (min 256 required).")
    except Exception as e:
        logger.error(f"Failed to create vector index on table '{table.name}': {e}")
    return False

def optimized_vector_search(table, query_vector: List[float], filter_query: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Performs an optimized vector search on LanceDB.
    If filter_query is provided, applies pre-filtering to scan only matching rows,
    which is much faster and ensures tenant/notebook isolation.
    """
    try:
        search_builder = table.search(query_vector)
        if filter_query:
            # prefilter=True runs the filter BEFORE vector distance calculations
            search_builder = search_builder.where(filter_query, prefilter=True)
        return search_builder.limit(limit).to_list()
    except Exception as e:
        logger.error(f"Optimized vector search failed on table '{table.name}': {e}")
        # Fallback to post-filtering if pre-filtering fails due to older LanceDB version/driver issues
        try:
            search_builder = table.search(query_vector)
            if filter_query:
                search_builder = search_builder.where(filter_query, prefilter=False)
            return search_builder.limit(limit).to_list()
        except Exception as e_inner:
            logger.error(f"Fallback search failed: {e_inner}")
            return []
