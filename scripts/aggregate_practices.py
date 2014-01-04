"""
Take raw Prescribing data files and aggregate please.
"""
import json
import sys

import ffs

__all__ = [
    'main'
    ]

HERE = ffs.Path.here()
DATA = HERE / '../data'
DEST = HERE / '../op/static/data/aggregates/practice'

def _flush():
    """
    Clean our previous practice aggregates
    """
    with DEST:
        for datafile in DEST:
            ffs.rm(datafile)



def _practices():
    """
    Write out our practice aggregates
    """
    with DATA:
        for rawfile in DATA:
            if not '+BNFT'in str(rawfile):
                continue
            print rawfile
            with rawfile.csv(header=True) as csv:
                drugs = {}
                for line in csv:
                    bnf = line.bnf_code.strip()
                    if bnf in drugs:
                        status = drugs[bnf]
                    else:
                        status = {}
                    if line.practice in status:
                        status[line.practice]['count'] += int(line.items)
                    else:
                        status[line.practice] = {}
                        status[line.practice]['count'] = int(line.items)
                        status[line.practice]['id'] = line.practice

                    drugs[bnf] = status

                for bnf, status in drugs.items():
                    datafile = DEST / 'bnf.{0}.json'.format(bnf)
                    if datafile:
                        existing = datafile.json_load()
                        for practice in existing:
                            if practice in status:
                                status[practice]['count'] += existing[practice]['count']
                            else:
                                status[practice] = existing[practice]

                    with datafile.open('w') as fh:
                        fh.write(json.dumps(status))

    return


def main():
    """
    Entrypoint for aggregation
    """
    _flush()
    _practices()
    return 0


if __name__ == '__main__':
    sys.exit(main())
