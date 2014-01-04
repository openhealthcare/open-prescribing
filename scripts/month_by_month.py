"""
Given a monthly prescription file, process it to roll up individual drugs
at Practice && CCG granularity.
"""
import json
import re
import sys

import ffs

HERE = ffs.Path.here()
MONTHS = HERE / '../op/static/data/months'

INFILE = sys.argv[-1]
THIS_MONTH = re.search(r'.*T([0-9]{6})PDPI[+]BNFT.[cC][sS][vV]', INFILE).groups()[0]
MONTHDIR = MONTHS/THIS_MONTH
CCGS = MONTHDIR/'ccg'
PRACTICES = MONTHDIR/'practices'

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
    Clean this month.
    """
    if MONTHDIR:
        ffs.rm(MONTHDIR, recursive=True)
    MONTHDIR.mkdir()
    CCGS.mkdir()
    PRACTICES.mkdir()
    return

def _practices():
    """
    Roll up individual drugs for this month.
    """
    rawfile = ffs.Path(INFILE)
    with rawfile.csv(header=True) as csv:
        for line in csv:
            bnf = line.bnf_code.strip()
            drug = dict(count=line.items, nic=line.nic,
                        act_cost=line.act_cost, quantity=line.quantity,
                        id=line.practice)

            datafile = PRACTICES/'bnf.{0}.json'.format(bnf)
            if datafile:
                existing = datafile.json_load()
                datafile.truncate()
                existing[line.practice] = drug
            else:
                existing = {line.practice: drug}

            datafile << json.dumps(existing)

    return

def _ccgs():
    """
    Roll up individual drugs for this month.
    """
    drugs = {}
    with PRACTICES:
        for practicefile in PRACTICES:
            pfile = PRACTICES/practicefile
            practice = pfile.json_load()
            bnf_code = re.match(r'(bnf[.])([0-9A-Z]+)([.]json)', str(practicefile)).group(2)

            for pid, data in practice.items():
                try:
                    ccg = P2C[pid]
                except KeyError:
                    continue

                if bnf_code not in drugs:
                    drugs[bnf_code] = {}

                if ccg not in drugs[bnf_code]:
                    drugs[bnf_code][ccg] = {"id": ccg, "count": 0, "nic": 0,
                                            "act_cost": 0, "quantity": 0}

                drugs[bnf_code][ccg]['count'] += data['count']
                drugs[bnf_code][ccg]['nic'] += data['nic']
                drugs[bnf_code][ccg]['act_cost'] += data['act_cost']
                drugs[bnf_code][ccg]['quantity'] += data['quantity']

    for bnf, status in drugs.items():
        datafile = CCGS/'bnf.{0}.json'.format(bnf)
        datafile << json.dumps(status)

    return

def main():
    """
    Entrypoint for aggregation
    """
    _flush()
    _practices()
    # _ccgs()
    return 0


if __name__ == '__main__':
    sys.exit(main())
