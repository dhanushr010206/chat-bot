import time
from duckduckgo_search import DDGS

class SearchService:
    @staticmethod
    def search_web(query: str, max_results: int = 5) -> list:
        try:
            results = []
            with DDGS() as ddgs:
                ddg_results = ddgs.text(query, max_results=max_results)
                if ddg_results:
                    for r in ddg_results:
                        results.append({
                            "title": r.get("title", "Untitled"),
                            "href": r.get("href", ""),
                            "body": r.get("body", "")
                        })
            return results
        except Exception as e:
            print(f"Web search error: {e}")
            return []

    @staticmethod
    def build_search_context(query: str) -> str:
        results = SearchService.search_web(query, max_results=5)
        if not results:
            return ""
            
        context_parts = ["\n[WEB SEARCH RESULTS]"]
        for i, res in enumerate(results, 1):
            context_parts.append(f"Source {i}: {res['title']} ({res['href']})\nContent: {res['body']}\n")
        context_parts.append("[END WEB SEARCH RESULTS]\n\nINSTRUCTIONS:\nIntegrate the above web search results into your answer. Clearly cite your sources by mentioning the source name or URL when providing factual information. If the results do not fully answer the user's question, state what is missing.")
        
        return "\n".join(context_parts)
