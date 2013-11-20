"""
Take processed Practice aggregate data files and aggregate for CCGs please.
"""
import collections
import json
import re
import sys

import ffs

__all__ = [
    'main'
    ]

HERE = ffs.Path.here()
DATA = HERE / '../op/static/data/aggregates/practice'
DEST = HERE / '../op/static/data/aggregates/ccg'

def _load_practice_ccg_mapping():
    """
    Load the practice to ccg code mapping as a dict
    """
    practice_ccgs = HERE / '../data/practice.ccgs.csv'
    mapper = {}
    with practice_ccgs.csv(header=True) as csv:
        for practice in csv:
            pcode, ccode = practice[1], practice[3]
            mapper[pcode] = ccode
    return mapper

P2C = _load_practice_ccg_mapping()

def _flush():
    """
    Clean our previous practice aggregates
    """
    with DEST:
        for datafile in DEST:
            ffs.rm(datafile)

def _ccgs():
    """
    write out our CCG aggregates.
    """
    drugs = {}
    print DATA.abspath
    with DATA:
        for practicefile in DATA:
            print practicefile
            pfile = DATA / practicefile
            practice = pfile.json_load()
            bnf_code = re.match(r'(bnf[.])([0-9A-Z]+)([.]json)', str(practicefile)).group(2)

            for pid, aggregate in practice.items():
                try:
                    ccg = P2C[pid]
                except KeyError:
                    continue

                if bnf_code not in drugs:
                    drugs[bnf_code] = {}

                if ccg not in drugs[bnf_code]:
                    drugs[bnf_code][ccg] = {"id": ccg, "count": 0}

                drugs[bnf_code][ccg]['count'] += aggregate['count']

        for bnf, status in drugs.items():
            datafile = DEST / 'bnf.{0}.json'.format(bnf)
            with datafile.open('w') as fh:
                fh.write(json.dumps(status))

        print drugs


    return

def main():
    """
    Entrypoint for aggregation
    """
    _flush()
    _ccgs()
    return 0


if __name__ == '__main__':
    sys.exit(main())
