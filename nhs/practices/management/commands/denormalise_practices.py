"""
Command to denormalise the lat/lon coords in order to speed up API access
"""
from django.core.management.base import BaseCommand

from practices.models import Practice

class Command(BaseCommand):
    def handle(self,**options):
        for practice in Practice.objects.all():
            if practice.pc:
                practice.lat = practice.pc.location.y
                practice.lon = practice.pc.location.x

            practice.display_name = practice.address.splitlines()[0]
            practice.save()
            print 'saved', practice.display_name, practice.lat, practice.lon
