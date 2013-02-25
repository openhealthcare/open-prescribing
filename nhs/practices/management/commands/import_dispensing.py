import sys
import csv
from optparse import make_option

from django.core.management.base import BaseCommand

from practices.models import Practice

class ReadlineIterator:
    """
    An iterator that calls readline() to get its next value.
    """
    def __init__(self, f): self.f = f
    def __iter__(self): return self
    def next(self):
        line = self.f.readline()
        if line: return line
        else: raise StopIteration

class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--filename', '-f', dest='filename',),
        )

    def process_line(self, line):
        _, addr, postcode = line
        postcode = postcode.replace(' ', '')
        prac = Practice.objects.filter(pc__postcode=postcode)
        if prac:
            prac = prac[0]
            prac.dispensing = True
            prac.save()
            print 'Found', prac
        else:
            print "Couldn't find", postcode, addr

    def handle(self, **options):
        self.filename = options['filename']
        seen = set()

        infile = csv.reader(ReadlineIterator(open(self.filename, 'r')))
        infile.next() # ignore headers
        for line in infile:
            line = [x.strip() for x in line]

            if not line[1] in seen:
                seen.add(line[1])
                self.process_line(line)
