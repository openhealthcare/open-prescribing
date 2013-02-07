"""
Define the public API for prescriptions
"""
from tastypie.resources import ModelResource, Resource
from tastypie.constants import ALL, ALL_WITH_RELATIONS

from models import Product, Prescription, Group


class ProductResource(ModelResource):
    class Meta:
            model = Product
            queryset = Product.objects.all()
            filtering = {
                "bnf_code": ALL,
            }
            allowed_methods = ['get']

class PrescriptionResource(ModelResource):
    class Meta:
            model = Prescription
            queryset = Prescription.objects.all()
            allowed_methods = ['get']

class PrescriptionComparisonResource(ModelResource):
    class Meta:
            model = Prescription
            queryset = Prescription.objects.all()
            filtering = {
                "bnf_code": ALL,
            }
            # This attribute is from my fork of Tastypie Swagger that is
            # yet to be merged upstream - it allows you to specify API
            # documentation details declaratively on the Resource
            custom_filtering = {
                'query_type': {
                    'dataType': 'string',
                    'required': True,
                    'description': 'Granularity of the data you want to retrieve'
                    },
                'group1': {
                    'dataType': 'string',
                    'required': True,
                    'description': 'Frist bucket. Comma separated list of BNF Codes'
                    },
                'group2': {
                    'dataType': 'string',
                    'required': True,
                    'description': 'Second bucket. Comma separated list of BNF Codes'
                    }
                }
            allowed_methods = ['get']

    def apply_filters(self, request):
        # TODO make query_type in to a override_url
        if 'query_type' not in request.GET:
            raise ValueError('Must tell us an aggregation level Larry!')
        query_type = request.GET.get('query_type')
        if 'group1' not in request.GET or 'group2' not in request.GET:
            raise ValueError('Must provide us with buckets!')
        group1 = request.GET.get('group1').split(',')
        group2 = request.GET.get('group2').split(',')
        print group1, group2
        if group2 and group2:
            return Prescription.objects.compare_codes(query_type, group1, group2)

    def get_list(self, request, **kwargs):
        return self.create_response(request, self.apply_filters(request))

class GroupResource(ModelResource):
    class Meta:
            model = Group
            queryset = Group.objects.all()
            allowed_methods = ['get']



