import os

folder = r'C:\Users\Home\.gemini'
search_bytes = b'Create a clone of the Google Chrome dinosaur game'

found = []
for root, dirs, files in os.walk(folder):
    for f in files:
        path = os.path.join(root, f)
        if 'antigravity-ide' in path: continue # Skip the current IDE logs
        try:
            with open(path, 'rb') as file:
                data = file.read()
                if search_bytes in data:
                    found.append(path)
        except Exception:
            pass

print("Found in:")
for p in found:
    print(p)
