import urllib.request
import json
import os

def download_wikimedia_category(category_name, output_dir):
    # Why is this implemented: Downloads all pre-sliced, transparent game assets from Wikimedia Commons
    # to avoid the complexity of manually slicing a custom sprite sheet.
    
    # Setup directory
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 1. Fetch the list of files in the category using the MediaWiki API
    api_url = f"https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:{category_name}&cmnamespace=6&cmlimit=50&format=json"
    
    headers = {'User-Agent': 'VibeCodingBot/1.0 (Python/urllib)'}
    req = urllib.request.Request(api_url, headers=headers)
    
    print(f"Fetching file list for Category:{category_name}...")
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error connecting to Wikimedia API: {e}")
        return

    members = data.get('query', {}).get('categorymembers', [])
    if not members:
        print("No files found in this category.")
        return

    print(f"Found {len(members)} files. Fetching download URLs...")

    # 2. For each file, get the actual image URL and download it
    for member in members:
        title = member['title']
        # Replace spaces with underscores for the API call
        title_url = urllib.parse.quote(title)
        
        imageinfo_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={title_url}&prop=imageinfo&iiprop=url&format=json"
        req_info = urllib.request.Request(imageinfo_url, headers=headers)
        
        try:
            with urllib.request.urlopen(req_info) as response_info:
                info_data = json.loads(response_info.read().decode())
                
                # Parse the nested JSON structure to extract the URL
                pages = info_data.get('query', {}).get('pages', {})
                for page_id, page_info in pages.items():
                    if 'imageinfo' in page_info:
                        img_url = page_info['imageinfo'][0]['url']
                        
                        # Clean up filename (remove 'File:')
                        filename = title.replace("File:", "").replace(" ", "_")
                        filepath = os.path.join(output_dir, filename)
                        
                        # Download the actual image
                        print(f"Downloading {filename}...")
                        req_img = urllib.request.Request(img_url, headers=headers)
                        with urllib.request.urlopen(req_img) as img_response, open(filepath, 'wb') as out_file:
                            out_file.write(img_response.read())
                            
        except Exception as e:
            print(f"Error downloading {title}: {e}")

    print("Download complete!")

if __name__ == "__main__":
    download_wikimedia_category("Dinosaur_Game", "assets_wikimedia")
