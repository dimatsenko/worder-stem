#!/usr/bin/env python3
"""Import the user's existing Worder CEFR dictionaries and exact content fixes."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ('word', 'translation', 'type', 'cefr', 'phon_br', 'phon_n_am', 'definition', 'example')
LEVELS = [('a1', 'Перші слова'), ('a2', 'На щодень'), ('b1', 'Вільніше спілкування'), ('b2', 'Складніші теми'), ('c1', 'Точність і нюанси')]


def key(word):
    return tuple(str(word.get(field, '')).strip() for field in FIELDS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, help='Worder iOS source directory containing en_cefr_*.json')
    args = parser.parse_args()
    corrections = json.loads((args.source / 'builtin_word_corrections_v1.json').read_text())
    fixes = {key(c['before']): c['after'] for c in corrections['corrections'] if c['language'] == 'en'}
    decks, words = [], []
    corrected = 0
    for level, description in LEVELS:
        entries = json.loads((args.source / f'en_cefr_{level}.json').read_text())
        for entry in entries:
            identity = json.dumps(key(entry), ensure_ascii=False)
            word_id = level + '-' + hashlib.sha256(identity.encode()).hexdigest()[:16]
            replacement = fixes.get(key(entry), entry)
            corrected += replacement is not entry
            words.append({'id': word_id, **replacement, 'level': level})
        decks.append({'id': level, 'title': level.upper(), 'description': description, 'count': len(entries)})
    assert len({w['id'] for w in words}) == len(words), 'Duplicate word identities'
    output = ROOT / 'assets/data/english.json'
    output.write_text(json.dumps({'version': 1, 'decks': decks, 'words': words}, ensure_ascii=False, separators=(',', ':')))
    print(f'Imported {len(words)} words across {len(decks)} levels; applied {corrected} corrections.')


if __name__ == '__main__':
    main()
