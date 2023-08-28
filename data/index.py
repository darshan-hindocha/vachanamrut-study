import os
import json
import pickle
import pinecone

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Pinecone
from langchain.embeddings.openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_API_ENV = os.getenv('PINECONE_API_ENV')


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


def get_vachanamrut_english_for_upsert():
    # load text from vachanamrut_data_markdown.json
    with open("anirdesh/vachanamrut_data_markdown.json", "r") as f:
        data = json.load(f)

    # for each paragraph in each vachanamrut, split using text splitter and create corresponding metadata object

    meta = []
    texts = []
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=20)
    for vachanamrut in data:
        for i, paragraph in enumerate(vachanamrut['paragraphs']):
            paragraphs = text_splitter.create_documents([paragraph.replace("\n", " ")])
            for p in paragraphs:
                meta.append({
                    "title": vachanamrut['title'],
                    "paragraph": i + 1,
                    "vachanamrut_number": vachanamrut['vachanamrut_number']
                })
                texts.append(p)

    return meta, texts


def upsert_to_pinecone(texts, meta, index_name="yogi"):
    embeddings = get_embeddings(OPENAI_API_KEY)

    pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_API_ENV)
    # upsert to pinecone
    Pinecone.from_texts([t.page_content for t in texts], embeddings, metadatas=meta, index_name=index_name)

if __name__ == "__main__":
    metadata, split_texts = get_vachanamrut_english_for_upsert()
    upsert_to_pinecone(split_texts, metadata)
