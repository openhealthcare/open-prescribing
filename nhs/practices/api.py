"""
API for GP practices
"""
from tastypie import fields
from tastypie.cache import SimpleCache
from tastypie.contrib.gis.resources import ModelResource as GeoModelResource

from models import Practice
from mapit.models import Postcode

class MapitPostCodeResource(GeoModelResource):
    class Meta:
        queryset = Postcode.objects.all()

class PracticeResource(GeoModelResource):
    class Meta:
        model = Practice
        queryset = Practice.objects.all()
        cache = SimpleCache(timeout=10)
        allowed_methods = ['get']
        max_limit = None
