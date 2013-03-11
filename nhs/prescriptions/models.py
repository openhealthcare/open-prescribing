# -*- coding: utf-8 -*-
"""
Individual prescriptions of Drugs, as well as standard buckets.
"""
from django.db import models

from practices.models import Practice
from managers import PrescriptionManager

class Product(models.Model):
    """
    An individual item that has been prescribed by a GP at
    some stage.
    """
    bnf_code = models.CharField(blank=True, max_length=100, primary_key=True)
    name     = models.CharField(blank=True, max_length=255, db_index=True)
    def __repr__(self):
        return "<Product {0}>".format(self.name)

    def __unicode__(self):
        return self.pk

class Prescription(models.Model):

    """
    A month, practice granularity record of prescriptions of specific
    products.
    """
    product     = models.ForeignKey(Product)
    practice    = models.ForeignKey(Practice)
    items       = models.IntegerField(blank=True, null=True)
    quantity    = models.IntegerField(blank=True, null=True)
    nic         = models.FloatField()
    actual_cost = models.FloatField()
    period      = models.IntegerField(blank=True, null=True, db_index=True)

    objects = PrescriptionManager()

    def __repr__(self):
        return "<Presciption {0} X {1}>".format(self.product.name, self.quantity)

    def display_period(self):
        """
        Format the integer we store in a minimally pleasant way
        """
        return "{0}/{1}".format(str(self.period)[:-2], str(self.period)[-2:])


class Group(models.Model):
    """
    A group of logically grouped products over which we may like
    to run aggregations.

    These are expected to be designated editorially at least to begin with.
    """
    def __repr__(self):
        return "<Group {0}>".format(self.name)

    drugs = models.ManyToManyField(Product)
    name  = models.CharField(max_length=200)
