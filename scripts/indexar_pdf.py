#!/usr/bin/env python3
"""Gera um indice PRIVADO de texto para busca local no RPG Mesa.
Nao transforma texto em regras e nao envia PDF para a internet.
Requer: python -m pip install pymupdf  (ou pypdf).
"""
from __future__ import annotations
import argparse, json, pathlib, re, sys, unicodedata

def extract(path: pathlib.Path):
    try:
        import pymupdf
        with pymupdf.open(path) as pdf:
            for i, page in enumerate(pdf):
                yield i + 1, page.get_text("text")
        return
    except ImportError:
        pass
    try:
        from pypdf import PdfReader
        reader=PdfReader(str(path))
        if reader.is_encrypted:
            raise ValueError("PDF protegido: forneca uma copia sem senha, se autorizada.")
        for i, page in enumerate(reader.pages):
            yield i+1,page.extract_text() or ""
        return
    except ImportError:
        raise RuntimeError("Instale uma biblioteca: python -m pip install pymupdf")
def trim(text: str) -> str:
    text=text.replace("\x00"," ").replace("\r","\n")
    text=unicodedata.normalize("NFC",text)
    text=re.sub(r"[\t\f\v ]+"," ",text)
    text=re.sub(r"\n{3,}","\n\n",text)
    return text.strip()
def chunks_on_page(page: int, text: str, max_length=1300, overlap=160):
    text=trim(text)
    for start in range(0,len(text),max_length-overlap):
        span=text[start:start+max_length]
        if not span.strip():continue
        yield {"page":page,"title":f"Página PDF {page} · trecho {start//(max_length-overlap)+1}","text":span}
        if start+max_length>=len(text):break
def build(pdf_path: pathlib.Path, system_id: str, edition: str, book_id: str='', limit=13000):
    pieces=[]
    for page,txt in extract(pdf_path):
        for chunk in chunks_on_page(page,txt):
            pieces.append(chunk)
            if len(pieces)>limit:
                raise ValueError(f"Índice excede {limit} trechos: divida o PDF em volumes menores.")
    if not pieces:raise ValueError("O PDF nao possui texto extraivel. OCR nao foi realizado.")
    out={"kind":"rpg-book-index-v1","systemId":system_id,"edition":edition,
        "sourceBookId":book_id,
        "book":{"title":pdf_path.stem},"chunks":pieces}
    return out
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf",type=pathlib.Path,help="PDF pessoal para indexar")
    parser.add_argument("--system",required=True,help="ID do sistema mostrado no app (ex.: d-d, gurps, ordem-paranormal)")
    parser.add_argument("--edition",default="",help="Edição (ex.: 5e-2014, 2024, 4e, 1.3)")
    parser.add_argument("--book-id",default="",help="ID do mesmo PDF no Drive, quando conhecido")
    parser.add_argument("--output",type=pathlib.Path,help="Arquivo JSON de saída")
    a=parser.parse_args()
    if not re.fullmatch(r"[a-z0-9-]{2,60}",a.system):parser.error("ID do sistema invalido")
    if a.book_id and not re.fullmatch(r"[A-Za-z0-9_-]{10,160}",a.book_id):parser.error("ID do Drive invalido")
    if not a.pdf.is_file() or a.pdf.suffix.lower()!='.pdf':parser.error("Arquivo PDF inexistente")
    result=build(a.pdf,a.system,a.edition[:30],a.book_id)
    target=a.output or a.pdf.with_suffix(".rpg-index.json")
    content=json.dumps(result,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    if len(content)>12_000_000:parser.error("JSON excedeu limite do aplicativo (12 MB). Reduza o PDF.")
    target.write_bytes(content)
    print(f"Indice criado: {target} | {len(result['chunks'])} trechos | {len(content)/1024:.1f} KiB")
    print("Texto somente neste indice e no seu computador. Importe o JSON na Consulta IA do RPG Mesa.")
    print("Paginas sao paginas FISICAS do PDF; a numeracao impressa pode ser diferente.")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("Erro:",e,file=sys.stderr);sys.exit(1)
