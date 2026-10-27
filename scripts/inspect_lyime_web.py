#!/usr/bin/env python3
"""Inspect PUBLIC itch.io HTML5 launch metadata; print only URL and relevant markup.
Do not download proprietary sprites, WASM, PCK or executables."""
import urllib.request,urllib.parse,re,html,sys,json
SITE="https://lyime.itch.io/pixel-portrait-creator"
HEADERS={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36","Accept":"text/html,application/xhtml+xml"}
def get(url):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=18) as response:
        content=response.read(6000000)
        print("STATUS",response.status,"FINAL",response.url,"BYTES",len(content),"CHARSET",response.headers.get_content_charset())
        print("HEADERS",json.dumps({key:response.headers.get(key) for key in ("content-security-policy","x-frame-options","cross-origin-opener-policy","cross-origin-embedder-policy","cross-origin-resource-policy","server")},ensure_ascii=False))
        return content.decode("utf-8","replace")
for suffix in ("","?click_to_load=true","?embed=1"):
    print("==== PAGE",suffix)
    try:s=get(SITE+suffix)
    except Exception as e:
        print("FETCH_ERROR",str(e));continue
    decoded=html.unescape(s)
    for pattern in [r'<iframe\b[^>]{0,1400}>',r'\bdata-iframe\s*=\s*(["\'])(.*?)\1',r'\bdata-src\s*=\s*(["\'])(.*?)\1',
      r'https?[^\s"\'<>]{0,150}embed-upload[^\s"\'<>]{0,200}',r'https?[^\s"\'<>]{0,150}itch\.zone[^\s"\'<>]{0,200}',
      r'\b(?:load_game|game_frame|html_embed|play_game|embed-upload|game_embed)\b']:
        results=list(re.finditer(pattern,decoded,re.I|re.S))
        print("PATTERN",pattern,"COUNT",len(results))
        for m in results[:5]:
            i=m.start()
            fragment=decoded[max(0,i-250):i+800]
            print("FRAGMENT",re.sub(r'\s+',' ',fragment)[:950])
    try:
        p=re.search(r'<div[^>]+(?:game_frame|game_embed|html_embed)[^>]*>',decoded,re.I)
        if p:print("FRAME DIV",re.sub(r'\s+',' ',p.group(0))[:1600])
    except:pass
