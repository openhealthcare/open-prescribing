"""
Implement data downloads for Open Prescribing 2.0
"""
import zipfile

import ffs

HERE = ffs.Path.here()
DATA = HERE/'static/data'
AGGREGATES = DATA / 'aggregates'

CCGMETA = DATA/'ccg.metadata.csv'
PRACTICEMETA = DATA/'practice.metadata.csv'



def _load_aggregate(granularity, bnf):
    """
    Given a Query type and a bnf code, fetch the disk-stored
    aggregation for this drug at this granularity.

    Arguments:
    - `granularity`: str
    - `bnf`: str

    Return:
    Exceptions:
    """
    agg = AGGREGATES / '{0}/bnf.{1}.json'.format(granularity, bnf)
    aggregates = {}
    if agg:
        aggregates = agg.json_load()
    return aggregates

def _all_time_as_csv_rows(granularity, bnf):
    """
    Return a string (CSV) for all time for this BNF at GRANULARITY.

    Arguments:
    - `granularity`: str
    - `bnf`: str

    Return: str
    Exceptions: None
    """
    aggregates = _load_aggregate(granularity, bnf)
    return "\n".join(["{0},{1},{2}".format(bnf, r['id'],r['count'])
                      for r in aggregates.values()])

def _all_time_bucket_as_csv(granularity, bucket):
    """
    Return a string (CSV) for all time for this BUCKET of BNF codes.

    Arguments:
    - `granularity`: str
    - `bucket`: [str]

    Return: str
    Exceptions: None
    """
    rows = "\n".join([_all_time_as_csv_rows(granularity, r) for r in bucket])
    return "bnf,{0},count\n".format(granularity) + rows

def extract(bnf_codes):
    """
    Given a list of BNF codes, generate a zipfile containing a data download
    for those codes.

    Return a filename which represents the file stored as a tempfile on disk
    ready for streaming.

    Arguments:
    - `bnf_codes`: [str]

    Return: str
    Exceptions: None
    """
    ccg_aggregate = ffs.Path.newfile()
    ccg_aggregate << _all_time_bucket_as_csv('ccg', bnf_codes)
    practice_aggregate = ffs.Path.newfile()
    practice_aggregate << _all_time_bucket_as_csv('practice', bnf_codes)

    with zipfile.ZipFile('/tmp/ratio.zip', 'w') as zipp:
        zipp.write(CCGMETA.abspath, 'ccg.metadata.csv')
        zipp.write(PRACTICEMETA.abspath, 'practice.metadata.csv')
        zipp.write(ccg_aggregate.abspath, 'ccg.aggregate.csv')
        zipp.write(practice_aggregate.abspath, 'practice.aggregate.csv')

    return "/tmp/ratio.zip"
