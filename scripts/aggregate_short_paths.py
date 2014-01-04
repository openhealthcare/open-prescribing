"""
Make short path aggregates.
"""
import collections
import json
import sys

import ffs

from op import constants

__all__ = [
    'main'
    ]

HERE = ffs.Path.here()
AGGREGATES = HERE / '../op/static/data/aggregates'
PRACTICES = HERE / '../op/static/data/aggregates/practice'
CCGS = HERE / '../op/static/data/aggregates/ccg'
DATA = HERE / '../op/static/data'

def _flush(dest):
    if not dest:
        return
    with dest:
        for datafile in dest:
            ffs.rm(datafile)

def _sumit(aggregations):
    summer = collections.defaultdict(int)
    for drug in aggregations:
        for area in drug:
            summer[area] += drug[area]['count']
    return summer

def _short_paths(name, codes):
    """
    Given the NAME of a short path to cache, & the list of all
    BNF CODES in that cache, create the files.
    """
    DEST = DATA/name
    for granularity in ['practice', 'ccg']:
        cachefile = DEST/'{0}.aggregate.cache.json'.format(granularity)

        aggregations = []
        for code in codes:
            agg = AGGREGATES / '{0}/bnf.{1}.json'.format(granularity, code)
            aggregates = {}
            if agg:
                aggregates = agg.json_load()
            aggregations.append(aggregates)

        result = _sumit(aggregations)
        cachefile << json.dumps(result)
    return

def _inhalers():
    """
    Create aggregate files for inhalers
    """
    _flush(DATA/'inhalers')
    inhaler_codes = constants.ALL_INHALERS.split(',')
    _short_paths('inhalers', inhaler_codes)
    return

def _statins():
    """
    Create aggregate files
    """
    _flush(DATA/'statins')
    statin_codes = constants.STATINS
    _short_paths('statins', statin_codes)
    return

def _nicotine():
    """
    Create aggregate files for drugs prescribed for nicotine dependency.
    """
    _flush(DATA/'nicotine')
    _short_paths('nicotine', constants.NICOTINE)
    return

def main():
    # _statins()
    # _inhalers()
    _nicotine()
    return 0

if __name__ == '__main__':
    sys.exit(main())
