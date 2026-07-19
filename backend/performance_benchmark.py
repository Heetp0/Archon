import os
import sys
import time
import json
import asyncio
import numpy as np
from typing import List, Dict, Any
from fastapi.testclient import TestClient

# Ensure parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from quiz_manager import QuizManager
import lancedb

class ArchonBenchmark:
    def __init__(self):
        self.client = TestClient(app)
        # Find database path from environment or default
        DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
        WORKSPACE_ROOT = os.path.dirname(DAEMON_DIR)
        self.db_path = os.path.join(WORKSPACE_ROOT, ".lancedb")
        self.db = lancedb.connect(self.db_path)
        self.qm = QuizManager(db_connection=self.db)

    def calculate_percentiles(self, latencies: List[float]) -> Dict[str, float]:
        if not latencies:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0}
        return {
            "p50": float(np.percentile(latencies, 50)),
            "p95": float(np.percentile(latencies, 95)),
            "p99": float(np.percentile(latencies, 99)),
            "mean": float(np.mean(latencies))
        }

    def test_semantic_search(self, count: int = 50) -> Dict[str, float]:
        """Measure semantic search query latency on LanceDB."""
        latencies = []
        # Create a mock vector (e.g. 1536 dims)
        mock_vector = [0.1] * 1536
        try:
            table = self.db.open_table("sources")
        except Exception:
            # Seed mock sources if table doesn't exist
            import pyarrow as pa
            schema = pa.schema([
                pa.field("id", pa.string()),
                pa.field("user_id", pa.string()),
                pa.field("notebook_id", pa.string()),
                pa.field("content", pa.string()),
                pa.field("vector", pa.list_(pa.float32(), 1536))
            ])
            table = self.db.create_table("sources", schema=schema, exist_ok=True)
            table.add([{
                "id": "mock_source_1",
                "user_id": "default_user",
                "notebook_id": "default_notebook",
                "content": "Sample content about aerospace and control systems.",
                "vector": mock_vector
            }])

        for _ in range(count):
            start = time.time()
            try:
                table.search(mock_vector).limit(5).to_list()
            except Exception:
                pass
            latencies.append(time.time() - start)
        return self.calculate_percentiles(latencies)

    def test_chat_latency(self, count: int = 20) -> Dict[str, float]:
        """Measure chat response streaming start latency."""
        latencies = []
        for i in range(count):
            start = time.time()
            # Send RAG chat request
            response = self.client.post(
                "/notebooks/default_notebook/chat",
                json={"query": f"Test question {i} about control loops.", "history": []}
            )
            latencies.append(time.time() - start)
        return self.calculate_percentiles(latencies)

    def test_dashboard_load(self, count: int = 30) -> Dict[str, float]:
        """Measure dashboard page load endpoints latency (todos, status, and health)."""
        latencies = []
        for _ in range(count):
            start = time.time()
            # Hit dashboard metrics endpoints
            self.client.get("/tutor/analytics/summary")
            self.client.get("/tutor/analytics/topic-breakdown")
            latencies.append(time.time() - start)
        return self.calculate_percentiles(latencies)

    def test_quiz_validation(self, count: int = 30) -> Dict[str, float]:
        """Measure SymPy math validation latency."""
        latencies = []
        for i in range(count):
            start = time.time()
            # Send validation request
            payload = {
                "student_answer": f"x = {4 + i}",
                "ground_truth": f"x = {4 + i}",
                "validation_type": "algebra"
            }
            self.client.post("/tutor/validate-math", json=payload)
            latencies.append(time.time() - start)
        return self.calculate_percentiles(latencies)

    def test_analytics_aggregation(self, count: int = 10) -> Dict[str, float]:
        """Measure aggregation query time over 10k attempts."""
        # Check if we need to seed 10,000 attempts
        try:
            attempts_table = self.db.open_table("quiz_attempts")
        except Exception:
            self.qm.seed_sample_questions()
            attempts_table = self.db.open_table("quiz_attempts")
            
        row_count = len(attempts_table)
        if row_count < 10000:
            print(f"Seeding mock attempts to reach 10,000 (currently {row_count})...")
            # Batch add mock attempts
            batch = []
            for i in range(10000 - row_count):
                batch.append({
                    "attempt_id": f"perf_mock_{i}",
                    "notebook_id": "default_notebook",
                    "question_id": f"q_{i % 5}",
                    "student_id": "default_student",
                    "attempt_number": 1,
                    "status": "graded",
                    "is_correct": i % 2 == 0,
                    "score": 1.0 if i % 2 == 0 else 0.0,
                    "timestamp_started": 1234567.0 + i,
                    "timestamp_submitted": 1234567.0 + i + 10,
                    "time_spent_seconds": 10,
                    "hints_requested": 0,
                    "max_hint_level_viewed": 0,
                    "answers_json": "[]",
                    "final_answer_json": "{}",
                    "feedback_json": "{}",
                    "metadata_json": "{}"
                })
                if len(batch) >= 2000:
                    attempts_table.add(batch)
                    batch = []
            if batch:
                attempts_table.add(batch)
            print("Completed seeding 10,000 attempts.")

        latencies = []
        for _ in range(count):
            start = time.time()
            self.client.get("/tutor/analytics/learning-curve")
            latencies.append(time.time() - start)
        return self.calculate_percentiles(latencies)

    def run_all_benchmarks(self) -> Dict[str, Any]:
        print("Starting Archon Performance Benchmarks...")
        
        # Build vector index if rows > 256
        try:
            from query_optimizer import create_vector_index
            create_vector_index(self.db.open_table("sources"))
        except Exception:
            pass

        results = {
            "timestamp": time.time(),
            "semantic_search": self.test_semantic_search(),
            "chat_latency": self.test_chat_latency(),
            "dashboard_load": self.test_dashboard_load(),
            "quiz_validation": self.test_quiz_validation(),
            "analytics_aggregation": self.test_analytics_aggregation()
        }

        # Save to JSON
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)
        baseline_path = os.path.join(data_dir, "performance_baseline.json")
        with open(baseline_path, "w") as f:
            json.dump(results, f, indent=2)
            
        print(f"Benchmarks completed. JSON exported to {baseline_path}")
        
        # Generate HTML report
        try:
            from performance_report import generate_html_report
            generate_html_report(results)
        except Exception as e:
            print(f"Failed to generate HTML report: {e}")

        return results

if __name__ == "__main__":
    benchmark = ArchonBenchmark()
    benchmark.run_all_benchmarks()
