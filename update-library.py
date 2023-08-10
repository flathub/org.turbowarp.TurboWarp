import json
import aiohttp
import asyncio
import hashlib

async def get_assets():
  async with aiohttp.ClientSession() as session:
    semaphore = asyncio.Semaphore(20)

    async def fetch_asset(md5ext):
      async with semaphore:
        url = f'https://scratch-assets.scratch.org/{md5ext}'
        print(f'Downloading {url}')
        async with session.get(url) as resp:
          content = await resp.content.read()
          sha256 = hashlib.sha256(content).hexdigest()
          return {
            'type': 'file',
            'url': url,
            'sha256': sha256,
            'dest': 'uncompressed/library-files',
            'dest-filename': md5ext
          }

    async def fetch_json(url):
      async with session.get(url) as resp:
        content = await resp.content.read()
        return json.loads(content)

    md5exts = set()
    def add_asset(md5ext):
      md5exts.add(md5ext)
    for costume in await fetch_json('https://raw.githubusercontent.com/TurboWarp/scratch-gui/develop/src/lib/libraries/costumes.json'):
      add_asset(costume['md5ext'])
    for sound in await fetch_json('https://raw.githubusercontent.com/TurboWarp/scratch-gui/develop/src/lib/libraries/sounds.json'):
      add_asset(sound['md5ext'])
    for backdrop in await fetch_json('https://raw.githubusercontent.com/TurboWarp/scratch-gui/develop/src/lib/libraries/backdrops.json'):
      add_asset(backdrop['md5ext'])
    for sprite in await fetch_json('https://raw.githubusercontent.com/TurboWarp/scratch-gui/develop/src/lib/libraries/sprites.json'):
      for costume in sprite['costumes']:
        add_asset(costume['md5ext'])
      for sound in sprite['sounds']:
        add_asset(sound['md5ext'])

    md5exts = sorted(md5exts)
    tasks = [asyncio.ensure_future(fetch_asset(md5ext)) for md5ext in md5exts]
    return await asyncio.gather(*tasks)

sources = asyncio.run(get_assets())
with open('library-sources.json', 'w') as f:
  f.write(json.dumps(sources, indent=4))
