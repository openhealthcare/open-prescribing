# -*- coding: utf-8 -*-
from django.db import models
from django.contrib.gis.db import models as geo_models
from nhs.ccgs.models import CCG

from mapit.models import Postcode

class Practice(geo_models.Model):
    practice   = models.CharField(blank=True, max_length=100, primary_key=True)
    name       = models.CharField(blank=True, max_length=255)
    postcode   = models.CharField(blank=True, max_length=10)
    pc         = models.ForeignKey(Postcode, null=True, blank=True)
    imd        = models.FloatField(blank=True, null=True)
    address    = models.TextField(blank=True)
    ccg        = models.ForeignKey(CCG, null=True)
    dispensing = models.NullBooleanField(blank=True, null=True)
    lat        = models.FloatField(blank=True, null=True)
    lon        = models.FloatField(blank=True, null=True)
    display_name = models.CharField(blank=True, null=True, max_length=200)


    objects = geo_models.GeoManager()

    def __unicode__(self):
        return "%s (%s)" % (self.pk, self.name)

    def frist_addr(self):
        """
        Return the frist line of the practice address
        """
        return self.address.splitlines()[0]

    # def display_name(self):
    #     """
    #     A nice display name
    #     """
    #     return '{0} ({1})'.format(self.frist_addr(), self.practice)
