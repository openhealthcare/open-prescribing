"""
Utilities for writing out zipfiles for our downloads.

Get this business logic away from the Django boilerplate.
"""
import collections
import zipfile

from django.conf import settings
import ffs

from nhs.ccgs.models import CCG
from nhs.prescriptions.models import Prescription

def ccgdata():
    """
    Write all CCG metadata as a CSV and return the
    Path object representing that file
    """
    ccgs = CCG.objects.all()
    data = [[
            c.code,
            c.title,
            c.name,
            c.region,
            c.population,
            c.lsoa_count,
            c.practice_set.count()
            ] for c in ccgs]
    ccgmeta = ffs.Path.newfile()
    with ccgmeta.csv() as csv:
        csv.writerows([[
                'code',
                'title',
                'name',
                'region',
                'population',
                'lsoa_count',
                'num_practices'
                ]] + data)

    return ccgmeta


def drug(bnf_code):
    """
    Generate a Zipfile containing csv format data for one
    particular drug.

    Return: filename for the zip.
    """
    data = Prescription.objects.bnf_grouped_by_ccg_id([bnf_code])
    rows = [[d['id'], d['count']] for d in data]

    ccgscrips = ffs.Path.newfile()
    with ccgscrips.csv() as csv:

        csv.writeros([['ccg_id', 'count']] + rows)

    ccgmeta = ccgdata()

    with zipfile.ZipFile('/tmp/{0}.zip'.format(bnf_code), 'w') as zipp:
        zipp.write(ccgmeta.abspath, 'ccg.metadata.csv')
        zipp.write(ccgscrips.abspath, 'ccg.prescribing.csv')

    return '/tmp/{0}.zip'.format(bnf_code)

def ratio(bucket1, bucket2):
    """
    Generate the zipfile for a ratio visualisation between BUCKET1
    and BUCKET2.

    Return: filename for the zip
    """
    bucket1_data = Prescription.objects.bnf_grouped_by_ccg_id(bucket1)
    bucket2_data = Prescription.objects.bnf_grouped_by_ccg_id(bucket2)

    ccg_bucket1 = collections.defaultdict(int, {x['id']: x['count'] for x in bucket1_data})
    ccg_bucket2 = collections.defaultdict(int, {x['id']: x['count'] for x in bucket2_data})

    ccgs = set(ccg_bucket1.keys() + ccg_bucket2.keys())

    rows = [[
            ccg,
            ccg_bucket1[ccg],
            ccg_bucket2[ccg],
            ccg_bucket1[ccg] + ccg_bucket2[ccg],
            100 * ccg_bucket1[ccg]/(ccg_bucket1[ccg] + ccg_bucket2[ccg]),
            ] for ccg in ccgs]

    ccgscrips = ffs.Path.newfile()
    with ccgscrips.csv() as csv:

        csv.writerows([[
                'ccg_id',
                'bucket1_count'
                'bucket2_count',
                'total_items',
                'percentage_bucket1',
                ]] + rows)

    ccgmeta = ccgdata()

    with zipfile.ZipFile('/tmp/ratio.zip', 'w') as zipp:
        zipp.write(ccgmeta.abspath, 'ccg.metadata.csv')
        zipp.write(ccgscrips.abspath, 'ccg.ratio.prescribing.csv')

    return '/tmp/ratio.zip'
