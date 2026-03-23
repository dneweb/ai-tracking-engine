from typing import Dict, Optional
from app.services.ai_service import get_embedding, chat_completion
from app.services.database import search_similar_documents, add_query_log


async def answer_question(
    question: str,
    top_k: int = 3,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_name: Optional[str] = None,
) -> Dict:
    """Answer a question using RAG and log the query"""
    try:
        # Step 1: Generate question embedding
        question_embedding = get_embedding(question)
        
        if not question_embedding:
            return {
                "question": question,
                "answer": "Sorry, I couldn't process your question.",
                "confidence": 0.0,
                "sources": []
            }
        
        # Step 2: Search for similar documents
        similar_docs = await search_similar_documents(
            query_embedding=question_embedding,
            match_threshold=0.1,
            match_count=top_k
        )
        
        if not similar_docs:
            # Log failed query
            await add_query_log(
                question=question,
                answer="No relevant documentation found.",
                confidence=0.0,
                retrieved_doc_id=None,
                retrieved_doc_title=None,
                category=None,
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
            )
            return {
                "question": question,
                "answer": "I couldn't find any relevant documentation to answer your question.",
                "confidence": 0.0,
                "sources": []
            }
        
        # Step 3: Take best matching document
        best_doc = similar_docs[0]
        context = best_doc['content']
        confidence = best_doc['similarity']
        
        # Step 4: Generate answer using Groq
        answer_result = chat_completion(prompt=question, context=context)
        answer = answer_result.get('answer', 'Sorry, I could not generate an answer.')
        
        # Step 5: Log query to database
        await add_query_log(
            question=question,
            answer=answer,
            confidence=confidence,
            retrieved_doc_id=best_doc['id'],
            retrieved_doc_title=best_doc['title'],
            category=best_doc.get('category'),
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
        )
        
        # Step 6: Prepare sources
        sources = [
            {
                "id": doc['id'],
                "title": doc['title'],
                "category": doc.get('category'),
                "similarity": doc['similarity']
            }
            for doc in similar_docs
        ]
        
        return {
            "question": question,
            "answer": answer,
            "confidence": confidence,
            "sources": sources
        }
        
    except Exception as e:
        print(f"Error in RAG: {e}")
        import traceback
        traceback.print_exc()
        return {
            "question": question,
            "answer": f"An error occurred: {str(e)}",
            "confidence": 0.0,
            "sources": []
        }