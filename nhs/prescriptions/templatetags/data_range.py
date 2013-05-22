"""
Date range of the current instance
"""
from django import template
from django.db.models import Min, Max

register = template.Library()

class DataRangeNode(template.Node):
    def render(self, context):
        from nhs.prescriptions.models import Prescription
        aggregations = Prescription.objects.aggregate(Min('period'), Max('period'))
        print aggregations
        return '{period__min} - {period__max}'.format(**aggregations)

@register.tag(name='data_range')
def data_range(parser, token):
    return DataRangeNode()
