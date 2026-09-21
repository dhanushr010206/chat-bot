import io
import json
import pandas as pd
import numpy as np

class DataAnalystService:
    @staticmethod
    def analyze_dataset(file_bytes: bytes, ext: str) -> dict:
        """
        Analyzes a CSV/Excel file and returns metadata, statistics, 
        and recommended Chart.js configurations.
        """
        try:
            if ext == 'csv':
                df = pd.read_csv(io.BytesIO(file_bytes))
            elif ext in ['xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(file_bytes))
            else:
                return {"error": "Unsupported file format for data analysis."}
            
            if df.empty:
                return {"error": "Dataset is empty."}
            
            # 1. Basic Metadata
            row_count, col_count = df.shape
            columns = df.columns.tolist()
            
            # 2. Column Types and Missing Values
            col_info = []
            numeric_cols = []
            categorical_cols = []
            
            for col in columns:
                dtype = str(df[col].dtype)
                missing = int(df[col].isna().sum())
                unique = int(df[col].nunique())
                
                ctype = "Numeric" if pd.api.types.is_numeric_dtype(df[col]) else "Categorical"
                if ctype == "Numeric":
                    numeric_cols.append(col)
                else:
                    if unique < 20: # Arbitrary threshold for categorical vs text
                        categorical_cols.append(col)
                        
                col_info.append({
                    "name": col,
                    "type": ctype,
                    "dtype": dtype,
                    "missing": missing,
                    "unique": unique
                })
                
            # 3. Summary Statistics for Numeric Columns
            stats = {}
            if numeric_cols:
                # dropna for stats
                desc = df[numeric_cols].describe().to_dict()
                # sanitize nan/inf for json
                for col, s in desc.items():
                    stats[col] = {k: (None if pd.isna(v) or np.isinf(v) else v) for k, v in s.items()}
                    
            # 4. Generate Recommended Chart Specs (Chart.js)
            charts = []
            
            # Categorical vs Numeric (Bar Chart)
            if categorical_cols and numeric_cols:
                cat_col = categorical_cols[0]
                num_col = numeric_cols[0]
                # Group by cat_col and sum num_col
                grouped = df.groupby(cat_col)[num_col].sum().nlargest(10)
                charts.append({
                    "type": "bar",
                    "title": f"Top 10 {cat_col} by {num_col}",
                    "labels": grouped.index.astype(str).tolist(),
                    "datasets": [{
                        "label": num_col,
                        "data": grouped.values.tolist(),
                        "backgroundColor": "rgba(54, 162, 235, 0.6)",
                        "borderColor": "rgba(54, 162, 235, 1)",
                        "borderWidth": 1
                    }]
                })
                
            # Categorical distribution (Doughnut Chart)
            if categorical_cols:
                cat_col = categorical_cols[0] if len(categorical_cols) == 1 else categorical_cols[1] if len(categorical_cols) > 1 else categorical_cols[0]
                counts = df[cat_col].value_counts().nlargest(5)
                charts.append({
                    "type": "doughnut",
                    "title": f"Distribution of Top 5 {cat_col}",
                    "labels": counts.index.astype(str).tolist(),
                    "datasets": [{
                        "data": counts.values.tolist(),
                        "backgroundColor": [
                            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"
                        ]
                    }]
                })
                
            # Time Series / Sequential Data (Line Chart)
            # Find a column that looks like a date or sequence
            date_col = None
            for col in columns:
                if 'date' in col.lower() or 'time' in col.lower() or 'year' in col.lower():
                    date_col = col
                    break
            
            if date_col and numeric_cols:
                num_col = numeric_cols[0]
                try:
                    df_sorted = df.sort_values(by=date_col).head(50)
                    charts.append({
                        "type": "line",
                        "title": f"{num_col} over {date_col} (First 50)",
                        "labels": df_sorted[date_col].astype(str).tolist(),
                        "datasets": [{
                            "label": num_col,
                            "data": df_sorted[num_col].tolist(),
                            "fill": False,
                            "borderColor": "#4BC0C0",
                            "tension": 0.1
                        }]
                    })
                except Exception:
                    pass

            return {
                "success": True,
                "metadata": {
                    "rows": row_count,
                    "columns": col_count
                },
                "columns": col_info,
                "statistics": stats,
                "charts": charts,
                # Provide a markdown string representation for LLM context
                "llm_context": df.head(10).to_markdown()
            }
            
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}
