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
        print code, size

    def handle(self, **options):
        self.filename = options['filename']
        seen = set()

        infile = csv.reader(ReadlineIterator(open(self.filename, 'r')))
        infile.next() # ignore headers
        sizes = {}
        for line in infile:
            line = [x.strip() for x in line]

            if not line[1] in seen:
                seen.add(line[1])
                try:
                    code, size = line[0], int(line[3])
                    sizes[code] = size
                except ValueError:
                    print line
                    continue

        for practice in Practice.objects.all():
            try:
                practice.list_size = sizes[practice.practice]
                print practice, practice.list_size
                practice.save()
            except KeyError:
                print practice, practice.address
                continue
