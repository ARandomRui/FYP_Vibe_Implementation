import re

def get_strings(filename, min_length=20):
    with open(filename, 'rb') as f:
        data = f.read()
    strings = re.findall(b'[a-zA-Z0-9\s.,!?:;\"\'\(\)\{\}\[\]\-\+\=\_\/\@\#\$\%\^\&\*]{' + str(min_length).encode() + b',}', data)
    return [s.decode('utf-8', errors='ignore') for s in strings]

strs = get_strings(r'C:\Users\Home\.gemini\antigravity-backup\conversations\77042a5a-fbec-4ef3-b47b-e7761a5200e7.pb', 20)
for s in strs:
    if 'Google Chrome dinosaur game' in s or 'Create a clone of' in s:
        print('--- MATCH ---')
        print(s[:500])
