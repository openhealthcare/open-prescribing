"""
Alternative import command - assumes pre transformed data
"""
import sys
import csv
from optparse import make_option

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.db import connection, backend, models

from prescriptions.models import Product, Prescription
from practices.models import Practice

class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--scripfile', '-s', dest='scripfile',),
        make_option('--drugfile', '-d', dest='drugfile',),
        make_option('--date', '-t', dest='date',),
        )

    def __init__(self):
        super(Command, self).__init__()
        self.cursor = connection.cursor()
        self.columns = ",".join([
            'product_id',
            'practice_id',
            'items',
            'nic',
            'actual_cost',
            'quantity',
            'period',
        ])
        self.product_cols = ",".join([
                'bnf_code',
                'name'
            ])

    def copy(self):
        print self.scripfile, self.drugfile, self.period
        sql = """
            DELETE FROM prescriptions_prescription WHERE period = '%(period)s';
        """ % {
            'period' : self.period,
        }
        self.cursor.execute(sql)

        # sql = """
        #     COPY prescriptions_product (%(columns)s)
        #     FROM '%(filename)s'
        #     DELIMITERS ','
        #     CSV;
        #     COMMIT;
        # """ % {
        #     'filename': self.drugfile,
        #     'columns': self.product_cols
        #     }
        # self.cursor.execute(sql)

        sql = """
            Copy prescriptions_prescription (%(columns)s)
            FROM '%(filename)s'
            DELIMITERS ','
            CSV;
            COMMIT;
        """ % {
            'filename' : self.scripfile,
            'columns' : self.columns,
        }
        print sql
        self.cursor.execute(sql)


    def handle(self, *args, **options):
        assert options['scripfile']
        assert options['drugfile']
        assert options['date']
        self.scripfile = options['scripfile']
        self.drugfile = options['drugfile']
        self.period = options['date']
        self.copy()
