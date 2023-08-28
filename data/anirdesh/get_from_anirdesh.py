import os
import time
import requests


def fetch_and_save(url, folder_name, file_name):
    response = requests.get(url)

    if response.status_code == 200:
        page_content = response.text

        # Optionally, you can parse the content with BeautifulSoup
        # soup = BeautifulSoup(page_content, 'html.parser')

        # Create folder if it doesn't exist
        if not os.path.exists(folder_name):
            os.makedirs(folder_name)

        with open(f"{folder_name}/{file_name}.html", "w", encoding='utf-8') as f:
            f.write(page_content)

        print(f"Saved {file_name}.html")
    else:
        print(f"Failed to fetch {url}")


if __name__ == "__main__":
    for i in range(1, 274):
        time.sleep(1)
        url = f"https://www.anirdesh.com/vachanamrut/index.php?format=en&vachno={i}"
        fetch_and_save(url, "vachanamrut_raw_html", f"vachanamrut_{i}")
