"""
Utilities for writing out zipfiles for our downloads.

Get this business logic away from the Django boilerplate.
"""
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
        csv.writerow([
                'code',
                'title',
                'name',
                'region',
                'population',
                'lsoa_count',
                'num_practices'
                ])
        csv.writerows(data)

    return ccgmeta


def drug(bnf_code):
    """
    Generate a Zipfile containing csv format data for one
    particular drug.

    Return: filename for the CSV.
    """

    data = Prescription.objects.bnf_grouped_by_ccg_id([bnf_code])
    rows = [[d['id'], d['count']] for d in data]

    ccgscrips = ffs.Path.newfile()
    with ccgscrips.csv() as csv:

        csv.writerow(['ccg_id', 'count'])
        csv.writerows(rows)

    ccgmeta = ccgdata()

    with zipfile.ZipFile('/tmp/{0}.zip'.format(bnf_code), 'w') as zipp:
        zipp.write(ccgmeta.abspath, 'ccg.metadata.csv')
        zipp.write(ccgscrips.abspath, 'ccg.prescribing.csv')

    return '/tmp/{0}.zip'.format(bnf_code)


        # with open('/tmp/this', 'w') as fh:
        #     import time
        #     fh.write(str(time.time()))

        # with zipfile.ZipFile('/tmp/this.zip', 'w') as zippy:
        #     zippy.write('/tmp/this')
