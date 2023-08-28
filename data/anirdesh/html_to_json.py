import os
import json
import html2text
from bs4 import BeautifulSoup


def extract_vachanamrut_data(html_content):
    # Initialize a BeautifulSoup object to parse the HTML content
    soup = BeautifulSoup(html_content, 'html.parser')

    # Initialize html2text object
    h = html2text.HTML2Text()
    h.ignore_links = True

    # Extract title
    title = h.handle(soup.find('h1', {'class': 'title_en'}).text) if soup.find('h1', {
        'class': 'title_en'}) else "Title not found"

    # Extract section number
    section_number = h.handle(soup.find('h3', {'class': 'pra_secno'}).text) if soup.find('h3', {
        'class': 'pra_secno'}) else "Section number not found"

    # Extract chapter content
    chapter_content_paragraphs = soup.find_all('p', {'class': 'text_en'})
    chapter_content = [h.handle(str(p)) for p in chapter_content_paragraphs]

    return {
        'title': title.strip(),
        'vachanamrut_number': section_number.strip(),
        'paragraphs': [p.strip() for p in chapter_content]
    }


if __name__ == "__main__":
    # Directory containing the HTML files
    html_dir = "./vachanamrut_raw_html"  # Update this path
    output_json_file = "vachanamrut_data_markdown.json"  # Output JSON file name

    vachanamrut_data = []

    for html_file in os.listdir(html_dir):
        if html_file.endswith(".html"):
            with open(os.path.join(html_dir, html_file), 'r', encoding='utf-8') as file:
                html_content = file.read()
            vachanamrut_data.append(extract_vachanamrut_data(html_content))

    # Save to JSON file
    with open(output_json_file, 'w', encoding='utf-8') as f:
        json.dump(vachanamrut_data, f, ensure_ascii=False, indent=4)
