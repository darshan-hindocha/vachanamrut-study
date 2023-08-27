import os
import pickle
import pinecone
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Pinecone
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.llms import OpenAI
from langchain.chains.question_answering import load_qa_chain
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_API_ENV = os.getenv('PINECONE_API_ENV')


def read_pdf_data(file_path):
    loader = PyPDFLoader(file_path)
    return loader.load()


def get_text_splits(data):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    return text_splitter.split_documents(data)


def get_embeddings(api_key, local_file='embeddings.pkl'):
    # Check if embeddings exist locally
    if os.path.exists(local_file):
        print("Loading embeddings from local file...")
        with open(local_file, 'rb') as f:
            embeddings = pickle.load(f)
    else:
        embeddings = OpenAIEmbeddings(openai_api_key=api_key)
        # Save embeddings to a local file
        with open(local_file, 'wb') as f:
            pickle.dump(embeddings, f)
    return embeddings


def upload_to_pinecone(texts, embeddings, index_name):
    pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_API_ENV)
    return Pinecone.from_texts([t.page_content for t in texts], embeddings, index_name=index_name)


def search_documents(docsearch, query):
    return docsearch.similarity_search(query)


def question_answering(llm, docs, prompt):
    chain = load_qa_chain(llm, chain_type="stuff")
    return chain.run(input_documents=docs, question=prompt)


def main():
    # Read data from PDF
    data = read_pdf_data("./english_vachanamrut.pdf")

    # Get text splits
    texts = get_text_splits(data)

    # Generate embeddings
    embeddings = get_embeddings(OPENAI_API_KEY)

    # Upload to Pinecone
    pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_API_ENV)
    # pinecone.create_index("yogi", dimension=1536, metric="cosine")
    # docsearch = upload_to_pinecone(texts, embeddings, "yogi")
    docsearch = Pinecone.from_existing_index("yogi", embeddings)

    # Search documents
    query = "What are the three levels of vairagya?"
    docs = search_documents(docsearch, query)

    # Question Answering
    llm = OpenAI(temperature=0, openai_api_key=OPENAI_API_KEY)
    answer = question_answering(llm, docs, query)

    print(answer)


if __name__ == "__main__":
    main()
