"""
Tastypie API for CCGs and CCG metadata.
"""
from django.db.models import Count
from tastypie.contrib.gis.resources import ModelResource as GeoModelResource

from models import CCG


class CCGResource(GeoModelResource):
    class Meta:
        model = CCG
        queryset = CCG.objects.all()
        allowed_methods = ['get']

class CCGMetadataResource(GeoModelResource):
    """
    Provide an alternative API to retrieve just the metadata without the
    Geoms.
    """
    class Meta:
        model = CCG
        queryset = CCG.objects.annotate(pracs=Count('practice'))
        allowed_methods = ['get']
        excludes = ['poly']

    def dehydrate(self, bundle):
        """
        Add the number of practices
        """
        bundle.data['no_of_practices'] = bundle.obj.pracs
        return bundle
