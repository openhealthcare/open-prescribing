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
    pc = fields.ToOneField(MapitPostCodeResource, 'pc', null=True)

    class Meta:
        model = Practice
        queryset = Practice.objects.select_related('pc').all()
        cache = SimpleCache(timeout=10)
        allowed_methods = ['get']
        max_limit = None


    def dehydrate(self, bundle):
        """
        Add extra metadata to the practice.

        We'd like to add the postcode coordinates to facilitate
        easy "Put this on a map somewhere plausible please", and
        a name value that strips the frist line of the address.
        """
        bundle.data['display_name'] = bundle.obj.address.splitlines()[0]
        if bundle.obj.pc:
            # Y is lat, x is lon
            bundle.data['coords'] = [bundle.obj.pc.location.y, bundle.obj.pc.location.x]
        else:
            bundle.data['coords'] = None
        return bundle
