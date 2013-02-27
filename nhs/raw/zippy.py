"""
Utilities for writing out zipfiles for our downloads.

Get this business logic away from the Django boilerplate.
"""
import collections
import zipfile

from django.conf import settings
import ffs

from nhs.ccgs.models import CCG
from nhs.practices.models import Practice
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

def practicedata():
    """
    Write all practice metadata as a CSV and return the
    Path object representing that file.
    """
    practices = Practice.objects.select_related().all()
    data = [[
            p.practice,
            p.address,
            # TODO Some Practices not linked to CCGs.
            getattr(p.ccg, 'code', None),
            p.dispensing
            ] for p in practices]
    practicemeta = ffs.Path.newfile()
    with practicemeta.csv() as csv:
        csv.writerows([[
                    'practice_code',
                    'address',
                    'ccg_code',
                    'dispensing'
                    ]] + data)
    return practicemeta

def _drug(bnf_code, granularity):
    """
    Helper function to write a CSV containing raw data for
    drug prescribing at a particular granularity.
    """
    meth = getattr(Prescription.objects,
                   'bnf_grouped_by_{0}_id'.format(granularity))
    data = meth([bnf_code])
    rows = [[d['id'], d['count']] for d in data]

    granularscrips = ffs.Path.newfile()
    with granularscrips.csv() as csv:
        csv.writerows([['{0}_id'.format(granularity), 'count']] + rows)
    return granularscrips

def drug(bnf_code):
    """
    Generate a Zipfile containing csv format data for one
    particular drug.

    Return: filename for the zip.
    """

    ccgmeta = ccgdata()
    practicemeta = practicedata()
    ccgscrips = _drug(bnf_code, 'ccg')
    practicescrips = _drug(bnf_code, 'practice')

    with zipfile.ZipFile('/tmp/{0}.zip'.format(bnf_code), 'w') as zipp:
        zipp.write(ccgmeta.abspath, 'ccg.metadata.csv')
        zipp.write(practicemeta.abspath, 'practice.metadata.csv')
        zipp.write(ccgscrips.abspath, 'ccg.prescribing.csv')
        zipp.write(practicescrips.abspath, 'practice.prescribing.csv')

    return '/tmp/{0}.zip'.format(bnf_code)

def _ratio(bucket1, bucket2, granularity):
    """
    Helper function to write a CSV containing raw data for
    a bucket visualisation at a particular granularity.
    """
    prescription_meth = getattr(
        Prescription.objects, 'bnf_grouped_by_{0}_id'.format(granularity))
    bucket1_data = prescription_meth(bucket1)
    bucket2_data = prescription_meth(bucket2)

    granular_bucket1 = collections.defaultdict(int, {x['id']: x['count'] for x in bucket1_data})
    granular_bucket2 = collections.defaultdict(int, {x['id']: x['count'] for x in bucket2_data})

    granulars = set(granular_bucket1.keys() + granular_bucket2.keys())

    rows = [[
            granular,
            granular_bucket1[granular],
            granular_bucket2[granular],
            granular_bucket1[granular] + granular_bucket2[granular],
            100 * granular_bucket1[granular]/(granular_bucket1[granular] + granular_bucket2[granular]),
            ] for granular in granulars]

    granularscrips = ffs.Path.newfile()
    with granularscrips.csv() as csv:

        csv.writerows([[
                '{0}_code'.format(granularity),
                'bucket1_count'
                'bucket2_count',
                'total_items',
                'percentage_bucket1',
                ]] + rows)

    return granularscrips

def ratio(bucket1, bucket2):
    """
    Generate the zipfile for a ratio visualisation between BUCKET1
    and BUCKET2.

    Return: filename for the zip
    """

    ccgmeta = ccgdata()
    practicemeta = practicedata()
    ccgscrips = _ratio(bucket1, bucket2, 'ccg')
    practicescrips = _ratio(bucket1, bucket2, 'practice')

    with zipfile.ZipFile('/tmp/ratio.zip', 'w') as zipp:
        zipp.write(ccgmeta.abspath, 'ccg.metadata.csv')
        zipp.write(practicemeta.abspath, 'practice.metadata.csv')
        zipp.write(ccgscrips.abspath, 'ccg.ratio.prescribing.csv')
        zipp.write(practicescrips.abspath, 'practice.ratio.prescribing.csv')

    return '/tmp/ratio.zip'
