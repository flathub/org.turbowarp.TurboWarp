import json
import urllib.request
import aiohttp
import asyncio
import hashlib

def fetch_json(url):
  print(f'Fetching {url}')
  with urllib.request.urlopen(url) as response:
    contents = response.read()
    return json.loads(contents)

def get_packager():
  packager = fetch_json('https://raw.githubusercontent.com/TurboWarp/desktop/master/scripts/packager.json')
  return {
    'type': 'file',
    'url': packager['src'],
    'sha256': packager['sha256'],
    'dest': 'src-renderer/packager',
    'dest-filename': 'standalone.html'
  }

sources = [get_packager()]
with open('packager-sources.json', 'w') as f:
  f.write(json.dumps(sources, indent=4))
